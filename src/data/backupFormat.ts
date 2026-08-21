/**
 * ĐỊNH DẠNG SAO LƯU DÙNG CHUNG.
 *
 * Trước đây có hai nơi ghi backup theo hai định dạng khác nhau:
 *   - Nút "Sao Lưu JSON" trong Lịch sử  -> mảng thuần [item, item, ...]
 *   - Nút "Sao Lưu Thư Viện" lên Drive  -> object { items: [...], ... }
 * còn hàm import thì chỉ chấp nhận mảng. Hệ quả: file backup do chính app tạo
 * ra trên Drive bị từ chối khi khôi phục.
 *
 * Nay: `buildBackupPayload()` là nơi DUY NHẤT tạo file backup, `parseBackupFile()`
 * là nơi DUY NHẤT đọc, và nó đọc được cả định dạng cũ lẫn mới.
 */

import type { CharacterData, TemplateData, SavedHistoryItem } from "../types";
import { initialCharacterData, initialTemplateData } from "./templateConstants";

export const BACKUP_APP_ID = "Character & Roleplay Prompt Studio";
export const BACKUP_VERSION = 2;

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  totalItems: number;
  items: SavedHistoryItem[];
  currentCharacter?: CharacterData;
  charactersList?: CharacterData[];
  currentTemplate?: TemplateData;
}

/** Tạo nội dung file backup. Mọi nơi ghi backup đều phải đi qua hàm này. */
export function buildBackupPayload(input: {
  historyItems: SavedHistoryItem[];
  characterData?: CharacterData;
  charactersList?: CharacterData[];
  templateData?: TemplateData;
}): BackupPayload {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    totalItems: input.historyItems.length,
    items: input.historyItems,
    currentCharacter: input.characterData,
    charactersList: input.charactersList,
    currentTemplate: input.templateData,
  };
}

/** Sinh id mới cho bản ghi thiếu id (file backup cũ hoặc bị sửa tay). */
function makeId(): string {
  return "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}

/**
 * Chuẩn hoá một bản ghi lịch sử về đúng shape đầy đủ.
 *
 * Quan trọng: luôn trả về `characterData` có đủ 47 trường (đắp lên
 * `initialCharacterData`). Trước đây danh sách lịch sử gọi thẳng
 * `item.characterData.occupation.toLowerCase()`, chỉ cần một bản ghi thiếu
 * trường là cả tab Lịch sử trắng màn hình.
 *
 * Trả `null` nếu bản ghi hỏng tới mức không cứu được.
 */
export function normalizeHistoryItem(raw: any): SavedHistoryItem | null {
  if (!raw || typeof raw !== "object") return null;

  const hasCharacter = raw.characterData && typeof raw.characterData === "object";
  const hasList = Array.isArray(raw.charactersList) && raw.charactersList.length > 0;
  if (!hasCharacter && !hasList) return null;

  const characterData: CharacterData = {
    ...initialCharacterData,
    ...(hasCharacter ? raw.characterData : raw.charactersList[0]),
  };

  const charactersList: CharacterData[] | undefined = hasList
    ? raw.charactersList.map((c: any) => ({ ...initialCharacterData, ...(c || {}) }))
    : undefined;

  const type: SavedHistoryItem["type"] =
    raw.type === "full_template" || raw.type === "character_only"
      ? raw.type
      : raw.templateData
      ? "full_template"
      : "character_only";

  const createdAt = raw.createdAt || new Date().toISOString();

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : makeId(),
    type,
    title:
      (typeof raw.title === "string" && raw.title.trim()) ||
      characterData.fullName ||
      "Bản ghi chưa đặt tên",
    characterName:
      (typeof raw.characterName === "string" && raw.characterName.trim()) ||
      characterData.fullName ||
      "Nhân vật ẩn danh",
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
    characterData,
    charactersList,
    templateData: raw.templateData
      ? { ...initialTemplateData, ...raw.templateData }
      : undefined,
    customCardText: typeof raw.customCardText === "string" ? raw.customCardText : undefined,
    customFullTemplateText:
      typeof raw.customFullTemplateText === "string" ? raw.customFullTemplateText : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((x: any) => typeof x === "string") : undefined,
    isFavorite: typeof raw.isFavorite === "boolean" ? raw.isFavorite : undefined,
  };
}

