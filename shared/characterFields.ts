/**
 * Danh sách trường hợp lệ của thẻ nhân vật + bộ lọc output AI.
 *
 * Tách riêng khỏi `aiContracts.ts` để client import được mà không kéo theo
 * toàn bộ prompt (chỉ cần thiết ở phía server) vào bundle trình duyệt.
 * Cả client, Express và Netlify function đều dùng chung file này, nên không có
 * chuyện hai bên hiểu khác nhau về "trường nào là hợp lệ".
 */

import type { CharacterData } from "../src/types";

/** 47 trường hợp lệ của một thẻ nhân vật. */
export const CHARACTER_FIELD_KEYS: (keyof CharacterData)[] = [
  "fullName", "aliases", "age", "gender", "species", "occupation", "birthplace", "extraInfo",
  "bodyAndFace", "hair", "eyes", "skinAndFeatures", "distinctiveMarks", "dailyOutfit",
  "specialOutfit", "accessories", "scent",
  "corePhilosophy", "detailedTraits", "psychologicalArc", "valuesAndFears", "likes",
  "dislikes", "smallHabits", "flaws",
  "backstory", "secrets", "trauma", "keyRelationships",
  "voiceTone", "addressRules", "catchphrases", "dialogueNormal", "dialogueHappy",
  "dialogueAngry", "dialogueSad", "dialogueFlustered",
  "withStrangers", "withFriends", "withEnemies", "withLovedOnes", "withUser",
  "shortTermGoal", "longTermGoal", "obstacles", "innerConflict",
  "skills", "limits",
  "roleInWorld", "relatedCharacters",
  "antiOocRules",
];

/**
 * Lọc output thô của AI, chỉ giữ lại các trường nhân vật hợp lệ có nội dung thật.
 *
 * Chặn ba thứ cùng lúc:
 * - Rác (`_meta`, `character`, key AI tự bịa) lọt vào dữ liệu người dùng.
 * - AI ghi đè một trường bạn đã viết bằng chuỗi rỗng.
 * - Response bọc trong `{ character: {...} }` khiến không trường nào được áp dụng.
 */
export function pickCharacterFields(raw: any): Partial<CharacterData> {
  if (!raw || typeof raw !== "object") return {};

  const source =
    raw.character && typeof raw.character === "object"
      ? raw.character
      : raw.data && typeof raw.data === "object"
      ? raw.data
      : raw;

  const picked: Partial<CharacterData> = {};
  for (const key of CHARACTER_FIELD_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      picked[key] = value.trim();
    } else if (Array.isArray(value) && value.length > 0) {
      // AI thỉnh thoảng trả mảng cho các trường dạng liệt kê
      const joined = value.filter((v) => typeof v === "string").join("\n");
      if (joined) picked[key] = joined;
    }
  }
  return picked;
}
