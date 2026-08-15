export const FRONTEND_CACHE = Object.freeze({
  CURRENT_STALE_MS: 30_000,
  LOCATIONS_STALE_MS: 30_000,
  STABLE_STALE_MS: 300_000,
  RETENTION_MS: 600_000
});

function serializeKey(key) {
  return JSON.stringify(Array.isArray(key) ? key : [key]);
}

export class QueryCache {
  constructor({ now = () => Date.now() } = {}) {
    this.entries = new Map();
    this.inFlight = new Map();
    this.now = now;
  }

  async fetch(key, loader, options) {
    const cacheKey = serializeKey(key);
    const current = this.entries.get(cacheKey);
    const age = current ? this.now() - current.updatedAt : Infinity;

    if (!options.force && current && age < options.staleTimeMs) {
      return current.data;
    }

    if (current && age >= options.cacheTimeMs) this.entries.delete(cacheKey);
    if (this.inFlight.has(cacheKey)) return this.inFlight.get(cacheKey);

    const request = Promise.resolve()
      .then(loader)
      .then((data) => {
        const previous = this.entries.get(cacheKey);
        if (previous?.timer) clearTimeout(previous.timer);
        const entry = {
          data,
          updatedAt: this.now(),
          tags: new Set(options.tags || [])
        };
        entry.timer = setTimeout(() => {
          if (this.entries.get(cacheKey) === entry) this.entries.delete(cacheKey);
        }, options.cacheTimeMs);
        entry.timer.unref?.();
        this.entries.set(cacheKey, entry);
        return data;
      })
      .finally(() => this.inFlight.delete(cacheKey));

    this.inFlight.set(cacheKey, request);
    return request;
  }

  invalidateTags(tags) {
    const requested = new Set(tags.filter(Boolean));
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if ([...requested].some((tag) => entry.tags.has(tag))) {
        clearTimeout(entry.timer);
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear() {
    for (const entry of this.entries.values()) clearTimeout(entry.timer);
    this.entries.clear();
    this.inFlight.clear();
  }
}

export const queryCache = new QueryCache();

export function cachedQuery(key, loader, {
  staleTimeMs,
  cacheTimeMs = FRONTEND_CACHE.RETENTION_MS,
  tags = [],
  force = false
}) {
  return queryCache.fetch(key, loader, { staleTimeMs, cacheTimeMs, tags, force });
}

export function invalidatePublicQueries(location) {
  return queryCache.invalidateTags([
    "locations",
    location ? `location:${location}` : "ambiance"
  ]);
}
