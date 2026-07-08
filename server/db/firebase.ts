import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { 
  initializeFirestore, 
  collection as getCol, 
  doc as getDocRef, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import { seedDefaults } from "./seed.js";
import { DB_PATH, setMemoryDB } from "./cache.js";
import type { DBUser, DBInvitation } from "../types/db";
import type { Trip } from "../../src/types";
import { createLogger } from "../utils/logger.js";
import { DEFAULT_ACTIVE_TRIP_ID } from "../utils/constants.js";

const logger = createLogger("Firebase");


// Load Firebase configuration safely from root
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const firebaseConfig = {
  ...rawConfig,
  apiKey: process.env.FIREBASE_API_KEY || rawConfig.apiKey
};

const firebaseApp = initializeApp(firebaseConfig);

// Initialize Client Firestore with custom database ID and forcing long polling to bypass sandbox environment limitations
const clientDb = initializeFirestore(
  firebaseApp,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId || "ai-studio-0434fc47-5e16-4d10-b891-81f7bf4003e7"
);

// Polyfill Firestore Admin SDK interface using client SDK methods
export const db = {
  collection(collectionName: string) {
    return {
      async get() {
        const colRef = getCol(clientDb, collectionName);
        const querySnapshot = await getDocs(colRef);
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          data: () => doc.data(),
          exists: doc.exists()
        }));
        return {
          forEach(callback: (doc: any) => void) {
            docs.forEach(callback);
          },
          docs,
          size: docs.length
        };
      },
      doc(docId: string) {
        return {
          async get() {
            const docRef = getDocRef(clientDb, collectionName, docId);
            const docSnap = await getDoc(docRef);
            return {
              id: docSnap.id,
              exists: docSnap.exists(),
              data: () => docSnap.data()
            };
          },
          async set(data: any) {
            const docRef = getDocRef(clientDb, collectionName, docId);
            await setDoc(docRef, data);
          },
          async delete() {
            const docRef = getDocRef(clientDb, collectionName, docId);
            await deleteDoc(docRef);
          }
        };
      }
    };
  }
} as any;

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
