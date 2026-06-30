// SerpApi Google Flights Integration Module
import { buildGoogleFlightsUrl } from "./utils/flightUrlBuilder.js";

export async function searchSerpApiFlights(
  from: string,
  to: string,
  date: string,
  isRoundTrip = false,
  returnDate?: string
): Promise<any[] | null> {
  const apiKey = process.env.SERPAPI_API_KEY || process.env.SERP_API_KEY;

  if (!apiKey) {
    console.log("SerpApi API credential (SERPAPI_API_KEY) is not set. Using hyper-realistic offline generator fallback.");
    return null;
  }

  try {
    const origin = from.trim().substring(0, 3).toUpperCase();
    const dest = to.trim().substring(0, 3).toUpperCase();
    const depDate = date.trim().split("T")[0];

    // Build URL query parameters for SerpApi Google Flights engine
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.append("engine", "google_flights");
    url.searchParams.append("departure_id", origin);
    url.searchParams.append("arrival_id", dest);
    url.searchParams.append("outbound_date", depDate);
    url.searchParams.append("currency", "TWD"); // Taiwanese Dollars preferred or default to USD based on currency exchange
    url.searchParams.append("api_key", apiKey);

    if (isRoundTrip && returnDate) {
      const retDate = returnDate.trim().split("T")[0];
      url.searchParams.append("return_date", retDate);
    }

    const res = await fetch(url.toString());

    if (!res.ok) {
      const errText = await res.text();
      console.error(`SerpApi Google Flights search failed with status: ${res.status}. Response: ${errText}`);
      return null;
    }

    const data: any = await res.json();
    
    // In SerpApi Google Flights, results are categorized inside 'best_flights' and/or 'other_flights'
    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const allOffers = [...bestFlights, ...otherFlights];

    if (allOffers.length === 0) {
      return [];
    }

    // Limit to top 5 offers for maximum interface readability
    return allOffers.slice(0, 5).map((offer: any, index: number) => {
      const priceVal = typeof offer.price === "number" ? offer.price : parseInt(offer.price) || 12000;
      
      const flightsSegments = offer.flights || [];
      const stops = flightsSegments.length > 0 ? flightsSegments.length - 1 : 0;
      
      // Parse total duration in minutes to human-readable form (e.g. 540 -> 9h 0m)
      const totalMins = offer.total_duration || 480;
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const durText = `${hours}h ${mins}m`;

      // Main carrier
      const firstSegment = flightsSegments[0] || {};
      const carrier = firstSegment.airline || "Airline";
      const rawDepTime = firstSegment.departure_airport?.time || "";
      // Strip date from depTime, keep "HH:MM" e.g., "2026-10-12 11:45" -> "11:45"
      let departureTime = "12:00";
      if (rawDepTime) {
        const parts = rawDepTime.split(" ");
        if (parts.length > 1) {
          departureTime = parts[1];
        } else {
          departureTime = rawDepTime;
        }
      }

      let returnDepartureTime = undefined;
      if (isRoundTrip) {
        const returnSegment = flightsSegments.find((f: any) => {
          const deptId = f.departure_airport?.id || "";
          return deptId && deptId.toUpperCase() === dest.toUpperCase();
        }) || flightsSegments[flightsSegments.length - 1];
        
        if (returnSegment && returnSegment !== firstSegment) {
          const rawRetTime = returnSegment.departure_airport?.time || "";
          if (rawRetTime) {
            const parts = rawRetTime.split(" ");
            returnDepartureTime = parts.length > 1 ? parts[1] : rawRetTime;
          }
        }
        if (!returnDepartureTime) {
          returnDepartureTime = "18:45";
        }
      }

      const bUrl = buildGoogleFlightsUrl(origin, dest, depDate, isRoundTrip ? returnDate : undefined);

      return {
        id: `serp-${index}-${Date.now()}`,
        carrier: `${carrier}${isRoundTrip ? " (Round-Trip)" : ""}`,
        price: priceVal,
        stops: stops,
        duration: durText,
        departureTime: departureTime,
        returnDepartureTime: returnDepartureTime,
        rating: stops === 0 ? 9.5 : stops === 1 ? 8.2 : 6.0,
        isDirect: stops === 0,
        currency: "TWD",
        bookingUrl: bUrl
      };
    });
  } catch (err) {
    console.error("SerpApi flights lookup exception:", err);
    return null;
  }
}
