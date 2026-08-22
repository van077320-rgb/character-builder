/**
 * Ai được quyền quản trị: đăng thông báo chạy trên trang chủ, ẩn / xoá lưu bút.
 *
 * ⚠️ Danh sách này PHẢI KHỚP với hàm `isAdmin()` trong `firestore.rules`.
 * Ở đây chỉ là lớp ẩn/hiện giao diện — thứ thực sự chặn ghi dữ liệu là Firestore
 * Rules ở phía Google. Sửa một bên mà quên bên kia sẽ dẫn tới một trong hai cảnh:
 * admin thấy nút nhưng bấm vào bị "Bạn không có quyền", hoặc người lạ thấy nút
 * quản trị (dù bấm vẫn không ghi được).
 *
 * Muốn thêm người: thêm email vào cả hai chỗ rồi Publish lại Rules trên Console.
 */
export const ADMIN_EMAILS: string[] = ["van077320@gmail.com"];

/**
 * Email đăng nhập có nằm trong danh sách quản trị không.
 *
 * So sánh sau khi hạ chữ thường vì Google trả email đúng như người dùng đăng ký,
 * còn Rules thì so sánh chuỗi tuyệt đối — để hai bên lệch nhau là admin tự khoá mình.
 */
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((allowed) => allowed.trim().toLowerCase() === normalized);
};
