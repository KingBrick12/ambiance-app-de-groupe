const NOISE_SCALE = [
  { min: 0, max: 0.25, label: "calme" },
  { min: 0.25, max: 0.50, label: "modere" },
  { min: 0.50, max: 0.75, label: "anime" },
  { min: 0.75, max: 1, label: "bruyant" }
];

function classifyNoise(averageNoise) {
  if (averageNoise === null || averageNoise === undefined) {
    return "inconnue";
  }

  if (averageNoise <= 0.25) return "calme";
  if (averageNoise <= 0.50) return "modere";
  if (averageNoise <= 0.75) return "anime";
  return "bruyant";
}

function scalePayload() {
  return {
    unit: "amplitude normalisee",
    thresholds: NOISE_SCALE
  };
}

function parseLast(last) {
  if (!last) return 3 * 60 * 60 * 1000;

  const match = String(last).trim().match(/^(\d+)(m|h)$/);
  if (!match) return 3 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === "h") return value * 60 * 60 * 1000;
  return value * 60 * 1000;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

module.exports = {
  average,
  classifyNoise,
  parseLast,
  scalePayload
};
