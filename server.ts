import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeDatabase } from "./src/lib/db.ts";
import { runAutomationCycle } from "./src/lib/automation.ts";

// Import routers
import apiRouter from "./src/server/api.ts";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize DB and background jobs
  await initializeDatabase();
  
  // Smart automation scheduler — respects database-tracked run times
  // runAutomationCycle() internally checks if enough time has elapsed (4h minimum)
  // so calling it on startup is safe; it will skip if it ran recently
  console.log('[Scheduler] Checking if automation cycle is due...');
  runAutomationCycle().catch(err => console.error("Automation cycle check failed:", err));
  
  // Re-check every 4 hours (the function itself enforces the minimum gap)
  setInterval(() => {
    runAutomationCycle().catch(err => console.error("Scheduled automation run failed:", err));
  }, 1000 * 60 * 60 * 4);

  app.use(express.json());

  // API routes FIRST
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: "0.0.0.0",
        hmr: { host: "localhost", port: 35000 }
      },
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

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server startup error:", err);
});
