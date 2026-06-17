const Device = require("../models/Device");

async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Clé API absente."
      });
    }

    const device = await Device.findOne({ apiKey });

    if (!device) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Clé API invalide."
      });
    }

    req.device = device;
    next();

  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur serveur."
    });
  }
}

module.exports = apiKeyAuth;