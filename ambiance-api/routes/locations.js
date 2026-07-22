const express = require("express");
const Location = require("../models/Location");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { average, classificationFromVibe, classifyNoise, scalePayload } = require("../lib/ambianceLogic");

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
        const [latestMeasurement, recentMeasurements, lastObservation, sessionIds] = await Promise.all([
          Measurement.findOne({ location: location.slug }).sort({ timestamp: -1 }).lean(),
          Measurement.find({ location: location.slug, timestamp: { $gte: recentSince } }).lean(),
          Observation.findOne({ location: location.slug }).sort({ timestamp: -1 }).lean(),
          Measurement.distinct("sessionId", { location: location.slug, sessionId: { $exists: true } })
        ]);

        const measurementTime = latestMeasurement ? new Date(latestMeasurement.timestamp).getTime() : 0;
        const observationTime = lastObservation ? new Date(lastObservation.timestamp).getTime() : 0;
        const observationIsLatest = observationTime >= measurementTime;
        const measuredAt = new Date(Math.max(measurementTime, observationTime) || 0);
        const latestAt = measuredAt.getTime() ? measuredAt : null;
        const ageMinutes = latestAt
          ? Math.max(0, Math.floor((now - measuredAt.getTime()) / 60000))
          : null;
        const isRecent = Boolean(latestAt && latestAt >= recentSince);
        const status = isRecent ? "recent" : latestAt ? "stale" : "empty";
        const averageNoise = isRecent
          ? average(recentMeasurements.map((measurement) => measurement.value))
          : null;
        const classification = isRecent && observationIsLatest
          ? classificationFromVibe(lastObservation?.vibe)
          : classifyNoise(averageNoise);

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
          sessionCount: sessionIds.length,
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          currentAmbiance: {
            status,
            classification,
            averageNoise: averageNoise === null ? null : Number(averageNoise.toFixed(2)),
            vibe: lastObservation?.vibe || "inconnue",
            measuredAt: latestAt,
            source: observationIsLatest ? "observation" : "measurement",
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
