require("dotenv").config();

const mongoose = require("mongoose");

const Device = require("../models/Device");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { config, validateRuntimeConfig } = require("../config");

const DEMO_API_KEY = process.env.SEED_API_KEY || "api_key_demo_lafontaine";
const LOCATION = process.env.SEED_LOCATION || process.env.LOCATION || "parc-lafontaine";
const ZONE = process.env.SEED_ZONE || process.env.ZONE || "zone-banc-central";

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function seed() {
  validateRuntimeConfig();

  await mongoose.connect(config.mongodbUri);

  const device = await Device.findOneAndUpdate(
    { apiKey: DEMO_API_KEY },
    {
      name: "Telephone Phyphox demo",
      location: LOCATION,
      zone: ZONE,
      apiKey: DEMO_API_KEY
    },
    { new: true, upsert: true }
  );

  const measurements = [
    { value: 0.18, timestamp: hoursAgo(5) },
    { value: 0.22, timestamp: hoursAgo(4) },
    { value: 0.35, timestamp: hoursAgo(3) },
    { value: 0.48, timestamp: hoursAgo(2) },
    { value: 0.30, timestamp: hoursAgo(1) },
    { value: 0.24, timestamp: new Date() }
  ].map((item) => ({
    type: "audio_amplitude",
    location: LOCATION,
    zone: ZONE,
    value: item.value,
    timestamp: item.timestamp
  }));

  const observations = [
    {
      location: LOCATION,
      zone: ZONE,
      timestamp: hoursAgo(3),
      sessionNo: "seed-1",
      date: hoursAgo(3).toISOString().slice(0, 10),
      dayOfWeek: "demo",
      startTime: "12:00",
      endTime: "12:20",
      duration: "20min",
      weather: "ensoleille",
      approximateTemperature: 22,
      phonePosition: "sur un banc",
      appUsed: "Phyphox",
      collectedDataType: "Sound pressure level (dB)",
      observationTimeLabel: "0min",
      peopleCount: 12,
      crowdLevel: "moyenne",
      mainNoiseSources: "passants, conversations",
      humanSourceProximity: "moyenne",
      proximity: "moyenne",
      vibe: "moderee",
      perceivedNoiseLevel: "modere",
      specialEvent: "",
      notes: "Passage regulier, ambiance stable."
    },
    {
      location: LOCATION,
      zone: ZONE,
      timestamp: hoursAgo(1),
      sessionNo: "seed-1",
      date: hoursAgo(1).toISOString().slice(0, 10),
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
      mainNoiseSources: "vent leger",
      humanSourceProximity: "loin",
      proximity: "loin",
      vibe: "calme",
      perceivedNoiseLevel: "calme",
      specialEvent: "",
      notes: "Zone plus tranquille en fin de session."
    }
  ];

  await Measurement.insertMany(measurements);
  await Observation.insertMany(observations);

  console.log("Donnees de demonstration inserees.");
  console.log(`Device: ${device._id}`);
  console.log(`API key demo: ${DEMO_API_KEY}`);
  console.log(`Mesures ajoutees: ${measurements.length}`);
  console.log(`Observations ajoutees: ${observations.length}`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Erreur seed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
