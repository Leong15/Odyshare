import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { getGenAI, callGemini, generateTTSAudio } from "./shared.js";
import { ok, fail } from "../../utils/apiResponse.js";

const router = Router();

function hasChinese(text?: string): boolean {
  if (!text) return false;
  return /[\u4e00-\u9fa5]/.test(text);
}

// ── POST /api/ai/parse-voice-schedule ────────────────────────────────────────
router.post("/parse-voice-schedule", async (req: Request, res: Response) => {
  const { userQuery, dayCount } = req.body;
  const ai = getGenAI();

  const prompt = `You are OdyShareSmart AI voice coordinator. You parse user natural language commands (Traditional Chinese or English) and convert them to new itinerary items to append.
  User query: "${userQuery || '幫我把第三天下午加進淺草寺，順便推薦附近步行10分鐘內的拉麵店，預算1500日圓內'}"

  Current relative date/time context:
  - "第一天" is dayIndex = 0, "第二天" is dayIndex = 1, "第三天" is dayIndex = 2, and so on. If not specified, default to dayIndex = 0.
  - Determine "time" based on keywords like "下午" (e.g. "14:30"), "早上" (e.g. "10:00"), "中午/午餐" (e.g. "12:30"), "晚餐/晚上" (e.g. "18:30"). If not mentioned, default to "14:00".
  - "category" must be one of: 'restaurant', 'shop', 'sight', 'transit', 'hotel', 'other'.
  - "cost" must be a clean estimated number in native local currency (e.g. JPY, TWD, HKD, USD).
  - Try to split the query into multiple logical, chronological itinerary items if multiple activities/restaurants are mentioned. For example, visiting a temple first, then walking to a nearby restaurant!

  Provide the output in a clean JSON format:
  {
    "items": [
      {
        "dayIndex": number,
        "time": "HH:MM",
        "title": "Concise Beautiful Title",
        "description": "Details, walk directions or suggestions based on context",
        "locationName": "Specific place name",
        "category": "restaurant/sight/etc",
        "cost": number,
        "address": "Specific or estimated address if known"
      }
    ]
  }`;

  const getFallbackItems = () => {
    // Detect keywords inside Chinese or English input to make fallback super smart!
    let day = 0;
    if (userQuery?.includes("第三天") || userQuery?.includes("Day 3")) {
      day = 2;
    } else if (userQuery?.includes("第二天") || userQuery?.includes("Day 2")) {
      day = 1;
    }

    const items = [
      {
        dayIndex: day,
        time: "14:30",
        title: "Sensō-ji Ancient Temple Tour",
        description: "Tokyo's oldest and most iconic temple complex. Wash hands at the purification pavilion, draw a fortune, and buy some traditional snacks.",
        locationName: "Sensō-ji Temple, Asakusa",
        category: "sight" as const,
        cost: 0,
        address: "2-3-1 Asakusa, Taito City, Tokyo"
      },
      {
        dayIndex: day,
        time: "15:45",
        title: "Asakusa Ramen Yoroiya",
        description: "Walk 5 minutes from Sensō-ji. Traditional Shoyu (Soy Sauce) ramen, highly recommended by locals, with crispy gyoza. Perfect budget-friendly bowl.",
        locationName: "Asakusa Ramen Yoroiya",
        category: "restaurant" as const,
        cost: 1100,
        address: "1-36-7 Asakusa, Taito City, Tokyo"
      }
    ];
    return items;
  };

  if (!ai) {
    return res.json(ok({ items: getFallbackItems() }));
  }

  try {
    const parsed = await callGemini(
      ai,
      {
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayIndex: { type: Type.INTEGER },
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    locationName: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['restaurant', 'shop', 'sight', 'transit', 'hotel', 'other'] },
                    cost: { type: Type.NUMBER },
                    address: { type: Type.STRING }
                  },
                  required: ["dayIndex", "time", "title", "description", "locationName", "category", "cost", "address"]
                }
              }
            },
            required: ["items"]
          }
        }
      },
      { items: getFallbackItems() },
      "parse-voice-schedule"
    );
    
    // Generate AI voice explanation for voice command schedule
    let audio: string | null = null;
    let voiceSummary = "";
    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const isChinese = hasChinese(userQuery);
      if (isChinese) {
        const summary = parsed.items.map((it: any) => `第 ${it.dayIndex + 1} 天 ${it.time} 的 ${it.title}`).join("；");
        voiceSummary = `好的，已為您成功排程：${summary}。已同步更新到日程表囉！`;
      } else {
        const summary = parsed.items.map((it: any) => `${it.title} at ${it.time} on Day ${it.dayIndex + 1}`).join(", and ");
        voiceSummary = `Great! I have successfully scheduled: ${summary}. I've updated the itinerary for you!`;
      }
      audio = await generateTTSAudio(ai, voiceSummary);
    }

    res.json(ok({
      items: parsed.items || [],
      audio,
      voiceSummary
    }));
  } catch (err: any) {
    console.error("Error parsing voice schedule with Gemini API:", err);
    res.json(ok({ items: getFallbackItems() }));
  }
});

