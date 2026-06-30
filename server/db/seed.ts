import { setDoc, doc } from "firebase/firestore";
import { db } from "./firebase.js";
import fs from "fs";
import { safeHash } from "../utils/crypto.js";

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
  flightEstimates: [],
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
    await setDoc(doc(db, "users", id), uData);
  }
  
  const tripPayload = {
    ...DEFAULT_TRIP,
    participantIds: ((DEFAULT_TRIP.participants as any[]) || []).map((p: any) => p.id).filter(Boolean)
  };
  await setDoc(doc(db, "trips", DEFAULT_TRIP.id), tripPayload);
  await setDoc(doc(db, "config", "active"), { activeTripId: "tokyo-group-2026" });

  const seeded = {
    activeTripId: "tokyo-group-2026",
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
