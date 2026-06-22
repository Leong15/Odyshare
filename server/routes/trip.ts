import { Router, Request, Response } from "express";
import { readTripsDB, writeTripsDB, getDB, writeDB } from "../db";

const router = Router();

// Google Routes API Proxy
router.post("/google-route", async (req: Request, res: Response) => {
  try {
    const { origin, destination, travelMode } = req.body;
    if (!origin || !destination || !travelMode) {
      return res.status(400).json({ error: "Missing origin, destination, or travelMode" });
    }

    const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
    if (!apiKey) {
      return res.status(500).json({ error: "Google Maps Platform key not configured in backend Secrets." });
    }

    // Call google routes computeRoutes API
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: Number(origin.lat),
              longitude: Number(origin.lng)
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: Number(destination.lat),
              longitude: Number(destination.lng)
            }
          }
        },
        travelMode: travelMode === "WALKING" ? "WALK" : "DRIVE"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google Routes API returned error:", errText);
      return res.status(response.status).json({ error: "Google Routes API error", details: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Error in /google-route proxy route:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update current participant's live coordinate tracking
router.post("/update-location", (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. x-user-id header is required." });
    }

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "Missing required lat or lng coordinate values." });
    }

    const current = readTripsDB(req);
    const p = current.participants.find((part: any) => part.id === userId);
    if (p) {
      p.lat = Number(lat);
      p.lng = Number(lng);
      // Persist coordinate change back to main database store
      writeTripsDB(current, req);
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Error in /update-location route:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// 1. Get current active trip data
router.get("/", async (req: Request, res: Response) => {
  try {
    let data = readTripsDB(req);
    let updatedDbNeeded = false;
    const db = getDB();

    // Lazy resolve coordinates using completely free, public OSM Nominatim if missing and destination is set
    if (data && (data.lat === undefined || data.lat === null || data.lng === undefined || data.lng === null) && data.destination && data.destination !== "Unknown Destination") {
      const coords = await getCoordsWithTimeout(data.destination);
      if (coords) {
        data.lat = coords.lat;
        data.lng = coords.lng;
        // save back to server db
        const tIdx = db.trips.findIndex(t => t.id === data.id);
        if (tIdx !== -1) {
          db.trips[tIdx].lat = coords.lat;
          db.trips[tIdx].lng = coords.lng;
          updatedDbNeeded = true;
        }
      }
    }

    // Also lazy resolve coordinates for ALL other trips in tripsList!
    if (data && data.tripsList) {
      for (const t of data.tripsList) {
        if ((t.lat === undefined || t.lat === null || t.lng === undefined || t.lng === null) && t.destination && t.destination !== "Unknown Destination") {
          const coords = await getCoordsWithTimeout(t.destination);
          if (coords) {
            t.lat = coords.lat;
            t.lng = coords.lng;
            const tIdx = db.trips.findIndex(tripItem => tripItem.id === t.id);
            if (tIdx !== -1) {
              db.trips[tIdx].lat = coords.lat;
              db.trips[tIdx].lng = coords.lng;
              updatedDbNeeded = true;
            }
          }
        }
      }
    }

    if (updatedDbNeeded) {
      writeDB(db);
      // reload data to include proper state
      data = readTripsDB(req);
    }

    res.json(data);
  } catch (err: any) {
    console.error("GET /api/trip error:", err);
    res.status(500).json({ error: err.message || "Failed to read trip database" });
  }
});

// 2. Add or update trip details
router.post("/update", (req: Request, res: Response) => {
  const current = readTripsDB(req);
  const updated = { ...current, ...req.body };
  writeTripsDB(updated, req);
  res.json({ success: true, trip: readTripsDB(req) });
});

// 2b. Select active trip
router.post("/select", (req: Request, res: Response) => {
  const { tripId } = req.body;
  const db = getDB();
  const found = db.trips.some(t => t.id === tripId);
  if (found) {
    db.activeTripId = tripId;
    writeDB(db);
    req.headers["x-trip-id"] = tripId;
    res.json({ success: true, trip: readTripsDB(req) });
  } else {
    res.status(404).json({ error: "Trip not found" });
  }
});

// Helper functions for free, public geocoding using OpenStreetMap Nominatim
async function fetchCoordinates(destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "OdyShare/1.0 (leochau46@gmail.com)"
      }
    });
    if (!res.ok) return null;
    const list: any = await res.json();
    if (list && list.length > 0) {
      return {
        lat: Number(list[0].lat),
        lng: Number(list[0].lon)
      };
    }
  } catch (err) {
    console.error("Geocoding failed for destination:", destination, err);
  }
  return null;
}

