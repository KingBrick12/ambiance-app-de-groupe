require("dotenv").config();

const { normalizeNoiseValue } = require("../bridge/phyphoxBridge");
const {
  getFirst,
  numberFrom,
  postJson,
  readTabularFile,
  requiredEnv
} = require("./lib/io");

function rowToMeasurement(row, startDate) {
  const timeSeconds = numberFrom(
    getFirst(row, ["Time (s)", "Durée(s)", "Duree(s)", "Time", "t"], "0"),
    0
  );
  const db = numberFrom(
    getFirst(row, ["Sound pressure level (dB)", "SPL(dB)", "SPL (dB)", "dB"]),
    NaN
  );

  if (!Number.isFinite(db)) {
    throw new Error("Colonne dB manquante ou invalide.");
  }

  return {
    type: process.env.MEASUREMENT_TYPE || "audio_amplitude",
    value: normalizeNoiseValue(db),
    location: process.env.LOCATION || "parc-lafontaine",
    zone: process.env.ZONE || "zone-banc-central",
    timestamp: new Date(startDate.getTime() + timeSeconds * 1000).toISOString()
  };
}

async function main() {
  const csvFile = requiredEnv("CSV_FILE");
  const apiBaseUrl = requiredEnv("API_BASE_URL").replace(/\/$/, "");
  const apiKey = requiredEnv("DEVICE_API_KEY");
  const rows = readTabularFile(csvFile);
  const startDate = new Date();

  let sent = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const measurement = rowToMeasurement(row, startDate);
      await postJson(`${apiBaseUrl}/measurements`, measurement, apiKey);
      sent += 1;
    } catch (error) {
      errors += 1;
      console.error(`Erreur ligne ${sent + errors}: ${error.message}`);
    }
  }

  console.log(`Lignes lues: ${rows.length}`);
  console.log(`Mesures envoyees: ${sent}`);
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
  rowToMeasurement
};
