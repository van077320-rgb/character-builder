import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

/**
 * Chặn sớm khi file cấu hình chưa được điền.
 * Thiếu apiKey/appId thì Firebase vẫn khởi tạo được nhưng chết ở lần gọi mạng
 * đầu tiên với thông báo khó hiểu — thà báo rõ ngay từ đầu.
 */
const REQUIRED_CONFIG_KEYS = ["projectId", "apiKey", "appId", "authDomain", "messagingSenderId"] as const;
const missingConfig = REQUIRED_CONFIG_KEYS.filter((k) => {
  const v = (firebaseConfig as Record<string, string>)[k];
  return !v || v.startsWith("<") || v.includes("MY_");
});
if (missingConfig.length > 0) {
  throw new Error(
    `firebase-applet-config.json chưa điền: ${missingConfig.join(", ")}. ` +
      "Lấy từ Firebase Console → Project settings → Your apps → SDK setup and configuration."
  );
}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Link console lấy từ src/data/googleConsole.ts (project id đọc từ file cấu hình)
export {
  FIREBASE_PROJECT_ID,
  FIREBASE_AUTH_SETTINGS_URL,
  ENABLE_DRIVE_API_URL,
  OAUTH_SCOPES_URL,
} from "./data/googleConsole";

/**
 * Firestore. Project mới thường dùng database mặc định — khi đó để trống
 * `firestoreDatabaseId` (hoặc ghi "(default)") là được. Chỉ truyền tên database
 * khi project thật sự dùng một named database riêng.
 */
const dbId = (firebaseConfig.firestoreDatabaseId || "").trim();
export const db =
  dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);

/** Quyền tối thiểu để tạo và quản lý file do chính app tạo ra trên Drive. */
export const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/* ────────────────────────────────────────────────────────────
 * Access token cho Google Drive
 *
 * Token CHỈ giữ trong RAM, không ghi vào localStorage. Đổi lại, tải lại trang là
 * mất token dù Firebase vẫn nhớ phiên đăng nhập — nên phải có `needsDriveAuthorization()`
 * để UI biết mà mời cấp quyền lại, thay vì hiện "Đã kết nối" rồi báo lỗi khi bấm lưu.
 * ──────────────────────────────────────────────────────────── */

interface DriveToken {
  accessToken: string;
  /** Mốc hết hạn thật, lấy từ `expires_in` của Google chứ không đoán. */
  expiresAt: number;
  grantedScopes: string[];
}

let driveToken: DriveToken | null = null;

/** Coi như hết hạn sớm 60s để không gửi đi một token chết ngay giữa request. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;

export type DriveAuthCode =
  | "drive/scope-denied"
  | "drive/token-unavailable"
  | "drive/needs-reauthorization"
  | "drive/token-expired";

export class DriveAuthError extends Error {
  code: DriveAuthCode;
  constructor(code: DriveAuthCode, message: string) {
    super(message);
    this.name = "DriveAuthError";
    this.code = code;
  }
}

/** Token còn dùng được, hoặc `null` nếu chưa có / đã hết hạn. */
export const getCachedAccessToken = (): string | null => {
  if (!driveToken) return null;
  if (Date.now() >= driveToken.expiresAt - TOKEN_SAFETY_MARGIN_MS) {
    driveToken = null;
    return null;
  }
  return driveToken.accessToken;
};

/** Đã đăng nhập Google nhưng chưa có quyền Drive dùng được -> cần cấp lại. */
export const needsDriveAuthorization = (): boolean =>
  !!auth.currentUser && getCachedAccessToken() === null;

/** Số phút còn lại của token, để UI hiển thị. `null` nếu không có token. */
export const getTokenMinutesLeft = (): number | null => {
  if (!getCachedAccessToken() || !driveToken) return null;
  return Math.max(0, Math.floor((driveToken.expiresAt - Date.now()) / 60_000));
};

/**
 * Hỏi Google xem token này THỰC SỰ được cấp những quyền nào và còn sống bao lâu.
 *
 * Bắt buộc phải kiểm: Google vẫn trả access token kể cả khi người dùng bỏ tích ô
 * quyền Drive ở màn hình đồng ý. Không kiểm thì app báo "đăng nhập thành công"
 * rồi chỉ chết lúc gọi Drive, không ai hiểu vì sao.
 */
async function inspectToken(
  accessToken: string
): Promise<{ scopes: string[]; expiresInSec: number }> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );

  if (!res.ok) {
    throw new DriveAuthError(
      "drive/token-unavailable",
      `Không xác minh được quyền truy cập với Google (HTTP ${res.status}).`
    );
  }

  const info = await res.json();
  return {
    scopes: String(info.scope || "").split(/\s+/).filter(Boolean),
    expiresInSec: Number(info.expires_in) || 3600,
  };
}

/**
 * Provider tạo mới mỗi lần gọi.
 *
 * Nếu dùng lại một provider ở cấp module với `prompt: "select_account"`, Google sẽ
 * nhớ lựa chọn từ chối lần trước và không hiện lại màn hình cấp quyền nữa —
 * người dùng bấm "Thử lại" bao nhiêu lần cũng vô ích. `prompt: "consent"` buộc
 * Google hiện lại đúng màn hình đó.
 */
function createGoogleProvider(prompt: "select_account" | "consent"): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt });
  DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
  return provider;
}

export interface DriveSignInResult {
  user: User;
  accessToken: string;
  grantedScopes: string[];
  minutesLeft: number;
}

/**
 * Đăng nhập Google và xin quyền Drive.
 *
 * @param forceConsent bật khi người dùng bấm "Thử lại" hoặc "Cấp lại quyền" —
 *   buộc Google hiện lại màn hình tích quyền thay vì im lặng dùng lựa chọn cũ.
 */
export const signInForDrive = async (forceConsent = false): Promise<DriveSignInResult> => {
  const result = await signInWithPopup(
    auth,
    createGoogleProvider(forceConsent ? "consent" : "select_account")
  );

  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new DriveAuthError(
      "drive/token-unavailable",
      "Google không trả về access token để truy cập Drive. Hãy thử cấp lại quyền."
    );
  }

  const { scopes, expiresInSec } = await inspectToken(accessToken);

  const missing = DRIVE_SCOPES.filter((s) => !scopes.includes(s));
  if (missing.length > 0) {
    driveToken = null;
    throw new DriveAuthError(
      "drive/scope-denied",
      "Bạn chưa tích ô cho phép truy cập Google Drive ở màn hình đồng ý của Google, nên app không thể tạo hay lưu file. Hãy bấm cấp lại quyền và tích vào ô Drive."
    );
  }

  driveToken = {
    accessToken,
    expiresAt: Date.now() + expiresInSec * 1000,
    grantedScopes: scopes,
  };

  return {
    user: result.user,
    accessToken,
    grantedScopes: scopes,
    minutesLeft: Math.floor(expiresInSec / 60),
  };
};

/** Giữ tên cũ cho tương thích: đăng nhập lần đầu. */
export const loginWithGoogle = () => signInForDrive(false);

/** Xin lại quyền khi token hết hạn, mất sau khi tải lại trang, hoặc bị từ chối. */
export const reauthorizeDrive = () => signInForDrive(true);

export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  driveToken = null;
};

export type { User };
