const Location = require("../models/Location");

const LOCATION_ALIASES = {
  "parc-lafontaine": "parc-lafontaine",
  "parc-la-fontaine": "parc-lafontaine",
  "parc_lafontaine": "parc-lafontaine",
  "lafontaine": "parc-lafontaine",
  "parc-jean-mance": "parc-jean-mance",
  "parc-jeanne-mance": "parc-jean-mance",
  "parc_jean_mance": "parc-jean-mance",
  "jean-mance": "parc-jean-mance",
  "parc-maisonneuve": "parc-maisonneuve",
  "parc_maisonneuve": "parc-maisonneuve",
  "maisonneuve": "parc-maisonneuve"
};

function normalizeLocation(value) {
  if (!value) return "";
  const key = String(value).trim().toLowerCase().replace(/\s+/g, "-");
  return LOCATION_ALIASES[key] || key;
}

function locationAliases(location) {
  const canonical = normalizeLocation(location);
  return Object.entries(LOCATION_ALIASES).filter(([, value]) => value === canonical).map(([alias]) => alias);
}

async function listLocations() {
  const locations = await Location.find().sort({ name: 1 }).select("slug -_id").lean();
  return locations.map(({ slug }) => slug);
}

async function locationExists(location) {
  return Boolean(await Location.exists({ slug: normalizeLocation(location) }));
}

module.exports = { LOCATION_ALIASES, listLocations, locationAliases, locationExists, normalizeLocation };
