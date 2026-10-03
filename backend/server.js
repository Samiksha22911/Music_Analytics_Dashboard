// Auth server for A.Fm: register / login (JWT) / Google sign-in.
require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { OAuth2Client } = require("google-auth-library");
const db = require("./db");
const path = require("path");
const fs = require("fs");

const PROD = process.env.NODE_ENV === "production";
const SECRET = process.env.JWT_SECRET;
if (PROD && !SECRET) { console.error("JWT_SECRET must be set in production"); process.exit(1); }
const JWT_SECRET = SECRET || "dev-secret-change-me";
const PORT = process.env.PORT || 5000;
const ORIGINS = (process.env.FRONTEND_URL || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
if (PROD && !process.env.MYSQL_URL) console.warn("WARNING: MYSQL_URL not set - using users.json, accounts will be lost on restart/redeploy.");
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const makeToken = (u) => jwt.sign({ id: u.id, email: u.email }, JWT_SECRET, { expiresIn: "7d" });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

const app = express();
app.set("trust proxy", 1);                       // behind Render's proxy: needed for correct rate limiting
app.use(cors(ORIGINS.length ? { origin: ORIGINS } : {}));   // set FRONTEND_URL in production
app.use(express.json({ limit: "10kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again in a few minutes." } }));

// Serve the frontend too. express.static supports HTTP Range requests, which the audio seek bar needs
// (python -m http.server does NOT, so seeking fails there).
const FRONTEND_DIR = path.join(__dirname, "..", "Frontend");
if (fs.existsSync(FRONTEND_DIR)) app.use(express.static(FRONTEND_DIR));

app.get("/health", (req, res) => res.json({ ok: true, storage: db.kind }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 6)
      return res.status(400).json({ success: false, message: "Enter a valid email and a password of at least 6 characters." });
    const mail = email.toLowerCase();
    if (await db.findByEmail(mail)) return res.status(409).json({ success: false, message: "Email already registered." });
    const user = await db.create({ name: (name || mail.split("@")[0]).slice(0, 100), email: mail, passwordHash: await bcrypt.hash(password, 10) });
    res.json({ success: true, token: makeToken(user), user: publicUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Server error." }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await db.findByEmail(String(email || "").toLowerCase());
    if (!user || !user.passwordHash || !(await bcrypt.compare(String(password || ""), user.passwordHash)))
      return res.status(401).json({ success: false, message: "Invalid Email or Password" });
    res.json({ success: true, token: makeToken(user), user: publicUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Server error." }); }
});

app.post("/api/auth/google", async (req, res) => {
  if (!googleClient) return res.status(501).json({ success: false, message: "Google login is not configured (set GOOGLE_CLIENT_ID)." });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: req.body.token, audience: process.env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p.email || !p.email_verified) return res.status(401).json({ success: false, message: "Google email not verified." });
    const mail = p.email.toLowerCase();
    let user = await db.findByEmail(mail);
    if (!user) user = await db.create({ name: (p.name || mail.split("@")[0]).slice(0, 100), email: mail,
                                        passwordHash: await bcrypt.hash(require("crypto").randomBytes(32).toString("hex"), 10) });
    res.json({ success: true, token: makeToken(user), user: publicUser(user) });
  } catch (e) { res.status(401).json({ success: false, message: "Invalid Google token." }); }
});

db.init().then(() => app.listen(PORT, () => console.log(`Auth server on port ${PORT} | storage: ${db.kind}`)))
  .catch((e) => { console.error("Database init failed:", e.message); process.exit(1); });
