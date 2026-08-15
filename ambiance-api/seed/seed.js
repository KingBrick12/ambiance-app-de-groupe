require("dotenv").config();

const mongoose = require("mongoose");
const Device = require("../models/Device");
const Location = require("../models/Location");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const User = require("../models/User");
const { loadCollectionData, SESSION_MANIFEST } = require("../lib/collectionCsv");
const { LOCATION_ALIASES, normalizeLocation } = require("../lib/locations");
const { config, validateRuntimeConfig } = require("../config");

const DEMO_API_KEY = process.env.SEED_API_KEY || "api_key_demo_lafontaine";
const LOCATIONS = [
  { slug: "parc-lafontaine", name: "Parc Lafontaine", description: "Six sessions de collecte, dont les trois sessions de la phase 1.", defaultZone: "zone-banc-central", latitude: 45.5276, longitude: -73.5704 },
  { slug: "parc-jean-mance", name: "Parc Jean-Mance", description: "Trois sessions de collecte Phyphox de la phase 2.", defaultZone: "zone-principale", latitude: 45.5142, longitude: -73.5856 },
  { slug: "parc-maisonneuve", name: "Parc Maisonneuve", description: "Trois sessions de collecte Phyphox de la phase 2.", defaultZone: "zone-principale", latitude: 45.5599, longitude: -73.5578 }
];

function recentMeasurements({ now = Date.now(), random = Math.random } = {}) {
  const profiles = { "parc-lafontaine": 0.32, "parc-jean-mance": 0.48, "parc-maisonneuve": 0.62 };
  return LOCATIONS.flatMap((location) => Array.from({ length: 5 }, (_, index) => ({
    type: "audio_amplitude",
    value: Math.max(0, Math.min(1, profiles[location.slug] + (random() - 0.5) * 0.16)),
    location: location.slug,
    zone: location.defaultZone,
    timestamp: new Date(now - index * 5 * 60 * 1000),
    sampleIndex: index,
    importKey: `seed-recent:${location.slug}:${index}`
  })));
}

async function seed() {
  validateRuntimeConfig();
  const imported = loadCollectionData();
  await mongoose.connect(config.mongodbUri);
  try {
    await Location.deleteMany({ slug: "parc-jeanne-mance" });
    await Location.bulkWrite(LOCATIONS.map((location) => ({ updateOne: { filter: { slug: location.slug }, update: { $set: location }, upsert: true } })));
    for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
      if (alias === canonical) continue;
      await Promise.all([
        Measurement.updateMany({ location: alias }, { $set: { location: canonical } }),
        Observation.updateMany({ location: alias }, { $set: { location: canonical } })
      ]);
    }
    const users = await User.find({ favorites: { $exists: true, $ne: [] } });
    for (const user of users) {
      user.favorites = [...new Set(user.favorites.map(normalizeLocation).filter(Boolean))];
      await user.save();
    }
    const device = await Device.findOneAndUpdate(
      { apiKey: DEMO_API_KEY },
      { $set: { name: "Téléphone Phyphox de collecte", location: "parc-lafontaine", zone: "zone-banc-central", apiKey: DEMO_API_KEY } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    const sessionIds = SESSION_MANIFEST.map(({ sessionId }) => sessionId);
    await Measurement.deleteMany({ sessionId: { $in: sessionIds } });
    await Measurement.deleteMany({ importKey: /^seed-recent:/ });
    await Observation.deleteMany({ sessionNo: { $in: sessionIds } });
    await Measurement.insertMany(imported.measurements, { ordered: false });
    const recent = recentMeasurements();
    await Measurement.insertMany(recent);
    await Observation.insertMany(imported.observations);

    const invalidRows = imported.sessions.reduce((sum, item) => sum + item.invalidRows, 0);
    console.log(`Import terminé: ${imported.sessions.length} sessions, ${imported.measurements.length} mesures, ${invalidRows} ligne(s) ignorée(s).`);
    console.log(`Mesures récentes générées: ${recent.length} (moins de 30 minutes).`);
    for (const location of LOCATIONS) {
      const count = imported.sessions.filter(({ session }) => session.location === location.slug).length;
      console.log(`${location.name}: ${count} session(s).`);
    }
    console.log(`Appareil de collecte: ${device._id}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) seed().catch((error) => { console.error(`Erreur seed: ${error.message}`); process.exit(1); });
module.exports = { LOCATIONS, recentMeasurements, seed };
