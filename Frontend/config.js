// Where the login API lives.
// - Served by the backend (http://localhost:5000, or deployed as ONE service): same origin -> ""
// - Opened from a separate dev server (VS Code Live Server 5500, python http.server 8000...) or file:// -> localhost:5000
// - Frontend hosted separately (Netlify/Vercel/GitHub Pages): put your backend URL in PROD_API_URL
const PROD_API_URL = "https://music-analytics-dashboard-ax3w.onrender.com";
const DEV_STATIC_PORTS = ["5500", "5501", "8000", "8080", "3000"];
const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname);
const API_URL = isLocal ? (DEV_STATIC_PORTS.includes(location.port) || location.protocol === "file:" ? "http://localhost:5000" : "") : PROD_API_URL;
