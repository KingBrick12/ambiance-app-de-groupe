require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const deviceRoutes = require("./routes/devices");
const measurementRoutes = require("./routes/measurements");
const observationRoutes = require("./routes/observations");
const ambianceRoutes = require("./routes/ambiance");

const app = express();

// Parser le JSON des requêtes
app.use(express.json());

// Route de test
app.get("/", (req, res) => {
  res.status(200).json({
    message: "API Ambiance fonctionne"
  });
});

// Routes principales
app.use("/devices", deviceRoutes);
app.use("/measurements", measurementRoutes);
app.use("/observations", observationRoutes);
app.use("/ambiance", ambianceRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Endpoint introuvable"
  });
});

// Connexion à MongoDB Atlas + lancement du serveur
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connecté à MongoDB Atlas");

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Serveur lancé sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erreur de connexion MongoDB :", error.message);
  });