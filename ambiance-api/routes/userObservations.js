const express = require("express");
const Observation = require("../models/Observation");
const userAuth = require("../middleware/userAuth");
const { locationExists, normalizeLocation } = require("../lib/locations");
const { validateObservationPayload } = require("../lib/observationService");

const router = express.Router();

router.post("/", userAuth, async (req, res) => {
  try {
    const validation = validateObservationPayload(req.body);

    if (!validation.ok) {
      return res.status(validation.status).json({
        error: validation.error,
        message: validation.message
      });
    }

    const data = validation.data;
    data.location = normalizeLocation(data.location);

    if (!(await locationExists(data.location))) {
      return res.status(404).json({
        error: "LOCATION_NOT_FOUND",
        message: "Ce lieu n’existe pas."
      });
    }

    const observation = await Observation.create({
      ...data,
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
