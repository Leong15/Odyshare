import { Request } from "express";
import { db } from "./firebase.js";
import { getDB, writeDB, writeDBAndConfirm } from "./cache.js";
import { DEFAULT_TRIP } from "./seed.js";
import { broadcastTripChange } from "./sse.js";
import type { Trip, Participant } from "../../src/types";
import type { DBUser, DBInvitation } from "../types/db";
import { createLogger } from "../utils/logger.js";
import { DEFAULT_PARTICIPANT_BUDGET_LIMIT } from "../utils/constants.js";

const logger = createLogger("CRUD");


function enrichParticipants(participants: Participant[], users: any[]): Participant[] {
  return participants.map((p: Participant) => {
    const mu = users.find(u => u.id === p.id || u.email === p.email)
    return {
      ...p,
      username: mu ? mu.username : (p.username || "")
    }
  })
}

export function mapTripSummary(t: any) {
  return {
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
    itineraries: t.itineraries || [],
    documents: t.documents || [],
    chats: t.chats || []
  };
}


// Standard Request-scoped helpers
export function getTripForRequest(req: Request) {
  const userId = (req as any).userId as string;
  const tripId = req.headers["x-trip-id"] as string;
  const dbState = getDB();

  // Find trip specified by tripId
  let trip = dbState.trips.find(t => t.id === tripId);
  
  // Verify that the user is actually a participant of this trip
  if (userId) {
    if (trip && !trip.participants.some((p: Participant) => p.id === userId)) {
      trip = undefined;
    }
    
    // Fallback to first trip where user is a participant
    if (!trip) {
      trip = dbState.trips.find(t => t.participants.some((p: Participant) => p.id === userId));
    }
  }

  // Auto-generate project if logged-in user doesn't have any
  if (!trip && userId) {
    const user = dbState.users.find(u => u.id === userId);
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
          budgetLimit: DEFAULT_PARTICIPANT_BUDGET_LIMIT
        }
      ],
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
    dbState.trips.push(trip);
    writeDB(dbState);
  }

  // Fallback to global active trip or first trip
  const activeTrip = trip || dbState.trips.find(t => t.id === dbState.activeTripId) || dbState.trips[0] || DEFAULT_TRIP;

  // Enrich participants with their actual database username if match is found
  const enrichedTrip = {
    ...activeTrip,
    participants: enrichParticipants(activeTrip.participants || [], dbState.users)
  };

  // Filter visible trips scoped strictly to user
  const visibleTrips = userId 
    ? dbState.trips.filter(t => t.participants.some((p: Participant) => p.id === userId))
    : dbState.trips;

  return {
    ...enrichedTrip,
    tripsList: visibleTrips.map(mapTripSummary)
  } as Trip & { tripsList: Trip[] };
}

export function saveTripForRequest(req: Request, updatedTrip: Trip) {
  const dbState = getDB();
  const cleanData = { ...updatedTrip };
  delete cleanData.tripsList;
  cleanData.updatedAt = new Date().toISOString();
  
  const idx = dbState.trips.findIndex(t => t.id === cleanData.id);
  if (idx !== -1) {
    dbState.trips[idx] = cleanData;
  } else {
    dbState.trips.push(cleanData);
  }
  writeDB(dbState);

  // Broadcast change to SSE listeners
  if (cleanData.id) {
    broadcastTripChange(cleanData.id);
  }
}

export function readTripsDB(req?: Request): Trip & { tripsList: Trip[] } {
  if (req) {
    return getTripForRequest(req);
  }
  const dbState = getDB();
  let active = dbState.trips.find(t => t.id === dbState.activeTripId);
  if (!active && dbState.trips.length > 0) {
    active = dbState.trips[0];
    dbState.activeTripId = active.id;
    writeDB(dbState);
  } else if (!active) {
    const defaultTrip: Trip = JSON.parse(JSON.stringify(DEFAULT_TRIP));
    active = defaultTrip;
    dbState.activeTripId = defaultTrip.id;
    dbState.trips = [defaultTrip];
    writeDB(dbState);
  }
  let enrichedActive: Trip = active;
  if (enrichedActive.participants) {
    enrichedActive = { ...enrichedActive, participants: enrichParticipants(enrichedActive.participants, dbState.users) };
  }
  return {
    ...enrichedActive,
    tripsList: dbState.trips.map(mapTripSummary)
  } as Trip & { tripsList: Trip[] };
}

