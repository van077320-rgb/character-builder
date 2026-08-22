export interface CharacterData {
  // 1. Thông tin cơ bản
  fullName: string;
  aliases: string;
  age: string;
  gender: string;
  species: string;
  occupation: string;
  birthplace: string;
  extraInfo: string;

  // 2. Ngoại hình
  bodyAndFace: string;
  hair: string;
  eyes: string;
  skinAndFeatures: string;
  distinctiveMarks: string;
  dailyOutfit: string;
  specialOutfit: string;
  accessories: string;
  scent: string;

  // 3. Tâm lý & Tính cách
  corePhilosophy: string;
  detailedTraits: string;
  psychologicalArc: string;
  valuesAndFears: string;
  likes: string;
  dislikes: string;
  smallHabits: string;
  flaws: string;

  // 4. Bối cảnh & Quá khứ
  backstory: string;
  secrets: string;
  trauma: string;
  keyRelationships: string;

  // 5. Cách nói chuyện
  voiceTone: string;
  addressRules: string;
  catchphrases: string;
  dialogueNormal: string;
  dialogueHappy: string;
  dialogueAngry: string;
  dialogueSad: string;
  dialogueFlustered: string;

  // 6. Cách hành xử theo đối tượng
  withStrangers: string;
  withFriends: string;
  withEnemies: string;
  withLovedOnes: string;
  withUser: string;

  // 7. Mục tiêu & Động lực & Xung đột nội tâm
  shortTermGoal: string;
  longTermGoal: string;
  obstacles: string;
  innerConflict: string;

  // 8. Kỹ năng & Năng lực
  skills: string;
  limits: string;

  // 9. Mối quan hệ & Vai trò
  roleInWorld: string;
  relatedCharacters: string;

  // 10. Anti-OOC Firewall
  antiOocRules: string;
}

