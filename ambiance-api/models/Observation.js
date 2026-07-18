const mongoose = require("mongoose");

const observationSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  sessionNo: {
    type: String
  },
  location: {
    type: String,
    required: true
  },
  zone: {
    type: String,
    required: true
  },
  date: {
    type: String
  },
  dayOfWeek: {
    type: String
  },
  startTime: {
    type: String
  },
  endTime: {
    type: String
  },
  duration: {
    type: String
  },
  weather: {
    type: String
  },
  approximateTemperature: {
    type: Number
  },
  phonePosition: {
    type: String
  },
  appUsed: {
    type: String
  },
  collectedDataType: {
    type: String
  },
  timestamp: {
    type: Date,
    required: true
  },
  observationTimeLabel: {
    type: String
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
  mainNoiseSources: {
    type: String
  },
  humanSourceProximity: {
    type: String
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
  perceivedNoiseLevel: {
    type: String
  },
  specialEvent: {
    type: String
  },
  notes: {
    type: String
  },
  technicalProblems: {
    type: String
  },
  receivedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);


observationSchema.index({ author: 1, timestamp: -1 });
observationSchema.index({ location: 1, zone: 1, timestamp: -1 });

module.exports = mongoose.model("Observation", observationSchema);
