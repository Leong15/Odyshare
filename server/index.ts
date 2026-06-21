import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { startScheduler } from "./scheduler.js";
import { initFirebase } from "./db.js";

// Routes inside modular files
import authRouter from "./routes/auth";
import tripRouter from "./routes/trip";
import aiRouter from "./routes/ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve the world map image directly on /world_map_plate_carree.png
app.get("/world_map_plate_carree.png", (req, res) => {
  const filePath = path.join(process.cwd(), "src/assets/images/world_map_plate_carree.png");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(filePath);
  } else {
    const distPath = path.join(process.cwd(), "dist/world_map_plate_carree.png");
    if (fs.existsSync(distPath)) {
      res.setHeader("Content-Type", "image/png");
      res.sendFile(distPath);
    } else {
      res.status(404).send("Not Found");
    }
  }
});

// Mount Modular API routers
app.use("/api/auth", authRouter);
app.use("/api/trip", tripRouter);
app.use("/api/ai", aiRouter);

// Start server hosting & Vite integrations
async function start() {
  // Connect and load database state from Firebase Firestore
  await initFirebase();

  if (process.env.NODE_ENV !== "production") {
    // Force direct serving of source images folder to guarantee they load in dev mode
    app.use("/src/assets/images", express.static(path.join(process.cwd(), "src/assets/images")));

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OdyShareSync Server running on http://0.0.0.0:${PORT}`);
    // Start automated scheduler monitoring
    startScheduler();
  });
}

start();
export default app;
