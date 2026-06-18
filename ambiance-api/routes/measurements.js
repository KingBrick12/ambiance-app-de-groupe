const express = require("express");
const router = express.Router();

const Measurement = require("../models/Measurement");
const apiKeyAuth = require("../middleware/apiKeyAuth");

// POST /measurements
router.post("/", apiKeyAuth, async (req, res) => {
  try {
    const { type, value, location, zone, timestamp } = req.body;

    if (!type || value === undefined || !location || !zone || !timestamp) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Champs obligatoires manquants."
      });
    }

    if (typeof value !== "number") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Le champ value doit etre un nombre."
      });
    }

    const measurement = await Measurement.create({
      type,
      value,
      location,
      zone,
      timestamp
    });

    res.status(201).json({
      message: "Mesure creee avec succes.",
      data: measurement
    });
  } catch (error) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: error.message
    });
  }
});

// GET /measurements
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.location) filter.location = req.query.location;
    if (req.query.zone) filter.zone = req.query.zone;
    if (req.query.type) filter.type = req.query.type;

    if (req.query.from || req.query.to) {
      filter.timestamp = {};

      if (req.query.from) {
        filter.timestamp.$gte = new Date(req.query.from);
      }

      if (req.query.to) {
        filter.timestamp.$lte = new Date(req.query.to);
      }
    }

    const measurements = await Measurement.find(filter).sort({ timestamp: -1 });

    res.status(200).json({
      count: measurements.length,
      data: measurements
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

module.exports = router;
