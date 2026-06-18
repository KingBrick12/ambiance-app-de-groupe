require("dotenv").config();

const readline = require("readline");
const {
  numberFrom,
  postJson,
  requiredEnv
} = require("./lib/io");
const {
  normalizeCrowdLevel,
  normalizeProximity,
  normalizeVibe
} = require("./importManualObservations");

const OBSERVATION_LABELS = ["0min", "5min", "10min", "15min", "20min"];

function askInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function question(rl, label, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${label}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function buildTimestamp(date, startTime, observationTimeLabel) {
  const minutes = numberFrom(String(observationTimeLabel).replace("min", ""), 0);
  const timestamp = new Date(`${date}T${startTime}:00`);
  timestamp.setMinutes(timestamp.getMinutes() + minutes);
  return timestamp.toISOString();
}

async function collectSession(rl) {
  const today = new Date().toISOString().slice(0, 10);
  const session = {
    sessionNo: await question(rl, "sessionNo", "1"),
    location: await question(rl, "location", process.env.LOCATION || "parc-lafontaine"),
    zone: await question(rl, "zone", process.env.ZONE || "zone-banc-central"),
    date: await question(rl, "date", today),
    dayOfWeek: await question(rl, "dayOfWeek", ""),
    startTime: await question(rl, "startTime (HH:MM)", "12:00"),
    endTime: await question(rl, "endTime (HH:MM)", "12:20"),
    duration: await question(rl, "duration", "20min"),
    weather: await question(rl, "weather", ""),
    approximateTemperature: numberFrom(await question(rl, "approximateTemperature", ""), undefined),
    phonePosition: await question(rl, "phonePosition", ""),
    appUsed: await question(rl, "appUsed", "Phyphox"),
    collectedDataType: await question(rl, "collectedDataType", "Sound pressure level (dB)")
  };

  const observations = [];

  for (const label of OBSERVATION_LABELS) {
    const shouldEnter = await question(rl, `Ajouter observation ${label}? (y/n)`, "y");
    if (shouldEnter.toLowerCase() !== "y") continue;

    const observation = {
      ...session,
      timestamp: buildTimestamp(session.date, session.startTime, label),
      observationTimeLabel: label,
      peopleCount: numberFrom(await question(rl, `${label} peopleCount`, "0"), 0),
      crowdLevel: normalizeCrowdLevel(await question(rl, `${label} crowdLevel`, "faible")),
      mainNoiseSources: await question(rl, `${label} mainNoiseSources`, ""),
      humanSourceProximity: await question(rl, `${label} humanSourceProximity`, "moyenne"),
      proximity: normalizeProximity(await question(rl, `${label} proximity`, "moyenne")),
      vibe: normalizeVibe(await question(rl, `${label} vibe`, "calme")),
      perceivedNoiseLevel: await question(rl, `${label} perceivedNoiseLevel`, "calme"),
      specialEvent: await question(rl, `${label} specialEvent`, ""),
      notes: await question(rl, `${label} notes`, ""),
      technicalProblems: await question(rl, `${label} technicalProblems`, "")
    };

    observations.push(observation);
  }

  return observations;
}

async function main() {
  const apiBaseUrl = requiredEnv("API_BASE_URL").replace(/\/$/, "");
  const apiKey = requiredEnv("DEVICE_API_KEY");
  const rl = askInterface();

  try {
    const observations = await collectSession(rl);
    let sent = 0;

    for (const observation of observations) {
      await postJson(`${apiBaseUrl}/observations`, observation, apiKey);
      sent += 1;
    }

    console.log(`Observations envoyees: ${sent}`);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildTimestamp,
  collectSession
};
