const express = require("express");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { parseLast, scalePayload } = require("../lib/ambianceLogic");
const {
  FRESHNESS_THRESHOLD_MINUTES,
  buildCurrentAmbiance,
  buildHistoryPoints,
  buildQuietSlots,
  quietThresholdPayload
} = require("../lib/ambianceService");

const router = express.Router();

router.get("/:location/current", async (req, res) => {
  try {
    const { location } = req.params;
    const { zone } = req.query;
    const now = Date.now();
    const since = new Date(now - FRESHNESS_THRESHOLD_MINUTES * 60 * 1000);

    const baseFilter = { location };
    if (zone) baseFilter.zone = zone;

    const [latestMeasurement, recentMeasurements, lastObservation] = await Promise.all([
      Measurement.findOne(baseFilter).sort({ timestamp: -1 }).lean(),
      Measurement.find({ ...baseFilter, timestamp: { $gte: since } }).lean(),
      Observation.findOne(baseFilter).sort({ timestamp: -1 }).lean()
    ]);

    const ambiance = buildCurrentAmbiance({
      latestMeasurement,
      recentMeasurements,
      lastObservation,
      now
    });

    return res.status(200).json({
      data: {
        location,
        zone: zone || "toutes",
        ...ambiance,
        scale: scalePayload()
      }
    });
  } catch (error) {
    console.error("Erreur ambiance actuelle :", error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Une erreur est survenue pendant le calcul de l'ambiance actuelle."
    });
  }
});

router.get("/:location/history", async (req, res) => {
  try {
    const { location } = req.params;
    const { zone, last } = req.query;
    const duration = parseLast(last);
    const filter = { location };
    if (duration !== null) filter.timestamp = { $gte: new Date(Date.now() - duration) };
    if (zone) filter.zone = zone;

    const measurements = await Measurement.find(filter).sort({ timestamp: 1 }).lean();
    const points = buildHistoryPoints(measurements);

    return res.status(200).json({
      data: {
        location,
        zone: zone || "toutes",
        period: last || "3h",
        points,
        scale: scalePayload(),
        message: points.length
          ? `${points.length} point(s) d'historique ont été calculés.`
          : "Aucune mesure n'est disponible pour cette période."
      }
    });
  } catch (error) {
    console.error("Erreur historique :", error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Une erreur est survenue pendant la récupération de l'historique."
    });
  }
});

router.get("/:location/quiet-hours", async (req, res) => {
  try {
    const { location } = req.params;
    const { zone } = req.query;
    const filter = { location };
    if (zone) filter.zone = zone;

    const measurements = await Measurement.find(filter).lean();
    const slots = buildQuietSlots(measurements);

    return res.status(200).json({
      data: {
        location,
        zone: zone || "toutes",
        threshold: quietThresholdPayload(),
        slots,
        scale: scalePayload(),
        message: slots.length
          ? `${slots.length} créneau(x) calme(s) ont été identifié(s).`
          : "Aucun créneau calme n'a encore été identifié."
      }
    });
  } catch (error) {
    console.error("Erreur créneaux calmes :", error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Une erreur est survenue pendant le calcul des créneaux calmes."
    });
  }
});

module.exports = router;
