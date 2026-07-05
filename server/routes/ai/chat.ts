import { Router, Request, Response } from "express";
import { getGenAI, isRetryableGeminiError } from "./shared.js";
import { ok, fail } from "../../utils/apiResponse.js";

const router = Router();

// A. Chat Assistant for travel guidelines, hidden gems, transport
router.post("/chat-assistant", async (req: Request, res: Response) => {
  const { message, chatHistory } = req.body;
  const ai = getGenAI();

  if (!ai) {
    // Fail gracefully with specialized offline intelligent mock fallback
    const fallbackText = `[AI Offline Companion Mode] I see you are asking about: "${message}". Connect your Gemini API key in Settings > Secrets to unlock full live recommendations! Here is a tip: In Tokyo, public transport (Pasmo/Suica) acts as a wallet for convenience; carry cash for small street food components.`;
    return res.json(ok({
      reply: fallbackText,
      response: fallbackText
    }));
  }

  try {
    const model = "gemini-1.5-flash";
    const historyFormatted = (chatHistory || []).map((h: any) => ({
      role: h.senderId === "u1" ? "user" : "model",
      parts: [{ text: h.messageDecrypted || h.text || "" }]
    }));

    const systemInstruction = "You are OdyShareSmart, an expert AI Group Travel Coordinator. Your voice is supportive, concise, and incredibly knowledgeable. Keep answers under 120 words. Focus on practical insights, optimal route order, traffic alerts, and budget-saving flight/boarding opportunities.";

    const chat = ai.chats.create({
      model,
      config: { systemInstruction },
      history: historyFormatted
    });

    let response;
    try {
      response = await chat.sendMessage({ message });
    } catch (err: any) {
      if (isRetryableGeminiError(err)) {
        console.warn(`Chat sendMessage failed, retrying once with gemini-1.5-flash-8b...`);
        const fallbackChat = ai.chats.create({
          model: "gemini-1.5-flash-8b",
          config: { systemInstruction },
          history: historyFormatted
        });
        response = await fallbackChat.sendMessage({ message });
      } else {
        throw err;
      }
    }

    res.json(ok({ response: response.text, reply: response.text }));
  } catch (err: any) {
    console.error("Error calling Gemini API for travel chat, falling back to helper mode:", err);
    const standbyText = `[Standby Mode] Tokyo possesses legendary travel infrastructure! Pasmo and Suica work smoothly as electronic transit money. Carry some yen cash for small street stalls/izakayas.`;
    res.json(ok({
      reply: standbyText,
      response: standbyText
    }));
  }
});

export default router;
