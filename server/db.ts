import path from "path";
import fs from "fs";
import { Request } from "express";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, getDoc, setLogLevel } from "firebase/firestore";

// Path to temporary DB file as a fallback
export const DB_PATH = path.join(process.cwd(), "trips-db.json");

// Set Firestore log level to 'error' to silent 'CANCELLED: Disconnecting idle stream' logs
setLogLevel("error");

// Load Firebase configuration safely from root
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "default");

// Initial default group trip to showcase features immediately
export const DEFAULT_TRIP = {
  id: "tokyo-group-2026",
  name: "Tokyo Adventure & Cuisine",
  destination: "Tokyo, Japan",
  startDate: "2026-10-12",
  endDate: "2026-10-18",
  totalBudget: 4200,
  status: "active",
  lat: 35.6762,
  lng: 139.6503,
  participants: [
    { id: "u1", username: "Admin", password: "123", name: "Admin", email: "admin@gmail.com", avatarColor: "#3b82f6" },
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
      returnDepartureTime: "15:20 PM",
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
      returnDepartureTime: "17:15 PM",
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
      returnDepartureTime: "19:30 PM",
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

// Global memory cache representing our database state
let memoryDB: {
  activeTripId: string;
  users: any[];
  trips: any[];
  invitations: any[];
} = {
  activeTripId: "tokyo-group-2026",
  users: [
    { id: "u1", username: "Admin", password: "123", name: "Admin", email: "admin@gmail.com", avatarColor: "#3b82f6" },
  ],
  trips: [JSON.parse(JSON.stringify(DEFAULT_TRIP))],
  invitations: []
};

// Initialize connection and pull initial documents to fill visual cache
export async function initFirebase() {
  console.log("[Firebase db.ts] Fetching stored documents from Cloud Firestore...");
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users: any[] = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    const tripsSnapshot = await getDocs(collection(db, "trips"));
    const trips: any[] = [];
    tripsSnapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() });
    });

    const invSnapshot = await getDocs(collection(db, "invitations"));
    const invitations: any[] = [];
    invSnapshot.forEach((doc) => {
      invitations.push({ id: doc.id, ...doc.data() });
    });

    const configDoc = await getDoc(doc(db, "config", "active"));
    let activeTripId = "tokyo-group-2026";
    if (configDoc.exists()) {
      activeTripId = configDoc.data().activeTripId || activeTripId;
    }

    if (trips.length === 0) {
      console.log("[Firebase db.ts] Firestore collection is blank. Seeding with high-fidelity defaults...");
      
      const defaultUsers = [
        { id: "u1", username: "Admin", password: "123", name: "Admin", email: "admin@gmail.com", avatarColor: "#3b82f6" },
      ];
      for (const u of defaultUsers) {
        const { id, ...uData } = u;
        await setDoc(doc(db, "users", id), uData);
      }
      
      await setDoc(doc(db, "trips", DEFAULT_TRIP.id), DEFAULT_TRIP);
      await setDoc(doc(db, "config", "active"), { activeTripId: "tokyo-group-2026" });

      memoryDB = {
        activeTripId: "tokyo-group-2026",
        users: defaultUsers,
        trips: [JSON.parse(JSON.stringify(DEFAULT_TRIP))],
        invitations: []
      };
      
      // Seed fallback local copy for reference
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(memoryDB, null, 2), "utf-8");
      } catch (e) {}
    } else {
      memoryDB = {
        activeTripId,
        users,
        trips,
        invitations
      };
      console.log(`[Firebase db.ts] Loaded Firestore dataset: Users (${users.length}), Trips (${trips.length}), Invitations (${invitations.length})`);
    }
  } catch (err) {
    console.error("[Firebase db.ts] Failed to establish active session with Firestore on boot:", err);
    // Fall back to local file if available
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed?.trips) {
          memoryDB = parsed;
          console.log("[Firebase db.ts] Safely failed back to cached local DB state.");
        }
      } catch (e) {}
    }
  }
}

// Synchronous fetch of current state
export function getDB() {
  return memoryDB;
}

