import { describe, expect, it } from "vitest";
import ambianceLogic from "../lib/ambianceLogic.js";
import locations from "../lib/locations.js";

const {
  average,
  classificationFromVibe,
  classifyNoise,
  parseLast,
  scalePayload
} = ambianceLogic;
const { normalizeLocation, locationAliases } = locations;

describe("classifyNoise", () => {
  it("place chaque valeur dans le bon palier", () => {
    expect(classifyNoise(0.2).code).toBe("calme");
    expect(classifyNoise(0.3).code).toBe("modere");
    expect(classifyNoise(0.6).code).toBe("anime");
    expect(classifyNoise(0.9).code).toBe("bruyant");
  });

  it("classe les bornes vers le palier supérieur", () => {
    expect(classifyNoise(0.25).code).toBe("modere");
    expect(classifyNoise(0.5).code).toBe("anime");
    expect(classifyNoise(0.75).code).toBe("bruyant");
  });

  it("retourne null pour une valeur inutilisable", () => {
    expect(classifyNoise(null)).toBeNull();
    expect(classifyNoise(undefined)).toBeNull();
    expect(classifyNoise("bruyant")).toBeNull();
  });

  it("couvre les extrémités de l'échelle", () => {
    expect(classifyNoise(0).code).toBe("calme");
    expect(classifyNoise(1).code).toBe("bruyant");
  });
});

describe("classificationFromVibe", () => {
  it("traduit chaque vibe déclaré en palier de l'échelle", () => {
    expect(classificationFromVibe("calme").code).toBe("calme");
    expect(classificationFromVibe("moderee").code).toBe("modere");
    expect(classificationFromVibe("animee").code).toBe("anime");
    expect(classificationFromVibe("bruyante").code).toBe("bruyant");
  });

  it("retourne null pour un vibe inconnu ou absent", () => {
    expect(classificationFromVibe("chaotique")).toBeNull();
    expect(classificationFromVibe(undefined)).toBeNull();
  });

  it("reste cohérent avec l'échelle publiée par l'API", () => {
    const codes = scalePayload().thresholds.map((level) => level.code);
    expect(codes).toContain(classificationFromVibe("animee").code);
  });
});

describe("parseLast", () => {
  it("interprète minutes, heures et jours", () => {
    expect(parseLast("15m")).toBe(15 * 60 * 1000);
    expect(parseLast("2h")).toBe(2 * 60 * 60 * 1000);
    expect(parseLast("7d")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("retourne null pour la période complète", () => {
    expect(parseLast("all")).toBeNull();
  });

  it("retombe sur trois heures par défaut", () => {
    expect(parseLast()).toBe(3 * 60 * 60 * 1000);
    expect(parseLast("n'importe quoi")).toBe(3 * 60 * 60 * 1000);
  });
});

describe("average", () => {
  it("calcule la moyenne des valeurs numériques", () => {
    expect(average([0.2, 0.4, 0.6])).toBeCloseTo(0.4);
  });

  it("ignore les valeurs non numériques", () => {
    expect(average([0.2, "abc", null, 0.4])).toBeCloseTo(0.3);
  });

  it("retourne null sans valeur exploitable", () => {
    expect(average([])).toBeNull();
    expect(average(undefined)).toBeNull();
  });
});

describe("normalizeLocation", () => {
  it("ramène les anciennes variantes vers les slugs canoniques", () => {
    expect(normalizeLocation("parc-jeanne-mance")).toBe("parc-jean-mance");
    expect(normalizeLocation("parc_lafontaine")).toBe("parc-lafontaine");
    expect(normalizeLocation("Parc Maisonneuve")).toBe("parc-maisonneuve");
  });

  it("normalise la casse et les espaces d'une saisie libre", () => {
    expect(normalizeLocation("  LAFONTAINE  ")).toBe("parc-lafontaine");
  });

  it("laisse passer un slug inconnu sans le casser", () => {
    expect(normalizeLocation("parc-angrignon")).toBe("parc-angrignon");
    expect(normalizeLocation("")).toBe("");
    expect(normalizeLocation(null)).toBe("");
  });

  it("liste les alias connus d'un lieu canonique", () => {
    expect(locationAliases("parc-jean-mance")).toContain("parc-jeanne-mance");
  });
});
