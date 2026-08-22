import React, { useEffect, useMemo, useState } from "react";
import { Megaphone, Sparkles, Info, AlertTriangle } from "lucide-react";
import {
  subscribeAnnouncements,
  isAnnouncementExpired,
  type Announcement,
  type AnnouncementState,
  type AnnouncementTone,
} from "../announcementService";

interface AnnouncementTickerProps {
  isDark: boolean;
}

const TONE_ICON: Record<AnnouncementTone, React.ComponentType<{ className?: string }>> = {
  new: Sparkles,
  info: Info,
  warn: AlertTriangle,
};

const TONE_COLOR: Record<AnnouncementTone, string> = {
  new: "text-amber-500 dark:text-amber-400",
  info: "text-sky-500 dark:text-sky-400",
  warn: "text-rose-500 dark:text-rose-400",
};

/**
 * ⚠️ TẠM THỜI — chỉ để xem thử giao diện khi Firestore Rules chưa Publish.
 * Mở trang với `?demo-thongbao=1` là hiện ba thông báo mẫu. GỠ KHỐI NÀY sau khi xem xong.
 */
const DEMO_ANNOUNCEMENTS = (): Announcement[] | null => {
  if (!new URLSearchParams(window.location.search).has("demo-thongbao")) return null;
  return [
    {
      id: "demo-1",
      text: "Web giờ đã có mục Lưu bút — mời bạn ghé thẻ số 5 để lại đôi lời cho Cá nhé!",
      tone: "new",
      active: true,
      createdAt: Date.now(),
      expiresAt: null,
    },
    {
      id: "demo-2",
      text: "Nhớ sao lưu nhân vật ra file JSON hoặc Google Drive trước khi dọn lịch sử trình duyệt.",
      tone: "info",
      active: true,
      createdAt: Date.now(),
      expiresAt: null,
    },
    {
      id: "demo-3",
      text: "Cuối tuần này Cá bảo trì máy chủ AI khoảng 30 phút, các nút AI Gợi Ý có thể chậm.",
      tone: "warn",
      active: true,
      createdAt: Date.now(),
      expiresAt: null,
    },
  ];
};

/**
 * Băng thông báo chạy ngang, đặt ngay trên banner trang chủ.
 *
 * Không có thông báo nào đang bật thì component biến mất hoàn toàn — kể cả khi
 * đọc Firestore lỗi. Một dòng "không tải được thông báo" màu đỏ nằm giữa banner
 * chào mừng chỉ làm người dùng hoang mang, trong khi họ chẳng làm gì được với nó.
 */
export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = ({ isDark }) => {
  const [state, setState] = useState<AnnouncementState>({ status: "loading" });

  /**
   * Đồng hồ nhích mỗi phút, để thông báo hết hạn tự rụng khỏi băng chạy ngay cả
   * khi tab được mở suốt ngày. Không có nó thì Firestore chẳng có gì thay đổi để
   * báo về, và một thông báo quá hạn cứ chạy mãi tới lúc ai đó tải lại trang.
   */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeAnnouncements(setState), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const active: Announcement[] = useMemo(
    () => {
      const demo = DEMO_ANNOUNCEMENTS();
      if (demo) return demo;
      if (state.status !== "ready") return [];
      return state.items.filter(
        (a) => a.active && a.text.trim() && !isAnnouncementExpired(a, now)
      );
    },
    [state, now]
  );

  /**
   * Chữ càng dài chạy càng lâu, để tốc độ đọc luôn như nhau. Chặn dưới 18 giây
   * kẻo một thông báo ngắn vụt qua nhanh đến mức chưa kịp nhìn.
   */
  const durationSec = useMemo(() => {
    const chars = active.reduce((sum, a) => sum + a.text.length + 6, 0);
    return Math.max(18, Math.round(chars * 0.22));
  }, [active]);

  if (active.length === 0) return null;

  const renderRun = (ariaHidden: boolean) => (
    <div className="flex items-center shrink-0" aria-hidden={ariaHidden || undefined}>
      {active.map((item) => {
        const Icon = TONE_ICON[item.tone];
        return (
          <span key={item.id} className="flex items-center gap-2 px-5 whitespace-nowrap">
            <Icon className={`w-3.5 h-3.5 shrink-0 ${TONE_COLOR[item.tone]}`} />
            <span>{item.text}</span>
            <span className="opacity-30 select-none">•</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div
      className={`relative z-10 mb-5 flex items-center gap-2 rounded-2xl border px-2 py-2 shadow-2xs ${
        isDark
          ? "bg-slate-950/60 border-slate-700/70 text-slate-200"
          : "bg-white/80 border-sky-200 text-slate-700"
      }`}
    >
      {/* Nhãn cố định, không trôi theo — để người dùng biết dải chữ này là gì */}
      <span
        className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wide ${
          isDark ? "bg-sky-950/80 text-sky-300" : "bg-sky-100 text-sky-800"
        }`}
      >
        <Megaphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Thông báo</span>
        {active.length > 1 && <span className="opacity-70">({active.length})</span>}
      </span>

      <div className="marquee-viewport flex-1 min-w-0 text-[11px] sm:text-xs font-medium">
        <div className="marquee-track" style={{ animationDuration: `${durationSec}s` }}>
          {renderRun(false)}
          {/* Bản sao thứ hai để vòng lặp khép kín, xem chú thích ở src/index.css */}
          {renderRun(true)}
        </div>
      </div>
    </div>
  );
};