async function getCoordsWithTimeout(destination: string): Promise<{ lat: number; lng: number } | null> {
  if (!destination || destination === "Unknown Destination") return null;

  const destClean = destination.toLowerCase().trim();
  const fallbackCityCoords: Record<string, { lat: number; lng: number }> = {
    tokyo: { lat: 35.6762, lng: 139.6503 },
    東京: { lat: 35.6762, lng: 139.6503 },
    okinawa: { lat: 26.2124, lng: 127.6809 },
    沖繩: { lat: 26.2124, lng: 127.6809 },
    taipei: { lat: 25.0330, lng: 121.5654 },
    台北: { lat: 25.0330, lng: 121.5654 },
    yilan: { lat: 24.7570, lng: 121.7530 },
    宜蘭: { lat: 24.7570, lng: 121.7530 },
    "hong kong": { lat: 22.3193, lng: 114.1694 },
    香港: { lat: 22.3193, lng: 114.1694 },
    kyoto: { lat: 35.0116, lng: 135.7681 },
    京都: { lat: 35.0116, lng: 135.7681 },
    osaka: { lat: 34.6937, lng: 135.5023 },
    大阪: { lat: 34.6937, lng: 135.5023 },
    paris: { lat: 48.8566, lng: 2.3522 },
    巴黎: { lat: 48.8566, lng: 2.3522 },
    london: { lat: 51.5074, lng: -0.1278 },
    倫敦: { lat: 51.5074, lng: -0.1278 },
    "new york": { lat: 40.7128, lng: -74.0060 },
    紐約: { lat: 40.7128, lng: -74.0060 },
    rome: { lat: 41.9028, lng: 12.4964 },
    羅馬: { lat: 41.9028, lng: 12.4964 },
    seoul: { lat: 37.5665, lng: 126.9780 },
    首爾: { lat: 37.5665, lng: 126.9780 },
    bangkok: { lat: 13.7563, lng: 100.5018 },
    曼谷: { lat: 13.7563, lng: 100.5018 },
    singapore: { lat: 1.3521, lng: 103.8198 },
    新加坡: { lat: 1.3521, lng: 103.8198 },
    sydney: { lat: -33.8688, lng: 151.2093 },
    雪梨: { lat: -33.8688, lng: 151.2093 },
    悉尼: { lat: -33.8688, lng: 151.2093 },
    iceland: { lat: 64.9631, lng: -19.0208 },
    冰島: { lat: 64.9631, lng: -19.0208 },
    hokkaido: { lat: 43.0621, lng: 141.3544 },
    北海道: { lat: 43.0621, lng: 141.3544 }
  };

  for (const key of Object.keys(fallbackCityCoords)) {
    if (destClean.includes(key) || key.includes(destClean)) {
      return fallbackCityCoords[key];
    }
  }

  return Promise.race([
    fetchCoordinates(destination),
    new Promise<{ lat: number; lng: number } | null>((resolve) => setTimeout(() => resolve(null), 6000))
  ]);
}

// 2c. Create a new trip
router.post("/create", async (req: Request, res: Response) => {
  const { name, destination, startDate, endDate, totalBudget } = req.body;
  const userId = req.headers["x-user-id"] as string;
  const db = getDB();
  
  const creator = db.users.find(u => u.id === userId);
  const participants = creator ? [
    {
      id: creator.id,
      name: creator.name,
      email: creator.email || `${creator.username}@example.com`,
      avatarColor: creator.avatarColor || "#3b82f6",
      publicKey: "pub_key_sec_" + Math.random().toString(36).substring(2, 6),
      budgetLimit: 1500
    }
  ] : [
    { id: "u1", name: "Leo (You)", email: "leochau46@gmail.com", avatarColor: "#3b82f6", publicKey: "pub_key_sec_leo_908f" }
  ];

  const newTripId = "trip-" + Date.now();
  const destString = destination || "Unknown Destination";
  
  // Resolve real coordinates using OSM Nominatim for accurate placement!
  const coords = await getCoordsWithTimeout(destString);

  const newTrip: any = {
    id: newTripId,
    name: name || "New Trip",
    destination: destString,
    startDate: startDate || new Date().toISOString().split("T")[0],
    endDate: endDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
    totalBudget: totalBudget ? Number(totalBudget) : 3000,
    lat: coords ? coords.lat : undefined,
    lng: coords ? coords.lng : undefined,
    participants: participants,
    flightEstimates: [],
    itineraries: [],
    expenses: [],
    documents: [],
    chats: [
      {
        id: "msg-start-" + Date.now(),
        senderId: "system",
        senderName: "System",
        avatarColor: "#64748b",
        messageEncrypted: "",
        messageDecrypted: `🚀 Welcome to your new workspace for ${name || 'New Trip'}! Add daily itineraries, vote on flights, and track budget splits.`,
        timestamp: new Date().toISOString()
      }
    ]
  };

  db.trips.push(newTrip);
  db.activeTripId = newTripId;
  writeDB(db);

  req.headers["x-trip-id"] = newTripId;
  res.json({ success: true, trip: readTripsDB(req) });
});

