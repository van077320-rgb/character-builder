import { GoogleGenAI } from "@google/genai";

// Priority model hierarchy: Gemini 3.7 Flash -> Gemini 3.5 Flash -> Gemini 3 Flash Preview -> Gemini 3.1 Flash Lite
export const MODEL_FALLBACK_TIERS = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    tier: 1,
    description: "Model mạnh nhất, tối ưu tư duy và chiều sâu thiết lập nhân vật",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tier: 2,
    description: "Model ổn định tốc độ cao, dự phòng cấp 1 khi Tier 1 hết quota",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    tier: 3,
    description: "Model thế hệ 3 tối ưu, dự phòng cấp 2",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tier: 4,
    description: "Model nhẹ cứu cánh, dự phòng cấp 3 giúp app không bao giờ bị đứng",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash Latest",
    tier: 5,
    description: "Model dự phòng mở rộng cuối cùng",
  },
];

// Fallback aliases in case of version differences
export const FALLBACK_MODEL_IDS = MODEL_FALLBACK_TIERS.map((m) => m.id);

export interface RotationStats {
  totalRequests: number;
  successfulRequests: number;
  rateLimitHits: number;
  invalidKeyHits: number;
  serverErrorHits: number;
  modelDowngrades: number;
  /**
   * Số lần một request phải dùng tới key NHÓM DỰ PHÒNG. Đây là con số để theo
   * dõi xem hạn mức của người đóng góp thực sự bị tiêu bao nhiêu — 0 nghĩa là
   * key của chủ web vẫn gánh được hết.
   */
  reserveKeyUses: number;
  lastUsedModel: string;
  lastUsedKeyIndex: number;
  lastFailureReason: string | null;
}

// In-memory stats and round-robin counter
let currentKeyIndex = 0;

const stats: RotationStats = {
  totalRequests: 0,
  successfulRequests: 0,
  rateLimitHits: 0,
  invalidKeyHits: 0,
  serverErrorHits: 0,
  modelDowngrades: 0,
  reserveKeyUses: 0,
  lastUsedModel: MODEL_FALLBACK_TIERS[0].id,
  lastUsedKeyIndex: 0,
  lastFailureReason: null,
};

/* ────────────────────────────────────────────────────────────
 * Cách ly key CÓ THỜI HẠN
 *
 * Trước đây bất kỳ lỗi 401/403 nào cũng `disabledKeys.add(key)` vĩnh viễn — một
 * cú 403 tạm thời (chưa bật API, giới hạn referer, trục trặc phía Google) là
 * giết key đó đến hết đời process. Trên Netlify một container sống hàng chục
 * phút, nghĩa là mất key suốt từng đó thời gian dù nó vẫn tốt.
 *
 * Nay mỗi loại lỗi có thời hạn cách ly riêng, hết hạn thì key tự quay lại pool.
 * ──────────────────────────────────────────────────────────── */

/**
 * id -> mốc hết cách ly (epoch ms). id có hai dạng:
 *   "<key>"         — key hỏng ở mức xác thực, nghỉ với MỌI model.
 *   "<key>#<model>" — key hết hạn mức của RIÊNG model đó.
 *
 * Quota của Gemini tính theo (project × model × ngày) chứ không theo key, nên
 * key cạn hạn mức ở gemini-3.7-flash vẫn còn nguyên hạn mức ở gemini-3.5-flash.
 * Cách ly cả key vì một lỗi 429 là tự tay vứt bỏ mấy tầng model dự phòng.
 */
const quarantine = new Map<string, { until: number; reason: string; detail?: string }>();

const MINUTE = 60_000;

/** Thời hạn cách ly theo từng loại lỗi. */
const QUARANTINE_MS: Record<string, number> = {
  "invalid-key": 6 * 60 * MINUTE, // key sai thật -> nghỉ lâu
  unauthenticated: 10 * MINUTE, // 401
  "key-forbidden": 5 * MINUTE, // 403 tạm thời -> nghỉ ngắn rồi thử lại
  quota: 1 * MINUTE, // 429 theo phút (RPM) -> né trong chốc lát
  "quota-daily": 60 * MINUTE, // 429 theo ngày -> thử lại sớm chỉ tổ đốt request
};

/** Phạm vi cách ly của lỗi quota: cặp (key, model), không phải cả key. */
function quotaScope(key: string, model: string): string {
  return `${key}#${model}`;
}

/** Hạn mức theo ngày cạn thì cả tiếng nữa cũng chưa về, khác hẳn giới hạn RPM. */
function isDailyQuota(detail: string): boolean {
  return /per\s*day/i.test(detail);
}

/**
 * @param detail Nguyên văn lỗi Google trả về. Nhãn phân loại ("bị từ chối xác
 * thực (401)") chỉ nói *loại* lỗi chứ không nói *vì sao* — mà nguyên nhân thật
 * nằm trong câu chữ của Google. Giữ lại để hiện thẳng lên modal.
 */
function quarantineFor(id: string, kind: string, reason: string, detail?: string): void {
  const ms = QUARANTINE_MS[kind];
  if (!ms) return;
  quarantine.set(id, { until: Date.now() + ms, reason, detail });
}

/** Trả về bản ghi cách ly còn hiệu lực, tự dọn bản ghi đã hết hạn. */
function getQuarantine(id: string): { until: number; reason: string; detail?: string } | null {
  const entry = quarantine.get(id);
  if (!entry) return null;
  if (Date.now() >= entry.until) {
    quarantine.delete(id); // hết hạn -> tự quay lại pool
    return null;
  }
  return entry;
}

