const express = require("express");
const router = express.Router();

const Observation = require("../models/Observation");
const apiKeyAuth = require("../middleware/apiKeyAuth");

// POST /observations
// Ajouter une observation manuelle
router.post("/", apiKeyAuth, async (req, res) => {
  try {
    const {
      location,
      zone,
      timestamp,
      peopleCount,
      crowdLevel,
      proximity,
      vibe,
      notes
    } = req.body;

    if (
      !location ||
      !zone ||
      !timestamp ||
      peopleCount === undefined ||
      !crowdLevel ||
      !proximity ||
      !vibe
    ) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Champs obligatoires manquants."
      });
    }

    if (typeof peopleCount !== "number") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "peopleCount doit être un nombre."
      });
    }

    const observation = await Observation.create({
      location,
      zone,
      timestamp,
      peopleCount,
      crowdLevel,
      proximity,
      vibe,
      notes
    });

    res.status(201).json({
      message: "Observation créée avec succès.",
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
// Consulter les observations
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.location) filter.location = req.query.location;
    if (req.query.zone) filter.zone = req.query.zone;
    if (req.query.vibe) filter.vibe = req.query.vibe;

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

module.exports = router;