require("dotenv").config();

const http = require("http");
const https = require("https");
const { URL } = require("url");

const DEFAULT_INTERVAL_MS = 5000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

function readPath(source, path) {
  if (!path) return undefined;

  return path.split(".").reduce((value, key) => {
    if (value === undefined || value === null) return undefined;
    return value[key];
  }, source);
}

function findFirstNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const found = findFirstNumber(value[index]);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      const found = findFirstNumber(value[key]);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

function normalizeNoiseValue(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`Valeur Phyphox invalide: ${rawValue}`);
  }

  // Si Phyphox retourne déjà une valeur entre 0 et 1
  if (value >= 0 && value <= 1) return value;

  // Conversion dB Phyphox vers 0-1
  // -80 dB = 0, -20 dB = 1
  const normalized = (value + 80) / 60;

  if (normalized < 0) return 0;
  if (normalized > 1) return 1;
  return normalized;
}

async function fetchJson(url, options = {}) {
  const parsedUrl = new URL(url);
  const transport = parsedUrl.protocol === "https:" ? https : http;
  const body = options.body || "";

  const requestOptions = {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
      ...(options.headers || {})
    }
  };

  return new Promise((resolve, reject) => {
    const request = transport.request(parsedUrl, requestOptions, (response) => {
      const chunks = [];

      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let parsedBody = {};

        if (text) {
          try {
            parsedBody = JSON.parse(text);
          } catch (error) {
            reject(new Error(`Reponse non JSON de ${url}: ${text.slice(0, 120)}`));
            return;
          }
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode} de ${url}: ${JSON.stringify(parsedBody)}`));
          return;
        }

        resolve(parsedBody);
      });
    });

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

function extractNoiseValue(phyphoxPayload) {
  const configuredPath = process.env.PHYPHOX_VALUE_PATH;
  const configuredValue = readPath(phyphoxPayload, configuredPath);
  const rawValue =
    configuredValue !== undefined ? findFirstNumber(configuredValue) : findFirstNumber(phyphoxPayload);

  return normalizeNoiseValue(rawValue);
}

async function collectOnce() {
  const phyphoxUrl = requiredEnv("PHYPHOX_URL");
  const apiBaseUrl = requiredEnv("API_BASE_URL").replace(/\/$/, "");
  const apiKey = requiredEnv("DEVICE_API_KEY");

  const payload = await fetchJson(phyphoxUrl);
  const value = extractNoiseValue(payload);

  const measurement = {
    type: process.env.MEASUREMENT_TYPE || "audio_amplitude",
    value,
    location: process.env.LOCATION || "parc-lafontaine",
    zone: process.env.ZONE || "zone-banc-central",
    timestamp: new Date().toISOString()
  };

  const result = await fetchJson(`${apiBaseUrl}/measurements`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey
    },
    body: JSON.stringify(measurement)
  });

  return {
    measurement,
    result
  };
}

async function start() {
  const intervalMs = Number(process.env.COLLECT_INTERVAL_MS || DEFAULT_INTERVAL_MS);

  if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
    throw new Error("COLLECT_INTERVAL_MS doit etre un nombre >= 1000.");
  }

  console.log(`Bridge Phyphox demarre, intervalle ${intervalMs} ms.`);

  async function tick() {
    try {
      const { measurement } = await collectOnce();
      console.log(`[${measurement.timestamp}] mesure envoyee: ${measurement.value}`);
    } catch (error) {
      console.error("Erreur collecte:", error.message);
    }
  }

  await tick();
  setInterval(tick, intervalMs);
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  collectOnce,
  extractNoiseValue,
  fetchJson,
  findFirstNumber,
  normalizeNoiseValue,
  readPath
};
