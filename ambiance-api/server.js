const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const locationRoutes = require("./routes/locations");
app.use("/locations", locationRoutes);
const deviceRoutes = require("./routes/devices");
const measurementRoutes = require("./routes/measurements");
const observationRoutes = require("./routes/observations");
const ambianceRoutes = require("./routes/ambiance");
const authRoutes = require("./routes/auth");
const accountRoutes = require("./routes/account");
const userObservationRoutes = require("./routes/userObservations");
const { config, validateRuntimeConfig } = require("./config");

const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "API Ambiance fonctionne",
    endpoints: ["/devices", "/measurements", "/observations", "/ambiance"]
  });
});

app.use("/devices", deviceRoutes);
app.use("/measurements", measurementRoutes);
app.use("/observations", observationRoutes);
app.use("/ambiance", ambianceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/observations", userObservationRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Endpoint introuvable"
  });
});

async function startServer() {
  try {
    validateRuntimeConfig();

    await mongoose.connect(config.mongodbUri);
    console.log("Connecte a MongoDB Atlas");

    app.listen(config.port, () => {
      console.log(`Serveur lance sur http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error("Erreur de connexion MongoDB :", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
