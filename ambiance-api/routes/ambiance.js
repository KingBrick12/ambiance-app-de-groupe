const express = require("express");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const {
  average,
  classifyNoise,
  parseLast,
  scalePayload
} = require("../lib/ambianceLogic");

const router = express.Router();
const FRESHNESS_THRESHOLD_MINUTES = 30;
const QUIET_THRESHOLD = 0.35;

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
    } else if (classification) {
      message = `Le lieu est actuellement ${classification.label.toLowerCase()}.`;
    }

    return res.status(200).json({
      data: {
        location,
        zone: zone || "toutes",
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
        scale: scalePayload(),
        message
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
    const since = new Date(Date.now() - duration);
    const filter = { location, timestamp: { $gte: since } };
    if (zone) filter.zone = zone;

    const measurements = await Measurement.find(filter).sort({ timestamp: 1 }).lean();
    const groups = {};

    measurements.forEach((measurement) => {
      const date = new Date(measurement.timestamp);
      date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
      const key = date.toISOString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(measurement.value);
    });

    const points = Object.entries(groups).map(([timestamp, values]) => {
      const value = average(values);
      return {
        timestamp,
        value: Number(value.toFixed(2)),
        classification: classifyNoise(value)
      };
    });

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
    const groups = {};

    measurements.forEach((measurement) => {
      const hour = new Date(measurement.timestamp).getHours();
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(measurement.value);
    });

    const slots = Object.entries(groups)
      .map(([hourText, values]) => {
        const hour = Number(hourText);
        const averageNoise = average(values);
        return {
          start: `${String(hour).padStart(2, "0")}:00`,
          end: `${String((hour + 1) % 24).padStart(2, "0")}:00`,
          averageNoise: Number(averageNoise.toFixed(2)),
          classification: classifyNoise(averageNoise),
          message: "Ce créneau est généralement calme selon les mesures disponibles."
        };
      })
      .filter((slot) => slot.averageNoise <= QUIET_THRESHOLD)
      .sort((a, b) => a.averageNoise - b.averageNoise);

    return res.status(200).json({
      data: {
        location,
        zone: zone || "toutes",
        threshold: {
          maximumAverageNoise: QUIET_THRESHOLD,
          description: `Un créneau est considéré calme lorsque son amplitude moyenne est inférieure ou égale à ${QUIET_THRESHOLD}.`
        },
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
