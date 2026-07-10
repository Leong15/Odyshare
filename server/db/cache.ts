import path from "path";
import fs from "fs";
import { db } from "./firebase.js";
import { broadcastTripChange } from "./sse.js";
import { DEFAULT_TRIP } from "./seed.js";
import type { MemoryDB } from "../types/db";
import { safeHash } from "../utils/crypto.js";
import { createLogger } from "../utils/logger.js";
import { DEFAULT_ACTIVE_TRIP_ID } from "../utils/constants.js";

/**
 * ============================================================================
 * CONCURRENCY, TRANSACTION AND SCALING LIMITATIONS WARNING (已知規模限制說明)
 * ============================================================================
 * 
 * Please be aware of the following architectural trade-offs in this file:
 * 
 * 1. Single-Instance / Non-Distributed State:
 *    `memoryDB` is stored as a mutable global object (memory singleton). This is optimal 
 *    for near-zero-latency local updates and works perfectly for single-container 
 *    deployments. However, if deployed on horizontally-scaled container nodes (e.g. multi-node 
 *    Cloud Run instances), each node will maintain its own independent in-memory state, 
 *    resulting in data inconsistency.
 * 
 * 2. Race Conditions & No Transaction/Locking:
 *    Since `writeDB` executes delta updates asynchronously in the background via non-blocking 
 *    promises without row-level locking or atomic database-level transactions, concurrent writes 
 *    to different keys inside a nested structure could potentially lead to race conditions 
 *    or write conflicts.
 * 
 * 3. Mitigation & Recommendations for Production Scale:
 *    For large production environments, replace this in-memory singleton cache with direct 
 *    cloud-native queries to Firestore/Spanner using transaction isolation levels, or integrate 
 *    a distributed lock service (such as Redis) to arbitrate access.
 * ============================================================================
 */

const logger = createLogger("Cache");


export const DB_PATH = path.join(process.cwd(), "trips-db.json");

// Global memory cache representing our database state
export let memoryDB: MemoryDB = {
  activeTripId: DEFAULT_ACTIVE_TRIP_ID,
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
  logger.error("Failed to hash default admin password on startup:", err);
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

// Helper function containing all the Firestore synchronization logic
async function syncToFirestore(oldDB: MemoryDB, currentDB: MemoryDB): Promise<void> {
  // 1. Sync Active Config
  if (currentDB.activeTripId !== oldDB.activeTripId) {
    await db.collection("config").doc("active").set({ activeTripId: currentDB.activeTripId });
  }

  // 2. Sync Users
  const oldUsers = new Map(oldDB.users.map(u => [u.id, u]));
  const newUsers = new Map(currentDB.users.map(u => [u.id, u]));

  for (const [id, u] of newUsers.entries()) {
    const oldU = oldUsers.get(id);
    if (!oldU || JSON.stringify(oldU) !== JSON.stringify(u)) {
      const { id: _, ...payload } = u;
      await db.collection("users").doc(id).set(payload);
    }
  }
  for (const id of oldUsers.keys()) {
    if (!newUsers.has(id)) {
      await db.collection("users").doc(id).delete();
    }
  }

  // 3. Sync Trips Group
  const oldTrips = new Map(oldDB.trips.map(t => [t.id, t]));
  const newTrips = new Map(currentDB.trips.map(t => [t.id, t]));

  for (const [id, t] of newTrips.entries()) {
    const oldT = oldTrips.get(id);
    if (!oldT || oldT.updatedAt !== t.updatedAt) {
      const { id: _, ...payload } = { 
        ...t,
        participantIds: (t.participants || []).map(p => p.id).filter(Boolean)
      };
      await db.collection("trips").doc(id).set(payload);
    }
  }
  for (const id of oldTrips.keys()) {
    if (!newTrips.has(id)) {
      await db.collection("trips").doc(id).delete();
    }
  }

  // 4. Sync Invitations
  const oldInvs = new Map(oldDB.invitations.map(i => [i.id, i]));
  const newInvs = new Map(currentDB.invitations.map(i => [i.id, i]));

  for (const [id, i] of newInvs.entries()) {
    const oldI = oldInvs.get(id);
    if (!oldI || JSON.stringify(oldI) !== JSON.stringify(i)) {
      const { id: _, ...payload } = i;
      await db.collection("invitations").doc(id).set(payload);
    }
  }
  for (const id of oldInvs.keys()) {
    if (!newInvs.has(id)) {
      await db.collection("invitations").doc(id).delete();
    }
  }

  // Backup to disk too
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(currentDB, null, 2), "utf-8");
  } catch (e) {}
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
      await syncToFirestore(oldDB, memoryDB);
    } catch (error) {
      logger.error("[Firebase db.ts] Failed to synchronize delta states to Cloud Firestore:", error);
    }
  })();
}

// Durable and Awaited Delta Sync of Cache to Firestore (guarantees persistence before response)
export async function writeDBAndConfirm(data: Partial<MemoryDB>): Promise<void> {
  const oldDB = lastSyncedDB;
  
  memoryDB = {
    activeTripId: data.activeTripId || memoryDB.activeTripId,
    users: Array.isArray(data.users) ? data.users : memoryDB.users,
    trips: Array.isArray(data.trips) ? data.trips : memoryDB.trips,
    invitations: Array.isArray(data.invitations) ? data.invitations : memoryDB.invitations
  };

  // Deep clone memoryDB after updating it so that it becomes the baseline for the next sync
  lastSyncedDB = JSON.parse(JSON.stringify(memoryDB));

  // Await completion directly so that failures are caught and reported
  try {
    await syncToFirestore(oldDB, memoryDB);
  } catch (error) {
    logger.error("[Firebase db.ts] Failed to synchronize and confirm delta states to Cloud Firestore:", error);
    throw error;
  }
}