function isQuarantined(id: string): boolean {
  return getQuarantine(id) !== null;
}

/**
 * Bóc dấu nháy và ngoặc vuông thừa quanh giá trị.
 *
 * `.env.example` viết giá trị trong dấu nháy kép, và người dùng thường copy cả
 * dấu nháy vào ô Environment Variables của Netlify. `.trim()` cứu được khoảng
 * trắng nhưng không cứu được dấu nháy.
 *
 * Đặc biệt nguy hiểm với GEMINI_API_KEYS: bọc cả danh sách trong một cặp nháy
 * rồi tách theo dấu phẩy sẽ làm HỎNG HAI key (đầu và cuối), và không bộ lọc nào
 * bắt được — chuỗi `"AIzaSy...` không còn bắt đầu bằng "AIza" nên lọt qua hết,
 * rồi ăn 401 lúc gọi thật.
 */
function cleanKey(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`\[\]]+|["'`\[\]]+$/g, "")
    .trim();
}

/**
 * Lý do một chuỗi KHÔNG dùng làm API key được, hoặc null nếu nó hợp lệ.
 *
 * AI Studio phát hành hai định dạng key, cả hai đều thật:
 *   "AIza..." — key Google API cổ điển.
 *   "AQ...."  — định dạng mới, chính là thứ nút "Create API key" trả về hiện nay.
 * Bản trước chặn thẳng tiền tố "AQ." vì tưởng là access token của gcloud, khiến
 * mọi key tạo mới bị vứt ngay từ vòng đọc biến môi trường — cắm 5 key mà app chỉ
 * thấy 2, lại không hề báo gì. Chỉ token OAuth thật (ya29./Bearer) mới bị loại.
 */
function describeInvalidKey(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "để trống";
  if (trimmed === "MY_GEMINI_API_KEY" || trimmed === "undefined" || trimmed === "null")
    return "vẫn là giá trị giữ chỗ, chưa thay bằng key thật";
  if (trimmed.startsWith("ya29.") || trimmed.startsWith("Bearer "))
    return "là OAuth access token (hết hạn sau khoảng 1 giờ), không phải API key";
  if (trimmed.startsWith("AIza") && trimmed.length < 25)
    return "key dạng AIza nhưng quá ngắn, nhiều khả năng bị cắt lúc dán";
  if (trimmed.length < 20) return "quá ngắn để là API key, nhiều khả năng bị cắt lúc dán";

  // Chỉ có trần DƯỚI mà không có trần TRÊN là một lỗ thật: dán cả danh sách key
  // vào một biến chỉ nhận MỘT key sẽ tạo ra một "key" dài cả nghìn ký tự, lọt
  // qua mọi bộ lọc rồi ăn 401 ở mọi lượt gọi mà không ai hiểu vì sao.
  if (/\s/.test(trimmed))
    return "chứa khoảng trắng ở giữa — nhiều khả năng là nhiều key bị dán liền vào một biến";
  if (trimmed.length > MAX_KEY_LENGTH)
    return (
      `dài ${trimmed.length} ký tự, quá dài để là một key — nhiều khả năng là nhiều key ` +
      "dán chung vào một biến. Dùng biến dạng danh sách (GEMINI_API_KEYS hoặc " +
      "GEMINI_API_KEYS_RESERVE) để phân tách bằng dấu phẩy."
    );

  return null;
}

function isValidKeyFormat(key: string | undefined): boolean {
  return !!key && describeInvalidKey(key) === null;
}

/** Key bị bỏ qua khi đọc biến môi trường, kèm lý do để hiện ra cho người dùng. */
export interface IgnoredKey {
  /** Tên biến môi trường chứa nó, ví dụ GEMINI_API_KEY_3 */
  source: string;
  masked: string;
  reason: string;
}

interface EnvKeyScan {
  /** Toàn bộ key hợp lệ, XẾP NHÓM CHÍNH TRƯỚC rồi mới tới nhóm dự phòng. */
  keys: string[];
  /**
   * Key thuộc nhóm dự phòng (do người khác đóng góp). Chỉ được dùng khi nhóm
   * chính đã cạn sạch — xem `getKeyGroups()`.
   */
  reserveKeys: Set<string>;
  ignored: IgnoredKey[];
  /** Biến có giá trị trùng với một key đã đọc trước đó -> không tính thêm suất. */
  duplicateSources: string[];
}

/**
 * Trần trên cho độ dài một key. Key thật dài 39 ký tự ("AIza...") hoặc khoảng
 * 53 ("AQ...."). Để rộng tay phòng khi Google phát hành định dạng dài hơn,
 * nhưng vẫn đủ chặt để bắt được cả danh sách bị dán vào một biến.
 */
const MAX_KEY_LENGTH = 200;

/** Số thứ tự tối đa cho biến dạng GEMINI_API_KEY_<n>. Phải khớp `.env.example`. */
const MAX_NUMBERED_KEYS = 50;

/**
 * Quét biến môi trường lấy key, đồng thời ghi lại thứ bị loại và vì sao.
 * Hỗ trợ GEMINI_API_KEY, GEMINI_API_KEYS="k1,k2" (không giới hạn số lượng),
 * và GEMINI_API_KEY_1..50.
 *
 * Giữ nguyên thứ tự khai báo — số thứ tự key hiện trong modal khớp với biến môi
 * trường. (Bản trước xếp key "AIza" lên đầu vì cho rằng chỉ nó mới là key thật;
 * nay hai định dạng ngang nhau nên việc xếp lại chỉ làm rối khi đối chiếu.)
 */
