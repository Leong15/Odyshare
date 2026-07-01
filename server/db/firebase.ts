import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { seedDefaults } from "./seed.js";
import { DB_PATH, setMemoryDB } from "./cache.js";
import type { DBUser, DBInvitation } from "../types/db";
import type { Trip } from "../../src/types";
import { createLogger } from "../utils/logger.js";
import { DEFAULT_ACTIVE_TRIP_ID } from "../utils/constants.js";

const logger = createLogger("Firebase");

// Set Firestore log level to 'error' to silent 'CANCELLED: Disconnecting idle stream' logs
setLogLevel("error");


// Load Firebase configuration safely from root
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = {
  ...JSON.parse(fs.readFileSync(configPath, "utf-8")),
  apiKey: process.env.FIREBASE_API_KEY || JSON.parse(fs.readFileSync(configPath, "utf-8")).apiKey
};
const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "default");
export const storage = getStorage(firebaseApp);

// Helper to race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs))
  ]);
}

function isValidUser(data: unknown): data is Omit<DBUser, "id"> {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, any>;
  return typeof d.username === "string" && d.username.length > 0;
}

function isValidTrip(data: unknown): data is Omit<Trip, "id"> {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, any>;
  return typeof d.name === "string" && d.name.length > 0 && typeof d.destination === "string" && d.destination.length > 0;
}

export async function initFirebase() {
  logger.info("[Firebase db.ts] Fetching stored documents from Cloud Firestore...");
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
      const data = doc.data();
      if (isValidUser(data)) {
        users.push({ id: doc.id, ...data } as DBUser);
      } else {
        logger.warn(`Skipping invalid user document: ${doc.id}`);
      }
    });

    const trips: Trip[] = [];
    tripsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (isValidTrip(data)) {
        trips.push({ id: doc.id, ...data } as unknown as Trip);
      } else {
        logger.warn(`Skipping invalid trip document: ${doc.id}`);
      }
    });

    const invitations: DBInvitation[] = [];
    invSnapshot.forEach((doc) => {
      invitations.push({ id: doc.id, ...doc.data() } as DBInvitation);
    });

    let activeTripId = DEFAULT_ACTIVE_TRIP_ID;
    if (configDoc.exists()) {
      activeTripId = configDoc.data().activeTripId || activeTripId;
    }

    if (trips.length === 0) {
      logger.info("[Firebase db.ts] Firestore collection is blank. Seeding with high-fidelity defaults...");
      await seedDefaults();
    } else {
      setMemoryDB({
        activeTripId,
        users,
        trips,
        invitations
      });
      logger.info(`[Firebase db.ts] Loaded Firestore dataset: Users (${users.length}), Trips (${trips.length}), Invitations (${invitations.length})`);
    }
  } catch (err) {
    logger.error("[Firebase db.ts] Failed to establish active session with Firestore on boot:", err);
    // Fall back to local file if available
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed?.trips) {
          setMemoryDB(parsed);
          logger.info("[Firebase db.ts] Safely failed back to cached local DB state.");
        }
      } catch (e) {}
    }
  }
}
