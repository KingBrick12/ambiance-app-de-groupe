const express = require("express");
const Observation = require("../models/Observation");
const User = require("../models/User");
const userAuth = require("../middleware/userAuth");
const { listLocations, locationExists, normalizeLocation } = require("../lib/locations");

const router = express.Router();
router.use(userAuth);

router.get("/contributions", async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = { author: req.user._id };
  const [data, total] = await Promise.all([
    Observation.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Observation.countDocuments(filter)
  ]);
  res.json({ data: data.map((item) => ({ ...item, location: normalizeLocation(item.location) })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get("/locations", async (req, res) => {
  const observations = await Observation.find({ author: req.user._id }).select("location zone timestamp").lean();
  const grouped = new Map();
  for (const item of observations) {
    const location = normalizeLocation(item.location);
    const current = grouped.get(location) || { location, zones: new Set(), contributionCount: 0, lastContributionAt: item.timestamp };
    current.zones.add(item.zone);
    current.contributionCount += 1;
    if (item.timestamp > current.lastContributionAt) current.lastContributionAt = item.timestamp;
    grouped.set(location, current);
  }
  const data = [...grouped.values()].map((item) => ({ ...item, zones: [...item.zones] })).sort((a, b) => b.lastContributionAt - a.lastContributionAt);
  res.json({ data });
});

router.get("/favorites", async (req, res) => {
  const favorites = [...new Set((req.user.favorites || []).map(normalizeLocation).filter(Boolean))];
  if (favorites.join("|") !== (req.user.favorites || []).join("|")) {
    req.user.favorites = favorites;
    await req.user.save();
  }
  res.json({ data: favorites });
});
router.post("/favorites/:location", async (req, res) => {
  const location = normalizeLocation(decodeURIComponent(req.params.location));
  if (!(await locationExists(location))) return res.status(404).json({ error: "LOCATION_NOT_FOUND", message: "Ce lieu n’existe pas." });
  const favorites = [...new Set((req.user.favorites || []).map(normalizeLocation).filter(Boolean))];
  if (favorites.includes(location)) return res.status(409).json({ error: "FAVORITE_ALREADY_EXISTS", message: "Ce lieu est déjà dans vos favoris." });
  favorites.push(location);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { favorites } }, { returnDocument: "after" });
  res.status(201).json({ message: "Lieu ajouté aux favoris.", data: user.favorites });
});
router.delete("/favorites/:location", async (req, res) => {
  const location = normalizeLocation(decodeURIComponent(req.params.location));
  const favorites = (req.user.favorites || []).map(normalizeLocation).filter((item) => item && item !== location);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { favorites: [...new Set(favorites)] } }, { returnDocument: "after" });
  res.json({ message: "Lieu retiré des favoris.", data: user.favorites });
});

router.get("/available-locations", async (_req, res) => res.json({ data: await listLocations() }));

module.exports = router;
