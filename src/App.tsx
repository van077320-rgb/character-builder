import React, { useState, useEffect } from "react";
import { 
  CharacterData, 
  TemplateData, 
  SavedHistoryItem, 
  ActiveTab,
  DEFAULT_CHARACTER_DATA,
  DEFAULT_TEMPLATE_DATA
} from "./types";
import { Header } from "./components/Header";
import { CharacterBuilder } from "./components/CharacterBuilder";
import { CharacterCardPreview } from "./components/CharacterCardPreview";
import { TemplateBuilder } from "./components/TemplateBuilder";
import { FullTemplatePreview } from "./components/FullTemplatePreview";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { HeroGateway } from "./components/HeroGateway";
import { Guestbook } from "./components/Guestbook";
import { VisitorCounter } from "./components/VisitorCounter";
import { GoogleDriveModal } from "./components/GoogleDriveModal";
import { SystemCommandsModal } from "./components/SystemCommandsModal";
import { ApiRotationModal } from "./components/ApiRotationModal";
import { FourPointStar, CloudIcon } from "./components/CloudStarDecorations";
import { Check, AlertTriangle } from "lucide-react";
import { auth, User } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { subscribeVisitorCount } from "./visitorService";
import { mergeHistoryItems } from "./data/backupFormat";
import {
  draftSignature,
  hasUnsavedDraft,
  isPristineDraft,
  isLegacyDemoCharacter,
  migrateLegacyDemoCharacter,
  migrateLegacyDemoList,
} from "./data/draftState";
import { UnsavedDraftModal } from "./components/UnsavedDraftModal";
import { readJson, getStorageIssues, STORAGE_LABELS } from "./data/safeStorage";

