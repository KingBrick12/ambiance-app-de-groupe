import { describe, expect, it } from "vitest";
import observationService from "../lib/observationService.js";

const { pickObservationFields, validateObservationPayload } = observationService;

const NOW = new Date("2026-07-14T15:00:00.000Z").getTime();

const validPayload = (overrides = {}) => ({
  location: "parc-lafontaine",
  zone: "zone-banc-central",
  timestamp: "2026-07-14T14:30:00.000Z",
  peopleCount: 12,
  crowdLevel: "moyenne",
  proximity: "proche",
  vibe: "moderee",
  ...overrides
});

describe("pickObservationFields", () => {
  it("ne garde que les champs autorisés", () => {
    const picked = pickObservationFields({
      location: "parc-lafontaine",
      notes: "beaucoup de vélos",
      author: "un-id-volé",
      receivedAt: "2020-01-01"
    });

    expect(picked).toEqual({
      location: "parc-lafontaine",
      notes: "beaucoup de vélos"
    });
  });

  it("supporte un corps vide", () => {
    expect(pickObservationFields()).toEqual({});
    expect(pickObservationFields({})).toEqual({});
  });
});

describe("validateObservationPayload", () => {
  it("accepte une observation complète et convertit la date", () => {
    const result = validateObservationPayload(validPayload(), NOW);

    expect(result.ok).toBe(true);
    expect(result.data.timestamp).toBeInstanceOf(Date);
    expect(result.data.timestamp.toISOString()).toBe(
      "2026-07-14T14:30:00.000Z"
    );
    expect(result.data.vibe).toBe("moderee");
  });

  it("refuse un auteur imposé par le client", () => {
    const result = validateObservationPayload(
      validPayload({ author: "id-de-quelqu-un-d-autre" }),
      NOW
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("AUTHOR_NOT_ALLOWED");
    expect(result.status).toBe(400);
  });

  it("refuse une observation datée dans le futur", () => {
    const result = validateObservationPayload(
      validPayload({ timestamp: "2026-07-14T16:00:00.000Z" }),
      NOW
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("FUTURE_TIMESTAMP");
  });

  it("refuse une charge utile incomplète", () => {
    const incomplete = validPayload();
    delete incomplete.vibe;

    const result = validateObservationPayload(incomplete, NOW);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("VALIDATION_ERROR");
  });

  it("refuse un compte de personnes négatif ou non numérique", () => {
    expect(
      validateObservationPayload(validPayload({ peopleCount: -1 }), NOW).error
    ).toBe("VALIDATION_ERROR");
    expect(
      validateObservationPayload(validPayload({ peopleCount: "douze" }), NOW)
        .error
    ).toBe("VALIDATION_ERROR");
  });

  it("accepte un compte de personnes nul", () => {
    const result = validateObservationPayload(
      validPayload({ peopleCount: 0 }),
      NOW
    );

    expect(result.ok).toBe(true);
    expect(result.data.peopleCount).toBe(0);
  });

  it("refuse une date illisible", () => {
    const result = validateObservationPayload(
      validPayload({ timestamp: "hier après-midi" }),
      NOW
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/date valide/);
  });

  it("laisse passer une observation faite à la seconde présente", () => {
    const result = validateObservationPayload(
      validPayload({ timestamp: new Date(NOW).toISOString() }),
      NOW
    );

    expect(result.ok).toBe(true);
  });
});