// 2cc. Update active trip metadata
router.post("/update-meta", async (req: Request, res: Response) => {
  const { name, destination, totalBudget, status } = req.body;
  const currentTrip = readTripsDB(req);
  if (!currentTrip) {
    return res.status(404).json({ error: "No active trip found" });
  }

  if (name !== undefined) currentTrip.name = name.trim();
  
  if (destination !== undefined) {
    const newDest = destination.trim();
    if (currentTrip.destination !== newDest) {
      currentTrip.destination = newDest;
      // Get new coordinates using Geocoding if changed
      const coords = await getCoordsWithTimeout(newDest);
      if (coords) {
        currentTrip.lat = coords.lat;
        currentTrip.lng = coords.lng;
      } else {
        delete currentTrip.lat;
        delete currentTrip.lng;
      }
    }
  }
  
  if (totalBudget !== undefined) currentTrip.totalBudget = Number(totalBudget) || 3000;
  if (status !== undefined) currentTrip.status = status;

  const db = getDB();
  const tripIdx = db.trips.findIndex(t => t.id === currentTrip.id);
  if (tripIdx !== -1) {
    db.trips[tripIdx] = currentTrip;
    writeDB(db);
  }

  res.json({ success: true, trip: currentTrip });
});

// 2d. Delete a trip
router.post("/delete", (req: Request, res: Response) => {
  const { tripId } = req.body;
  const db = getDB();
  if (db.trips.length <= 1) {
    return res.status(400).json({ error: "Cannot delete the last remaining trip" });
  }

  db.trips = db.trips.filter(t => t.id !== tripId);
  if (db.activeTripId === tripId) {
    db.activeTripId = db.trips[0].id;
  }
  writeDB(db);

  res.json({ success: true, trip: readTripsDB(req) });
});

// 3. Add custom Itinerary point (with comments & coords)
router.post("/itinerary/add", async (req: Request, res: Response) => {
  const current = readTripsDB(req);
  const { title, locationName, coordinates } = req.body;
  
  const destString = locationName || title || "Unknown Location";
  const coords = await getCoordsWithTimeout(destString);
  let resolvedCoordinates = coordinates;
  let lat = coords?.lat;
  let lng = coords?.lng;
  
  if (coords) {
    const destCenter = current.destination || "Tokyo";
    let center = { lat: 35.6762, lng: 139.6503 };
    const d = destCenter.toLowerCase();
    if (d.includes("hong") || d.includes("hkg") || d.includes("香港")) {
      center = { lat: 22.3193, lng: 114.1694 };
    } else if (d.includes("paris") || d.includes("巴黎")) {
      center = { lat: 48.8566, lng: 2.3522 };
    } else if (d.includes("london") || d.includes("倫敦")) {
      center = { lat: 51.5074, lng: -0.1278 };
    } else if (d.includes("taipei") || d.includes("台北") || d.includes("taiwan")) {
      center = { lat: 25.0330, lng: 121.5654 };
    } else if (d.includes("new york") || d.includes("nyc")) {
      center = { lat: 40.7128, lng: -74.0060 };
    }
    
    const latOffset = coords.lat - center.lat;
    const lngOffset = coords.lng - center.lng;
    const y = 50 - (latOffset / 0.0015);
    const x = 50 + (lngOffset / 0.0018);
    resolvedCoordinates = {
      x: Math.round(Math.max(5, Math.min(95, x))),
      y: Math.round(Math.max(5, Math.min(95, y)))
    };
  }

  const newItem = {
    id: "it-" + Date.now(),
    votes: [],
    comments: [],
    coordinates: resolvedCoordinates || { x: Math.floor(Math.random() * 80) + 10, y: Math.floor(Math.random() * 80) + 10 },
    trafficStatus: ["smooth", "moderate", "congested"][Math.floor(Math.random() * 3)] as any,
    lat,
    lng,
    ...req.body
  };
  
  newItem.coordinates = resolvedCoordinates || newItem.coordinates;
  newItem.lat = lat ?? newItem.lat;
  newItem.lng = lng ?? newItem.lng;

  current.itineraries.push(newItem);
  
  // Post system message log
  const systemMsg = {
    id: "msg-" + Date.now(),
    senderId: "system",
    senderName: "System",
    avatarColor: "#64748b",
    messageEncrypted: "",
    messageDecrypted: `📌 Itinerary added: '${newItem.title}' (${newItem.locationName || "No address"})`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true
  };
  current.chats.push(systemMsg);

  writeTripsDB(current, req);
  res.json({ success: true, item: newItem, trip: current });
});