export interface UserProfileField {
  id: string;
  label: string;
  placeholder: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface UserPersona {
  name: string;
  age: string;
  gender: string;
  appearance: string;
  occupation: string;
  extraInfo: string;
}

export interface TemplateData {
  userProfileFields: UserProfileField[];
  publicLore: string;
  hiddenLore: string;
  includeGameMechanics: boolean;
  gameMechanicsTitle: string;
  gameMechanicsContent: string;
  npcsText: string;
  worldbookAppendix: string;
  openingScene: string;
  customChecklistTone: string;
  customChecklistRules: string;
}

export interface SavedHistoryItem {
  id: string;
  title: string;
  characterName: string;
  type: "character_only" | "full_template";
  createdAt: string | number;
  updatedAt: string | number;
  characterData: CharacterData;
  charactersList?: CharacterData[];
  templateData?: TemplateData;
  customCardText?: string;
  customFullTemplateText?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export type ActiveTab =
  | "home"
  | "builder"
  | "card_preview"
  | "template_builder"
  | "full_preview"
  | "guestbook"
  | "history";

export const DEFAULT_USER_PROFILE_FIELDS: UserProfileField[] = [
  { id: "name", label: "Tên", placeholder: "{{user}}", enabled: true },
  { id: "age", label: "Tuổi", placeholder: "[Điền tuổi của bạn]", enabled: true },
  { id: "gender", label: "Giới tính", placeholder: "[Điền giới tính (Nam / Nữ / Khác)]", enabled: true },
  { id: "appearance", label: "Ngoại hình", placeholder: "[Mô tả diện mạo, vóc dáng, trang phục thường ngày]", enabled: true },
  { id: "occupation", label: "Nghề nghiệp / Thân phận", placeholder: "[Điền nghề nghiệp, địa vị, vai trò xã hội]", enabled: true },
  { id: "personality", label: "Tính cách / Thiết lập", placeholder: "[Mô tả nét tính cách nổi bật, thói quen hành xử]", enabled: true },
  { id: "relationship", label: "Mối quan hệ với {{char}}", placeholder: "[Ví dụ: Bạn thuở nhỏ / Đối tác / Kẻ thù / Người hầu / Lần đầu gặp mặt...]", enabled: true },
  { id: "abilities", label: "Kỹ năng / Năng lực đặc biệt", placeholder: "[Kỹ năng chuyên môn, ma thuật, võ thuật nếu phù hợp với world]", enabled: false },
  { id: "faction", label: "Gia thế / Phe phái", placeholder: "[Gia tộc, tổ chức, hoặc môn phái trực thuộc]", enabled: false },
  { id: "secrets", label: "Bí mật / Điểm yếu riêng", placeholder: "[Bí mật hoặc nỗi sợ của bạn]", enabled: false },
  { id: "extraInfo", label: "Thông tin khác phù hợp với World", placeholder: "[Bất kỳ chi tiết nào bổ sung cho bối cảnh kịch bản]", enabled: true },
];

/**
 * Thẻ nhân vật TRỐNG — trạng thái khởi đầu của app và của nút "Tạo Nhân Vật Mới".
 *
 * Trước đây hằng số này là một nhân vật demo điền sẵn cả 47 trường (Cố Dã Thần).
 * Người dùng mới mở app đã thấy nhân vật của người khác, và ai chỉ sửa vài trường
 * sẽ mang nguyên phần còn lại của demo vào prompt của mình mà không biết —
 * AI đọc những câu khẳng định đó như canon.
 *
 * Mọi trường để rỗng. Chỗ nào cần gợi ý thì trình biên dịch prompt tự chèn
 * placeholder dạng [Điền ...] (xem buildFullTemplateText).
 */
export const DEFAULT_CHARACTER_DATA: CharacterData = {
  // 1. Thông tin cơ bản
  fullName: "",
  aliases: "",
  age: "",
  gender: "",
  species: "",
  occupation: "",
  birthplace: "",
  extraInfo: "",

  // 2. Ngoại hình
  bodyAndFace: "",
  hair: "",
  eyes: "",
  skinAndFeatures: "",
  distinctiveMarks: "",
  dailyOutfit: "",
  specialOutfit: "",
  accessories: "",
  scent: "",

  // 3. Tâm lý & Tính cách
  corePhilosophy: "",
  detailedTraits: "",
  psychologicalArc: "",
  valuesAndFears: "",
  likes: "",
  dislikes: "",
  smallHabits: "",
  flaws: "",

  // 4. Bối cảnh & Quá khứ
  backstory: "",
  secrets: "",
  trauma: "",
  keyRelationships: "",

  // 5. Cách nói chuyện
  voiceTone: "",
  addressRules: "",
  catchphrases: "",
  dialogueNormal: "",
  dialogueHappy: "",
  dialogueAngry: "",
  dialogueSad: "",
  dialogueFlustered: "",

  // 6. Cách hành xử theo đối tượng
  withStrangers: "",
  withFriends: "",
  withEnemies: "",
  withLovedOnes: "",
  withUser: "",

  // 7. Mục tiêu & Động lực & Xung đột nội tâm
  shortTermGoal: "",
  longTermGoal: "",
  obstacles: "",
  innerConflict: "",

  // 8. Kỹ năng & Năng lực
  skills: "",
  limits: "",

  // 9. Mối quan hệ & Vai trò
  roleInWorld: "",
  relatedCharacters: "",

  // 10. Anti-OOC Firewall
  antiOocRules: "",
};

/**
 * Template TRỐNG. Cũng vì lý do trên: bản cũ điền sẵn lore Nam Thành, NPC A-Yao,
 * cảnh mở đầu của Cố Dã Thần... tất cả đều là câu khẳng định đi thẳng vào prompt.
 */
export const DEFAULT_TEMPLATE_DATA: TemplateData = {
  userProfileFields: DEFAULT_USER_PROFILE_FIELDS,
  publicLore: "",
  hiddenLore: "",
  includeGameMechanics: false,
  gameMechanicsTitle: "",
  gameMechanicsContent: "",
  npcsText: "",
  worldbookAppendix: "",
  openingScene: "",
  customChecklistTone: "",
  customChecklistRules: "",
};
