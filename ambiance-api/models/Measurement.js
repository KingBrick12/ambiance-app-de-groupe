const mongoose = require("mongoose");

const measurementSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
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
  receivedAt: {
    type: Date,
    default: Date.now
  },
  sessionId: { type: String, index: true },
  sampleIndex: { type: Number },
  importKey: { type: String, unique: true, sparse: true, index: true }
});

module.exports = mongoose.model("Measurement", measurementSchema);
