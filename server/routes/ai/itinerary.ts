import { Router, Request, Response } from "express";
import { Type } from "@google/genai";
import { getGenAI, callGemini } from "./shared";

const router = Router();

// B. Smart Itinerary Optimization based on preferences
router.post("/optimize-itinerary", async (req: Request, res: Response) => {
  const { preferences, currentSchedule } = req.body;
  const ai = getGenAI();

  const prompt = `Optimize our trip itinerary based on preference: "${preferences || 'culinary and leisure walks'}".
  Current itinerary plan items:
  ${JSON.stringify(currentSchedule || [])}
  
  Suggest a sequence of 3 optimized interactive travel activities, each complete with:
  - time (HH:MM string)
  - title (compact activity title)
  - description (practical tip or optimization)
  - locationName (famous site name)
  - category (one of: 'restaurant', 'shop', 'sight', 'transit', 'hotel', 'other')
  - cost (estimated JPY/USD value, number only)
  
  Provide the results as a clean JSON catalog conformant to this prompt.`;

  const fallbackItems = [
    {
      time: "11:30",
      title: "Team Sushi Tasting at Tsukiji Outer Market",
      description: "Get here before noon to bypass long lines; try authentic fatty tuna (Otoro) skewers.",
      locationName: "Tsukiji Outer Market",
      category: "restaurant",
      cost: 35
    },
    {
      time: "14:00",
      title: "Team Digital Art Immersive Gallery",
      description: "Pre-book slot online to avoid disappointment. Incredible multi-sensory visual spaces.",
      locationName: "teamLab Planets TOKYO, Toyosu",
      category: "sight",
      cost: 28
    },
    {
      time: "17:00",
      title: "Traditional Green Tea Ceremony",
      description: "Stately zen garden view. Slow down to balance out the intense Harajuku pedestrian rush.",
      locationName: "Hamarikyu Gardens",
      category: "sight",
      cost: 12
    }
  ];

  if (!ai) {
    return res.json({ optimizedItems: fallbackItems });
  }

  const result = await callGemini(
    ai,
    {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  locationName: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['restaurant', 'shop', 'sight', 'transit', 'hotel', 'other'] },
                  cost: { type: Type.NUMBER }
                },
                required: ["time", "title", "description", "locationName", "category", "cost"]
              }
            }
          },
          required: ["optimizedItems"]
        }
      }
    },
    { optimizedItems: fallbackItems },
    "optimize-itinerary"
  );

  res.json(result);
});

// Helper for TSP distance
function getEuclideanDistance(a: any, b: any): number {
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    const dLat = a.lat - b.lat;
    const dLng = a.lng - b.lng;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }
  if (a.coordinates && b.coordinates) {
    const dx = a.coordinates.x - b.coordinates.x;
    const dy = a.coordinates.y - b.coordinates.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  return 0;
}

// ── POST /api/ai/optimize-tsp ────────────────────────────────────────────────
router.post("/optimize-tsp", async (req: Request, res: Response) => {
  const { items } = req.body; // Array of ItineraryItem
  if (!items || !Array.isArray(items) || items.length <= 1) {
    return res.json({ optimized: items });
  }

  // Fallback nearest-neighbor heuristic
  const runFallbackHeuristic = () => {
    const originalTimes = items.map(item => item.time).sort((a, b) => a.localeCompare(b));
    const unvisited = [...items];
    const optimizedTour: any[] = [];
    optimizedTour.push(unvisited.shift());

    while (unvisited.length > 0) {
      const current = optimizedTour[optimizedTour.length - 1];
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = getEuclideanDistance(current, unvisited[i]);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }
      optimizedTour.push(unvisited.splice(nearestIndex, 1)[0]);
    }

    return optimizedTour.map((item, idx) => ({
      ...item,
      time: originalTimes[idx]
    }));
  };

  const ai = getGenAI();
  if (!ai) {
    return res.json({ optimized: runFallbackHeuristic() });
  }

  try {
    // Generate a map of item indices and names for the LLM to process
    const locationsDescription = items.map((item, idx) => 
      `Index: ${idx} | Title: "${item.title}" | Location: "${item.locationName}" | Current Time: "${item.time}"`
    ).join("\n");

    const prompt = `You are OdyShareSmart AI route coordinator.
You need to geographically optimize a travel day's itinerary list of places.
The goal is to solve the Traveling Salesperson Problem (TSP) on the list below based on their real-world geography (districts, cities, neighborhoods) to minimize transit distances and avoid backtracking (e.g., from one island to the mainland and back).

Here is the list of locations:
${locationsDescription}

Determine the most efficient geographical order to visit all of these places.
Return the optimized order of items as a JSON object containing the ordered list of original item indices in "optimizedIndices".
Keep the array size of "optimizedIndices" exactly the same as the input list.

Example Output format:
{
  "optimizedIndices": [2, 0, 1, 3]
}`;

    const parsed = await callGemini(
      ai,
      {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              optimizedIndices: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              }
            },
            required: ["optimizedIndices"]
          }
        }
      },
      { optimizedIndices: null as number[] | null },
      "optimize-tsp"
    );

    const optimizedIndices = parsed.optimizedIndices;

    if (optimizedIndices && Array.isArray(optimizedIndices) && optimizedIndices.length > 0) {
      const originalTimes = items.map(item => item.time).sort((a, b) => a.localeCompare(b));
      
      // Remap based on optimized indices
      const reorderedItems = optimizedIndices
        .map((idx: number) => items[idx])
        .filter(Boolean);

      // Protect against any missed items
      const missed = items.filter((_, idx) => !optimizedIndices.includes(idx));
      const fullTour = [...reorderedItems, ...missed];

      // Assign the original chronological times to the newly ordered sequence
      const optimizedResult = fullTour.map((item, idx) => ({
        ...item,
        time: originalTimes[idx] || item.time
      }));

      return res.json({ optimized: optimizedResult });
    }

    res.json({ optimized: runFallbackHeuristic() });
  } catch (err: any) {
    console.error("Error in Gemini TSP route optimization, using local heuristic:", err);
    res.json({ optimized: runFallbackHeuristic() });
  }
});

export default router;
