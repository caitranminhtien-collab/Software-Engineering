import "dotenv/config";

import express from "express";
import {
  resolve,
} from "node:path";

import {
  checkDatabaseConnection,
} from "./config/database";

import {
  checkRedisConnection,
} from "./config/redis";

import {
  staffSessionMiddleware,
} from "./config/session";

import { requirePublishedOrStaffMedia } from "./middleware/media-access.middleware";

import attractionRoutes from "./routes/attraction.routes";
import routeRoutes from "./routes/route.routes";
import sessionRoutes from "./routes/session.routes";
import visitorEventRoutes from "./routes/visitor-event.routes";
import audioPlayRoutes from "./routes/audio-play.routes";
import chatRoutes from "./routes/chat.routes";
import locationSuggestionRoutes from "./routes/location-suggestion.routes";

import staffAuthRoutes from "./routes/staff-auth.routes";
import staffAttractionRoutes from "./routes/staff-attraction.routes";
import staffWorkflowRoutes from "./routes/staff-workflow.routes";
import staffRouteRoutes from "./routes/staff-route.routes";
import staffKnowledgeRoutes from "./routes/staff-knowledge.routes";
import staffAccountRoutes from "./routes/staff-account.routes";
import staffAnalyticsRoutes from "./routes/staff-analytics.routes";

const app = express();

if (
  process.env.NODE_ENV === "production" &&
  process.env.TRUST_PROXY === "1"
) {
  app.set("trust proxy", 1);
}

app.use(express.json());


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
    let databaseReady = false;
    let redisReady = false;

    try {
      await checkDatabaseConnection();
      databaseReady = true;
    } catch (error) {
      console.error(
        "Database readiness check failed:",
        error
      );
    }

    try {
      await checkRedisConnection();
      redisReady = true;
    } catch (error) {
      console.error(
        "Redis readiness check failed:",
        error
      );
    }

    if (
      databaseReady &&
      redisReady
    ) {
      res.status(200).json({
        status: "ready",
        database: "connected",
        redis: "connected",
      });

      return;
    }

    res.status(503).json({
      status: "not_ready",

      database:
        databaseReady
          ? "connected"
          : "unavailable",

      redis:
        redisReady
          ? "connected"
          : "unavailable",
    });
  }
);

app.use(staffSessionMiddleware);

// Uploaded files must be checked against their publication status.
// Authenticate session cookie first to allow Staff previews, not anonymous draft access.
app.use(
  "/uploads/media",
  requirePublishedOrStaffMedia,
  express.static(resolve(process.cwd(), "uploads", "media"), {
    etag: false,
    lastModified: false,
    setHeaders: res => res.setHeader("Cache-Control", "no-store"),
  })
);


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
  "/api/v1/visitor-events",
  visitorEventRoutes
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
  "/api/v1/staff/auth",
  staffAuthRoutes
);

app.use(
  "/api/v1/staff/attractions",
  staffAttractionRoutes
);

app.use(
  "/api/v1/staff/routes",
  staffRouteRoutes
);

app.use(
  "/api/v1/staff/knowledge-documents",
  staffKnowledgeRoutes
);

app.use(
  "/api/v1/staff/accounts",
  staffAccountRoutes
);

app.use(
  "/api/v1/staff/analytics",
  staffAnalyticsRoutes
);

app.use(
  "/api/v1/staff",
  staffWorkflowRoutes
);

export default app;