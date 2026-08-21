import { doc, setDoc, increment, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db, auth } from "./firebase";

const STATS_COLLECTION = "stats";
const VISITORS_DOC = "site_visitors";
const VISIT_KEY = "studio_last_visit_time";
const COOLDOWN_MS = 10 * 60 * 1000;

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(
    "Firestore Error Details: ",
    JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path,
    })
  );
}

/**
 * Trạng thái bộ đếm.
 *
 * Trước đây hàm này chỉ trả về một con số, và khi lỗi hoặc khi document chưa tồn
 * tại thì trả thẳng `1` — một con số bịa, hiển thị y như số thật. Đó là lý do
 * trang luôn hiện "1 lượt khách" lúc mới vào và chỉ đúng sau khi F5: lần đầu
 * listener chạy trước khi lượt ghi kịp về, thấy doc chưa có, liền hiện 1.
 */
export type VisitorCountState =
  | { status: "loading" }
  | { status: "ready"; count: number }
  | { status: "error"; message: string };

/** Đã qua thời gian nghỉ giữa hai lần đếm chưa. Đọc đồng bộ. */
function isCooldownOver(): boolean {
  try {
    const last = localStorage.getItem(VISIT_KEY);
    if (!last) return true;
    const ts = Number(last);
    return !Number.isFinite(ts) || Date.now() - ts > COOLDOWN_MS;
  } catch {
    // Trình duyệt chặn storage -> vẫn đếm, chỉ là không nhớ được lần trước
    return true;
  }
}

/** Ghi mốc thời gian CHỈ sau khi ghi Firestore thành công. */
function markCounted(): void {
  try {
    localStorage.setItem(VISIT_KEY, String(Date.now()));
  } catch {
    /* không nhớ được thì thôi, lần sau đếm lại */
  }
}

/**
 * Theo dõi số lượt khách và ghi nhận lượt truy cập hiện tại.
 *
 * Thứ tự quan trọng: lắng nghe TRƯỚC, ghi SAU — để khi lượt ghi được commit,
 * listener nhận đúng giá trị mới mà không cần tải lại trang.
 */
export function subscribeVisitorCount(
  onUpdate: (state: VisitorCountState) => void
): () => void {
  const ref = doc(db, STATS_COLLECTION, VISITORS_DOC);

  let disposed = false;
  let lastKnownCount: number | null = null;

  // Quyết định đồng bộ, để snapshot đầu tiên biết có nên chờ lượt ghi hay không
  const willCount = isCooldownOver();
  let writeInFlight = willCount;

  onUpdate({ status: "loading" });

  const unsubscribe = onSnapshot(
    ref,
    (snapshot) => {
      if (disposed) return;

      const value = snapshot.exists() ? snapshot.data()?.count : undefined;
      if (typeof value === "number") {
        lastKnownCount = value;
        onUpdate({ status: "ready", count: value });
        return;
      }

      // Document chưa tồn tại. Nếu lượt ghi của chính mình đang trên đường thì
      // cứ chờ — nó sẽ tạo document. Không bịa số trong lúc chờ.
      if (!writeInFlight) {
        onUpdate({ status: "ready", count: 0 });
      }
    },
    (error) => {
      if (disposed) return;
      handleFirestoreError(error, OperationType.GET, ref.path);
      // Đọc hỏng thì nói là hỏng, không hiện một con số bịa
      onUpdate({
        status: "error",
        message: "Không đọc được số lượt khách từ Firestore.",
      });
    }
  );

  if (willCount) {
    setDoc(ref, { count: increment(1), lastVisitedAt: serverTimestamp() }, { merge: true })
      .then(() => {
        writeInFlight = false;
        markCounted();
      })
      .catch((err) => {
        writeInFlight = false;
        handleFirestoreError(err, OperationType.WRITE, ref.path);
        if (disposed) return;
        // Ghi hỏng nhưng vẫn đọc được số cũ -> hiện số cũ, đừng che mất
        if (lastKnownCount === null) {
          onUpdate({
            status: "error",
            message: "Không ghi nhận được lượt truy cập vào Firestore.",
          });
        }
      });
  }

  return () => {
    disposed = true;
    unsubscribe();
  };
}
