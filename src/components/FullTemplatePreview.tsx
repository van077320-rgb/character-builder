import React, { useState, useEffect, useRef } from "react";
import { 
  Copy, 
  Check, 
  Download, 
  ArrowLeft, 
  Cloud, 
  FileText, 
  Sparkles, 
  BookmarkCheck, 
  Search,
  CheckCircle2,
  CheckCircle,
  FileCheck,
  Edit3,
  Save,
  RotateCcw,
  Sliders
} from "lucide-react";
import { CharacterData, TemplateData } from "../types";
import { buildFullTemplateText } from "../data/templateConstants";
import { StarIcon, FourPointStar, CloudBannerDecoration } from "./CloudStarDecorations";
import { SystemCommandsGuide } from "./SystemCommandsGuide";

interface FullTemplatePreviewProps {
  characterData: CharacterData;
  charactersList?: CharacterData[];
  templateData: TemplateData;
  onGoBackToTemplateBuilder: () => void;
  onSaveToHistory: (type: "character_only" | "full_template", customText?: string) => void;
  onOpenGoogleDrive: () => void;
  isLoggedIn: boolean;
  isDark: boolean;
}

export const FullTemplatePreview: React.FC<FullTemplatePreviewProps> = ({
  characterData,
  charactersList = [characterData],
  templateData,
  onGoBackToTemplateBuilder,
  onSaveToHistory,
  onOpenGoogleDrive,
  isLoggedIn,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const sourceChars = charactersList && charactersList.length > 0 ? charactersList : [characterData];
  const defaultTemplateText = buildFullTemplateText(sourceChars, templateData);
  const [currentText, setCurrentText] = useState(defaultTemplateText);
  const [isCustomEdited, setIsCustomEdited] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if data changed and user hasn't made direct edits
  useEffect(() => {
    if (!isCustomEdited) {
      setCurrentText(buildFullTemplateText(sourceChars, templateData));
    }
  }, [characterData, charactersList, templateData, isCustomEdited]);

  const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = currentText.length;
  const estimatedTokens = Math.round(charCount / 3.5);

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
    if (window.confirm("Khôi phục lại nội dung tự động từ Form thiết lập kịch bản ban đầu? Mọi chỉnh sửa văn bản trực tiếp sẽ bị đặt lại.")) {
      const freshText = buildFullTemplateText(characterData, templateData);
      setCurrentText(freshText);
      setIsCustomEdited(false);
      setIsEditing(false);
    }
  };

  const handleDownloadTxt = () => {
    const rawName = characterData.fullName || "Roleplay_System_Prompt";
    const filename = `${rawName}_System_Prompt_Template.txt`.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_");
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <CloudBannerDecoration isDark={isDark} />

      {/* Header Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark 
          ? "bg-slate-900/80 border-slate-800 text-slate-100" 
          : "bg-sky-50/80 border-sky-200 text-slate-800"
      } shadow-xs`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold">
                Bản Xem Trước Template Hoàn Chỉnh & Xuất Tệp
              </h2>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-sky-800/80"}`}>
              Kiểm tra toàn bộ nội dung system prompt hoàn chỉnh trước khi copy hoặc xuất file text. Bạn có thể bấm <strong>Chỉnh sửa text</strong> để tinh chỉnh trực tiếp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-preview-back-to-editor"
              onClick={onGoBackToTemplateBuilder}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100/70 text-sky-800"
              }`}
              title="Quay lại form tùy chỉnh kịch bản"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Sửa theo Form</span>
            </button>

            <button
              id="btn-save-full-history-top"
              onClick={() => onSaveToHistory("full_template", currentText)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Lưu Lịch Sử</span>
            </button>

            <button
              id="btn-download-full-txt"
              onClick={handleDownloadTxt}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
              title="Tải về file .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất File .txt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats & Actions bar */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        isDark ? "bg-slate-900/60 border-slate-800 text-slate-300" : "bg-white border-sky-200 text-slate-700"
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-sky-600 dark:text-sky-400">
            📊 Thống kê:
          </span>
          <span>
            Ký tự: <strong>{charCount.toLocaleString()}</strong>
          </span>
          <span>•</span>
          <span>
            Từ: <strong>{wordCount.toLocaleString()}</strong>
          </span>
          <span>•</span>
          <span>
            Tokens ước lượng: <strong>~{estimatedTokens.toLocaleString()}</strong>
          </span>
          {isCustomEdited && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-semibold">
              Đã chỉnh sửa trực tiếp
            </span>
          )}
          {savedFeedback && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold animate-pulse">
              Đã lưu sửa đổi!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-save-to-google-drive"
            onClick={onOpenGoogleDrive}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
              isLoggedIn
                ? isDark
                  ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                  : "bg-emerald-50 border-emerald-300 text-emerald-700"
                : isDark
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                  : "bg-white border-sky-200 hover:bg-sky-50 text-slate-700"
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isLoggedIn ? "Lưu / Đồng bộ Cloud" : "Đăng nhập Google Cloud"}</span>
          </button>
        </div>
      </div>

      {/* System Override Commands Guide & Quick Cheat Sheet */}
      <SystemCommandsGuide isDark={isDark} defaultExpanded={true} />

      {/* Preview Box Container with FLOATING ACTION BAR at TOP RIGHT */}
      <div className={`relative rounded-2xl border overflow-hidden shadow-xs ${
        isDark 
          ? "bg-slate-900 border-slate-800 text-slate-200" 
          : "bg-white border-sky-200 text-slate-800"
      }`}>
        {/* Box Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? "bg-slate-800/80 border-slate-800" : "bg-sky-50/80 border-sky-100"
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <StarIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Nội dung Prompt System Chuẩn (Full Text)</span>
          </div>
          <div className="text-[11px] opacity-70">
            {isEditing ? "Đang ở chế độ chỉnh sửa" : "Xem trước toàn bộ"}
          </div>
        </div>

        {/* FLOATING ACTION BUTTONS (NỔI Ở GÓC TRÊN CỦA ĐỊNH DẠNG THẺ TEXT) */}
        <div className="sticky top-3 z-20 flex justify-end px-4 pt-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all bg-slate-900/90 dark:bg-slate-800/95 border-sky-500/40 text-white">
            {/* Direct Edit Button */}
            <button
              id="btn-floating-edit-template"
              type="button"
              onClick={handleToggleEdit}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isEditing
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                  : "bg-sky-600 hover:bg-sky-500 text-white"
              }`}
              title={isEditing ? "Hoàn tất và lưu sửa đổi text" : "Chỉnh sửa trực tiếp văn bản template"}
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
                id="btn-floating-reset-template"
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
              id="btn-floating-copy-template"
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700/90 hover:bg-slate-600 text-white"
              }`}
              title="Copy toàn bộ template system prompt"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã Copy!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Template</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text Content Area / Editable Textarea */}
        <div className="p-4 sm:p-6 -mt-2 overflow-x-auto">
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-semibold pb-1">
                <span>Chế độ chỉnh sửa trực tiếp toàn bộ System Prompt (Đang bật)</span>
                <span className="opacity-70">Bạn có thể sửa đổi bất kỳ đoạn văn, rule hoặc thẻ XML nào</span>
              </div>
              <textarea
                ref={textareaRef}
                id="textarea-edit-template-text"
                rows={32}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                className={`w-full p-4 rounded-xl font-mono text-xs sm:text-sm leading-relaxed border outline-hidden shadow-inner ${
                  isDark
                    ? "bg-slate-950 border-sky-500/50 text-slate-100 focus:ring-1 focus:ring-sky-500"
                    : "bg-sky-50/40 border-sky-400 text-slate-900 focus:ring-1 focus:ring-sky-500"
                }`}
                placeholder="Nội dung system prompt template..."
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
