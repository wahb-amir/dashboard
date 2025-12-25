import redis from "@/app/utils/redis";

export default async function rateLimiter(key, limit = 5, window = 60) {

    const current = await redis.get(key);

    if (current && parseInt(current) >= limit) {
        return false; // rate limit exceeded
    }

    if (!current) {
        await redis.set(key, 1, "EX", window);
    } else {
        await redis.incr(key);
    }

    return true;
}
