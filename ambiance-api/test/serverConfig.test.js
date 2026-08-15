import { describe, expect, it } from "vitest";
import request from "supertest";
import serverModule from "../server.js";

const { app } = serverModule;

describe("configuration HTTP de production", () => {
  it("expose un health check minimal non cacheable", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("autorise l'origine frontend configurée et refuse une origine inconnue", async () => {
    const allowed = await request(app).get("/health").set("Origin", "http://localhost:5173");
    const refused = await request(app).get("/health").set("Origin", "https://origine-inconnue.example");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(refused.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("marque toutes les écritures no-store", async () => {
    const response = await request(app).post("/route-inexistante").send({ value: 1 });
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