// 3b. Edit an existing Itinerary point
router.post("/itinerary/edit", async (req: Request, res: Response) => {
  const { id, title, description, locationName, time, category, cost, coordinates, lat: inputLat, lng: inputLng } = req.body;
  const current = readTripsDB(req);
  const item = current.itineraries.find((i: any) => i.id === id);
  if (item) {
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;
    
    if (locationName !== undefined) {
      const oldLocation = item.locationName;
      item.locationName = locationName;
      
      if (oldLocation !== locationName) {
        const coords = await getCoordsWithTimeout(locationName);
        if (coords) {
          item.lat = coords.lat;
          item.lng = coords.lng;
          
          const destCenter = current.destination || "Tokyo";
          let center = { lat: 35.6762, lng: 139.6503 };
          const d = destCenter.toLowerCase();
          if (d.includes("hong") || d.includes("hkg") || d.includes("香港")) {
            center = { lat: 22.3193, lng: 114.1694 };
          } else if (d.includes("paris") || d.includes("巴黎")) {
            center = { lat: 48.8566, lng: 2.3522 };
          } else if (d.includes("london") || d.includes("倫敦")) {
            center = { lat: 51.5074, lng: -0.1278 };
          } else if (d.includes("taipei") || d.includes("台北") || d.includes("taiwan")) {
            center = { lat: 25.0330, lng: 121.5654 };
          } else if (d.includes("new york") || d.includes("nyc")) {
            center = { lat: 40.7128, lng: -74.0060 };
          }
          
          const latOffset = coords.lat - center.lat;
          const lngOffset = coords.lng - center.lng;
          const y = 50 - (latOffset / 0.0015);
          const x = 50 + (lngOffset / 0.0018);
          item.coordinates = {
            x: Math.round(Math.max(5, Math.min(95, x))),
            y: Math.round(Math.max(5, Math.min(95, y)))
          };
        }
      }
    }
    
    if (time !== undefined) item.time = time;
    if (category !== undefined) item.category = category;
    if (cost !== undefined) item.cost = Number(cost) || 0;
    if (coordinates !== undefined) item.coordinates = coordinates;
    if (inputLat !== undefined) item.lat = Number(inputLat);
    if (inputLng !== undefined) item.lng = Number(inputLng);
    
    // Post system message log
    const systemMsg = {
      id: "msg-" + Date.now(),
      senderId: "system",
      senderName: "System",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: `✏️ 行程更新：'${item.title}' (${item.locationName || "No address"})`,
      timestamp: new Date().toISOString(),
      isTripUpdate: true
    };
    current.chats.push(systemMsg);
    
    writeTripsDB(current, req);
    res.json({ success: true, item, trip: current });
  } else {
    res.status(404).json({ error: "Item not found" });
  }
});

// 3c. Delete an existing Itinerary point
router.post("/itinerary/delete", (req: Request, res: Response) => {
  const { id } = req.body;
  const current = readTripsDB(req);
  const initialLen = current.itineraries.length;
  current.itineraries = current.itineraries.filter((i: any) => i.id !== id);
  if (current.itineraries.length < initialLen) {
    const systemMsg = {
      id: "msg-" + Date.now(),
      senderId: "system",
      senderName: "System",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: `🗑️ 行程已刪除 (ID: ${id})`,
      timestamp: new Date().toISOString(),
      isTripUpdate: true
    };
    current.chats.push(systemMsg);
    writeTripsDB(current, req);
    res.json({ success: true, trip: current });
  } else {
    res.status(404).json({ error: "Item not found" });
  }
});

