require("dotenv").config();

const config = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || "development-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2h",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173"
};

function validateRuntimeConfig() {
  const missing = [];

  if (!config.mongodbUri) missing.push("MONGODB_URI");
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) missing.push("JWT_SECRET");

  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(", ")}`);
  }
}

module.exports = {
  config,
  validateRuntimeConfig
};
