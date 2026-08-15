import { describe, expect, it } from "vitest";
import seedModule from "../seed/seed.js";

const { recentMeasurements } = seedModule;

describe("recentMeasurements", () => {
  it("génère cinq mesures pour chacun des trois parcs", () => {
    const measurements = recentMeasurements({ now: 1_000_000, random: () => 0.5 });
    expect(measurements).toHaveLength(15);
    expect(new Set(measurements.map(({ location }) => location)).size).toBe(3);
  });

  it("génère des clés stables et uniques pour les mises à jour", () => {
    const measurements = recentMeasurements({ now: 1_000_000, random: () => 0.5 });
    const keys = measurements.map(({ importKey }) => importKey);
    expect(new Set(keys).size).toBe(15);
    expect(keys.every((key) => key.startsWith("seed-recent:"))).toBe(true);
  });

  it("place toutes les mesures dans la fenêtre des vingt dernières minutes", () => {
    const now = Date.parse("2026-08-15T12:00:00.000Z");
    const measurements = recentMeasurements({ now, random: () => 0.5 });
    const ages = measurements.map(({ timestamp }) => now - timestamp.getTime());
    expect(Math.min(...ages)).toBe(0);
    expect(Math.max(...ages)).toBe(20 * 60 * 1000);
  });
});
