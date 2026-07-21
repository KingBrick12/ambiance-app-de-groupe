const express = require("express");
const Location = require("../models/Location");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { average, classifyNoise, scalePayload } = require("../lib/ambianceLogic");

const router = express.Router();
const FRESHNESS_THRESHOLD_MINUTES = 30;
const FRESHNESS_THRESHOLD_MS = FRESHNESS_THRESHOLD_MINUTES * 60 * 1000;

function classificationMessage(classification) {
  return classification
    ? `Le lieu est actuellement ${classification.label.toLowerCase()}.`
    : "Aucune classification n'est disponible.";
}

router.get("/", async (req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 }).lean();
    const now = Date.now();
    const recentSince = new Date(now - FRESHNESS_THRESHOLD_MS);

    const data = await Promise.all(
      locations.map(async (location) => {
        const latestMeasurement = await Measurement.findOne({ location: location.slug })
          .sort({ timestamp: -1 })
          .lean();

        const recentMeasurements = await Measurement.find({
          location: location.slug,
          timestamp: { $gte: recentSince }
        }).lean();

        const lastObservation = await Observation.findOne({ location: location.slug })
          .sort({ timestamp: -1 })
          .lean();

        const measuredAt = latestMeasurement?.timestamp || null;
        const ageMinutes = measuredAt
          ? Math.max(0, Math.floor((now - new Date(measuredAt).getTime()) / 60000))
          : null;
        const isRecent = recentMeasurements.length > 0;
        const status = isRecent ? "recent" : latestMeasurement ? "stale" : "empty";
        const averageNoise = isRecent
          ? average(recentMeasurements.map((measurement) => measurement.value))
          : null;
        const classification = classifyNoise(averageNoise);

        let message = "Aucune mesure n'est disponible pour ce lieu.";
        if (status === "stale") {
          message = "La dernière mesure disponible n'est plus récente.";
        } else if (status === "recent") {
          message = classificationMessage(classification);
        }

        return {
          slug: location.slug,
          name: location.name,
          description: location.description || "Aucune description disponible.",
          defaultZone: location.defaultZone || null,
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          currentAmbiance: {
            status,
            classification,
            averageNoise: averageNoise === null ? null : Number(averageNoise.toFixed(2)),
            vibe: lastObservation?.vibe || "inconnue",
            measuredAt,
            freshness: {
              isRecent,
              thresholdMinutes: FRESHNESS_THRESHOLD_MINUTES,
              ageMinutes
            },
            message
          },
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

    return res.status(200).json({
      data: {
        slug: location.slug,
        name: location.name,
        description: location.description || "Aucune description disponible.",
        defaultZone: location.defaultZone || null,
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
