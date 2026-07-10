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
  readTripsDB, writeTripsDB, writeTripsDBAndConfirm, getDB, writeDB, writeDBAndConfirm, registerSSEClient, unregisterSSEClient,
} from "../db/index.js";
import { resolveCoordinatesRemote } from "../utils/geocoding.js";
import { ok, fail } from "../utils/apiResponse.js";
import { createLogger } from "../utils/logger.js";
import { SSE_KEEPALIVE_INTERVAL_MS } from "../utils/constants.js";
import { createSystemMessage } from "../utils/message.js";
import { ITEM_ID_PREFIXES } from "../../src/shared/ids.js";

const logger = createLogger("TripRoute");

// Sub-routers
import itineraryRouter from "./itinerary.js";
import expenseRouter from "./expense.js";
import membersRouter from "./members.js";

const router = Router();

// ── Mount sub-routers ────────────────────────────────────────────────────────
router.use("/itinerary", itineraryRouter);
router.use("/expense", expenseRouter);
router.use("/", membersRouter);           // invite / kick / invitations

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
      const coords = await resolveCoordinatesRemote(dest);
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
  try {
    const current = readTripsDB(req);
    const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() };
    await writeTripsDBAndConfirm(updated, req);
    res.json(ok({ trip: readTripsDB(req) }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to update trip"));
  }
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
  try {
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
    const coords = await resolveCoordinatesRemote(destStr);
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
      itineraries: [],
      expenses: [],
      documents: [],
      chats: [
        createSystemMessage(`🚀 Welcome to ${name || "New Trip"}! Add itineraries, vote on flights, and track budgets.`, {
          idPrefix: "start",
          avatarColor: "#64748b",
          isTripUpdate: false
        })
      ],
    };

    (db as MemoryDB).trips.push(newTrip);
    db.activeTripId = newTripId;
    await writeDBAndConfirm(db);

    req.headers["x-trip-id"] = newTripId;
    res.json(ok({ trip: readTripsDB(req) }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to create trip"));
  }
});

// ── POST /api/trip/update-meta ───────────────────────────────────────────────
router.post("/update-meta", async (req: Request, res: Response) => {
  try {
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
        const coords = await resolveCoordinatesRemote(newDest);
        current.lat = coords?.lat;
        current.lng = coords?.lng;
      }
    }

    const db = getDB();
    const idx = (db as MemoryDB).trips.findIndex((t: Trip) => t.id === current.id);
    if (idx !== -1) {
      (db as MemoryDB).trips[idx] = current;
      await writeDBAndConfirm(db);
    }

    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to update trip metadata"));
  }
});

// ── POST /api/trip/delete ────────────────────────────────────────────────────
router.post("/delete", async (req: Request, res: Response) => {
  try {
    const { tripId } = req.body;
    const db = getDB();
    if ((db as MemoryDB).trips.length <= 1) {
      return res.status(400).json(fail("BAD_REQUEST", "Cannot delete the last remaining trip"));
    }
    (db as MemoryDB).trips = (db as MemoryDB).trips.filter((t: Trip) => t.id !== tripId);
    if (db.activeTripId === tripId) db.activeTripId = (db as MemoryDB).trips[0].id;
    await writeDBAndConfirm(db);
    res.json(ok({ trip: readTripsDB(req) }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to delete trip"));
  }
});

// ── POST /api/trip/vote ──────────────────────────────────────────────────────
router.post("/vote", async (req: Request, res: Response) => {
  const { targetType, targetId, userId } = req.body;
  const current = readTripsDB(req);

  const list =
    targetType === "itinerary" ? current.itineraries : [];
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

  const newDocId = ITEM_ID_PREFIXES.DOCUMENT + Date.now();
  let downloadUrl = `/api/trip/document/${newDocId}/download`;
  let calculatedSize = size || "1.2 MB";
  let accessKey = crypto.createHash("sha256").update((name || "doc") + Date.now()).digest("hex").slice(0, 32);
  const storagePath = `trips/${current.id}/documents/${Date.now()}_${name}`;

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

      const { storage: storageInstance } = await import("../db/index.js");

      // storageInstance is the admin GCS bucket
      const file = (storageInstance as any).file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: type || "application/octet-stream"
        }
      });
      logger.info(`[Firebase Storage] Uploaded '${name}' successfully via Admin SDK to storagePath '${storagePath}'`);
    } catch (storageErr) {
      logger.error("[Firebase Storage] Upload failed:", storageErr);
      downloadUrl = "#";
    }
  }

  const newDoc = {
    id: newDocId,
    name,
    size: calculatedSize,
    type: type || "application/pdf",
    uploadedAt: new Date().toISOString(),
    url: downloadUrl,
    accessKey,
    uploadedBy: uploadedBy || "Unknown",
    storagePath,
  };
  current.documents.push(newDoc);

  current.chats.push(
    createSystemMessage(`📂 ${newDoc.uploadedBy} uploaded '${newDoc.name}'`, {
      idPrefix: "doc",
      avatarColor: "#64748b"
    })
  );

  writeTripsDB(current, req);
  res.json(ok({ document: newDoc, trip: current }));
});

// ── GET /api/trip/document/:id/download ──────────────────────────────────────
router.get("/document/:id/download", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;

  if (!userId) {
    return res.status(401).json(fail("UNAUTHORIZED", "User identity required."));
  }

  // Find the trip containing the document with this ID
  const dbInstance = getDB();
  const trips = (dbInstance as MemoryDB).trips;

  let foundTrip: Trip | undefined;
  let foundDoc: any | undefined;

  for (const t of trips) {
    const doc = t.documents?.find((d: any) => d.id === id);
    if (doc) {
      foundTrip = t;
      foundDoc = doc;
      break;
    }
  }

  if (!foundTrip || !foundDoc) {
    return res.status(404).json(fail("NOT_FOUND", "Document not found."));
  }

  // Verify the user is a participant of the trip that owns the document
  const isParticipant = foundTrip.participants.some((p: Participant) => p.id === userId);
  if (!isParticipant) {
    return res.status(403).json(fail("FORBIDDEN", "You are not a participant of this trip."));
  }

  if (!foundDoc.storagePath) {
    return res.status(400).json(fail("BAD_REQUEST", "Document does not have a valid storage path."));
  }

  try {
    const { storage: storageInstance } = await import("../db/index.js");
    const file = (storageInstance as any).file(foundDoc.storagePath);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json(fail("NOT_FOUND", "File does not exist in storage."));
    }

    res.setHeader("Content-Type", foundDoc.type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(foundDoc.name)}"`);

    // Stream the file back to the browser
    file.createReadStream().pipe(res);
  } catch (err: any) {
    logger.error("[Firebase Storage] Secure download failed:", err);
    res.status(500).json(fail("SERVER_ERROR", "Failed to retrieve secure file."));
  }
});

// ── POST /api/trip/chat/send ─────────────────────────────────────────────────
router.post("/chat/send", async (req: Request, res: Response) => {
  const { senderId, senderName, avatarColor, messageDecrypted, messageEncrypted } = req.body;
  
  if (!messageEncrypted) {
    return res.status(400).json(fail("BAD_REQUEST", "Encrypted message payload is required (未提供加密訊息內容)。"));
  }

  const current = readTripsDB(req);

  const newMsg = {
    id: "msg-" + Date.now(),
    senderId,
    senderName,
    avatarColor,
    messageEncrypted,
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
