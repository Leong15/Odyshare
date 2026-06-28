import { Router, Request, Response } from "express";
import { getGenAI } from "./shared";

const router = Router();

// A. Chat Assistant for travel guidelines, hidden gems, transport
router.post("/chat-assistant", async (req: Request, res: Response) => {
  const { message, chatHistory } = req.body;
  const ai = getGenAI();

  if (!ai) {
    // Fail gracefully with specialized offline intelligent mock fallback
    return res.json({
      reply: `[AI Offline Companion Mode] I see you are asking about: "${message}". Connect your Gemini API key in Settings > Secrets to unlock full live recommendations! Here is a tip: In Tokyo, public transport (Pasmo/Suica) acts as a wallet for convenience; carry cash for small street food components.`
    });
  }

  try {
    const model = "gemini-3.5-flash";
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
      const errorString = String(err?.message || err || "").toLowerCase();
      const isRetryable = errorString.includes("503") || 
                          errorString.includes("429") || 
                          errorString.includes("unavailable") || 
                          errorString.includes("high demand") || 
                          err?.status === 503 ||
                          err?.status === 429 ||
                          err?.statusCode === 503 ||
                          err?.statusCode === 429;
      if (isRetryable) {
        console.warn(`Chat sendMessage failed, retrying once with gemini-3.1-flash-lite...`);
        const fallbackChat = ai.chats.create({
          model: "gemini-3.1-flash-lite",
          config: { systemInstruction },
          history: historyFormatted
        });
        response = await fallbackChat.sendMessage({ message });
      } else {
        throw err;
      }
    }

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Error calling Gemini API for travel chat, falling back to helper mode:", err);
    res.json({
      reply: `[Standby Mode] Tokyo possesses legendary travel infrastructure! Pasmo and Suica work smoothly as electronic transit money. Carry some yen cash for small street stalls/izakayas.`
    });
  }
});

export default router;
