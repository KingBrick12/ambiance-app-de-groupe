const NOISE_SCALE = [
  {
    min: 0,
    max: 0.25,
    code: "calme",
    label: "Calme",
    description: "Le niveau sonore est faible et l'ambiance est tranquille."
  },
  {
    min: 0.25,
    max: 0.5,
    code: "modere",
    label: "Modéré",
    description: "Le niveau sonore est modéré et permet généralement de discuter confortablement."
  },
  {
    min: 0.5,
    max: 0.75,
    code: "anime",
    label: "Animé",
    description: "Le lieu présente une activité sonore importante."
  },
  {
    min: 0.75,
    max: 1,
    code: "bruyant",
    label: "Bruyant",
    description: "Le niveau sonore est très élevé."
  }
];

function classifyNoise(averageNoise) {
  const value = Number(averageNoise);
  if (!Number.isFinite(value)) return null;

  return (
    NOISE_SCALE.find((level, index) => {
      const isLast = index === NOISE_SCALE.length - 1;
      return value >= level.min && (isLast ? value <= level.max : value < level.max);
    }) || NOISE_SCALE[NOISE_SCALE.length - 1]
  );
}

function scalePayload() {
  return {
    label: "Amplitude sonore moyenne",
    unit: "amplitude normalisée",
    minimum: 0,
    maximum: 1,
    thresholds: NOISE_SCALE
  };
}

function parseLast(last) {
  if (!last) return 3 * 60 * 60 * 1000;
  const match = String(last).trim().match(/^(\d+)(m|h|d)$/);
  if (!match) return 3 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "d") return value * 24 * 60 * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  return value * 60 * 1000;
}

function average(values) {
  const validValues = Array.isArray(values)
    ? values.map(Number).filter(Number.isFinite)
    : [];
  if (validValues.length === 0) return null;
  return validValues.reduce((total, value) => total + value, 0) / validValues.length;
}

module.exports = {
  average,
  classifyNoise,
  parseLast,
  scalePayload
};
