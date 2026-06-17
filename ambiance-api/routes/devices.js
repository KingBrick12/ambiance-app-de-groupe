const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const Device = require("../models/Device");

// POST /devices
// Créer un appareil et générer une clé API
router.post("/", async (req, res) => {
  try {
    const { name, location, zone } = req.body;

    if (!name || !location || !zone) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Champs obligatoires manquants."
      });
    }

    const apiKey = "api_key_" + crypto.randomBytes(16).toString("hex");

    const device = await Device.create({
      name,
      location,
      zone,
      apiKey
    });

    res.status(201).json({
      message: "Device créé avec succès.",
      data: {
        id: device._id,
        name: device.name,
        location: device.location,
        zone: device.zone,
        apiKey: device.apiKey
      }
    });

  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

// GET /devices
// Voir les appareils enregistrés
router.get("/", async (req, res) => {
  try {
    const devices = await Device.find();

    res.status(200).json({
      count: devices.length,
      data: devices
    });

  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
});

module.exports = router;