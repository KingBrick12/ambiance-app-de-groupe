const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const userAuth = require("../middleware/userAuth");
const { config } = require("../config");

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
  try {
    const displayName = typeof req.body.displayName === "string" ? req.body.displayName.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;
    if (displayName.length < 2 || !EMAIL_PATTERN.test(email) || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Nom (2 caractères), courriel valide et mot de passe (8 caractères) requis." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: "EMAIL_ALREADY_USED", message: "Cette adresse courriel est déjà utilisée." });
    }
    const user = await User.create({ displayName, email, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ message: "Compte créé avec succès.", data: { user, token: signToken(user) } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "EMAIL_ALREADY_USED", message: "Cette adresse courriel est déjà utilisée." });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Impossible de créer le compte." });
  }
});

router.post("/login", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || typeof req.body.password !== "string" || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Courriel ou mot de passe incorrect." });
  }
  user.passwordHash = undefined;
  return res.json({ message: "Connexion réussie.", data: { user, token: signToken(user) } });
});

router.get("/me", userAuth, (req, res) => res.json({ data: req.user }));

function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

module.exports = router;
