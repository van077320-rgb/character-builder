import React from "react";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";

interface UnsavedDraftModalProps {
  isOpen: boolean;
  /** Tên nhân vật đang dựng, để người dùng biết chính xác cái gì sắp mất. */
  draftName: string;
  /** Số nhân vật trong bản nháp. */
  draftCharCount: number;
  /** Việc sắp làm, ví dụ: "tạo nhân vật mới" hoặc "tải bản ghi \"Cố Dã Thần\"". */
  actionLabel: string;
  onSaveAndContinue: () => void;
  onDiscardAndContinue: () => void;
  onCancel: () => void;
  isDark: boolean;
}

/**
 * Chặn hai đường duy nhất làm mất bản nháp đang dựng: "Tạo Nhân Vật Mới" và
 * "Tải" một bản ghi lịch sử khác.
 *
 * Trước đây đường thứ nhất hiện confirm nói sai sự thật ("Dữ liệu hiện tại đã
 * được lưu nháp" — thực ra chưa vào lịch sử), còn đường thứ hai ghi đè thẳng
 * không hỏi câu nào.
 *
 * Bản nháp KHÔNG tự động vào lịch sử — người dùng phải chủ động bấm lưu, để
 * lịch sử và Drive không bị rác.
 */
export const UnsavedDraftModal: React.FC<UnsavedDraftModalProps> = ({
  isOpen,
  draftName,
  draftCharCount,
  actionLabel,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel,
  isDark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-sky-200 text-slate-800"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isDark ? "bg-slate-800/80 border-slate-700" : "bg-amber-50/70 border-amber-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDark
                  ? "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Bản nháp chưa được lưu</h3>
              <p className="text-[11px] opacity-75">Lưu lại trước khi {actionLabel}?</p>
            </div>
          </div>

          <button onClick={onCancel} className="p-1 rounded-lg opacity-70 hover:opacity-100" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs sm:text-sm">
          <p className="opacity-90 leading-relaxed">
            Bản nháp <strong className="text-sky-500">"{draftName}"</strong>
            {draftCharCount > 1 && <> ({draftCharCount} nhân vật)</>} chưa có trong Lịch sử. Nếu{" "}
            {actionLabel}, nội dung đang dựng sẽ bị ghi đè và{" "}
            <strong className="text-red-500">không lấy lại được</strong>.
          </p>

          <button
            id="btn-draft-save-continue"
            onClick={onSaveAndContinue}
            className={`w-full p-3.5 rounded-xl border text-left transition-colors ${
              isDark
                ? "bg-emerald-950/30 border-emerald-800/70 hover:bg-emerald-950/60"
                : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
              <Save className="w-4 h-4 shrink-0" />
              <span>Lưu vào Lịch sử rồi tiếp tục</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                Khuyên dùng
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
              Thêm bản nháp này vào Lịch sử, sau đó {actionLabel}.
            </p>
          </button>

          <button
            id="btn-draft-discard-continue"
            onClick={onDiscardAndContinue}
            className={`w-full p-3.5 rounded-xl border text-left transition-colors ${
              isDark
                ? "bg-red-950/30 border-red-900/70 hover:bg-red-950/60"
                : "bg-red-50 border-red-200 hover:bg-red-100"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-red-500">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Bỏ bản nháp, tiếp tục</span>
            </div>
            <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
              Xoá nội dung đang dựng và {actionLabel} ngay. Không hoàn tác được.
            </p>
          </button>
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-end ${
            isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-100"
          }`}
        >
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isDark
                ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Quay lại, chưa làm gì cả
          </button>
        </div>
      </div>
    </div>
  );
};
