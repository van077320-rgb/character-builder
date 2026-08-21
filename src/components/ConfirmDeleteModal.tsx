import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  isClearAll?: boolean;
  isDark: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  isClearAll = false,
  isDark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
          isDark 
            ? "bg-slate-900 border-slate-700 text-slate-100" 
            : "bg-white border-sky-200 text-slate-800"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? "bg-slate-800/80 border-slate-700" : "bg-red-50/70 border-red-100 text-red-900"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              isDark ? "bg-red-950/80 text-red-400 border border-red-800/50" : "bg-red-100 text-red-600"
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {title || (isClearAll ? "Xác nhận xóa tất cả lịch sử" : "Xác nhận xóa nhân vật")}
              </h3>
              <p className="text-[11px] opacity-75">Hành động này không thể hoàn tác</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-3">
          {isClearAll ? (
            <p className="text-xs sm:text-sm leading-relaxed">
              Bạn có chắc chắn muốn <strong className="text-red-500 font-semibold">xóa toàn bộ lịch sử nhân vật và template đã lưu</strong>? Toàn bộ dữ liệu trong bộ nhớ trình duyệt sẽ bị dọn sạch vĩnh viễn.
            </p>
          ) : (
            <p className="text-xs sm:text-sm leading-relaxed">
              Bạn có chắc chắn muốn xóa bản ghi <strong className="text-red-500 font-semibold">"{itemName || "Nhân vật này"}"</strong> khỏi lịch sử không?
            </p>
          )}

          <div className={`p-3 rounded-xl text-xs border ${
            isDark ? "bg-slate-800/50 border-slate-700/80 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            💡 <em>Gợi ý: Nếu muốn giữ lại dữ liệu, bạn có thể bấm <strong>"Sao lưu JSON"</strong> trong mục Quản lý lịch sử trước khi xóa.</em>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${
          isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-100"
        }`}>
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isDark 
                ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700" 
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Hủy bỏ
          </button>

          <button
            id="btn-confirm-delete"
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isClearAll ? "Xóa toàn bộ" : "Xóa ngay"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
