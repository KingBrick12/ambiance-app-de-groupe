const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  favorites: [{ type: String, trim: true }]
}, { timestamps: true });

userSchema.set("toJSON", {
  transform(_document, value) {
    delete value.passwordHash;
    delete value.__v;
    return value;
  }
});

module.exports = mongoose.model("User", userSchema);
