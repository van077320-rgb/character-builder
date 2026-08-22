/**
 * Netlify Serverless API — production backend.
 *
 * File này KHÔNG được tự viết prompt hay tự đặt tên key response.
 * Toàn bộ prompt và hình dạng dữ liệu lấy từ `shared/aiContracts.ts`,
 * toàn bộ logic xoay key lấy từ `src/server/geminiRotationService.ts`,
 * đúng y hệt những gì `server.ts` (Express, môi trường dev) đang dùng.
 * Nhờ vậy thứ chạy được ở local chắc chắn chạy được sau khi deploy.
 */

import {
  EmptyResponseError,
  executeWithRotationAndFallback,
  GeminiExecutionError,
  getRotationStatus,
  getApiKeys,
} from "../../src/server/geminiRotationService";
import {
  API_ROUTES,
  buildChatRequest,
  buildGenerateCharacterRequest,
  buildSuggestFieldRequest,
  buildTemplateSectionRequest,
  extractSuggestions,
  pickCharacterFields,
  pickTemplateSectionFields,
  safeExtractJson,
  TEMPLATE_SECTION_SYSTEM_INSTRUCTION,
  type TemplateSectionType,
} from "../../shared/aiContracts";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (statusCode: number, payload: unknown) => ({
  statusCode,
  headers,
  body: JSON.stringify(payload),
});

/**
 * Netlify giết function đồng bộ ở giây thứ 60 (mọi gói đều vậy, không chỉnh
 * được). Khi bị giết, client nhận về trang HTML thay vì JSON nên không thể biết
 * lý do. Dừng sớm hơn mốc đó vài giây để còn kịp trả về một lỗi JSON đọc được.
 */
const FUNCTION_BUDGET_MS = Number(process.env.FUNCTION_BUDGET_MS || 55000);

/** Tuỳ chọn dùng chung cho mọi lượt gọi qua vòng xoay trong file này. */
const ROTATION_OPTIONS = { budgetMs: FUNCTION_BUDGET_MS };

/**
 * Chuẩn hoá path về dạng route nội bộ, chịu được cả hai kiểu Netlify gửi tới:
 *   /api/gemini/status
 *   /.netlify/functions/api/gemini/status
 * Ưu tiên `event.rawUrl` vì `event.path` có thể bị rewrite làm mất phần đuôi.
 */
function normalizePath(event: any): string {
  let raw: string = event.path || "";

  if (event.rawUrl) {
    try {
      raw = new URL(event.rawUrl).pathname;
    } catch {
      /* giữ nguyên event.path */
    }
  }

  let path = raw
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "")
    .replace(/\/+$/, "");

  if (!path.startsWith("/")) path = "/" + path;
  return path === "/" ? API_ROUTES.health : path;
}

/** Các route hợp lệ và method tương ứng. */
const ROUTE_METHODS: Record<string, "GET" | "POST"> = {
  [API_ROUTES.health]: "GET",
  [API_ROUTES.status]: "GET",
  "/gemini/rotation-status": "GET", // alias cũ, giữ lại cho tương thích ngược
  [API_ROUTES.chat]: "POST",
  [API_ROUTES.generateCharacter]: "POST",
  [API_ROUTES.suggestField]: "POST",
  [API_ROUTES.generateTemplateSection]: "POST",
};

