import { ENABLE_DRIVE_API_URL } from "./data/googleConsole";

const FOLDER_NAME = "Hành Tinh Nhỏ - Character & Prompts";

/**
 * Loại lỗi Drive. Ba tình huống dưới đây trông giống nhau với người dùng
 * ("không lưu được") nhưng cách sửa khác hẳn, nên phải tách bạch:
 *
 * - `api-not-enabled`  : 403 accessNotConfigured — Drive API chưa bật trong Cloud Console
 * - `scope-insufficient`: 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT — thiếu quyền, phải cấp lại
 * - `token-expired`    : 401 — token hết hạn, phải đăng nhập/cấp quyền lại
 */
export type DriveErrorKind =
  | "api-not-enabled"
  | "scope-insufficient"
  | "token-expired"
  | "rate-limited"
  | "unknown";

export class DriveApiError extends Error {
  kind: DriveErrorKind;
  status: number;
  /** Link đưa người dùng tới đúng chỗ cần bấm, nếu có. */
  actionUrl?: string;
  /** Nội dung gốc Google trả về, giữ lại để không mất nguyên nhân thật. */
  raw: string;

  constructor(kind: DriveErrorKind, status: number, message: string, raw: string, actionUrl?: string) {
    super(message);
    this.name = "DriveApiError";
    this.kind = kind;
    this.status = status;
    this.raw = raw;
    this.actionUrl = actionUrl;
  }
}

/** Đọc lỗi Google trả về và dựng thông báo nói đúng việc cần làm. */
export async function toDriveError(res: Response, context: string): Promise<DriveApiError> {
  const raw = await res.text();

  let reason = "";
  let googleMessage = "";
  try {
    const parsed = JSON.parse(raw);
    const err = parsed?.error;
    googleMessage = err?.message || "";
    reason = err?.errors?.[0]?.reason || err?.status || "";
  } catch {
    /* Google trả về HTML hoặc text -> dùng nguyên văn ở dưới */
  }

  const haystack = `${reason} ${googleMessage} ${raw}`.toLowerCase();

  if (res.status === 401) {
    return new DriveApiError(
      "token-expired",
      401,
      "Phiên truy cập Google Drive đã hết hạn (token chỉ sống 1 tiếng). Hãy bấm cấp lại quyền rồi thử lại.",
      raw
    );
  }

  if (res.status === 403) {
    if (haystack.includes("accessnotconfigured") || haystack.includes("service_disabled") || haystack.includes("has not been used in project")) {
      return new DriveApiError(
        "api-not-enabled",
        403,
        "Google Drive API chưa được bật cho project này. Bấm nút bên dưới để bật, chờ khoảng 1 phút rồi thử lại.",
        raw,
        ENABLE_DRIVE_API_URL
      );
    }

    if (
      haystack.includes("access_token_scope_insufficient") ||
      haystack.includes("insufficientpermissions") ||
      haystack.includes("insufficient authentication scopes")
    ) {
      return new DriveApiError(
        "scope-insufficient",
        403,
        "Tài khoản đã đăng nhập nhưng chưa cấp quyền Drive cho app. Hãy bấm cấp lại quyền và nhớ tích vào ô Google Drive.",
        raw
      );
    }

    if (haystack.includes("ratelimitexceeded") || haystack.includes("userratelimitexceeded")) {
      return new DriveApiError(
        "rate-limited",
        403,
        "Google Drive đang giới hạn tốc độ truy cập. Chờ một lát rồi thử lại.",
        raw
      );
    }
  }

  return new DriveApiError(
    "unknown",
    res.status,
    `${context} (HTTP ${res.status})${googleMessage ? `: ${googleMessage}` : ""}`,
    raw
  );
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Finds or creates the dedicated Google Drive folder for the application.
 */
export async function getOrCreateAppFolder(token: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!searchRes.ok) {
    throw await toDriveError(searchRes, "Không tìm được thư mục trên Google Drive");
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      description: "Thư mục lưu trữ thẻ Character và Prompt Studio",
    }),
  });

  if (!createRes.ok) {
    throw await toDriveError(createRes, "Không tạo được thư mục trên Google Drive");
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Saves or updates a text / json file inside the app folder on Google Drive.
 */
export async function saveFileToGoogleDrive({
  token,
  fileName,
  content,
  mimeType = "text/plain;charset=utf-8",
  description = "Tạo bởi Character & Roleplay Prompt Studio",
}: {
  token: string;
  fileName: string;
  content: string;
  mimeType?: string;
  description?: string;
}): Promise<{ fileId: string; webViewLink?: string }> {
  const folderId = await getOrCreateAppFolder(token);

  const query = encodeURIComponent(
    `name = '${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`
  );
  
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  let existingFileId: string | null = null;
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      existingFileId = data.files[0].id;
    }
  }

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = {
    name: fileName,
    description,
    mimeType,
  };

  if (!existingFileId) {
    metadata.parents = [folderId];
  }

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
  let method = "POST";

  if (existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink`;
    method = "PATCH";
  }

  const uploadRes = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    throw await toDriveError(uploadRes, "Không lưu được file vào Google Drive");
  }

  const uploadedFile = await uploadRes.json();
  return {
    fileId: uploadedFile.id,
    webViewLink: uploadedFile.webViewLink,
  };
}

/**
 * Lists all character files and templates inside the app folder on Google Drive.
 */
export async function listAppDriveFiles(token: string): Promise<{ folderId: string; files: DriveFileItem[] }> {
  const folderId = await getOrCreateAppFolder(token);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw await toDriveError(res, "Không tải được danh sách file từ Drive");
  }

  const data = await res.json();
  return {
    folderId,
    files: data.files || [],
  };
}