// 4. Vote on Itinerary Item or Flight Recommendation
router.post("/vote", (req: Request, res: Response) => {
  const { targetType, targetId, userId } = req.body;
  const current = readTripsDB(req);

  if (targetType === "itinerary") {
    const item = current.itineraries.find((i: any) => i.id === targetId);
    if (item) {
      if (item.votes.includes(userId)) {
        item.votes = item.votes.filter((uid: string) => uid !== userId);
      } else {
        item.votes.push(userId);
      }
    }
  } else if (targetType === "flight") {
    const flight = current.flightEstimates.find((f: any) => f.id === targetId);
    if (flight) {
      if (flight.votes.includes(userId)) {
        flight.votes = flight.votes.filter((uid: string) => uid !== userId);
      } else {
        flight.votes.push(userId);
      }
    }
  }

  writeTripsDB(current, req);
  res.json({ success: true, trip: current });
});

// 5. Comment on an Itinerary Item, shop, or restaurant
router.post("/itinerary/comment", (req: Request, res: Response) => {
  const { itemId, userId, userName, text } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Comment text is required" });
  }

  const current = readTripsDB(req);
  const item = current.itineraries.find((i: any) => i.id === itemId);
  if (item) {
    const newComment = {
      id: "c-" + Date.now(),
      authorId: userId,
      authorName: userName,
      text: text,
      createdAt: new Date().toISOString()
    };
    item.comments.push(newComment);
    writeTripsDB(current, req);
    res.json({ success: true, comment: newComment, trip: current });
  } else {
    res.status(404).json({ error: "Itinerary item not found" });
  }
});

// 6. Add Expense SPLIT costs automatically
router.post("/expense/add", (req: Request, res: Response) => {
  const current = readTripsDB(req);
  const newExpense = {
    id: "exp-" + Date.now(),
    ...req.body
  };
  current.expenses.push(newExpense);

  // Auto system notification about addition
  const payerName = current.participants.find((p: any) => p.id === newExpense.paidById)?.name || "Someone";
  const systemMsg = {
    id: "msg-sys-" + Date.now(),
    senderId: "system",
    senderName: "System",
    avatarColor: "#64748b",
    messageEncrypted: "",
    messageDecrypted: `💸 ${payerName} added expense '${newExpense.description}' ($${parseFloat(newExpense.amount).toFixed(2)})`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true
  };
  current.chats.push(systemMsg);

  writeTripsDB(current, req);
  res.json({ success: true, expense: newExpense, trip: current });
});

// 7. Delete Expense
router.post("/expense/delete", (req: Request, res: Response) => {
  const { expenseId } = req.body;
  const current = readTripsDB(req);
  current.expenses = current.expenses.filter((e: any) => e.id !== expenseId);
  writeTripsDB(current, req);
  res.json({ success: true, trip: current });
});

// 8. Upload travel Document Locker (mocks server storage records securely)
router.post("/document/upload", (req: Request, res: Response) => {
  const { name, size, type, uploadedBy } = req.body;
  const current = readTripsDB(req);
  const newDoc = {
    id: "doc-" + Date.now(),
    name,
    size: size || "1.2 MB",
    type: type || "application/pdf",
    uploadedAt: new Date().toISOString(),
    url: "#",
    accessKey: "doc_hash_sha256_" + Math.random().toString(36).substring(2, 12),
    uploadedBy: uploadedBy || "Leo"
  };
  current.documents.push(newDoc);

  // System notification
  const systemMsg = {
    id: "msg-doc-" + Date.now(),
    senderId: "system",
    senderName: "System",
    avatarColor: "#64748b",
    messageEncrypted: "",
    messageDecrypted: `📂 ${newDoc.uploadedBy} uploaded secure travel document '${newDoc.name}'`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true
  };
  current.chats.push(systemMsg);

  writeTripsDB(current, req);
  res.json({ success: true, document: newDoc, trip: current });
});

