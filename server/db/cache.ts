import path from "path";
import fs from "fs";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { broadcastTripChange } from "./sse.js";
import { DEFAULT_TRIP } from "./seed.js";
import type { MemoryDB } from "../types/db";
import { safeHash } from "../utils/crypto.js";

export const DB_PATH = path.join(process.cwd(), "trips-db.json");

// Global memory cache representing our database state
export let memoryDB: MemoryDB = {
  activeTripId: "tokyo-group-2026",
  users: [
    { id: "u1", username: "Admin", password: "", name: "Admin", email: "admin@gmail.com", avatarColor: "#3b82f6" },
  ],
  trips: [JSON.parse(JSON.stringify(DEFAULT_TRIP))],
  invitations: []
};

// Keep a deep copy of the last synchronized database state to correctly compute delta differences
export let lastSyncedDB: MemoryDB = JSON.parse(JSON.stringify(memoryDB));

// Asynchronously hash the default admin's password upon startup and expose as a module-level promise
export const initAdminPromise = safeHash("123").then(hash => {
  const admin = memoryDB.users.find(u => u.id === "u1");
  if (admin && admin.password === "") {
    admin.password = hash;
  }
  const adminSynced = lastSyncedDB.users.find(u => u.id === "u1");
  if (adminSynced && adminSynced.password === "") {
    adminSynced.password = hash;
  }
}).catch(err => {
  console.error("Failed to hash default admin password on startup:", err);
});

// Synchronous fetch of current state
export function getDB(): MemoryDB {
  return memoryDB;
}

// Setter to update memoryDB from other files
export function setMemoryDB(data: Partial<MemoryDB>) {
  memoryDB = {
    activeTripId: data.activeTripId || memoryDB.activeTripId,
    users: Array.isArray(data.users) ? data.users : memoryDB.users,
    trips: Array.isArray(data.trips) ? data.trips : memoryDB.trips,
    invitations: Array.isArray(data.invitations) ? data.invitations : memoryDB.invitations
  };
  lastSyncedDB = JSON.parse(JSON.stringify(memoryDB));
}

// Background Delta Sync of Cache to Firestore (zero lock times, high responsiveness)
export function writeDB(data: Partial<MemoryDB>) {
  const oldDB = lastSyncedDB;
  
  memoryDB = {
    activeTripId: data.activeTripId || memoryDB.activeTripId,
    users: Array.isArray(data.users) ? data.users : memoryDB.users,
    trips: Array.isArray(data.trips) ? data.trips : memoryDB.trips,
    invitations: Array.isArray(data.invitations) ? data.invitations : memoryDB.invitations
  };

  // Deep clone memoryDB after updating it so that it becomes the baseline for the next sync
  lastSyncedDB = JSON.parse(JSON.stringify(memoryDB));


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
          const payload = { 
            ...t,
            participantIds: (t.participants || []).map(p => p.id).filter(Boolean)
          };
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