function scanEnvKeys(): EnvKeyScan {
  const keys: string[] = [];
  const reserveKeys = new Set<string>();
  const ignored: IgnoredKey[] = [];
  const duplicateSources: string[] = [];

  /** Nhóm đang quét. Đọc nhóm chính trước nên key trùng luôn thuộc về nhóm chính. */
  let group: "primary" | "reserve" = "primary";

  const consider = (source: string, raw: string | undefined) => {
    if (typeof raw !== "string") return;
    const trimmed = cleanKey(raw);
    if (!trimmed) return; // biến không đặt -> im lặng, không phải lỗi
    const reason = describeInvalidKey(trimmed);
    if (reason) {
      ignored.push({ source, masked: maskApiKey(trimmed), reason });
      return;
    }
    if (keys.includes(trimmed)) {
      duplicateSources.push(source);
      return;
    }
    keys.push(trimmed);
    if (group === "reserve") reserveKeys.add(trimmed);
  };

  /**
   * Một biến chứa nhiều key. Nhận dấu phẩy, chấm phẩy, gạch đứng hoặc xuống dòng
   * làm dấu phân tách — key gom từ nhiều người gửi về hiếm khi đúng một định dạng.
   */
  const considerList = (source: string, raw: string | undefined) => {
    if (typeof raw !== "string" || !raw.trim()) return;
    const parts = raw.split(/[,;|\n\r]+/).filter((p) => p.trim());
    if (parts.length <= 1) {
      consider(source, raw);
      return;
    }
    parts.forEach((p, i) => consider(`${source}[${i + 1}]`, p));
  };

  /* ── Nhóm chính: key của chủ web, dùng trước ───────────────── */
  consider("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
  considerList("GEMINI_API_KEYS", process.env.GEMINI_API_KEYS);

  // Dùng considerList chứ không phải consider: biến đánh số vốn chỉ nhận một
  // key, nhưng dán cả danh sách vào đó là chuyện xảy ra thật. Key thật không bao
  // giờ chứa dấu phẩy nên tách ra luôn an toàn, và làm đúng ý người dùng.
  for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
    considerList(`GEMINI_API_KEY_${i}`, process.env[`GEMINI_API_KEY_${i}`]);
  }

  /* ── Nhóm dự phòng: key người khác đóng góp, chỉ đụng khi hết đường ──
   * Quét SAU nhóm chính là có chủ đích: một key lỡ khai ở cả hai nơi sẽ được
   * tính vào nhóm chính, và biến bên dự phòng bị ghi là trùng. Thà dùng nhầm
   * key của mình còn hơn đốt nhầm key của người ta.
   */
  group = "reserve";

  /**
   * Nhận CẢ HAI cách viết, số ít lẫn số nhiều.
   *
   * Biến đánh số bên nhóm chính là `GEMINI_API_KEY_1` (số ít) trong khi biến
   * danh sách lại là `GEMINI_API_KEYS` (số nhiều), nên ghép nhầm thành
   * `GEMINI_API_KEYS_RESERVE_1` là chuyện gần như chắc chắn xảy ra. Thà đọc cả
   * hai còn hơn để một biến đã đặt đúng giá trị bị bỏ qua trong im lặng.
   */
  considerList("GEMINI_API_KEYS_RESERVE", process.env.GEMINI_API_KEYS_RESERVE);
  considerList("GEMINI_API_KEY_RESERVE", process.env.GEMINI_API_KEY_RESERVE);

  for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
    considerList(`GEMINI_API_KEY_RESERVE_${i}`, process.env[`GEMINI_API_KEY_RESERVE_${i}`]);
    considerList(`GEMINI_API_KEYS_RESERVE_${i}`, process.env[`GEMINI_API_KEYS_RESERVE_${i}`]);
  }

  return { keys, reserveKeys, ignored, duplicateSources };
}

/** Mọi tên biến môi trường mà `scanEnvKeys()` thực sự đọc. */
function recognizedKeyEnvNames(): Set<string> {
  const names = new Set([
    "GEMINI_API_KEY",
    "GEMINI_API_KEYS",
    "GEMINI_API_KEY_RESERVE",
    "GEMINI_API_KEYS_RESERVE",
  ]);
  for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
    names.add(`GEMINI_API_KEY_${i}`);
    names.add(`GEMINI_API_KEY_RESERVE_${i}`);
    names.add(`GEMINI_API_KEYS_RESERVE_${i}`);
  }
  return names;
}

/**
 * Biến môi trường TRÔNG như biến chứa key nhưng không khớp tên nào code đọc.
 *
 * Đây là loại lỗi tệ nhất trong cả cơ chế này: người dùng dán key đúng, giá trị
 * đúng, nhưng gõ sai một chữ trong TÊN biến — và không có gì báo lại, pool cứ
 * hụt đi một cách bí ẩn. Cùng tinh thần với `ignoredKeys`: thà nói ra còn hơn
 * im lặng bỏ qua.
 *
 * Lưu ý `GOOGLE_API_KEY` và `VITE_GEMINI_API_KEY` KHÔNG nằm trong danh sách hợp
 * lệ ở repo này (chỉ openworld đọc chúng), nên đặt vào đây sẽ bị báo — đúng ý.
 */
function findUnreadKeyEnvVars(): string[] {
  const known = recognizedKeyEnvNames();
  return Object.keys(process.env)
    .filter((name) => /^(GEMINI|GOOGLE)_API_KEY/i.test(name))
    .filter((name) => !known.has(name))
    .filter((name) => (process.env[name] || "").trim() !== "")
    .sort();
}

