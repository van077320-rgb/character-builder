import React, { useState } from "react";
import { 
  Plus, 
  Sparkles, 
  BookOpen, 
  Layers, 
  FileText, 
  ArrowRight, 
  History, 
  Search, 
  Trash2, 
  Copy, 
  Download, 
  Eye, 
  Check, 
  FolderKanban,
  ShieldCheck,
  Cpu,
  Globe,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cloud,
  Clock
} from "lucide-react";
import { SavedHistoryItem, CharacterData } from "../types";
import { StarIcon, FourPointStar, CloudIcon, CloudBannerDecoration } from "./CloudStarDecorations";
import { buildCharacterCardText, buildFullTemplateText } from "../data/templateConstants";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface HeroGatewayProps {
  onStartNewCharacter: () => void;
  onContinueCurrentDraft: () => void;
  currentDraftName: string;
  hasActiveDraft: boolean;
  historyItems: SavedHistoryItem[];
  onLoadHistoryItem: (item: SavedHistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onNavigateToHistory: () => void;
  onNavigateToTab: (tab: "builder" | "card_preview" | "template_builder" | "full_preview") => void;
  isDark: boolean;
}

export const HeroGateway: React.FC<HeroGatewayProps> = ({
  onStartNewCharacter,
  onContinueCurrentDraft,
  currentDraftName,
  hasActiveDraft,
  historyItems,
  onLoadHistoryItem,
  onDeleteHistoryItem,
  onNavigateToHistory,
  onNavigateToTab,
  isDark,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  // Mở sẵn: hai lưu ý bên trong (cấp lại quyền Drive, xem thời gian chờ API) là
  // thứ người dùng cần biết TRƯỚC khi gặp lỗi, mà khối thu gọn thì thường không
  // ai bấm vào. Ai đọc rồi thì tự thu lại được.
  const [showGuide, setShowGuide] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewingItem, setPreviewingItem] = useState<SavedHistoryItem | null>(null);

  // State for Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<SavedHistoryItem | null>(null);

  const filteredItems = historyItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.characterName.toLowerCase().includes(term) ||
      item.title.toLowerCase().includes(term) ||
      item.characterData.occupation.toLowerCase().includes(term)
    );
  });

  const getItemText = (item: SavedHistoryItem): string => {
    if (item.type === "full_template") {
      if (item.customFullTemplateText) return item.customFullTemplateText;
      return item.templateData 
        ? buildFullTemplateText(item.characterData, item.templateData) 
        : buildCharacterCardText(item.characterData);
    }
    if (item.customCardText) return item.customCardText;
    return buildCharacterCardText(item.characterData);
  };

  const handleCopyText = (item: SavedHistoryItem) => {
    const text = getItemText(item);
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadTxt = (item: SavedHistoryItem) => {
    const text = getItemText(item);
    const filename = `${item.characterName || "Character"}_${item.type}.txt`.replace(/\s+/g, "_");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <CloudBannerDecoration isDark={isDark} />

      {/* Hero Welcome Gateway Banner */}
      <section className={`relative overflow-hidden rounded-3xl border p-6 sm:p-10 shadow-lg transition-all ${
        isDark 
          ? "bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/70 border-slate-800 text-slate-100" 
          : "bg-gradient-to-br from-sky-100/90 via-sky-50 to-indigo-50/70 border-sky-200 text-slate-800"
      }`}>
        {/* Ambient background glow & stars */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide shadow-2xs ${
              isDark 
                ? "bg-slate-800/80 border-slate-700 text-sky-300" 
                : "bg-white/90 border-sky-200 text-sky-800"
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cá Mèo Studio • Roleplay Character & Master Prompt</span>
              <StarIcon className="w-3 h-3 text-sky-400 hidden sm:inline" />
            </div>

            <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold animate-pulse ${
              isDark ? "bg-indigo-950/50 border-indigo-800/50 text-indigo-300" : "bg-sky-100/50 border-sky-200/50 text-sky-700"
            }`}>
              <ArrowRight className="w-3 h-3" />
              <span>Mẹo: Bấm vào Logo Cá Mèo để quay lại đây</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3 font-sans">
            Không gian sáng tạo & thiết lập <span className="text-sky-600 dark:text-sky-400">Nhân vật Roleplay</span>
          </h1>

          <p className={`text-xs sm:text-base leading-relaxed mb-6 sm:mb-8 ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}>
            Xây dựng hồ sơ nhân vật chuẩn 10 trường tâm lý, thiết lập tường lửa chống OOC, tích hợp Worldbook, mở đầu kịch bản và AI gợi ý thông minh không giới hạn.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Primary: Create New Character */}
            <button
              id="btn-hero-create-new"
              onClick={onStartNewCharacter}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Tạo Nhân Vật Mới</span>
              <FourPointStar className="w-3.5 h-3.5 text-amber-300 ml-1" />
            </button>

            {/* Secondary: Resume Ongoing Draft if present */}
            {hasActiveDraft && (
              <button
                id="btn-hero-continue-draft"
                onClick={onContinueCurrentDraft}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold border shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer ${
                  isDark
                    ? "bg-slate-800/90 border-slate-700 text-sky-300 hover:bg-slate-700"
                    : "bg-white/90 border-sky-200 text-sky-900 hover:bg-sky-50"
                }`}
                title="Tiếp tục chỉnh sửa bản nháp chưa lưu gần nhất"
              >
                <span>Tiếp tục nháp:</span>
                <span className="font-bold max-w-[130px] sm:max-w-[200px] truncate text-sky-600 dark:text-sky-300">
                  {currentDraftName || "Đang thiết lập"}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
              </button>
            )}

            {/* Quick jump to Management */}
            <button
              id="btn-hero-manage-history"
              onClick={onNavigateToHistory}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                isDark 
                  ? "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800" 
                  : "bg-white/70 border-sky-200 text-slate-700 hover:bg-white"
              }`}
            >
              <History className="w-4 h-4 text-sky-500" />
              <span>Quản lý lịch sử ({historyItems.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4 Feature Highlights Pillars */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => onNavigateToTab("builder")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-0.5 ${
            isDark ? "bg-slate-900/70 border-slate-800 hover:border-slate-700" : "bg-white border-sky-200 hover:border-sky-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm">1. Thẻ 10 Trường</h3>
          </div>
          <p className="text-[11px] sm:text-xs opacity-75 leading-relaxed">
            Hồ sơ nhân vật đa chiều: tâm lý, giọng nói, phản ứng theo đối tượng, bí mật và vết thương lòng.
          </p>
        </div>

        <div 
          onClick={() => onNavigateToTab("card_preview")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-0.5 ${
            isDark ? "bg-slate-900/70 border-slate-800 hover:border-slate-700" : "bg-white border-sky-200 hover:border-sky-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm">2. Anti-OOC Firewall</h3>
          </div>
          <p className="text-[11px] sm:text-xs opacity-75 leading-relaxed">
            Quy tắc thép giữ vững tính cách và cấm AI thay đổi ngôi xưng hô, vượt quyền hay làm gãy thiết lập.
          </p>
        </div>

        <div 
          onClick={() => onNavigateToTab("template_builder")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-0.5 ${
            isDark ? "bg-slate-900/70 border-slate-800 hover:border-slate-700" : "bg-white border-sky-200 hover:border-sky-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm">3. Master Worldbook</h3>
          </div>
          <p className="text-[11px] sm:text-xs opacity-75 leading-relaxed">
            Tích hợp Public Lore, Hidden Lore, hệ thống NPC tương tác và cơ chế xúc xắc minigame.
          </p>
        </div>

        <div 
          onClick={() => onNavigateToTab("full_preview")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-0.5 ${
            isDark ? "bg-slate-900/70 border-slate-800 hover:border-slate-700" : "bg-white border-sky-200 hover:border-sky-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm">4. Xuất TXT & AI Key</h3>
          </div>
          <p className="text-[11px] sm:text-xs opacity-75 leading-relaxed">
            Sao chép 1-click hoặc tải tệp .txt chuẩn xác. Tích hợp AI xoay vòng Key Pool không bị gián đoạn.
          </p>
        </div>
      </section>

      {/* Hướng dẫn cơ bản — mở sẵn, thu gọn được */}
      <section className={`rounded-2xl border overflow-hidden ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200 shadow-2xs"
      }`}>
        <button
          id="btn-toggle-basic-guide"
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors cursor-pointer ${
            isDark ? "hover:bg-slate-800/60" : "hover:bg-sky-50/70"
          }`}
        >
          <span className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <HelpCircle className="w-4 h-4 text-sky-500 shrink-0" />
            Hướng dẫn cơ bản
          </span>
          <span className="flex items-center gap-1.5 text-[11px] opacity-60">
            {showGuide ? "Thu gọn" : "Mở ra"}
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showGuide && (
          <div className={`px-4 pb-4 space-y-3 border-t ${
            isDark ? "border-slate-800" : "border-sky-100"
          }`}>
            <ol className="space-y-2 pt-3 text-[11px] sm:text-xs leading-relaxed">
              <li>
                <strong className="text-sky-600 dark:text-sky-400">1. Tạo nhân vật.</strong>{" "}
                Bấm <strong>Tạo Nhân Vật Mới</strong>, rồi đi lần lượt qua bốn thẻ trên thanh
                tiêu đề: <em>1. Nhân vật</em> → <em>2. Thẻ Card</em> → <em>3. Template</em> →{" "}
                <em>4. Xuất File</em>. Mỗi thẻ có nút chuyển sang bước kế ở cuối trang.
              </li>
              <li>
                <strong className="text-sky-600 dark:text-sky-400">2. Nhờ AI viết hộ.</strong>{" "}
                Mỗi mục đều có nút <strong>AI Gợi Ý</strong> — bấm để nhận vài phương án, chạm vào
                phương án ưng ý là nó tự điền vào. Muốn tự viết thì gõ thẳng vào ô{" "}
                <em>Mục khác / Chi tiết nội dung tự nhập</em>.
              </li>
              <li>
                <strong className="text-sky-600 dark:text-sky-400">3. Lưu lại.</strong>{" "}
                Nút <strong>Lưu Lịch Sử</strong> cất bản ghi vào trình duyệt của chính máy này.
                Muốn giữ lâu dài hoặc mở trên máy khác thì lưu lên Google Drive.
              </li>
              <li>
                <strong className="text-sky-600 dark:text-sky-400">4. Đem đi dùng.</strong>{" "}
                Ở bước <em>4. Xuất File</em>, sao chép một chạm hoặc tải tệp .txt, rồi dán vào
                AI roleplay bạn đang chơi.
              </li>
            </ol>

            {/* Hai điều hay làm người dùng mắc kẹt nhất */}
            <div className={`p-3 rounded-xl border space-y-2.5 ${
              isDark ? "bg-amber-950/25 border-amber-800/50" : "bg-amber-50/70 border-amber-200"
            }`}>
              <div className="flex gap-2">
                <Cloud className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] sm:text-xs leading-relaxed">
                  <strong>Mỗi lần vào lại trang phải đăng nhập / cấp quyền Google Drive lại</strong>{" "}
                  thì mới lưu lên Drive được. Phiên truy cập Drive không được giữ qua lần tải trang
                  và chỉ sống một tiếng — đây là quy định của Google, không phải lỗi. Bấm biểu tượng
                  Drive trên thanh tiêu đề để kiểm tra trước khi lưu, khỏi mất công gõ xong mới báo lỗi.
                </p>
              </div>
              <div className="flex gap-2">
                <Cpu className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] sm:text-xs leading-relaxed">
                  <strong>AI báo hết lượt thì bấm biểu tượng con chip</strong>{" "}
                  <Cpu className="w-3 h-3 inline-block align-text-top text-indigo-500" /> trên thanh
                  tiêu đề. Ở đó xem được còn bao nhiêu key dùng được và{" "}
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3" />thời gian chờ còn lại
                  </span>{" "}
                  là bao lâu — thay vì bấm thử đi thử lại mà không biết phải đợi đến bao giờ.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main Section: Created Characters History & Continue Working */}
      <section className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-sky-500 shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Lịch sử các nhân vật đã tạo
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isDark ? "bg-slate-800 text-sky-300 border border-slate-700" : "bg-sky-100 text-sky-800 border border-sky-200"
              }`}>
                {historyItems.length} nhân vật
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Bấm <strong>"Tiếp tục"</strong> để nạp nhân vật vào bàn làm việc hoặc mở quản lý để sao lưu / dọn dẹp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Manage all history link */}
            <button
              id="btn-goto-manage-all-history"
              onClick={onNavigateToHistory}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isDark 
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200" 
                  : "bg-white hover:bg-sky-50 border-sky-200 text-sky-900 shadow-2xs"
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-sky-500" />
              <span>Quản lý tất cả lịch sử</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Quick Search inside Home */}
        {historyItems.length > 3 && (
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm nhanh nhân vật theo tên, nghề nghiệp..."
              className={`w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border outline-hidden transition-colors ${
                isDark 
                  ? "bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500" 
                  : "bg-white border-sky-200 text-slate-800 placeholder-slate-400 focus:border-sky-400"
              }`}
            />
          </div>
        )}

        {/* History Cards Grid */}
        {historyItems.length === 0 ? (
          <div className={`p-8 sm:p-12 text-center rounded-3xl border ${
            isDark ? "bg-slate-900/40 border-slate-800 text-slate-300" : "bg-white border-sky-200 text-slate-700"
          } shadow-xs`}>
            <CloudIcon className="w-12 h-12 mx-auto text-sky-400 opacity-60 mb-3" />
            <h3 className="font-bold text-base sm:text-lg mb-1">Chưa có nhân vật nào trong lịch sử</h3>
            <p className="text-xs sm:text-sm opacity-75 max-w-md mx-auto mb-6">
              Bạn chưa có bản ghi nào được lưu trữ. Hãy bắt đầu tạo nhân vật đầu tiên ngay để trải nghiệm thế giới Roleplay sinh động!
            </p>
            <button
              onClick={onStartNewCharacter}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Bắt đầu tạo nhân vật đầu tiên</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${
            isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-sky-200"
          }`}>
            <Search className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="text-xs sm:text-sm font-medium">Không tìm thấy nhân vật nào với từ khóa "{searchTerm}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isTemplate = item.type === "full_template";
              const char = item.characterData;
              const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  className={`group relative p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-md ${
                    isDark 
                      ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-100" 
                      : "bg-white border-sky-200 hover:border-sky-300 text-slate-800 shadow-2xs"
                  }`}
                >
                  <div>
                    {/* Top Row: Type Tag & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isTemplate
                          ? isDark ? "bg-indigo-950 border border-indigo-700/60 text-indigo-300" : "bg-indigo-50 border border-indigo-200 text-indigo-700"
                          : isDark ? "bg-sky-950 border border-sky-700/60 text-sky-300" : "bg-sky-50 border border-sky-200 text-sky-700"
                      }`}>
                        {isTemplate ? <Layers className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                        <span>{isTemplate ? "Template Đầy Đủ" : "Thẻ Nhân Vật"}</span>
                      </span>

                      <span className="text-[11px] opacity-60 font-mono">{dateStr}</span>
                    </div>

                    {/* Character Title & Name */}
                    <div className="flex items-start gap-3">
                      {/* Avatar initial badge */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-2xs ${
                        isTemplate
                          ? isDark ? "bg-indigo-900/60 text-indigo-200 border border-indigo-700/50" : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                          : isDark ? "bg-sky-900/60 text-sky-200 border border-sky-700/50" : "bg-sky-100 text-sky-700 border border-sky-200"
                      }`}>
                        {(item.characterName || item.title || "C").charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {item.characterName || item.title || "Nhân vật ẩn danh"}
                        </h3>
                        {char.aliases && (
                          <p className="text-[11px] opacity-70 truncate mt-0.5">
                            Biệt danh: {char.aliases}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      {char.occupation && (
                        <span className={`px-2 py-0.5 rounded-md truncate max-w-[190px] ${
                          isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                        }`}>
                          {char.occupation}
                        </span>
                      )}
                      {char.species && (
                        <span className={`px-2 py-0.5 rounded-md ${
                          isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                        }`}>
                          {char.species}
                        </span>
                      )}
                      {char.age && (
                        <span className={`px-2 py-0.5 rounded-md ${
                          isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                        }`}>
                          {char.age}
                        </span>
                      )}
                    </div>

                    {/* Core Quote */}
                    {char.corePhilosophy && (
                      <p className="mt-2.5 text-xs italic opacity-80 line-clamp-2 leading-relaxed">
                        "{char.corePhilosophy}"
                      </p>
                    )}
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                    {/* Continue Button */}
                    <button
                      id={`btn-continue-char-${item.id}`}
                      onClick={() => onLoadHistoryItem(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-95 transition-all shadow-xs cursor-pointer"
                      title="Tiếp tục chỉnh sửa nhân vật này"
                    >
                      <span>Tiếp tục</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Tools */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewingItem(item)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300" : "bg-slate-50 border-sky-200 hover:bg-sky-100 text-slate-700"
                        }`}
                        title="Xem nhanh nội dung"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopyText(item)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          copiedId === item.id 
                            ? "bg-emerald-600 text-white border-emerald-600" 
                            : isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300" : "bg-slate-50 border-sky-200 hover:bg-sky-100 text-slate-700"
                        }`}
                        title="Sao chép toàn văn"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleDownloadTxt(item)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300" : "bg-slate-50 border-sky-200 hover:bg-sky-100 text-slate-700"
                        }`}
                        title="Tải về .txt"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete with Confirmation */}
                      <button
                        id={`btn-delete-home-${item.id}`}
                        onClick={() => setDeleteTarget(item)}
                        className={`p-2 rounded-xl border transition-colors text-red-500 cursor-pointer ${
                          isDark ? "bg-slate-800 border-slate-700 hover:bg-red-950/40" : "bg-white border-red-200 hover:bg-red-50"
                        }`}
                        title="Xóa bản ghi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Preview Modal */}
      {previewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-sky-200 text-slate-800"
          }`}>
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isDark ? "bg-slate-800/80 border-slate-800" : "bg-sky-50 border-sky-100"
            }`}>
              <div className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Xem nhanh: {previewingItem.characterName || previewingItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewingItem(null)}
                className="px-3 py-1 text-xs font-bold rounded-xl border border-slate-500/40 hover:bg-slate-500/20 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {getItemText(previewingItem)}
              </pre>
            </div>

            <div className={`p-4 border-t flex items-center justify-between gap-2 ${
              isDark ? "border-slate-800 bg-slate-900" : "border-sky-100 bg-sky-50/50"
            }`}>
              <button
                onClick={() => {
                  onLoadHistoryItem(previewingItem);
                  setPreviewingItem(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-xs cursor-pointer"
              >
                <span>Tiếp tục chỉnh sửa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(previewingItem)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => handleDownloadTxt(previewingItem)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isDark ? "bg-slate-800 border-slate-700" : "bg-white border-sky-200"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải .txt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal before Deleting */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        itemName={deleteTarget?.characterName || deleteTarget?.title}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteHistoryItem(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        isDark={isDark}
      />
    </div>
  );
};
