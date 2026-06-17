import path from "path";
import fs from "fs";
import { Request } from "express";

// Path to persistent DB file
export const DB_PATH = path.join(process.cwd(), "trips-db.json");

// Initial default group trip to showcase features immediately
export const DEFAULT_TRIP = {
  id: "tokyo-group-2026",
  name: "Tokyo Adventure & Cuisine",
  destination: "Tokyo, Japan",
  startDate: "2026-10-12",
  endDate: "2026-10-18",
  totalBudget: 4200,
  participants: [
    { id: "u1", name: "Leo (You)", email: "leochau46@gmail.com", avatarColor: "#3b82f6", publicKey: "pub_key_sec_leo_908f" },
    { id: "u2", name: "Chloe", email: "chloe.tan@example.com", avatarColor: "#ec4899", publicKey: "pub_key_sec_chloe_324a" },
    { id: "u3", name: "David", email: "david.w@example.com", avatarColor: "#10b981", publicKey: "pub_key_sec_david_455e" },
    { id: "u4", name: "Sophy", email: "sophy.k@example.com", avatarColor: "#f59e0b", publicKey: "pub_key_sec_sophy_112c" }
  ],
  flightEstimates: [
    {
      id: "fl-1",
      carrier: "Japan Airlines",
      carrierLogo: "✈️",
      from: "LAX",
      to: "HND",
      price: 780,
      stops: 0,
      duration: "11h 30m",
      departureTime: "11:45 AM",
      rating: 8.9,
      votes: ["u1", "u2", "u4"],
      isCheapest: false
    },
    {
      id: "fl-2",
      carrier: "Singapore Airlines",
      carrierLogo: "✈️",
      from: "LAX",
      to: "NRT",
      price: 640,
      stops: 1,
      duration: "14h 20m",
      departureTime: "08:15 AM",
      rating: 9.1,
      votes: ["u3", "u4"],
      isCheapest: true
    },
    {
      id: "fl-3",
      carrier: "United Airlines",
      carrierLogo: "✈️",
      from: "LAX",
      to: "HND",
      price: 820,
      stops: 0,
      duration: "11h 50m",
      departureTime: "13:20 PM",
      rating: 7.2,
      votes: [],
      isCheapest: false
    }
  ],
  itineraries: [
    {
      id: "it-1",
      dayIndex: 0,
      time: "09:30",
      title: "Team Assembly & Coffee at Starbucks Reserve",
      description: "Gather everyone to align priorities and distribute offline map maps packages.",
      locationName: "Starbucks Reserve Roastery Tokyo, Meguro",
      category: "restaurant" as const,
      address: "2-19-23 Aobadai, Meguro City, Tokyo",
      cost: 15,
      votes: ["u1", "u2", "u3", "u4"],
      comments: [
        { id: "c-1", authorId: "u2", authorName: "Chloe", text: "They have beautiful sakura-themed merchandise here!", createdAt: "2026-06-16T08:12:00Z" },
        { id: "c-2", authorId: "u3", authorName: "David", text: "Great place to review our budget before buying museum passes.", createdAt: "2026-06-16T08:15:00Z" }
      ],
      coordinates: { x: 34, y: 65 },
      trafficStatus: "smooth" as const
    },
    {
      id: "it-2",
      dayIndex: 0,
      time: "13:00",
      title: "Meiji Shrine Preservation Walk",
      description: "Quiet stroll through the beautiful towering forest on our way to Harajuku shopping zones.",
      locationName: "Meiji Jingu Shrine",
      category: "sight" as const,
      address: "1-1 Yoyogikamizonocho, Shibuya City, Tokyo",
      cost: 0,
      votes: ["u1", "u4"],
      comments: [],
      coordinates: { x: 42, y: 48 },
      trafficStatus: "moderate" as const
    },
    {
      id: "it-3",
      dayIndex: 1,
      time: "10:30",
      title: "Sensō-ji Ancient Temple Tour",
      description: "Explore Nakamise street snack stalls and pray at Tokyo's oldest temple complex.",
      locationName: "Sensō-ji Temple, Asakusa",
      category: "sight" as const,
      address: "2-3-1 Asakusa, Taito City, Tokyo",
      cost: 5,
      votes: ["u2", "u3", "u4"],
      comments: [
        { id: "c-3", authorId: "u4", authorName: "Sophy", text: "Must try the matcha melonpan shop near the west exit!", createdAt: "2026-06-16T08:30:00Z" }
      ],
      coordinates: { x: 72, y: 22 },
      trafficStatus: "congested" as const
    },
    {
      id: "it-4",
      dayIndex: 1,
      time: "18:30",
      title: "Golden Gai Shinjuku Izakaya Dinner",
      description: "A compact grid of 200 tiny bars and eateries. Very local atmosphere.",
      locationName: "Golden Gai Shinjuku",
      category: "restaurant" as const,
      address: "1-1-6 Kabukicho, Shinjuku City, Tokyo",
      cost: 45,
      votes: ["u1", "u2", "u3", "u4"],
      comments: [
        { id: "c-4", authorId: "u3", authorName: "David", text: "Cash only here! Make sure to withdraw some JPY.", createdAt: "2026-06-16T08:50:00Z" }
      ],
      coordinates: { x: 25, y: 35 },
      trafficStatus: "congested" as const
    }
  ],
  expenses: [
    {
      id: "exp-1",
      amount: 480,
      description: "Hotel AirBnb Booking Deposit",
      paidById: "u2",
      splitAmongIds: ["u1", "u2", "u3", "u4"],
      category: "lodging" as const,
      date: "2026-06-15"
    },
    {
      id: "exp-2",
      amount: 120,
      description: "Pre-booked Shibuya Sky Observation Tickets",
      paidById: "u1",
      splitAmongIds: ["u1", "u2", "u3", "u4"],
      category: "activities" as const,
      date: "2026-06-16"
    },
    {
      id: "exp-3",
      amount: 95,
      description: "Izakaya Dinner Night 1",
      paidById: "u3",
      splitAmongIds: ["u1", "u3", "u4"],
      category: "food" as const,
      date: "2026-06-16"
    }
  ],
  documents: [
    {
      id: "doc-1",
      name: "TokyoMetro_Offline_Map_2026.pdf",
      size: "2.4 MB",
      type: "application/pdf",
      uploadedAt: "2026-06-16T06:10:00Z",
      url: "#",
      accessKey: "doc_hash_77a9be34fc",
      uploadedBy: "Leo"
    },
    {
      id: "doc-2",
      name: "Apartment_Hotel_Confirmation.pdf",
      size: "450 KB",
      type: "application/pdf",
      uploadedAt: "2026-06-16T06:15:00Z",
      url: "#",
      accessKey: "doc_hash_11b2de54ac",
      uploadedBy: "Chloe"
    }
  ],
  chats: [
    {
      id: "msg-1",
      senderId: "u1",
      senderName: "Leo",
      avatarColor: "#3b82f6",
      messageEncrypted: "U2FsdGVkX19P8f9eFv0aY5Y7W8I7K8T8L+v0Zz5bSg9j4X3z...",
      messageDecrypted: "Hey team! I have uploaded the offline subway maps to our secure vault.",
      timestamp: "2026-06-16T06:12:00Z"
    },
    {
      id: "msg-2",
      senderId: "u2",
      senderName: "Chloe",
      avatarColor: "#ec4899",
      messageEncrypted: "U2FsdGVkX1+9bY5B6C4F7H3K8M9Q+fG8H2J9O0L...",
      messageDecrypted: "Awesome, downloading it now! I paid the Airbnb deposit, added it to Expense tracker.",
      timestamp: "2026-06-16T06:14:00Z"
    },
    {
      id: "msg-3",
      senderId: "system",
      senderName: "System Alert",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: "📌 Chloe added expense 'Hotel AirBnb Booking Deposit' ($480.00)",
      timestamp: "2026-06-16T06:14:05Z",
      isTripUpdate: true
    },
    {
      id: "msg-4",
      senderId: "u4",
      senderName: "Sophy",
      avatarColor: "#f59e0b",
      messageEncrypted: "U2FsdGVkX19W9o0bS1m3k5L8o9p0q===",
      messageDecrypted: "The math splits perfectly, automatic reimbursement is enabled! High-five for zero stress.",
      timestamp: "2026-06-16T06:18:00Z"
    }
  ]
};

