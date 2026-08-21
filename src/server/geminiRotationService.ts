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
const quarantine = new Map<string, { until: number; reason: string }>();

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

function quarantineFor(id: string, kind: string, reason: string): void {
  const ms = QUARANTINE_MS[kind];
  if (!ms) return;
  quarantine.set(id, { until: Date.now() + ms, reason });
}

/** Trả về bản ghi cách ly còn hiệu lực, tự dọn bản ghi đã hết hạn. */
function getQuarantine(id: string): { until: number; reason: string } | null {
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
  keys: string[];
  ignored: IgnoredKey[];
  /** Biến có giá trị trùng với một key đã đọc trước đó -> không tính thêm suất. */
  duplicateSources: string[];
}

/**
 * Quét biến môi trường lấy key, đồng thời ghi lại thứ bị loại và vì sao.
 * Hỗ trợ GEMINI_API_KEY, GEMINI_API_KEYS="k1,k2", và GEMINI_API_KEY_1..10.
 *
 * Giữ nguyên thứ tự khai báo — số thứ tự key hiện trong modal khớp với biến môi
 * trường. (Bản trước xếp key "AIza" lên đầu vì cho rằng chỉ nó mới là key thật;
 * nay hai định dạng ngang nhau nên việc xếp lại chỉ làm rối khi đối chiếu.)
 */
function scanEnvKeys(): EnvKeyScan {
  const keys: string[] = [];
  const ignored: IgnoredKey[] = [];
  const duplicateSources: string[] = [];

  const consider = (source: string, raw: string | undefined) => {
    const trimmed = raw?.trim();
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
  };

  consider("GEMINI_API_KEY", process.env.GEMINI_API_KEY);

  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(",").forEach((k, i) =>
      consider(`GEMINI_API_KEYS[${i + 1}]`, k)
    );
  }

  for (let i = 1; i <= 10; i++) {
    consider(`GEMINI_API_KEY_${i}`, process.env[`GEMINI_API_KEY_${i}`]);
  }

  return { keys, ignored, duplicateSources };
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
  unknown: "lỗi không xác định",
};

export function classifyGeminiError(error: any): GeminiErrorKind {
  if (!error) return "unknown";

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
}

/** Lỗi có mang theo nguyên nhân thật, không bị đổi tên thành "hết quota". */
export class GeminiExecutionError extends Error {
  kind: GeminiErrorKind;
  attempts: number;
  /** Nguyên văn lỗi cuối cùng của Google, để debug. */
  detail: string;

  constructor(kind: GeminiErrorKind, message: string, attempts: number, detail: string) {
    super(message);
    this.name = "GeminiExecutionError";
    this.kind = kind;
    this.attempts = attempts;
    this.detail = detail;
  }
}

interface Attempt {
  kind: GeminiErrorKind;
  model: string;
  keyIndex: number;
  message: string;
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
  options?: { customModelTiers?: string[] }
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
  const initialKeyIndex = currentKeyIndex % keys.length;
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

  for (let modelIdx = 0; modelIdx < modelTiers.length; modelIdx++) {
    const currentModel = modelTiers[modelIdx];
    const isDowngraded = modelIdx > 0;

    if (transientCapReached) break;
    if (deadKeys.size >= keys.length) break; // mọi key đều hỏng, hạ model cũng vô ích

    if (isDowngraded) {
      stats.modelDowngrades++;
      console.warn(
        `[Gemini Fallback] Hạ model xuống: ${currentModel} (Cấp ${modelIdx + 1}/${modelTiers.length})`
      );
    }

    for (let i = 0; i < keys.length; i++) {
      const activeKeyIndex = (initialKeyIndex + i) % keys.length;
      if (deadKeys.has(activeKeyIndex)) continue;

      const activeKey = keys[activeKeyIndex];
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

        return {
          data: result,
          modelUsed: currentModel,
          keyIndexUsed: activeKeyIndex,
          keyMasked: masked,
          downgraded: isDowngraded,
          retriesCount: attempts.length,
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
          quarantineFor(activeKey, kind, KIND_LABEL[kind]);
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
            daily ? "hết hạn mức theo ngày (429)" : KIND_LABEL[kind]
          );
          console.warn(
            `[Gemini] Key #${activeKeyIndex + 1} (${masked}) hết quota trên ${currentModel}` +
              `${daily ? " (hạn mức theo ngày)" : ""} — hạ model rồi thử lại chính key này.`
          );
          continue;
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
  const { keys: rawKeys, ignored, duplicateSources } = scanEnvKeys();
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
    maskedKeys: keys.map((k, idx) => ({ index: idx + 1, masked: maskApiKey(k) })),
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
