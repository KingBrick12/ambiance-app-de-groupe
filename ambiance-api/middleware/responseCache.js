const { responseCache } = require("../lib/memoryCache");

const CACHE_TTL = Object.freeze({
  CURRENT_MS: 30_000,
  LOCATIONS_MS: 30_000,
  STABLE_READ_MS: 300_000
});

function normalizeCacheKey(req) {
  const url = new URL(req.originalUrl, "http://cache.local");
  url.searchParams.sort();
  return `GET:${url.pathname}${url.search}`;
}

function cacheResponse({ ttlMs, tags = [] }) {
  return function responseCacheMiddleware(req, res, next) {
    if (req.method !== "GET") return next();

    const key = normalizeCacheKey(req);
    const cached = responseCache.get(key);
    res.set("Cache-Control", "no-cache");

    if (cached !== undefined) {
      res.set("X-Cache", "HIT");
      return res.status(cached.status).json(cached.body);
    }

    res.set("X-Cache", "MISS");
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resolvedTags = typeof tags === "function" ? tags(req) : tags;
        responseCache.set(key, { status: res.statusCode, body }, { ttlMs, tags: resolvedTags });
      }
      return sendJson(body);
    };

    return next();
  };
}

function invalidatePublicCache(location) {
  return responseCache.invalidateTags([
    "locations",
    location ? `location:${location}` : "ambiance"
  ]);
}

module.exports = { CACHE_TTL, cacheResponse, invalidatePublicCache, normalizeCacheKey };
