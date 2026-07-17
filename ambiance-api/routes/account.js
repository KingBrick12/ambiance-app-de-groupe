const express = require("express");
const Observation = require("../models/Observation");
const User = require("../models/User");
const userAuth = require("../middleware/userAuth");
const { listLocations, locationExists } = require("../lib/locations");

const router = express.Router();
router.use(userAuth);

router.get("/contributions", async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = { author: req.user._id };
  const [data, total] = await Promise.all([
    Observation.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit),
    Observation.countDocuments(filter)
  ]);
  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get("/locations", async (req, res) => {
  const data = await Observation.aggregate([
    { $match: { author: req.user._id } },
    { $group: { _id: "$location", zones: { $addToSet: "$zone" }, contributionCount: { $sum: 1 }, lastContributionAt: { $max: "$timestamp" } } },
    { $project: { _id: 0, location: "$_id", zones: 1, contributionCount: 1, lastContributionAt: 1 } },
    { $sort: { lastContributionAt: -1 } }
  ]);
  res.json({ data });
});

router.get("/favorites", async (req, res) => res.json({ data: req.user.favorites || [] }));
router.post("/favorites/:location", async (req, res) => {
  const location = decodeURIComponent(req.params.location);
  if (!(await locationExists(location))) return res.status(404).json({ error: "LOCATION_NOT_FOUND", message: "Ce lieu n’existe pas." });
  if (req.user.favorites.includes(location)) return res.status(409).json({ error: "FAVORITE_ALREADY_EXISTS", message: "Ce lieu est déjà dans vos favoris." });
  const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { favorites: location } }, { new: true });
  res.status(201).json({ message: "Lieu ajouté aux favoris.", data: user.favorites });
});
router.delete("/favorites/:location", async (req, res) => {
  const location = decodeURIComponent(req.params.location);
  const user = await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: location } }, { new: true });
  res.json({ message: "Lieu retiré des favoris.", data: user.favorites });
});

router.get("/available-locations", async (_req, res) => res.json({ data: await listLocations() }));

module.exports = router;
