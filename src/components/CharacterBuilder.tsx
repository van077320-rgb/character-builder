import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Wand2, 
  RotateCcw, 
  ArrowRight, 
  Lightbulb, 
  Plus, 
  Check, 
  Loader2,
  Trash2,
  BookmarkPlus,
  Users,
  User,
  Copy
} from "lucide-react";
import { CharacterData } from "../types";
import { CHARACTER_FIELDS, GENRE_PRESETS, ARCHETYPE_PRESETS } from "../data/presetChoices";
import { StarIcon, FourPointStar, CloudIcon, CloudBannerDecoration } from "./CloudStarDecorations";
import { initialCharacterData } from "../data/templateConstants";
import { pickCharacterFields } from "../../shared/characterFields";

interface CharacterBuilderProps {
  characterData: CharacterData;
  setCharacterData: React.Dispatch<React.SetStateAction<CharacterData>>;
  charactersList?: CharacterData[];
  setCharactersList?: React.Dispatch<React.SetStateAction<CharacterData[]>>;
  onFinishCard: () => void;
  onSaveDraft: () => void;
  isDark: boolean;
}

export const CharacterBuilder: React.FC<CharacterBuilderProps> = ({
  characterData,
  setCharacterData,
  charactersList = [characterData],
  setCharactersList,
  onFinishCard,
  onSaveDraft,
  isDark,
}) => {
  // Number of characters mode: 1 | 2 | N
  const chars = charactersList && charactersList.length > 0 ? charactersList : [characterData];
  const charCount = chars.length;

  // Track active accordion in multi-char mode (which character is expanded)
  // If only 1 char -> always expanded index 0
  const [expandedCharIndices, setExpandedCharIndices] = useState<Record<number, boolean>>({
    0: true, // First character open by default
  });

  // Custom N-char input
  const [customCountInput, setCustomCountInput] = useState<string>(charCount.toString());

  // AI quick generator state (applies to target active character index)
  const [targetCharIndex, setTargetCharIndex] = useState<number>(0);
  const [quickPrompt, setQuickPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(GENRE_PRESETS[0]);
  const [selectedArchetype, setSelectedArchetype] = useState(ARCHETYPE_PRESETS[0]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Field AI suggest state
  const [suggestingFieldKey, setSuggestingFieldKey] = useState<{ charIdx: number; key: string } | null>(null);
  const [fieldSuggestions, setFieldSuggestions] = useState<string[]>([]);
  const [activeSuggestFieldLabel, setActiveSuggestFieldLabel] = useState<string>("");
  const [isSuggestingLoading, setIsSuggestingLoading] = useState<boolean>(false);
  const [fieldSuggestError, setFieldSuggestError] = useState<string | null>(null);

  // Collapsible section management per character (10 sub-sections within character)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "0_section1": true,
    "0_section2": true,
    "0_section3": true,
    "0_section4": true,
    "0_section5": true,
    "0_section6": false,
    "0_section7": false,
    "0_section8": false,
    "0_section9": false,
    "0_section10": false,
  });

  // Keep characterData synced with charactersList[0] for backward compatibility
  const updateCharacters = (newList: CharacterData[]) => {
    if (setCharactersList) {
      setCharactersList(newList);
    }
    if (newList.length > 0) {
      setCharacterData(newList[0]);
    }
  };

  const handleSetCharCount = (count: number) => {
    if (count < 1) count = 1;
    if (count > 10) count = 10;
    setCustomCountInput(count.toString());

    let newList = [...chars];
    if (count > newList.length) {
      while (newList.length < count) {
        newList.push({
          ...initialCharacterData,
          gender: "Nam",
          species: "Nhân loại",
        });
      }
    } else if (count < newList.length) {
      newList = newList.slice(0, count);
    }
    updateCharacters(newList);

    // If 1 char -> expand it. If > 1 char -> only keep the clicked / current one open
    if (count === 1) {
      setExpandedCharIndices({ 0: true });
    } else {
      setExpandedCharIndices((prev) => ({ ...prev, 0: true }));
    }
  };

  const handleApplyCustomCount = () => {
    const parsed = parseInt(customCountInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
      handleSetCharCount(parsed);
    }
  };

  const toggleCharAccordion = (index: number) => {
    setExpandedCharIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleSection = (charIdx: number, secKey: string) => {
    const compositeKey = `${charIdx}_${secKey}`;
    setOpenSections((prev) => ({ ...prev, [compositeKey]: !prev[compositeKey] }));
  };

  const handleFieldChange = (charIdx: number, key: keyof CharacterData, value: string) => {
    const newList = [...chars];
    if (!newList[charIdx]) return;
    newList[charIdx] = {
      ...newList[charIdx],
      [key]: value,
    };
    updateCharacters(newList);
  };

  const appendChipValue = (charIdx: number, key: keyof CharacterData, chipValue: string) => {
    const currentVal = chars[charIdx]?.[key] || "";
    if (!currentVal) {
      handleFieldChange(charIdx, key, chipValue);
    } else if (!currentVal.includes(chipValue)) {
      handleFieldChange(charIdx, key, currentVal + (currentVal.endsWith("\n") ? "" : ", ") + chipValue);
    }
  };

  // Add a new character
  const handleAddNewChar = () => {
    const newList = [
      ...chars,
      {
        ...initialCharacterData,
        gender: "Nam",
        species: "Nhân loại",
      },
    ];
    updateCharacters(newList);
    setExpandedCharIndices((prev) => ({
      ...prev,
      [newList.length - 1]: true,
    }));
    setCustomCountInput(newList.length.toString());
  };

  // Remove a character
  const handleRemoveChar = (charIdx: number) => {
    if (chars.length <= 1) {
      if (window.confirm("Bạn có chắc muốn xóa dữ liệu nhân vật này về trống?")) {
        updateCharacters([{ ...initialCharacterData }]);
      }
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa Nhân vật ${charIdx + 1} (${chars[charIdx].fullName || "Chưa đặt tên"})?`)) {
      const newList = chars.filter((_, i) => i !== charIdx);
      updateCharacters(newList);
      setCustomCountInput(newList.length.toString());
    }
  };

  // AI Full Character Generation
  const handleGenerateAllAI = async (charIdx: number) => {
    setIsGeneratingAll(true);
    setAiError(null);
    try {
      const targetChar = chars[charIdx] || characterData;
      const res = await fetch("/api/gemini/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: quickPrompt,
          genre: selectedGenre,
          archetype: selectedArchetype,
          existingData: targetChar.fullName ? targetChar : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể tạo nhân vật.");
      }

      const data = await res.json();

      // Chỉ nhận đúng các trường thẻ nhân vật hợp lệ. Spread thẳng `...data` sẽ
      // nhét cả `_meta` (và `character` nếu backend bọc thêm một lớp) vào dữ liệu,
      // đồng thời không áp được trường nào khi response bị bọc.
      const fields = pickCharacterFields(data);
      if (Object.keys(fields).length === 0) {
        throw new Error("AI không trả về trường nào hợp lệ cho thẻ nhân vật. Vui lòng thử lại.");
      }

      const newList = [...chars];
      newList[charIdx] = {
        ...newList[charIdx],
        ...fields,
      };
      updateCharacters(newList);

      // Expand all sections for this character
      setOpenSections((prev) => ({
        ...prev,
        [`${charIdx}_section1`]: true,
        [`${charIdx}_section2`]: true,
        [`${charIdx}_section3`]: true,
        [`${charIdx}_section4`]: true,
        [`${charIdx}_section5`]: true,
        [`${charIdx}_section6`]: true,
        [`${charIdx}_section7`]: true,
        [`${charIdx}_section8`]: true,
        [`${charIdx}_section9`]: true,
        [`${charIdx}_section10`]: true,
      }));
      setExpandedCharIndices((prev) => ({ ...prev, [charIdx]: true }));
    } catch (e: any) {
      setAiError(e.message || "Lỗi khi kết nối với AI Gemini");
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // AI Field Suggestion
  const handleSuggestField = async (charIdx: number, fieldKey: string, fieldLabel: string) => {
    setSuggestingFieldKey({ charIdx, key: fieldKey });
    setActiveSuggestFieldLabel(fieldLabel);
    setFieldSuggestions([]);
    setIsSuggestingLoading(true);
    setFieldSuggestError(null);

    try {
      const targetChar = chars[charIdx] || characterData;
      const res = await fetch("/api/gemini/suggest-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey,
          fieldLabel,
          characterContext: targetChar,
          userHint: selectedGenre + " - " + selectedArchetype,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Không thể lấy gợi ý từ AI");
      }

      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setFieldSuggestions(data.suggestions);
      } else {
        throw new Error("AI không trả về gợi ý phù hợp cho mục này.");
      }
    } catch (e: any) {
      console.error("Field suggestion error:", e);
      setFieldSuggestError(e.message || "Lỗi khi kết nối với máy chủ AI. Vui lòng thử lại.");
    } finally {
      setIsSuggestingLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <CloudBannerDecoration isDark={isDark} />

      {/* TOP CONFIG BAR: CHỌN SỐ LƯỢNG NHÂN VẬT (1 / 2 / N-CHAR) */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark 
          ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-sm" 
          : "bg-white border-sky-200 text-slate-800 shadow-xs"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500" />
              <h2 className="text-sm sm:text-base font-bold">
                Cấu hình Số Lượng Nhân Vật Cần Tạo
              </h2>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-sky-700/80"}`}>
              {chars.length === 1 
                ? "Đang ở chế độ 1 nhân vật (tự động mở chi tiết)." 
                : `Đang tạo ${chars.length} nhân vật (thu gọn thẻ, bấm vào từng nhân vật để chỉnh sửa).`}
            </p>
          </div>

          {/* Selector controls: 1 char | 2 chars | N chars */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              id="btn-char-mode-1"
              onClick={() => handleSetCharCount(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                charCount === 1
                  ? "bg-sky-600 border-sky-500 text-white shadow-xs"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-sky-50 border-sky-200 text-slate-700 hover:bg-sky-100"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1 Nhân Vật</span>
            </button>

            <button
              type="button"
              id="btn-char-mode-2"
              onClick={() => handleSetCharCount(2)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                charCount === 2
                  ? "bg-sky-600 border-sky-500 text-white shadow-xs"
                  : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    : "bg-sky-50 border-sky-200 text-slate-700 hover:bg-sky-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2 Nhân Vật</span>
            </button>

            {/* Custom N count input */}
            <div className={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-xl border ${
              charCount > 2
                ? "border-sky-500 bg-sky-500/10 text-sky-400 font-bold"
                : isDark
                  ? "border-slate-700 bg-slate-800/80 text-slate-300"
                  : "border-sky-200 bg-white text-slate-700"
            }`}>
              <span className="text-xs font-semibold whitespace-nowrap">N-Char:</span>
              <input
                id="input-custom-char-count"
                type="number"
                min={1}
                max={10}
                value={customCountInput}
                onChange={(e) => setCustomCountInput(e.target.value)}
                onBlur={handleApplyCustomCount}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyCustomCount();
                }}
                className={`w-10 text-center text-xs py-0.5 rounded-md border font-bold ${
                  isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-sky-300 text-slate-800"
                }`}
                title="Nhập số lượng nhân vật (1 - 10)"
              />
              <button
                type="button"
                id="btn-apply-custom-count"
                onClick={handleApplyCustomCount}
                className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-semibold hover:bg-sky-500"
              >
                Áp dụng
              </button>
            </div>

            {/* Add extra character button */}
            <button
              type="button"
              id="btn-add-char-quick"
              onClick={handleAddNewChar}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-sky-400" 
                  : "bg-white border-sky-200 hover:bg-sky-50 text-sky-700"
              }`}
              title="Thêm thêm 1 nhân vật mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Thêm</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Quick Generator Box */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark 
          ? "bg-indigo-950/40 border-indigo-700/50 text-slate-100 shadow-sm" 
          : "bg-sky-100/60 border-sky-300/80 text-slate-800 shadow-xs"
      }`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500 text-white">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-1.5">
                <span>AI Sáng Tạo Ý Tưởng Nhanh</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h2>
              <p className={`text-[11px] sm:text-xs ${isDark ? "text-slate-300" : "text-sky-800/80"}`}>
                Chọn thể loại, hình mẫu và để Gemini AI tự động gợi ý toàn bộ 10 phần thông tin cho nhân vật.
              </p>
            </div>
          </div>

          {/* If multi-character, allow choosing which char to generate */}
          {chars.length > 1 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] opacity-80 hidden sm:inline">Áp dụng cho:</span>
              <select
                id="select-ai-target-char"
                value={targetCharIndex}
                onChange={(e) => setTargetCharIndex(parseInt(e.target.value, 10))}
                className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                  isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-sky-300 text-slate-800"
                }`}
              >
                {chars.map((c, i) => (
                  <option key={i} value={i}>
                    Nhân vật {i + 1}: {c.fullName || "(Chưa đặt tên)"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Presets and options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-90">
              1. Thể Loại / Bối Cảnh (Genre):
            </label>
            <select
              id="select-preset-genre"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className={`w-full text-xs sm:text-sm p-2 rounded-xl border outline-hidden transition-colors ${
                isDark 
                  ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-sky-500" 
                  : "bg-white border-sky-200 text-slate-800 focus:border-sky-500"
              }`}
            >
              {GENRE_PRESETS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-90">
              2. Hình Mẫu Tính Cách (Archetype):
            </label>
            <select
              id="select-preset-archetype"
              value={selectedArchetype}
              onChange={(e) => setSelectedArchetype(e.target.value)}
              className={`w-full text-xs sm:text-sm p-2 rounded-xl border outline-hidden transition-colors ${
                isDark 
                  ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-sky-500" 
                  : "bg-white border-sky-200 text-slate-800 focus:border-sky-500"
              }`}
            >
              {ARCHETYPE_PRESETS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom text hint prompt */}
        <div className="mb-3">
          <input
            id="input-ai-quick-prompt"
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder="Gợi ý thêm (ví dụ: 'tên Cố Thần, tổng tài lạnh lùng nhưng rất sủng vợ, có nốt ruồi son dưới mắt')..."
            className={`w-full text-xs sm:text-sm p-2.5 rounded-xl border outline-hidden transition-colors ${
              isDark 
                ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500" 
                : "bg-white border-sky-200 text-slate-800 placeholder-slate-400 focus:border-sky-500"
            }`}
          />
        </div>

        {aiError && (
          <div className="mb-3 text-xs p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500">
            {aiError}
          </div>
        )}

        {/* Generate Trigger Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] opacity-75 hidden sm:block">
            *AI sẽ tự động điền các trường còn trống và phát triển chi tiết các mục.
          </div>
          <button
            id="btn-generate-all-ai"
            type="button"
            disabled={isGeneratingAll}
            onClick={() => handleGenerateAllAI(chars.length > 1 ? targetCharIndex : 0)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-98 disabled:opacity-50 transition-all shadow-xs ml-auto"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang kiến tạo nhân vật...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {chars.length > 1 
                    ? `Tự Động Tạo Cho Nhân Vật ${targetCharIndex + 1}`
                    : "Tự Động Tạo Toàn Bộ Bằng AI"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RENDER LIST OF CHARACTERS (ACCORDION IF >= 2 CHARACTERS) */}
      <div className="space-y-6">
        {chars.map((charItem, charIdx) => {
          const isExpanded = chars.length === 1 || !!expandedCharIndices[charIdx];
          const charTitle = charItem.fullName.trim() || `Nhân vật ${charIdx + 1}`;
          const isMulti = chars.length >= 2;

          return (
            <div
              key={charIdx}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isDark 
                  ? "bg-slate-900/60 border-slate-800 text-slate-100" 
                  : "bg-white/90 border-sky-200 text-slate-800"
              } shadow-xs`}
            >
              {/* ACCORDION HEADER (HIỂN THỊ NỔI BẬT NẾU TỪ 2 NHÂN VẬT TRỞ LÊN) */}
              {isMulti ? (
                <div
                  id={`char-accordion-header-${charIdx}`}
                  onClick={() => toggleCharAccordion(charIdx)}
                  className={`p-3.5 sm:p-4 flex items-center justify-between cursor-pointer border-b transition-colors select-none ${
                    isExpanded
                      ? isDark 
                        ? "bg-slate-800/90 border-slate-700 text-sky-400 font-bold" 
                        : "bg-sky-100/90 border-sky-200 text-sky-900 font-bold"
                      : isDark
                        ? "bg-slate-900/90 border-slate-800/80 hover:bg-slate-800/60 text-slate-200"
                        : "bg-sky-50/70 border-sky-100 hover:bg-sky-100/60 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isExpanded
                        ? "bg-sky-500 text-white shadow-xs"
                        : isDark ? "bg-slate-800 text-slate-300" : "bg-sky-200/80 text-sky-800"
                    }`}>
                      #{charIdx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold truncate">
                          Nhân vật {charIdx + 1}: {charItem.fullName ? charItem.fullName : "(Chưa đặt tên)"}
                        </span>
                        {charItem.occupation && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full hidden sm:inline truncate ${
                            isDark ? "bg-slate-800 text-slate-400" : "bg-sky-100 text-sky-700"
                          }`}>
                            {charItem.occupation}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${isDark ? "text-slate-400" : "text-sky-800/70"}`}>
                        {charItem.gender} • {charItem.age || "Chưa rõ tuổi"} • {charItem.species || "Nhân loại"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Delete button */}
                    <button
                      type="button"
                      id={`btn-remove-char-${charIdx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveChar(charIdx);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Xóa nhân vật này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand icon */}
                    <div className="p-1 rounded-lg">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-sky-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 opacity-60" />
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ACCORDION CONTENT: 10 SUB-SECTIONS OF CHARACTER */}
              {isExpanded && (
                <div className="p-4 sm:p-5 space-y-4">
                  {isMulti && (
                    <div className="flex items-center justify-between pb-2 border-b border-sky-100 dark:border-slate-800 text-xs">
                      <span className="font-semibold text-sky-600 dark:text-sky-400">
                        Chi tiết thông tin Nhân vật #{charIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa toàn bộ nội dung của Nhân vật ${charIdx + 1}?`)) {
                            handleFieldChange(charIdx, "fullName", "");
                            const newList = [...chars];
                            newList[charIdx] = { ...initialCharacterData };
                            updateCharacters(newList);
                          }
                        }}
                        className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Đặt lại nhân vật này</span>
                      </button>
                    </div>
                  )}

                  {/* 10 Standard Sections */}
                  {Object.entries(CHARACTER_FIELDS).map(([sectionKey, sec]) => {
                    const isOpen = openSections[`${charIdx}_${sectionKey}`] ?? ["section1", "section2", "section3", "section4", "section5"].includes(sectionKey);

                    return (
                      <div
                        key={sectionKey}
                        className={`rounded-xl border transition-all ${
                          isDark 
                            ? "bg-slate-900/80 border-slate-800" 
                            : "bg-white border-sky-100"
                        }`}
                      >
                        {/* Section Accordion Title */}
                        <div
                          id={`sub-sec-${charIdx}-${sectionKey}`}
                          onClick={() => toggleSection(charIdx, sectionKey)}
                          className={`p-3 sm:p-3.5 flex items-center justify-between cursor-pointer select-none rounded-xl transition-colors ${
                            isOpen 
                              ? isDark ? "bg-slate-800/60" : "bg-sky-50/80" 
                              : isDark ? "hover:bg-slate-800/40" : "hover:bg-sky-50/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <StarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <h3 className="text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-300">
                              {sec.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 text-xs opacity-60">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Fields inside section */}
                        {isOpen && (
                          <div className="p-3.5 sm:p-4 space-y-4 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sec.fields.map((f) => {
                                const fieldKey = f.key as keyof CharacterData;
                                const currentValue = charItem[fieldKey] || "";
                                const isMultiLine = f.placeholder.includes("\n") || f.options.some(opt => opt.length > 60 || opt.includes("\n")) || ["detailedTraits", "psychologicalArc", "valuesAndFears", "hiddenDetails", "bodyAndFace", "importantEvents", "speakingStyle", "actionHabits", "dynamicWithUser", "intimacyEscalation", "nsfwKinks", "antiOocRules", "skills", "limits", "relatedCharacters"].includes(f.key);
                                const isSuggestingThis = suggestingFieldKey?.charIdx === charIdx && suggestingFieldKey?.key === fieldKey;

                                return (
                                  <div 
                                    key={f.key} 
                                    className={`space-y-1.5 ${isMultiLine ? "md:col-span-2" : ""}`}
                                  >
                                    {/* Field Label & AI Suggest Trigger */}
                                    <div className="flex items-center justify-between gap-1 text-xs">
                                      <label className="font-semibold flex items-center gap-1 opacity-90">
                                        <span>{f.label}</span>
                                      </label>

                                      <button
                                        type="button"
                                        id={`btn-suggest-${charIdx}-${f.key}`}
                                        onClick={() => handleSuggestField(charIdx, f.key, f.label)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                                          isDark 
                                            ? "bg-slate-800 border-indigo-800 text-indigo-300 hover:bg-slate-700" 
                                            : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
                                        }`}
                                        title="Lấy 3 ý tưởng gợi ý nhanh từ Gemini"
                                      >
                                        <Lightbulb className="w-3 h-3 text-amber-400" />
                                        <span>AI Gợi Ý</span>
                                      </button>
                                    </div>

                                    {/* Preset Chip Cloud */}
                                    {f.options && f.options.length > 0 && (
                                      <div className="flex flex-wrap gap-1 py-1 max-h-36 overflow-y-auto">
                                        {f.options.map((chip, idx) => {
                                          const isSelected = currentValue.includes(chip);
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => appendChipValue(charIdx, fieldKey, chip)}
                                              className={`text-[11px] px-2 py-0.5 rounded-md border transition-all text-left max-w-full truncate ${
                                                isSelected
                                                  ? "bg-sky-500 border-sky-400 text-white font-semibold shadow-xs"
                                                  : isDark
                                                    ? "bg-slate-800/80 border-slate-700/80 hover:bg-slate-700 text-slate-300"
                                                    : "bg-sky-50/70 border-sky-200 hover:bg-sky-100/80 text-sky-900"
                                              }`}
                                              title={chip}
                                            >
                                              {isSelected ? <Check className="w-2.5 h-2.5 inline mr-1 shrink-0" /> : "+ "}
                                              {chip.length > 60 ? `${chip.slice(0, 60)}...` : chip}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* AI Live Field Suggestions Dropdown */}
                                    {isSuggestingThis && (
                                      <div className={`p-3 rounded-xl border transition-all ${
                                        isDark ? "bg-slate-900 border-indigo-500/60 shadow-md" : "bg-sky-50 border-sky-300 shadow-sm"
                                      }`}>
                                        <div className="flex items-center justify-between text-[11px] font-bold text-sky-500 mb-2">
                                          <div className="flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                                            <span>Gợi ý thông minh cho "{activeSuggestFieldLabel}":</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSuggestingFieldKey(null);
                                              setFieldSuggestError(null);
                                            }}
                                            className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-800/40 text-xs font-bold"
                                            title="Đóng gợi ý"
                                          >
                                            ✕ Đóng
                                          </button>
                                        </div>

                                        {isSuggestingLoading ? (
                                          <div className="flex items-center gap-2 text-xs py-2 text-sky-400">
                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                            <span>Đang kết nối AI và tạo các phương án phù hợp...</span>
                                          </div>
                                        ) : fieldSuggestError ? (
                                          <div className="space-y-2 py-1">
                                            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg">
                                              <p className="font-semibold">{fieldSuggestError}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => handleSuggestField(charIdx, fieldKey, f.label)}
                                                className="text-xs px-2.5 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-medium flex items-center gap-1"
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                                <span>Thử lại</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSuggestingFieldKey(null);
                                                  setFieldSuggestError(null);
                                                }}
                                                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
                                              >
                                                Đóng
                                              </button>
                                            </div>
                                          </div>
                                        ) : fieldSuggestions.length === 0 ? (
                                          <div className="text-xs text-slate-400 py-1">
                                            Không có gợi ý nào được tạo ra. Bạn có thể chọn các chip nhanh ở phía trên.
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            <p className="text-[10px] opacity-70 mb-1 italic">
                                              Bấm vào một gợi ý bên dưới để chèn nhanh vào nội dung:
                                            </p>
                                            {fieldSuggestions.map((sug, i) => (
                                              <div
                                                key={i}
                                                onClick={() => {
                                                  appendChipValue(charIdx, fieldKey, sug);
                                                  setSuggestingFieldKey(null);
                                                }}
                                                className={`text-xs p-2.5 rounded-lg cursor-pointer border transition-all hover:scale-[1.005] ${
                                                  isDark 
                                                    ? "bg-slate-950/80 border-slate-700/80 hover:border-sky-400 hover:bg-indigo-950/50 text-slate-200" 
                                                    : "bg-white border-sky-200 hover:border-sky-400 hover:bg-sky-50 text-slate-800"
                                                }`}
                                              >
                                                <span className="font-bold text-sky-400 mr-1.5">#{i + 1}</span> {sug}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Free-form Input / Textarea */}
                                    <div>
                                      <div className="flex items-center justify-between text-[11px] opacity-70 mb-1">
                                        <span>Mục khác / Tự nhập nội dung chi tiết:</span>
                                        {currentValue && (
                                          <button
                                            type="button"
                                            onClick={() => handleFieldChange(charIdx, fieldKey, "")}
                                            className="text-red-400 hover:text-red-500 flex items-center gap-0.5"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                            <span>Xóa</span>
                                          </button>
                                        )}
                                      </div>
                                      {isMultiLine ? (
                                        <textarea
                                          id={`input-field-${charIdx}-${f.key}`}
                                          rows={3}
                                          value={currentValue}
                                          onChange={(e) => handleFieldChange(charIdx, fieldKey, e.target.value)}
                                          placeholder={f.placeholder}
                                          className={`w-full text-xs sm:text-sm p-2.5 rounded-lg border outline-hidden ${
                                            isDark 
                                              ? "bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500" 
                                              : "bg-white border-sky-200 text-slate-800 placeholder-slate-400 focus:border-sky-500"
                                          }`}
                                        />
                                      ) : (
                                        <input
                                          id={`input-field-${charIdx}-${f.key}`}
                                          type="text"
                                          value={currentValue}
                                          onChange={(e) => handleFieldChange(charIdx, fieldKey, e.target.value)}
                                          placeholder={f.placeholder}
                                          className={`w-full text-xs sm:text-sm p-2.5 rounded-lg border outline-hidden ${
                                            isDark 
                                              ? "bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500" 
                                              : "bg-white border-sky-200 text-slate-800 placeholder-slate-400 focus:border-sky-500"
                                          }`}
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDark 
          ? "bg-slate-900/95 border-slate-800 text-slate-100" 
          : "bg-sky-50/90 border-sky-200 text-slate-800"
      } shadow-md sticky bottom-3 z-20`}>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <CloudIcon className="w-5 h-5 text-sky-400" />
          <span>
            {chars.length === 1 ? (
              <>Đã điền tên: <strong>{chars[0].fullName || "(Chưa đặt)"}</strong></>
            ) : (
              <>Đang quản lý: <strong>{chars.length} nhân vật</strong></>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="btn-save-draft-bottom"
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
            id="btn-finish-character-card"
            onClick={onFinishCard}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-98 shadow-sm transition-all"
          >
            <span>Chốt & Xem Thẻ Nhân Vật</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
