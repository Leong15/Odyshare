import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { startScheduler } from "./scheduler.js";

// Routes inside modular files
import authRouter from "./routes/auth";
import tripRouter from "./routes/trip";
import aiRouter from "./routes/ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount Modular API routers
app.use("/api/auth", authRouter);
app.use("/api/trip", tripRouter);
app.use("/api/ai", aiRouter);

// Start server hosting & Vite integrations
async function start() {
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`WanderSync Server running on http://0.0.0.0:${PORT}`);
    // Start automated scheduler monitoring
    startScheduler();
  });
}

start();
export default app;
