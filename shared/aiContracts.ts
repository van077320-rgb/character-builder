/**
 * SINGLE SOURCE OF TRUTH cho mọi lời gọi Gemini.
 *
 * Cả `server.ts` (Express, dùng khi dev) và `netlify/functions/api.ts`
 * (Serverless, dùng trên production) đều PHẢI import từ file này.
 * Trước đây hai bên tự viết prompt và tự định hình response riêng, dẫn tới
 * việc nút AI chạy ngon ở local nhưng im lặng không làm gì trên production.
 *
 * Quy tắc: không được viết prompt hay đặt tên key response ở nơi nào khác.
 */

import type { CharacterData } from "../src/types";

export { CHARACTER_FIELD_KEYS, pickCharacterFields } from "./characterFields";

/** Đường dẫn API mà client gọi. Cả hai backend phải phục vụ đúng danh sách này. */
export const API_ROUTES = {
  health: "/health",
  status: "/gemini/status",
  chat: "/chat",
  generateCharacter: "/gemini/generate-character",
  suggestField: "/gemini/suggest-field",
  generateTemplateSection: "/gemini/generate-template-section",
} as const;

/** Bóc JSON từ phản hồi của AI, chịu được rào ```json và text thừa xung quanh. */
export function safeExtractJson<T = any>(text: string, defaultValue: T): T {
  if (!text) return defaultValue;
  try {
    return JSON.parse(text);
  } catch {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    }
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          /* bỏ qua, trả default bên dưới */
        }
      }
    }
  }
  return defaultValue;
}

/* ────────────────────────────────────────────────────────────
 * ROUTE: /chat
 * ──────────────────────────────────────────────────────────── */

export interface ChatRequest {
  prompt?: string;
  message?: string;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
}

export function buildChatRequest(body: ChatRequest) {
  const contents = body.message || body.prompt || "";
  return {
    contents,
    systemInstruction:
      body.systemInstruction || "Bạn là trợ lý AI thông minh, sáng tạo và chuẩn xác.",
    temperature: typeof body.temperature === "number" ? body.temperature : 0.8,
    responseMimeType: body.responseMimeType || undefined,
  };
}

/* ────────────────────────────────────────────────────────────
 * ROUTE: /gemini/generate-character
 * ──────────────────────────────────────────────────────────── */

export interface GenerateCharacterRequest {
  prompt?: string;
  genre?: string;
  archetype?: string;
  existingData?: Partial<CharacterData>;
}

