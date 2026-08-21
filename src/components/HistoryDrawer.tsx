import React, { useState } from "react";
import { 
  History, 
  Search, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Layers, 
  FileText, 
  ArrowRight, 
  Check, 
  Star, 
  FolderDown, 
  FolderUp, 
  Eye,
  Plus
} from "lucide-react";
import { SavedHistoryItem, CharacterData, TemplateData } from "../types";
import { buildCharacterCardText, buildFullTemplateText } from "../data/templateConstants";
import { StarIcon, FourPointStar, CloudIcon, CloudBannerDecoration } from "./CloudStarDecorations";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { ImportBackupModal } from "./ImportBackupModal";
import { buildBackupPayload, parseBackupFile, type ParsedBackup } from "../data/backupFormat";

interface HistoryDrawerProps {
  historyItems: SavedHistoryItem[];
  onLoadItem: (item: SavedHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onImportBackup: (items: SavedHistoryItem[], mode: "merge" | "replace") => void;
  onStartNewCharacter: () => void;
  isDark: boolean;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  historyItems,
  onLoadItem,
  onDeleteItem,
  onClearAll,
  onImportBackup,
  onStartNewCharacter,
  isDark,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "character_only" | "full_template">("all");
  const [previewingItem, setPreviewingItem] = useState<SavedHistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion confirmation states
  const [itemToDelete, setItemToDelete] = useState<SavedHistoryItem | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  // Backup đã đọc xong, đang chờ người dùng chọn Gộp hay Thay thế
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null);

