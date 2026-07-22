const path = require("path");
const { normalizeNoiseValue } = require("../bridge/phyphoxBridge");
const { getFirst, numberFrom, readTabularFile } = require("../scripts/lib/io");
const { classifyNoise } = require("./ambianceLogic");

const SESSION_MANIFEST = [
  ["phase1-lafontaine-1", "session1 phase1 parc lafontaine.csv", "parc-lafontaine", "zone-banc-central", "2026-06-17T12:00:00-04:00"],
  ["phase1-lafontaine-2", "session2 phase1 parc lafontaine.csv", "parc-lafontaine", "zone-banc-central", "2026-06-17T13:00:00-04:00"],
  ["phase1-lafontaine-3", "session3 phase1 parc lafontaine.csv", "parc-lafontaine", "zone-banc-central", "2026-06-17T14:00:00-04:00"],
  ["phase2-lafontaine-1", "parc-lafontaine-session-1.csv", "parc-lafontaine", "zone-banc-central", "2026-07-14T10:00:00-04:00"],
  ["phase2-lafontaine-2", "parc-lafontaine-session-2.csv", "parc-lafontaine", "zone-banc-central", "2026-07-14T13:00:00-04:00"],
  ["phase2-lafontaine-3", "parc-lafontaine-session-3.csv", "parc-lafontaine", "zone-banc-central", "2026-07-14T16:00:00-04:00"],
  ["phase2-jean-mance-1", "parc-jean-mance-session-1.csv", "parc-jean-mance", "zone-principale", "2026-07-15T10:00:00-04:00"],
  ["phase2-jean-mance-2", "parc-jean-mance-session-2.csv", "parc-jean-mance", "zone-principale", "2026-07-15T13:00:00-04:00"],
  ["phase2-jean-mance-3", "parc-jean-mance-session-3.csv", "parc-jean-mance", "zone-principale", "2026-07-15T16:00:00-04:00"],
  ["phase2-maisonneuve-1", "parc-maisonneuve-session-1.csv", "parc-maisonneuve", "zone-principale", "2026-07-16T10:00:00-04:00"],
  ["phase2-maisonneuve-2", "parc-maisonneuve-session-2.csv", "parc-maisonneuve", "zone-principale", "2026-07-16T13:00:00-04:00"],
  ["phase2-maisonneuve-3", "parc-maisonneuve-session-3.csv", "parc-maisonneuve", "zone-principale", "2026-07-16T16:00:00-04:00"]
].map(([sessionId, file, location, zone, startedAt]) => ({ sessionId, file, location, zone, startedAt }));

function vibeFromClassification(code) {
  return ({ calme: "calme", modere: "moderee", anime: "animee", bruyant: "bruyante" })[code] || "moderee";
}

function crowdFromVibe(vibe) {
  if (vibe === "calme") return "faible";
  if (vibe === "bruyante" || vibe === "animee") return "elevee";
  return "moyenne";
}

function parseSession(session, dataDirectory) {
  const filePath = path.join(dataDirectory, session.file);
  const rows = readTabularFile(filePath);
  const startedAt = new Date(session.startedAt);
  const measurements = [];
  let invalidRows = 0;

  rows.forEach((row, rowIndex) => {
    const seconds = numberFrom(getFirst(row, ["Time (s)", "Durée(s)", "Duree(s)", "Time", "t"]), NaN);
    const db = numberFrom(getFirst(row, ["Sound pressure level (dB)", "SPL(dB)", "SPL (dB)", "dB"]), NaN);
    if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(db)) {
      invalidRows += 1;
      return;
    }
    measurements.push({
      type: "audio_amplitude",
      value: normalizeNoiseValue(db),
      location: session.location,
      zone: session.zone,
      timestamp: new Date(startedAt.getTime() + seconds * 1000),
      sessionId: session.sessionId,
      sampleIndex: rowIndex,
      importKey: `${session.sessionId}:${rowIndex}`
    });
  });

  if (!measurements.length) throw new Error(`${session.file}: aucune mesure valide.`);
  const mean = measurements.reduce((sum, item) => sum + item.value, 0) / measurements.length;
  const vibe = vibeFromClassification(classifyNoise(mean)?.code);
  const end = measurements[measurements.length - 1].timestamp;
  const observation = {
    sessionNo: session.sessionId,
    location: session.location,
    zone: session.zone,
    date: session.startedAt.slice(0, 10),
    startTime: startedAt.toISOString().slice(11, 16),
    endTime: end.toISOString().slice(11, 16),
    duration: `${Math.round((end - startedAt) / 60000)}min`,
    appUsed: "Phyphox",
    collectedDataType: "Amplitude sonore",
    timestamp: startedAt,
    peopleCount: 0,
    crowdLevel: crowdFromVibe(vibe),
    proximity: "moyenne",
    vibe,
    perceivedNoiseLevel: classifyNoise(mean)?.label || "Modéré",
    notes: "Observation de session générée à partir des mesures Phyphox; achalandage non consigné dans le CSV."
  };
  return { measurements, observation, invalidRows, sourceRows: rows.length };
}

function loadCollectionData(dataDirectory = process.env.COLLECTION_CSV_DIR || path.join(__dirname, "..", "data", "collections")) {
  const sessions = SESSION_MANIFEST.map((session) => ({ session, ...parseSession(session, dataDirectory) }));
  return {
    sessions,
    measurements: sessions.flatMap((item) => item.measurements),
    observations: sessions.map((item) => item.observation)
  };
}

module.exports = { SESSION_MANIFEST, loadCollectionData, parseSession };
