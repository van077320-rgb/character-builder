/**
 * Dịch lỗi Firestore sang câu tiếng Việt nói rõ PHẢI LÀM GÌ.
 *
 * Mặc định SDK ném ra những câu như "Missing or insufficient permissions" —
 * đúng về kỹ thuật nhưng người dùng đọc xong không biết là lỗi của họ, lỗi mạng,
 * hay chủ web quên bật gì đó. Ba mã dưới đây chiếm gần hết số lần lỗi thật sự xảy ra.
 */

/** Mã lỗi Firebase nằm ở thuộc tính `code` dạng "firestore/permission-denied". */
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" ? code : "";
}

export function describeFirestoreError(error: unknown, action: string): string {
  const code = errorCode(error);

  if (code.includes("permission-denied")) {
    return `Không được phép ${action}. Nếu bạn là chủ web: kiểm tra Firestore Rules đã Publish bản mới nhất chưa.`;
  }
  if (code.includes("unavailable") || code.includes("network")) {
    return `Không kết nối được tới máy chủ để ${action}. Kiểm tra mạng rồi thử lại.`;
  }
  if (code.includes("resource-exhausted")) {
    return `Firestore đã hết hạn mức miễn phí trong hôm nay nên không ${action} được. Thử lại sau.`;
  }

  const raw = error instanceof Error ? error.message : String(error);
  return `Không ${action} được: ${raw}`;
}
