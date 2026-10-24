import { beforeEach, describe, expect, it, vi } from "vitest";

const redis = vi.hoisted(() => {
  const state = new Map<string, number>();
  const ops = {
    zRemRangeByScore: vi.fn(async (_key: string, _min: string, cutoff: number) => {
      for (const [key, timestamp] of state) if (timestamp <= cutoff) state.delete(key);
    }),
    zAdd: vi.fn(async (_key: string, values: Array<{score:number;value:string}>) => {
      for (const row of values) state.set(row.value, row.score);
    }),
    expire: vi.fn(async () => true),
    zCard: vi.fn(async () => state.size),
  };
  const chain = {
    zRemRangeByScore: vi.fn((_key: string,_min: string,cutoff: number) => {
      for (const [key, timestamp] of state) if (timestamp <= cutoff) state.delete(key);
      return chain;
    }),
    zAdd: vi.fn((_key: string, values: Array<{score:number;value:string}>) => {
      for (const row of values) state.set(row.value, row.score);
      return chain;
    }),
    expire: vi.fn(() => chain),
    exec: vi.fn(async () => []),
  };
  return {state,ops,chain};
});
vi.mock("../../src/config/redis", () => ({redisClient:{...redis.ops,multi:()=>redis.chain}}));
import { getActiveVisitorCount, recordVisitorPresence } from "../../src/services/visitor-presence.service";

const A = "123e4567-e89b-42d3-a456-426614174000";
const B = "123e4567-e89b-42d3-a456-426614174001";

describe("visitor presence service", () => {
  beforeEach(() => {vi.useRealTimers(); redis.state.clear(); vi.clearAllMocks();});
  it("counts two different browsers without storing raw UUIDs", async () => {
    await recordVisitorPresence(A); await recordVisitorPresence(B);
    expect(await getActiveVisitorCount()).toBe(2);
    expect([...redis.state.keys()]).not.toContain(A);
    expect([...redis.state.keys()]).not.toContain(B);
  });
  it("deduplicates two tabs using the same browser UUID", async () => {
    await recordVisitorPresence(A); await recordVisitorPresence(A);
    expect(await getActiveVisitorCount()).toBe(1);
  });
  it("expires an inactive browser after 75 seconds without an unload request", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-25T00:00:00Z"));
    await recordVisitorPresence(A);
    vi.advanceTimersByTime(75_100);
    expect(await getActiveVisitorCount()).toBe(0);
  });
  it("returns no activity after Redis has no records", async () => {
    expect(await getActiveVisitorCount()).toBe(0);
  });
});