export function buildGenerateCharacterRequest(body: GenerateCharacterRequest) {
  const systemInstruction = `Bạn là một chuyên gia sáng tạo nhân vật (Character Creator) và Game Master chuyên nghiệp cho kịch bản roleplay tiếng Việt.
Nhiệm vụ của bạn là xây dựng hồ sơ nhân vật (Character Card) cực kỳ chi tiết, sâu sắc, có hồn, không bị rập khuôn hay dùng sáo rỗng.
Các chi tiết cần bám sát văn phong tiểu thuyết, giàu tính gợi cảm giác (mùi hương, thói quen nhỏ, phản ứng cơ thể, ví dụ thoại đặc trưng).
Hãy trả về JSON theo đúng định dạng được yêu cầu.`;

  const userPrompt = `Hãy tạo một bộ thông tin nhân vật chi tiết dựa trên yêu cầu sau:
- Ý tưởng cốt lõi / Gợi ý của người dùng: ${body.prompt || "Nhân vật độc đáo, có chiều sâu"}
- Thể loại: ${body.genre || "Tự do / Đa dạng"}
- Hình mẫu / Archetype: ${body.archetype || "Tự do"}
${body.existingData ? `- Dữ liệu đã có từ trước (nếu có thì tiếp tục phát triển dựa trên đây): ${JSON.stringify(body.existingData)}` : ""}

Hãy điền đầy đủ và sáng tạo cho tất cả 10 mục của Thẻ Nhân Vật:
1. Thông tin cơ bản:
   - fullName: Tên đầy đủ / thường gọi
   - aliases: Biệt danh, danh hiệu
   - age: Tuổi thật và tuổi ngoại hình (ví dụ: "300 tuổi (ngoại hình 25)")
   - gender: Giới tính
   - species: Chủng loài (VD: Nhân loại, Huyết tộc, Ma tộc, v.v.)
   - occupation: Nghề nghiệp / Thân phận / Địa vị
   - birthplace: Nơi sinh / Nơi ở hiện tại
   - extraInfo: Ngày sinh, gia cảnh, tình trạng hôn nhân...
2. Ngoại hình:
   - bodyAndFace: Chiều cao, cân nặng, dáng người, tỷ lệ cơ thể
   - hair: Màu tóc, độ dài, kiểu tóc
   - eyes: Màu mắt, hình dáng, ánh nhìn đặc trưng
   - skinAndFeatures: Da, tay, chân, dáng đi/đứng
   - distinctiveMarks: Sẹo, hình xăm, nốt ruồi, đặc điểm nhận diện riêng
   - dailyOutfit: Trang phục thường ngày
   - specialOutfit: Trang phục hoàn cảnh đặc biệt (chiến đấu, dạ hội, ở nhà...)
   - accessories: Phụ kiện, vũ khí hoặc vật bất ly thân
   - scent: Mùi hương đặc trưng (ví dụ: gỗ đàn hương trộn sương đêm, hương thuốc lá pha bạc hà)
3. Tâm lý & Tính cách:
   - corePhilosophy: Bản chất cốt lõi (1 câu đúc kết triết lý sống / bản chất sâu nhất)
   - detailedTraits: Danh sách tính cách chi tiết kèm biểu hiện hành vi cụ thể (không chỉ tính từ)
   - psychologicalArc: Trạng thái tâm lý ban đầu, điều kiện biến chuyển, diễn biến
   - valuesAndFears: Giá trị coi trọng nhất, ranh giới đạo đức tuyệt đối, nỗi sợ sâu kín nhất
   - likes: Những điều thích
   - dislikes: Những điều ghét
   - smallHabits: Thói quen nhỏ hằng ngày và biểu hiện khi căng thẳng / ngại / vui
   - flaws: Điểm yếu, khiếm khuyết tính cách và rắc rối mà nó mang lại
4. Bối cảnh & Quá khứ:
   - backstory: Tóm tắt tiểu sử và sự kiện bước ngoặt cuộc đời
   - secrets: Bí mật đang giấu kín, ai biết / ai không biết
   - trauma: Chấn thương tâm lý và ảnh hưởng hiện tại
   - keyRelationships: Các mối quan hệ quan trọng trong quá khứ
5. Cách nói chuyện:
   - voiceTone: Chất giọng và tông điệu tổng thể
   - addressRules: Cách xưng hô với từng đối tượng (bản thân xưng gì, gọi người khác là gì)
   - catchphrases: Câu cửa miệng, từ đệm quen thuộc
   - dialogueNormal: Ví dụ câu thoại khi bình thường
   - dialogueHappy: Ví dụ câu thoại khi vui
   - dialogueAngry: Ví dụ câu thoại khi tức giận
   - dialogueSad: Ví dụ câu thoại khi buồn / tổn thương
   - dialogueFlustered: Ví dụ câu thoại khi ngại ngùng / mất bình tĩnh
6. Cách hành xử theo đối tượng:
   - withStrangers: Với người lạ
   - withFriends: Với người quen / bạn bè
   - withEnemies: Với kẻ thù / đối thủ
   - withLovedOnes: Với người đặc biệt / người yêu thương
   - withUser: Với {{user}} (thái độ ban đầu và cách thay đổi theo diễn biến quan hệ)
7. Mục tiêu, động lực & Xung đột nội tâm:
   - shortTermGoal: Mục tiêu ngắn hạn
   - longTermGoal: Mục tiêu dài hạn / khát khao sâu xa
   - obstacles: Điều cản trở mục tiêu
   - innerConflict: Giằng xé nội tâm
8. Kỹ năng & Năng lực đặc biệt:
   - skills: Kỹ năng / sở trường / siêu năng lực / ma pháp
   - limits: Giới hạn hoặc điểm yếu của năng lực
9. Mối quan hệ & Vai trò:
   - roleInWorld: Vai trò trong bối cảnh chung (chính diện / phản diện / trung lập / phản anh hùng...)
   - relatedCharacters: Các nhân vật liên quan
10. Anti-OOC Firewall:
   - antiOocRules: Các nguyên tắc giữ nhân vật không bị lệch tính cách (OOC)`;

  return { systemInstruction, userPrompt };
}

