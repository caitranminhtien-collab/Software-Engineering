import express from "express";
import dotenv from "dotenv";
import { checkDatabaseConnection } from "./config/database";
import attractionRoutes from "./routes/attraction.routes";
import routeRoutes from "./routes/route.routes";
import sessionRoutes from "./routes/session.routes";
import audioPlayRoutes from "./routes/audio-play.routes";
dotenv.config();

const app = express();

app.use(express.json());
app.use("/api/v1/audio-plays", audioPlayRoutes);
app.use("/api/v1/attractions", attractionRoutes);
app.use("/api/v1/routes", routeRoutes);
app.use("/api/v1/visitor-sessions", sessionRoutes);
app.get("/api/v1/health/live", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hue Tourism Backend is running",
  });
});

app.get("/api/v1/health/ready", async (_req, res) => {
  try {
    await checkDatabaseConnection();

    res.status(200).json({
      status: "ready",
      database: "connected",
    });
  } catch (error) {
    console.error("Database readiness check failed:", error);

    res.status(503).json({
      status: "not_ready",
      database: "unavailable",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});