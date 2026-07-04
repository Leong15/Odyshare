/**
 * Trip router — slim orchestrator
 *
 * Previously ~750 lines with 20 mixed routes. Now mounts focused sub-routers
 * and only keeps the core trip CRUD + shared utilities here.
 */
import { Router, Request, Response } from "express";
import crypto from "crypto";
import type { Trip, Participant } from "../../src/types";
import type { MemoryDB } from "../types/db";
import {
  readTripsDB, writeTripsDB, getDB, writeDB, registerSSEClient, unregisterSSEClient,
} from "../db/index.js";
import { resolveCoordinates } from "../utils/geocoding.js";
import { ok, fail } from "../utils/apiResponse.js";
import { createLogger } from "../utils/logger.js";
import { SSE_KEEPALIVE_INTERVAL_MS } from "../utils/constants.js";

const logger = createLogger("TripRoute");

// Sub-routers
import itineraryRouter from "./itinerary.js";
import expenseRouter from "./expense.js";
import membersRouter from "./members.js";
import flightSubRouter from "./flightSubscription.js";

const router = Router();

// ── Mount sub-routers ────────────────────────────────────────────────────────
router.use("/itinerary", itineraryRouter);
router.use("/expense", expenseRouter);
router.use("/", membersRouter);           // invite / kick / invitations
router.use("/", flightSubRouter);         // /:id/flight-subscription

// ── Google Routes API proxy ──────────────────────────────────────────────────
router.post("/google-route", async (req: Request, res: Response) => {
  const { origin, destination, travelMode } = req.body;
  if (!origin || !destination || !travelMode) {
    return res.status(400).json(fail("BAD_REQUEST", "Missing origin, destination, or travelMode"));
  }

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
  if (!apiKey) {
    return res.status(500).json(fail("SERVER_ERROR", "Google Maps Platform key not configured."));
  }

  try {
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: Number(origin.lat), longitude: Number(origin.lng) } } },
          destination: { location: { latLng: { latitude: Number(destination.lat), longitude: Number(destination.lng) } } },
          travelMode: travelMode === "WALKING" ? "WALK" : "DRIVE",
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json(fail("BAD_REQUEST", `Google Routes API error: ${errText}`));
    }
    res.json(ok(await response.json()));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Internal server error"));
  }
});

// ── Live location telemetry ──────────────────────────────────────────────────
router.post("/update-location", (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  const userId = (req as any).userId as string;

  if (!userId) return res.status(401).json(fail("UNAUTHORIZED", "User identity required."));
  if (lat === undefined || lng === undefined) {
    return res.status(400).json(fail("BAD_REQUEST", "Missing lat or lng."));
  }

  const current = readTripsDB(req);
  const p = current.participants.find((part: Participant) => part.id === userId);
  if (p) {
    p.lat = Number(lat);
    p.lng = Number(lng);
    writeTripsDB(current, req);
  }
  res.json(ok({ success: true }));
});

// ── GET /api/trip ────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    let data = readTripsDB(req);
    const db = getDB();
    let dirty = false;

    // Lazy-resolve coordinates for active trip and all visible trips
    const toResolve = [
      ...(data.lat == null ? [{ id: data.id, dest: data.destination }] : []),
      ...(data.tripsList || [])
        .filter((t: Trip) => t.lat == null && t.destination)
        .map((t: Trip) => ({ id: t.id, dest: t.destination })),
    ];

    for (const { id, dest } of toResolve) {
      const coords = await resolveCoordinates(dest);
      if (!coords) continue;
      const idx = (db as MemoryDB).trips.findIndex((t: Trip) => t.id === id);
      if (idx !== -1) {
        (db as MemoryDB).trips[idx].lat = coords.lat;
        (db as MemoryDB).trips[idx].lng = coords.lng;
        dirty = true;
      }
    }

    if (dirty) {
      writeDB(db);
      data = readTripsDB(req);
    }

    res.json(ok(data));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to read trip database"));
  }
});

// ── POST /api/trip/update ────────────────────────────────────────────────────
router.post("/update", async (req: Request, res: Response) => {
  const current = readTripsDB(req);
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() };
  writeTripsDB(updated, req);
  res.json(ok({ trip: readTripsDB(req) }));
});

