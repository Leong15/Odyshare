import path from "path";
import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { seedDefaults } from "./seed.js";
import { DB_PATH, setMemoryDB } from "./cache.js";
import type { DBUser, DBInvitation } from "../types/db";
import type { Trip } from "../../src/types";
import { createLogger } from "../utils/logger.js";
import { DEFAULT_ACTIVE_TRIP_ID } from "../utils/constants.js";

const logger = createLogger("Firebase");

// Load Firebase configuration safely from root
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let rawConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    logger.error("Failed to read firebase-applet-config.json:", err);
  }
}

let adminApp: any;

// Use Service Account JSON from environment if available, otherwise fallback to local credentials config
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: rawConfig.storageBucket || `${serviceAccount.project_id}.firebasestorage.app`
    });
    logger.info("Initialized Firebase Admin SDK successfully with service account.");
  } catch (err) {
    logger.error("Failed to initialize with FIREBASE_SERVICE_ACCOUNT_JSON, falling back to basic config:", err);
    adminApp = initializeApp({
      projectId: rawConfig.projectId,
      storageBucket: rawConfig.storageBucket
    });
  }
} else {
  logger.warn("FIREBASE_SERVICE_ACCOUNT_JSON environment variable not found. Initializing with basic config...");
  adminApp = initializeApp({
    projectId: rawConfig.projectId,
    storageBucket: rawConfig.storageBucket
  });
}

const databaseId = rawConfig.firestoreDatabaseId || "ai-studio-0434fc47-5e16-4d10-b891-81f7bf4003e7";

// Export standard firestore instance and storage bucket
export const db = getFirestore(adminApp, databaseId);
export const storage = getStorage(adminApp).bucket();

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
        db.collection("users").get(),
        db.collection("trips").get(),
        db.collection("invitations").get(),
        db.collection("config").doc("active").get()
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
    if (configDoc.exists) {
      activeTripId = configDoc.data()?.activeTripId || activeTripId;
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
