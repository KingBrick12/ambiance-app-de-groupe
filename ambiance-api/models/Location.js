const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  defaultZone: { type: String, default: "zone-principale" },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 }
}, { timestamps: true });

module.exports = mongoose.model("Location", locationSchema);