  // Bản ghi cũ hoặc nhập từ ngoài có thể thiếu trường; `?? ""` để một bản ghi
  // lỗi không làm trắng cả tab Lịch sử.
  const filteredItems = historyItems.filter((item) => {
    const needle = searchTerm.toLowerCase();
    const matchesSearch =
      (item.characterName ?? "").toLowerCase().includes(needle) ||
      (item.title ?? "").toLowerCase().includes(needle) ||
      (item.characterData?.occupation ?? "").toLowerCase().includes(needle);
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const getItemText = (item: SavedHistoryItem): string => {
    if (item.type === "full_template") {
      if (item.customFullTemplateText) return item.customFullTemplateText;
      return item.templateData ? buildFullTemplateText(item.characterData, item.templateData) : buildCharacterCardText(item.characterData);
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

  // Export JSON Backup — dùng chung định dạng với backup trên Google Drive
  const handleExportJsonBackup = () => {
    const dataStr = JSON.stringify(buildBackupPayload({ historyItems }), null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Character_Prompt_Studio_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  // Đọc được cả file "Sao Lưu JSON" lẫn file backup .json trên Google Drive,
  // và luôn hỏi Gộp / Thay thế trước khi động vào thư viện.
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        setPendingImport(parseBackupFile(String(event.target?.result ?? "")));
      } catch (err: any) {
        alert(`Không khôi phục được:\n\n${err?.message || "File sao lưu không đọc được."}`);
      }
    };
    reader.onerror = () => alert("Không đọc được nội dung file.");
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <CloudBannerDecoration isDark={isDark} />

      {/* Top Header Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark 
          ? "bg-slate-900/80 border-slate-800 text-slate-100" 
          : "bg-sky-50/80 border-sky-200 text-slate-800"
      } shadow-xs`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold">Lịch Sử Lưu & Thư Viện Bản Nháp</h2>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-sky-800/80"}`}>
              Dữ liệu được tự động lưu trong LocalStorage trình duyệt của bạn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-history-new-char"
              onClick={onStartNewCharacter}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Nhân Vật Mới</span>
            </button>

            <button
              id="btn-export-backup-json"
              onClick={handleExportJsonBackup}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
              title="Xuất toàn bộ lịch sử ra file JSON"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Sao Lưu JSON</span>
            </button>

            <label className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
              isDark 
                ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
            }`}>
              <FolderUp className="w-3.5 h-3.5" />
              <span>Nhập JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </label>

            {historyItems.length > 0 && (
              <button
                id="btn-clear-all-history"
                onClick={() => setIsConfirmingClearAll(true)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isDark 
                    ? "bg-slate-800 border-slate-700 hover:bg-red-950/40 text-red-400" 
                    : "bg-white border-red-200 hover:bg-red-50 text-red-600"
                }`}
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-sky-200"
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            id="input-search-history"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên nhân vật, thân phận..."
            className={`w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg border outline-hidden ${
              isDark 
                ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" 
                : "bg-sky-50/50 border-sky-200 text-slate-800 placeholder-slate-400"
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              filterType === "all"
                ? "bg-sky-600 text-white border-sky-600 font-bold"
                : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-sky-50 border-sky-200 text-slate-700"
            }`}
          >
            Tất cả ({historyItems.length})
          </button>
          <button
            onClick={() => setFilterType("character_only")}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              filterType === "character_only"
                ? "bg-sky-600 text-white border-sky-600 font-bold"
                : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-sky-50 border-sky-200 text-slate-700"
            }`}
          >
            Thẻ nhân vật ({historyItems.filter((i) => i.type === "character_only").length})
          </button>
          <button
            onClick={() => setFilterType("full_template")}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              filterType === "full_template"
                ? "bg-sky-600 text-white border-sky-600 font-bold"
                : isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-sky-50 border-sky-200 text-slate-700"
            }`}
          >
            Template hoàn chỉnh ({historyItems.filter((i) => i.type === "full_template").length})
          </button>
        </div>
      </div>

      {/* History Items Grid */}
      {filteredItems.length === 0 ? (
        <div className={`p-8 text-center rounded-2xl border ${
          isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-sky-200"
        }`}>
          <CloudIcon className="w-10 h-10 mx-auto text-sky-300 opacity-60 mb-2" />
          <h3 className="font-bold text-sm sm:text-base">Chưa có bản ghi nào phù hợp</h3>
          <p className="text-xs opacity-70 mt-1">
            Hãy bắt đầu tạo nhân vật mới và nhấn "Lưu Lịch Sử" để lưu trữ an toàn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isTemplate = item.type === "full_template";
            const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDark 
                    ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100" 
                    : "bg-white border-sky-200 hover:border-sky-300 text-slate-800 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${
                        isTemplate
                          ? isDark ? "bg-indigo-950 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                          : isDark ? "bg-sky-950 text-sky-400" : "bg-sky-50 text-sky-600"
                      }`}>
                        {isTemplate ? <Layers className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base line-clamp-1">
                          {item.characterName || item.title || "Nhân vật chưa đặt tên"}
                        </h3>
                        <span className="text-[11px] opacity-60">{dateStr}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isTemplate
                        ? isDark ? "bg-indigo-900/60 text-indigo-300" : "bg-indigo-100 text-indigo-800"
                        : isDark ? "bg-sky-900/60 text-sky-300" : "bg-sky-100 text-sky-800"
                    }`}>
                      {isTemplate ? "Template" : "Card"}
                    </span>
                  </div>

                  {/* Summary info */}
                  <div className="mt-3 text-xs space-y-1 opacity-80 line-clamp-2">
                    {item.characterData.occupation && (
                      <p>Thân phận: <strong>{item.characterData.occupation}</strong></p>
                    )}
                    {item.characterData.corePhilosophy && (
                      <p className="italic">"{item.characterData.corePhilosophy}"</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-sky-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    id={`btn-load-history-${item.id}`}
                    onClick={() => onLoadItem(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors"
                  >
                    <span>Mở / Chỉnh sửa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewingItem(item)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-sky-50 border-sky-200 hover:bg-sky-100"
                      }`}
                      title="Xem nhanh"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleCopyText(item)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        copiedId === item.id 
                          ? "bg-emerald-600 text-white border-emerald-600" 
                          : isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-sky-50 border-sky-200 hover:bg-sky-100"
                      }`}
                      title="Copy nội dung"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDownloadTxt(item)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-sky-50 border-sky-200 hover:bg-sky-100"
                      }`}
                      title="Tải về .txt"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`btn-delete-history-${item.id}`}
                      onClick={() => setItemToDelete(item)}
                      className={`p-1.5 rounded-lg border transition-colors text-red-500 cursor-pointer ${
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

      {/* Quick Preview Modal */}
      {previewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border shadow-xl ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-sky-200 text-slate-800"
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "bg-slate-800/60 border-slate-800" : "bg-sky-50 border-sky-100"
            }`}>
              <div className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Xem Nhanh: {previewingItem.characterName || previewingItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewingItem(null)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-500/40 hover:bg-slate-500/20"
              >
                Đóng
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {getItemText(previewingItem)}
              </pre>
            </div>

            <div className={`p-3.5 border-t flex items-center justify-end gap-2 ${
              isDark ? "border-slate-800 bg-slate-900" : "border-sky-100 bg-sky-50/50"
            }`}>
              <button
                onClick={() => handleCopyText(previewingItem)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => handleDownloadTxt(previewingItem)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-sky-200"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải .txt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Item Delete */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        itemName={itemToDelete?.characterName || itemToDelete?.title}
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteItem(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        isDark={isDark}
      />

      {/* Confirmation Modal for Clear All History */}
      <ConfirmDeleteModal
        isOpen={isConfirmingClearAll}
        onClose={() => setIsConfirmingClearAll(false)}
        isClearAll={true}
        onConfirm={() => {
          onClearAll();
          setIsConfirmingClearAll(false);
        }}
        isDark={isDark}
      />

      {/* Chọn Gộp / Thay thế sau khi đọc xong file sao lưu */}
      <ImportBackupModal
        parsed={pendingImport}
        existingCount={historyItems.length}
        onClose={() => setPendingImport(null)}
        onConfirm={(mode) => {
          if (pendingImport) onImportBackup(pendingImport.items, mode);
          setPendingImport(null);
        }}
        isDark={isDark}
      />
    </div>
  );
};
