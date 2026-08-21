import React, { useState, useEffect, useRef } from "react";
import { 
  Copy, 
  Check, 
  Download, 
  ArrowRight, 
  ArrowLeft, 
  Edit3, 
  FileText, 
  Sparkles, 
  Layers, 
  BookmarkCheck,
  CheckCircle2,
  RotateCcw,
  Save,
  Sliders
} from "lucide-react";
import { CharacterData } from "../types";
import { buildCharacterCardText } from "../data/templateConstants";
import { StarIcon, CloudIcon, CloudBannerDecoration } from "./CloudStarDecorations";

interface CharacterCardPreviewProps {
  characterData: CharacterData;
  charactersList?: CharacterData[];
  setCharacterData: React.Dispatch<React.SetStateAction<CharacterData>>;
  onGoBackToBuilder: () => void;
  onProceedToTemplate: () => void;
  onSaveToHistory: (type: "character_only" | "full_template", customText?: string) => void;
  isDark: boolean;
}

export const CharacterCardPreview: React.FC<CharacterCardPreviewProps> = ({
  characterData,
  charactersList = [characterData],
  onGoBackToBuilder,
  onProceedToTemplate,
  onSaveToHistory,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const sourceChars = charactersList && charactersList.length > 0 ? charactersList : [characterData];
  const defaultCardText = buildCharacterCardText(sourceChars);
  const [currentText, setCurrentText] = useState(defaultCardText);
  const [isCustomEdited, setIsCustomEdited] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if characterData or charactersList changed and user hasn't made custom edits
  useEffect(() => {
    if (!isCustomEdited) {
      setCurrentText(buildCharacterCardText(sourceChars));
    }
  }, [characterData, charactersList, isCustomEdited]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // Save edit
      setIsEditing(false);
      setIsCustomEdited(true);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } else {
      setIsEditing(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
    }
  };

  const handleResetToForm = () => {
    if (window.confirm("Khôi phục lại nội dung tự động từ Form tạo nhân vật ban đầu? Mọi chỉnh sửa văn bản trực tiếp sẽ bị đặt lại.")) {
      const freshText = buildCharacterCardText(characterData);
      setCurrentText(freshText);
      setIsCustomEdited(false);
      setIsEditing(false);
    }
  };

  const handleDownloadTxt = () => {
    const rawName = characterData.fullName || "Character_Card";
    const filename = `${rawName}_card.txt`.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_");
    const blob = new Blob([currentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = currentText.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <CloudBannerDecoration isDark={isDark} />

      {/* Header card */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark 
          ? "bg-slate-900/80 border-slate-800 text-slate-100" 
          : "bg-sky-50/80 border-sky-200 text-slate-800"
      } shadow-xs`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold">
                Thẻ Nhân Vật Hoàn Chỉnh (Character Card)
              </h2>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-sky-800/80"}`}>
              Thẻ nhân vật đã được biên dịch theo cấu trúc chuẩn. Bạn có thể bấm nút <strong>Chỉnh sửa</strong> nổi ở góc trên hộp text để sửa trực tiếp câu từ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-edit-character-form"
              onClick={onGoBackToBuilder}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100/70 text-sky-800"
              }`}
              title="Quay lại form nhập liệu các câu hỏi"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Sửa theo Form</span>
            </button>

            <button
              id="btn-save-char-history"
              onClick={() => onSaveToHistory("character_only", currentText)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Lưu thẻ</span>
            </button>

            <button
              id="btn-download-card-txt"
              onClick={handleDownloadTxt}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
              title="Xuất file .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất .txt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion Callout: Make Full Template? */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark 
          ? "bg-indigo-950/40 border-indigo-700/60 text-slate-100" 
          : "bg-sky-100/70 border-sky-300 text-slate-800"
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold">
                Làm thành Template Roleplay Hoàn Chỉnh?
              </h3>
            </div>
            <p className={`text-xs sm:text-sm ${isDark ? "text-slate-300" : "text-sky-900/80"}`}>
              Chèn thẻ nhân vật vào mẫu System Prompt chuẩn (Bao gồm Roleplay Architecture, Smut Engine, Slowburn, Anti-OOC, System Override Commands /sys, Lore và Checklist).
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-proceed-template"
              onClick={onProceedToTemplate}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-98 shadow-sm transition-all whitespace-nowrap"
            >
              <Layers className="w-4 h-4" />
              <span>Tiếp tục làm Template</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* The Text Box Container with FLOATING ACTION BAR at TOP RIGHT */}
      <div className={`relative rounded-2xl border overflow-hidden shadow-xs ${
        isDark 
          ? "bg-slate-900 border-slate-800 text-slate-200" 
          : "bg-white border-sky-200 text-slate-800"
      }`}>
        {/* Top Header of Text Box */}
        <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? "bg-slate-800/80 border-slate-800" : "bg-sky-50/80 border-sky-100"
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <StarIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Định dạng Thẻ Nhân Vật (Character Card)</span>
            {isCustomEdited && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-semibold">
                Đã chỉnh sửa
              </span>
            )}
            {savedFeedback && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold animate-pulse">
                Đã lưu sửa đổi!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] opacity-70">
            <span>{charCount.toLocaleString()} ký tự</span>
            <span>•</span>
            <span>{wordCount.toLocaleString()} từ</span>
          </div>
        </div>

        {/* FLOATING ACTION BUTTONS (NỔI Ở GÓC TRÊN CỦA ĐỊNH DẠNG THẺ TEXT) */}
        <div className="sticky top-3 z-20 flex justify-end px-4 pt-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all bg-slate-900/90 dark:bg-slate-800/95 border-sky-500/40 text-white">
            {/* Direct Edit Button */}
            <button
              id="btn-floating-edit-card"
              type="button"
              onClick={handleToggleEdit}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isEditing
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                  : "bg-sky-600 hover:bg-sky-500 text-white"
              }`}
              title={isEditing ? "Hoàn tất và lưu sửa đổi text" : "Chỉnh sửa trực tiếp văn bản"}
            >
              {isEditing ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Xong & Lưu</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh Sửa Text</span>
                </>
              )}
            </button>

            {/* Reset Button if edited */}
            {isCustomEdited && (
              <button
                id="btn-floating-reset-card"
                type="button"
                onClick={handleResetToForm}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors"
                title="Khôi phục lại nội dung ban đầu từ Form"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Đặt lại từ Form</span>
              </button>
            )}

            {/* Copy Button */}
            <button
              id="btn-floating-copy-card"
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700/90 hover:bg-slate-600 text-white"
              }`}
              title="Copy toàn bộ nội dung thẻ nhân vật"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã Copy!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Thẻ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text Content Area / Editable Textarea */}
        <div className="p-4 sm:p-6 -mt-2">
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-semibold pb-1">
                <span>Chế độ chỉnh sửa trực tiếp (Đang bật)</span>
                <span className="opacity-70">Nhập hoặc sửa bất kỳ chi tiết nào bạn muốn</span>
              </div>
              <textarea
                ref={textareaRef}
                id="textarea-edit-card-text"
                rows={22}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                className={`w-full p-4 rounded-xl font-mono text-xs sm:text-sm leading-relaxed border outline-hidden shadow-inner ${
                  isDark
                    ? "bg-slate-950 border-sky-500/50 text-slate-100 focus:ring-1 focus:ring-sky-500"
                    : "bg-sky-50/40 border-sky-400 text-slate-900 focus:ring-1 focus:ring-sky-500"
                }`}
                placeholder="Nội dung thẻ nhân vật..."
              />
            </div>
          ) : (
            <pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-all">
              {currentText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