/** Một key kèm vị trí của nó trong danh sách dùng được (để báo cáo cho khớp UI). */
interface KeyEntry {
  key: string;
  /** Vị trí trong `getApiKeys()`, khớp với `maskedKeys[].index - 1` ở status. */
  index: number;
  reserve: boolean;
}

/**
 * Chia key dùng được thành các nhóm theo THỨ TỰ ƯU TIÊN: chính trước, dự phòng sau.
 *
 * Vòng xoay vét cạn nhóm chính qua TẤT CẢ các tầng model rồi mới chạm nhóm dự
 * phòng. Nghĩa là người dùng có thể nhận model yếu hơn (flash-lite bằng key của
 * chủ web) thay vì model mạnh bằng key đóng góp — đó là đánh đổi có chủ đích, để
 * hạn mức của người đóng góp bị tiêu càng ít càng tốt.
 */
function getKeyGroups(): { label: string; entries: KeyEntry[] }[] {
  const usable = getApiKeys();
  const { reserveKeys } = scanEnvKeys();

  const primary: KeyEntry[] = [];
  const reserve: KeyEntry[] = [];

  usable.forEach((key, index) => {
    const isReserve = reserveKeys.has(key);
    (isReserve ? reserve : primary).push({ key, index, reserve: isReserve });
  });

  const groups: { label: string; entries: KeyEntry[] }[] = [];
  if (primary.length > 0) groups.push({ label: "chính", entries: primary });
  if (reserve.length > 0) groups.push({ label: "dự phòng", entries: reserve });
  return groups;
}

function getAllRawKeys(): string[] {
  return scanEnvKeys().keys;
}

/**
 * Các key đang dùng được (đã bỏ key trong thời gian cách ly).
 *
 * Nếu TẤT CẢ đều đang bị cách ly thì vẫn trả về danh sách đầy đủ: thà thử lại
 * còn hơn để app đứng hình, vì cách ly chỉ là phỏng đoán chứ không chắc chắn.
 */
export function getApiKeys(): string[] {
  const rawKeys = getAllRawKeys();
  const usable = rawKeys.filter((k) => !isQuarantined(k));
  return usable.length > 0 ? usable : rawKeys;
}

/**
 * Mask API key for secure logging / response (e.g. AIzaSy...xYz8)
 */
