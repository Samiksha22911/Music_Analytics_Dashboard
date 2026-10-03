// User storage. Uses MySQL when MYSQL_URL is set (deployment), otherwise a local users.json file (development).
const fs = require("fs");
const path = require("path");

if (process.env.MYSQL_URL) {
  const mysql = require("mysql2/promise");
  const pool = mysql.createPool({
    uri: process.env.MYSQL_URL,
    ssl: process.env.MYSQL_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: false } : undefined,
    connectionLimit: 5,
  });
  module.exports = {
    kind: "mysql",
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    },
    async findByEmail(email) {
      const [rows] = await pool.query("SELECT id, name, email, password_hash AS passwordHash FROM users WHERE email = ?", [email]);
      return rows[0] || null;
    },
    async create({ name, email, passwordHash }) {
      const [r] = await pool.query("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [name, email, passwordHash]);
      return { id: r.insertId, name, email, passwordHash };
    },
  };
} else {
  const FILE = path.join(__dirname, "users.json");
  const load = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : []);
  module.exports = {
    kind: "json-file (development only)",
    async init() {},
    async findByEmail(email) { return load().find((u) => u.email === email) || null; },
    async create({ name, email, passwordHash }) {
      const users = load(); const user = { id: Date.now(), name, email, passwordHash };
      users.push(user); fs.writeFileSync(FILE, JSON.stringify(users, null, 2)); return user;
    },
  };
}
