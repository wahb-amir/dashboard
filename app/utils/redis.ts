import Redis from "ioredis";

// ensure proper typing
let redis: Redis | null = null;

if (!redis) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("Redis url not found!");
  }
  redis = new Redis(redisUrl);

  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", (err: Error) => console.error("Redis error:", err));
}

export default redis;
