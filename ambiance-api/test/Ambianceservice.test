import { describe, expect, it } from "vitest";
import ambianceService from "../lib/ambianceService.js";

const {
  FRESHNESS_THRESHOLD_MINUTES,
  buildCurrentAmbiance,
  buildHistoryPoints,
  buildQuietSlots
} = ambianceService;

const NOW = new Date("2026-07-14T15:00:00.000Z").getTime();
const minutesAgo = (minutes) => new Date(NOW - minutes * 60 * 1000);

describe("buildCurrentAmbiance", () => {
  it("classe un lieu à partir de ses mesures récentes", () => {
    const ambiance = buildCurrentAmbiance({
      latestMeasurement: { timestamp: minutesAgo(5), value: 0.2 },
      recentMeasurements: [
        { timestamp: minutesAgo(10), value: 0.18 },
        { timestamp: minutesAgo(5), value: 0.22 }
      ],
      lastObservation: null,
      now: NOW
    });

    expect(ambiance.status).toBe("recent");
    expect(ambiance.classification.code).toBe("calme");
    expect(ambiance.averageNoise).toBe(0.2);
    expect(ambiance.source).toBe("measurement");
    expect(ambiance.freshness.isRecent).toBe(true);
  });

  it("laisse l'observation la plus récente donner la classification", () => {
    const ambiance = buildCurrentAmbiance({
      latestMeasurement: { timestamp: minutesAgo(20), value: 0.2 },
      recentMeasurements: [{ timestamp: minutesAgo(20), value: 0.2 }],
      lastObservation: { timestamp: minutesAgo(2), vibe: "animee" },
      now: NOW
    });

    expect(ambiance.source).toBe("observation");
    expect(ambiance.classification.code).toBe("anime");
    expect(ambiance.vibe).toBe("animee");
  });

  it("passe en état périmé au-delà du seuil de fraîcheur", () => {
    const ambiance = buildCurrentAmbiance({
      latestMeasurement: {
        timestamp: minutesAgo(FRESHNESS_THRESHOLD_MINUTES + 1),
        value: 0.9
      },
      recentMeasurements: [],
      lastObservation: null,
      now: NOW
    });

    expect(ambiance.status).toBe("stale");
    expect(ambiance.averageNoise).toBeNull();
    expect(ambiance.classification).toBeNull();
    expect(ambiance.message).toMatch(/n’est plus récente|n'est plus récente/);
  });

  it("reste lisible quand le lieu n'a aucune donnée", () => {
    const ambiance = buildCurrentAmbiance({ now: NOW });

    expect(ambiance.status).toBe("empty");
    expect(ambiance.measuredAt).toBeNull();
    expect(ambiance.freshness.ageMinutes).toBeNull();
    expect(ambiance.vibe).toBe("inconnue");
  });

  it("considère une mesure pile sur le seuil comme encore récente", () => {
    const ambiance = buildCurrentAmbiance({
      latestMeasurement: {
        timestamp: minutesAgo(FRESHNESS_THRESHOLD_MINUTES),
        value: 0.4
      },
      recentMeasurements: [
        { timestamp: minutesAgo(FRESHNESS_THRESHOLD_MINUTES), value: 0.4 }
      ],
      now: NOW
    });

    expect(ambiance.status).toBe("recent");
    expect(ambiance.freshness.ageMinutes).toBe(FRESHNESS_THRESHOLD_MINUTES);
  });
});

describe("buildHistoryPoints", () => {
  it("regroupe les mesures par tranches de cinq minutes", () => {
    const points = buildHistoryPoints([
      { timestamp: new Date("2026-07-14T10:01:00.000Z"), value: 0.2 },
      { timestamp: new Date("2026-07-14T10:03:00.000Z"), value: 0.4 },
      { timestamp: new Date("2026-07-14T10:07:00.000Z"), value: 0.8 }
    ]);

    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(0.3);
    expect(points[1].value).toBe(0.8);
  });

  it("classe chaque point pour qu'il se lise seul", () => {
    const points = buildHistoryPoints([
      { timestamp: new Date("2026-07-14T10:00:00.000Z"), value: 0.1 },
      { timestamp: new Date("2026-07-14T11:00:00.000Z"), value: 0.9 }
    ]);

    expect(points[0].classification.code).toBe("calme");
    expect(points[1].classification.code).toBe("bruyant");
  });

  it("retourne les points dans l'ordre chronologique malgré une entrée désordonnée", () => {
    const points = buildHistoryPoints([
      { timestamp: new Date("2026-07-14T12:00:00.000Z"), value: 0.5 },
      { timestamp: new Date("2026-07-14T10:00:00.000Z"), value: 0.5 }
    ]);

    expect(points.map((point) => point.timestamp)).toEqual([
      "2026-07-14T10:00:00.000Z",
      "2026-07-14T12:00:00.000Z"
    ]);
  });

  it("ignore les mesures illisibles et supporte la liste vide", () => {
    expect(buildHistoryPoints([])).toEqual([]);
    expect(
      buildHistoryPoints([
        { timestamp: "pas-une-date", value: 0.4 },
        { timestamp: new Date("2026-07-14T10:00:00.000Z"), value: "abc" }
      ])
    ).toEqual([]);
  });
});

describe("buildQuietSlots", () => {
  const at = (hour, value) => ({ timestamp: new Date(2026, 6, 14, hour, 0, 0), value });

  it("ne retient que les heures sous le seuil", () => {
    const slots = buildQuietSlots([at(7, 0.15), at(18, 0.8)]);

    expect(slots).toHaveLength(1);
    expect(slots[0].start).toBe("07:00");
    expect(slots[0].end).toBe("08:00");
  });

  it("trie les créneaux du plus calme au moins calme", () => {
    const slots = buildQuietSlots([at(7, 0.3), at(6, 0.1)]);

    expect(slots.map((slot) => slot.start)).toEqual(["06:00", "07:00"]);
  });

  it("moyenne toutes les mesures d'une même heure", () => {
    const slots = buildQuietSlots([at(9, 0.1), at(9, 0.3)]);

    expect(slots).toHaveLength(1);
    expect(slots[0].averageNoise).toBe(0.2);
  });

  it("boucle correctement sur minuit", () => {
    const slots = buildQuietSlots([at(23, 0.1)]);

    expect(slots[0].end).toBe("00:00");
  });

  it("retourne une liste vide quand aucun créneau n'est calme", () => {
    expect(buildQuietSlots([at(12, 0.9)])).toEqual([]);
    expect(buildQuietSlots([])).toEqual([]);
  });
});
