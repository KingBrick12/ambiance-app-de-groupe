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
  }
});

module.exports = mongoose.model("Measurement", measurementSchema);