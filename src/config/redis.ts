import { createClient } from "redis";

export const redisClient = createClient({
  url:
    process.env.REDIS_URL ||
    "redis://localhost:6379",
});

redisClient.on("error", (error) => {
  console.error(
    "Redis client error:",
    error
  );
});

export async function connectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    return;
  }

  await redisClient.connect();

  console.log(
    "Redis connected successfully"
  );
}