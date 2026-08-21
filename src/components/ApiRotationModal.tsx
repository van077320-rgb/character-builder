import React, { useState, useEffect } from "react";
import { 
  X, 
  Cpu, 
  RotateCw, 
  ShieldCheck, 
  Layers, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Globe, 
  Activity,
  Terminal,
  ArrowRight,
  Info
} from "lucide-react";
import { StarIcon, FourPointStar } from "./CloudStarDecorations";

interface ApiRotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

interface ServerStatus {
  status: string;
  totalKeysConfigured: number;
  /** Số key còn dùng được ngay lúc này (đã trừ key đang bị cách ly). */
  usableKeysNow?: number;
  maskedKeys: Array<{ index: number; masked: string }>;
  currentRoundRobinIndex: number;
  modelTiers: Array<{ id: string; name: string; tier: number; description: string }>;
  /** Key đang tạm nghỉ vì lỗi, kèm model bị ảnh hưởng và thời gian còn lại. */
  quarantinedKeys?: Array<{
    masked: string;
    model?: string | null;
    reason: string;
    secondsLeft: number;
  }>;
  /** Key khai trong biến môi trường nhưng bị loại, kèm lý do. */
  ignoredKeys?: Array<{ source: string; masked: string; reason: string }>;
  /** Biến môi trường trùng giá trị với key khác nên không tính thêm suất. */
  duplicateKeySources?: string[];
  stats: {
    totalRequests: number;
    successfulRequests: number;
    rateLimitHits: number;
    serverErrorHits?: number;
    modelDowngrades: number;
    lastUsedModel: string;
    lastUsedKeyIndex: number;
    successRate: string;
    lastFailureReason?: string | null;
  };
}

