const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

function resolveProjectPath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

function parseDelimited(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter).map(cleanHeader);

  return lines.slice(1).map((line) => {
    const values = parseLine(line, delimiter);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] === undefined ? "" : values[index].trim();
    });

    return row;
  });
}

function detectDelimiter(headerLine) {
  const candidates = [",", "\t", ";"];
  return candidates
    .map((delimiter) => ({ delimiter, count: headerLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.replace(/^"|"$/g, ""));
}

function cleanHeader(header) {
  return header.trim().replace(/^"|"$/g, "");
}

function readTabularFile(filePath) {
  const resolvedPath = resolveProjectPath(filePath);
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === ".xlsx" || extension === ".xls") {
    throw new Error(
      "Les fichiers Excel natifs ne sont pas lus sans dependance externe. Exportez la feuille en CSV ou TSV."
    );
  }

  const text = fs.readFileSync(resolvedPath, "utf8");
  return parseDelimited(text);
}

async function postJson(url, payload, apiKey) {
  const parsedUrl = new URL(url);
  const transport = parsedUrl.protocol === "https:" ? https : http;
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = transport.request(
      parsedUrl,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "x-api-key": apiKey
        }
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsedBody = {};

          if (text) {
            try {
              parsedBody = JSON.parse(text);
            } catch (error) {
              reject(new Error(`Reponse non JSON: ${text.slice(0, 120)}`));
              return;
            }
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode}: ${JSON.stringify(parsedBody)}`));
            return;
          }

          resolve(parsedBody);
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function numberFrom(value, fallback = undefined) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getFirst(row, keys, fallback = "") {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return fallback;
}

module.exports = {
  getFirst,
  numberFrom,
  postJson,
  readTabularFile,
  requiredEnv,
  resolveProjectPath
};
