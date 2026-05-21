import crypto from 'crypto';
const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
// In-memory fallback when Redis unavailable
const memoryCache = new Map();
export function computeQuestionHash(normalizedText) {
    return crypto.createHash('sha256').update(normalizedText).digest('hex').substring(0, 32);
}
async function getRedisClient() {
    if (!REDIS_URL)
        return null;
    try {
        const { createClient } = await import('redis');
        const client = createClient({ url: REDIS_URL });
        return client;
    }
    catch {
        return null;
    }
}
export async function getCachedAnswer(hash) {
    const redis = await getRedisClient();
    if (redis) {
        try {
            await redis.connect();
            const cached = await redis.get(`question:${hash}`);
            if (cached) {
                await redis.quit();
                return JSON.parse(cached);
            }
        }
        catch {
            // Redis unavailable — fall through to memory cache
        }
        finally {
            try {
                await redis.quit();
            }
            catch { }
        }
    }
    // In-memory fallback
    const entry = memoryCache.get(hash);
    if (entry && entry.expiry > Date.now()) {
        return entry.data;
    }
    memoryCache.delete(hash);
    return null;
}
export async function setCachedAnswer(hash, data) {
    const payload = JSON.stringify(data);
    const redis = await getRedisClient();
    if (redis) {
        try {
            await redis.connect();
            await redis.setEx(`question:${hash}`, CACHE_TTL_SECONDS, payload);
            await redis.quit();
            return;
        }
        catch {
            // Redis unavailable — use memory cache
        }
        finally {
            try {
                await redis.quit();
            }
            catch { }
        }
    }
    // In-memory fallback — trim if >1000 entries
    if (memoryCache.size > 1000) {
        const oldest = [...memoryCache.entries()]
            .sort((a, b) => a[1].expiry - b[1].expiry)
            .slice(0, 100);
        oldest.forEach(([k]) => memoryCache.delete(k));
    }
    memoryCache.set(hash, { data, expiry: Date.now() + CACHE_TTL_SECONDS * 1000 });
}
//# sourceMappingURL=cache.service.js.map