// ── POST /api/trip/select ────────────────────────────────────────────────────
router.post("/select", (req: Request, res: Response) => {
  const { tripId } = req.body;
  const db = getDB();
  if (!(db as MemoryDB).trips.some((t: Trip) => t.id === tripId)) {
    return res.status(404).json(fail("NOT_FOUND", "Trip not found"));
  }
  db.activeTripId = tripId;
  writeDB(db);
  req.headers["x-trip-id"] = tripId;
  res.json(ok({ trip: readTripsDB(req) }));
});

// ── POST /api/trip/create ────────────────────────────────────────────────────
router.post("/create", async (req: Request, res: Response) => {
  const { name, destination, startDate, endDate, totalBudget } = req.body;
  const userId = (req as any).userId as string;
  const db = getDB();

  const creator = db.users.find((u: any) => u.id === userId);
  const participants = creator
    ? [{
        id: creator.id,
        name: creator.name,
        email: creator.email || `${creator.username}@example.com`,
        avatarColor: creator.avatarColor || "#3b82f6",
        publicKey: "pub_key_sec_" + Math.random().toString(36).slice(2, 6),
        budgetLimit: 1500,
      }]
    : [{ id: "u1", name: "Traveler", email: "traveler@example.com", avatarColor: "#3b82f6", publicKey: "pub_key_default" }];

  const destStr = destination || "Unknown Destination";
  const coords = await resolveCoordinates(destStr);
  const newTripId = "trip-" + Date.now();

  const newTrip: any = {
    id: newTripId,
    name: name || "New Trip",
    destination: destStr,
    startDate: startDate || new Date().toISOString().split("T")[0],
    endDate: endDate || new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0],
    totalBudget: totalBudget ? Number(totalBudget) : 3000,
    lat: coords?.lat,
    lng: coords?.lng,
    participants,
    flightEstimates: [],
    itineraries: [],
    expenses: [],
    documents: [],
    chats: [{
      id: "msg-start-" + Date.now(),
      senderId: "system",
      senderName: "OdyShareSmart AI",
      avatarColor: "#64748b",
      messageEncrypted: "",
      messageDecrypted: `🚀 Welcome to ${name || "New Trip"}! Add itineraries, vote on flights, and track budgets.`,
      timestamp: new Date().toISOString(),
    }],
  };

  (db as MemoryDB).trips.push(newTrip);
  db.activeTripId = newTripId;
  writeDB(db);

  req.headers["x-trip-id"] = newTripId;
  res.json(ok({ trip: readTripsDB(req) }));
});

// ── POST /api/trip/update-meta ───────────────────────────────────────────────
router.post("/update-meta", async (req: Request, res: Response) => {
  const { name, destination, totalBudget, status } = req.body;
  const current = readTripsDB(req);
  if (!current) return res.status(404).json(fail("NOT_FOUND", "No active trip found"));

  if (name !== undefined) current.name = name.trim();
  if (totalBudget !== undefined) current.totalBudget = Number(totalBudget) || 3000;
  if (status !== undefined) current.status = status;

  if (destination !== undefined) {
    const newDest = destination.trim();
    if (current.destination !== newDest) {
      current.destination = newDest;
      const coords = await resolveCoordinates(newDest);
      current.lat = coords?.lat;
      current.lng = coords?.lng;
    }
  }

  const db = getDB();
  const idx = (db as MemoryDB).trips.findIndex((t: Trip) => t.id === current.id);
  if (idx !== -1) {
    (db as MemoryDB).trips[idx] = current;
    writeDB(db);
  }

  res.json(ok({ trip: current }));
});

// ── POST /api/trip/delete ────────────────────────────────────────────────────
router.post("/delete", async (req: Request, res: Response) => {
  const { tripId } = req.body;
  const db = getDB();
  if ((db as MemoryDB).trips.length <= 1) {
    return res.status(400).json(fail("BAD_REQUEST", "Cannot delete the last remaining trip"));
  }
  (db as MemoryDB).trips = (db as MemoryDB).trips.filter((t: Trip) => t.id !== tripId);
  if (db.activeTripId === tripId) db.activeTripId = (db as MemoryDB).trips[0].id;
  writeDB(db);
  res.json(ok({ trip: readTripsDB(req) }));
});

// ── POST /api/trip/vote ──────────────────────────────────────────────────────
router.post("/vote", async (req: Request, res: Response) => {
  const { targetType, targetId, userId } = req.body;
  const current = readTripsDB(req);

  const list =
    targetType === "itinerary" ? current.itineraries : current.flightEstimates;
  const target = list?.find((i: any) => i.id === targetId);

  if (target) {
    if (target.votes.includes(userId)) {
      target.votes = target.votes.filter((uid: string) => uid !== userId);
    } else {
      target.votes.push(userId);
    }
    writeTripsDB(current, req);
  }

  res.json(ok({ trip: current }));
});

