require("dotenv").config();

const mongoose = require("mongoose");

const Device = require("../models/Device");
const Location = require("../models/Location");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { config, validateRuntimeConfig } = require("../config");

const DEMO_API_KEY = process.env.SEED_API_KEY || "api_key_demo_lafontaine";

const LOCATIONS = [
  {
    slug: "parc-lafontaine",
    name: "Parc La Fontaine",
    description: "Lieu principal de collecte de la phase 1.",
    defaultZone: "zone-banc-central",
    latitude: 45.5276,
    longitude: -73.5704
  },
  {
    slug: "parc-jeanne-mance",
    name: "Parc Jeanne-Mance",
    description: "Lieu ajouté pour tester la carte de la phase 2.",
    defaultZone: "zone-gazon",
    latitude: 45.5142,
    longitude: -73.5856
  },
  {
    slug: "parc-maisonneuve",
    name: "Parc Maisonneuve",
    description: "Lieu ajouté pour comparer plusieurs ambiances.",
    defaultZone: "zone-entree",
    latitude: 45.5599,
    longitude: -73.5578
  }
];

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function seed() {
  validateRuntimeConfig();

  await mongoose.connect(config.mongodbUri);

  // 1. Ajouter ou mettre à jour les lieux avec coordonnées
  await Location.bulkWrite(
    LOCATIONS.map((location) => ({
      updateOne: {
        filter: { slug: location.slug },
        update: { $set: location },
        upsert: true
      }
    }))
  );

  // 2. Créer un device de démonstration
  const device = await Device.findOneAndUpdate(
    { apiKey: DEMO_API_KEY },
    {
      name: "Telephone Phyphox demo",
      location: "parc-lafontaine",
      zone: "zone-banc-central",
      apiKey: DEMO_API_KEY
    },
    { new: true, upsert: true }
  );

  // 3. Ajouter des mesures pour les 3 lieux
  const measurements = LOCATIONS.flatMap((location, locationIndex) => {
    const baseValues = [0.18, 0.22, 0.35, 0.48, 0.30, 0.24];

    return baseValues.map((value, index) => ({
      type: "audio_amplitude",
      location: location.slug,
      zone: location.defaultZone,
      value: Math.min(0.95, value + locationIndex * 0.15),
      timestamp: hoursAgo(5 - index * 0.8)
    }));
  });

  // 4. Ajouter des observations pour les 3 lieux
  const observations = [
    {
      location: "parc-lafontaine",
      zone: "zone-banc-central",
      timestamp: hoursAgo(2),
      sessionNo: "seed-1",
      date: new Date().toISOString().slice(0, 10),
      dayOfWeek: "demo",
      startTime: "12:00",
      endTime: "12:20",
      duration: "20min",
      weather: "ensoleille",
      approximateTemperature: 22,
      phonePosition: "sur un banc",
      appUsed: "Phyphox",
      collectedDataType: "Sound pressure level (dB)",
      observationTimeLabel: "20min",
      peopleCount: 6,
      crowdLevel: "faible",
      mainNoiseSources: "vent leger, quelques passants",
      humanSourceProximity: "loin",
      proximity: "loin",
      vibe: "calme",
      perceivedNoiseLevel: "calme",
      specialEvent: "",
      notes: "Zone plutôt tranquille."
    },
    {
      location: "parc-jeanne-mance",
      zone: "zone-gazon",
      timestamp: hoursAgo(1.5),
      sessionNo: "seed-2",
      date: new Date().toISOString().slice(0, 10),
      dayOfWeek: "demo",
      startTime: "14:00",
      endTime: "14:20",
      duration: "20min",
      weather: "ensoleille",
      approximateTemperature: 24,
      phonePosition: "sur un banc",
      appUsed: "Phyphox",
      collectedDataType: "Sound pressure level (dB)",
      observationTimeLabel: "20min",
      peopleCount: 18,
      crowdLevel: "moyenne",
      mainNoiseSources: "conversations, velos, passants",
      humanSourceProximity: "moyenne",
      proximity: "moyenne",
      vibe: "moderee",
      perceivedNoiseLevel: "modere",
      specialEvent: "",
      notes: "Ambiance modérée avec plusieurs personnes dans la zone."
    },
    {
      location: "parc-maisonneuve",
      zone: "zone-entree",
      timestamp: hoursAgo(1),
      sessionNo: "seed-3",
      date: new Date().toISOString().slice(0, 10),
      dayOfWeek: "demo",
      startTime: "16:00",
      endTime: "16:20",
      duration: "20min",
      weather: "nuageux",
      approximateTemperature: 21,
      phonePosition: "près de l’entrée",
      appUsed: "Phyphox",
      collectedDataType: "Sound pressure level (dB)",
      observationTimeLabel: "20min",
      peopleCount: 32,
      crowdLevel: "elevee",
      mainNoiseSources: "enfants, conversations, circulation proche",
      humanSourceProximity: "proche",
      proximity: "proche",
      vibe: "animee",
      perceivedNoiseLevel: "anime",
      specialEvent: "",
      notes: "Zone plus animée avec beaucoup de passage."
    }
  ];

  await Measurement.insertMany(measurements);
  await Observation.insertMany(observations);

  console.log("Donnees de demonstration inserees.");
  console.log(`Device: ${device._id}`);
  console.log(`API key demo: ${DEMO_API_KEY}`);
  console.log(`Lieux ajoutes: ${LOCATIONS.length}`);
  console.log(`Mesures ajoutees: ${measurements.length}`);
  console.log(`Observations ajoutees: ${observations.length}`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Erreur seed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
