const assert = require("assert").strict;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Observation = require("../models/Observation");

const { average, classifyNoise, parseLast } = require("../lib/ambianceLogic");
const {
  extractNoiseValue,
  findFirstNumber,
  normalizeNoiseValue,
  readPath
} = require("../bridge/phyphoxBridge");
const { rowToMeasurement } = require("../scripts/importPhyphoxCsv");
const {
  normalizeCrowdLevel,
  normalizeProximity,
  normalizeVibe,
  toObservation
} = require("../scripts/importManualObservations");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("classifyNoise classifies thresholds", () => {
  assert.equal(classifyNoise(0.20), "calme");
  assert.equal(classifyNoise(0.50), "modere");
  assert.equal(classifyNoise(0.70), "anime");
  assert.equal(classifyNoise(0.90), "bruyant");
});

test("parseLast accepts minutes and hours", () => {
  assert.equal(parseLast("15m"), 15 * 60 * 1000);
  assert.equal(parseLast("2h"), 2 * 60 * 60 * 1000);
  assert.equal(parseLast(), 3 * 60 * 60 * 1000);
  assert.equal(parseLast("abc"), 3 * 60 * 60 * 1000);
});

test("average handles empty and numeric arrays", () => {
  assert.equal(average([]), null);
  assert.ok(Math.abs(average([0.2, 0.4, 0.6]) - 0.4) < 0.000001);
});

test("readPath reads a configured path", () => {
  const payload = { buffer: { audio: { buffer: [0.1, 0.4] } } };
  assert.deepEqual(readPath(payload, "buffer.audio.buffer"), [0.1, 0.4]);
});

test("findFirstNumber returns the latest numeric array value", () => {
  assert.equal(findFirstNumber({ buffer: [0.1, 0.2, 0.7] }), 0.7);
});

test("normalizeNoiseValue bounds values between 0 and 1", () => {
  assert.equal(normalizeNoiseValue(-100), 0);
  assert.equal(normalizeNoiseValue(2), 1);
  assert.equal(normalizeNoiseValue(0.42), 0.42);
});

test("normalizeNoiseValue converts Phyphox dB to 0-1", () => {
  assert.ok(Math.abs(normalizeNoiseValue(-50) - 0.5) < 0.000001);
  assert.equal(normalizeNoiseValue(-80), 0);
  assert.equal(normalizeNoiseValue(-20), 1);
});

test("extractNoiseValue uses PHYPHOX_VALUE_PATH", () => {
  const previousPath = process.env.PHYPHOX_VALUE_PATH;
  process.env.PHYPHOX_VALUE_PATH = "buffer.dB.buffer";

  const payload = {
    ignored: [0.9],
    buffer: {
      dB: {
        buffer: [-60, -50]
      }
    }
  };

  assert.ok(Math.abs(extractNoiseValue(payload) - 0.5) < 0.000001);
  restoreEnv("PHYPHOX_VALUE_PATH", previousPath);
});

test("rowToMeasurement supports English Phyphox CSV rows", () => {
  const previousLocation = process.env.LOCATION;
  const previousZone = process.env.ZONE;
  process.env.LOCATION = "parc-lafontaine";
  process.env.ZONE = "zone-banc-central";

  const measurement = rowToMeasurement(
    {
      "Time (s)": "5",
      "Sound pressure level (dB)": "-50"
    },
    new Date("2026-06-17T12:00:00.000Z")
  );

  assert.equal(measurement.location, "parc-lafontaine");
  assert.equal(measurement.zone, "zone-banc-central");
  assert.equal(measurement.timestamp, "2026-06-17T12:00:05.000Z");
  assert.ok(Math.abs(measurement.value - 0.5) < 0.000001);

  restoreEnv("LOCATION", previousLocation);
  restoreEnv("ZONE", previousZone);
});

test("toObservation maps a manual collection row", () => {
  const observation = toObservation({
    sessionNo: "1",
    date: "2026-06-17",
    startTime: "12:00",
    observationTimeLabel: "10min",
    peopleCount: "7",
    crowdLevel: "moyenne",
    humanSourceProximity: "proche",
    vibe: "animee"
  });

  assert.equal(observation.location, process.env.LOCATION || "parc-lafontaine");
  assert.equal(observation.zone, process.env.ZONE || "zone-banc-central");
  assert.equal(observation.peopleCount, 7);
  assert.equal(observation.proximity, "proche");
  const expectedTimestamp = new Date("2026-06-17T12:00:00");
  expectedTimestamp.setMinutes(expectedTimestamp.getMinutes() + 10);
  assert.equal(observation.timestamp, expectedTimestamp.toISOString());
});

test("manual collection values are normalized", () => {
  assert.equal(normalizeCrowdLevel("elevee"), "elevee");
  assert.equal(normalizeProximity("near"), "proche");
  assert.equal(normalizeVibe("moderee"), "moderee");
});

test("observation author remains optional for phase 1 data", () => {
  assert.equal(Observation.schema.path("author").isRequired, false);
});

test("passwords are hashed and securely compared", () => {
  const hash = bcrypt.hashSync("mot-de-passe-solide", 4);
  assert.notEqual(hash, "mot-de-passe-solide");
  assert.equal(bcrypt.compareSync("mot-de-passe-solide", hash), true);
  assert.equal(bcrypt.compareSync("incorrect", hash), false);
});

test("authentication tokens reject an invalid signature", () => {
  const token = jwt.sign({ sub: "user-id" }, "test-secret", { expiresIn: "1h" });
  assert.equal(jwt.verify(token, "test-secret").sub, "user-id");
  assert.throws(() => jwt.verify(token, "wrong-secret"));
});

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`${tests.length} tests passed`);