/* ────────────────────────────────────────────────────────────
 * ROUTE: /gemini/suggest-field
 * ──────────────────────────────────────────────────────────── */

export interface SuggestFieldRequest {
  fieldKey?: string;
  fieldLabel?: string;
  characterContext?: Partial<CharacterData> & { genre?: string };
  userHint?: string;
}

export function buildSuggestFieldRequest(body: SuggestFieldRequest) {
  const ctx = body.characterContext;
  return `Bạn là cố vấn thiết kế nhân vật roleplay tiếng Việt.
Nhân vật hiện tại:
- Tên: ${ctx?.fullName || "Chưa đặt"}
- Thân phận: ${ctx?.occupation || "Không rõ"}
- Tính cách cốt lõi: ${ctx?.corePhilosophy || ctx?.detailedTraits || "Chưa rõ"}
- Thể loại: ${ctx?.genre || "Tự do"}

Yêu cầu: Hãy gợi ý 3 đến 5 phương án sáng tạo, ngắn gọn, đặc sắc và sâu sắc cho mục: "${body.fieldLabel}" (key: ${body.fieldKey}).
Gợi ý bổ sung từ người dùng: ${body.userHint || "Không có, hãy tự do sáng tạo những ý tưởng độc đáo và cuốn hút nhất"}.

Trả về kết quả định dạng JSON:
{
  "suggestions": [
    "Phương án 1...",
    "Phương án 2...",
    "Phương án 3..."
  ]
}`;
}

/**
 * Chuẩn hoá danh sách gợi ý từ text thô của AI.
 * Nếu JSON hỏng thì bóc theo từng dòng thay vì trả mảng rỗng im lặng.
 */
export function extractSuggestions(text: string): string[] {
  const parsed = safeExtractJson<{ suggestions?: unknown }>(text, {});
  if (Array.isArray(parsed.suggestions)) {
    const list = parsed.suggestions.filter(
      (s): s is string => typeof s === "string" && s.trim().length > 0
    );
    if (list.length > 0) return list.slice(0, 5);
  }

  return text
    .split("\n")
    .map((l) => l.replace(/^[-*•\d+.]\s*/, "").replace(/^"|"$/g, "").trim())
    .filter(
      (l) => l.length > 3 && !l.startsWith("{") && !l.startsWith("}") && !l.includes("suggestions")
    )
    .slice(0, 5);
}

/* ────────────────────────────────────────────────────────────
 * ROUTE: /gemini/generate-template-section
 * ──────────────────────────────────────────────────────────── */

export type TemplateSectionType = "lore" | "opening_scene" | "npcs" | "mechanics";

export interface TemplateSectionRequest {
  sectionType?: TemplateSectionType;
  characterData?: Partial<CharacterData>;
  userPersona?: { name?: string; occupation?: string; appearance?: string };
  extraPrompt?: string;
}

/**
 * Các key mà client thực sự đọc cho từng loại section.
 * Dùng để kiểm tra response trước khi trả về — nếu AI trả JSON không có key nào
 * trong đây thì coi như thất bại, KHÔNG trả 200 rỗng.
 */
export const TEMPLATE_SECTION_KEYS: Record<TemplateSectionType, string[]> = {
  lore: ["publicLore", "hiddenLore", "worldbookAppendix"],
  opening_scene: ["openingScene"],
  npcs: ["npcsText"],
  mechanics: ["mechanicsTitle", "mechanicsContent"],
};

export const TEMPLATE_SECTION_SYSTEM_INSTRUCTION =
  "Bạn là Game Master và nhà văn roleplay tương tác tiếng Việt tài ba.";

