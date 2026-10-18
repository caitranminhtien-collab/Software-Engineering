import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../src/config/database",
  () => ({
    db: {
      query:
        vi.fn(),
    },
  })
);

import {
  db,
} from "../../src/config/database";

import {
  countPublishedRoutes,
  findPublishedRouteById,
  findPublishedRoutes,
  findRouteStopsByRouteId,
} from "../../src/repositories/route.repository";

describe(
  "route.repository public availability rules",
  () => {
    beforeEach(() => {
      vi.mocked(
        db.query
      ).mockReset();
    });

    it(
      "filters route list to published routes with at least one fully public stop",
      async () => {
        vi.mocked(
          db.query
        ).mockResolvedValue({
          rows:
            [],
        } as any);

        await findPublishedRoutes(
          10,
          0
        );

        const [
          sql,
          params,
        ] =
          vi.mocked(
            db.query
          ).mock.calls[0];

        const normalizedSql =
          String(sql)
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        expect(
          normalizedSql
        ).toContain(
          "r.status = 'published'"
        );

        expect(
          normalizedSql
        ).toContain(
          "AND EXISTS"
        );

        expect(
          normalizedSql
        ).toContain(
          "a.status IS DISTINCT FROM 'published'"
        );

        expect(
          normalizedSql
        ).toContain(
          "loc.language_code = 'vi'"
        );

        expect(
          normalizedSql
        ).toContain(
          "loc.status = 'published'"
        );

        expect(
          params
        ).toEqual([
          10,
          0,
        ]);
      }
    );

    it(
      "uses the same public-availability constraints when counting routes",
      async () => {
        vi.mocked(
          db.query
        ).mockResolvedValue({
          rows: [
            {
              total:
                "2",
            },
          ],
        } as any);

        const total =
          await countPublishedRoutes();

        expect(
          total
        ).toBe(2);

        const sql =
          String(
            vi.mocked(
              db.query
            ).mock.calls[0][0]
          )
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        expect(
          sql
        ).toContain(
          "r.status = 'published'"
        );

        expect(
          sql
        ).toContain(
          "a.status IS DISTINCT FROM 'published'"
        );

        expect(
          sql
        ).toContain(
          "loc.language_code = 'vi'"
        );
      }
    );

    it(
      "applies the public-availability rules to route detail lookup",
      async () => {
        vi.mocked(
          db.query
        ).mockResolvedValue({
          rows:
            [],
        } as any);

        const result =
          await findPublishedRouteById(
            9
          );

        expect(
          result
        ).toBeNull();

        const [
          sql,
          params,
        ] =
          vi.mocked(
            db.query
          ).mock.calls[0];

        const normalizedSql =
          String(sql)
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        expect(
          normalizedSql
        ).toContain(
          "r.route_id = $1"
        );

        expect(
          normalizedSql
        ).toContain(
          "r.status = 'published'"
        );

        expect(
          normalizedSql
        ).toContain(
          "a.status IS DISTINCT FROM 'published'"
        );

        expect(
          params
        ).toEqual([
          9,
        ]);
      }
    );

    it(
      "loads only published attractions with published Vietnamese localization and orders stops",
      async () => {
        vi.mocked(
          db.query
        ).mockResolvedValue({
          rows:
            [],
        } as any);

        await findRouteStopsByRouteId(
          2
        );

        const [
          sql,
          params,
        ] =
          vi.mocked(
            db.query
          ).mock.calls[0];

        const normalizedSql =
          String(sql)
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        expect(
          normalizedSql
        ).toContain(
          "loc.language_code = 'vi'"
        );

        expect(
          normalizedSql
        ).toContain(
          "loc.status = 'published'"
        );

        expect(
          normalizedSql
        ).toContain(
          "a.status = 'published'"
        );

        expect(
          normalizedSql
        ).toContain(
          "ORDER BY rs.stop_order ASC"
        );

        expect(
          params
        ).toEqual([
          2,
        ]);
      }
    );
  }
);