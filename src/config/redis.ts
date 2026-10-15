import {
  createClient,
} from "redis";

export const redisClient =
  createClient({
    url:
      process.env.REDIS_URL ||
      "redis://localhost:6379",
  });

redisClient.on(
  "error",
  (error) => {
    console.error(
      "Redis client error:",
      error
    );
  }
);

export async function connectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    return;
  }

  await redisClient.connect();

  console.log(
    "Redis connected successfully"
  );
}

/*
 * Dùng cho /health/ready.
 *
 * Redis phải:
 * - đang mở connection
 * - ở trạng thái ready
 * - trả lời PING = PONG
 */
export async function checkRedisConnection(): Promise<void> {
  if (
    !redisClient.isOpen ||
    !redisClient.isReady
  ) {
    throw new Error(
      "Redis is not ready"
    );
  }

  const response =
    await redisClient.ping();

  if (response !== "PONG") {
    throw new Error(
      "Redis health check failed"
    );
  }
}