// Initial state load helper
export function getDB() {
  let db: {
    activeTripId: string;
    users: any[];
    trips: any[];
    invitations: any[];
  } = {
    activeTripId: "tokyo-group-2026",
    users: [
      { id: "u1", username: "leo", password: "123", name: "Leo (You)", email: "leochau46@gmail.com", avatarColor: "#3b82f6" },
      { id: "u2", username: "chloe", password: "123", name: "Chloe", email: "chloe.tan@example.com", avatarColor: "#ec4899" },
      { id: "u3", username: "david", password: "123", name: "David", email: "david.w@example.com", avatarColor: "#10b981" },
      { id: "u4", username: "sophy", password: "123", name: "Sophy", email: "sophy.k@example.com", avatarColor: "#f59e0b" }
    ],
    trips: [JSON.parse(JSON.stringify(DEFAULT_TRIP))],
    invitations: []
  };
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.trips)) {
        db = parsed;
        if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
          db.users = [
            { id: "u1", username: "leo", password: "123", name: "Leo (You)", email: "leochau46@gmail.com", avatarColor: "#3b82f6" },
            { id: "u2", username: "chloe", password: "123", name: "Chloe", email: "chloe.tan@example.com", avatarColor: "#ec4899" },
            { id: "u3", username: "david", password: "123", name: "David", email: "david.w@example.com", avatarColor: "#10b981" },
            { id: "u4", username: "sophy", password: "123", name: "Sophy", email: "sophy.k@example.com", avatarColor: "#f59e0b" }
          ];
        }
        if (!db.invitations || !Array.isArray(db.invitations)) {
          db.invitations = [];
        }
      } else if (parsed && parsed.id) {
        // Upgrade flat structure
        db = {
          activeTripId: parsed.id || "tokyo-group-2026",
          users: [
            { id: "u1", username: "leo", password: "123", name: "Leo (You)", email: "leochau46@gmail.com", avatarColor: "#3b82f6" },
            { id: "u2", username: "chloe", password: "123", name: "Chloe", email: "chloe.tan@example.com", avatarColor: "#ec4899" },
            { id: "u3", username: "david", password: "123", name: "David", email: "david.w@example.com", avatarColor: "#10b981" },
            { id: "u4", username: "sophy", password: "123", name: "Sophy", email: "sophy.k@example.com", avatarColor: "#f59e0b" }
          ],
          trips: [parsed],
          invitations: []
        };
        writeDB(db);
      }
    } catch (err) {
      console.error("Error parsing trips JSON DB:", err);
    }
  } else {
    writeDB(db);
  }
  return db;
}

