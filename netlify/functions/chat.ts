/**
 * Endpoint tương thích ngược: /.netlify/functions/chat
 *
 * Trước đây file này là bản sao thứ ba của logic xoay key + gọi Gemini, tự trôi
 * lệch khỏi `server.ts` và `api.ts`. Nay nó chỉ chuyển tiếp sang handler chính
 * để cả dự án chỉ còn đúng MỘT bản logic.
 *
 * Client nên gọi `/api/chat`. Giữ file này để link cũ không gãy.
 */

import { handler as apiHandler } from "./api";

export const handler = async (event: any) =>
  apiHandler({ ...event, path: "/api/chat", rawUrl: undefined });
