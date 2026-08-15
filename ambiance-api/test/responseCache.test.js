import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import memoryCache from "../lib/memoryCache.js";
import responseCacheModule from "../middleware/responseCache.js";

const { responseCache } = memoryCache;
const { cacheResponse, invalidatePublicCache } = responseCacheModule;

afterEach(() => responseCache.clear());

describe("middleware de cache HTTP applicatif", () => {
  it("sert un GET répété depuis le cache puis invalide après une écriture", async () => {
    const app = express();
    let reads = 0;
    let writes = 0;

    app.get("/ambiance/parc-a/current", cacheResponse({
      ttlMs: 30_000,
      tags: ["ambiance", "location:parc-a"]
    }), (_req, res) => res.json({ reads: ++reads }));
    app.post("/measurements", (_req, res) => {
      writes += 1;
      invalidatePublicCache("parc-a");
      res.status(201).json({ writes });
    });

    const miss = await request(app).get("/ambiance/parc-a/current");
    const hit = await request(app).get("/ambiance/parc-a/current");
    const firstWrite = await request(app).post("/measurements");
    const secondWrite = await request(app).post("/measurements");
    const afterInvalidation = await request(app).get("/ambiance/parc-a/current");

    expect(miss.headers["x-cache"]).toBe("MISS");
    expect(hit.headers["x-cache"]).toBe("HIT");
    expect(hit.body.reads).toBe(1);
    expect(firstWrite.body.writes).toBe(1);
    expect(secondWrite.body.writes).toBe(2);
    expect(afterInvalidation.headers["x-cache"]).toBe("MISS");
    expect(afterInvalidation.body.reads).toBe(2);
  });
});
