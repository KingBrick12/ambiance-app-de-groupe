const express = require("express");
const router = express.Router();

const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const { classifyNoise, parseLast } = require("../lib/ambianceLogic");

// GET /ambiance/:location/current
router.get("/:location/current", async (req, res) => {
  try {
    const { location } = req.params;
    const { zone } = req.query;

    const since = new Date(Date.now() - 30 * 60 * 1000);

    const filter = {
      location,
      timestamp: { $gte: since }
    };

    if (zone) filter.zone = zone;

    const measurements = await Measurement.find(filter);

    if (measurements.length === 0) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aucune mesure recente trouvee pour ce lieu."
      });
    }

    const sum = measurements.reduce((total, m) => total + m.value, 0);
    const averageNoise = sum / measurements.length;
    const noiseLevel = classifyNoise(averageNoise);

    const observationFilter = { location };
    if (zone) observationFilter.zone = zone;

    const lastObservation = await Observation.findOne(observationFilter)
      .sort({ timestamp: -1 });

    res.status(200).json({
      location,
      zone: zone || "toutes",
      averageNoise: Number(averageNoise.toFixed(2)),
      noiseLevel,
      vibe: lastObservation ? lastObservation.vibe : "inconnue",
      message: `Le lieu est actuellement ${noiseLevel}.`
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

// GET /ambiance/:location/history?last=3h
router.get("/:location/history", async (req, res) => {
  try {
    const { location } = req.params;
    const { zone, last } = req.query;

    const duration = parseLast(last);
    const since = new Date(Date.now() - duration);

    const filter = {
      location,
      timestamp: { $gte: since }
    };

    if (zone) filter.zone = zone;

    const measurements = await Measurement.find(filter).sort({ timestamp: 1 });

    if (measurements.length === 0) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aucune mesure trouvee pour cette periode."
      });
    }

    const groups = {};

    measurements.forEach((measurement) => {
      const date = new Date(measurement.timestamp);

      date.setMinutes(Math.floor(date.getMinutes() / 5) * 5);
      date.setSeconds(0);
      date.setMilliseconds(0);

      const key = date.toISOString();

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(measurement.value);
    });

    const points = Object.keys(groups).map((time) => {
      const values = groups[time];
      const averageNoise =
        values.reduce((total, value) => total + value, 0) / values.length;

      return {
        time,
        averageNoise: Number(averageNoise.toFixed(2)),
        noiseLevel: classifyNoise(averageNoise)
      };
    });

    res.status(200).json({
      location,
      zone: zone || "toutes",
      last: last || "3h",
      points
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

// GET /ambiance/:location/quiet-hours
router.get("/:location/quiet-hours", async (req, res) => {
  try {
    const { location } = req.params;
    const { zone } = req.query;

    const filter = { location };
    if (zone) filter.zone = zone;

    const measurements = await Measurement.find(filter);

    if (measurements.length === 0) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aucune mesure trouvee pour ce lieu."
      });
    }

    const groups = {};

    measurements.forEach((measurement) => {
      const date = new Date(measurement.timestamp);
      const hour = date.getHours();

      if (!groups[hour]) {
        groups[hour] = [];
      }

      groups[hour].push(measurement.value);
    });

    const quietHours = Object.keys(groups)
      .map((hour) => {
        const values = groups[hour];
        const averageNoise =
          values.reduce((total, value) => total + value, 0) / values.length;

        return {
          hour: `${hour}:00-${Number(hour) + 1}:00`,
          averageNoise: Number(averageNoise.toFixed(2)),
          message: "Moment generalement calme."
        };
      })
      .filter((item) => item.averageNoise <= 0.35)
      .sort((a, b) => a.averageNoise - b.averageNoise);

    res.status(200).json({
      location,
      zone: zone || "toutes",
      quietHours
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

module.exports = router;
