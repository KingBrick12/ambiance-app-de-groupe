require("dotenv").config();

const config = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI
};

function validateRuntimeConfig() {
  const missing = [];

  if (!config.mongodbUri) missing.push("MONGODB_URI");

  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(", ")}`);
  }
}

module.exports = {
  config,
  validateRuntimeConfig
};