export interface ParsedBackup {
  items: SavedHistoryItem[];
  currentCharacter?: CharacterData;
  charactersList?: CharacterData[];
  currentTemplate?: TemplateData;
  /** Số bản ghi bị bỏ vì hỏng — hiện cho người dùng biết thay vì nuốt im. */
  skipped: number;
  /** Mô tả nguồn file để hiện trong hộp xác nhận. */
  sourceLabel: string;
}

/**
 * Đọc file backup. Chấp nhận cả ba định dạng đã từng tồn tại:
 *   1. Mảng thuần                       (nút "Sao Lưu JSON" bản cũ)
 *   2. { items: [...] }                 (backup Drive, kể cả bản cũ không có `version`)
 *   3. { historyItems: [...] }          (phòng khi có biến thể khác)
 *
 * Ném Error kèm lý do cụ thể nếu không đọc được — không trả mảng rỗng im lặng.
 */
export function parseBackupFile(rawText: string): ParsedBackup {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("File không phải JSON hợp lệ. Hãy chọn đúng file .json do app xuất ra.");
  }

  let rawItems: any[] | null = null;
  let sourceLabel = "";
  let currentCharacter: CharacterData | undefined;
  let charactersList: CharacterData[] | undefined;
  let currentTemplate: TemplateData | undefined;

  if (Array.isArray(parsed)) {
    rawItems = parsed;
    sourceLabel = "file sao lưu JSON (định dạng cũ)";
  } else if (parsed && typeof parsed === "object") {
    const list = Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.historyItems)
      ? parsed.historyItems
      : null;

    if (!list) {
      throw new Error(
        "File JSON không chứa danh sách bản ghi nào (thiếu trường 'items'). Đây có thể không phải file sao lưu của app."
      );
    }

    rawItems = list;
    sourceLabel = parsed.exportedAt
      ? `bản sao lưu ngày ${new Date(parsed.exportedAt).toLocaleDateString("vi-VN")}`
      : "bản sao lưu thư viện";

    if (parsed.currentCharacter && typeof parsed.currentCharacter === "object") {
      currentCharacter = { ...initialCharacterData, ...parsed.currentCharacter };
    }
    if (Array.isArray(parsed.charactersList) && parsed.charactersList.length > 0) {
      charactersList = parsed.charactersList.map((c: any) => ({
        ...initialCharacterData,
        ...(c || {}),
      }));
    }
    if (parsed.currentTemplate && typeof parsed.currentTemplate === "object") {
      currentTemplate = { ...initialTemplateData, ...parsed.currentTemplate };
    }
  } else {
    throw new Error("Nội dung file không phải danh sách hay object sao lưu.");
  }

  const items: SavedHistoryItem[] = [];
  let skipped = 0;
  for (const raw of rawItems) {
    const item = normalizeHistoryItem(raw);
    if (item) items.push(item);
    else skipped++;
  }

  if (items.length === 0) {
    throw new Error(
      skipped > 0
        ? `Đọc được ${skipped} mục nhưng không mục nào có dữ liệu nhân vật hợp lệ.`
        : "File sao lưu không có bản ghi nào."
    );
  }

  return { items, currentCharacter, charactersList, currentTemplate, skipped, sourceLabel };
}

/**
 * Gộp bản ghi nhập vào với bản ghi đang có, KHÔNG xoá gì của người dùng.
 * Trùng id thì giữ bản mới hơn theo `updatedAt`.
 */
export function mergeHistoryItems(
  existing: SavedHistoryItem[],
  incoming: SavedHistoryItem[]
): { merged: SavedHistoryItem[]; added: number; updated: number } {
  const byId = new Map<string, SavedHistoryItem>();
  for (const item of existing) byId.set(item.id, item);

  let added = 0;
  let updated = 0;

  for (const item of incoming) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      added++;
      continue;
    }
    const currentTime = new Date(current.updatedAt || current.createdAt).getTime();
    const incomingTime = new Date(item.updatedAt || item.createdAt).getTime();
    if (incomingTime > currentTime) {
      byId.set(item.id, item);
      updated++;
    }
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );

  return { merged, added, updated };
}
