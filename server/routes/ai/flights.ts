import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { getGenAI, callGemini } from "./shared";
import { searchSerpApiFlights } from "../../serpapi.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { buildGoogleFlightsUrl } from "../../utils/flightUrlBuilder.js";
import { EXCHANGE_RATES } from "../../utils/exchangeRates.js";

const router = Router();

// Extract carrier templates
const CARRIER_TEMPLATES = {
  HKG: [
    { carrier: "Cathay Pacific", basePrice: 480, stops: 0, rating: 9.0, duration: "4h 15m", departureTime: "09:15 AM", returnDepartureTime: "16:20 PM", returnDuration: "4h 30m" },
    { carrier: "HK Express", basePrice: 230, stops: 0, rating: 7.5, duration: "4h 30m", departureTime: "11:40 AM", returnDepartureTime: "18:45 PM", returnDuration: "4h 45m" },
    { carrier: "Greater Bay Airlines", basePrice: 210, stops: 0, rating: 7.2, duration: "4h 25m", departureTime: "14:10 PM", returnDepartureTime: "20:30 PM", returnDuration: "4h 35m" },
  ],
  DEFAULT: [
    { carrier: "ANA Airways", basePrice: 620, stops: 0, rating: 9.2, duration: "11h 15m", departureTime: "10:15 AM", returnDepartureTime: "15:45 PM", returnDuration: "12h" },
    { carrier: "Zipair Cost Saver", basePrice: 410, stops: 0, rating: 7.8, duration: "11h 45m", departureTime: "09:40 AM", returnDepartureTime: "14:20 PM", returnDuration: "12h 10m" },
    { carrier: "Korean Air", basePrice: 530, stops: 1, rating: 8.5, duration: "14h 50m", departureTime: "12:10 PM", returnDepartureTime: "19:15 PM", returnDuration: "15h" },
  ]
} as const;

// Single function to build flight objects from template
function buildFlightFromTemplate(
  template: typeof CARRIER_TEMPLATES.HKG[number] | typeof CARRIER_TEMPLATES.DEFAULT[number],
  multiplier: number,
  priceScale: number,
  suffix: string,
  isRoundTrip: boolean,
  bUrl: string,
  currency: string
) {
  return {
    carrier: template.carrier + suffix,
    price: Math.round(template.basePrice * multiplier * priceScale),
    stops: template.stops,
    duration: isRoundTrip ? `${template.duration} outbound + ${template.returnDuration} return` : template.duration,
    departureTime: template.departureTime,
    returnDepartureTime: isRoundTrip ? template.returnDepartureTime : undefined,
    rating: template.rating,
    currency,
    bookingUrl: bUrl
  };
}

function getFallbackFlights(from: string, to: string, date: string, isRoundTrip: boolean, returnDate?: string) {
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
  const priceScale = EXCHANGE_RATES[currencyCode] || 1.0;
  
  // Construct robust Google Flights search URL including precise travel dates
  const bUrl = buildGoogleFlightsUrl(fCode, tCode, date, isRoundTrip ? returnDate : undefined);

  if (fCode === "HKG" || tCode === "HKG" || fCode.includes("HONG") || tCode.includes("HONG")) {
    return CARRIER_TEMPLATES.HKG.map(t => buildFlightFromTemplate(t, multiplier, priceScale, suffix, isRoundTrip, bUrl, currencyCode));
  }

  return CARRIER_TEMPLATES.DEFAULT.map(t => buildFlightFromTemplate(t, multiplier, priceScale, suffix, isRoundTrip, bUrl, currencyCode));
}

// C. Find Cheap Flight recommendations & comparative estimations
router.post("/recommend-flights", async (req: Request, res: Response) => {
  const { from, to, date, type, returnDate } = req.body;

  try {
    const serpapiFlights = await searchSerpApiFlights(from, to, date, type !== "oneway", returnDate);
    if (serpapiFlights !== null) {
      console.log("Success! Returning live flight results from SerpApi Google Flights API.");
      return res.json(ok({ flights: serpapiFlights }));
    }
  } catch (err) {
    console.error("SerpApi API call had a network or format error, shifting to backup routes:", err);
  }

  const ai = getGenAI();

  const isRoundTrip = type !== "oneway";
  const fallbackFlights = getFallbackFlights(from, to, date, isRoundTrip, returnDate);

  if (!ai) {
    return res.json(ok({ flights: fallbackFlights }));
  }

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

  const result = await callGemini(
    ai,
    {
      model: "gemini-1.5-flash",
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
                  returnDepartureTime: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  bookingUrl: { type: Type.STRING }
                },
                required: ["carrier", "price", "stops", "duration", "departureTime", "returnDepartureTime", "rating", "currency", "bookingUrl"]
              }
            }
          },
          required: ["flights"]
        }
      }
    },
    { flights: fallbackFlights },
    "recommend-flights"
  );

  res.json(ok(result));
});

export default router;
