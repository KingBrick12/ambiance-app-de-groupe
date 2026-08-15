import { describe, expect, it, vi } from "vitest";
import { QueryCache } from "./queryCache";

describe("QueryCache", () => {
  it("réutilise une lecture fraîche et déduplique les requêtes simultanées", async () => {
    const cache = new QueryCache();
    const loader = vi.fn(async () => ({ value: 1 }));
    const options = { staleTimeMs: 30_000, cacheTimeMs: 600_000, tags: ["locations"] };

    const [first, second] = await Promise.all([
      cache.fetch(["locations"], loader, options),
      cache.fetch(["locations"], loader, options)
    ]);
    const third = await cache.fetch(["locations"], loader, options);

    expect(first).toEqual(second);
    expect(third).toEqual(first);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("refetch lorsque les données deviennent périmées", async () => {
    let now = 0;
    const cache = new QueryCache({ now: () => now });
    const loader = vi.fn(async () => loader.mock.calls.length);
    const options = { staleTimeMs: 30_000, cacheTimeMs: 600_000, tags: [] };

    expect(await cache.fetch(["current"], loader, options)).toBe(1);
    now = 30_000;
    expect(await cache.fetch(["current"], loader, options)).toBe(2);
  });

  it("invalide par tag après une mutation", async () => {
    const cache = new QueryCache();
    const loader = vi.fn(async () => loader.mock.calls.length);
    const options = { staleTimeMs: 300_000, cacheTimeMs: 600_000, tags: ["location:parc-a"] };

    await cache.fetch(["quiet", "parc-a"], loader, options);
    expect(cache.invalidateTags(["location:parc-a"])).toBe(1);
    expect(await cache.fetch(["quiet", "parc-a"], loader, options)).toBe(2);
  });
});
