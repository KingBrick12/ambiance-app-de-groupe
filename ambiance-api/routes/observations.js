const express = require("express");
const router = express.Router();

const Observation = require("../models/Observation");
const apiKeyAuth = require("../middleware/apiKeyAuth");
const { invalidatePublicCache } = require("../middleware/responseCache");

const OBSERVATION_FIELDS = [
  "sessionNo",
  "location",
  "zone",
  "date",
  "dayOfWeek",
  "startTime",
  "endTime",
  "duration",
  "weather",
  "approximateTemperature",
  "phonePosition",
  "appUsed",
  "collectedDataType",
  "timestamp",
  "observationTimeLabel",
  "peopleCount",
  "crowdLevel",
  "mainNoiseSources",
  "humanSourceProximity",
  "proximity",
  "vibe",
  "perceivedNoiseLevel",
  "specialEvent",
  "notes",
  "technicalProblems"
];

// POST /observations
router.post("/", apiKeyAuth, async (req, res) => {
  try {
    const payload = pickObservationFields(req.body);

    if (!payload.proximity && payload.humanSourceProximity) {
      payload.proximity = payload.humanSourceProximity;
    }

    if (
      !payload.location ||
      !payload.zone ||
      !payload.timestamp ||
      payload.peopleCount === undefined ||
      !payload.crowdLevel ||
      !payload.proximity ||
      !payload.vibe
    ) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Champs obligatoires manquants."
      });
    }

    if (typeof payload.peopleCount !== "number") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "peopleCount doit etre un nombre."
      });
    }

    const observation = await Observation.create(payload);

    invalidatePublicCache(observation.location);

    res.status(201).json({
      message: "Observation creee avec succes.",
      data: observation
    });
  } catch (error) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: error.message
    });
  }
});

// GET /observations
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.location) filter.location = req.query.location;
    if (req.query.zone) filter.zone = req.query.zone;
    if (req.query.vibe) filter.vibe = req.query.vibe;
    if (req.query.sessionNo) filter.sessionNo = req.query.sessionNo;

    if (req.query.from || req.query.to) {
      filter.timestamp = {};

      if (req.query.from) {
        filter.timestamp.$gte = new Date(req.query.from);
      }

      if (req.query.to) {
        filter.timestamp.$lte = new Date(req.query.to);
      }
    }

    const observations = await Observation.find(filter).sort({ timestamp: -1 });

    res.status(200).json({
      count: observations.length,
      data: observations
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

function pickObservationFields(body) {
  return OBSERVATION_FIELDS.reduce((payload, field) => {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
    return payload;
  }, {});
}

module.exports = router;
