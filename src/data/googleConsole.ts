/**
 * Link tới đúng trang cấu hình của ĐÚNG project.
 *
 * Project id lấy thẳng từ `firebase-applet-config.json` — TUYỆT ĐỐI không hard-code.
 * Đã từng có lúc modal Drive hard-code một project id khác hẳn project thật, nên
 * nút "Mở Cài Đặt Firebase Console" dẫn người dùng sang console của project không
 * phải của họ: thêm domain ở đó xong quay lại vẫn lỗi Unauthorized Domain y nguyên.
 * Đổi project sau này chỉ cần sửa đúng file cấu hình, mọi link tự cập nhật theo.
 *
 * File này cố tình không import firebase SDK để dùng được ở cả chỗ không muốn
 * khởi tạo app (test, script).
 */

import firebaseConfig from "../../firebase-applet-config.json";

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

/** Firebase Console → Authentication → Settings → Authorized domains */
export const FIREBASE_AUTH_SETTINGS_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`;

/** Cloud Console → API Library → Google Drive API (trang bấm Enable) */
export const ENABLE_DRIVE_API_URL = `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${FIREBASE_PROJECT_ID}`;

/** Cloud Console → OAuth consent screen → Scopes */
export const OAUTH_SCOPES_URL = `https://console.cloud.google.com/auth/scopes?project=${FIREBASE_PROJECT_ID}`;