export function App() {
  // Theme state: default to pastel blue light theme as requested, with dark mode toggle
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("htn_theme");
    return saved === "dark";
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");

  // Firebase Real Auth User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Dữ liệu hỏng được cất sang ô backup và báo lên UI, thay vì mất im lặng
  // rồi bị useEffect ghi đè mất luôn bản gốc (xem src/data/safeStorage.ts).
  const isObject = (v: any) => !!v && typeof v === "object" && !Array.isArray(v);

  // Character Data State
  const [characterData, setCharacterData] = useState<CharacterData>(() => {
    const saved = readJson<CharacterData | null>("htn_current_character", null, isObject);
    // Dọn nhân vật demo cũ còn sót lại từ phiên bản trước (chỉ khi chưa ai sửa)
    return saved ? migrateLegacyDemoCharacter(saved) : DEFAULT_CHARACTER_DATA;
  });

  // Multiple Characters List State
  const [charactersList, setCharactersList] = useState<CharacterData[]>(() => {
    const list = readJson<CharacterData[] | null>("htn_characters_list", null, (v) =>
      Array.isArray(v) && v.every(isObject)
    );
    if (list && list.length > 0) return migrateLegacyDemoList(list);

    const single = readJson<CharacterData | null>("htn_current_character", null, isObject);
    if (single) return migrateLegacyDemoList([single]);

    return [DEFAULT_CHARACTER_DATA];
  });

  // Template Data State
  const [templateData, setTemplateData] = useState<TemplateData>(() => {
    const saved = readJson<TemplateData | null>("htn_current_template", null, isObject);
    if (!saved) return DEFAULT_TEMPLATE_DATA;
    // Template demo đi kèm nhân vật demo -> dọn cùng lúc
    const savedChar = readJson<CharacterData | null>("htn_current_character", null, isObject);
    return savedChar && isLegacyDemoCharacter(savedChar) ? DEFAULT_TEMPLATE_DATA : saved;
  });

  // History State
  const [historyItems, setHistoryItems] = useState<SavedHistoryItem[]>(() =>
    readJson<SavedHistoryItem[]>("htn_history_items", [], Array.isArray)
  );

  // Sự cố đọc dữ liệu lúc khởi động (nếu có) — chỉ tính một lần khi mount
  const [storageIssues] = useState(() => getStorageIssues());

  // Chữ ký của bản nháp đã được lưu vào Lịch sử gần nhất.
  // Dùng để biết bản đang dựng có nội dung chưa lưu hay không, tránh hỏi thừa
  // khi người dùng vừa bấm lưu xong hoặc chưa gõ gì.
  const [lastSavedSignature, setLastSavedSignature] = useState<string>(() => {
    return localStorage.getItem("htn_last_saved_signature") || "";
  });

  // Hành động đang chờ người dùng quyết định vì sẽ ghi đè bản nháp
  const [pendingAction, setPendingAction] = useState<
    { kind: "new" } | { kind: "load"; item: SavedHistoryItem } | null
  >(null);

  // Modals state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isCommandsModalOpen, setIsCommandsModalOpen] = useState(false);
  const [isApiRotationModalOpen, setIsApiRotationModalOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("htn_theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem("htn_current_character", JSON.stringify(characterData));
  }, [characterData]);

  useEffect(() => {
    localStorage.setItem("htn_characters_list", JSON.stringify(charactersList));
  }, [charactersList]);

  useEffect(() => {
    localStorage.setItem("htn_current_template", JSON.stringify(templateData));
  }, [templateData]);

  useEffect(() => {
    localStorage.setItem("htn_history_items", JSON.stringify(historyItems));
  }, [historyItems]);

  useEffect(() => {
    localStorage.setItem("htn_last_saved_signature", lastSavedSignature);
  }, [lastSavedSignature]);

  const currentSignature = draftSignature(charactersList, templateData);

  // Có nội dung sẽ mất nếu ghi đè bây giờ hay không (xem src/data/draftState.ts)
  const draftIsUnsaved = hasUnsavedDraft(charactersList, templateData, lastSavedSignature);

  // Save to History Handler
  const handleSaveToHistory = (type: "character_only" | "full_template", customText?: string) => {
    const mainChar = charactersList[0] || characterData;
    const isMulti = charactersList.length > 1;
    const title = isMulti 
      ? `Nhóm ${charactersList.length} nhân vật (${charactersList.map(c => c.fullName || "Ẩn danh").join(", ")})`
      : mainChar.fullName || (type === "full_template" ? "Template Chưa Đặt Tên" : "Thẻ Char Chưa Đặt Tên");

    const newItem: SavedHistoryItem = {
      id: "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      type,
      title,
      characterName: mainChar.fullName || "Nhân vật ẩn danh",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      characterData: { ...mainChar },
      charactersList: [...charactersList],
      templateData: type === "full_template" ? { ...templateData } : undefined,
      customCardText: type === "character_only" ? customText : undefined,
      customFullTemplateText: type === "full_template" ? customText : undefined,
    };

    setHistoryItems((prev) => [newItem, ...prev]);
    // Đánh dấu bản nháp hiện tại đã nằm trong Lịch sử -> không hỏi lại nữa
    setLastSavedSignature(currentSignature);
    showToast(`Đã lưu "${newItem.title}" vào Lịch sử thành công!`);
  };

  const applyHistoryItem = (item: SavedHistoryItem) => {
    if (item.charactersList && item.charactersList.length > 0) {
      setCharactersList(item.charactersList);
      setCharacterData(item.charactersList[0]);
    } else {
      setCharacterData(item.characterData);
      setCharactersList([item.characterData]);
    }

    if (item.templateData) {
      setTemplateData(item.templateData);
      setActiveTab("full_preview");
    } else {
      setActiveTab("card_preview");
    }

    // Bản vừa tải đã nằm sẵn trong Lịch sử -> chưa có gì để mất
    const loadedChars =
      item.charactersList && item.charactersList.length > 0
        ? item.charactersList
        : [item.characterData];
    setLastSavedSignature(draftSignature(loadedChars, item.templateData ?? templateData));

    showToast(`Đã tải dữ liệu "${item.characterName}" vào phòng làm việc.`);
  };

  /**
   * Tải một bản ghi lịch sử. Nếu bản nháp đang dựng chưa được lưu thì hỏi trước,
   * vì thao tác này ghi đè thẳng lên nội dung đang gõ.
   */
  const handleLoadHistoryItem = (item: SavedHistoryItem) => {
    if (draftIsUnsaved) {
      setPendingAction({ kind: "load", item });
      return;
    }
    applyHistoryItem(item);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    showToast("Đã xóa bản ghi khỏi lịch sử.");
  };

  const handleClearAllHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử đã lưu?")) {
      setHistoryItems([]);
      showToast("Đã dọn sạch toàn bộ lịch sử.");
    }
  };

  const handleImportBackup = (items: SavedHistoryItem[], mode: "merge" | "replace") => {
    if (mode === "replace") {
      setHistoryItems(items);
      showToast(`Đã thay thế thư viện bằng ${items.length} bản ghi từ file sao lưu.`);
      return;
    }

    // Gộp: không bản ghi nào của người dùng bị mất
    const { merged, added, updated } = mergeHistoryItems(historyItems, items);
    setHistoryItems(merged);
    showToast(
      `Đã gộp bản sao lưu: thêm mới ${added}, cập nhật ${updated}, giữ nguyên ${
        merged.length - added - updated
      } bản ghi cũ.`
    );
  };

  const applyStartNewCharacter = () => {
    setCharacterData(DEFAULT_CHARACTER_DATA);
    setCharactersList([DEFAULT_CHARACTER_DATA]);
    setTemplateData(DEFAULT_TEMPLATE_DATA);
    setActiveTab("builder");
    setLastSavedSignature("");
    showToast("Đã khởi tạo không gian sáng tạo nhân vật mới.");
  };

  /**
   * Tạo nhân vật mới. Nếu bản nháp chưa được lưu thì hỏi trước.
   *
   * Confirm cũ nói "Dữ liệu hiện tại đã được lưu nháp" là sai: bản nháp chưa hề
   * vào Lịch sử, và ô nháp trong localStorage bị ghi đè ngay dòng sau.
   */
  const handleStartNewCharacter = () => {
    if (draftIsUnsaved) {
      setPendingAction({ kind: "new" });
      return;
    }
    applyStartNewCharacter();
  };

  /** Loại bản ghi khi lưu nhanh từ hộp thoại cảnh báo. */
  const draftSaveType = (): "character_only" | "full_template" => {
    const tpl = JSON.stringify(templateData);
    return tpl === JSON.stringify(DEFAULT_TEMPLATE_DATA) ? "character_only" : "full_template";
  };

  const resolvePendingAction = (choice: "save" | "discard") => {
    const action = pendingAction;
    if (!action) return;
    setPendingAction(null);

    if (choice === "save") {
      handleSaveToHistory(draftSaveType());
    }

    if (action.kind === "new") applyStartNewCharacter();
    else applyHistoryItem(action.item);
  };

  const pendingDraftName =
    charactersList[0]?.fullName?.trim() || characterData.fullName?.trim() || "Nhân vật chưa đặt tên";

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      isDark 
        ? "bg-slate-950 text-slate-100 selection:bg-sky-600 selection:text-white" 
        : "bg-[#f0f7fc] text-slate-800 selection:bg-sky-200 selection:text-slate-900"
    }`}>
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenGoogleDrive={() => setIsGoogleModalOpen(true)}
        onOpenCommandsModal={() => setIsCommandsModalOpen(true)}
        onOpenApiRotationModal={() => setIsApiRotationModalOpen(true)}
        currentUser={currentUser}
        historyCount={historyItems.length}
      />

      {/* Cảnh báo dữ liệu đã lưu bị hỏng — nói rõ mất cái gì và bản gốc nằm đâu,
          thay vì để người dùng mở app thấy trắng trơn mà không hiểu vì sao */}
      {storageIssues.length > 0 && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4">
          <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Không đọc được một phần dữ liệu đã lưu</p>
              {storageIssues.map((issue) => (
                <p key={issue.key} className="opacity-90">
                  • <b>{STORAGE_LABELS[issue.key] || issue.key}</b>: {issue.message}
                  {issue.backupKey && (
                    <>
                      {" "}Bản gốc vẫn được giữ trong bộ nhớ trình duyệt ở khoá{" "}
                      <code className="font-mono">{issue.backupKey}</code>.
                    </>
                  )}
                </p>
              ))}
              <p className="opacity-75">
                Phần này đã được khởi tạo lại về trống. Nếu bạn có bản sao lưu JSON hoặc file backup
                trên Google Drive, hãy dùng "Khôi phục" trong tab Lịch sử để lấy lại.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main workspace view */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        {activeTab === "home" && (
          <HeroGateway
            onStartNewCharacter={handleStartNewCharacter}
            onContinueCurrentDraft={() => setActiveTab("builder")}
            currentDraftName={characterData.fullName || "Nhân vật ẩn danh"}
            hasActiveDraft={!isPristineDraft(charactersList, templateData)}
            historyItems={historyItems}
            onLoadHistoryItem={handleLoadHistoryItem}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onNavigateToHistory={() => setActiveTab("history")}
            onNavigateToTab={setActiveTab}
            isDark={isDark}
          />
        )}

        {activeTab === "builder" && (
          <CharacterBuilder
            characterData={characterData}
            setCharacterData={setCharacterData}
            charactersList={charactersList}
            setCharactersList={setCharactersList}
            onFinishCard={() => setActiveTab("card_preview")}
            onSaveDraft={() => handleSaveToHistory("character_only")}
            isDark={isDark}
          />
        )}

        {activeTab === "card_preview" && (
          <CharacterCardPreview
            characterData={characterData}
            charactersList={charactersList}
            setCharacterData={setCharacterData}
            onGoBackToBuilder={() => setActiveTab("builder")}
            onProceedToTemplate={() => setActiveTab("template_builder")}
            onSaveToHistory={handleSaveToHistory}
            isDark={isDark}
          />
        )}

        {activeTab === "template_builder" && (
          <TemplateBuilder
            characterData={characterData}
            charactersList={charactersList}
            templateData={templateData}
            setTemplateData={setTemplateData}
            onGoBackToCard={() => setActiveTab("card_preview")}
            onProceedToFullPreview={() => setActiveTab("full_preview")}
            onSaveDraft={() => handleSaveToHistory("full_template")}
            isDark={isDark}
          />
        )}

        {activeTab === "full_preview" && (
          <FullTemplatePreview
            characterData={characterData}
            charactersList={charactersList}
            templateData={templateData}
            onGoBackToTemplateBuilder={() => setActiveTab("template_builder")}
            onSaveToHistory={handleSaveToHistory}
            onOpenGoogleDrive={() => setIsGoogleModalOpen(true)}
            isLoggedIn={!!currentUser}
            isDark={isDark}
          />
        )}

        {activeTab === "guestbook" && (
          <Guestbook
            isDark={isDark}
            currentUser={currentUser}
            onToast={showToast}
          />
        )}

        {activeTab === "history" && (
          <HistoryDrawer
            historyItems={historyItems}
            onLoadItem={handleLoadHistoryItem}
            onDeleteItem={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
            onImportBackup={handleImportBackup}
            onStartNewCharacter={handleStartNewCharacter}
            isDark={isDark}
          />
        )}
      </main>

      {/* Google Auth & Cloud Sync Modal */}
      <GoogleDriveModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        characterData={characterData}
        charactersList={charactersList}
        templateData={templateData}
        historyItems={historyItems}
        currentUser={currentUser}
        isDark={isDark}
        onToast={showToast}
      />

      {/* System Override Commands Cheat Sheet Modal */}
      <SystemCommandsModal
        isOpen={isCommandsModalOpen}
        onClose={() => setIsCommandsModalOpen(false)}
        isDark={isDark}
      />

      {/* Cảnh báo trước khi ghi đè bản nháp chưa lưu */}
      <UnsavedDraftModal
        isOpen={!!pendingAction}
        draftName={pendingDraftName}
        draftCharCount={charactersList.length}
        actionLabel={
          pendingAction?.kind === "load"
            ? `tải bản ghi "${pendingAction.item.characterName}"`
            : "tạo nhân vật mới"
        }
        onSaveAndContinue={() => resolvePendingAction("save")}
        onDiscardAndContinue={() => resolvePendingAction("discard")}
        onCancel={() => setPendingAction(null)}
        isDark={isDark}
      />

      {/* API Key Pool & Fallback Monitor Modal */}
      <ApiRotationModal
        isOpen={isApiRotationModalOpen}
        onClose={() => setIsApiRotationModalOpen(false)}
        isDark={isDark}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold bg-sky-900 text-white border-sky-700 backdrop-blur-md">
          <Check className="w-4 h-4 text-sky-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-xs transition-colors ${
        isDark 
          ? "bg-slate-900/80 border-slate-800/80 text-slate-400" 
          : "bg-sky-50/90 border-sky-200/80 text-sky-800/80"
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <CloudIcon className="w-4 h-4 text-sky-400" />
            <span>Character Card & System Prompt Builder</span>
            <span>•</span>
            {/* rel="noreferrer" đi kèm target="_blank": thiếu nó thì trang Facebook
                mở ra có thể điều khiển ngược tab gốc qua window.opener */}
            <a
              href="https://www.facebook.com/profile.php?id=61589115178118"
              target="_blank"
              rel="noopener noreferrer"
              title="Ghé thăm Facebook Hành tinh nhỏ của Cá Mèo"
              className="font-semibold underline decoration-dotted underline-offset-2 hover:text-sky-500 transition-colors"
            >
              © Hành tinh nhỏ của Cá Mèo
            </a>
          </div>

          <VisitorCounter isDark={isDark} />

          <div className="flex items-center gap-2">
            <FourPointStar className="w-3 h-3 text-amber-400" />
            <span>Hỗ trợ định dạng Text chuẩn & Xuất file TXT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
