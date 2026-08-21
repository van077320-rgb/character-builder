/**
 * Đọc localStorage an toàn.
 *
 * Trước đây mỗi chỗ đọc đều là `try { JSON.parse(saved) } catch (e) {}` — dữ liệu
 * hỏng thì rơi về mặc định trong im lặng, và ngay sau đó `useEffect` đồng bộ ghi
 * đè giá trị mặc định lên chính ô đó. Người dùng mở app thấy trắng trơn, không
 * một lời giải thích, và bản hỏng — thứ vẫn có thể vớt tay được — đã bị xoá mất.
 *
 * Nay: hỏng thì CẤT bản gốc sang ô backup rồi báo lên UI.
 */

export interface StorageReadIssue {
  key: string;
  message: string;
  /** Ô chứa bản gốc đã được cất giữ để vớt tay. */
  backupKey: string;
}

const issues: StorageReadIssue[] = [];

/** Các sự cố đọc dữ liệu trong lần khởi động này. */
export function getStorageIssues(): StorageReadIssue[] {
  return issues;
}

/**
 * Đọc và parse một ô localStorage.
 *
 * @param validate kiểm tra hình dạng dữ liệu; trả false thì coi như hỏng.
 * @returns giá trị đã parse, hoặc `fallback` nếu ô trống / hỏng.
 */
export function readJson<T>(key: string, fallback: T, validate?: (value: any) => boolean): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch (e) {
    // Trình duyệt chặn storage (chế độ riêng tư, chặn cookie bên thứ ba...)
    issues.push({
      key,
      message: "Trình duyệt không cho phép truy cập bộ nhớ cục bộ.",
      backupKey: "",
    });
    return fallback;
  }

  if (!raw) return fallback;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return preserve(key, raw, "Dữ liệu đã lưu bị hỏng định dạng JSON.", fallback);
  }

  if (validate && !validate(parsed)) {
    return preserve(key, raw, "Dữ liệu đã lưu không đúng cấu trúc mong đợi.", fallback);
  }

  return parsed as T;
}

/** Cất bản gốc bị hỏng sang ô riêng trước khi app kịp ghi đè lên nó. */
function preserve<T>(key: string, raw: string, message: string, fallback: T): T {
  const backupKey = `${key}__corrupt_${Date.now()}`;
  try {
    localStorage.setItem(backupKey, raw);
  } catch {
    /* hết dung lượng thì thôi, vẫn báo cho người dùng biết */
  }
  console.error(`[Storage] ${key}: ${message} Bản gốc được giữ ở "${backupKey}".`);
  issues.push({ key, message, backupKey });
  return fallback;
}

/** Nhãn tiếng Việt của từng ô, để thông báo nói rõ mất cái gì. */
export const STORAGE_LABELS: Record<string, string> = {
  htn_current_character: "nhân vật đang dựng",
  htn_characters_list: "danh sách nhân vật",
  htn_current_template: "template đang dựng",
  htn_history_items: "lịch sử đã lưu",
};
