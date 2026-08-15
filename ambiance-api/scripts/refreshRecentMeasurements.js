require("dotenv").config();

const mongoose = require("mongoose");
const Measurement = require("../models/Measurement");
const { recentMeasurements } = require("../seed/seed");
const { config } = require("../config");

async function refreshRecentMeasurements() {
  if (!config.mongodbUri) {
    throw new Error("La variable MONGODB_URI est obligatoire.");
  }

  await mongoose.connect(config.mongodbUri);
  try {
    const measurements = recentMeasurements();
    const result = await Measurement.bulkWrite(
      measurements.map((measurement) => ({
        updateOne: {
          filter: { importKey: measurement.importKey },
          update: { $set: measurement },
          upsert: true
        }
      }))
    );

    console.log(
      `Mesures de démonstration actualisées: ${measurements.length} ` +
      `(créées: ${result.upsertedCount}, mises à jour: ${result.modifiedCount}).`
    );
    return measurements;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  refreshRecentMeasurements().catch((error) => {
    console.error(`Erreur d'actualisation: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { refreshRecentMeasurements };
