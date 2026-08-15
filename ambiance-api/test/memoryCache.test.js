import { describe, expect, it, vi } from "vitest";
import memoryCache from "../lib/memoryCache.js";

const { MemoryCache } = memoryCache;

describe("MemoryCache", () => {
  it("retourne MISS puis HIT tant que le TTL est valide", () => {
    let now = 1_000;
    const logger = { debug: vi.fn() };
    const cache = new MemoryCache({ now: () => now, logger });

    expect(cache.get("locations")).toBeUndefined();
    cache.set("locations", { count: 3 }, { ttlMs: 30_000, tags: ["locations"] });
    expect(cache.get("locations")).toEqual({ count: 3 });
    expect(logger.debug).toHaveBeenCalledWith("[cache] CACHE MISS locations");
    expect(logger.debug).toHaveBeenCalledWith("[cache] CACHE HIT locations");
  });

  it("expire une entrée exactement à la fin de son TTL", () => {
    let now = 10;
    const cache = new MemoryCache({ now: () => now, logger: { debug: vi.fn() } });
    cache.set("current", "value", { ttlMs: 30_000 });
    now += 30_000;
    expect(cache.get("current")).toBeUndefined();
  });

  it("invalide toutes les entrées portant un tag modifié", () => {
    const cache = new MemoryCache({ logger: { debug: vi.fn() } });
    cache.set("a", 1, { ttlMs: 1000, tags: ["location:parc-a"] });
    cache.set("b", 2, { ttlMs: 1000, tags: ["location:parc-b"] });

    expect(cache.invalidateTags(["location:parc-a"])).toBe(1);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });
});