export function maskApiKey(key: string): string {
  if (!key) return "empty";
  if (key.length <= 8) return "***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

/* ────────────────────────────────────────────────────────────
 * Phân loại lỗi
 * ──────────────────────────────────────────────────────────── */

export type GeminiErrorKind =
  | "invalid-key" // key sai thật, đổi key khác
  | "unauthenticated" // 401
  | "key-forbidden" // 403, thường là tạm thời
  | "quota" // 429 / RESOURCE_EXHAUSTED
  | "overloaded" // 503 / UNAVAILABLE
  | "server-error" // 500 INTERNAL — KHÔNG phải hết quota
  | "model-missing" // 404 / model không tồn tại -> nhảy sang model khác
  | "bad-request" // 400 do nội dung request -> thử lại vô ích
  | "empty-response" // API trả 200 nhưng không có nội dung dùng được
  | "timeout" // hết ngân sách thời gian của serverless function
  | "unknown";

/** Nhãn tiếng Việt để ghép vào thông báo cuối cùng. */
const KIND_LABEL: Record<GeminiErrorKind, string> = {
  "invalid-key": "API Key không hợp lệ",
  unauthenticated: "API Key bị từ chối xác thực (401)",
  "key-forbidden": "API Key bị từ chối quyền truy cập (403)",
  quota: "hết hạn mức quota (429)",
  overloaded: "Google đang quá tải (503)",
  "server-error": "Google trả lỗi máy chủ (500)",
  "model-missing": "model không tồn tại",
  "bad-request": "yêu cầu gửi lên không hợp lệ (400)",
  "empty-response": "AI trả về nội dung rỗng",
  timeout: "hết thời gian cho phép",
  unknown: "lỗi không xác định",
};

/**
 * Mã HTTP nên trả cho client theo từng loại lỗi.
 *
 * Trước đây mọi thất bại đều ra 500, kể cả hết quota hay hết giờ — client không
 * có cách nào phân biệt "chờ chút rồi thử lại" với "cấu hình sai".
 */
const HTTP_STATUS_BY_KIND: Record<GeminiErrorKind, number> = {
  "invalid-key": 401,
  unauthenticated: 401,
  "key-forbidden": 403,
  quota: 429,
  overloaded: 503,
  "server-error": 502,
  "model-missing": 502,
  "bad-request": 400,
  "empty-response": 502,
  timeout: 504,
  unknown: 500,
};

/**
 * API trả 200 nhưng nội dung không dùng được (bị bộ lọc an toàn chặn, JSON hỏng,
 * thiếu trường bắt buộc). Đây là THẤT BẠI, không phải thành công rỗng — trả về
 * chuỗi trắng chỉ khiến người dùng thấy ô trống mà không có gì để lần.
 */
export class EmptyResponseError extends Error {
  constructor(message = "AI trả về nội dung rỗng hoặc không đúng định dạng.") {
    super(message);
    this.name = "EmptyResponseError";
  }
}

export function classifyGeminiError(error: any): GeminiErrorKind {
  if (!error) return "unknown";
  if (error instanceof EmptyResponseError) return "empty-response";

  const msg = String(error.message || error.toString() || "").toLowerCase();
  const rawStatus = error.status ?? error.statusCode ?? error.code;
  const numeric = typeof rawStatus === "number" ? rawStatus : Number(rawStatus);
  const statusText = String(rawStatus ?? "").toLowerCase();

  const has = (...needles: string[]) => needles.some((n) => msg.includes(n) || statusText.includes(n));

  // Key sai thật — đổi key khác mới có tác dụng
  if (has("api_key_invalid", "api key not valid", "invalid api key")) return "invalid-key";

  // Model không có -> đây là lỗi của model, KHÔNG phải lỗi của key
  if (numeric === 404 || has("not_found", "is not found for api version", "unsupported"))
    return "model-missing";

  if (numeric === 401 || has("unauthenticated", "invalid authentication credentials"))
    return "unauthenticated";

  if (numeric === 429 || has("resource_exhausted", "quota", "rate limit", "too many requests"))
    return "quota";

  if (numeric === 503 || has("unavailable", "overloaded")) return "overloaded";

  // 500 KHÔNG phải hết quota. Trước đây bị gộp vào nhóm quota nên một lỗi máy chủ
  // thoáng qua kéo theo retry toàn bộ key × model rồi báo sai là "hết quota".
  if (numeric === 500 || has("internal error", "internal server error")) return "server-error";

  if (numeric === 403 || has("permission_denied", "forbidden")) return "key-forbidden";

  // 400 vì nội dung request (prompt sai định dạng, schema hỏng...) -> retry vô nghĩa
  if (numeric === 400 || has("invalid_argument", "bad request")) return "bad-request";

  return "unknown";
}

/** Giữ lại tên cũ cho code bên ngoài đang dùng. */
export function isAuthError(error: any): boolean {
  const kind = classifyGeminiError(error);
  return kind === "invalid-key" || kind === "unauthenticated" || kind === "key-forbidden";
}

export function isRateLimitOrQuotaError(error: any): boolean {
  const kind = classifyGeminiError(error);
  return kind === "quota" || kind === "overloaded";
}

/* ────────────────────────────────────────────────────────────
 * Vòng xoay key + hạ model
 * ──────────────────────────────────────────────────────────── */

export interface ExecutionResult<T> {
  data: T;
  modelUsed: string;
  keyIndexUsed: number;
  keyMasked: string;
  downgraded: boolean;
  retriesCount: number;
  /** Lượt gọi này có phải dùng tới key nhóm dự phòng hay không. */
  usedReserveKey: boolean;
}

/** Lỗi có mang theo nguyên nhân thật, không bị đổi tên thành "hết quota". */
export class GeminiExecutionError extends Error {
  kind: GeminiErrorKind;
  attempts: number;
  /** Nguyên văn lỗi cuối cùng của Google, để debug. */
  detail: string;
  /** Mã HTTP nên trả về cho client theo đúng loại lỗi. */
  httpStatus: number;

  constructor(kind: GeminiErrorKind, message: string, attempts: number, detail: string) {
    super(message);
    this.name = "GeminiExecutionError";
    this.kind = kind;
    this.attempts = attempts;
    this.detail = detail;
    this.httpStatus = HTTP_STATUS_BY_KIND[kind];
  }
}

interface Attempt {
  kind: GeminiErrorKind;
  model: string;
  keyIndex: number;
  message: string;
}

export interface RotationOptions {
  customModelTiers?: string[];
  /**
   * Trần thời gian cho cả vòng xoay (ms). Netlify giết function đồng bộ ở giây
   * thứ 60 và client nhận về trang HTML thay vì JSON nên không biết lý do —
   * dừng sớm hơn mốc đó vài giây để còn kịp trả một lỗi JSON đọc được.
   *
   * Chỉ đặt ở môi trường có trần cứng (Netlify Functions). Express chạy `npm
   * start`/`npm run dev` không bị giết nên để trống, tránh cắt ngang một
   * request chậm nhưng vẫn đang chạy tốt.
   */
  budgetMs?: number;
}

/**
 * Executes a Gemini operation with Round-Robin key rotation and automatic model fallback.
 *
 * Nguyên tắc:
 * 1. Round-Robin: mỗi request bốc key kế tiếp để chia đều hạn mức RPM.
 * 2. Key hỏng/hết quota -> chuyển key khác, và bị cách ly CÓ THỜI HẠN.
 * 3. Model không dùng được -> hạ xuống tier tiếp theo.
 * 4. Lỗi do chính request (400) -> dừng ngay, không đốt key vô ích.
 * 5. Thất bại hoàn toàn -> báo ĐÚNG nguyên nhân chiếm đa số, kèm lỗi gốc.
 */
export async function executeWithRotationAndFallback<T>(
  operation: (ai: GoogleGenAI, model: string, keyInfo: { index: number; masked: string }) => Promise<T>,
  options?: RotationOptions
): Promise<ExecutionResult<T>> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new GeminiExecutionError(
      "invalid-key",
      "Không tìm thấy GEMINI_API_KEY hợp lệ. Vui lòng cấu hình API key trong biến môi trường (.env hoặc Netlify Environment Variables).",
      0,
      "no keys configured"
    );
  }

  stats.totalRequests++;
  const modelTiers = options?.customModelTiers || FALLBACK_MODEL_IDS;

  const startedAt = Date.now();
  const budgetMs = options?.budgetMs;
  const outOfBudget = () => typeof budgetMs === "number" && Date.now() - startedAt > budgetMs;

  /**
   * Nhóm key theo ƯU TIÊN rồi trải phẳng thành từng lượt (nhóm × model).
   *
   * Vét cạn nhóm chính qua TẤT CẢ các tầng model rồi mới chạm nhóm dự phòng —
   * xem `getKeyGroups()`. Trải phẳng thay vì lồng thêm một vòng lặp nữa để giữ
   * nguyên độ sâu, nhờ đó toàn bộ luồng break/continue bên dưới không đổi nghĩa.
   */
  const groups = getKeyGroups();
  const passes: { entries: KeyEntry[]; model: string; modelIdx: number; group: string }[] = [];
  for (const group of groups) {
    modelTiers.forEach((model, modelIdx) =>
      passes.push({ entries: group.entries, model, modelIdx, group: group.label })
    );
  }

  /** Điểm bắt đầu round-robin, dùng chung cho mọi nhóm trong lần gọi này. */
  const roundRobinStart = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  const attempts: Attempt[] = [];
  /**
   * Key hỏng ở mức xác thực trong CHÍNH lần gọi này -> bỏ với mọi model sau.
   *
   * Lỗi 429 KHÔNG thuộc nhóm này. Hạn mức tính riêng cho từng model, nên key cạn
   * quota ở tier 1 vẫn còn nguyên quota ở tier 2. Bản trước gộp chung vào một tập
   * "spentKeys": hai key cùng dính 429 ở model đầu là vòng lặp thoát ngay, bốn
   * model dự phòng không bao giờ được gọi tới (modelDowngrades luôn bằng 0).
   */
  const deadKeys = new Set<number>();
  /** Mốc thời gian sớm nhất một cặp (key, model) bị bỏ qua sẽ hết cách ly. */
  let earliestRetryAt = Infinity;
  let skippedByQuarantine = 0;
  let budgetExhausted = false;

  /**
   * Trần số lần thử cho lỗi thoáng qua (500/503/không rõ).
   *
   * Những lỗi này không phải lỗi của key nên không "tiêu" key nào, và nếu không
   * chặn thì một cú 500 của Google sẽ kéo theo đủ (số key × số model) lần gọi —
   * với 3 key và 5 model là 15 request cho một lần bấm nút. Google hỏng thì thử
   * thêm chục lần nữa cũng hỏng; dừng sớm để người dùng nhận lỗi nhanh.
   */
  const MAX_TRANSIENT_ATTEMPTS = Math.max(3, keys.length * 2);
  let transientAttempts = 0;
  let transientCapReached = false;

  for (let p = 0; p < passes.length; p++) {
    const { entries, model: currentModel, modelIdx, group } = passes[p];
    const isDowngraded = modelIdx > 0;
    const initialKeyIndex = roundRobinStart % entries.length;

    if (transientCapReached) break;
    if (outOfBudget()) {
      budgetExhausted = true;
      break;
    }
    // Mọi key của nhóm này đều hỏng -> các tầng model còn lại của chính nhóm đó
    // cũng vô ích, bỏ qua để rơi sang nhóm kế tiếp.
    if (entries.every((e) => deadKeys.has(e.index))) continue;

    if (isDowngraded) {
      stats.modelDowngrades++;
      console.warn(
        `[Gemini Fallback] Hạ model xuống: ${currentModel} ` +
          `(Cấp ${modelIdx + 1}/${modelTiers.length}, nhóm key ${group})`
      );
    }

    for (let i = 0; i < entries.length; i++) {
      if (outOfBudget()) {
        budgetExhausted = true;
        break;
      }

      const entry = entries[(initialKeyIndex + i) % entries.length];
      const activeKeyIndex = entry.index;
      if (deadKeys.has(activeKeyIndex)) continue;

      const activeKey = entry.key;
      const masked = maskApiKey(activeKey);

      // Cặp (key, model) này vừa cạn quota ở request trước -> gọi lại chỉ tốn thêm
      // một lượt 429. Model khác của chính key này vẫn được thử bình thường.
      const scope = quotaScope(activeKey, currentModel);
      const held = getQuarantine(scope);
      if (held) {
        skippedByQuarantine++;
        earliestRetryAt = Math.min(earliestRetryAt, held.until);
        continue;
      }

      try {
        const ai = new GoogleGenAI({ apiKey: activeKey });
        const result = await operation(ai, currentModel, { index: activeKeyIndex, masked });

        stats.successfulRequests++;
        stats.lastUsedModel = currentModel;
        stats.lastUsedKeyIndex = activeKeyIndex;
        stats.lastFailureReason = null;
        // Đếm riêng số lần phải đụng tới key do người khác đóng góp.
        if (entry.reserve) stats.reserveKeyUses++;

        return {
          data: result,
          modelUsed: currentModel,
          keyIndexUsed: activeKeyIndex,
          keyMasked: masked,
          downgraded: isDowngraded,
          retriesCount: attempts.length,
          usedReserveKey: entry.reserve,
        };
      } catch (error: any) {
        const kind = classifyGeminiError(error);
        const message = String(error?.message || error);
        attempts.push({ kind, model: currentModel, keyIndex: activeKeyIndex, message });

        // Lỗi do chính request -> mọi key, mọi model đều hỏng như nhau. Dừng ngay.
        if (kind === "bad-request") {
          stats.lastFailureReason = message;
          throw new GeminiExecutionError(
            "bad-request",
            `Yêu cầu gửi lên Gemini không hợp lệ nên không key nào xử lý được: ${message}`,
            attempts.length,
            message
          );
        }

        // Model không tồn tại -> lỗi của model, đừng đổ cho key. Sang model sau.
        if (kind === "model-missing") {
          console.warn(`[Gemini] Model ${currentModel} không dùng được, hạ tier.`);
          break;
        }

        if (kind === "invalid-key" || kind === "unauthenticated" || kind === "key-forbidden") {
          stats.invalidKeyHits++;
          quarantineFor(activeKey, kind, KIND_LABEL[kind], message);
          deadKeys.add(activeKeyIndex);
          console.warn(
            `[Gemini] Key #${activeKeyIndex + 1} (${masked}) — ${KIND_LABEL[kind]}. ` +
              `Tạm nghỉ ${Math.round((QUARANTINE_MS[kind] || 0) / MINUTE)} phút rồi tự quay lại pool.`
          );
          continue;
        }

        if (kind === "quota") {
          stats.rateLimitHits++;
          // Chỉ cách ly cặp (key, model), và KHÔNG cho key vào deadKeys — nhờ vậy
          // chính key này vẫn được thử ở các model tier thấp hơn ngay lượt sau.
          const daily = isDailyQuota(message);
          quarantineFor(
            scope,
            daily ? "quota-daily" : "quota",
            daily ? "hết hạn mức theo ngày (429)" : KIND_LABEL[kind],
            message
          );
          console.warn(
            `[Gemini] Key #${activeKeyIndex + 1} (${masked}) hết quota trên ${currentModel}` +
              `${daily ? " (hạn mức theo ngày)" : ""} — hạ model rồi thử lại chính key này.`
          );
          continue;
        }

        // empty-response: model chạy được nhưng nội dung không dùng được. Không
        // phải lỗi của key, nên đổi MODEL chứ đừng đốt cả pool key ở cùng một
        // model — prompt bị bộ lọc của tier này chặn thì key khác cũng chặn y hệt.
        if (kind === "empty-response") {
          transientAttempts++;
          console.warn(`[Gemini] ${currentModel} trả nội dung rỗng: ${message}`);
          if (transientAttempts >= MAX_TRANSIENT_ATTEMPTS) {
            transientCapReached = true;
          }
          break; // sang model kế tiếp
        }

        // server-error / overloaded / unknown: không phải lỗi của key, không cách ly.
        // Nhưng phải có trần, nếu không một cú 500 kéo theo (key × model) lần gọi.
        if (kind === "server-error") stats.serverErrorHits++;
        transientAttempts++;
        console.warn(`[Gemini] ${KIND_LABEL[kind]} trên ${currentModel}: ${message}`);

        if (transientAttempts >= MAX_TRANSIENT_ATTEMPTS) {
          transientCapReached = true;
          console.warn(
            `[Gemini] Dừng sớm sau ${transientAttempts} lần gặp lỗi thoáng qua — thử tiếp cũng vô ích.`
          );
          break;
        }
        continue;
      }
    }
  }

  /* ── Thất bại hoàn toàn: báo đúng nguyên nhân ──────────────
   * Trước đây mọi thất bại đều thành "Tất cả API Key đều đã đạt giới hạn Quota",
   * kể cả khi thật ra là key sai hoặc Google lỗi 500. Người dùng đi mua thêm key
   * trong khi vấn đề nằm chỗ khác.
   */
  // Hết ngân sách thời gian trước khi Netlify kịp giết function. Báo riêng, vì
  // nếu để rơi xuống nhánh tally bên dưới thì lỗi sẽ mang tên nguyên nhân chiếm
  // đa số ("hết quota") trong khi thật ra là vòng xoay chạy quá lâu.
  if (budgetExhausted) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    const msg =
      `Hết thời gian cho phép của serverless function (đã dùng ${elapsed}s sau ${attempts.length} lượt thử, ` +
      `giới hạn cứng của Netlify là 60 giây). Thường do các key đầu bị nghẽn quota nên vòng xoay ngốn hết ` +
      `thời gian. Bấm thử lại hoặc rút ngắn yêu cầu.`;
    stats.lastFailureReason = msg;
    throw new GeminiExecutionError("timeout", msg, attempts.length, `budget ${budgetMs}ms exceeded`);
  }

  // Không gọi nổi lần nào vì mọi cặp (key, model) còn trong thời gian nghỉ quota.
  // Không có attempt nào để phân loại, nên phải báo riêng kèm thời gian chờ.
  if (attempts.length === 0 && skippedByQuarantine > 0) {
    const secondsLeft = Math.max(1, Math.ceil((earliestRetryAt - Date.now()) / 1000));
    const wait = secondsLeft >= 60 ? `${Math.ceil(secondsLeft / 60)} phút` : `${secondsLeft} giây`;
    const msg =
      `Toàn bộ ${keys.length} API Key đều đang trong thời gian nghỉ vì hết hạn mức. ` +
      `Chờ khoảng ${wait} rồi thử lại.`;
    stats.lastFailureReason = msg;
    throw new GeminiExecutionError("quota", msg, 0, `${skippedByQuarantine} cặp key/model đang bị cách ly`);
  }

  const tally = new Map<GeminiErrorKind, number>();
  for (const a of attempts) tally.set(a.kind, (tally.get(a.kind) || 0) + 1);

  const [dominantKind] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["unknown" as const];
  const lastAttempt = attempts[attempts.length - 1];
  const detail = lastAttempt?.message || "không có phản hồi từ Gemini";

  const breakdown = [...tally.entries()]
    .map(([kind, count]) => `${KIND_LABEL[kind]} ×${count}`)
    .join(", ");

  let message: string;
  switch (dominantKind) {
    case "quota": {
      // Nói rõ đã quét hết bao nhiêu model, và nhắc hạn mức tính theo project —
      // câu cũ chỉ ghi "tất cả N API Key đều đạt giới hạn", khiến người dùng đi
      // mua thêm key trong khi các key ấy có khi vẫn nằm chung một project.
      const modelsTried = new Set(attempts.map((a) => a.model)).size;
      message =
        `Cả ${keys.length} API Key đều đã hết hạn mức trên ${modelsTried}/${modelTiers.length} model dự phòng. ` +
        `Hạn mức miễn phí tính theo (project × model × ngày) chứ không theo key, nên nhiều key cùng một ` +
        `Google Cloud project sẽ dùng chung một hạn mức. Chi tiết: ${detail}`;
      break;
    }
    case "invalid-key":
    case "unauthenticated":
      message = `API Key không dùng được (${KIND_LABEL[dominantKind]}). Kiểm tra lại GEMINI_API_KEY trong biến môi trường. Chi tiết: ${detail}`;
      break;
    case "key-forbidden":
      message = `API Key bị từ chối quyền truy cập (403). Thường do chưa bật Generative Language API cho project, hoặc key bị giới hạn theo domain/IP. Chi tiết: ${detail}`;
      break;
    case "server-error":
      message = `Google đang gặp lỗi máy chủ (500) — không phải hết quota. Thử lại sau ít phút. Chi tiết: ${detail}`;
      break;
    case "overloaded":
      message = `Google đang quá tải (503). Thử lại sau ít phút.`;
      break;
    case "model-missing":
      message = `Không model nào trong danh sách dự phòng dùng được (${modelTiers.join(", ")}). Kiểm tra lại tên model. Chi tiết: ${detail}`;
      break;
    case "empty-response":
      // Đã thử hết các tier mà tier nào cũng trả rỗng -> gần như chắc chắn là bộ
      // lọc an toàn chặn nội dung prompt, không phải trục trặc kỹ thuật.
      message =
        `Cả ${new Set(attempts.map((a) => a.model)).size} model đều trả về nội dung rỗng. ` +
        `Thường là bộ lọc an toàn của Google chặn nội dung prompt — thử diễn đạt lại phần nhạy cảm. ` +
        `Chi tiết: ${detail}`;
      break;
    default:
      message = `Gọi Gemini thất bại sau ${attempts.length} lần thử. Chi tiết: ${detail}`;
  }

  stats.lastFailureReason = `${KIND_LABEL[dominantKind]} — ${detail}`;
  console.error(`[Gemini Rotation Failed] ${breakdown} | ${detail}`);

  throw new GeminiExecutionError(dominantKind, message, attempts.length, detail);
}

