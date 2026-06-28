import { setDoc, doc } from "firebase/firestore";
import { db } from "./firebase.js";
import { DB_PATH, setMemoryDB } from "./cache.js";
import { DEFAULT_TRIP } from "./defaultTrip.js";
import fs from "fs";

export { DEFAULT_TRIP };

export async function seedDefaults() {
  const defaultUsers = [
    { id: "u1", username: "Admin", password: "123", name: "Admin", email: "admin@gmail.com", avatarColor: "#3b82f6" },
  ];
  for (const u of defaultUsers) {
    const { id, ...uData } = u;
    await setDoc(doc(db, "users", id), uData);
  }
  
  await setDoc(doc(db, "trips", DEFAULT_TRIP.id), DEFAULT_TRIP);
  await setDoc(doc(db, "config", "active"), { activeTripId: "tokyo-group-2026" });

  const seeded = {
    activeTripId: "tokyo-group-2026",
    users: defaultUsers,
    trips: [JSON.parse(JSON.stringify(DEFAULT_TRIP))],
    invitations: []
  };

  setMemoryDB(seeded);
  
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2), "utf-8");
  } catch (e) {}
}
