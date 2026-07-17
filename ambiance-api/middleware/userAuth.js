const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { config } = require("../config");

async function userAuth(req, res, next) {
  const authorization = req.header("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentification requise." });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) throw new Error("Utilisateur introuvable");
    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ error: "INVALID_SESSION", message: "Session invalide ou expirée." });
  }
}

module.exports = userAuth;
