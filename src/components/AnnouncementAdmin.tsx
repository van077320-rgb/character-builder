import React, { useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import {
  subscribeAnnouncements,
  createAnnouncement,
  setAnnouncementActive,
  setAnnouncementExpiry,
  deleteAnnouncement,
  isAnnouncementExpired,
  expiryFromDays,
  expiryFromDateInput,
  ANNOUNCEMENT_TEXT_MAX,
  ANNOUNCEMENT_TONES,
  EXPIRY_PRESETS,
  EXPIRY_CUSTOM,
  type AnnouncementState,
  type AnnouncementTone,
} from "../announcementService";

interface AnnouncementAdminProps {
  isDark: boolean;
  onToast: (message: string) => void;
}

/** Hôm nay theo định dạng `<input type="date">` cần, dùng làm mốc `min`. */
function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Mốc hết hạn nói theo kiểu người đọc hiểu ngay.
 *
 * "sau 6 ngày nữa" trả lời đúng câu hỏi admin đang nghĩ, còn một mốc ngày tuyệt
 * đối thì phải nhẩm mới ra. Quá một tuần thì ngược lại — lúc đó ngày cụ thể mới
 * là thứ đáng nhớ.
 */
function formatExpiry(expiresAt: number, now: number = Date.now()): string {
  const diff = expiresAt - now;
  const dateText = new Date(expiresAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (diff <= 0) return `từ ${dateText}`;
  if (diff < 3_600_000) return `sau ${Math.ceil(diff / 60_000)} phút nữa`;
  if (diff < 86_400_000) return `sau ${Math.ceil(diff / 3_600_000)} giờ nữa`;
  if (diff < 7 * 86_400_000) return `sau ${Math.ceil(diff / 86_400_000)} ngày nữa`;
  return `ngày ${dateText}`;
}

/**
 * Bảng đăng thông báo. CHỈ hiện với admin — nhưng việc chặn thật nằm ở
 * `firestore.rules`, không phải ở chỗ ẩn component này. Ai đó sửa JS trong trình
 * duyệt để hiện bảng ra thì vẫn bấm gửi được, chỉ là Firestore từ chối và họ nhận
 * đúng một dòng "Không được phép đăng thông báo".
 */
export const AnnouncementAdmin: React.FC<AnnouncementAdminProps> = ({ isDark, onToast }) => {
  const [state, setState] = useState<AnnouncementState>({ status: "loading" });
  const [text, setText] = useState("");
  const [tone, setTone] = useState<AnnouncementTone>("new");
  const [expiryChoice, setExpiryChoice] = useState<string>("never");
  const [customDate, setCustomDate] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => subscribeAnnouncements(setState), []);

  /** Ô sổ xuống + ô ngày -> một mốc thời gian, hoặc `null` nếu không hết hạn. */
  const resolveExpiry = (): Date | null => {
    if (expiryChoice === EXPIRY_CUSTOM) return expiryFromDateInput(customDate);
    const preset = EXPIRY_PRESETS.find((p) => p.value === expiryChoice);
    return preset?.days ? expiryFromDays(preset.days) : null;
  };

  const handleCreate = async () => {
    setError(null);

    if (expiryChoice === EXPIRY_CUSTOM && !customDate) {
      setError("Bạn chọn ngày cụ thể nhưng chưa điền ngày nào.");
      return;
    }

    setIsSending(true);
    try {
      await createAnnouncement({ text, tone, expiresAt: resolveExpiry() });
      setText("");
      onToast("Đã đăng thông báo lên trang chủ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  /** Gộp bật/tắt và xoá vào một chỗ để phần khoá nút và báo lỗi không viết hai lần. */
  const runOnItem = async (id: string, task: () => Promise<void>, successMessage: string) => {
    setError(null);
    setBusyId(id);
    try {
      await task();
      onToast(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const items = state.status === "ready" ? state.items : [];
  const remaining = ANNOUNCEMENT_TEXT_MAX - text.trim().length;

  // Một mốc dùng chung cho cả lần vẽ này, để mọi dòng cùng so với một thời điểm
  const now = Date.now();
  const previewExpiry = resolveExpiry();

  const inputClass = `w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border outline-hidden transition-colors ${
    isDark
      ? "bg-slate-950/70 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500"
      : "bg-white border-sky-200 text-slate-800 placeholder-slate-400 focus:border-sky-400"
  }`;

  const selectClass = `text-xs px-2.5 py-2 rounded-xl border cursor-pointer outline-hidden ${
    isDark
      ? "bg-slate-950/70 border-slate-700 text-slate-200"
      : "bg-white border-sky-200 text-slate-700"
  }`;

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${
        isDark ? "bg-indigo-950/25 border-indigo-800/60" : "bg-indigo-50/60 border-indigo-200"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-3 border-b ${
          isDark ? "border-indigo-800/60" : "border-indigo-200"
        }`}
      >
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
        <h3 className="font-bold text-xs sm:text-sm">Bảng quản trị — Thông báo trang chủ</h3>
        <span
          className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isDark ? "bg-indigo-900/70 text-indigo-300" : "bg-indigo-100 text-indigo-700"
          }`}
        >
          Admin
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <textarea
            id="input-announcement-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={ANNOUNCEMENT_TEXT_MAX}
            placeholder="Ví dụ: Web vừa có mục Lưu bút — mời bạn để lại vài dòng nhé!"
            className={`${inputClass} resize-y`}
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="select-announcement-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as AnnouncementTone)}
              className={selectClass}
            >
              {ANNOUNCEMENT_TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              id="select-announcement-expiry"
              value={expiryChoice}
              onChange={(e) => setExpiryChoice(e.target.value)}
              title="Sau mốc này thông báo tự biến mất khỏi trang chủ"
              className={selectClass}
            >
              {EXPIRY_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value={EXPIRY_CUSTOM}>Chọn ngày cụ thể...</option>
            </select>

            {expiryChoice === EXPIRY_CUSTOM && (
              <input
                id="input-announcement-expiry-date"
                type="date"
                value={customDate}
                min={todayInputValue()}
                onChange={(e) => setCustomDate(e.target.value)}
                title="Thông báo hiện hết ngày này rồi mới ẩn"
                className={selectClass}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[11px] ${remaining < 0 ? "text-rose-500 font-bold" : "opacity-60"}`}>
              còn {remaining} ký tự
            </span>

            {/* Nói trước cái sắp xảy ra. Riêng lúc chọn "ngày cụ thể" mà chưa điền
                thì phải nhắc, chứ báo "chạy tới khi bạn tự tắt" là nói dối —
                bấm Đăng lúc đó chỉ nhận về một dòng lỗi. */}
            <span className="text-[11px] opacity-60">
              {expiryChoice === EXPIRY_CUSTOM && !customDate
                ? "chưa chọn ngày hết hạn"
                : previewExpiry
                  ? `sẽ tự ẩn ${formatExpiry(previewExpiry.getTime())}`
                  : "chạy tới khi bạn tự tắt"}
            </span>

            <button
              id="btn-post-announcement"
              onClick={handleCreate}
              disabled={isSending || !text.trim()}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer transition-colors"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Đăng thông báo</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl border bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Danh sách thông báo đã đăng */}
        {state.status === "error" ? (
          <p className="text-[11px] text-rose-500">{state.message}</p>
        ) : items.length === 0 ? (
          <p className="text-[11px] opacity-60 italic">
            {state.status === "loading" ? "Đang tải..." : "Chưa có thông báo nào."}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const expired = isAnnouncementExpired(item, now);
              // Hết hạn cũng là "không hiện", nên trông phải giống hệt lúc bị tắt
              const onAir = item.active && !expired;

              return (
              <li
                key={item.id}
                className={`flex items-start gap-2 p-2.5 rounded-xl border text-[11px] sm:text-xs ${
                  onAir
                    ? isDark
                      ? "bg-slate-900/80 border-slate-700"
                      : "bg-white border-sky-200"
                    : isDark
                      ? "bg-slate-900/40 border-slate-800 opacity-60"
                      : "bg-slate-100/70 border-slate-200 opacity-70"
                }`}
              >
                <Megaphone
                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    onAir ? "text-indigo-500" : "opacity-40"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="leading-relaxed break-words">
                    {item.text}
                    {!item.active && <span className="ml-1.5 opacity-70 italic">(đang tắt)</span>}
                  </p>

                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] opacity-70">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 shrink-0" />
                      {item.expiresAt === null
                        ? "không hết hạn"
                        : expired
                          ? `đã hết hạn ${formatExpiry(item.expiresAt, now)}`
                          : `tự ẩn ${formatExpiry(item.expiresAt, now)}`}
                    </span>

                    {expired && (
                      <button
                        onClick={() =>
                          runOnItem(
                            item.id,
                            () => setAnnouncementExpiry(item.id, expiryFromDays(7)),
                            "Đã gia hạn thêm 7 ngày."
                          )
                        }
                        disabled={busyId === item.id}
                        className="font-bold text-sky-600 dark:text-sky-400 underline underline-offset-2 cursor-pointer disabled:opacity-50"
                      >
                        gia hạn 7 ngày
                      </button>
                    )}

                    {!expired && item.expiresAt !== null && (
                      <button
                        onClick={() =>
                          runOnItem(
                            item.id,
                            () => setAnnouncementExpiry(item.id, null),
                            "Đã bỏ hạn — thông báo chạy tới khi bạn tự tắt."
                          )
                        }
                        disabled={busyId === item.id}
                        className="font-bold text-sky-600 dark:text-sky-400 underline underline-offset-2 cursor-pointer disabled:opacity-50"
                      >
                        bỏ hạn
                      </button>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      runOnItem(
                        item.id,
                        () => setAnnouncementActive(item.id, !item.active),
                        item.active ? "Đã tắt thông báo." : "Đã bật lại thông báo."
                      )
                    }
                    disabled={busyId === item.id}
                    title={
                      item.active
                        ? "Tắt (giữ lại để bật sau)"
                        : expired
                          ? "Bật lại — nhưng còn phải gia hạn thì mới hiện được"
                          : "Bật hiện lên trang chủ"
                    }
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                        : "bg-white border-sky-200 hover:bg-sky-50"
                    }`}
                  >
                    {item.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() =>
                      runOnItem(item.id, () => deleteAnnouncement(item.id), "Đã xoá thông báo.")
                    }
                    disabled={busyId === item.id}
                    title="Xoá hẳn thông báo này"
                    className={`p-1.5 rounded-lg border text-rose-500 transition-colors cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? "bg-slate-800 border-slate-700 hover:bg-rose-950/40"
                        : "bg-white border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