export const ApiRotationModal: React.FC<ApiRotationModalProps> = ({
  isOpen,
  onClose,
  isDark,
}) => {
  const [statusData, setStatusData] = useState<ServerStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/gemini/status");
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Trước đây nhánh này không tồn tại: server trả 404/405/500 là modal im
        // lặng hiện số 0, không có cách nào biết endpoint đang hỏng.
        throw new Error(
          data?.error || `Máy chủ trả về ${res.status} khi gọi /api/gemini/status.`
        );
      }
      if (!data || typeof data.totalKeysConfigured !== "number" || !data.stats) {
        throw new Error("Máy chủ trả về dữ liệu trạng thái không đúng định dạng.");
      }

      setStatusData(data);
    } catch (e: any) {
      console.error("Failed to fetch rotation status", e);
      setStatusData(null);
      setStatusError(e?.message || "Không thể kết nối tới máy chủ trạng thái.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setTestResult(null);
    }
  }, [isOpen]);

  const handleTestChat = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Kiểm tra kết nối hệ thống xoay key. Hãy chào ngắn gọn 1 câu.",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: `Kết nối thành công! Phục vụ bởi Model [${data.modelUsed}] qua Key #${(data.keyIndexUsed ?? 0) + 1} (${data.keyMasked || "Masked"}). Phản hồi: "${data.text?.trim()}"`,
        });
        fetchStatus();
      } else {
        setTestResult({
          success: false,
          message: data.error || "Không thể kết nối.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Lỗi mạng hoặc server không phản hồi.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className={`relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-sky-200 text-slate-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? "bg-slate-800/80 border-slate-800" : "bg-sky-50/80 border-sky-100"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDark ? "bg-indigo-950/80 text-sky-400" : "bg-sky-100 text-sky-700"}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  Cơ Chế Xoay Vòng Key & Hạ Model Tự Động
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-sky-800/80"}`}>
                Hệ thống bảo vệ hạn mức RPM và đảm bảo ứng dụng không bao giờ bị đứng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
              title="Làm mới trạng thái"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Không lấy được trạng thái -> nói thẳng, không hiện số 0 giả */}
          {statusError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không đọc được trạng thái Key Pool</p>
                <p className="opacity-90 mt-0.5">{statusError}</p>
                <p className="opacity-70 mt-1">
                  Các số liệu bên dưới đang không phản ánh máy chủ thật.
                </p>
              </div>
            </div>
          )}

          {/* Overview Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Pillar 1 */}
            <div className={`p-3.5 rounded-xl border ${
              isDark ? "bg-slate-800/60 border-slate-700/80" : "bg-sky-50/60 border-sky-200"
            } space-y-1.5`}>
              <div className="flex items-center gap-2 font-bold text-sky-600 dark:text-sky-400">
                <RotateCw className="w-4 h-4 shrink-0" />
                <span>Round-Robin Key</span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                Bốc tuần tự từng key trong danh sách để phân bổ đều lưu lượng, tránh dồn tải và quá hạn mức RPM.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className={`p-3.5 rounded-xl border ${
              isDark ? "bg-slate-800/60 border-slate-700/80" : "bg-emerald-50/60 border-emerald-200"
            } space-y-1.5`}>
              <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Bắt Lỗi 429 / 503</span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                Khi một key hết hạn mức (Resource Exhausted) hoặc 503, tự động chuyển ngay sang key tiếp theo mà không làm gián đoạn người dùng.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className={`p-3.5 rounded-xl border ${
              isDark ? "bg-slate-800/60 border-slate-700/80" : "bg-purple-50/60 border-purple-200"
            } space-y-1.5`}>
              <div className="flex items-center gap-2 font-bold text-purple-600 dark:text-purple-400">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Tự Động Hạ Model</span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                Luôn gọi model mạnh nhất từ đầu. Chỉ tự động hạ xuống model nhẹ hơn khi toàn bộ key của model trước đó hết quota.
              </p>
            </div>
          </div>

          {/* Model Fallback Hierarchy */}
          <div className={`p-4 rounded-xl border ${
            isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-500" />
                Thứ Tự Ưu Tiên Model (Model Priority Hierarchy)
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Khởi đầu luôn từ Cấp 1
              </span>
            </div>

            <div className="space-y-2">
              {/* Tier 1 */}
              <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                isDark ? "bg-indigo-950/30 border-indigo-800/60" : "bg-indigo-50 border-indigo-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold">
                    Cấp 1 (Gốc)
                  </span>
                  <div>
                    <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                      Gemini 3.7 Flash
                    </div>
                    <div className="text-xs opacity-80">
                      Model thông minh nhất, tối ưu tư duy và chiều sâu thiết lập nhân vật.
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  Mặc định gọi
                </span>
              </div>

              <div className="flex justify-center -my-1 text-slate-400">
                <span className="text-[10px] font-semibold">↓ Tự động hạ nếu toàn bộ key dính 429 trên Cấp 1</span>
              </div>

              {/* Tier 2 */}
              <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-sky-600 text-white text-xs font-bold">
                    Cấp 2 (Dự phòng 1)
                  </span>
                  <div>
                    <div className="font-bold text-sm text-sky-600 dark:text-sky-400">
                      Gemini 3.5 Flash
                    </div>
                    <div className="text-xs opacity-80">
                      Model thế hệ 3.5 ổn định tốc độ cao, khả năng xử lý mượt mà.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-slate-400">
                <span className="text-[10px] font-semibold">↓ Tự động hạ nếu toàn bộ key dính 429 trên Cấp 2</span>
              </div>

              {/* Tier 3 */}
              <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold">
                    Cấp 3 (Dự phòng 2)
                  </span>
                  <div>
                    <div className="font-bold text-sm text-blue-600 dark:text-blue-400">
                      Gemini 3 Flash Preview
                    </div>
                    <div className="text-xs opacity-80">
                      Phiên bản Gemini 3 Flash tốc độ cao tối ưu độ trễ.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-slate-400">
                <span className="text-[10px] font-semibold">↓ Tự động hạ nếu toàn bộ key dính 429 trên Cấp 3</span>
              </div>

              {/* Tier 4 */}
              <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-amber-600 text-white text-xs font-bold">
                    Cấp 4 (Cứu cánh 1)
                  </span>
                  <div>
                    <div className="font-bold text-sm text-amber-600 dark:text-amber-400">
                      Gemini 3.1 Flash Lite
                    </div>
                    <div className="text-xs opacity-80">
                      Model dung lượng nhẹ, phản hồi nhanh và tiết kiệm tài nguyên.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-slate-400">
                <span className="text-[10px] font-semibold">↓ Tự động hạ nếu toàn bộ key dính 429 trên Cấp 4</span>
              </div>

              {/* Tier 5 */}
              <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-rose-600 text-white text-xs font-bold">
                    Cấp 5 (Cứu cánh 2)
                  </span>
                  <div>
                    <div className="font-bold text-sm text-rose-600 dark:text-rose-400">
                      Gemini Flash Latest
                    </div>
                    <div className="text-xs opacity-80">
                      Model dự phòng tự động trỏ tới bản phát hành Flash khả dụng mới nhất.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Pool Status & Live Monitor */}
          <div className={`p-4 rounded-xl border ${
            isDark ? "bg-slate-800/50 border-slate-700" : "bg-sky-50/40 border-sky-200"
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-500" />
                Trạng Thái Key Pool & Thống Kê Vận Hành
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-semibold">
                {typeof statusData?.usableKeysNow === "number" &&
                statusData.usableKeysNow !== statusData.totalKeysConfigured
                  ? `${statusData.usableKeysNow}/${statusData.totalKeysConfigured} API Key dùng được`
                  : `${statusData?.totalKeysConfigured ?? 0} API Key đang cấu hình`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className={`p-2.5 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-sky-100"}`}>
                <div className="text-[10px] opacity-70">Tổng request</div>
                <div className="text-base font-bold text-sky-500">{statusData?.stats?.totalRequests || 0}</div>
              </div>
              <div className={`p-2.5 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-sky-100"}`}>
                <div className="text-[10px] opacity-70">Thành công</div>
                <div className="text-base font-bold text-emerald-500">{statusData?.stats?.successfulRequests || 0}</div>
              </div>
              <div className={`p-2.5 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-sky-100"}`}>
                <div className="text-[10px] opacity-70">Lượt xoay 429</div>
                <div className="text-base font-bold text-amber-500">{statusData?.stats?.rateLimitHits || 0}</div>
              </div>
              <div className={`p-2.5 rounded-lg border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-sky-100"}`}>
                <div className="text-[10px] opacity-70">Lượt hạ model</div>
                <div className="text-base font-bold text-purple-500">{statusData?.stats?.modelDowngrades || 0}</div>
              </div>
            </div>

            {/* Key đang tạm nghỉ — trước đây key bị loại vĩnh viễn mà không hiện ở đâu */}
            {statusData?.quarantinedKeys && statusData.quarantinedKeys.length > 0 && (
              <div className={`p-3 rounded-lg border space-y-1.5 ${
                isDark ? "bg-amber-950/30 border-amber-800/60" : "bg-amber-50 border-amber-200"
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{statusData.quarantinedKeys.length} key đang tạm nghỉ (tự quay lại pool khi hết giờ)</span>
                </div>
                {statusData.quarantinedKeys.map((k) => (
                  <div
                    key={`${k.masked}#${k.model ?? "all"}`}
                    className="flex items-center justify-between gap-2 text-[11px] pl-5"
                  >
                    <code className="font-mono opacity-80 truncate">
                      {k.masked}
                      {/* Hết quota là chuyện của riêng một model, key vẫn chạy ở model khác */}
                      {k.model && <span className="opacity-60"> @ {k.model}</span>}
                    </code>
                    <span className="opacity-75 truncate">{k.reason}</span>
                    <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">
                      còn {k.secondsLeft >= 60 ? `${Math.ceil(k.secondsLeft / 60)} phút` : `${k.secondsLeft}s`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Key khai trong env nhưng bị loại — trước đây bị vứt lặng lẽ */}
            {statusData?.ignoredKeys && statusData.ignoredKeys.length > 0 && (
              <div className={`p-3 rounded-lg border space-y-1.5 ${
                isDark ? "bg-rose-950/30 border-rose-800/60" : "bg-rose-50 border-rose-200"
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{statusData.ignoredKeys.length} key bị bỏ qua vì sai định dạng</span>
                </div>
                {statusData.ignoredKeys.map((k) => (
                  <div key={k.source} className="text-[11px] pl-5">
                    <code className="font-mono opacity-80">{k.source}</code>
                    <span className="opacity-60"> ({k.masked}): </span>
                    <span className="opacity-90">{k.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {statusData?.duplicateKeySources && statusData.duplicateKeySources.length > 0 && (
              <div className="text-[11px] opacity-75 pl-1">
                Trùng giá trị với key khác nên không tính thêm suất:{" "}
                <code className="font-mono">{statusData.duplicateKeySources.join(", ")}</code>
              </div>
            )}

            {/* Nguyên nhân thất bại gần nhất, nói đúng loại lỗi */}
            {statusData?.stats?.lastFailureReason && (
              <div className="text-[11px] opacity-75 pl-1">
                Lỗi gần nhất: <span className="font-mono">{statusData.stats.lastFailureReason}</span>
              </div>
            )}

            {/* Test Trigger Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs opacity-75">
                Kiểm tra luân chuyển key qua endpoint <code>/api/chat</code>:
              </span>
              <button
                type="button"
                onClick={handleTestChat}
                disabled={isTesting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                <span>{isTesting ? "Đang gửi ping..." : "Kiểm Tra Xoay Key Ngay"}</span>
              </button>
            </div>

            {/* Test Result Box */}
            {testResult && (
              <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                testResult.success 
                  ? isDark ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : isDark ? "bg-rose-950/40 border-rose-800 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{testResult.success ? "Ping Thành Công" : "Lỗi Kết Nối"}</span>
                </div>
                <div>{testResult.message}</div>
              </div>
            )}
          </div>

          {/* Netlify Functions Architecture Note */}
          <div className={`p-4 rounded-xl border ${
            isDark ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-sky-50/50 border-sky-200 text-sky-900"
          } space-y-2 text-xs`}>
            <div className="flex items-center gap-2 font-bold text-sky-600 dark:text-sky-400">
              <Globe className="w-4 h-4" />
              <span>Bảo mật API Key & Sẵn sàng cho Netlify Serverless Functions</span>
            </div>
            <p>
              • <strong>Không lộ API Key ở Frontend:</strong> Mọi thao tác xoay vòng key đều được thực thi ở tầng Serverless Backend (Netlify Functions / Express Server) tại endpoint <code>/api/chat</code>.
            </p>
            <p>
              • <strong>Cách cấu hình nhiều Key:</strong> Điền biến môi trường <code>GEMINI_API_KEYS="key1,key2,key3"</code> trong bảng điều khiển Netlify / Secrets để kích hoạt xoay vòng Round-Robin phân tán hạn mức.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-3.5 border-t flex justify-end ${
          isDark ? "bg-slate-950/80 border-slate-800" : "bg-sky-50/40 border-sky-100"
        }`}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
