const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");

async function listLocations() {
  const [measured, observed] = await Promise.all([
    Measurement.distinct("location"),
    Observation.distinct("location")
  ]);
  return [...new Set([...measured, ...observed])].filter(Boolean).sort();
}

async function locationExists(location) {
  if (!location) return false;
  const [measurement, observation] = await Promise.all([
    Measurement.exists({ location }), Observation.exists({ location })
  ]);
  return Boolean(measurement || observation);
}

module.exports = { listLocations, locationExists };
