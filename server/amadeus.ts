// Amadeus Self-Service Flight API integration module

let cachedToken: string | null = null;
let tokenExpiryTime = 0;

export async function getAmadeusToken(): Promise<string | null> {
  const apiKey = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.log("Amadeus API credentials AMADEUS_API_KEY or AMADEUS_API_SECRET are not set. Offline simulator will be engaged.");
    return null;
  }

  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", apiKey);
    params.append("client_secret", apiSecret);

    const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Amadeus Token call failed with status: ${res.status}. Error: ${errText}`);
      return null;
    }

    const data: any = await res.json();
    cachedToken = data.access_token;
    // Expire token with 60 second safety buffer
    tokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) {
    console.error("Amadeus Token request exception:", err);
    return null;
  }
}

export async function searchAmadeusFlights(
  from: string,
  to: string,
  date: string,
  isRoundTrip = false,
  returnDate?: string
): Promise<any[] | null> {
  const token = await getAmadeusToken();
  if (!token) return null;

  try {
    const origin = from.trim().substring(0, 3).toUpperCase();
    const dest = to.trim().substring(0, 3).toUpperCase();
    const depDate = date.trim().split("T")[0];

    // Build URL query parameters
    const url = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
    url.searchParams.append("originLocationCode", origin);
    url.searchParams.append("destinationLocationCode", dest);
    url.searchParams.append("departureDate", depDate);
    url.searchParams.append("adults", "1");
    url.searchParams.append("max", "5");

    if (isRoundTrip && returnDate) {
      const retDate = returnDate.trim().split("T")[0];
      url.searchParams.append("returnDate", retDate);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Amadeus Flight offers search failed with status: ${res.status}. Response: ${errText}`);
      return null;
    }

    const data: any = await res.json();
    if (!data.data || data.data.length === 0) {
      return [];
    }

    const carriersMap = data.dictionaries?.carriers || {};

    return data.data.map((offer: any) => {
      const pricing = offer.price;
      const priceVal = Math.round(parseFloat(pricing.grandTotal || pricing.total));

      const itinerary = offer.itineraries?.[0];
      const segments = itinerary?.segments || [];
      const stops = segments.length > 0 ? segments.length - 1 : 0;
      
      // Duration e.g. "PT3H15M" -> "3h 15m"
      let durText = "N/A";
      if (itinerary?.duration) {
        durText = itinerary.duration
          .replace("PT", "")
          .replace("H", "h ")
          .replace("M", "m")
          .trim();
      }

      const firstSeg = segments[0] || {};
      const carrierCode = firstSeg.carrierCode || "Carrier";
      const carrier = carriersMap[carrierCode] || carrierCode;
      
      const rawDeparture = firstSeg.departure?.at;
      let departureTime = "N/A";
      if (rawDeparture) {
        try {
          departureTime = new Date(rawDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (_) {}
      }

      return {
        carrier: `${carrier}${isRoundTrip ? " (Round-Trip)" : ""}`,
        price: priceVal,
        stops: stops,
        duration: durText,
        departureTime: departureTime,
        rating: stops === 0 ? 9.2 : stops === 1 ? 8.0 : 6.5,
        isDirect: stops === 0
      };
    });
  } catch (err) {
    console.error("Amadeus flights lookup exception:", err);
    return null;
  }
}
