import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setLogLevel } from "firebase/firestore";
import { seedDefaults } from "./seed.js";
import { DB_PATH, setMemoryDB } from "./cache.js";
import type { DBUser, DBInvitation } from "../types/db";
import type { Trip } from "../../src/types";

// Set Firestore log level to 'error' to silent 'CANCELLED: Disconnecting idle stream' logs
setLogLevel("error");

// Load Firebase configuration safely from root
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "default");

// Helper to race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs))
  ]);
}

export async function initFirebase() {
  console.log("[Firebase db.ts] Fetching stored documents from Cloud Firestore...");
  try {
    const [usersSnapshot, tripsSnapshot, invSnapshot, configDoc] = await withTimeout(
      Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "trips")),
        getDocs(collection(db, "invitations")),
        getDoc(doc(db, "config", "active"))
      ]),
      4000,
      "Firestore initial fetch timed out"
    );

    const users: DBUser[] = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as DBUser);
    });

    const trips: Trip[] = [];
    tripsSnapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as unknown as Trip);
    });

    const invitations: DBInvitation[] = [];
    invSnapshot.forEach((doc) => {
      invitations.push({ id: doc.id, ...doc.data() } as DBInvitation);
    });

    let activeTripId = "tokyo-group-2026";
    if (configDoc.exists()) {
      activeTripId = configDoc.data().activeTripId || activeTripId;
    }

    if (trips.length === 0) {
      console.log("[Firebase db.ts] Firestore collection is blank. Seeding with high-fidelity defaults...");
      await seedDefaults();
    } else {
      setMemoryDB({
        activeTripId,
        users,
        trips,
        invitations
      });
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
          setMemoryDB(parsed);
          console.log("[Firebase db.ts] Safely failed back to cached local DB state.");
        }
      } catch (e) {}
    }
  }
}
