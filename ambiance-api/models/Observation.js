const mongoose = require("mongoose");

const observationSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true
  },
  zone: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  peopleCount: {
    type: Number,
    required: true,
    min: 0
  },
  crowdLevel: {
    type: String,
    required: true,
    enum: ["faible", "moyenne", "elevee"]
  },
  proximity: {
    type: String,
    required: true,
    enum: ["loin", "moyenne", "proche"]
  },
  vibe: {
    type: String,
    required: true,
    enum: ["calme", "moderee", "animee", "bruyante"]
  },
  notes: {
    type: String
  },
  receivedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Observation", observationSchema);