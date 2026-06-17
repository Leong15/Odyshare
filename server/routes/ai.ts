import { Router, Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { searchAmadeusFlights } from "../amadeus.js";

const router = Router();

// Lazy initialization pattern for Gemini API
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
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

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: "You are WanderSmart, an expert AI Group Travel Coordinator. Your voice is supportive, concise, and incredibly knowledgeable. Keep answers under 120 words. Focus on practical insights, optimal route order, traffic alerts, and budget-saving flight/boarding opportunities.",
      },
      history: historyFormatted
    });

    const response = await chat.sendMessage({ message });
    res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Error calling Gemini API for travel chat, falling back to helper mode:", err);
    res.json({
      reply: `[Standby Mode] Tokyo possesses legendary travel infrastructure! Pasmo and Suica work smoothly as electronic transit money. Carry some yen cash for small street stalls/izakayas.`
    });
  }
});

// B. Smart Itinerary Optimization based on preferences
router.post("/optimize-itinerary", async (req: Request, res: Response) => {
  const { preferences, currentSchedule } = req.body;
  const ai = getGenAI();

  const prompt = `Optimize our trip itinerary based on preference: "${preferences || 'culinary and leisure walks'}".
  Current itinerary plan items:
  ${JSON.stringify(currentSchedule || [])}
  
  Suggest a sequence of 3 optimized interactive travel activities, each complete with:
  - time (HH:MM string)
  - title (compact activity title)
  - description (practical tip or optimization)
  - locationName (famous site name)
  - category (one of: 'restaurant', 'shop', 'sight', 'transit', 'hotel', 'other')
  - cost (estimated JPY/USD value, number only)
  
  Provide the results as a clean JSON catalog conformant to this prompt.`;

  const fallbackItems = [
    {
      time: "11:30",
      title: "Team Sushi Tasting at Tsukiji Outer Market",
      description: "Get here before noon to bypass long lines; try authentic fatty tuna (Otoro) skewers.",
      locationName: "Tsukiji Outer Market",
      category: "restaurant",
      cost: 35
    },
    {
      time: "14:00",
      title: "Team Digital Art Immersive Gallery",
      description: "Pre-book slot online to avoid disappointment. Incredible multi-sensory visual spaces.",
      locationName: "teamLab Planets TOKYO, Toyosu",
      category: "sight",
      cost: 28
    },
    {
      time: "17:00",
      title: "Traditional Green Tea Ceremony",
      description: "Stately zen garden view. Slow down to balance out the intense Harajuku pedestrian rush.",
      locationName: "Hamarikyu Gardens",
      category: "sight",
      cost: 12
    }
  ];

  if (!ai) {
    // Simulated offline high-end schema optimizer
    return res.json({ optimizedItems: fallbackItems });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  locationName: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['restaurant', 'shop', 'sight', 'transit', 'hotel', 'other'] },
                  cost: { type: Type.NUMBER }
                },
                required: ["time", "title", "description", "locationName", "category", "cost"]
              }
            }
          },
          required: ["optimizedItems"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("Error optimizing itinerary with Gemini, falling back to offline estimates:", err);
    res.json({ optimizedItems: fallbackItems });
  }
});

// C. Find Cheap Flight recommendations & comparative estimations
router.post("/recommend-flights", async (req: Request, res: Response) => {
  const { from, to, date, type, returnDate } = req.body;

  try {
    const amadeusFlights = await searchAmadeusFlights(from, to, date, type !== "oneway", returnDate);
    if (amadeusFlights !== null) {
      console.log("Success! Returning live flight results from Amadeus self-service API.");
      return res.json({ flights: amadeusFlights });
    }
  } catch (err) {
    console.error("Amadeus API call had a network or format error, shifting to backup routes:", err);
  }

  const ai = getGenAI();

  const isRoundTrip = type !== "oneway";
  const typeLabel = isRoundTrip ? "ROUND-TRIP (來回往返)" : "ONE-WAY (單程)";
  
  const prompt = `Recommend 3 realistic cheap airline flight estimations for a ${typeLabel} journey from "${from || 'LAX'}" to "${to || 'Tokyo'}" around travel departure date "${date || 'October 2026'}".
  ${isRoundTrip ? `Since this is a ROUND-TRIP, please specify return flight schedule or indicators, with return date around "${returnDate || 'October 2026'}". Make sure the pricing represents the combined total cost of both outbound and return tickets, and append " (Round-trip)" or similar marker to the carrier name.` : 'This is a ONE-WAY journey.'}
  
  Format output as JSON:
  {
    "flights": [
      {
        "carrier": "Airline Name",
        "price": number_price_USD,
        "stops": number_of_stops,
        "duration": "e.g., 11h 20m",
        "departureTime": "e.g., 10:30 AM",
        "rating": decimal_out_of_10
      }
    ]
  }
  `;

  const getFallbackFlights = () => {
    const multiplier = isRoundTrip ? 1.82 : 1.0;
    const suffix = isRoundTrip ? " (Round-Trip)" : "";
    return [
      {
        carrier: "ANA Airways" + suffix,
        price: Math.round(620 * multiplier),
        stops: 0,
        duration: isRoundTrip ? "11h 15m outbound + 12h return" : "11h 15m",
        departureTime: "10:15 AM",
        rating: 9.2
      },
      {
        carrier: "Zipair Cost Saver" + suffix,
        price: Math.round(410 * multiplier),
        stops: 0,
        duration: isRoundTrip ? "11h 45m outbound + 12h 10m return" : "11h 45m",
        departureTime: "09:40 AM",
        rating: 7.8
      },
      {
        carrier: "Korean Air" + suffix,
        price: Math.round(530 * multiplier),
        stops: 1,
        duration: isRoundTrip ? "14h 50m outbound + 15h return" : "14h 50m",
        departureTime: "12:10 PM",
        rating: 8.5
      }
    ];
  };

  if (!ai) {
    return res.json({ flights: getFallbackFlights() });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  carrier: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  stops: { type: Type.NUMBER },
                  duration: { type: Type.STRING },
                  departureTime: { type: Type.STRING },
                  rating: { type: Type.NUMBER }
                },
                required: ["carrier", "price", "stops", "duration", "departureTime", "rating"]
              }
            }
          },
          required: ["flights"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("Error calling Gemini API for flight recommendations, falling back to offline estimates:", err);
    res.json({ flights: getFallbackFlights() });
  }
});

export default router;
