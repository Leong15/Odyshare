import { Router, Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { searchSerpApiFlights } from "../serpapi.js";

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
    const serpapiFlights = await searchSerpApiFlights(from, to, date, type !== "oneway", returnDate);
    if (serpapiFlights !== null) {
      console.log("Success! Returning live flight results from SerpApi Google Flights API.");
      return res.json({ flights: serpapiFlights });
    }
  } catch (err) {
    console.error("SerpApi API call had a network or format error, shifting to backup routes:", err);
  }

  const ai = getGenAI();

  const isRoundTrip = type !== "oneway";
  const typeLabel = isRoundTrip ? "ROUND-TRIP (來回往返)" : "ONE-WAY (單程)";
  
  const prompt = `Recommend 3 realistic cheap airline flight estimations for a ${typeLabel} journey from "${from || 'LAX'}" to "${to || 'Tokyo'}" around travel departure date "${date || 'October 2026'}".
  ${isRoundTrip ? `Since this is a ROUND-TRIP, please specify return flight schedule or indicators, with return date around "${returnDate || 'October 2026'}". Make sure the pricing represents the combined total cost of both outbound and return tickets, and append " (Round-trip)" or similar marker to the carrier name.` : 'This is a ONE-WAY journey.'}
  
  For each flight, include:
  1. A realistic 'bookingUrl' (Google Flights search queries constructed precisely like: "https://www.google.com/flights?q=flights+from+${from || 'LAX'}+to+${to || 'Tokyo'}+on+${date || '2026-10-15'}${isRoundTrip ? `+return+${returnDate || '2026-10-22'}` : ''}").
  2. A 3-letter capital ISO 'currency' code (such as HKD, TWD, JPY, or USD) that aligns with the route. For example, if departure or arrival involves Hong Kong/HKG, use "HKD". If Taiwan, use "TWD". If Japan, use "JPY". Otherwise, default to "USD".
  3. Ensure the price value matches the chosen currency (e.g. standard ticket rates for HKD are around 1500 to 4000, JPY is around 30000 to 90000, etc. - do not output low USD prices in HKD/JPY).
  4. "returnDepartureTime": If this is a ROUND-TRIP, specify a return flight departure time (e.g., "03:45 PM" or "18:20 PM"). If single-way, omit or leave empty.

  Format output as JSON:
  {
    "flights": [
      {
        "carrier": "Airline Name",
        "price": number,
        "stops": number,
        "duration": "e.g., 11h 20m",
        "departureTime": "e.g., 10:30 AM",
        "returnDepartureTime": "e.g., 03:45 PM (or empty for one-way)",
        "rating": decimal_number,
        "currency": "USD or HKD",
        "bookingUrl": "https://www.google.com/flights?q=..."
      }
    ]
  }
  `;

  const getFallbackFlights = () => {
    const multiplier = isRoundTrip ? 1.82 : 1.0;
    const suffix = isRoundTrip ? " (Round-Trip)" : "";
    const fCode = (from || "LAX").trim().toUpperCase();
    const tCode = (to || "TYO").trim().toUpperCase();
    
    // Determine currency
    let currencyCode = "USD";
    if (fCode === "HKG" || fCode.includes("HONG") || tCode === "HKG" || tCode.includes("HONG")) {
      currencyCode = "HKD";
    } else if (fCode === "TPE" || fCode.includes("TAI") || tCode === "TPE" || tCode.includes("TAI")) {
      currencyCode = "TWD";
    } else if (fCode === "TYO" || fCode === "NRT" || fCode === "HND" || tCode === "TYO" || tCode === "NRT" || tCode === "HND") {
      currencyCode = "JPY";
    }

    // Set prices accordingly based on currency scale relative to USD
    const priceScale = currencyCode === "HKD" ? 7.82 : currencyCode === "TWD" ? 32.5 : currencyCode === "JPY" ? 155.0 : 1.0;
    
    // Construct robust Google Flights search URL including precise travel dates
    let bUrl = `https://www.google.com/flights?q=flights+from+${encodeURIComponent(fCode)}+to+${encodeURIComponent(tCode)}`;
    if (date) {
      if (isRoundTrip && returnDate) {
        bUrl = `https://www.google.com/flights?q=flights+from+${encodeURIComponent(fCode)}+to+${encodeURIComponent(tCode)}+on+${encodeURIComponent(date)}+return+${encodeURIComponent(returnDate)}`;
      } else {
        bUrl = `https://www.google.com/flights?q=flights+from+${encodeURIComponent(fCode)}+to+${encodeURIComponent(tCode)}+on+${encodeURIComponent(date)}`;
      }
    }

    if (fCode === "HKG" || tCode === "HKG" || fCode.includes("HONG") || tCode.includes("HONG")) {
      // Return beautiful Hong Kong related airlines
      return [
        {
          carrier: "Cathay Pacific" + suffix,
          price: Math.round(480 * multiplier * priceScale),
          stops: 0,
          duration: isRoundTrip ? "4h 15m outbound + 4h 30m return" : "4h 15m",
          departureTime: "09:15 AM",
          returnDepartureTime: isRoundTrip ? "16:20 PM" : undefined,
          rating: 9.0,
          currency: currencyCode,
          bookingUrl: bUrl
        },
        {
          carrier: "HK Express" + suffix,
          price: Math.round(230 * multiplier * priceScale),
          stops: 0,
          duration: isRoundTrip ? "4h 30m outbound + 4h 45m return" : "4h 30m",
          departureTime: "11:40 AM",
          returnDepartureTime: isRoundTrip ? "18:45 PM" : undefined,
          rating: 7.5,
          currency: currencyCode,
          bookingUrl: bUrl
        },
        {
          carrier: "Greater Bay Airlines" + suffix,
          price: Math.round(210 * multiplier * priceScale),
          stops: 0,
          duration: isRoundTrip ? "4h 25m outbound + 4h 35m return" : "4h 25m",
          departureTime: "14:10 PM",
          returnDepartureTime: isRoundTrip ? "20:30 PM" : undefined,
          rating: 7.2,
          currency: currencyCode,
          bookingUrl: bUrl
        }
      ];
    }

    // Default ANA / ZIPAIR / Korean Air with dynamic currency/url
    return [
      {
        carrier: "ANA Airways" + suffix,
        price: Math.round(620 * multiplier * priceScale),
        stops: 0,
        duration: isRoundTrip ? "11h 15m outbound + 12h return" : "11h 15m",
        departureTime: "10:15 AM",
        returnDepartureTime: isRoundTrip ? "15:45 PM" : undefined,
        rating: 9.2,
        currency: currencyCode,
        bookingUrl: bUrl
      },
      {
        carrier: "Zipair Cost Saver" + suffix,
        price: Math.round(410 * multiplier * priceScale),
        stops: 0,
        duration: isRoundTrip ? "11h 45m outbound + 12h 10m return" : "11h 45m",
        departureTime: "09:40 AM",
        returnDepartureTime: isRoundTrip ? "14:20 PM" : undefined,
        rating: 7.8,
        currency: currencyCode,
        bookingUrl: bUrl
      },
      {
        carrier: "Korean Air" + suffix,
        price: Math.round(530 * multiplier * priceScale),
        stops: 1,
        duration: isRoundTrip ? "14h 50m outbound + 15h return" : "14h 50m",
        departureTime: "12:10 PM",
        returnDepartureTime: isRoundTrip ? "19:15 PM" : undefined,
        rating: 8.5,
        currency: currencyCode,
        bookingUrl: bUrl
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
                  rating: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  bookingUrl: { type: Type.STRING }
                },
                required: ["carrier", "price", "stops", "duration", "departureTime", "rating", "currency", "bookingUrl"]
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
