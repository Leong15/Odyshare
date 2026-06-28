import { Request } from "express";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { getDB, writeDB } from "./cache.js";
import { DEFAULT_TRIP } from "./seed.js";
import { broadcastTripChange } from "./sse.js";
import type { Trip, Participant } from "../../src/types";
import type { DBUser, DBInvitation } from "../types/db";


// Standard Request-scoped helpers
export function getTripForRequest(req: Request) {
  const userId = req.headers["x-user-id"] as string;
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
          budgetLimit: 1500
        }
      ],
      flightEstimates: [],
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
  if (!trip) {
    trip = dbState.trips.find(t => t.id === dbState.activeTripId) || dbState.trips[0];
  }

  // Enrich participants with their actual database username if match is found
  if (trip && trip.participants) {
    trip = {
      ...trip,
      participants: trip.participants.map((p: Participant) => {
        const mu = dbState.users.find(u => u.id === p.id || u.email === p.email);
        return {
          ...p,
          username: mu ? mu.username : (p.username || "")
        };
      })
    };
  }

  // Filter visible trips scoped strictly to user
  const visibleTrips = userId 
    ? dbState.trips.filter(t => t.participants.some((p: Participant) => p.id === userId))
    : dbState.trips;

  return {
    ...trip,
    tripsList: visibleTrips.map(t => ({
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
      flightEstimates: t.flightEstimates || [],
      documents: t.documents || [],
      chats: t.chats || []
    }))
  };
}

export function saveTripForRequest(req: Request, updatedTrip: Trip) {
  const dbState = getDB();
  const cleanData = { ...updatedTrip };
  delete cleanData.tripsList;
  
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

export function readTripsDB(req?: Request) {
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
    active = JSON.parse(JSON.stringify(DEFAULT_TRIP));
    dbState.activeTripId = active.id;
    dbState.trips = [active];
    writeDB(dbState);
  }
  if (active && active.participants) {
    active = {
      ...active,
      participants: active.participants.map((p: Participant) => {
        const mu = dbState.users.find(u => u.id === p.id || u.email === p.email);
        return {
          ...p,
          username: mu ? mu.username : (p.username || "")
        };
      })
    };
  }
  return {
    ...active,
    tripsList: dbState.trips.map(t => ({
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
      flightEstimates: t.flightEstimates || [],
      documents: t.documents || [],
      chats: t.chats || []
    }))
  };
}

export function writeTripsDB(data: Trip, req?: Request) {
  if (req) {
    saveTripForRequest(req, data);
    return;
  }
  const dbState = getDB();
  const cleanData = { ...data };
  delete cleanData.tripsList;
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

// Explicit Firestore CRUD functions to ensure physical cloud database integrations are called and awaited synchronously

export async function createFirestoreUser(userId: string, userData: Partial<DBUser>) {
  console.log(`[Firebase db.ts] Creating user document in Firestore: ${userId}`);
  const payload = { ...userData };
  delete payload.id;
  await setDoc(doc(db, "users", userId), payload);
}

export async function updateFirestoreUser(userId: string, userData: Partial<DBUser>) {
  console.log(`[Firebase db.ts] Updating user document in Firestore: ${userId}`);
  const payload = { ...userData };
  delete payload.id;
  await setDoc(doc(db, "users", userId), payload);
}

export async function createFirestoreTrip(tripId: string, tripData: Partial<Trip>) {
  console.log(`[Firebase db.ts] Creating trip document in Firestore: ${tripId}`);
  const payload = { ...tripData };
  delete payload.id;
  delete payload.tripsList;
  await setDoc(doc(db, "trips", tripId), payload);
}

export async function updateFirestoreTrip(tripId: string, tripData: Partial<Trip>) {
  console.log(`[Firebase db.ts] Updating trip document in Firestore: ${tripId}`);
  const payload = { ...tripData };
  delete payload.id;
  delete payload.tripsList;
  await setDoc(doc(db, "trips", tripId), payload);
}

export async function deleteFirestoreTrip(tripId: string) {
  console.log(`[Firebase db.ts] Deleting trip document from Firestore: ${tripId}`);
  await deleteDoc(doc(db, "trips", tripId));
}

export async function createFirestoreInvitation(invitationId: string, invitationData: Partial<DBInvitation>) {
  console.log(`[Firebase db.ts] Creating invitation document in Firestore: ${invitationId}`);
  const payload = { ...invitationData };
  delete payload.id;
  await setDoc(doc(db, "invitations", invitationId), payload);
}

export async function updateFirestoreInvitation(invitationId: string, invitationData: Partial<DBInvitation>) {
  console.log(`[Firebase db.ts] Updating invitation document in Firestore: ${invitationId}`);
  const payload = { ...invitationData };
  delete payload.id;
  await setDoc(doc(db, "invitations", invitationId), payload);
}

export async function deleteFirestoreInvitation(invitationId: string) {
  console.log(`[Firebase db.ts] Deleting invitation document from Firestore: ${invitationId}`);
  await deleteDoc(doc(db, "invitations", invitationId));
}
