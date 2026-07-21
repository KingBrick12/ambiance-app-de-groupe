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

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function todayAsString() {
  return new Date().toISOString().slice(0, 10);
}

async function seed() {
  validateRuntimeConfig();
  await mongoose.connect(config.mongodbUri);

  try {
    await Location.bulkWrite(
      LOCATIONS.map((location) => ({
        updateOne: {
          filter: { slug: location.slug },
          update: { $set: location },
          upsert: true
        }
      }))
    );

    const device = await Device.findOneAndUpdate(
      { apiKey: DEMO_API_KEY },
      {
        $set: {
          name: "Téléphone Phyphox de démonstration",
          location: "parc-lafontaine",
          zone: "zone-banc-central",
          apiKey: DEMO_API_KEY
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    /*
     * On retire seulement les anciennes données de démonstration afin que
     * le script puisse être relancé sans créer de doublons.
     */
    await Measurement.deleteMany({
      location: { $in: LOCATIONS.map((location) => location.slug) },
      type: "audio_amplitude"
    });

    await Observation.deleteMany({
      sessionNo: { $in: ["seed-1", "seed-2", "seed-3"] }
    });

    /*
     * Parc La Fontaine : mesures récentes, ambiance calme.
     * Parc Jeanne-Mance : mesures récentes, ambiance modérée.
     * Parc Maisonneuve : mesures anciennes, état « stale » sur la carte.
     */
    const measurements = [
      {
        type: "audio_amplitude",
        location: "parc-lafontaine",
        zone: "zone-banc-central",
        value: 0.18,
        timestamp: minutesAgo(25)
      },
      {
        type: "audio_amplitude",
        location: "parc-lafontaine",
        zone: "zone-banc-central",
        value: 0.21,
        timestamp: minutesAgo(15)
      },
      {
        type: "audio_amplitude",
        location: "parc-lafontaine",
        zone: "zone-banc-central",
        value: 0.23,
        timestamp: minutesAgo(5)
      },
      {
        type: "audio_amplitude",
        location: "parc-jeanne-mance",
        zone: "zone-gazon",
        value: 0.34,
        timestamp: minutesAgo(28)
      },
      {
        type: "audio_amplitude",
        location: "parc-jeanne-mance",
        zone: "zone-gazon",
        value: 0.39,
        timestamp: minutesAgo(18)
      },
      {
        type: "audio_amplitude",
        location: "parc-jeanne-mance",
        zone: "zone-gazon",
        value: 0.43,
        timestamp: minutesAgo(8)
      },
      {
        type: "audio_amplitude",
        location: "parc-maisonneuve",
        zone: "zone-entree",
        value: 0.58,
        timestamp: hoursAgo(3)
      },
      {
        type: "audio_amplitude",
        location: "parc-maisonneuve",
        zone: "zone-entree",
        value: 0.63,
        timestamp: hoursAgo(2)
      }
    ];

    const observations = [
      {
        location: "parc-lafontaine",
        zone: "zone-banc-central",
        timestamp: minutesAgo(10),
        sessionNo: "seed-1",
        date: todayAsString(),
        dayOfWeek: "demo",
        startTime: "12:00",
        endTime: "12:20",
        duration: "20min",
        weather: "ensoleillé",
        approximateTemperature: 22,
        phonePosition: "sur un banc",
        appUsed: "Phyphox",
        collectedDataType: "Amplitude sonore",
        observationTimeLabel: "20min",
        peopleCount: 6,
        crowdLevel: "faible",
        mainNoiseSources: "vent léger et quelques passants",
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
        timestamp: minutesAgo(12),
        sessionNo: "seed-2",
        date: todayAsString(),
        dayOfWeek: "demo",
        startTime: "14:00",
        endTime: "14:20",
        duration: "20min",
        weather: "ensoleillé",
        approximateTemperature: 24,
        phonePosition: "sur un banc",
        appUsed: "Phyphox",
        collectedDataType: "Amplitude sonore",
        observationTimeLabel: "20min",
        peopleCount: 18,
        crowdLevel: "moyenne",
        mainNoiseSources: "conversations, vélos et passants",
        humanSourceProximity: "moyenne",
        proximity: "moyenne",
        vibe: "moderee",
        perceivedNoiseLevel: "modéré",
        specialEvent: "",
        notes: "Ambiance modérée avec plusieurs personnes dans la zone."
      },
      {
        location: "parc-maisonneuve",
        zone: "zone-entree",
        timestamp: hoursAgo(2),
        sessionNo: "seed-3",
        date: todayAsString(),
        dayOfWeek: "demo",
        startTime: "16:00",
        endTime: "16:20",
        duration: "20min",
        weather: "nuageux",
        approximateTemperature: 21,
        phonePosition: "près de l’entrée",
        appUsed: "Phyphox",
        collectedDataType: "Amplitude sonore",
        observationTimeLabel: "20min",
        peopleCount: 32,
        crowdLevel: "elevee",
        mainNoiseSources: "enfants, conversations et circulation proche",
        humanSourceProximity: "proche",
        proximity: "proche",
        vibe: "animee",
        perceivedNoiseLevel: "animé",
        specialEvent: "",
        notes: "Zone plus animée avec beaucoup de passage."
      }
    ];

    await Measurement.insertMany(measurements);
    await Observation.insertMany(observations);

    console.log("Données de démonstration insérées avec succès.");
    console.log(`Device : ${device._id}`);
    console.log(`Clé API de démonstration : ${DEMO_API_KEY}`);
    console.log(`Lieux ajoutés ou mis à jour : ${LOCATIONS.length}`);
    console.log(`Mesures ajoutées : ${measurements.length}`);
    console.log(`Observations ajoutées : ${observations.length}`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error("Erreur lors de l'exécution du seed :", error);
  process.exit(1);
});
