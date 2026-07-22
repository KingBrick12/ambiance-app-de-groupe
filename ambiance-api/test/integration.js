require("dotenv").config();
const assert = require("assert").strict;
const mongoose = require("mongoose");
const request = require("supertest");
const { app } = require("../server");
const Measurement = require("../models/Measurement");
const Observation = require("../models/Observation");
const User = require("../models/User");
const { config, validateRuntimeConfig } = require("../config");

async function main() {
  validateRuntimeConfig();
  await mongoose.connect(config.mongodbUri);
  let userId;
  let observationId;
  try {
    const staleTestUsers = await User.find({ email: /^audit-/ }).select("_id").lean();
    const staleIds = staleTestUsers.map(({ _id }) => _id);
    if (staleIds.length) {
      await Observation.deleteMany({ author: { $in: staleIds } });
      await User.deleteMany({ _id: { $in: staleIds } });
    }
    const locations = await request(app).get("/locations").expect(200);
    assert.equal(locations.body.meta.count, 3);
    assert.deepEqual(locations.body.data.map(({ slug }) => slug).sort(), ["parc-jean-mance", "parc-lafontaine", "parc-maisonneuve"]);
    assert.ok(locations.body.data.every(({ currentAmbiance }) => currentAmbiance.status === "recent"));

    const sessionCounts = await Measurement.aggregate([
      { $match: { sessionId: { $exists: true } } },
      { $group: { _id: "$location", sessions: { $addToSet: "$sessionId" } } }
    ]);
    const byPark = Object.fromEntries(sessionCounts.map(({ _id, sessions }) => [_id, sessions.length]));
    assert.deepEqual(byPark, { "parc-jean-mance": 3, "parc-lafontaine": 6, "parc-maisonneuve": 3 });

    const history = await request(app).get("/ambiance/parc-lafontaine/history?last=all").expect(200);
    assert.ok(history.body.data.points.length > 0);

    const email = `audit-${Date.now()}@example.test`;
    const registration = await request(app).post("/api/auth/register").send({ displayName: "Audit", email, password: "MotDePasseAudit123!" }).expect(201);
    userId = registration.body.data.user._id || registration.body.data.user.id;
    const token = registration.body.data.token;
    await User.updateOne({ _id: userId }, { $set: { favorites: ["parc-jeanne-mance", "parc-jean-mance", "parc_lafontaine"] } });
    const normalizedFavorites = await request(app).get("/api/account/favorites").set("Authorization", `Bearer ${token}`).expect(200);
    assert.deepEqual(normalizedFavorites.body.data, ["parc-jean-mance", "parc-lafontaine"]);
    await request(app).delete("/api/account/favorites/parc-jean-mance").set("Authorization", `Bearer ${token}`).expect(200);
    const favoritesAfterDelete = await request(app).get("/api/account/favorites").set("Authorization", `Bearer ${token}`).expect(200);
    assert.deepEqual(favoritesAfterDelete.body.data, ["parc-lafontaine"]);

    await request(app).post("/api/observations").set("Authorization", `Bearer ${token}`).send({
      location: "parc-lafontaine", zone: "zone-banc-central", timestamp: new Date(Date.now() + 3600000).toISOString(), peopleCount: 1,
      crowdLevel: "faible", proximity: "loin", vibe: "calme"
    }).expect(400);
    const creation = await request(app).post("/api/observations").set("Authorization", `Bearer ${token}`).send({
      location: "parc-jean-mance", zone: "zone-principale", timestamp: new Date().toISOString(), peopleCount: 5,
      crowdLevel: "faible", proximity: "loin", vibe: "calme", notes: "Test d'intégration temporaire"
    }).expect(201);
    observationId = creation.body.data._id;

    const publicCurrent = await request(app).get("/ambiance/parc-jean-mance/current").expect(200);
    assert.equal(publicCurrent.body.data.source, "observation");
    assert.equal(publicCurrent.body.data.classification.code, "calme");
    const publicLocations = await request(app).get("/locations").expect(200);
    assert.equal(publicLocations.body.data.find(({ slug }) => slug === "parc-jean-mance").currentAmbiance.classification.code, "calme");

    const mine = await request(app).get("/api/observations/mine").set("Authorization", `Bearer ${token}`).expect(200);
    assert.ok(mine.body.data.some(({ _id }) => _id === observationId));
    console.log(`Intégration réussie: lieux normalisés, favoris ajout/retrait, date future refusée, portrait public actualisé et observation relue.`);
  } finally {
    if (observationId) await Observation.deleteOne({ _id: observationId });
    if (userId) await User.deleteOne({ _id: userId });
    await mongoose.disconnect();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
