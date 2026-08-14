const {
  average,
  classificationFromVibe,
  classifyNoise
} = require("./ambianceLogic");

const FRESHNESS_THRESHOLD_MINUTES = 30;
const QUIET_THRESHOLD = 0.35;
const HISTORY_BUCKET_MINUTES = 5;

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
function buildCurrentAmbiance({
  latestMeasurement = null,
  recentMeasurements = [],
  lastObservation = null,
  now = Date.now()
} = {}) {
  const measurementTime = toTime(latestMeasurement?.timestamp);
  const observationTime = toTime(lastObservation?.timestamp);
  const observationIsLatest = observationTime >= measurementTime;
  const latestTime = Math.max(measurementTime, observationTime);

  const measuredAt = latestTime ? new Date(latestTime) : null;
  const ageMinutes = measuredAt
    ? Math.max(0, Math.floor((now - latestTime) / 60000))
    : null;
  const isRecent = Boolean(
    measuredAt && ageMinutes <= FRESHNESS_THRESHOLD_MINUTES
  );
  const status = isRecent ? "recent" : measuredAt ? "stale" : "empty";

  const averageNoise = isRecent
    ? average(recentMeasurements.map((measurement) => measurement.value))
    : null;
  const classification =
    isRecent && observationIsLatest
      ? classificationFromVibe(lastObservation?.vibe)
      : classifyNoise(averageNoise);

  let message = "Aucune mesure n'est disponible pour ce lieu.";
  if (status === "stale") {
    message = "La dernière mesure disponible n'est plus récente.";
  } else if (classification) {
    message = `Le lieu est actuellement ${classification.label.toLowerCase()}.`;
  }

  return {
    status,
    classification,
    averageNoise: averageNoise === null ? null : Number(averageNoise.toFixed(2)),
    vibe: lastObservation?.vibe || "inconnue",
    measuredAt,
    source: observationIsLatest ? "observation" : "measurement",
    freshness: {
      isRecent,
      thresholdMinutes: FRESHNESS_THRESHOLD_MINUTES,
      ageMinutes
    },
    message
  };
}
function buildHistoryPoints(
  measurements = [],
  bucketMinutes = HISTORY_BUCKET_MINUTES
) {
  const groups = new Map();

  for (const measurement of measurements) {
    const time = toTime(measurement?.timestamp);
    if (!time || !Number.isFinite(Number(measurement.value))) continue;

    const date = new Date(time);
    date.setMinutes(
      Math.floor(date.getMinutes() / bucketMinutes) * bucketMinutes,
      0,
      0
    );

    const key = date.toISOString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(Number(measurement.value));
  }

  return [...groups.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([timestamp, values]) => {
      const value = average(values);
      return {
        timestamp,
        value: Number(value.toFixed(2)),
        classification: classifyNoise(value)
      };
    });
}
function buildQuietSlots(measurements = [], threshold = QUIET_THRESHOLD) {
  const groups = new Map();

  for (const measurement of measurements) {
    const time = toTime(measurement?.timestamp);
    if (!time || !Number.isFinite(Number(measurement.value))) continue;

    const hour = new Date(time).getHours();
    if (!groups.has(hour)) groups.set(hour, []);
    groups.get(hour).push(Number(measurement.value));
  }

  return [...groups.entries()]
    .map(([hour, values]) => {
      const averageNoise = average(values);
      return {
        start: `${String(hour).padStart(2, "0")}:00`,
        end: `${String((hour + 1) % 24).padStart(2, "0")}:00`,
        averageNoise: Number(averageNoise.toFixed(2)),
        classification: classifyNoise(averageNoise),
        message:
          "Ce créneau est généralement calme selon les mesures disponibles."
      };
    })
    .filter((slot) => slot.averageNoise <= threshold)
    .sort((first, second) => first.averageNoise - second.averageNoise);
}

function quietThresholdPayload(threshold = QUIET_THRESHOLD) {
  return {
    maximumAverageNoise: threshold,
    description: `Un créneau est considéré calme lorsque son amplitude moyenne est inférieure ou égale à ${threshold}.`
  };
}

module.exports = {
  FRESHNESS_THRESHOLD_MINUTES,
  HISTORY_BUCKET_MINUTES,
  QUIET_THRESHOLD,
  buildCurrentAmbiance,
  buildHistoryPoints,
  buildQuietSlots,
  quietThresholdPayload
};
