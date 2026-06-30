import { Router, Request, Response } from "express";
import { readTripsDB, writeTripsDB } from "../db/index.js";
import { resolveCoordinates } from "../utils/geocoding.js";
import { ok, fail } from "../utils/apiResponse.js";

const router = Router();

// Add new itinerary item
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { dayIndex, time, title, description, locationName, category, cost } = req.body;
    const current = readTripsDB(req);

    // Resolve coordinates for map pins from geocoding utility
    const coords = await resolveCoordinates(locationName || title);

    const newItem = {
      id: "it-" + Date.now(),
      dayIndex: Number(dayIndex) || 0,
      time: time || "12:00",
      title,
      description: description || "",
      locationName: locationName || title,
      category: category || "sight",
      cost: Number(cost) || 0,
      votes: [],
      comments: [],
      coordinates: coords
        ? {
            x: Math.round(50 + (coords.lng - (current.lng || 139.6503)) / 0.0018),
            y: Math.round(50 - (coords.lat - (current.lat || 35.6762)) / 0.0015),
          }
        : { x: 50, y: 50 },
      lat: coords?.lat,
      lng: coords?.lng,
      trafficStatus: "smooth" as const,
    };

    current.itineraries.push(newItem);
    writeTripsDB(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to add itinerary item"));
  }
});

// Edit existing itinerary item (supports geocoding when address changes)
router.post("/edit", async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const current = readTripsDB(req);
    const idx = current.itineraries.findIndex((i: any) => i.id === item.id);

    if (idx !== -1) {
      const oldItem = current.itineraries[idx];
      let lat = item.lat ?? oldItem.lat;
      let lng = item.lng ?? oldItem.lng;
      let coordinates = item.coordinates ?? oldItem.coordinates;

      // Automatically re-geocode coordinate when address or location name is modified
      if (oldItem.locationName !== item.locationName) {
        const coords = await resolveCoordinates(item.locationName || item.title);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          coordinates = {
            x: Math.round(50 + (coords.lng - (current.lng || 139.6503)) / 0.0018),
            y: Math.round(50 - (coords.lat - (current.lat || 35.6762)) / 0.0015),
          };
        }
      }

      current.itineraries[idx] = {
        ...oldItem,
        ...item,
        lat,
        lng,
        coordinates,
      };
      writeTripsDB(current, req);
    }
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to update itinerary item"));
  }
});

// Delete itinerary item
router.post("/delete", async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const current = readTripsDB(req);
    current.itineraries = current.itineraries.filter((i: any) => i.id !== id);
    writeTripsDB(current, req);
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to delete itinerary item"));
  }
});

// Add comment to itinerary item
router.post("/comment", async (req: Request, res: Response) => {
  try {
    const { itemId, userId, userName, text } = req.body;
    const current = readTripsDB(req);
    const item = current.itineraries.find((i: any) => i.id === itemId);

    if (item) {
      if (!item.comments) item.comments = [];
      item.comments.push({
        id: "c-" + Date.now(),
        authorId: userId,
        authorName: userName,
        text,
        createdAt: new Date().toISOString(),
      });
      writeTripsDB(current, req);
    }
    res.json(ok({ trip: current }));
  } catch (err: any) {
    res.status(500).json(fail("SERVER_ERROR", err.message || "Failed to post comment"));
  }
});

export default router;