export function writeTripsDB(data: Trip, req?: Request) {
  if (req) {
    saveTripForRequest(req, data);
    return;
  }
  const dbState = getDB();
  const cleanData = { ...data };
  delete cleanData.tripsList;
  cleanData.updatedAt = new Date().toISOString();
  const idx = dbState.trips.findIndex(t => t.id === dbState.activeTripId);
  if (idx !== -1) {
    dbState.trips[idx] = cleanData;
  } else {
    dbState.trips.push(cleanData);
  }
  writeDB(dbState);

  // Broadcast change to SSE listeners
  if (cleanData.id) {
    broadcastTripChange(cleanData.id);
  }
}

export async function saveTripForRequestAndConfirm(req: Request, updatedTrip: Trip): Promise<void> {
  const dbState = getDB();
  const cleanData = { ...updatedTrip };
  delete cleanData.tripsList;
  cleanData.updatedAt = new Date().toISOString();
  
  const idx = dbState.trips.findIndex(t => t.id === cleanData.id);
  if (idx !== -1) {
    dbState.trips[idx] = cleanData;
  } else {
    dbState.trips.push(cleanData);
  }
  await writeDBAndConfirm(dbState);

  // Broadcast change to SSE listeners
  if (cleanData.id) {
    broadcastTripChange(cleanData.id);
  }
}

export async function writeTripsDBAndConfirm(data: Trip, req?: Request): Promise<void> {
  if (req) {
    await saveTripForRequestAndConfirm(req, data);
    return;
  }
  const dbState = getDB();
  const cleanData = { ...data };
  delete cleanData.tripsList;
  cleanData.updatedAt = new Date().toISOString();
  const idx = dbState.trips.findIndex(t => t.id === dbState.activeTripId);
  if (idx !== -1) {
    dbState.trips[idx] = cleanData;
  } else {
    dbState.trips.push(cleanData);
  }
  await writeDBAndConfirm(dbState);

  // Broadcast change to SSE listeners
  if (cleanData.id) {
    broadcastTripChange(cleanData.id);
  }
}

// Explicit Firestore CRUD functions to ensure physical cloud database integrations are called and awaited synchronously

export async function createFirestoreUser(userId: string, userData: Partial<DBUser>) {
  logger.info(`[Firebase db.ts] Creating user document in Firestore: ${userId}`);
  const payload = { ...userData };
  delete payload.id;
  await db.collection("users").doc(userId).set(payload);
}

export async function updateFirestoreUser(userId: string, userData: Partial<DBUser>) {
  logger.info(`[Firebase db.ts] Updating user document in Firestore: ${userId}`);
  const payload = { ...userData };
  delete payload.id;
  await db.collection("users").doc(userId).set(payload);
}

export async function createFirestoreTrip(tripId: string, tripData: Partial<Trip>) {
  logger.info(`[Firebase db.ts] Creating trip document in Firestore: ${tripId}`);
  const payload = { ...tripData };
  delete payload.id;
  delete payload.tripsList;
  await db.collection("trips").doc(tripId).set(payload);
}

export async function updateFirestoreTrip(tripId: string, tripData: Partial<Trip>) {
  logger.info(`[Firebase db.ts] Updating trip document in Firestore: ${tripId}`);
  const payload = { ...tripData };
  delete payload.id;
  delete payload.tripsList;
  await db.collection("trips").doc(tripId).set(payload);
}

export async function deleteFirestoreTrip(tripId: string) {
  logger.info(`[Firebase db.ts] Deleting trip document from Firestore: ${tripId}`);
  await db.collection("trips").doc(tripId).delete();
}

export async function createFirestoreInvitation(invitationId: string, invitationData: Partial<DBInvitation>) {
  logger.info(`[Firebase db.ts] Creating invitation document in Firestore: ${invitationId}`);
  const payload = { ...invitationData };
  delete payload.id;
  await db.collection("invitations").doc(invitationId).set(payload);
}

export async function updateFirestoreInvitation(invitationId: string, invitationData: Partial<DBInvitation>) {
  logger.info(`[Firebase db.ts] Updating invitation document in Firestore: ${invitationId}`);
  const payload = { ...invitationData };
  delete payload.id;
  await db.collection("invitations").doc(invitationId).set(payload);
}

export async function deleteFirestoreInvitation(invitationId: string) {
  logger.info(`[Firebase db.ts] Deleting invitation document from Firestore: ${invitationId}`);
  await db.collection("invitations").doc(invitationId).delete();
}