// 9. Send real-time chat with encryptions simulated
router.post("/chat/send", (req: Request, res: Response) => {
  const { senderId, senderName, avatarColor, messageDecrypted, messageEncrypted } = req.body;
  const current = readTripsDB(req);

  const newMsg = {
    id: "msg-" + Date.now(),
    senderId,
    senderName,
    avatarColor,
    messageEncrypted: messageEncrypted || "U2FsdGVkX19" + Buffer.from(messageDecrypted).toString("base64"),
    messageDecrypted,
    timestamp: new Date().toISOString()
  };

  current.chats.push(newMsg);
  writeTripsDB(current, req);
  res.json({ success: true, msg: newMsg, trip: current });
});

// 10. Invite user - creates a pending invitation record
router.post("/invite", (req: Request, res: Response) => {
  const { username } = req.body;
  const userId = req.headers["x-user-id"] as string;

  if (!username) {
    return res.status(400).json({ error: "Username is required to invite someone." });
  }

  const current = readTripsDB(req);
  const db = getDB();
  const foundUser = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!foundUser) {
    return res.status(404).json({ error: "No registered traveler matches that Username/Login ID." });
  }

  // Verify they aren't already a participant
  const alreadyIn = current.participants.some((p: any) => p.id === foundUser.id);
  if (alreadyIn) {
    return res.status(400).json({ error: `${foundUser.name} is already in this project group.` });
  }

  if (!db.invitations) {
    db.invitations = [];
  }

  // Verify no duplicate pending invitation
  const alreadyInvited = db.invitations.some(
    (inv: any) => inv.tripId === current.id && inv.inviteeId === foundUser.id && inv.status === "pending"
  );
  if (alreadyInvited) {
    return res.status(400).json({ error: `${foundUser.name} already has a pending invitation for this project.` });
  }

  const sender = db.users.find(u => u.id === userId);
  const newInvitation = {
    id: "inv-" + Date.now(),
    tripId: current.id,
    tripName: current.name,
    inviterId: userId || "unknown",
    inviterName: sender ? sender.name : "A Group Member",
    inviteeId: foundUser.id,
    inviteeUsername: foundUser.username,
    status: "pending"
  };

  db.invitations.push(newInvitation);
  writeDB(db);

  res.json({ success: true, invitation: newInvitation });
});

// 10.5. Kick user/participant out of the trip group
router.post("/kick", (req: Request, res: Response) => {
  const { userIdToKick } = req.body;
  const requestUserId = req.headers["x-user-id"] as string;

  if (!userIdToKick) {
    return res.status(400).json({ error: "userIdToKick is required to remove someone." });
  }

  const current = readTripsDB(req);
  const db = getDB();

  // Find the user to kick to log their name
  const foundUser = db.users.find(u => u.id === userIdToKick);
  if (!foundUser) {
    return res.status(404).json({ error: "User to kick not found in registered accounts." });
  }

  // Verify they are a participant
  const partIndex = current.participants.findIndex((p: any) => p.id === userIdToKick);
  if (partIndex === -1) {
    return res.status(400).json({ error: "User is not a participant in this group project." });
  }

  // Remove user from the participants list
  current.participants.splice(partIndex, 1);

  // System log notification in trip chat
  const sender = db.users.find(u => u.id === requestUserId);
  const senderName = sender ? sender.name : "A Group Member";

  current.chats.push({
    id: "msg-kick-" + Date.now(),
    senderId: "system",
    senderName: "System",
    avatarColor: "#ef4444",
    messageEncrypted: "",
    messageDecrypted: `❌ ${foundUser.name} was removed from the travel project by ${senderName}.`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true
  });

  writeTripsDB(current, req);
  res.json({ success: true, trip: current });
});

// 11. Retrieve all pending invitations for currently logged in user
router.get("/invitations", (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: "Missing x-user-id header" });
    }
    const db = getDB();
    if (!db.invitations) {
      db.invitations = [];
    }
    const userPending = db.invitations.filter(
      (inv: any) => inv.inviteeId === userId && inv.status === "pending"
    );
    res.json(userPending);
  } catch (err: any) {
    console.error("GET /api/trip/invitations error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch invitations" });
  }
});

