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

/** key -> mốc hết cách ly (epoch ms) */
const quarantine = new Map<string, { until: number; reason: string }>();

const MINUTE = 60_000;

/** Thời hạn cách ly theo từng loại lỗi. */
const QUARANTINE_MS: Record<string, number> = {
  "invalid-key": 6 * 60 * MINUTE, // key sai thật -> nghỉ lâu
  unauthenticated: 10 * MINUTE, // 401
  "key-forbidden": 5 * MINUTE, // 403 tạm thời -> nghỉ ngắn rồi thử lại
  quota: 1 * MINUTE, // 429 -> chỉ cần né trong chốc lát
};

function quarantineKey(key: string, kind: string, reason: string): void {
  const ms = QUARANTINE_MS[kind];
  if (!ms) return;
  quarantine.set(key, { until: Date.now() + ms, reason });
}

function isQuarantined(key: string): boolean {
  const entry = quarantine.get(key);
  if (!entry) return false;
  if (Date.now() >= entry.until) {
    quarantine.delete(key); // hết hạn -> tự quay lại pool
    return false;
  }
  return true;
}

/**
 * Filter out invalid placeholder tokens, OAuth access tokens, and malformed strings
 */
function isValidKeyFormat(key: string | undefined): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed === "MY_GEMINI_API_KEY" ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed.startsWith("AQ.") || // Non-API token / gcloud access token
    trimmed.startsWith("ya29.") || // Google OAuth Access Token
    trimmed.startsWith("Bearer ")
  ) {
    return false;
  }
  // Standard Google AI API key starts with AIzaSy or AIza
  if (trimmed.startsWith("AIza")) {
    return trimmed.length >= 25;
  }
  return trimmed.length >= 20;
}

/**
 * Đọc mọi key hợp lệ từ biến môi trường, chưa lọc cách ly.
 * Hỗ trợ GEMINI_API_KEY, GEMINI_API_KEYS="k1,k2", và GEMINI_API_KEY_1..10
 */
function getAllRawKeys(): string[] {
  const rawKeys: string[] = [];

  if (isValidKeyFormat(process.env.GEMINI_API_KEY)) {
    rawKeys.push(process.env.GEMINI_API_KEY!.trim());
  }

  if (process.env.GEMINI_API_KEYS) {
    const splitKeys = process.env.GEMINI_API_KEYS.split(",")
      .map((k) => k.trim())
      .filter((k) => isValidKeyFormat(k));
    for (const k of splitKeys) {
      if (!rawKeys.includes(k)) rawKeys.push(k);
    }
  }

  for (let i = 1; i <= 10; i++) {
    const numKey = process.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (isValidKeyFormat(numKey) && !rawKeys.includes(numKey!)) {
      rawKeys.push(numKey!);
    }
  }

  // Ưu tiên key dạng AIza (key AI Studio thật)
  rawKeys.sort((a, b) => {
    const aIsAIza = a.startsWith("AIza") ? 1 : 0;
    const bIsAIza = b.startsWith("AIza") ? 1 : 0;
    return bIsAIza - aIsAIza;
  });

  return rawKeys;
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
  /** Key đã hỏng trong CHÍNH lần gọi này -> không thử lại ở các model sau. */
  const spentKeys = new Set<number>();

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
    if (spentKeys.size >= keys.length) break; // hết key dùng được, hạ model cũng vô ích

    if (isDowngraded) {
      stats.modelDowngrades++;
      console.warn(
        `[Gemini Fallback] Hạ model xuống: ${currentModel} (Cấp ${modelIdx + 1}/${modelTiers.length})`
      );
    }

    for (let i = 0; i < keys.length; i++) {
      const activeKeyIndex = (initialKeyIndex + i) % keys.length;
      if (spentKeys.has(activeKeyIndex)) continue;

      const activeKey = keys[activeKeyIndex];
      const masked = maskApiKey(activeKey);

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
          quarantineKey(activeKey, kind, KIND_LABEL[kind]);
          spentKeys.add(activeKeyIndex);
          console.warn(
            `[Gemini] Key #${activeKeyIndex + 1} (${masked}) — ${KIND_LABEL[kind]}. ` +
              `Tạm nghỉ ${Math.round((QUARANTINE_MS[kind] || 0) / MINUTE)} phút rồi tự quay lại pool.`
          );
          continue;
        }

        if (kind === "quota") {
          stats.rateLimitHits++;
          quarantineKey(activeKey, kind, KIND_LABEL[kind]);
          spentKeys.add(activeKeyIndex);
          console.warn(`[Gemini] Key #${activeKeyIndex + 1} (${masked}) hết quota trên ${currentModel}.`);
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
    case "quota":
      message = `Tất cả ${keys.length} API Key đều đã đạt giới hạn quota. Chờ 1-2 phút rồi thử lại.`;
      break;
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
  const rawKeys = getAllRawKeys();
  const keys = getApiKeys();

  const quarantinedKeys = rawKeys
    .filter((k) => isQuarantined(k))
    .map((k) => {
      const entry = quarantine.get(k)!;
      return {
        masked: maskApiKey(k),
        reason: entry.reason,
        secondsLeft: Math.max(0, Math.ceil((entry.until - Date.now()) / 1000)),
      };
    });

  return {
    status: "ok",
    totalKeysConfigured: keys.length,
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
