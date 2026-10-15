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
import staffRouteRoutes from "./routes/staff-route.routes";
import staffKnowledgeRoutes from "./routes/staff-knowledge.routes";
import staffAccountRoutes from "./routes/staff-account.routes";

const app = express();

app.use(express.json());

/*
 * Development/local media storage.
 * Production should normally serve media
 * through object storage / CDN instead.
 */
app.use(
  "/uploads/media",
  express.static(
    resolve(
      process.cwd(),
      "uploads",
      "media"
    )
  )
);

/*
 * Health endpoints không cần staff session.
 */
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

/*
 * Staff server-side session.
 */
app.use(staffSessionMiddleware);

/*
 * Public / visitor routes.
 */
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

/*
 * Staff authentication.
 */
app.use(
  "/api/v1/staff/auth",
  staffAuthRoutes
);

/*
 * Staff resource routes.
 *
 * Các route cụ thể đặt trước
 * generic workflow route.
 */
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

/*
 * Generic workflow:
 *
 * /staff/:resource/:id/submit
 * /staff/:resource/:id/review
 * /staff/:resource/:id/publish
 */
app.use(
  "/api/v1/staff",
  staffWorkflowRoutes
);

const PORT =
  process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    await connectRedis();

    app.listen(
      PORT,
      () => {
        console.log(
          `Server is running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Application startup failed:",
      error
    );

    process.exit(1);
  }
}

void startServer();