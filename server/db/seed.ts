import { db } from "./firebase.js";
import fs from "fs";
import { safeHash } from "../utils/crypto.js";
import { DEFAULT_ACTIVE_TRIP_ID } from "../utils/constants.js";

// Initial default group trip to showcase features immediately
export const DEFAULT_TRIP = {
  id: "default_trip",
  name: "Tokyo Adventure & Cuisine",
  destination: "Tokyo, Japan",
  startDate: "2026-10-12",
  endDate: "2026-10-18",
  totalBudget: 4200,
  status: "active",
  lat: 35.6762,
  lng: 139.6503,
  participants: [],
  itineraries: [],
  expenses: [],
  documents: [],
  chats: []
};

export async function seedDefaults() {
  const hashedPassword = await safeHash("123");
  const defaultUsers = [
    { id: "u1", username: "Admin", password: hashedPassword, name: "Admin", email: "admin@gmail.com", avatarColor: "#3b82f6" },
  ];
  for (const u of defaultUsers) {
    const { id, ...uData } = u;
    await db.collection("users").doc(id).set(uData);
  }
  
  const tripPayload = {
    ...DEFAULT_TRIP,
    participantIds: ((DEFAULT_TRIP.participants as any[]) || []).map((p: any) => p.id).filter(Boolean)
  };
  await db.collection("trips").doc(DEFAULT_TRIP.id).set(tripPayload);
  await db.collection("config").doc("active").set({ activeTripId: DEFAULT_ACTIVE_TRIP_ID });

  const seeded = {
    activeTripId: DEFAULT_ACTIVE_TRIP_ID,
    users: defaultUsers,
    trips: [JSON.parse(JSON.stringify(DEFAULT_TRIP))],
    invitations: []
  };

  const { setMemoryDB, DB_PATH } = await import("./cache.js");
  setMemoryDB(seeded);
  
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2), "utf-8");
  } catch (e) {}
}
