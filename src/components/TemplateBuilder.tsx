import React, { useState } from "react";
import { 
  Sparkles, 
  Layers, 
  User, 
  Globe, 
  ShieldAlert, 
  Users, 
  Gamepad2, 
  PlayCircle, 
  CheckSquare, 
  ArrowRight, 
  ArrowLeft, 
  Wand2, 
  Loader2,
  BookmarkPlus,
  HelpCircle,
  Plus,
  Trash2,
  Check,
  Eye,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { CharacterData, TemplateData, UserProfileField, DEFAULT_USER_PROFILE_FIELDS } from "../types";
import { StarIcon, FourPointStar, CloudIcon, CloudBannerDecoration } from "./CloudStarDecorations";
import { SystemCommandsGuide } from "./SystemCommandsGuide";

interface TemplateBuilderProps {
  characterData: CharacterData;
  charactersList?: CharacterData[];
  templateData: TemplateData;
  setTemplateData: React.Dispatch<React.SetStateAction<TemplateData>>;
  onGoBackToCard: () => void;
  onProceedToFullPreview: () => void;
  onSaveDraft: () => void;
  isDark: boolean;
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  characterData,
  charactersList = [characterData],
  templateData,
  setTemplateData,
  onGoBackToCard,
  onProceedToFullPreview,
  onSaveDraft,
  isDark,
}) => {
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [sectionAiError, setSectionAiError] = useState<string | null>(null);
  const [extraAiPrompt, setExtraAiPrompt] = useState("");
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomPlaceholder, setNewCustomPlaceholder] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showPersonaPreview, setShowPersonaPreview] = useState(true);

  const fields = templateData.userProfileFields || DEFAULT_USER_PROFILE_FIELDS;

  // Toggle or update field
  const handleToggleField = (id: string) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
    setTemplateData((prev) => ({ ...prev, userProfileFields: updated }));
  };

  const handleUpdateFieldLabel = (id: string, label: string) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, label } : f));
    setTemplateData((prev) => ({ ...prev, userProfileFields: updated }));
  };

  const handleUpdateFieldPlaceholder = (id: string, placeholder: string) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, placeholder } : f));
    setTemplateData((prev) => ({ ...prev, userProfileFields: updated }));
  };

  const handleRemoveField = (id: string) => {
    const updated = fields.filter((f) => f.id !== id);
    setTemplateData((prev) => ({ ...prev, userProfileFields: updated }));
  };

  const handleAddCustomField = () => {
    if (!newCustomLabel.trim()) return;
    const newField: UserProfileField = {
      id: "custom_" + Date.now(),
      label: newCustomLabel.trim(),
      placeholder: newCustomPlaceholder.trim() || `[Điền ${newCustomLabel.trim()} của bạn]`,
      enabled: true,
      isCustom: true,
    };
    setTemplateData((prev) => ({
      ...prev,
      userProfileFields: [...(prev.userProfileFields || DEFAULT_USER_PROFILE_FIELDS), newField],
    }));
    setNewCustomLabel("");
    setNewCustomPlaceholder("");
    setShowAddCustom(false);
  };

  // Presets
  const applyPreset = (type: "basic" | "full" | "minimal") => {
    let updated: UserProfileField[] = [];
    if (type === "basic") {
      updated = DEFAULT_USER_PROFILE_FIELDS.map((f) => ({
        ...f,
        enabled: ["name", "age", "gender", "appearance", "occupation"].includes(f.id),
      }));
    } else if (type === "full") {
      updated = DEFAULT_USER_PROFILE_FIELDS.map((f) => ({ ...f, enabled: true }));
    } else if (type === "minimal") {
      updated = DEFAULT_USER_PROFILE_FIELDS.map((f) => ({
        ...f,
        enabled: ["name", "age", "gender"].includes(f.id),
      }));
    }
    setTemplateData((prev) => ({ ...prev, userProfileFields: updated }));
  };

  const handleDirectFieldChange = (field: keyof TemplateData, value: any) => {
    setTemplateData((prev) => ({ ...prev, [field]: value }));
  };

  // AI Generator for Template Sections
  const handleGenerateSectionAI = async (sectionType: "lore" | "opening_scene" | "npcs" | "mechanics") => {
    setLoadingSection(sectionType);
    setSectionAiError(null);

    try {
      const res = await fetch("/api/gemini/generate-template-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType,
          characterData,
          userProfileFields: templateData.userProfileFields,
          extraPrompt: extraAiPrompt,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Lỗi khi tạo mục template với AI");
      }

      const data = await res.json();

      if (sectionType === "lore") {
        setTemplateData((prev) => ({
          ...prev,
          publicLore: data.publicLore || prev.publicLore,
          hiddenLore: data.hiddenLore || prev.hiddenLore,
          worldbookAppendix: data.worldbookAppendix || prev.worldbookAppendix,
        }));
      } else if (sectionType === "opening_scene") {
        setTemplateData((prev) => ({
          ...prev,
          openingScene: data.openingScene || prev.openingScene,
        }));
      } else if (sectionType === "npcs") {
        setTemplateData((prev) => ({
          ...prev,
          npcsText: data.npcsText || prev.npcsText,
        }));
      } else if (sectionType === "mechanics") {
        setTemplateData((prev) => ({
          ...prev,
          includeGameMechanics: true,
          gameMechanicsTitle: data.mechanicsTitle || prev.gameMechanicsTitle,
          gameMechanicsContent: data.mechanicsContent || prev.gameMechanicsContent,
        }));
      }
    } catch (e: any) {
      console.error(e);
      setSectionAiError(e.message || "Lỗi khi tạo nội dung với AI. Vui lòng thử lại.");
    } finally {
      setLoadingSection(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <CloudBannerDecoration isDark={isDark} />

      {/* Top Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark 
          ? "bg-slate-900/80 border-slate-800 text-slate-100" 
          : "bg-sky-50/80 border-sky-200 text-slate-800"
      } shadow-xs`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold">
                Lắp Ghép & Hoàn Thiện Template Roleplay
              </h2>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-sky-800/80"}`}>
              Cấu hình form User Profile mẫu (chọn các mục placeholder), kịch bản mở đầu và các thiết lập thế giới.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-template-back-to-card"
              onClick={onGoBackToCard}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Xem Thẻ Card</span>
            </button>
            <button
              id="btn-save-draft-template"
              onClick={onSaveDraft}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                  : "bg-white border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Lưu nháp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Credit & Strict Rule Reminder */}
      <div className={`p-4 rounded-xl border text-xs sm:text-sm ${
        isDark 
          ? "bg-slate-900/60 border-slate-800 text-slate-300" 
          : "bg-white border-sky-200 text-slate-700"
      }`}>
        <div className="flex items-center gap-2 font-bold text-sky-600 mb-1">
          <StarIcon className="w-4 h-4 text-amber-400" />
          <span>Bản quyền & Cấu trúc Template Cố Định</span>
        </div>
        <p className="opacity-90 leading-relaxed">
          Template phát triển dựa trên chuẩn <strong>[Hành tinh nhỏ của Cá Mèo]</strong>. Các phần kiến trúc gồm <em>Roleplay Architecture, Pre-write Check, Output Rules, Core Writing Style, Narrative Propulsion, Expanded Smut Engine, Slowburn Exit, Continuity, Time Skip</em> và <em>System Override Commands (/sys)</em> được bảo toàn nghiêm ngặt và không bị thay đổi.
        </p>
      </div>

      {/* AI Section Error Banner */}
      {sectionAiError && (
        <div className="p-3.5 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Thông báo:</span>
            <span>{sectionAiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSectionAiError(null)}
            className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* SECTION 1: User Profile Form Configuration (Placeholder Selection Form) */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200"
      } shadow-xs space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-sky-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm sm:text-base font-bold">
                1. Form User Profile Mẫu Cho Kịch Bản (&lt;user_persona&gt;)
              </h3>
            </div>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Chọn và tùy chỉnh các mục placeholder sẽ xuất hiện trong form để người chơi roleplay điền thông tin của họ khi xuất template.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] font-semibold opacity-70 hidden md:inline">Chọn nhanh:</span>
            <button
              type="button"
              id="btn-preset-basic"
              onClick={() => applyPreset("basic")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" : "bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              Cơ bản (5 mục)
            </button>
            <button
              type="button"
              id="btn-preset-full"
              onClick={() => applyPreset("full")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" : "bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              Đầy đủ
            </button>
            <button
              type="button"
              id="btn-preset-minimal"
              onClick={() => applyPreset("minimal")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" : "bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-800"
              }`}
            >
              Tối giản (3 mục)
            </button>
          </div>
        </div>

        {/* Placeholder Form Fields */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5">
            {fields.map((field) => (
              <div
                key={field.id}
                className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center gap-3 ${
                  field.enabled
                    ? isDark
                      ? "bg-slate-800/80 border-sky-500/30"
                      : "bg-sky-50/70 border-sky-200"
                    : isDark
                      ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                      : "bg-slate-50/50 border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-[220px]">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs sm:text-sm select-none">
                    <input
                      id={`checkbox-field-${field.id}`}
                      type="checkbox"
                      checked={field.enabled}
                      onChange={() => handleToggleField(field.id)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span className={field.enabled ? "text-sky-600 dark:text-sky-400 font-bold" : ""}>
                      {field.isCustom ? "(Tùy chỉnh)" : ""} {field.label}
                    </span>
                  </label>
                </div>

                {field.enabled && (
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="w-full sm:w-1/3">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateFieldLabel(field.id, e.target.value)}
                        placeholder="Tên mục (nhãn)"
                        className={`w-full p-2 rounded-lg text-xs border outline-hidden ${
                          isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-sky-200 text-slate-800"
                        }`}
                        title="Tên hiển thị của trường"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={field.placeholder}
                        onChange={(e) => handleUpdateFieldPlaceholder(field.id, e.target.value)}
                        placeholder="Placeholder / Hướng dẫn điền..."
                        className={`w-full p-2 rounded-lg text-xs border outline-hidden font-mono ${
                          isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-sky-200 text-slate-700"
                        }`}
                        title="Placeholder / gợi ý cho người chơi"
                      />
                    </div>
                    {field.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors self-end sm:self-center"
                        title="Xóa mục tùy chỉnh này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Custom Field Box */}
          {showAddCustom ? (
            <div className={`p-3.5 rounded-xl border border-dashed ${
              isDark ? "bg-slate-800/50 border-sky-500/40" : "bg-sky-50/50 border-sky-300"
            } space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  Thêm mục placeholder mới phù hợp với World:
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="text-xs opacity-70 hover:opacity-100"
                >
                  Hủy
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  placeholder="Tên mục (VD: Hệ nguyên tố, Chủng loài, Phe phái...)"
                  className={`p-2 rounded-lg text-xs border outline-hidden ${
                    isDark ? "bg-slate-900 border-slate-700" : "bg-white border-sky-200"
                  }`}
                />
                <input
                  type="text"
                  value={newCustomPlaceholder}
                  onChange={(e) => setNewCustomPlaceholder(e.target.value)}
                  placeholder="Placeholder (VD: [Điền ma pháp/hệ nguyên tố của bạn])"
                  className={`p-2 rounded-lg text-xs border outline-hidden font-mono ${
                    isDark ? "bg-slate-900 border-slate-700" : "bg-white border-sky-200"
                  }`}
                />
              </div>
              <button
                type="button"
                id="btn-confirm-add-custom-field"
                onClick={handleAddCustomField}
                disabled={!newCustomLabel.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all disabled:opacity-50"
              >
                + Thêm Mục Vào Form User
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-open-add-custom-field"
              onClick={() => setShowAddCustom(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-dashed transition-all ${
                isDark ? "border-slate-700 hover:border-sky-500 text-sky-400" : "border-sky-300 hover:border-sky-500 text-sky-700"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mục khác phù hợp với World (VD: Ma pháp, Phe phái, Chủng loài...)</span>
            </button>
          )}

          {/* Form Preview Preview Accordion */}
          <div className={`mt-3 p-3 rounded-xl border text-xs ${
            isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => setShowPersonaPreview(!showPersonaPreview)}
              className="w-full flex items-center justify-between font-bold text-sky-600 dark:text-sky-400"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Xem nhanh định dạng &lt;user_persona&gt; sẽ xuất ra trong template</span>
              </span>
              {showPersonaPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showPersonaPreview && (
              <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all">
                {`<user_persona>\n# PHẦN DÀNH RIÊNG CHO USER - USER PROFILE (người chơi điền thông tin vào đây khi bắt đầu)\n${fields
                  .filter((f) => f.enabled)
                  .map((f) => `${f.label}: ${f.placeholder}`)
                  .join("\n")}\n</user_persona>`}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Lore (<lore type="public"> & <lore type="hidden">) */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200"
      } shadow-xs space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-sky-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm sm:text-base font-bold">
                2. Lore Thế Giới (&lt;lore public&gt; & &lt;lore hidden&gt;)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Không bắt buộc
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Chỉ cần điền nếu có nhu cầu tạo lore world hoặc nhân vật có plot ẩn/bí mật ngầm. Có thể để trống nếu kịch bản tự do.
            </p>
          </div>

          <button
            id="btn-ai-generate-lore"
            onClick={() => handleGenerateSectionAI("lore")}
            disabled={loadingSection === "lore"}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors self-start sm:self-auto ${
              isDark 
                ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-sky-300" 
                : "bg-sky-100 border-sky-200 hover:bg-sky-200/80 text-sky-800"
            }`}
          >
            {loadingSection === "lore" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>AI Tạo Lore Gợi Ý</span>
          </button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold opacity-90">
                Lore công khai (Public Lore - bối cảnh mọi người đều biết)
              </label>
              <span className="text-[11px] opacity-60">(Tùy chọn)</span>
            </div>
            <textarea
              id="input-public-lore"
              rows={3}
              value={templateData.publicLore}
              onChange={(e) => handleDirectFieldChange("publicLore", e.target.value)}
              placeholder="[Lore công khai về char, bối cảnh thế giới, sự kiện lịch sử nổi tiếng... Để trống nếu không cần]"
              className={`w-full p-2.5 rounded-lg border outline-hidden ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-slate-100" 
                  : "bg-sky-50/50 border-sky-200 text-slate-800"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-amber-500 dark:text-amber-400">
                Lore ẩn (Hidden Lore - bí mật ngầm, plot twist chỉ Narrator/GM biết)
              </label>
              <span className="text-[11px] opacity-60">(Tùy chọn)</span>
            </div>
            <textarea
              id="input-hidden-lore"
              rows={3}
              value={templateData.hiddenLore}
              onChange={(e) => handleDirectFieldChange("hiddenLore", e.target.value)}
              placeholder="[Lore ẩn - bí mật thực sự đằng sau bi kịch, động cơ ngầm của char, lời nguyền chỉ GM biết... Để trống nếu không cần]"
              className={`w-full p-2.5 rounded-lg border outline-hidden ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-slate-100" 
                  : "bg-sky-50/50 border-sky-200 text-slate-800"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold opacity-90">
                Worldbook Appendix (&lt;worldbook_appendix&gt; - Tài liệu tham khảo thế giới)
              </label>
              <span className="text-[11px] opacity-60">(Tùy chọn)</span>
            </div>
            <textarea
              id="input-worldbook-appendix"
              rows={3}
              value={templateData.worldbookAppendix}
              onChange={(e) => handleDirectFieldChange("worldbookAppendix", e.target.value)}
              placeholder="[Điền nội dung thiết lập thế giới ở đây (bản đồ, phân cấp thế lực, các khái niệm, quy tắc ma thuật...)]"
              className={`w-full p-2.5 rounded-lg border outline-hidden ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-slate-100" 
                  : "bg-sky-50/50 border-sky-200 text-slate-800"
              }`}
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: NPCs Management (<npcs_management>) */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200"
      } shadow-xs space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-sky-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm sm:text-base font-bold">
                3. Quản Lý NPC (&lt;npcs_management&gt;)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Không bắt buộc
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Điền danh sách NPC phụ kèm cơ chế Secret Lock nếu kịch bản có nhiều nhân vật phụ sống động.
            </p>
          </div>

          <button
            id="btn-ai-generate-npcs"
            onClick={() => handleGenerateSectionAI("npcs")}
            disabled={loadingSection === "npcs"}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors self-start sm:self-auto ${
              isDark 
                ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-sky-300" 
                : "bg-sky-100 border-sky-200 hover:bg-sky-200/80 text-sky-800"
            }`}
          >
            {loadingSection === "npcs" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>AI Tạo Danh Sách NPC</span>
          </button>
        </div>

        <div>
          <textarea
            id="input-npcs-text"
            rows={4}
            value={templateData.npcsText}
            onChange={(e) => handleDirectFieldChange("npcsText", e.target.value)}
            placeholder="- **NPC 1 (Tên):** Tuổi, Thân phận, Tính cách, Bí mật ẩn giấu (Secret Lock)..."
            className={`w-full text-xs sm:text-sm p-2.5 rounded-lg border outline-hidden ${
              isDark 
                ? "bg-slate-800 border-slate-700 text-slate-100" 
                : "bg-sky-50/50 border-sky-200 text-slate-800"
            }`}
          />
        </div>
      </div>

      {/* SECTION 4: Game Mechanics (# C. GAME MECHANICS - Optional) */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200"
      } shadow-xs space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3 border-sky-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm sm:text-base font-bold">
              4. Game Mechanics / Cơ Chế Kịch Bản (Tùy chọn)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Không bắt buộc
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                id="toggle-game-mechanics"
                type="checkbox"
                checked={templateData.includeGameMechanics}
                onChange={(e) => handleDirectFieldChange("includeGameMechanics", e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>{templateData.includeGameMechanics ? "Đang BẬT" : "Đang TẮT"}</span>
            </label>

            {templateData.includeGameMechanics && (
              <button
                id="btn-ai-generate-mechanics"
                onClick={() => handleGenerateSectionAI("mechanics")}
                disabled={loadingSection === "mechanics"}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isDark 
                    ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-sky-300" 
                    : "bg-sky-100 border-sky-200 hover:bg-sky-200/80 text-sky-800"
                }`}
              >
                {loadingSection === "mechanics" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                <span>AI Tạo Cơ Chế</span>
              </button>
            )}
          </div>
        </div>

        {templateData.includeGameMechanics ? (
          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold mb-1 opacity-90">Tên cơ chế</label>
              <input
                id="input-mechanics-title"
                type="text"
                value={templateData.gameMechanicsTitle}
                onChange={(e) => handleDirectFieldChange("gameMechanicsTitle", e.target.value)}
                placeholder="VD: 7-Day Survival / 14-Day Countdown / Hệ thống Độ Thiện Cảm..."
                className={`w-full p-2.5 rounded-lg border outline-hidden ${
                  isDark 
                    ? "bg-slate-800 border-slate-700 text-slate-100" 
                    : "bg-sky-50/50 border-sky-200 text-slate-800"
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 opacity-90">
                Nội dung quy tắc cơ chế (Timeline, đại lượng theo dõi, điều kiện kết thúc...)
              </label>
              <textarea
                id="input-mechanics-content"
                rows={4}
                value={templateData.gameMechanicsContent}
                onChange={(e) => handleDirectFieldChange("gameMechanicsContent", e.target.value)}
                placeholder="[Quy tắc dòng thời gian, phạm vi bản đồ, đại lượng thay đổi theo hành động của user, điều kiện kết thúc...]"
                className={`w-full p-2.5 rounded-lg border outline-hidden ${
                  isDark 
                    ? "bg-slate-800 border-slate-700 text-slate-100" 
                    : "bg-sky-50/50 border-sky-200 text-slate-800"
                }`}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs opacity-70 italic">
            Nếu là roleplay trò chuyện tự do thuần túy (ví dụ thể loại tình cảm hiện đại), bạn có thể tắt mục này để template tinh gọn hơn.
          </p>
        )}
      </div>

      {/* SECTION 5: Opening Scene (<opening_scene>) */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200"
      } shadow-xs space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3 border-sky-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm sm:text-base font-bold">
              5. Phân Cảnh Mở Đầu (&lt;opening_scene&gt; - Kích hoạt khi gõ "RUN")
            </h3>
          </div>
          <button
            id="btn-ai-generate-opening-scene"
            onClick={() => handleGenerateSectionAI("opening_scene")}
            disabled={loadingSection === "opening_scene"}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isDark 
                ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-sky-300" 
                : "bg-sky-100 border-sky-200 hover:bg-sky-200/80 text-sky-800"
            }`}
          >
            {loadingSection === "opening_scene" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>AI Viết Opening Scene</span>
          </button>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-1 opacity-90">
            Nội dung cảnh mở đầu (Bắt đầu với [địa điểm, thời gian], dùng placeholder &#123;&#123;user&#125;&#125;)
          </label>
          <textarea
            id="input-opening-scene"
            rows={5}
            value={templateData.openingScene}
            onChange={(e) => handleDirectFieldChange("openingScene", e.target.value)}
            placeholder="[Thư phòng tầng cao nhất Cố gia, 11:30 Đêm mưa dầm]&#10;&#10;Tiếng sấm rền vang sau rèm cửa sát đất..."
            className={`w-full text-xs sm:text-sm p-2.5 rounded-lg border outline-hidden ${
              isDark 
                ? "bg-slate-800 border-slate-700 text-slate-100" 
                : "bg-sky-50/50 border-sky-200 text-slate-800"
            }`}
          />
        </div>
      </div>

      {/* SECTION 6: Output Checklist Customization */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-sky-200"
      } shadow-xs space-y-4`}>
        <div className="flex items-center gap-2 border-b pb-3 border-sky-100 dark:border-slate-800">
          <CheckSquare className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm sm:text-base font-bold">
            6. Tùy Chỉnh Output Checklist (&lt;output_checklist&gt;)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold mb-1 opacity-90">Kiểm tra văn phong ngắn gọn</label>
            <input
              id="input-checklist-tone"
              type="text"
              value={templateData.customChecklistTone}
              onChange={(e) => handleDirectFieldChange("customChecklistTone", e.target.value)}
              placeholder="VD: Văn phong tiểu thuyết hiện đại, giàu hình ảnh, nhịp độ mượt mà..."
              className={`w-full p-2.5 rounded-lg border outline-hidden ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-slate-100" 
                  : "bg-sky-50/50 border-sky-200 text-slate-800"
              }`}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 opacity-90">Quy tắc Anti-OOC bổ sung</label>
            <input
              id="input-checklist-rules"
              type="text"
              value={templateData.customChecklistRules}
              onChange={(e) => handleDirectFieldChange("customChecklistRules", e.target.value)}
              placeholder="VD: Tuân thủ ranh giới tính cách và không phá vỡ logic hành vi của char..."
              className={`w-full p-2.5 rounded-lg border outline-hidden ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-slate-100" 
                  : "bg-sky-50/50 border-sky-200 text-slate-800"
              }`}
            />
          </div>
        </div>
      </div>

      {/* System Override Commands Guide & Cheat Sheet */}
      <SystemCommandsGuide isDark={isDark} defaultExpanded={false} />

      {/* Bottom Sticky Action Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDark 
          ? "bg-slate-900/95 border-slate-800 text-slate-100" 
          : "bg-sky-50/90 border-sky-200 text-slate-800"
      } shadow-md`}>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <CloudIcon className="w-5 h-5 text-sky-400" />
          <span>
            Nhân vật ghép: <strong>{characterData.fullName || "(Chưa đặt tên)"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="btn-save-draft-template-bottom"
            onClick={onSaveDraft}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
              isDark 
                ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200" 
                : "bg-white border-sky-300 hover:bg-sky-100 text-sky-900"
            }`}
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Lưu Lịch Sử</span>
          </button>

          <button
            id="btn-proceed-full-preview"
            onClick={onProceedToFullPreview}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-98 shadow-sm transition-all"
          >
            <span>Xem Trước Bản Đầy Đủ & Xuất Tệp</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
