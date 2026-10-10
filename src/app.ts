import "dotenv/config";

import express from "express";

import {
  checkDatabaseConnection,
} from "./config/database";

import {
  connectRedis,
} from "./config/redis";

import {
  staffSessionMiddleware,
} from "./config/session";


import attractionRoutes from "./routes/attraction.routes";
import routeRoutes from "./routes/route.routes";
import sessionRoutes from "./routes/session.routes";
import audioPlayRoutes from "./routes/audio-play.routes";
import chatRoutes from "./routes/chat.routes";
import locationSuggestionRoutes from "./routes/location-suggestion.routes";
import staffAuthRoutes from "./routes/staff-auth.routes";
import staffAttractionRoutes from "./routes/staff-attraction.routes";
import staffWorkflowRoutes from "./routes/staff-workflow.routes";

const app = express();

app.use(express.json());

// Staff server-side session
app.use(staffSessionMiddleware);

app.use(
  "/api/v1/audio-plays",
  audioPlayRoutes
);

app.use(
  "/api/v1/attractions",
  attractionRoutes
);

app.use(
  "/api/v1/routes",
  routeRoutes
);

app.use(
  "/api/v1/visitor-sessions",
  sessionRoutes
);

app.use(
  "/api/v1/chat",
  chatRoutes
);

app.use(
  "/api/v1/location-suggestions",
  locationSuggestionRoutes
);

app.use(
  "/api/v1/staff/attractions",
  staffAttractionRoutes
);

app.use(
  "/api/v1/staff",
  staffWorkflowRoutes
);

app.get(
  "/api/v1/health/live",
  (_req, res) => {
    res.status(200).json({
      status: "ok",
      message:
        "Hue Tourism Backend is running",
    });
  }
);

app.get(
  "/api/v1/health/ready",
  async (_req, res) => {
    try {
      await checkDatabaseConnection();

      res.status(200).json({
        status: "ready",
        database: "connected",
      });
    } catch (error) {
      console.error(
        "Database readiness check failed:",
        error
      );

      res.status(503).json({
        status: "not_ready",
        database: "unavailable",
      });
    }
  }
);

app.use(
  "/api/v1/staff/auth",
  staffAuthRoutes
);

const PORT =
  process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    await connectRedis();

    app.listen(PORT, () => {
      console.log(
        `Server is running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Application startup failed:",
      error
    );

    process.exit(1);
  }
}

void startServer();