export function buildTemplateSectionRequest(body: TemplateSectionRequest): string {
  const { sectionType, characterData, userPersona, extraPrompt } = body;

  if (sectionType === "lore") {
    return `Dựa trên nhân vật sau:
Tên: ${characterData?.fullName}
Thân phận: ${characterData?.occupation}
Tính cách: ${characterData?.corePhilosophy}
Quá khứ: ${characterData?.backstory}

Hãy viết:
1. Lore công khai (Public Lore): bối cảnh thế giới, những thông tin mọi người đều biết.
2. Lore ẩn (Hidden Lore): bí mật ngầm, âm mưu, thân phận thực sự chỉ Narrator/GM biết.
3. Worldbook Appendix: tài liệu tham khảo thế giới (địa danh, thuật ngữ, luật lệ thế giới).
Gợi ý người dùng: ${extraPrompt || "Hãy làm cho thế giới có chiều sâu và không gian tương tác hấp dẫn"}

Trả về JSON:
{
  "publicLore": "...",
  "hiddenLore": "...",
  "worldbookAppendix": "..."
}`;
  }

  if (sectionType === "opening_scene") {
    return `Dựa trên thông tin:
- Nhân vật {{char}}: ${characterData?.fullName} (${characterData?.occupation}, tính cách: ${characterData?.corePhilosophy})
- Nhân vật {{user}}: ${userPersona?.name || "{{user}}"} (${userPersona?.occupation || "Chưa rõ"}, ngoại hình/thông tin: ${userPersona?.appearance || "Tự do"})
- Bối cảnh / Tình huống mong muốn: ${extraPrompt || "Một cảnh mở đầu kịch tính, cuốn hút hoặc tạo cảm giác bầu không khí dày đặc giữa hai nhân vật"}

Hãy viết phân cảnh mở đầu (<opening_scene>) cho roleplay:
Lưu ý quan trọng:
- Bắt đầu với [địa điểm, thời gian trong thế giới]
- Sử dụng góc nhìn ngôi thứ ba.
- Miêu tả chi tiết bầu không khí, giác quan (mùi hương, âm thanh, ánh sáng), hành động của {{char}} hoặc môi trường xung quanh.
- Tuyệt đối không điều khiển suy nghĩ hay lời thoại của {{user}}.
- Dùng placeholder {{user}} khi nhắc đến người chơi.

Trả về JSON:
{
  "openingScene": "..."
} `;
  }

  if (sectionType === "npcs") {
    return `Dựa trên nhân vật ${characterData?.fullName} (${characterData?.occupation}) và bối cảnh truyện, hãy tạo 2-3 NPC sống động có vai trò hỗ trợ hoặc tạo xung đột trong kịch bản.
Mỗi NPC cần có: Tên, Tuổi, Thân phận, Tính cách, Bí mật ẩn giấu (Secret Lock - điều gì kích hoạt phản ứng đặc biệt khi {{user}} chạm tới).
Gợi ý thêm: ${extraPrompt || "Các NPC đa dạng tính cách và quan hệ"}

Trả về JSON:
{
  "npcsText": "..."
}`;
  }

  return `Dựa trên nhân vật ${characterData?.fullName} và ý tưởng: ${extraPrompt || "Cơ chế theo dõi quan hệ/tiến trình"}, hãy thiết kế Game Mechanics ngắn gọn, dễ áp dụng cho roleplay (ví dụ: timeline, chỉ số thiện cảm, tiến trình sự kiện, ranh giới an toàn, hoặc cơ chế ma pháp/sinh tồn).

Trả về JSON:
{
  "mechanicsTitle": "...",
  "mechanicsContent": "..."
}`;
}

/**
 * Chỉ giữ lại những key mà client thực sự đọc cho loại section này.
 * Trả về `null` nếu AI không đưa ra được key nào — để backend báo lỗi thật
 * thay vì trả 200 với object rỗng (nút bấm xong không có gì thay đổi).
 */
export function pickTemplateSectionFields(
  sectionType: TemplateSectionType | undefined,
  raw: any
): Record<string, string> | null {
  const keys = TEMPLATE_SECTION_KEYS[sectionType || "mechanics"];
  if (!raw || typeof raw !== "object") return null;

  const picked: Record<string, string> = {};
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      picked[key] = value.trim();
    }
  }
  return Object.keys(picked).length > 0 ? picked : null;
}
