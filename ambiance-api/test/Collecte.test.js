import { afterEach, describe, expect, it } from "vitest";
import phyphoxBridge from "../bridge/phyphoxBridge.js";
import collectionCsv from "../lib/collectionCsv.js";
import importPhyphoxCsv from "../scripts/importPhyphoxCsv.js";
import importManualObservations from "../scripts/importManualObservations.js";

const {
  extractNoiseValue,
  findFirstNumber,
  normalizeNoiseValue,
  readPath
} = phyphoxBridge;
const { loadCollectionData } = collectionCsv;
const { rowToMeasurement } = importPhyphoxCsv;
const {
  normalizeCrowdLevel,
  normalizeProximity,
  normalizeVibe,
  toObservation
} = importManualObservations;

const savedEnv = { ...process.env };

afterEach(() => {
  process.env = { ...savedEnv };
});

describe("normalizeNoiseValue", () => {
  it("convertit les décibels Phyphox vers l'échelle 0-1", () => {
    expect(normalizeNoiseValue(-50)).toBeCloseTo(0.5);
    expect(normalizeNoiseValue(-80)).toBe(0);
    expect(normalizeNoiseValue(-20)).toBe(1);
  });

  it("borne les valeurs hors échelle", () => {
    expect(normalizeNoiseValue(-100)).toBe(0);
    expect(normalizeNoiseValue(2)).toBe(1);
  });

  it("laisse passer une valeur déjà normalisée", () => {
    expect(normalizeNoiseValue(0.42)).toBe(0.42);
  });

  it("rejette une valeur illisible", () => {
    expect(() => normalizeNoiseValue("fort")).toThrow();
  });
});

describe("lecture du payload Phyphox", () => {
  it("lit un chemin configuré dans la réponse", () => {
    expect(readPath({ buffer: { audio: { buffer: [0.1, 0.4] } } }, "buffer.audio.buffer")).toEqual([0.1, 0.4]);
  });

  it("retient la dernière valeur numérique du tampon", () => {
    expect(findFirstNumber({ buffer: [0.1, 0.2, 0.7] })).toBe(0.7);
  });

  it("respecte PHYPHOX_VALUE_PATH plutôt que le premier nombre trouvé", () => {
    process.env.PHYPHOX_VALUE_PATH = "buffer.dB.buffer";

    const value = extractNoiseValue({
      ignored: [0.9],
      buffer: { dB: { buffer: [-60, -50] } }
    });

    expect(value).toBeCloseTo(0.5);
  });
});

describe("import des collectes", () => {
  it("expose exactement les douze sessions du manifeste", () => {
    const imported = loadCollectionData();
    const parkOf = ({ session }) => session.location;

    expect(imported.sessions).toHaveLength(12);
    expect(imported.sessions.filter((item) => parkOf(item) === "parc-lafontaine")).toHaveLength(6);
    expect(imported.sessions.filter((item) => parkOf(item) === "parc-jean-mance")).toHaveLength(3);
    expect(imported.sessions.filter((item) => parkOf(item) === "parc-maisonneuve")).toHaveLength(3);
  });

  it("génère une clé d'import unique par mesure pour rester relançable", () => {
    const { measurements } = loadCollectionData();
    const keys = new Set(measurements.map(({ importKey }) => importKey));

    expect(measurements.length).toBeGreaterThan(140000);
    expect(keys.size).toBe(measurements.length);
  });

  it("convertit une ligne CSV Phyphox en mesure horodatée", () => {
    process.env.LOCATION = "parc-lafontaine";
    process.env.ZONE = "zone-banc-central";

    const measurement = rowToMeasurement(
      { "Time (s)": "5", "Sound pressure level (dB)": "-50" },
      new Date("2026-06-17T12:00:00.000Z")
    );

    expect(measurement.location).toBe("parc-lafontaine");
    expect(measurement.timestamp).toBe("2026-06-17T12:00:05.000Z");
    expect(measurement.value).toBeCloseTo(0.5);
  });
});

describe("saisie manuelle de secours", () => {
  it("normalise les valeurs saisies à la main", () => {
    expect(normalizeCrowdLevel("elevee")).toBe("elevee");
    expect(normalizeProximity("near")).toBe("proche");
    expect(normalizeVibe("moderee")).toBe("moderee");
  });

  it("décale l'horodatage selon le repère de l'observation", () => {
    const observation = toObservation({
      sessionNo: "1",
      date: "2026-06-17",
      startTime: "12:00",
      observationTimeLabel: "10min",
      peopleCount: "7",
      crowdLevel: "moyenne",
      humanSourceProximity: "proche",
      vibe: "animee"
    });

    const expected = new Date("2026-06-17T12:00:00");
    expected.setMinutes(expected.getMinutes() + 10);

    expect(observation.timestamp).toBe(expected.toISOString());
    expect(observation.peopleCount).toBe(7);
  });

  it("reporte la proximité de la source humaine sur le champ requis", () => {
    const observation = toObservation({
      date: "2026-06-17",
      startTime: "12:00",
      observationTimeLabel: "0min",
      peopleCount: "3",
      crowdLevel: "faible",
      humanSourceProximity: "loin",
      vibe: "calme"
    });

    expect(observation.proximity).toBe("loin");
  });
});