/**
 * Returns current rotation and model tier system status for UI / Health check
 */
export function getRotationStatus() {
  const { keys: rawKeys, reserveKeys, ignored, duplicateSources } = scanEnvKeys();
  const keys = getApiKeys();

  // Duyệt thẳng bảng cách ly: một bản ghi có thể gắn với cả key lẫn cặp key#model.
  const quarantinedKeys = [...quarantine.keys()]
    .map((id) => {
      const entry = getQuarantine(id); // tự dọn bản ghi đã hết hạn
      if (!entry) return null;
      const sep = id.lastIndexOf("#");
      const key = sep === -1 ? id : id.slice(0, sep);
      return {
        masked: maskApiKey(key),
        model: sep === -1 ? null : id.slice(sep + 1),
        reason: entry.reason,
        // Cắt bớt cho vừa modal; thông báo lỗi của Google không chứa key nên
        // đưa ra ngoài được. Không có dòng này thì chỉ biết "401", không biết vì sao.
        detail: entry.detail ? entry.detail.slice(0, 300) : undefined,
        secondsLeft: Math.max(0, Math.ceil((entry.until - Date.now()) / 1000)),
      };
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);

  return {
    status: "ok",
    totalKeysConfigured: rawKeys.length,
    usableKeysNow: keys.length,
    // Key khai trong biến môi trường nhưng bị loại, kèm lý do. Trước đây chúng bị
    // vứt lặng lẽ: cắm 5 key, app chỉ thấy 2, không một dòng cảnh báo nào.
    ignoredKeys: ignored,
    duplicateKeySources: duplicateSources,
    // Biến đặt sai TÊN nên không ai đọc. Rỗng là mọi biến đều được nhận đúng;
    // có tên nào ở đây nghĩa là key trong đó đang nằm ngoài pool mà không hay.
    unreadEnvVars: findUnreadKeyEnvVars(),
    // Kèm độ dài: key bị cắt lúc copy/dán vẫn qua được mọi bộ lọc định dạng rồi
    // ăn 401, và không có cách nào khác để nhìn ra. Độ dài không phải bí mật.
    // Số key mỗi nhóm. Nhóm dự phòng chỉ được đụng tới khi nhóm chính cạn sạch.
    primaryKeysConfigured: rawKeys.filter((k) => !reserveKeys.has(k)).length,
    reserveKeysConfigured: reserveKeys.size,
    maskedKeys: keys.map((k, idx) => ({
      index: idx + 1,
      masked: maskApiKey(k),
      length: k.length,
      role: reserveKeys.has(k) ? "dự phòng" : "chính",
    })),
    currentRoundRobinIndex: currentKeyIndex % (keys.length || 1),
    modelTiers: MODEL_FALLBACK_TIERS,
    // Key đang tạm nghỉ và bao lâu nữa quay lại — trước đây key bị loại vĩnh viễn
    // mà không hiện ở đâu cả, không có cách nào biết pool đã hụt.
    quarantinedKeys,
    stats: {
      ...stats,
      successRate:
        stats.totalRequests > 0
          ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1) + "%"
          : "100%",
    },
  };
}

/** Dọn sạch cách ly — dùng cho test và cho nút "thử lại toàn bộ key". */
export function clearQuarantine(): void {
  quarantine.clear();
}
