import React, { useState, useEffect } from "react";
import { 
  Check, 
  X, 
  UploadCloud, 
  FileText, 
  Layers, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  LogOut,
  Sparkles,
  UserCheck,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  Copy,
  Info
} from "lucide-react";
import { CharacterData, TemplateData, SavedHistoryItem } from "../types";
import {
  User,
  loginWithGoogle,
  reauthorizeDrive,
  logoutGoogle,
  getCachedAccessToken,
  needsDriveAuthorization,
  getTokenMinutesLeft,
  DriveAuthError,
  FIREBASE_AUTH_SETTINGS_URL,
} from "../firebase";
import {
  saveFileToGoogleDrive,
  listAppDriveFiles,
  DriveApiError,
  DriveFileItem,
} from "../driveService";
import { buildCharacterCardText, buildFullTemplateText } from "../data/templateConstants";
import { buildBackupPayload } from "../data/backupFormat";

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterData: CharacterData;
  /** Toàn bộ nhân vật đang dựng. Thiếu prop này thì lưu Drive chỉ ra nhân vật #1. */
  charactersList?: CharacterData[];
  templateData: TemplateData;
  historyItems: SavedHistoryItem[];
  currentUser: User | null;
  isDark: boolean;
  onToast: (msg: string) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  characterData,
  charactersList,
  templateData,
  historyItems,
  currentUser,
  isDark,
  onToast,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Link "bấm vào đây để sửa" kèm theo lỗi, ví dụ trang bật Drive API. */
  const [errorActionUrl, setErrorActionUrl] = useState<string | null>(null);
  /** Lỗi này sửa được bằng cách cấp lại quyền -> hiện nút cấp lại. */
  const [errorNeedsReauth, setErrorNeedsReauth] = useState(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [activeDriveTab, setActiveDriveTab] = useState<"save" | "files">("save");
  const [folderLink, setFolderLink] = useState<string | null>(null);

  // Danh sách nhân vật thực sự sẽ được ghi ra file
  const charsToSave: CharacterData[] =
    charactersList && charactersList.length > 0 ? charactersList : [characterData];
  const charCount = charsToSave.length;

  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
  // Lấy từ firebase-applet-config.json, không hard-code (xem src/firebase.ts)
  const consoleAuthUrl = FIREBASE_AUTH_SETTINGS_URL;

  /**
   * Đã đăng nhập Google nhưng chưa có quyền Drive dùng được.
   * Xảy ra sau khi tải lại trang (token chỉ giữ trong RAM) hoặc sau 1 tiếng.
   */
  const [needsAuth, setNeedsAuth] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  const refreshDriveState = () => {
    setNeedsAuth(needsDriveAuthorization());
    setMinutesLeft(getTokenMinutesLeft());
  };

  const clearError = () => {
    setErrorMsg(null);
    setErrorActionUrl(null);
    setErrorNeedsReauth(false);
    setIsUnauthorizedDomain(false);
  };

  /**
   * Hiện lỗi kèm đúng việc cần làm, thay vì dump nguyên văn Google trả về.
   * Nguyên nhân gốc vẫn được log ra console để debug.
   */
  const reportError = (err: any) => {
    console.error("Google Drive error:", err);

    if (err instanceof DriveApiError) {
      setErrorMsg(err.message);
      setErrorActionUrl(err.actionUrl ?? null);
      setErrorNeedsReauth(err.kind === "token-expired" || err.kind === "scope-insufficient");
      if (err.kind === "token-expired") refreshDriveState();
      return;
    }

    if (err instanceof DriveAuthError) {
      setErrorMsg(err.message);
      setErrorActionUrl(null);
      setErrorNeedsReauth(true);
      return;
    }

    if (err?.code === "auth/unauthorized-domain") {
      setIsUnauthorizedDomain(true);
      setErrorMsg("Domain hiện tại chưa được cấp phép trong Firebase Auth (Unauthorized Domain).");
      return;
    }
    if (err?.code === "auth/popup-closed-by-user") {
      setErrorMsg("Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.");
      return;
    }
    if (err?.code === "auth/cancelled-popup-request") {
      setErrorMsg("Yêu cầu đăng nhập đã bị hủy.");
      return;
    }
    if (err?.code === "auth/popup-blocked") {
      setErrorMsg("Trình duyệt đã chặn cửa sổ pop-up. Hãy cho phép pop-up cho trang này rồi thử lại.");
      return;
    }

    setErrorMsg(err?.message || "Không thể kết nối với Google Drive.");
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshDriveState();
    if (currentUser && getCachedAccessToken()) {
      loadDriveFileList();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    if (navigator.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2500);
      onToast(`Đã sao chép domain: ${currentHostname}`);
    }
  };

  const loadDriveFileList = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      refreshDriveState();
      return;
    }
    setIsLoadingFiles(true);
    try {
      const { folderId, files } = await listAppDriveFiles(token);
      setDriveFiles(files);
      setFolderLink(`https://drive.google.com/drive/folders/${folderId}`);
    } catch (err: any) {
      // Trước đây chỉ console.warn -> 403 bị nuốt, UI hiện "Chưa có file nào",
      // người dùng tưởng thư mục rỗng trong khi thật ra là thiếu quyền.
      setDriveFiles([]);
      reportError(err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  /**
   * @param forceConsent bấm "Cấp lại quyền"/"Thử lại" -> buộc Google hiện lại
   *   màn hình tích quyền. Không có cờ này thì Google nhớ lựa chọn từ chối cũ và
   *   bấm bao nhiêu lần cũng không hiện gì.
   */
  const handleSignInGoogle = async (forceConsent = false) => {
    setIsLoggingIn(true);
    clearError();

    try {
      const { user, minutesLeft: mins } = forceConsent
        ? await reauthorizeDrive()
        : await loginWithGoogle();

      refreshDriveState();
      onToast(
        `Đã cấp quyền Google Drive cho ${user.displayName || user.email} (còn ${mins} phút).`
      );
      await loadDriveFileList();
    } catch (err: any) {
      reportError(err);
      refreshDriveState();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await logoutGoogle();
      setDriveFiles([]);
      setFolderLink(null);
      clearError();
      refreshDriveState();
      onToast("Đã đăng xuất tài khoản Google.");
    } catch (err: any) {
      // Đăng xuất hỏng mà im lặng thì người dùng tưởng đã thoát, trong khi phiên vẫn còn
      reportError(err);
    }
  };

  const handleSaveToDrive = async (type: "card" | "full" | "backup_all") => {
    const token = getCachedAccessToken();
    if (!token || !currentUser) {
      // Không còn bỏ mặc người dùng ở ngõ cụt: nói rõ vì sao và hiện nút cấp lại
      refreshDriveState();
      setErrorMsg(
        currentUser
          ? "Phiên truy cập Drive đã hết (token không được lưu qua lần tải trang, và chỉ sống 1 tiếng). Bấm cấp lại quyền để tiếp tục."
          : "Vui lòng đăng nhập Google trước để cấp quyền lưu file vào Drive."
      );
      setErrorNeedsReauth(!!currentUser);
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);
    clearError();

    try {
      // Lưu TOÀN BỘ nhân vật đang dựng, không chỉ nhân vật #1
      const charName = characterData.fullName?.trim() || "NhanVat";
      const cleanCharName = charName.replace(/[/\\?%*:|"<>]/g, "_");
      const multiSuffix = charCount > 1 ? `_va_${charCount - 1}_nhan_vat` : "";

      if (type === "card") {
        const textContent = buildCharacterCardText(charsToSave);
        const fileName = `[Card]_${cleanCharName}${multiSuffix}.txt`;
        await saveFileToGoogleDrive({
          token,
          fileName,
          content: textContent,
          description: `Thẻ Character: ${charName}${charCount > 1 ? ` (+${charCount - 1} nhân vật)` : ""} (.txt)`,
        });
        setSaveSuccessMsg(
          `Đã tạo/cập nhật file "${fileName}" (${charCount} nhân vật) vào thư mục Google Drive!`
        );
      } else if (type === "full") {
        const fullContent = buildFullTemplateText(charsToSave, templateData);
        const fileName = `[Full_Prompt]_${cleanCharName}${multiSuffix}.txt`;
        await saveFileToGoogleDrive({
          token,
          fileName,
          content: fullContent,
          description: `Full Master System Prompt: ${charName}${charCount > 1 ? ` (+${charCount - 1} nhân vật)` : ""} (.txt)`,
        });
        setSaveSuccessMsg(
          `Đã tạo/cập nhật file "${fileName}" (${charCount} nhân vật) vào thư mục Google Drive!`
        );
      } else {
        const backupData = buildBackupPayload({
          historyItems,
          characterData,
          charactersList: charsToSave,
          templateData,
        });
        const fileName = `Backup_ThuVien_${new Date().toISOString().slice(0, 10)}.json`;
        await saveFileToGoogleDrive({
          token,
          fileName,
          content: JSON.stringify(backupData, null, 2),
          mimeType: "application/json;charset=utf-8",
          description: `Bản sao lưu toàn bộ thư viện ${historyItems.length} mục`,
        });
        setSaveSuccessMsg(`Đã lưu file sao lưu "${fileName}" vào Google Drive!`);
      }
      
      onToast("Lưu vào Google Drive thành công!");
      refreshDriveState();
      await loadDriveFileList();
    } catch (err: any) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className={`w-full max-w-lg my-auto rounded-2xl border shadow-2xl overflow-hidden ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-sky-200 text-slate-800"
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? "bg-slate-800/80 border-slate-800" : "bg-sky-50 border-sky-100"
        }`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Đồng Bộ & Lưu File Google Drive</h3>
              <p className="text-[11px] opacity-70">Lưu file .txt và backup trực tiếp vào Google Drive của bạn</p>
            </div>
          </div>
          <button
            id="btn-close-drive-modal"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm max-h-[78vh] overflow-y-auto">
          {errorMsg && !isUnauthorizedDomain && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>

              {(errorActionUrl || errorNeedsReauth) && (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                  {errorActionUrl && (
                    <a
                      href={errorActionUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                    >
                      <span>Mở trang bật Google Drive API</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {errorNeedsReauth && (
                    <button
                      id="btn-drive-reauth-from-error"
                      onClick={() => handleSignInGoogle(true)}
                      disabled={isLoggingIn}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Cấp lại quyền Drive</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Unauthorized domain warning helper */}
          {isUnauthorizedDomain && (
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? "bg-amber-950/40 border-amber-800/70 text-amber-200" : "bg-amber-50 border-amber-300 text-amber-900"
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                    Cần thêm Domain vào Firebase Console (Chỉ mất 30s)
                  </h4>
                  <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                    Google yêu cầu thêm tên miền website vào danh sách <b>Authorized Domains</b> để bảo vệ chống giả mạo trước khi cho phép đăng nhập và truy cập Drive.
                  </p>
                </div>
              </div>

              {/* Step 1: Copy Domain */}
              <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                isDark ? "bg-slate-900/80 border-slate-700" : "bg-white border-amber-200"
              }`}>
                <div className="truncate">
                  <span className="text-[10px] opacity-70 block">Tên miền của bạn:</span>
                  <code className="text-xs font-mono font-bold text-sky-500 truncate block">{currentHostname}</code>
                </div>
                <button
                  onClick={handleCopyDomain}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                >
                  {domainCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Domain</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step 2: Instruction steps */}
              <div className="text-[11px] space-y-1.5 pl-1">
                <p className="font-semibold">Các bước kích hoạt:</p>
                <ol className="list-decimal list-inside space-y-1 opacity-90">
                  <li>Mở <b>Firebase Console → Authentication → Settings</b></li>
                  <li>Kéo xuống mục <b>Authorized domains</b> → Bấm <b>Add domain</b></li>
                  <li>Dán domain vừa copy (hoặc domain Netlify) rồi bấm <b>Add</b></li>
                </ol>
              </div>

              <a
                href={consoleAuthUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-xs"
              >
                <span>Mở Cài Đặt Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {!currentUser ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${
                isDark ? "bg-slate-800/50 border-slate-700" : "bg-sky-50/60 border-sky-200"
              }`}>
                <div className="flex items-center gap-2 mb-2 font-semibold text-sky-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Đăng Nhập Tài Khoản Google Thật</span>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">
                  Đăng nhập bằng tài khoản Google thật của bạn. Hệ thống sẽ tự động tạo thư mục <b>"Hành Tinh Nhỏ - Character & Prompts"</b> trên Google Drive của bạn để lưu trữ các file text thẻ nhân vật và các bản sao lưu an toàn.
                </p>
              </div>

              <button
                id="btn-signin-google-drive"
                onClick={() => handleSignInGoogle()}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kết nối Google Drive...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                      />
                    </svg>
                    <span>Đăng nhập & Kết nối Google Drive</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account connected banner */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                needsAuth
                  ? isDark ? "bg-amber-950/40 border-amber-800/80" : "bg-amber-50 border-amber-200"
                  : isDark ? "bg-emerald-950/40 border-emerald-800/80" : "bg-emerald-50 border-emerald-200"
              }`}>
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full border border-emerald-400"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className={`font-bold text-xs ${
                        needsAuth ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {currentUser.displayName || "Người dùng Google"}
                      </p>
                      {needsAuth ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-[11px] opacity-75 font-mono">{currentUser.email}</p>
                    {/* Đăng nhập Firebase KHÁC với có quyền Drive dùng được.
                        Trước đây luôn hiện "Đã kết nối" nên sau khi F5 người dùng
                        thấy đã kết nối mà bấm lưu lại báo chưa đăng nhập. */}
                    {needsAuth ? (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        Chưa có quyền Drive trong phiên này
                      </p>
                    ) : (
                      <p className="text-[10px] text-sky-500 font-semibold mt-0.5">
                        Đã kết nối Google Drive
                        {minutesLeft !== null && ` · còn ${minutesLeft} phút`}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  id="btn-signout-google"
                  onClick={handleSignOutGoogle}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/20"
                  title="Đăng xuất tài khoản này"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>

              {/* Đã đăng nhập nhưng chưa có quyền Drive dùng được -> mời cấp lại
                  ngay tại chỗ, thay vì để người dùng bấm lưu rồi mới báo lỗi */}
              {needsAuth && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? "bg-amber-950/30 border-amber-800/70" : "bg-amber-50 border-amber-300"
                }`}>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                        Cần cấp lại quyền Google Drive
                      </h4>
                      <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                        Vì lý do bảo mật, quyền truy cập Drive chỉ được giữ trong bộ nhớ tạm và không
                        lưu qua lần tải trang; Google cũng chỉ cấp trong 1 tiếng. Tài khoản của bạn vẫn
                        đăng nhập bình thường, chỉ cần cấp lại quyền là lưu file được ngay.
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-drive-reauthorize"
                    onClick={() => handleSignInGoogle(true)}
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang mở cửa sổ cấp quyền...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Cấp lại quyền Google Drive</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] opacity-70 leading-relaxed">
                    Ở màn hình của Google, nhớ <b>tích vào ô cho phép truy cập Google Drive</b> — nếu bỏ
                    trống, app vẫn đăng nhập được nhưng không tạo hay lưu file được.
                  </p>
                </div>
              )}

              {/* Sub-tabs: Save to Drive vs View Drive Files */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveDriveTab("save")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeDriveTab === "save"
                      ? "bg-sky-600 text-white"
                      : "opacity-70 hover:opacity-100 hover:bg-slate-500/10"
                  }`}
                >
                  Lưu Vào Google Drive
                </button>
                <button
                  onClick={() => {
                    setActiveDriveTab("files");
                    loadDriveFileList();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeDriveTab === "files"
                      ? "bg-sky-600 text-white"
                      : "opacity-70 hover:opacity-100 hover:bg-slate-500/10"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Thư Mục Drive ({driveFiles.length})</span>
                </button>
              </div>

              {activeDriveTab === "save" ? (
                <div className="space-y-3">
                  <p className="font-semibold text-xs opacity-90 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Chọn nội dung cần lưu thành File trong Google Drive:</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      id="btn-drive-save-card"
                      onClick={() => handleSaveToDrive("card")}
                      disabled={isSaving || needsAuth}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                        isDark 
                          ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800" 
                          : "bg-sky-50/60 border-sky-200 hover:bg-sky-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>Lưu Thẻ Character (.txt)</span>
                        {charCount > 1 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-500">
                            {charCount} nhân vật
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] opacity-70 mt-1 line-clamp-1">
                        [Card]_{characterData.fullName || "NhanVat"}
                        {charCount > 1 ? `_va_${charCount - 1}_nhan_vat` : ""}.txt
                      </span>
                    </button>

                    <button
                      id="btn-drive-save-prompt"
                      onClick={() => handleSaveToDrive("full")}
                      disabled={isSaving || needsAuth}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                        isDark 
                          ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800" 
                          : "bg-sky-50/60 border-sky-200 hover:bg-sky-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span>Lưu Full Prompt (.txt)</span>
                        {charCount > 1 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-500">
                            {charCount} nhân vật
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] opacity-70 mt-1 line-clamp-1">
                        [Full_Prompt]_{characterData.fullName || "NhanVat"}
                        {charCount > 1 ? `_va_${charCount - 1}_nhan_vat` : ""}.txt
                      </span>
                    </button>

                    <button
                      id="btn-drive-save-backup"
                      onClick={() => handleSaveToDrive("backup_all")}
                      disabled={isSaving || needsAuth}
                      className={`sm:col-span-2 p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isDark 
                          ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800" 
                          : "bg-sky-50/60 border-sky-200 hover:bg-sky-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <UploadCloud className="w-4 h-4 text-sky-400" />
                        <div>
                          <span>Sao Lưu Thư Viện ({historyItems.length} mục)</span>
                          <p className="text-[11px] font-normal opacity-70">Lưu file backup .json vào folder Drive</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-sky-500">Lưu ngay →</span>
                    </button>
                  </div>

                  {folderLink && (
                    <div className="pt-1">
                      <a
                        href={folderLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-400 font-semibold underline underline-offset-2"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Mở thư mục "Hành Tinh Nhỏ - Character & Prompts" trên Google Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                /* Files List View */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold opacity-80">
                      Tệp tin trong thư mục Drive ({driveFiles.length}):
                    </span>
                    <button
                      onClick={loadDriveFileList}
                      disabled={isLoadingFiles}
                      className="p-1 rounded-md hover:bg-slate-500/10 text-sky-500 flex items-center gap-1 text-[11px]"
                      title="Làm mới danh sách"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? "animate-spin" : ""}`} />
                      <span>Làm mới</span>
                    </button>
                  </div>

                  {isLoadingFiles ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs opacity-70">
                      <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                      <span>Đang quét tệp trên Google Drive...</span>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className={`p-6 text-center rounded-xl border text-xs opacity-70 ${
                      isDark ? "bg-slate-800/40 border-slate-800" : "bg-sky-50/40 border-sky-100"
                    }`}>
                      <p>Chưa có file nào trong thư mục Google Drive của bạn.</p>
                      <p className="text-[11px] mt-1">Hãy chuyển sang tab "Lưu Vào Google Drive" để lưu thẻ nhân vật đầu tiên!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-sky-100 shadow-xs"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold text-xs truncate">{file.name}</p>
                              {file.modifiedTime && (
                                <p className="text-[10px] opacity-60">
                                  {new Date(file.modifiedTime).toLocaleString("vi-VN")}
                                </p>
                              )}
                            </div>
                          </div>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="shrink-0 p-1.5 rounded-lg bg-sky-500/10 text-sky-500 hover:bg-sky-500 hover:text-white transition-colors"
                              title="Xem file trên Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status or Progress */}
              {isSaving && (
                <div className="flex items-center justify-center gap-2 py-2 text-sky-400 font-semibold text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải tệp lên thư mục Google Drive...</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3.5 border-t flex items-center justify-end ${
          isDark ? "border-slate-800 bg-slate-900" : "border-sky-100 bg-sky-50/50"
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
              isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-sky-200 hover:bg-sky-100"
            }`}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
