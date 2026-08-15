const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const locationRoutes = require("./routes/locations");
const deviceRoutes = require("./routes/devices");
const measurementRoutes = require("./routes/measurements");
const observationRoutes = require("./routes/observations");
const ambianceRoutes = require("./routes/ambiance");
const authRoutes = require("./routes/auth");
const accountRoutes = require("./routes/account");
const userObservationRoutes = require("./routes/userObservations");

const { config, validateRuntimeConfig } = require("./config");

const app = express();

/*
 * Middlewares globaux
*/
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.frontendUrls.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
  })
);

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/devices")) {
    res.set("Cache-Control", "no-store");
  }
  next();
});

/*
 * Route principale
 *
 * Permet de vérifier rapidement que l’API fonctionne.
 */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "API Ambiance fonctionne",
    endpoints: {
      locations: "/locations",
      devices: "/devices",
      measurements: "/measurements",
      observations: "/observations",
      ambiance: "/ambiance",
      authentication: "/api/auth",
      account: "/api/account",
      userObservations: "/api/observations"
    }
  });
});

app.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({ status: "ok" });
});

/*
 * Routes publiques
 */
app.use("/locations", locationRoutes);
app.use("/devices", deviceRoutes);
app.use("/measurements", measurementRoutes);
app.use("/observations", observationRoutes);
app.use("/ambiance", ambianceRoutes);

/*
 * Routes d’authentification et routes privées
 */
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/observations", userObservationRoutes);

/*
 * Gestion des routes inexistantes
*/
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `L’endpoint ${req.method} ${req.originalUrl} est introuvable.`
  });
});

/*
 * Gestion globale des erreurs
*/
app.use((error, req, res, next) => {
  console.error("Erreur serveur :", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    error: error.code || "INTERNAL_SERVER_ERROR",
    message:
      error.message ||
      "Une erreur inattendue est survenue sur le serveur."
  });
});

/*
 * Connexion à MongoDB et démarrage du serveur
 */
async function startServer() {
  try {
    validateRuntimeConfig();

    await mongoose.connect(config.mongodbUri);

    console.log("Connecté à MongoDB Atlas");

    app.listen(config.port, () => {
      console.log(
        `Serveur lancé sur http://localhost:${config.port}`
      );

      console.log(
        `Frontend autorisé : ${config.frontendUrl}`
      );
    });
  } catch (error) {
    console.error(
      "Erreur pendant le démarrage du serveur :",
      error.message
    );

    process.exit(1);
  }
}

/*
 * Le serveur démarre seulement lorsque ce fichier est exécuté directement.
 */
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
