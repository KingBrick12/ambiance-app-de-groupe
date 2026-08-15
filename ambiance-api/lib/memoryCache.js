class MemoryCache {
  constructor({ now = () => Date.now(), logger = console } = {}) {
    this.entries = new Map();
    this.now = now;
    this.logger = logger;
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) {
      this.log("CACHE MISS", key);
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.log("CACHE EXPIRED", key);
      this.log("CACHE MISS", key);
      return undefined;
    }

    this.log("CACHE HIT", key);
    return entry.value;
  }

  set(key, value, { ttlMs, tags = [] }) {
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
      tags: new Set(tags)
    });
  }

  invalidateTags(tags) {
    const requested = new Set(tags.filter(Boolean));
    let removed = 0;

    for (const [key, entry] of this.entries) {
      if ([...requested].some((tag) => entry.tags.has(tag))) {
        this.entries.delete(key);
        removed += 1;
        this.log("CACHE INVALIDATION", key);
      }
    }

    return removed;
  }

  clear() {
    this.entries.clear();
  }

  log(event, key) {
    if (process.env.NODE_ENV !== "production" || process.env.CACHE_DEBUG === "true") {
      this.logger.debug?.(`[cache] ${event} ${key}`);
    }
  }
}

const responseCache = new MemoryCache();

module.exports = { MemoryCache, responseCache };
