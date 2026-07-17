const express = require("express");
const Location = require("../models/Location");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { classifyNoise, scalePayload } = require("../lib/ambianceLogic");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 });

    const data = await Promise.all(locations.map(async (location) => {
      const since = new Date(Date.now() - 30 * 60 * 1000);

      const measurements = await Measurement.find({
        location: location.slug,
        timestamp: { $gte: since }
      });

      let averageNoise = null;
      let classification = "inconnue";

      if (measurements.length > 0) {
        averageNoise =
          measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length;
        classification = classifyNoise(averageNoise);
      }

      const lastObservation = await Observation.findOne({
        location: location.slug
      }).sort({ timestamp: -1 });

      return {
        slug: location.slug,
        name: location.name,
        description: location.description,
        defaultZone: location.defaultZone,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        ambiance: {
          classification,
          averageNoise: averageNoise === null ? null : Number(averageNoise.toFixed(2)),
          vibe: lastObservation ? lastObservation.vibe : "inconnue",
          isFresh: measurements.length > 0,
          freshnessMinutes: 30,
          message: measurements.length > 0
            ? `Le lieu est actuellement ${classification}.`
            : "Aucune mesure récente pour ce lieu."
        },
        scale: scalePayload()
      };
    }));

    res.json({ data, meta: { count: data.length } });
  } catch (error) {
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur." });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const location = await Location.findOne({ slug: req.params.slug });

    if (!location) {
      return res.status(404).json({
        error: "LOCATION_NOT_FOUND",
        message: "Lieu introuvable."
      });
    }

    res.json({ data: location });
  } catch (error) {
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur." });
  }
});

module.exports = router;
