import React from "react";
import { 
  Sparkles, 
  Sun, 
  Moon, 
  BookOpen, 
  FileText, 
  Layers, 
  Download, 
  History, 
  Terminal,
  Cpu,
  UserCheck,
  LogIn
} from "lucide-react";
import { ActiveTab } from "../types";
import { StarIcon } from "./CloudStarDecorations";
import { User } from "../firebase";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenGoogleDrive: () => void;
  onOpenCommandsModal?: () => void;
  onOpenApiRotationModal?: () => void;
  currentUser: User | null;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  onOpenGoogleDrive,
  onOpenCommandsModal,
  onOpenApiRotationModal,
  currentUser,
  historyCount,
}) => {
  return (
    <header className={`border-b transition-colors ${
      isDark 
        ? "bg-slate-900/95 border-slate-800 text-slate-100" 
        : "bg-sky-50/95 border-sky-200/80 text-slate-800"
    } sticky top-0 z-40 backdrop-blur-md shadow-xs`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-1.5 sm:py-2.5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-1 sm:gap-3">
          {/* Logo & title */}
          <div 
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer min-w-0 shrink group" 
            onClick={() => setActiveTab("home")}
            title="Quay lại trang chủ (Hero Gateway)"
          >
            <div className={`p-1.5 sm:p-2 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105 group-hover:shadow-sm ${
              isDark ? "bg-indigo-950/80 border border-indigo-700/50" : "bg-sky-100 border border-sky-200"
            }`}>
              <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-sky-400 group-hover:text-sky-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h1 className="text-xs xs:text-sm sm:text-base font-bold tracking-tight font-sans truncate group-hover:text-sky-500 transition-colors">
                  Character & Prompt Studio
                </h1>
                <StarIcon className="w-3.5 h-3.5 text-amber-400 hidden sm:inline-block shrink-0" />
              </div>
              <p className={`text-[9px] xs:text-[10px] sm:text-xs flex items-center gap-1 truncate transition-colors ${
                isDark ? "text-slate-400 group-hover:text-slate-300" : "text-sky-700/80 group-hover:text-sky-600"
              }`}>
                <span className="truncate">© Cá Mèo Studio</span>
                <span className="opacity-50 hidden xs:inline">•</span>
                <span className="hidden md:inline">Quay lại Trang Chủ</span>
              </p>
            </div>
          </div>

          {/* Right actions: Google Drive + Key Pool + Commands + History + Theme toggle */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Key Pool & Fallback Monitor Button */}
            {onOpenApiRotationModal && (
              <button
                id="btn-nav-api-rotation"
                onClick={onOpenApiRotationModal}
                className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isDark
                    ? "bg-slate-800/80 border-indigo-700/60 text-indigo-300 hover:bg-slate-700"
                    : "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                }`}
                title="Quản lý Key Pool, xoay vòng Round-Robin & hạ model tự động"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="hidden lg:inline">Key Pool</span>
              </button>
            )}

            {/* Google Drive Auth & Sync Button */}
            <button
              id="btn-google-drive-sync"
              onClick={onOpenGoogleDrive}
              className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                currentUser
                  ? isDark
                    ? "bg-emerald-950/50 border-emerald-700 text-emerald-300 hover:bg-emerald-900/50"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70"
                  : isDark
                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-sky-200 text-sky-800 hover:bg-sky-100/70"
              }`}
              title={currentUser ? `Đã kết nối Drive: ${currentUser.email}` : "Đăng nhập Google & lưu Drive"}
            >
              {currentUser ? (
                <>
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="" 
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span className="hidden md:inline font-semibold max-w-[90px] truncate">
                    {currentUser.displayName || currentUser.email?.split("@")[0]}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="hidden md:inline">Google Drive</span>
                </>
              )}
            </button>

            {/* System Override Commands Cheat Sheet Button */}
            {onOpenCommandsModal && (
              <button
                id="btn-nav-sys-commands"
                onClick={onOpenCommandsModal}
                className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isDark
                    ? "bg-slate-800/80 border-slate-700 text-sky-400 hover:bg-slate-700 hover:text-sky-300"
                    : "bg-white border-sky-200 text-sky-800 hover:bg-sky-100/80"
                }`}
                title="Xem danh sách 7 lệnh can thiệp /sys:"
              >
                <Terminal className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="hidden lg:inline">Lệnh /sys</span>
              </button>
            )}

            {/* History count badge */}
            <button
              id="btn-nav-history"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeTab === "history"
                  ? isDark
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-sky-600 border-sky-600 text-white"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-white border-sky-200 text-slate-700 hover:bg-sky-100/70"
              }`}
              title={`Lịch sử (${historyCount} mục)`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Lịch sử</span>
              <span className={`px-1 py-0.2 rounded-full text-[9px] xs:text-[10px] font-bold ${
                activeTab === "history"
                  ? "bg-white/20 text-white"
                  : isDark ? "bg-slate-700 text-sky-300" : "bg-sky-100 text-sky-700"
              }`}>
                {historyCount}
              </span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              id="btn-theme-toggle"
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 sm:p-2 rounded-lg border transition-colors shrink-0 ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700"
                  : "bg-white border-sky-200 text-sky-700 hover:bg-sky-100/70"
              }`}
              title={isDark ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          </div>
        </div>

        {/* 4 Navigation Tabs - Responsive Grid that fits 100% of any mobile screen width */}
        <div className="mt-1.5 sm:mt-2.5">
          <nav className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-2 w-full text-[10px] xs:text-xs sm:text-sm font-medium">
            <button
              id="tab-btn-builder"
              onClick={() => setActiveTab("builder")}
              className={`flex items-center justify-center gap-1 px-1 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors border text-center ${
                activeTab === "builder"
                  ? isDark
                    ? "bg-sky-600 text-white border-sky-500 shadow-xs"
                    : "bg-sky-500 text-white border-sky-500 shadow-xs"
                  : isDark
                    ? "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    : "bg-white/80 border-sky-200 text-slate-700 hover:bg-sky-100/70"
              }`}
            >
              <BookOpen className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span className="truncate">1. Nhân vật</span>
            </button>

            <button
              id="tab-btn-card-preview"
              onClick={() => setActiveTab("card_preview")}
              className={`flex items-center justify-center gap-1 px-1 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors border text-center ${
                activeTab === "card_preview"
                  ? isDark
                    ? "bg-sky-600 text-white border-sky-500 shadow-xs"
                    : "bg-sky-500 text-white border-sky-500 shadow-xs"
                  : isDark
                    ? "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    : "bg-white/80 border-sky-200 text-slate-700 hover:bg-sky-100/70"
              }`}
            >
              <FileText className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span className="truncate">2. Thẻ Card</span>
            </button>

            <button
              id="tab-btn-template-builder"
              onClick={() => setActiveTab("template_builder")}
              className={`flex items-center justify-center gap-1 px-1 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors border text-center ${
                activeTab === "template_builder"
                  ? isDark
                    ? "bg-sky-600 text-white border-sky-500 shadow-xs"
                    : "bg-sky-500 text-white border-sky-500 shadow-xs"
                  : isDark
                    ? "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    : "bg-white/80 border-sky-200 text-slate-700 hover:bg-sky-100/70"
              }`}
            >
              <Layers className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span className="truncate">3. Template</span>
            </button>

            <button
              id="tab-btn-full-preview"
              onClick={() => setActiveTab("full_preview")}
              className={`flex items-center justify-center gap-1 px-1 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors border text-center ${
                activeTab === "full_preview"
                  ? isDark
                    ? "bg-sky-600 text-white border-sky-500 shadow-xs"
                    : "bg-sky-500 text-white border-sky-500 shadow-xs"
                  : isDark
                    ? "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    : "bg-white/80 border-sky-200 text-slate-700 hover:bg-sky-100/70"
              }`}
            >
              <Download className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span className="truncate">4. Xuất File</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
