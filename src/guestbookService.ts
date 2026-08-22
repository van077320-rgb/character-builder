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
 * Hòm thư lưu bút — ai cũng viết được, KHÔNG cần đăng nhập Google.
 *
 * Vì không có đăng nhập nên không có `request.auth.uid` để dựa vào. Ba lớp giữ
 * cho nó không thành bãi rác:
 *   1. Firestore Rules chặn cứng: chỉ nhận đúng 3 trường, đúng kiểu, đúng độ dài,
 *      `createdAt` phải là giờ máy chủ. Đây là lớp DUY NHẤT không thể lách.
 *   2. Cooldown ở trình duyệt (localStorage) — chặn bấm nhầm hai lần, không chặn
 *      được người cố tình. Đừng nhầm nó là bảo mật.
 *   3. Admin ẩn / xoá bài bằng tay.
 * ──────────────────────────────────────────────────────────── */

const GUESTBOOK_COLLECTION = "guestbook";
const LAST_POST_KEY = "studio_last_guestbook_post";

/** Giới hạn PHẢI khớp với `firestore.rules`; lệch là người dùng gõ xong mới bị từ chối. */
export const GUESTBOOK_NAME_MAX = 40;
export const GUESTBOOK_MESSAGE_MAX = 800;

/** Nghỉ giữa hai lần gửi, tính bằng mili giây. */
export const GUESTBOOK_COOLDOWN_MS = 60_000;

/** Số lưu bút tải về mỗi lần. Đủ dùng lâu dài mà không kéo cả nghìn bản ghi. */
const GUESTBOOK_FETCH_LIMIT = 200;

/** Tên hiển thị khi người viết để trống ô tên. */
export const ANONYMOUS_NAME = "Khách ẩn danh";

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  /** Mốc thời gian máy chủ. `null` khi lượt ghi của chính mình chưa về tới server. */
  createdAt: number | null;
  /** Bị admin ẩn khỏi danh sách công khai. */
  hidden: boolean;
  /** Bản ghi mới gửi, máy chủ chưa xác nhận. */
  pending: boolean;
}

export type GuestbookState =
  | { status: "loading" }
  | { status: "ready"; entries: GuestbookEntry[] }
  | { status: "error"; message: string };

export type GuestbookErrorCode =
  | "guestbook/empty-message"
  | "guestbook/too-long"
  | "guestbook/cooldown"
  | "guestbook/write-failed";

export class GuestbookError extends Error {
  code: GuestbookErrorCode;
  /** Số giây còn phải chờ, chỉ có khi code là `guestbook/cooldown`. */
  secondsLeft?: number;

  constructor(code: GuestbookErrorCode, message: string, secondsLeft?: number) {
    super(message);
    this.name = "GuestbookError";
    this.code = code;
    this.secondsLeft = secondsLeft;
  }
}

/** Mili giây còn lại của thời gian nghỉ. `0` nghĩa là gửi được ngay. */
export function guestbookCooldownLeft(): number {
  try {
    const last = Number(localStorage.getItem(LAST_POST_KEY));
    if (!Number.isFinite(last) || last <= 0) return 0;
    return Math.max(0, GUESTBOOK_COOLDOWN_MS - (Date.now() - last));
  } catch {
    // Trình duyệt chặn storage -> không nhớ được, cứ cho gửi
    return 0;
  }
}

function markPosted(): void {
  try {
    localStorage.setItem(LAST_POST_KEY, String(Date.now()));
  } catch {
    /* không nhớ được thì thôi */
  }
}

/** Timestamp của Firestore -> mili giây. Trả `null` khi lượt ghi chưa được commit. */
function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

/**
 * Lắng nghe danh sách lưu bút theo thời gian thực.
 *
 * Trả về CẢ bài bị ẩn — trang công khai tự lọc, còn bảng quản trị cần thấy để bỏ ẩn.
 * Lưu ý: "ẩn" chỉ là ẩn khỏi giao diện, dữ liệu vẫn đọc được qua SDK. Muốn mất hẳn
 * thì phải xoá.
 */
export function subscribeGuestbook(
  onUpdate: (state: GuestbookState) => void
): () => void {
  const q = query(
    collection(db, GUESTBOOK_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(GUESTBOOK_FETCH_LIMIT)
  );

  let disposed = false;
  onUpdate({ status: "loading" });

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (disposed) return;
      const entries: GuestbookEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: typeof data.name === "string" && data.name.trim() ? data.name : ANONYMOUS_NAME,
          message: typeof data.message === "string" ? data.message : "",
          createdAt: toMillis(data.createdAt),
          hidden: data.hidden === true,
          pending: d.metadata.hasPendingWrites,
        };
      });
      onUpdate({ status: "ready", entries });
    },
    (error) => {
      if (disposed) return;
      console.error("Guestbook subscribe error:", error);
      onUpdate({
        status: "error",
        message: describeFirestoreError(error, "đọc hòm thư lưu bút"),
      });
    }
  );

  // `disposed` chặn callback về muộn sau khi component đã unmount — gọi setState
  // lúc đó là cập nhật lên một component không còn tồn tại.
  return () => {
    disposed = true;
    unsubscribe();
  };
}

/**
 * Gửi một lưu bút mới.
 *
 * Cắt ngắn thay vì âm thầm gửi quá giới hạn: Rules sẽ từ chối bản ghi dài hơn mức
 * cho phép, và một lỗi "permission-denied" thì người viết không đời nào đoán ra là
 * do lời nhắn dài quá.
 */
export async function postGuestbookEntry(input: {
  name: string;
  message: string;
}): Promise<void> {
  const message = input.message.trim();
  const name = input.name.trim().slice(0, GUESTBOOK_NAME_MAX);

  if (!message) {
    throw new GuestbookError("guestbook/empty-message", "Bạn chưa viết lời nhắn nào.");
  }
  if (message.length > GUESTBOOK_MESSAGE_MAX) {
    throw new GuestbookError(
      "guestbook/too-long",
      `Lời nhắn dài ${message.length} ký tự, vượt quá giới hạn ${GUESTBOOK_MESSAGE_MAX}.`
    );
  }

  const waitMs = guestbookCooldownLeft();
  if (waitMs > 0) {
    const secondsLeft = Math.ceil(waitMs / 1000);
    throw new GuestbookError(
      "guestbook/cooldown",
      `Đợi thêm ${secondsLeft} giây nữa rồi gửi tiếp nhé.`,
      secondsLeft
    );
  }

  try {
    await addDoc(collection(db, GUESTBOOK_COLLECTION), {
      name: name || ANONYMOUS_NAME,
      message,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Guestbook write error:", error);
    throw new GuestbookError(
      "guestbook/write-failed",
      describeFirestoreError(error, "gửi lưu bút")
    );
  }

  markPosted();
}

/** Ẩn / bỏ ẩn một lưu bút khỏi danh sách công khai. Chỉ admin gọi được (Rules chặn). */
export async function setGuestbookEntryHidden(id: string, hidden: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, GUESTBOOK_COLLECTION, id), { hidden });
  } catch (error) {
    console.error("Guestbook hide error:", error);
    throw new Error(describeFirestoreError(error, hidden ? "ẩn lưu bút" : "bỏ ẩn lưu bút"));
  }
}

/** Xoá hẳn một lưu bút. Chỉ admin gọi được (Rules chặn). */
export async function deleteGuestbookEntry(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, GUESTBOOK_COLLECTION, id));
  } catch (error) {
    console.error("Guestbook delete error:", error);
    throw new Error(describeFirestoreError(error, "xoá lưu bút"));
  }
}
