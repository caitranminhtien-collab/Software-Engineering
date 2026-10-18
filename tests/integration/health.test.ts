import request from "supertest";

import {
  describe,
  expect,
  it,
} from "vitest";

import app from "../../src/app";

describe(
  "GET /api/v1/health/live",
  () => {
    it(
      "returns 200 when the application is running",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/v1/health/live"
            );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.body
        ).toEqual({
          status: "ok",
          message:
            "Hue Tourism Backend is running",
        });
      }
    );
  }
);