// Background Delta Sync of Cache to Firestore (zero lock times, high responsiveness)
export function writeDB(data: any) {
  const oldDB = { ...memoryDB };
  memoryDB = {
    activeTripId: data.activeTripId || memoryDB.activeTripId,
    users: Array.isArray(data.users) ? data.users : memoryDB.users,
    trips: Array.isArray(data.trips) ? data.trips : memoryDB.trips,
    invitations: Array.isArray(data.invitations) ? data.invitations : memoryDB.invitations
  };

  // Run async firestore updates
  (async () => {
    try {
      // 1. Sync Active Config
      if (memoryDB.activeTripId !== oldDB.activeTripId) {
        await setDoc(doc(db, "config", "active"), { activeTripId: memoryDB.activeTripId });
      }

      // 2. Sync Users
      const oldUsers = new Map(oldDB.users.map(u => [u.id, u]));
      const newUsers = new Map(memoryDB.users.map(u => [u.id, u]));

      for (const [id, u] of newUsers.entries()) {
        const oldU = oldUsers.get(id);
        if (!oldU || JSON.stringify(oldU) !== JSON.stringify(u)) {
          const payload = { ...u };
          delete payload.id;
          await setDoc(doc(db, "users", id), payload);
        }
      }
      for (const id of oldUsers.keys()) {
        if (!newUsers.has(id)) {
          await deleteDoc(doc(db, "users", id));
        }
      }

      // 3. Sync Trips Group
      const oldTrips = new Map(oldDB.trips.map(t => [t.id, t]));
      const newTrips = new Map(memoryDB.trips.map(t => [t.id, t]));

      for (const [id, t] of newTrips.entries()) {
        const oldT = oldTrips.get(id);
        if (!oldT || JSON.stringify(oldT) !== JSON.stringify(t)) {
          const payload = { ...t };
          delete payload.id;
          await setDoc(doc(db, "trips", id), payload);
        }
      }
      for (const id of oldTrips.keys()) {
        if (!newTrips.has(id)) {
          await deleteDoc(doc(db, "trips", id));
        }
      }

      // 4. Sync Invitations
      const oldInvs = new Map(oldDB.invitations.map(i => [i.id, i]));
      const newInvs = new Map(memoryDB.invitations.map(i => [i.id, i]));

      for (const [id, i] of newInvs.entries()) {
        const oldI = oldInvs.get(id);
        if (!oldI || JSON.stringify(oldI) !== JSON.stringify(i)) {
          const payload = { ...i };
          delete payload.id;
          await setDoc(doc(db, "invitations", id), payload);
        }
      }
      for (const id of oldInvs.keys()) {
        if (!newInvs.has(id)) {
          await deleteDoc(doc(db, "invitations", id));
        }
      }

      // Backup to disk too
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(memoryDB, null, 2), "utf-8");
      } catch (e) {}

    } catch (error) {
      console.error("[Firebase db.ts] Failed to synchronize delta states to Cloud Firestore:", error);
    }
  })();
}

// Standard Request-scoped helpers
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
      name: "My OdyShare Journey",
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

  // Enrich participants with their actual database username if match is found
  if (trip && trip.participants) {
    trip = {
      ...trip,
      participants: trip.participants.map((p: any) => {
        const mu = db.users.find(u => u.id === p.id || u.email === p.email);
        return {
          ...p,
          username: mu ? mu.username : (p.username || "")
        };
      })
    };
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
      totalBudget: t.totalBudget,
      status: t.status || "active",
      lat: t.lat,
      lng: t.lng,
      participants: t.participants || [],
      expenses: t.expenses || [],
      itineraries: t.itineraries || []
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
  if (active && active.participants) {
    active = {
      ...active,
      participants: active.participants.map((p: any) => {
        const mu = db.users.find(u => u.id === p.id || u.email === p.email);
        return {
          ...p,
          username: mu ? mu.username : (p.username || "")
        };
      })
    };
  }
  return {
    ...active,
    tripsList: db.trips.map(t => ({
      id: t.id,
      name: t.name,
      destination: t.destination,
      startDate: t.startDate,
      endDate: t.endDate,
      totalBudget: t.totalBudget,
      status: t.status || "active",
      lat: t.lat,
      lng: t.lng,
      participants: t.participants || [],
      expenses: t.expenses || [],
      itineraries: t.itineraries || []
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

// Explicit Firestore CRUD functions to ensure physical cloud database integrations are called and awaited synchronously

export async function createFirestoreUser(userId: string, userData: any) {
  console.log(`[Firebase db.ts] Creating user document in Firestore: ${userId}`);
  const payload = { ...userData };
  delete payload.id;
  await setDoc(doc(db, "users", userId), payload);
}

export async function updateFirestoreUser(userId: string, userData: any) {
  console.log(`[Firebase db.ts] Updating user document in Firestore: ${userId}`);
  const payload = { ...userData };
  delete payload.id;
  await setDoc(doc(db, "users", userId), payload);
}

export async function createFirestoreTrip(tripId: string, tripData: any) {
  console.log(`[Firebase db.ts] Creating trip document in Firestore: ${tripId}`);
  const payload = { ...tripData };
  delete payload.id;
  delete payload.tripsList;
  await setDoc(doc(db, "trips", tripId), payload);
}

export async function updateFirestoreTrip(tripId: string, tripData: any) {
  console.log(`[Firebase db.ts] Updating trip document in Firestore: ${tripId}`);
  const payload = { ...tripData };
  delete payload.id;
  delete payload.tripsList;
  await setDoc(doc(db, "trips", tripId), payload);
}

export async function deleteFirestoreTrip(tripId: string) {
  console.log(`[Firebase db.ts] Deleting trip document from Firestore: ${tripId}`);
  await deleteDoc(doc(db, "trips", tripId));
}

export async function createFirestoreInvitation(invitationId: string, invitationData: any) {
  console.log(`[Firebase db.ts] Creating invitation document in Firestore: ${invitationId}`);
  const payload = { ...invitationData };
  delete payload.id;
  await setDoc(doc(db, "invitations", invitationId), payload);
}

export async function updateFirestoreInvitation(invitationId: string, invitationData: any) {
  console.log(`[Firebase db.ts] Updating invitation document in Firestore: ${invitationId}`);
  const payload = { ...invitationData };
  delete payload.id;
  await setDoc(doc(db, "invitations", invitationId), payload);
}

export async function deleteFirestoreInvitation(invitationId: string) {
  console.log(`[Firebase db.ts] Deleting invitation document from Firestore: ${invitationId}`);
  await deleteDoc(doc(db, "invitations", invitationId));
}

