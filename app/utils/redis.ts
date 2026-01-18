import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

const redis =
  globalThis._redis ??
  (() => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL not found");
    }

    const client = new Redis(redisUrl);

    client.on("connect", () => {
      console.log("Redis connected");
    });

    client.on("error", (err) => {
      console.error("Redis error:", err);
    });

    globalThis._redis = client;
    return client;
  })();

export default redis;