// ── POST /api/trip/document/upload ──────────────────────────────────────────
router.post("/document/upload", async (req: Request, res: Response) => {
  const { name, size, type, uploadedBy, fileData } = req.body;
  const current = readTripsDB(req);

  let downloadUrl = "#";
  let calculatedSize = size || "1.2 MB";
  let accessKey = crypto.createHash("sha256").update((name || "doc") + Date.now()).digest("hex").slice(0, 32);

  if (fileData) {
    try {
      const buffer = Buffer.from(fileData, "base64");
      accessKey = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 32);

      // Calculate human-readable size
      if (buffer.length < 1024 * 1024) {
        calculatedSize = (buffer.length / 1024).toFixed(1) + " KB";
      } else {
        calculatedSize = (buffer.length / (1024 * 1024)).toFixed(1) + " MB";
      }

      // Lazily import firebase/storage components
      const { ref: storageRefLoc, uploadBytes: uploadBytesLoc, getDownloadURL: getDownloadURLLoc } = await import("firebase/storage");
      const { storage: storageInstance } = await import("../db/index.js");

      const storagePath = `trips/${current.id}/documents/${Date.now()}_${name}`;
      const fileRef = storageRefLoc(storageInstance, storagePath);

      const uint8Array = new Uint8Array(buffer);
      const snapshot = await uploadBytesLoc(fileRef, uint8Array, {
        contentType: type || "application/octet-stream"
      });
      downloadUrl = await getDownloadURLLoc(snapshot.ref);
      logger.info(`[Firebase Storage] Uploaded '${name}' to '${storagePath}' successfully -> ${downloadUrl}`);
    } catch (storageErr) {
      logger.error("[Firebase Storage] Upload failed:", storageErr);
    }
  }

  const newDoc = {
    id: "doc-" + Date.now(),
    name,
    size: calculatedSize,
    type: type || "application/pdf",
    uploadedAt: new Date().toISOString(),
    url: downloadUrl,
    accessKey,
    uploadedBy: uploadedBy || "Unknown",
  };
  current.documents.push(newDoc);

  current.chats.push({
    id: "msg-doc-" + Date.now(),
    senderId: "system",
    senderName: "OdyShareSmart AI",
    avatarColor: "#64748b",
    messageEncrypted: "",
    messageDecrypted: `📂 ${newDoc.uploadedBy} uploaded '${newDoc.name}'`,
    timestamp: new Date().toISOString(),
    isTripUpdate: true,
  });

  writeTripsDB(current, req);
  res.json(ok({ document: newDoc, trip: current }));
});

// ── POST /api/trip/chat/send ─────────────────────────────────────────────────
router.post("/chat/send", async (req: Request, res: Response) => {
  const { senderId, senderName, avatarColor, messageDecrypted, messageEncrypted } = req.body;
  const current = readTripsDB(req);

  const newMsg = {
    id: "msg-" + Date.now(),
    senderId,
    senderName,
    avatarColor,
    messageEncrypted:
      messageEncrypted || "U2FsdGVkX19" + Buffer.from(messageDecrypted).toString("base64"),
    messageDecrypted,
    timestamp: new Date().toISOString(),
  };

  current.chats.push(newMsg);
  writeTripsDB(current, req);
  res.json(ok({ msg: newMsg, trip: current }));
});

// ── GET /api/trip/events ─────────────────────────────────────────────────────
router.get("/events", (req: Request, res: Response) => {
  const tripId = req.query.tripId as string;
  if (!tripId) {
    return res.status(400).json(fail("BAD_REQUEST", "Missing tripId parameter"));
  }

  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Register client
  registerSSEClient(tripId, res);

  // Send initial connection state
  res.write(`data: ${JSON.stringify({ type: "connected", tripId })}\n\n`);

  // Setup interval to keep connection alive (prevent intermediate reverse proxy timeout)
  const keepAliveInterval = setInterval(() => {
    res.write(": keepalive\n\n");
  }, SSE_KEEPALIVE_INTERVAL_MS);

  // Clean up registration on disconnect
  req.on("close", () => {
    clearInterval(keepAliveInterval);
    unregisterSSEClient(tripId, res);
    res.end();
  });
});

export default router;
