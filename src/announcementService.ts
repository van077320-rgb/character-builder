import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { describeFirestoreError } from "./data/firestoreErrors";

/* ────────────────────────────────────────────────────────────
 * Thông báo chạy trên trang chủ.
 *
 * Ai cũng ĐỌC được, chỉ admin GHI được — chặn thật ở `firestore.rules` bằng email
 * đăng nhập, không phải bằng việc ẩn nút trên giao diện.
 * ──────────────────────────────────────────────────────────── */

const ANNOUNCEMENTS_COLLECTION = "announcements";

/** Khớp với `firestore.rules`. */
export const ANNOUNCEMENT_TEXT_MAX = 300;

/** Nhiều hơn chừng này thì băng chạy dài lê thê, không ai đọc hết một vòng. */
const ANNOUNCEMENT_FETCH_LIMIT = 20;

/** Màu sắc của thông báo — chỉ ảnh hưởng cách hiển thị. */
export type AnnouncementTone = "info" | "new" | "warn";

export const ANNOUNCEMENT_TONES: { value: AnnouncementTone; label: string }[] = [
  { value: "new", label: "Tính năng mới" },
  { value: "info", label: "Thông tin chung" },
  { value: "warn", label: "Cảnh báo / bảo trì" },
];

/** Các mốc hết hạn bấm một phát là xong; `days: null` là không hết hạn. */
export const EXPIRY_PRESETS: { value: string; label: string; days: number | null }[] = [
  { value: "never", label: "Không hết hạn", days: null },
  { value: "1", label: "Tự ẩn sau 1 ngày", days: 1 },
  { value: "3", label: "Tự ẩn sau 3 ngày", days: 3 },
  { value: "7", label: "Tự ẩn sau 7 ngày", days: 7 },
  { value: "14", label: "Tự ẩn sau 14 ngày", days: 14 },
  { value: "30", label: "Tự ẩn sau 30 ngày", days: 30 },
];

/** Giá trị riêng của ô sổ xuống, mở thêm ô chọn ngày cụ thể. */
export const EXPIRY_CUSTOM = "custom";

export const expiryFromDays = (days: number): Date =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Ngày từ ô `<input type="date">` -> mốc hết hạn.
 *
 * Lấy 23:59:59 của chính ngày đó chứ không phải 0h. Chọn "ngày 20" mà thông báo
 * biến mất ngay lúc giao thừa sang ngày 20 thì đúng nghĩa đen nhưng sai với thứ
 * người ta nghĩ trong đầu là "hiện hết ngày 20".
 */
export function expiryFromDateInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export interface Announcement {
  id: string;
  text: string;
  tone: AnnouncementTone;
  /** Đang hiện trên trang chủ hay đang tắt (giữ lại để bật lần sau). */
  active: boolean;
  createdAt: number | null;
  /** Mốc tự ẩn. `null` nghĩa là chạy mãi tới khi admin tự tắt hoặc xoá. */
  expiresAt: number | null;
}

/**
 * Đã quá hạn tự ẩn chưa.
 *
 * Nhận `now` từ bên ngoài thay vì tự gọi `Date.now()`: băng chạy trên trang chủ
 * phải tính lại theo một cái đồng hồ chung mỗi phút, nếu mỗi lần gọi lại lấy một
 * mốc thời gian khác nhau thì React không có cách nào biết mà vẽ lại.
 *
 * Mốc so sánh là ĐỒNG HỒ MÁY NGƯỜI XEM, không phải giờ máy chủ. Máy ai chỉnh sai
 * ngày thì thấy lệch — đổi lại là không tốn thêm lượt đọc Firestore chỉ để hỏi giờ.
 */
export function isAnnouncementExpired(item: Announcement, now: number): boolean {
  return item.expiresAt !== null && item.expiresAt <= now;
}

export type AnnouncementState =
  | { status: "loading" }
  | { status: "ready"; items: Announcement[] }
  | { status: "error"; message: string };

function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function toTone(value: unknown): AnnouncementTone {
  return value === "new" || value === "warn" ? value : "info";
}

/**
 * Lắng nghe danh sách thông báo (kể cả bản đang tắt — bảng quản trị cần thấy).
 *
 * Lỗi đọc thì báo status "error"; băng chạy trên trang chủ tự ẩn đi thay vì hiện
 * một dòng lỗi đỏ ngay giữa banner chào mừng.
 */
export function subscribeAnnouncements(
  onUpdate: (state: AnnouncementState) => void
): () => void {
  const q = query(
    collection(db, ANNOUNCEMENTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(ANNOUNCEMENT_FETCH_LIMIT)
  );

  let disposed = false;
  onUpdate({ status: "loading" });

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (disposed) return;
      onUpdate({
        status: "ready",
        items: snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            text: typeof data.text === "string" ? data.text : "",
            tone: toTone(data.tone),
            active: data.active !== false,
            createdAt: toMillis(data.createdAt),
            expiresAt: toMillis(data.expiresAt),
          };
        }),
      });
    },
    (error) => {
      if (disposed) return;
      console.error("Announcements subscribe error:", error);
      onUpdate({
        status: "error",
        message: describeFirestoreError(error, "đọc danh sách thông báo"),
      });
    }
  );

  return () => {
    disposed = true;
    unsubscribe();
  };
}

export async function createAnnouncement(input: {
  text: string;
  tone: AnnouncementTone;
  /** `null` = chạy mãi tới khi admin tự tắt. */
  expiresAt: Date | null;
}): Promise<void> {
  const text = input.text.trim();
  if (!text) throw new Error("Nội dung thông báo đang để trống.");
  if (text.length > ANNOUNCEMENT_TEXT_MAX) {
    throw new Error(
      `Thông báo dài ${text.length} ký tự, vượt quá giới hạn ${ANNOUNCEMENT_TEXT_MAX}.`
    );
  }
  // Chặn ngay chứ đừng để đăng xong rồi ngơ ngác không hiểu sao chẳng thấy đâu
  if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
    throw new Error("Ngày hết hạn đang nằm ở quá khứ — thông báo sẽ ẩn ngay lập tức.");
  }

  try {
    await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
      text,
      tone: input.tone,
      active: true,
      createdAt: serverTimestamp(),
      expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
    });
  } catch (error) {
    console.error("Announcement create error:", error);
    throw new Error(describeFirestoreError(error, "đăng thông báo"));
  }
}

/** Dời hoặc bỏ hạn tự ẩn của một thông báo đã đăng. */
export async function setAnnouncementExpiry(id: string, expiresAt: Date | null): Promise<void> {
  try {
    await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), {
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    });
  } catch (error) {
    console.error("Announcement expiry error:", error);
    throw new Error(describeFirestoreError(error, "đổi hạn tự ẩn"));
  }
}

/** Bật / tắt một thông báo mà không xoá nó đi. */
export async function setAnnouncementActive(id: string, active: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), { active });
  } catch (error) {
    console.error("Announcement toggle error:", error);
    throw new Error(describeFirestoreError(error, active ? "bật thông báo" : "tắt thông báo"));
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
  } catch (error) {
    console.error("Announcement delete error:", error);
    throw new Error(describeFirestoreError(error, "xoá thông báo"));
  }
}
