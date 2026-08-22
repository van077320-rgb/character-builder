import React, { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Send,
  Loader2,
  AlertTriangle,
  Trash2,
  EyeOff,
  Eye,
  MessageCircle,
  Clock,
  Lock,
} from "lucide-react";
import {
  subscribeGuestbook,
  postGuestbookEntry,
  setGuestbookEntryHidden,
  deleteGuestbookEntry,
  guestbookCooldownLeft,
  GuestbookError,
  GUESTBOOK_MESSAGE_MAX,
  GUESTBOOK_NAME_MAX,
  ANONYMOUS_NAME,
  type GuestbookState,
} from "../guestbookService";
import { isAdminEmail } from "../data/adminConfig";
import { AnnouncementAdmin } from "./AnnouncementAdmin";
import { CloudIcon, StarIcon } from "./CloudStarDecorations";
import type { User } from "../firebase";

interface GuestbookProps {
  isDark: boolean;
  currentUser: User | null;
  onToast: (message: string) => void;
}

/** Nhớ tên người viết để lần sau khỏi gõ lại. Chỉ nằm trên máy của họ. */
const NAME_MEMORY_KEY = "studio_guestbook_name";

/** "3 phút trước" dễ hiểu hơn một mốc giờ tuyệt đối với thứ vừa mới xảy ra. */
function formatRelativeTime(ms: number | null): string {
  if (ms === null) return "đang gửi...";

  const diff = Date.now() - ms;
  if (diff < 60_000) return "vừa xong";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} ngày trước`;

  return new Date(ms).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Màu avatar suy ra từ tên, để cùng một cái tên luôn ra cùng một màu. */
const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-teal-500",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export const Guestbook: React.FC<GuestbookProps> = ({ isDark, currentUser, onToast }) => {
  const [state, setState] = useState<GuestbookState>({ status: "loading" });
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem(NAME_MEMORY_KEY) || "";
    } catch {
      return "";
    }
  });
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(() => guestbookCooldownLeft());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // ⚠️ TẠM THỜI — `?demo-thongbao=1` mở bảng quản trị để xem thử giao diện khi chưa
  // đăng nhập được. GỠ vế sau cùng lúc với khối DEMO_ANNOUNCEMENTS trong AnnouncementTicker.
  const isAdmin =
    isAdminEmail(currentUser?.email) ||
    new URLSearchParams(window.location.search).has("demo-thongbao");

  useEffect(() => subscribeGuestbook(setState), []);

  /**
   * Đồng hồ đếm ngược thời gian nghỉ.
   *
   * Chỉ chạy khi thực sự đang phải chờ — để một trang mở suốt buổi không có
   * setInterval nào quay vòng vô ích mỗi giây.
   */
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setInterval(() => setCooldownLeft(guestbookCooldownLeft()), 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  const handleSend = async () => {
    setError(null);
    setIsSending(true);
    try {
      await postGuestbookEntry({ name, message });
      setMessage("");
      setCooldownLeft(guestbookCooldownLeft());
      try {
        localStorage.setItem(NAME_MEMORY_KEY, name.trim());
      } catch {
        /* không nhớ được tên thì thôi, không đáng để báo lỗi */
      }
      onToast("Cảm ơn bạn đã để lại lưu bút!");
    } catch (err) {
      if (err instanceof GuestbookError && err.code === "guestbook/cooldown") {
        setCooldownLeft(guestbookCooldownLeft());
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  const runOnEntry = async (id: string, task: () => Promise<void>, successMessage: string) => {
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

  const allEntries = state.status === "ready" ? state.entries : [];

  // Khách không thấy bài bị ẩn; admin thấy để còn bỏ ẩn được.
  const visibleEntries = useMemo(
    () => (isAdmin ? allEntries : allEntries.filter((e) => !e.hidden)),
    [allEntries, isAdmin]
  );

  const publicCount = allEntries.filter((e) => !e.hidden).length;
  const remaining = GUESTBOOK_MESSAGE_MAX - message.trim().length;
  const waitingSeconds = Math.ceil(cooldownLeft / 1000);
  const canSend = !isSending && message.trim().length > 0 && cooldownLeft <= 0;

  const inputClass = `w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border outline-hidden transition-colors ${
    isDark
      ? "bg-slate-950/70 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500"
      : "bg-white border-sky-200 text-slate-800 placeholder-slate-400 focus:border-sky-400"
  }`;

  const deleteTarget = allEntries.find((e) => e.id === deleteTargetId) || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Giới thiệu */}
      <section
        className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 shadow-xs ${
          isDark
            ? "bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/60 border-slate-800 text-slate-100"
            : "bg-gradient-to-br from-sky-100/90 via-sky-50 to-indigo-50/70 border-sky-200 text-slate-800"
        }`}
      >
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-sky-500 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight">
              Hòm thư lưu bút
            </h2>
            <StarIcon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xs sm:text-sm leading-relaxed opacity-80 max-w-2xl">
            Để lại vài dòng cảm nhận, góp ý hay lời chào sau khi dùng web nhé.{" "}
            <strong>Không cần đăng nhập tài khoản nào cả</strong> — muốn ẩn danh thì cứ để trống ô tên.
          </p>
        </div>
      </section>

      {/* Bảng quản trị: chỉ admin thấy (chặn thật nằm ở Firestore Rules) */}
      {isAdmin && <AnnouncementAdmin isDark={isDark} onToast={onToast} />}

      {/* Ô viết lưu bút */}
      <section
        className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
          isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200 shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-sky-500 shrink-0" />
          <h3 className="font-bold text-xs sm:text-sm">Viết lưu bút</h3>
        </div>

        <input
          id="input-guestbook-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={GUESTBOOK_NAME_MAX}
          placeholder={`Tên hiển thị (để trống sẽ là "${ANONYMOUS_NAME}")`}
          className={inputClass}
        />

        <textarea
          id="input-guestbook-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={GUESTBOOK_MESSAGE_MAX}
          placeholder="Bạn thấy công cụ này thế nào? Có muốn để lại đôi lời cho Cá và mọi người không nè?"
          className={`${inputClass} resize-y leading-relaxed`}
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] ${remaining < 0 ? "text-rose-500 font-bold" : "opacity-60"}`}>
            còn {remaining} ký tự
          </span>

          {cooldownLeft > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              <Clock className="w-3 h-3" />
              Đợi {waitingSeconds} giây nữa
            </span>
          )}

          <button
            id="btn-send-guestbook"
            onClick={handleSend}
            disabled={!canSend}
            className="ml-auto flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer transition-all"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Gửi lưu bút</span>
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl border bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 text-[11px] sm:text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-[10px] sm:text-[11px] opacity-55 leading-relaxed">
          Lưu bút hiện công khai cho mọi người đọc, nên đừng ghi số điện thoại, email hay bất cứ
          thông tin riêng tư nào vào đây nhé. Nếu muốn báo lỗi app, khuyến khích inbox trực tiếp
          để Cá xử lý dễ hơn nhé.
        </p>
      </section>

      {/* Danh sách lưu bút */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm sm:text-base">Mọi người đã viết</h3>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              isDark
                ? "bg-slate-800 text-sky-300 border border-slate-700"
                : "bg-sky-100 text-sky-800 border border-sky-200"
            }`}
          >
            {publicCount} lưu bút
          </span>
        </div>

        {state.status === "loading" ? (
          <div className="flex items-center gap-2 p-6 text-xs opacity-70">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải hòm thư...</span>
          </div>
        ) : state.status === "error" ? (
          <div className="flex items-start gap-2 p-4 rounded-2xl border bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{state.message}</span>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div
            className={`p-8 sm:p-10 text-center rounded-3xl border ${
              isDark
                ? "bg-slate-900/40 border-slate-800 text-slate-300"
                : "bg-white border-sky-200 text-slate-700"
            }`}
          >
            <CloudIcon className="w-10 h-10 mx-auto text-sky-400 opacity-60 mb-2" />
            <p className="font-bold text-sm mb-1">Hòm thư còn trống</p>
            <p className="text-xs opacity-70">
              Bạn sẽ là người đầu tiên để lại dấu chân ở đây.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleEntries.map((entry) => (
              <li
                key={entry.id}
                className={`p-4 rounded-2xl border transition-colors ${
                  entry.hidden
                    ? isDark
                      ? "bg-slate-900/40 border-slate-800 opacity-60"
                      : "bg-slate-100/70 border-slate-200 opacity-70"
                    : isDark
                      ? "bg-slate-900/80 border-slate-800"
                      : "bg-white border-sky-200 shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 uppercase shadow-2xs ${avatarColor(
                      entry.name
                    )}`}
                  >
                    {entry.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-bold text-xs sm:text-sm truncate max-w-[220px]">
                        {entry.name}
                      </span>
                      <span className="text-[11px] opacity-55">
                        {entry.pending ? "đang gửi..." : formatRelativeTime(entry.createdAt)}
                      </span>
                      {entry.hidden && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <Lock className="w-2.5 h-2.5" />
                          đã ẩn
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {entry.message}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          runOnEntry(
                            entry.id,
                            () => setGuestbookEntryHidden(entry.id, !entry.hidden),
                            entry.hidden ? "Đã cho hiện lại lưu bút." : "Đã ẩn lưu bút."
                          )
                        }
                        disabled={busyId === entry.id}
                        title={entry.hidden ? "Cho hiện lại" : "Ẩn khỏi trang công khai"}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                          isDark
                            ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                            : "bg-slate-50 border-sky-200 hover:bg-sky-100"
                        }`}
                      >
                        {entry.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setDeleteTargetId(entry.id)}
                        disabled={busyId === entry.id}
                        title="Xoá hẳn lưu bút này"
                        className={`p-2 rounded-xl border text-rose-500 transition-colors cursor-pointer disabled:opacity-50 ${
                          isDark
                            ? "bg-slate-800 border-slate-700 hover:bg-rose-950/40"
                            : "bg-white border-rose-200 hover:bg-rose-50"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Xác nhận xoá.
          Không dùng lại ConfirmDeleteModal vì phần thân của nó nói về lịch sử nhân
          vật và mách nước "Sao lưu JSON trước khi xoá" — đọc ở đây thì sai hoàn toàn. */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-sky-200 text-slate-800"
            }`}
          >
            <div
              className={`p-4 flex items-center gap-2.5 border-b ${
                isDark ? "bg-slate-800/80 border-slate-700" : "bg-red-50/70 border-red-100 text-red-900"
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Xoá lưu bút này?</h3>
                <p className="text-[11px] opacity-75">Xoá rồi thì không lấy lại được</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs sm:text-sm">
                Lưu bút của <strong>{deleteTarget.name}</strong> sẽ bị xoá vĩnh viễn khỏi Firestore.
              </p>
              <blockquote
                className={`p-3 rounded-xl text-xs italic leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap break-words ${
                  isDark ? "bg-slate-800/60 text-slate-300" : "bg-slate-50 text-slate-600"
                }`}
              >
                {deleteTarget.message}
              </blockquote>
              <p className="text-[11px] opacity-70">
                Chỉ muốn giấu đi thôi thì bấm nút <strong>Ẩn</strong> — vẫn bật lại được sau.
              </p>
            </div>

            <div
              className={`p-4 border-t flex items-center justify-end gap-2.5 ${
                isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-100"
              }`}
            >
              <button
                onClick={() => setDeleteTargetId(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                  isDark
                    ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-guestbook"
                onClick={() => {
                  const id = deleteTarget.id;
                  setDeleteTargetId(null);
                  runOnEntry(id, () => deleteGuestbookEntry(id), "Đã xoá lưu bút.");
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-xs cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