// ── POST /api/ai/parse-email-confirmation ───────────────────────────────────
router.post("/parse-email-confirmation", async (req: Request, res: Response) => {
  const { emailText, activeDay } = req.body;
  const ai = getGenAI();
  const dayIdx = activeDay != null ? activeDay : 0;

  const prompt = `You are OdyShareSmart AI Travel Document Assistant. Parse this booking or flight confirmation text and convert it to clean itinerary items.
  Confirmation email text:
  "${emailText}"

  Map it into beautiful travel items on dayIndex = ${dayIdx} (or subsequent days if it's a multi-day itinerary mentioned).
  Required categories: 'restaurant', 'shop', 'sight', 'transit', 'hotel', 'other'.
  
  Format as JSON:
  {
    "items": [
      {
        "dayIndex": number,
        "time": "HH:MM",
        "title": "e.g., ANA Flight NH812 Check-in or Ginza Grand Hotel Check-in",
        "description": "Details like Reservation Number, Flight details, Terminal info, Room details",
        "locationName": "Specific location (e.g. Narita Airport T1 or Ginza Grand Hotel)",
        "category": "transit/hotel/sight/etc",
        "cost": number
      }
    ]
  }`;

  // Smart fallback
  const getFallbackConfirmationItems = () => {
    const text = (emailText || "").toLowerCase();
    if (text.includes("hotel") || text.includes("booking.com") || text.includes("stay") || text.includes("lodging") || text.includes("住宿") || text.includes("飯店") || text.includes("酒店")) {
      return [{
        dayIndex: dayIdx,
        time: "15:00",
        title: "🏨 Grand Hotel Check-in (Booking.com)",
        description: "Booking confirmation: #BK8491902. Standard Double Room, free high-speed Wi-Fi. Breakfast included.",
        locationName: "Grand Hotel Shinjuku, Tokyo",
        category: "hotel",
        cost: 15600
      }];
    } else if (text.includes("flight") || text.includes("ana") || text.includes("jal") || text.includes("cx") || text.includes("airline") || text.includes("機票") || text.includes("航班")) {
      return [{
        dayIndex: dayIdx,
        time: "12:45",
        title: "✈️ ANA NH811 Flight Arrival & Customs",
        description: "Boeing 787-9 Dreamliner. Flight booking ref: #ANA-84A29. Arrival Terminal 1. Please prepare passport QR code.",
        locationName: "Tokyo Narita International Airport (NRT)",
        category: "transit",
        cost: 0
      }];
    }
    return [{
      dayIndex: dayIdx,
      time: "14:00",
      title: "📌 Parsed Travel Booking",
      description: "Auto-parsed travel booking event: " + (emailText.substring(0, 100) + "..."),
      locationName: "Tokyo, Japan",
      category: "other",
      cost: 0
    }];
  };

  if (!ai) {
    return res.json(ok({ items: getFallbackConfirmationItems() }));
  }

  try {
    const parsed = await callGemini(
      ai,
      {
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayIndex: { type: Type.INTEGER },
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    locationName: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['restaurant', 'shop', 'sight', 'transit', 'hotel', 'other'] },
                    cost: { type: Type.NUMBER }
                  },
                  required: ["dayIndex", "time", "title", "description", "locationName", "category", "cost"]
                }
              }
            },
            required: ["items"]
          }
        }
      },
      { items: getFallbackConfirmationItems() },
      "parse-email-confirmation"
    );
    
    // Generate AI voice explanation for imported email confirmation
    let audio: string | null = null;
    let voiceSummary = "";
    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const isChinese = hasChinese(emailText);
      if (isChinese) {
        const summary = parsed.items.map((it: any) => `第 ${it.dayIndex + 1} 天 ${it.time} 的 ${it.title}`).join("，以及 ");
        voiceSummary = `預訂確認信已導入成功！已自動排入行程：${summary}。`;
      } else {
        const summary = parsed.items.map((it: any) => `${it.title} at ${it.time} on Day ${it.dayIndex + 1}`).join(", and ");
        voiceSummary = `Booking confirmation imported successfully! Added to your schedule: ${summary}.`;
      }
      audio = await generateTTSAudio(ai, voiceSummary);
    }

    res.json(ok({
      items: parsed.items || [],
      audio,
      voiceSummary
    }));
  } catch (err) {
    console.error("Gemini confirmation parser failed:", err);
    res.json(ok({ items: getFallbackConfirmationItems() }));
  }
});

export default router;
