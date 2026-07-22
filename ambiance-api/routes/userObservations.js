const express = require("express");
const Observation = require("../models/Observation");
const userAuth = require("../middleware/userAuth");
const { locationExists, normalizeLocation } = require("../lib/locations");

const router = express.Router();

const ALLOWED_FIELDS = [
  "location",
  "zone",
  "timestamp",
  "peopleCount",
  "crowdLevel",
  "mainNoiseSources",
  "proximity",
  "vibe",
  "perceivedNoiseLevel",
  "specialEvent",
  "notes"
];

router.post("/", userAuth, async (req, res) => {
  try {
    if (req.body.author !== undefined) {
      return res.status(400).json({
        error: "AUTHOR_NOT_ALLOWED",
        message: "L’auteur est déterminé par la session."
      });
    }

    const data = Object.fromEntries(
      ALLOWED_FIELDS
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]])
    );

    if (
      !data.location ||
      !data.zone ||
      !data.timestamp ||
      data.peopleCount === undefined ||
      !data.crowdLevel ||
      !data.proximity ||
      !data.vibe
    ) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Tous les champs obligatoires de l’observation doivent être fournis."
      });
    }

    if (typeof data.peopleCount !== "number" || data.peopleCount < 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "peopleCount doit être un nombre positif ou nul."
      });
    }

    const timestamp = new Date(data.timestamp);

    if (Number.isNaN(timestamp.getTime())) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "timestamp doit être une date valide."
      });
    }

    if (timestamp.getTime() > Date.now()) {
      return res.status(400).json({
        error: "FUTURE_TIMESTAMP",
        message: "La date et l’heure de l’observation ne peuvent pas être dans le futur."
      });
    }

    data.location = normalizeLocation(data.location);
    const exists = await locationExists(data.location);

    if (!exists) {
      return res.status(404).json({
        error: "LOCATION_NOT_FOUND",
        message: "Ce lieu n’existe pas."
      });
    }

    const observation = await Observation.create({
      ...data,
      timestamp,
      author: req.user._id || req.user.id
    });

    return res.status(201).json({
      message: "Observation ajoutée à vos contributions.",
      data: observation
    });
  } catch (error) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: error.message
    });
  }
});

router.get("/mine", userAuth, async (req, res) => {
  try {
    const observations = await Observation.find({
      author: req.user._id || req.user.id
    }).sort({ timestamp: -1 });

    return res.status(200).json({
      count: observations.length,
      data: observations
    });
  } catch (error) {
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

module.exports = router;