// 12. Accept or Decline an invitation
router.post("/invitations/respond", (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { invitationId, action } = req.body; // action: "accept" | "decline"
  if (!userId) {
    return res.status(401).json({ error: "Missing x-user-id header" });
  }
  if (!invitationId || !action) {
    return res.status(400).json({ error: "invitationId and action are required." });
  }

  const db = getDB();
  if (!db.invitations) {
    db.invitations = [];
  }

  const invIdx = db.invitations.findIndex(
    (inv: any) => inv.id === invitationId && inv.inviteeId === userId && inv.status === "pending"
  );

  if (invIdx === -1) {
    return res.status(404).json({ error: "Active invitation not found." });
  }

  const invitation = db.invitations[invIdx];
  if (action === "accept") {
    invitation.status = "accepted";
    
    // Add invitee user to corresponding trip's participants list
    const trip = db.trips.find(t => t.id === invitation.tripId);
    if (trip) {
      const foundUser = db.users.find(u => u.id === userId);
      if (foundUser) {
        const alreadyIn = trip.participants.some((p: any) => p.id === userId);
        if (!alreadyIn) {
          const newPart = {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email || `${foundUser.username}@example.com`,
            avatarColor: foundUser.avatarColor || "#3b82f6",
            publicKey: "pub_key_sec_user_added",
            budgetLimit: 1500
          };
          trip.participants.push(newPart);

          // System log notification in trip chat
          trip.chats.push({
            id: "msg-invite-acc-" + Date.now(),
            senderId: "system",
            senderName: "System",
            avatarColor: "#64748b",
            messageEncrypted: "",
            messageDecrypted: `➕ ${foundUser.name} joined the travel project after accepting the group invitation.`,
            timestamp: new Date().toISOString(),
            isTripUpdate: true
          });
        }
      }
    }
    writeDB(db);
    return res.json({ success: true, message: "Invitation accepted!" });
  } else {
    // Decline invitation
    invitation.status = "declined";
    writeDB(db);
    return res.json({ success: true, message: "Invitation declined successfully" });
  }
});

