/**
 * Nhận biết bản nháp đang dựng có nội dung chưa lưu hay không.
 *
 * Quy ước của app: bản nháp KHÔNG tự động vào Lịch sử. Người dùng phải chủ động
 * bấm lưu, để Lịch sử và bản backup trên Drive không bị rác. Đổi lại, hai thao
 * tác ghi đè bản nháp ("Tạo nhân vật mới" và "Tải bản ghi khác") phải hỏi trước.
 *
 * Bản nháp vẫn được giữ trong localStorage, nên tải lại trang hay đóng trình
 * duyệt không mất gì — không cần cảnh báo cho những trường hợp đó.
 */

import type { CharacterData, TemplateData } from "../types";
import { DEFAULT_CHARACTER_DATA, DEFAULT_TEMPLATE_DATA } from "../types";

/** Chữ ký nội dung của một bản nháp. Đổi một ký tự là chữ ký đổi theo. */
export function draftSignature(chars: CharacterData[], tpl: TemplateData): string {
  return JSON.stringify({ chars, tpl });
}

const PRISTINE_SIGNATURE = draftSignature([DEFAULT_CHARACTER_DATA], DEFAULT_TEMPLATE_DATA);

/**
 * Dấu vết của nhân vật demo cũ (Cố Dã Thần) từng được điền sẵn làm trạng thái
 * khởi tạo. Demo đã bị xoá khỏi code, nhưng trình duyệt của người đang dùng vẫn
 * còn bản sao trong localStorage — cần nhận ra để dọn.
 *
 * Đối chiếu 5 trường đặc trưng và phải khớp CHÍNH XÁC cả 5. Ai đã thực sự dựng
 * nhân vật của mình thì gần như chắc chắn đã đổi ít nhất tên, thân phận hoặc
 * triết lý cốt lõi, nên dữ liệu thật không bị đụng tới.
 */
const LEGACY_DEMO_MARKERS: Record<string, string> = {
  fullName: "Cố Dã Thần",
  aliases: "Cố tổng, Nhị thiếu gia, Boss Cố",
  age: "28 tuổi",
  occupation:
    "Chủ tịch tập đoàn tài chính Cố Thị, người nắm quyền thế giới ngầm khu Nam Thành",
  corePhilosophy:
    "Kẻ không có giá trị lợi dụng sẽ bị loại bỏ; nhưng một khi đã bảo vệ thứ gì, tuyệt đối không để ai chạm vào.",
};

/** Bản nháp này có phải nhân vật demo cũ chưa ai đụng vào không. */
export function isLegacyDemoCharacter(character: any): boolean {
  if (!character || typeof character !== "object") return false;
  return Object.entries(LEGACY_DEMO_MARKERS).every(([key, value]) => character[key] === value);
}

/**
 * Dọn demo cũ còn sót trong localStorage của người dùng.
 * Chỉ thay bằng thẻ trống khi CHẮC CHẮN là demo chưa bị sửa; ngoài ra trả nguyên
 * dữ liệu đang có, không bao giờ tự ý xoá nội dung người dùng viết.
 */
export function migrateLegacyDemoCharacter(character: CharacterData): CharacterData {
  return isLegacyDemoCharacter(character) ? DEFAULT_CHARACTER_DATA : character;
}

export function migrateLegacyDemoList(chars: CharacterData[]): CharacterData[] {
  if (chars.length === 1 && isLegacyDemoCharacter(chars[0])) return [DEFAULT_CHARACTER_DATA];
  return chars;
}

/**
 * Bản nháp "trống": chưa gõ chữ nào. Không có gì để mất nên không cần hỏi.
 *
 * So sánh theo NỘI DUNG chứ không theo tham chiếu — sau khi tải lại trang, dữ
 * liệu được parse từ localStorage nên luôn là object mới, so bằng `!==` sẽ luôn
 * cho ra "có bản nháp" kể cả khi thẻ hoàn toàn trống.
 */
export function isPristineDraft(chars: CharacterData[], tpl: TemplateData): boolean {
  return draftSignature(chars, tpl) === PRISTINE_SIGNATURE;
}

/**
 * Có nội dung sẽ mất nếu ghi đè bản nháp ngay bây giờ hay không.
 *
 * @param lastSavedSignature chữ ký của bản nháp lần cuối được bấm lưu vào Lịch sử
 */
export function hasUnsavedDraft(
  chars: CharacterData[],
  tpl: TemplateData,
  lastSavedSignature: string
): boolean {
  if (isPristineDraft(chars, tpl)) return false;
  return draftSignature(chars, tpl) !== lastSavedSignature;
}
