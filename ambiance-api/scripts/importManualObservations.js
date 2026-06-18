require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  getFirst,
  numberFrom,
  postJson,
  readTabularFile,
  requiredEnv,
  resolveProjectPath
} = require("./lib/io");

function toObservation(row) {
  const date = getFirst(row, ["date", "Date"], new Date().toISOString().slice(0, 10));
  const startTime = getFirst(row, ["startTime", "Start time", "Heure debut", "Heure début"], "12:00");
  const observationTimeLabel = getFirst(row, ["observationTimeLabel", "Observation", "Temps"], "0min");
  const timestamp = getFirst(row, ["timestamp", "Timestamp"], buildTimestamp(date, startTime, observationTimeLabel));
  const humanSourceProximity = getFirst(
    row,
    ["humanSourceProximity", "humanSourceProximity ", "Proximite source humaine", "Proximité source humaine"],
    "moyenne"
  );

  return {
    sessionNo: getFirst(row, ["sessionNo", "Session", "session"], ""),
    location: getFirst(row, ["location", "Location", "Lieu"], process.env.LOCATION || "parc-lafontaine"),
    zone: getFirst(row, ["zone", "Zone"], process.env.ZONE || "zone-banc-central"),
    date,
    dayOfWeek: getFirst(row, ["dayOfWeek", "Jour", "Day"], ""),
    startTime,
    endTime: getFirst(row, ["endTime", "End time", "Heure fin"], ""),
    duration: getFirst(row, ["duration", "Duree", "Durée"], "20min"),
    weather: getFirst(row, ["weather", "Meteo", "Météo"], ""),
    approximateTemperature: numberFrom(getFirst(row, ["approximateTemperature", "Temperature", "Température"]), undefined),
    phonePosition: getFirst(row, ["phonePosition", "Position telephone", "Position téléphone"], ""),
    appUsed: getFirst(row, ["appUsed", "Application"], "Phyphox"),
    collectedDataType: getFirst(row, ["collectedDataType", "Type donnees", "Type données"], "Sound pressure level (dB)"),
    timestamp,
    observationTimeLabel,
    peopleCount: numberFrom(getFirst(row, ["peopleCount", "People count", "Nombre personnes"], "0"), 0),
    crowdLevel: normalizeCrowdLevel(getFirst(row, ["crowdLevel", "Crowd level", "Achalandage"], "faible")),
    mainNoiseSources: getFirst(row, ["mainNoiseSources", "Noise sources", "Sources bruit"], ""),
    humanSourceProximity,
    proximity: normalizeProximity(getFirst(row, ["proximity", "Proximite", "Proximité"], humanSourceProximity)),
    vibe: normalizeVibe(getFirst(row, ["vibe", "Ambiance"], "calme")),
    perceivedNoiseLevel: getFirst(row, ["perceivedNoiseLevel", "Niveau percu", "Niveau perçu"], ""),
    specialEvent: getFirst(row, ["specialEvent", "Evenement", "Événement"], ""),
    notes: getFirst(row, ["notes", "Notes"], ""),
    technicalProblems: getFirst(row, ["technicalProblems", "Problemes techniques", "Problèmes techniques"], "")
  };
}

function buildTimestamp(date, startTime, observationTimeLabel) {
  const minutes = numberFrom(String(observationTimeLabel).replace("min", ""), 0);
  const timestamp = new Date(`${date}T${startTime}:00`);
  timestamp.setMinutes(timestamp.getMinutes() + minutes);
  return timestamp.toISOString();
}

function normalizeCrowdLevel(value) {
  const normalized = String(value).toLowerCase();
  if (["elevee", "eleve", "élevée", "élevé", "high"].includes(normalized)) return "elevee";
  if (["moyenne", "medium"].includes(normalized)) return "moyenne";
  return "faible";
}

function normalizeProximity(value) {
  const normalized = String(value).toLowerCase();
  if (["proche", "near"].includes(normalized)) return "proche";
  if (["loin", "far"].includes(normalized)) return "loin";
  return "moyenne";
}

function normalizeVibe(value) {
  const normalized = String(value).toLowerCase();
  if (["bruyante", "bruyant"].includes(normalized)) return "bruyante";
  if (["animee", "animée", "anime"].includes(normalized)) return "animee";
  if (["moderee", "modérée", "modere"].includes(normalized)) return "moderee";
  return "calme";
}

function discoverInputFiles() {
  const configuredFile = process.env.MANUAL_FILE;
  if (configuredFile) return [resolveProjectPath(configuredFile)];

  const dataDir = resolveProjectPath("data/manual");
  if (!fs.existsSync(dataDir)) return [];

  return fs
    .readdirSync(dataDir)
    .filter((file) => /^session.+\.(csv|tsv|txt)$/i.test(file))
    .map((file) => path.join(dataDir, file));
}

async function main() {
  const apiBaseUrl = requiredEnv("API_BASE_URL").replace(/\/$/, "");
  const apiKey = requiredEnv("DEVICE_API_KEY");
  const files = discoverInputFiles();

  let imported = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const rows = readTabularFile(file);
      for (const row of rows) {
        const observation = toObservation(row);
        await postJson(`${apiBaseUrl}/observations`, observation, apiKey);
        imported += 1;
      }
    } catch (error) {
      errors += 1;
      console.error(`${file}: ${error.message}`);
    }
  }

  console.log(`Fichiers lus: ${files.length}`);
  console.log(`Observations importees: ${imported}`);
  console.log(`Erreurs: ${errors}`);

  if (errors > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildTimestamp,
  normalizeCrowdLevel,
  normalizeProximity,
  normalizeVibe,
  toObservation
};
