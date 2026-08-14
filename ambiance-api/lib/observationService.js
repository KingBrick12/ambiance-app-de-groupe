const ALLOWED_FIELDS = [
  "location",
  "zone",
  "timestamp",
  "peopleCount",
  "crowdLevel",
  "mainNoiseSources",
  "proximity",
  "vibe",
  "perceivedNoiseLevel",
  "specialEvent",
  "notes"
];

const REQUIRED_FIELDS = [
  "location",
  "zone",
  "timestamp",
  "peopleCount",
  "crowdLevel",
  "proximity",
  "vibe"
];

function pickObservationFields(body = {}) {
  return Object.fromEntries(
    ALLOWED_FIELDS.filter((field) => body[field] !== undefined).map((field) => [
      field,
      body[field]
    ])
  );
}

function failure(status, error, message) {
  return { ok: false, status, error, message };
}
function validateObservationPayload(body = {}, now = Date.now()) {
  if (body.author !== undefined) {
    return failure(
      400,
      "AUTHOR_NOT_ALLOWED",
      "L’auteur est déterminé par la session."
    );
  }

  const data = pickObservationFields(body);

  const missing = REQUIRED_FIELDS.filter((field) =>
    field === "peopleCount" ? data.peopleCount === undefined : !data[field]
  );

  if (missing.length > 0) {
    return failure(
      400,
      "VALIDATION_ERROR",
      "Tous les champs obligatoires de l’observation doivent être fournis."
    );
  }

  if (typeof data.peopleCount !== "number" || data.peopleCount < 0) {
    return failure(
      400,
      "VALIDATION_ERROR",
      "peopleCount doit être un nombre positif ou nul."
    );
  }

  const timestamp = new Date(data.timestamp);

  if (Number.isNaN(timestamp.getTime())) {
    return failure(
      400,
      "VALIDATION_ERROR",
      "timestamp doit être une date valide."
    );
  }

  if (timestamp.getTime() > now) {
    return failure(
      400,
      "FUTURE_TIMESTAMP",
      "La date et l’heure de l’observation ne peuvent pas être dans le futur."
    );
  }

  return { ok: true, data: { ...data, timestamp } };
}

module.exports = {
  ALLOWED_FIELDS,
  REQUIRED_FIELDS,
  pickObservationFields,
  validateObservationPayload
};