export const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const path = normalizePath(event);
  const expectedMethod = ROUTE_METHODS[path];

  // Route không tồn tại -> 404 (trước đây trả 405 gây hiểu nhầm là sai method)
  if (!expectedMethod) {
    return json(404, {
      error: `Endpoint '${path}' không tồn tại.`,
      availableRoutes: Object.keys(ROUTE_METHODS),
    });
  }

  // Route có thật nhưng sai method -> 405 (kể cả /health, không còn nuốt POST)
  if (event.httpMethod !== expectedMethod) {
    return json(405, {
      error: `Endpoint '${path}' chỉ chấp nhận ${expectedMethod}, nhận được ${event.httpMethod}.`,
    });
  }

  try {
    if (path === API_ROUTES.health) {
      const keys = getApiKeys();
      return json(200, {
        status: "ok",
        aiEnabled: keys.length > 0,
        configuredKeysCount: keys.length,
        runtime: "netlify-functions",
      });
    }

    if (path === API_ROUTES.status || path === "/gemini/rotation-status") {
      return json(200, getRotationStatus());
    }

    const body: any = safeExtractJson<any>(event.body || "{}", {});

    if (path === API_ROUTES.chat) {
      const req = buildChatRequest(body);
      if (!req.contents) {
        return json(400, { error: "Thiếu nội dung prompt hoặc message." });
      }

      const execution = await executeWithRotationAndFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: req.contents,
          config: {
            systemInstruction: req.systemInstruction,
            temperature: req.temperature,
            responseMimeType: req.responseMimeType,
          },
        });

        // 200 kèm body rỗng (thường do bộ lọc an toàn chặn) là THẤT BẠI, không
        // phải thành công rỗng. Bản trước `return response.text || ""` khiến
        // người dùng thấy ô trống mà không có lỗi nào để lần.
        const text = (response.text || "").trim();
        if (!text) {
          throw new EmptyResponseError(
            `Model ${model} trả về nội dung rỗng (thường do bộ lọc an toàn chặn prompt).`
          );
        }
        return text;
      }, ROTATION_OPTIONS);

      return json(200, {
        text: execution.data,
        modelUsed: execution.modelUsed,
        keyIndexUsed: execution.keyIndexUsed,
        keyMasked: execution.keyMasked,
        downgraded: execution.downgraded,
        retriesCount: execution.retriesCount,
      });
    }

    if (path === API_ROUTES.generateCharacter) {
      const { systemInstruction, userPrompt } = buildGenerateCharacterRequest(body);

      const execution = await executeWithRotationAndFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: { systemInstruction, responseMimeType: "application/json" },
        });
        // Không có trường nào là THẤT BẠI, và phải báo từ TRONG vòng xoay.
        // Kiểm ở ngoài thì vòng xoay đã kịp tính đây là một lần thành công rồi
        // trả về, nên vừa hỏng thống kê vừa bỏ phí các tầng model dự phòng.
        const picked = pickCharacterFields(safeExtractJson(response.text || "{}", {}));
        if (Object.keys(picked).length === 0) {
          throw new EmptyResponseError(
            `Model ${model} không trả về dữ liệu đúng định dạng thẻ nhân vật.`
          );
        }
        return picked;
      }, ROTATION_OPTIONS);

      return json(200, {
        ...execution.data,
        _meta: {
          modelUsed: execution.modelUsed,
          keyIndexUsed: execution.keyIndexUsed,
          keyMasked: execution.keyMasked,
          downgraded: execution.downgraded,
        },
      });
    }

    if (path === API_ROUTES.suggestField) {
      const prompt = buildSuggestFieldRequest(body);

      const execution = await executeWithRotationAndFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.85 },
        });
        // `extractSuggestions` GIỮ NGUYÊN nhánh cào từng dòng text khi JSON hỏng —
        // đó là hành vi cố ý, không phải lỗi. Chỉ khi cào xong vẫn không còn dòng
        // nào dùng được mới coi là thất bại và để vòng xoay hạ model thử lại.
        const suggestions = extractSuggestions(response.text || "");
        if (suggestions.length === 0) {
          throw new EmptyResponseError(`Model ${model} không trả về gợi ý nào dùng được.`);
        }
        return suggestions;
      }, ROTATION_OPTIONS);

      return json(200, {
        suggestions: execution.data,
        _meta: {
          modelUsed: execution.modelUsed,
          keyIndexUsed: execution.keyIndexUsed,
          downgraded: execution.downgraded,
        },
      });
    }

    if (path === API_ROUTES.generateTemplateSection) {
      const sectionType: TemplateSectionType = body.sectionType || "mechanics";
      const prompt = buildTemplateSectionRequest({ ...body, sectionType });

      const execution = await executeWithRotationAndFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: TEMPLATE_SECTION_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
          },
        });
        const picked = pickTemplateSectionFields(
          sectionType,
          safeExtractJson(response.text || "{}", {})
        );
        if (!picked) {
          throw new EmptyResponseError(
            `Model ${model} không trả về nội dung hợp lệ cho mục "${sectionType}".`
          );
        }
        return picked;
      }, ROTATION_OPTIONS);

      return json(200, {
        ...execution.data,
        _meta: {
          modelUsed: execution.modelUsed,
          keyIndexUsed: execution.keyIndexUsed,
          downgraded: execution.downgraded,
        },
      });
    }

    return json(404, { error: `Endpoint '${path}' chưa được cài đặt.` });
  } catch (err: any) {
    console.error(`[Netlify API Error] ${path}:`, err?.message || err);

    // Trả đúng mã theo loại lỗi thay vì 500 cho mọi thứ: hết quota là 429, hết
    // giờ là 504, AI trả rỗng là 502. Client phân biệt được "chờ rồi thử lại"
    // với "cấu hình sai" mà không phải dò chuỗi trong thông báo.
    if (err instanceof GeminiExecutionError) {
      return json(err.httpStatus, {
        error: err.message,
        failureKind: err.kind,
        limitReached: err.kind === "quota",
      });
    }

    return json(500, { error: err?.message || "Lỗi xử lý serverless trên Netlify" });
  }
};