// D. Subscribe to On-Demand Flight Route monitoring with baseline pricing
router.post("/:id/flight-subscription", (req: Request, res: Response) => {
  const tripId = req.params.id;
  const { from, to, date, price, carrier, stops, duration, isDirect, currency } = req.body;

  const db = getDB();
  const trip = db.trips.find((t: any) => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const initialPrice = price || 15000;
  const subCurrency = currency || "USD";
  
  trip.flightSubscription = {
    isActive: true,
    from: from || "TPE",
    to: to || "NRT",
    date: date || "2026-07-20",
    baselinePrice: initialPrice,
    currentPrice: initialPrice,
    lastCheckedPrice: initialPrice,
    currency: subCurrency,
    score: 60, // Starting baseline score
    history: [
      {
        price: initialPrice,
        score: 60,
        checkedAt: new Date().toISOString(),
        message: `訂閱成功，已建立價格基準線（Baseline）： ${subCurrency} $${initialPrice}`
      }
    ],
    carrier: carrier || "ANA Airways",
    stops: stops || 0,
    duration: duration || "3h 15m",
    isDirect: isDirect !== false,
    subscribedAt: new Date().toISOString()
  };

  // Broadcast system message in chats
  trip.chats.push({
    id: "msg-sub-" + Date.now(),
    senderId: "system",
    senderName: "OdyShareSmart AI",
    avatarColor: "#8b5cf6",
    messageEncrypted: "",
    messageDecrypted: `🔔 線路監控啟動！OdyShareSmart 已將 ${from || "TPE"} 往 ${to || "NRT"} (出發: ${date || "2026-07-20"}) 之基準線價格（Baseline）鎖定在 ${subCurrency} $${initialPrice}。每日中午 12:00 及晚上 18:00 將進行主動航班剖析與低價追焦推送。`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true
  });

  writeDB(db);
  res.json({ success: true, trip });
});

// E. Unsubscribe flight route monitoring
router.delete("/:id/flight-subscription", (req: Request, res: Response) => {
  const tripId = req.params.id;
  const db = getDB();
  const trip = db.trips.find((t: any) => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  if (trip.flightSubscription) {
    trip.flightSubscription.isActive = false;
  }

  trip.chats.push({
    id: "msg-unsub-" + Date.now(),
    senderId: "system",
    senderName: "OdyShareSmart AI",
    avatarColor: "#8b5cf6",
    messageEncrypted: "",
    messageDecrypted: `🔕 線路監控已關閉！已取消此旅遊項目的航班價格推播追蹤。`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true
  });

  writeDB(db);
  res.json({ success: true, trip });
});

// F. Simulate mid-day / evening price checks with AI scoring
router.post("/:id/simulate-price-check", (req: Request, res: Response) => {
  const tripId = req.params.id;
  const { simulatedPrice, simulatedStops, checkTime } = req.body; // e.g. checkTime: "12:00" | "18:00"

  const db = getDB();
  const trip = db.trips.find((t: any) => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const sub = trip.flightSubscription;
  if (!sub || !sub.isActive) {
    return res.status(400).json({ error: "No active flight monitoring subscription found for this trip." });
  }

  const baseline = sub.baselinePrice;
  const newPrice = simulatedPrice !== undefined ? Number(simulatedPrice) : Math.round(baseline * 0.9); // default 10% discount ($13500)
  const newStops = simulatedStops !== undefined ? Number(simulatedStops) : sub.stops; // default no stops change (safe direct)
  
  // Refined Cost-Performance Score Formula (AI-reasoned)
  // Base score 60.
  // Direct bonus: +15, lays penalty: -15.
  // Every 1% price drop from baseline adds +2.5 points. Every 1% price hike subtracts -2 points.
  let isDirect = newStops === 0;
  let scoreOfDirect = isDirect ? 70 : 45;
  
  const pctDiff = ((baseline - newPrice) / baseline) * 100; // positive for drop, negative for hike
  let priceAdjust = pctDiff * 1.5;
  
  // Calculate final score bounded [0, 100]
  let checkScore = Math.min(100, Math.max(10, Math.round(scoreOfDirect + priceAdjust)));

  sub.lastCheckedPrice = sub.currentPrice;
  sub.currentPrice = newPrice;
  sub.score = checkScore;

  const checkHour = checkTime || (new Date().getHours() < 15 ? "12:00" : "18:00");
  
  // AI message logic
  let pushMsg = "";
  let isMegaDrop = pctDiff >= 10; // 10% or more drop

  const cur = sub.currency || "USD";

  if (isMegaDrop && newStops <= sub.stops) {
    pushMsg = `🔥 降價通知！您監控的${sub.from}機票在${checkHour}降了 ${cur} $${baseline - newPrice}，且直飛不變，創下近期 C/P 值新高（性價比得分從 60 躍升至 ${checkScore}！），建議立即入手！`;
  } else if (newStops > sub.stops) {
    pushMsg = `⚠️ 航班警報（${checkHour}）：雖然當前有航班報價 ${cur} $${newPrice}，但航程變成了轉機${newStops}次的爛地獄航班！航程時間大幅拉長，AI 判定性價比極低（得分跌至 ${checkScore}分），不建議購買此變更。`;
  } else if (newPrice < baseline) {
    pushMsg = `✈️ 航班動態更新（${checkHour}）：票價微幅調降至 ${cur} $${newPrice}。直飛不變，性價比略微上揚（得分為 ${checkScore}），您可以考慮在近期購入。`;
  } else {
    pushMsg = `✈️ 航班動態更新（${checkHour}）：當前報價為 ${cur} $${newPrice}。相較於起初訂閱的 ${cur} $${baseline} 基準線表現持平，性價比評估為中等（得分為 ${checkScore}）。`;
  }

  // Record history
  sub.history.push({
    price: newPrice,
    score: checkScore,
    checkedAt: new Date().toISOString(),
    message: `${checkHour} 機票安全監控：系統抓取到報價 ${cur} $${newPrice}, 轉機次數 (${newStops}次)。AI 判定得分為: ${checkScore}/100。`
  });

  // Push notification container setup (so client-side react can pick it up via SSE or poll)
  if (!trip.pushNotifications) {
    trip.pushNotifications = [];
  }
  
  const notificationItem = {
    id: "notif-" + Date.now(),
    title: isMegaDrop && newStops <= sub.stops ? "🔥 降價警告！" : "✈️ OdyShareSmart 航班分析",
    message: pushMsg,
    createdAt: new Date().toISOString(),
    isRead: false
  };
  
  trip.pushNotifications.push(notificationItem);

  // Send system chat message
  trip.chats.push({
    id: "msg-pcheck-" + Date.now(),
    senderId: "system",
    senderName: "OdyShareSmart AI",
    avatarColor: "#8b5cf6",
    messageEncrypted: "",
    messageDecrypted: `📢 [飛安主動報 ${checkHour}] ${pushMsg}`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true
  });

  writeDB(db);
  res.json({ success: true, trip, notification: notificationItem });
});

export default router;
