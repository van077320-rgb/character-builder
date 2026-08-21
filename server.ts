import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  executeWithRotationAndFallback,
  getRotationStatus,
  getApiKeys,
  GeminiExecutionError,
} from "./src/server/geminiRotationService";
// Prompt và hình dạng response dùng chung với netlify/functions/api.ts.
// Không viết prompt riêng ở file này.
import {
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
} from "./shared/aiContracts";

dotenv.config();

const app = express();
// Cho phép đổi cổng khi 3000 đã bị ứng dụng khác chiếm: PORT=3100 npm run dev
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// Health and System Status check (includes API Key pool count)
app.get("/api/health", (req: Request, res: Response) => {
  const keys = getApiKeys();
  res.json({
    status: "ok",
    aiEnabled: keys.length > 0,
    configuredKeysCount: keys.length,
    runtime: "express-dev",
  });
});

// Detailed status of Key Pool, Round-Robin Rotation and Fallback tiers
const handleStatus = (req: Request, res: Response) => {
  try {
    res.json(getRotationStatus());
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Không thể lấy trạng thái" });
  }
};
app.get("/api/gemini/status", handleStatus);
app.get("/api/gemini/rotation-status", handleStatus); // alias cũ, tương thích ngược

// Endpoint: General Chat / Prompt Execution with Round-Robin & Fallback
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const chatReq = buildChatRequest(req.body);

    if (!chatReq.contents) {
      return res.status(400).json({ error: "Thiếu nội dung prompt hoặc message." });
    }

    const execution = await executeWithRotationAndFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: chatReq.contents,
        config: {
          systemInstruction: chatReq.systemInstruction,
          temperature: chatReq.temperature,
          responseMimeType: chatReq.responseMimeType,
        },
      });
      return response.text || "";
    });

    return res.json({
      text: execution.data,
      modelUsed: execution.modelUsed,
      keyIndexUsed: execution.keyIndexUsed,
      keyMasked: execution.keyMasked,
      downgraded: execution.downgraded,
      retriesCount: execution.retriesCount,
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return res.status(500).json({
      error: error.message || "Lỗi khi xử lý yêu cầu AI chat.",
      // Dựa vào loại lỗi đã phân loại, không dò chuỗi "Limit:" trong thông báo nữa
      limitReached: error instanceof GeminiExecutionError && error.kind === "quota",
      failureKind: error instanceof GeminiExecutionError ? error.kind : undefined,
    });
  }
});

// Endpoint: Generate Full Character Card Concept
app.post("/api/gemini/generate-character", async (req: Request, res: Response) => {
  try {
    const { systemInstruction, userPrompt } = buildGenerateCharacterRequest(req.body);

    const execution = await executeWithRotationAndFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: { systemInstruction, responseMimeType: "application/json" },
      });
      return pickCharacterFields(safeExtractJson(response.text || "{}", {}));
    });

    // 200 mà không có trường nào là thất bại thật, không phải thành công rỗng
    if (Object.keys(execution.data).length === 0) {
      return res.status(502).json({
        error: "AI trả về dữ liệu không đúng định dạng thẻ nhân vật. Vui lòng thử lại.",
      });
    }

    return res.json({
      ...execution.data,
      _meta: {
        modelUsed: execution.modelUsed,
        keyIndexUsed: execution.keyIndexUsed,
        keyMasked: execution.keyMasked,
        downgraded: execution.downgraded,
      },
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: error.message || "Lỗi khi gọi AI Gemini" });
  }
});

// Endpoint: Suggest or Polish a Specific Field
app.post("/api/gemini/suggest-field", async (req: Request, res: Response) => {
  try {
    const prompt = buildSuggestFieldRequest(req.body);

    const execution = await executeWithRotationAndFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.85 },
      });
      return extractSuggestions(response.text || "");
    });

    if (execution.data.length === 0) {
      return res
        .status(502)
        .json({ error: "AI không trả về gợi ý phù hợp cho mục này. Vui lòng thử lại." });
    }

    return res.json({
      suggestions: execution.data,
      _meta: {
        modelUsed: execution.modelUsed,
        keyIndexUsed: execution.keyIndexUsed,
        downgraded: execution.downgraded,
      },
    });
  } catch (error: any) {
    console.error("Suggest field error:", error);
    return res.status(500).json({ error: error.message || "Lỗi khi gợi ý trường" });
  }
});

// Endpoint: Generate Template Elements (Lore, NPCs, Opening Scene, Mechanics)
app.post("/api/gemini/generate-template-section", async (req: Request, res: Response) => {
  const sectionType: TemplateSectionType = req.body?.sectionType || "mechanics";

  try {
    const prompt = buildTemplateSectionRequest({ ...req.body, sectionType });

    const execution = await executeWithRotationAndFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: TEMPLATE_SECTION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        },
      });
      return pickTemplateSectionFields(sectionType, safeExtractJson(response.text || "{}", {}));
    });

    if (!execution.data) {
      return res.status(502).json({
        error: `AI không trả về nội dung hợp lệ cho mục "${sectionType}". Vui lòng thử lại.`,
      });
    }

    return res.json({
      ...execution.data,
      _meta: {
        modelUsed: execution.modelUsed,
        keyIndexUsed: execution.keyIndexUsed,
        downgraded: execution.downgraded,
      },
    });
  } catch (error: any) {
    console.error("Template section error:", error);
    return res.status(500).json({ error: error.message || "Lỗi khi tạo phần template" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
