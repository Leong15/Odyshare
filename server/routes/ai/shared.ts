import { GoogleGenAI } from "@google/genai";

// Lazy initialization pattern for Gemini API
let aiClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI | null {
  if (!aiClient) {
    let key = process.env.GEMINI_API_KEY;
    if (key) {
      key = key.trim();
      if (key.startsWith('"') && key.endsWith('"')) {
        key = key.slice(1, -1).trim();
      } else if (key.startsWith("'") && key.endsWith("'")) {
        key = key.slice(1, -1).trim();
      }
    }
    if (key && key !== "MY_GEMINI_API_KEY" && key !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      } catch (err) {
        console.error("Failed to initialize Gemini SDK:", err);
      }
    }
  }
  return aiClient;
}

export function isRetryableGeminiError(err: any): boolean {
  if (!err) return false;
  const errorString = String(err?.message || err || "").toLowerCase();
  return errorString.includes("503") || 
         errorString.includes("429") || 
         errorString.includes("unavailable") || 
         errorString.includes("high demand") || 
         err?.status === 503 ||
         err?.status === 429 ||
         err?.statusCode === 503 ||
         err?.statusCode === 429;
}

// Helper to perform Gemini generateContent calls with robust automatic retry and model fallback (e.g. to gemini-1.5-flash-8b on 503/429/high-demand)
export async function generateContentWithRetry(
  ai: GoogleGenAI, 
  params: { model: string; contents: any; config?: any }, 
  maxRetries = 2
): Promise<any> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errorString = String(err?.message || err || "").toLowerCase();
      
      if (isRetryableGeminiError(err) && attempt < maxRetries) {
        console.warn(`Gemini API call failed (attempt ${attempt}/${maxRetries}): ${errorString}. Retrying with gemini-1.5-flash-8b...`);
        params.model = "gemini-1.5-flash-8b";
        // Wait a bit (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
        continue;
      }
      throw err;
    }
  }
}

// Helper to generate natural sounding TTS audio from a text summary using gemini-2.5-flash-preview-tts
export async function generateTTSAudio(ai: GoogleGenAI, text: string): Promise<string | null> {
  try {
    const ttsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say naturally, warmly and professionally: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }
          }
        }
      }
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (err) {
    console.error("Failed to generate TTS audio in route:", err);
    return null;
  }
}

export interface GeminiParams {
  model: string;
  contents: any;
  config?: any;
}

// Shared Gemini call wrapper with consistent error handling
export async function callGemini<T>(
  ai: GoogleGenAI,
  params: GeminiParams,
  fallback: T,
  logLabel: string
): Promise<T> {
  try {
    const response = await generateContentWithRetry(ai, params);
    const parsed = JSON.parse(response.text || "{}");
    return parsed;
  } catch (err) {
    console.error(`[AI/${logLabel}] Gemini call failed, using fallback:`, err);
    return fallback;
  }
}
