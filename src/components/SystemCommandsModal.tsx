import React from "react";
import { X, Terminal } from "lucide-react";
import { SystemCommandsGuide } from "./SystemCommandsGuide";

interface SystemCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const SystemCommandsModal: React.FC<SystemCommandsModalProps> = ({
  isOpen,
  onClose,
  isDark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-sky-200 text-slate-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? "bg-slate-800/80 border-slate-800" : "bg-sky-50/80 border-sky-100"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? "bg-indigo-950/80 text-sky-400" : "bg-sky-100 text-sky-700"}`}>
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Cẩm Nang System Override Commands (`/sys:`)
              </h3>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-sky-800/80"}`}>
                Tra cứu nhanh & 1-click copy các lệnh can thiệp AI khi đang roleplay
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-sky-200 hover:bg-sky-100 text-sky-800"
            }`}
            aria-label="Đóng modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <SystemCommandsGuide isDark={isDark} defaultExpanded={true} />
        </div>

        {/* Modal Footer */}
        <div className={`p-3.5 border-t flex justify-end ${
          isDark ? "bg-slate-950/80 border-slate-800" : "bg-sky-50/40 border-sky-100"
        }`}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
