import React from "react";
import { AlertTriangle, FolderUp, GitMerge, Replace, X } from "lucide-react";
import type { ParsedBackup } from "../data/backupFormat";

interface ImportBackupModalProps {
  /** Kết quả đọc file. `null` = đóng modal. */
  parsed: ParsedBackup | null;
  /** Số bản ghi đang có trong thư viện. */
  existingCount: number;
  onClose: () => void;
  onConfirm: (mode: "merge" | "replace") => void;
  isDark: boolean;
}

/**
 * Hỏi rõ người dùng muốn GỘP hay THAY THẾ trước khi nhập backup.
 *
 * Trước đây import chạy thẳng `setHistoryItems(items)` — thay thế toàn bộ, không
 * hỏi, không hoàn tác được. Nhập một file cũ 3 mục lên thư viện 40 mục là mất 40.
 */
export const ImportBackupModal: React.FC<ImportBackupModalProps> = ({
  parsed,
  existingCount,
  onClose,
  onConfirm,
  isDark,
}) => {
  if (!parsed) return null;

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
            isDark ? "bg-slate-800/80 border-slate-700" : "bg-sky-50/70 border-sky-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDark ? "bg-sky-950/80 text-sky-400 border border-sky-800/50" : "bg-sky-100 text-sky-600"
              }`}
            >
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Khôi phục bản sao lưu</h3>
              <p className="text-[11px] opacity-75">
                Đọc được <strong>{parsed.items.length}</strong> bản ghi từ {parsed.sourceLabel}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg opacity-70 hover:opacity-100" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-xs sm:text-sm">
          {parsed.skipped > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Có <strong>{parsed.skipped}</strong> mục trong file bị bỏ qua vì không đọc được dữ liệu
                nhân vật.
              </span>
            </div>
          )}

          <p className="opacity-90 leading-relaxed">
            Thư viện hiện tại đang có <strong>{existingCount}</strong> bản ghi. Bạn muốn xử lý thế nào?
          </p>

          {/* Lựa chọn GỘP */}
          <button
            id="btn-import-merge"
            onClick={() => onConfirm("merge")}
            className={`w-full p-3.5 rounded-xl border text-left transition-colors ${
              isDark
                ? "bg-emerald-950/30 border-emerald-800/70 hover:bg-emerald-950/60"
                : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
              <GitMerge className="w-4 h-4 shrink-0" />
              <span>Gộp vào thư viện</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                Khuyên dùng
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
              Giữ nguyên {existingCount} bản ghi đang có, thêm những bản ghi mới từ file. Trùng thì giữ
              bản mới hơn. Không mất gì.
            </p>
          </button>

          {/* Lựa chọn THAY THẾ */}
          <button
            id="btn-import-replace"
            onClick={() => onConfirm("replace")}
            className={`w-full p-3.5 rounded-xl border text-left transition-colors ${
              isDark
                ? "bg-red-950/30 border-red-900/70 hover:bg-red-950/60"
                : "bg-red-50 border-red-200 hover:bg-red-100"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-red-500">
              <Replace className="w-4 h-4 shrink-0" />
              <span>Thay thế toàn bộ</span>
            </div>
            <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
              Xoá sạch {existingCount} bản ghi hiện có, chỉ giữ {parsed.items.length} bản ghi trong file.
              Không hoàn tác được.
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
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isDark
                ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
};
