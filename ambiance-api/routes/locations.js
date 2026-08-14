const express = require("express");
const Location = require("../models/Location");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { scalePayload } = require("../lib/ambianceLogic");
const {
  FRESHNESS_THRESHOLD_MINUTES,
  buildCurrentAmbiance
} = require("../lib/ambianceService");

const router = express.Router();
const FRESHNESS_THRESHOLD_MS = FRESHNESS_THRESHOLD_MINUTES * 60 * 1000;

router.get("/", async (req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 }).lean();
    const now = Date.now();
    const recentSince = new Date(now - FRESHNESS_THRESHOLD_MS);

    const data = await Promise.all(
      locations.map(async (location) => {
        const [latestMeasurement, recentMeasurements, lastObservation, sessionIds] = await Promise.all([
          Measurement.findOne({ location: location.slug }).sort({ timestamp: -1 }).lean(),
          Measurement.find({ location: location.slug, timestamp: { $gte: recentSince } }).lean(),
          Observation.findOne({ location: location.slug }).sort({ timestamp: -1 }).lean(),
          Measurement.distinct("sessionId", { location: location.slug, sessionId: { $exists: true } })
        ]);

        return {
          slug: location.slug,
          name: location.name,
          description: location.description || "Aucune description disponible.",
          defaultZone: location.defaultZone || null,
          sessionCount: sessionIds.length,
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          currentAmbiance: buildCurrentAmbiance({
            latestMeasurement,
            recentMeasurements,
            lastObservation,
            now
          }),
          scale: scalePayload()
        };
      })
    );

    return res.status(200).json({
      data,
      meta: {
        count: data.length,
        freshnessThresholdMinutes: FRESHNESS_THRESHOLD_MINUTES,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Erreur GET /locations :", error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Une erreur est survenue pendant la récupération des lieux."
    });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const location = await Location.findOne({ slug: req.params.slug }).lean();
    if (!location) {
      return res.status(404).json({
        error: "LOCATION_NOT_FOUND",
        message: "Lieu introuvable."
      });
    }

    const sessionIds = await Measurement.distinct("sessionId", {
      location: location.slug,
      sessionId: { $exists: true }
    });

    return res.status(200).json({
      data: {
        slug: location.slug,
        name: location.name,
        description: location.description || "Aucune description disponible.",
        defaultZone: location.defaultZone || null,
        sessionCount: sessionIds.length,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }
    });
  } catch (error) {
    console.error("Erreur GET /locations/:slug :", error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Une erreur est survenue pendant la récupération du lieu."
    });
  }
});

module.exports = router;