export function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db:", err);
  }
}

export function getTripForRequest(req: Request) {
  const userId = req.headers["x-user-id"] as string;
  const tripId = req.headers["x-trip-id"] as string;
  const db = getDB();

  // Find trip specified by tripId
  let trip = db.trips.find(t => t.id === tripId);
  
  // Verify that the user is actually a participant of this trip
  if (userId) {
    if (trip && !trip.participants.some((p: any) => p.id === userId)) {
      trip = undefined;
    }
    
    // Fallback to first trip where user is a participant
    if (!trip) {
      trip = db.trips.find(t => t.participants.some((p: any) => p.id === userId));
    }
  }

  // Auto-generate project if logged-in user doesn't have any
  if (!trip && userId) {
    const user = db.users.find(u => u.id === userId);
    const newTripId = "trip-" + Date.now();
    trip = {
      id: newTripId,
      name: "My Wanderlust Journey",
      destination: "Paris, France",
      startDate: "2026-11-20",
      endDate: "2026-11-27",
      totalBudget: 3500,
      participants: [
        {
          id: userId,
          name: user ? user.name : "Adventurer",
          email: user?.email || "user@example.com",
          avatarColor: user?.avatarColor || "#3b82f6",
          publicKey: "pub_key_sec_user_initial",
          budgetLimit: 1500
        }
      ],
      flightEstimates: [],
      itineraries: [
        {
          id: "it-init-" + Date.now(),
          dayIndex: 0,
          time: "14:00",
          title: "Arrive & Explore the Latin Quarter",
          locationName: "Latin Quarter, Paris",
          description: "Stroll through historic cobblestone streets, grab a local croissant, and rest for the week ahead.",
          cost: 35,
          category: "sight" as const,
          votes: [],
          comments: [],
          coordinates: { x: 45, y: 35 },
          trafficStatus: "smooth" as const
        }
      ],
      expenses: [],
      documents: [],
      chats: []
    };
    db.trips.push(trip);
    writeDB(db);
  }

  // Fallback to global active trip or first trip
  if (!trip) {
    trip = db.trips.find(t => t.id === db.activeTripId) || db.trips[0];
  }

  // Filter visible trips scoped strictly to user
  const visibleTrips = userId 
    ? db.trips.filter(t => t.participants.some((p: any) => p.id === userId))
    : db.trips;

  return {
    ...trip,
    tripsList: visibleTrips.map(t => ({
      id: t.id,
      name: t.name,
      destination: t.destination,
      startDate: t.startDate,
      endDate: t.endDate,
      totalBudget: t.totalBudget
    }))
  };
}

export function saveTripForRequest(req: Request, updatedTrip: any) {
  const db = getDB();
  const cleanData = { ...updatedTrip };
  delete cleanData.tripsList;
  
  const idx = db.trips.findIndex(t => t.id === cleanData.id);
  if (idx !== -1) {
    db.trips[idx] = cleanData;
  } else {
    db.trips.push(cleanData);
  }
  writeDB(db);
}

export function readTripsDB(req?: Request) {
  if (req) {
    return getTripForRequest(req);
  }
  const db = getDB();
  let active = db.trips.find(t => t.id === db.activeTripId);
  if (!active && db.trips.length > 0) {
    active = db.trips[0];
    db.activeTripId = active.id;
    writeDB(db);
  } else if (!active) {
    active = JSON.parse(JSON.stringify(DEFAULT_TRIP));
    db.activeTripId = active.id;
    db.trips = [active];
    writeDB(db);
  }
  return {
    ...active,
    tripsList: db.trips.map(t => ({
      id: t.id,
      name: t.name,
      destination: t.destination,
      startDate: t.startDate,
      endDate: t.endDate,
      totalBudget: t.totalBudget
    }))
  };
}

export function writeTripsDB(data: any, req?: Request) {
  if (req) {
    saveTripForRequest(req, data);
    return;
  }
  const db = getDB();
  const cleanData = { ...data };
  delete cleanData.tripsList;
  const idx = db.trips.findIndex(t => t.id === db.activeTripId);
  if (idx !== -1) {
    db.trips[idx] = cleanData;
  } else {
    db.trips.push(cleanData);
  }
  writeDB(db);
}

// Initialize on require
getDB();
