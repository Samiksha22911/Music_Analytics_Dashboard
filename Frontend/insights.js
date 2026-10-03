// One dashboard, four tabs. Charts for a tab are built the first time it is opened.
Chart.defaults.color = "white";
const $ = (id) => document.getElementById(id);
const chart = (id, cfg) => new Chart($(id), cfg);
const getJSON = (url) => fetch(url).then((r) => { if (!r.ok) throw 0; return r.json(); }).catch(() => null);
const noLegend = { legend: { display: false } };
const COLORS = ["#8b5cf6", "#22c55e", "#ec4899", "#facc15", "#06b6d4", "#ef4444", "#f97316"];
const missing = (el, what, cmd) => (el.innerHTML = `<p class="note" style="margin:20px">${what} not found. ${cmd}</p>`);
const ML_HELP = "Run <code>python ml_train.py</code> in the Frontend folder (see README), then reload.";

// ---------- tabs ----------
const built = {};
const builders = { overview: buildOverview, listening: buildListening, predict: buildPredict, recommend: buildRecommend };
function show(tab) {
  document.querySelectorAll(".tab").forEach((s) => (s.hidden = s.id !== "tab-" + tab));
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  if (!built[tab]) { built[tab] = true; builders[tab](); }
  history.replaceState(null, "", "#" + tab);
}
document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => show(b.dataset.tab)));
show(builders[location.hash.slice(1)] ? location.hash.slice(1) : "overview");

// ---------- 1. overview (data.json) ----------
async function buildOverview() {
  const d = await getJSON("data.json");
  if (!d || !d.top_songs) return missing($("tab-overview"), "data.json", "Run <code>python processing.py</code>.");
  $("totalSongs").textContent = d.top_songs.length;
  $("topArtist").textContent = Object.keys(d.top_artists)[0];
  $("avgPop").textContent = (d.top_songs.reduce((a, s) => a + s.popularity, 0) / d.top_songs.length).toFixed(1);
  $("explicitCount").textContent = d.top_songs.filter((s) => s.is_explicit === true).length;

  chart("songChart", { type: "bar",
    data: { labels: d.top_songs.map((s) => s.song), datasets: [{ data: d.top_songs.map((s) => s.popularity), backgroundColor: "#22c55e", borderRadius: 8 }] },
    options: { indexAxis: "y", plugins: noLegend } });
  chart("popChart", { type: "doughnut",
    data: { labels: Object.keys(d.pop_dist), datasets: [{ data: Object.values(d.pop_dist), backgroundColor: ["#3b82f6", "#06b6d4", "#22c55e", "#facc15", "#ef4444"] }] },
    options: { cutout: "65%" } });
  if (Array.isArray(d.year_trend))
    chart("yearChart", { type: "line",
      data: { labels: d.year_trend.map((i) => i.year), datasets: [{ label: "Avg popularity", data: d.year_trend.map((i) => i.popularity),
              borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.2)", fill: true, tension: 0.4, pointRadius: 3 }] } });

  const max = Math.max(...Object.values(d.top_artists)), box = $("artistList");
  Object.entries(d.top_artists).forEach(([name, v], i) => {
    box.insertAdjacentHTML("beforeend", `<div style="margin-bottom:15px"><div style="display:flex;justify-content:space-between"><span>${i + 1}. ${name}</span><span>${v}</span></div><div class="bar"><div class="fill"></div></div></div>`);
    setTimeout(() => (box.children[i].querySelector(".fill").style.width = (v / max) * 100 + "%"), i * 200);
  });
}

// ---------- 2. my listening (localStorage history written by the player) ----------
function buildListening() {
  let hist = []; try { hist = JSON.parse(localStorage.getItem("afm_history")) || []; } catch (e) {}
  const plays = hist.map((h) => ({ ...h, s: songs.find((s) => s.id == h.id) })).filter((p) => p.s);
  const tally = (key) => { const m = {}; plays.forEach((p) => (m[key(p)] = (m[key(p)] || 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  if (!plays.length) {
    ["lPlays", "lUnique", "lArtist", "lGenre"].forEach((id) => ($(id).textContent = "0"));
    return document.querySelectorAll("#tab-listening .card").forEach((c) => c.insertAdjacentHTML("beforeend", '<p class="note">No plays yet - play a song on the home page.</p>'));
  }
  const bySong = tally((p) => p.s.name), byArtist = tally((p) => p.s.artist.split(",")[0].trim()), byGenre = tally((p) => p.s.genre);
  $("lPlays").textContent = plays.length; $("lUnique").textContent = bySong.length;
  $("lArtist").textContent = byArtist[0][0]; $("lGenre").textContent = byGenre[0][0];

  chart("lSongs", { type: "bar", data: { labels: bySong.slice(0, 8).map((x) => x[0]),
    datasets: [{ data: bySong.slice(0, 8).map((x) => x[1]), backgroundColor: "#8b5cf6", borderRadius: 8 }] },
    options: { indexAxis: "y", plugins: noLegend } });
  chart("lGenres", { type: "doughnut", data: { labels: byGenre.map((x) => x[0]),
    datasets: [{ data: byGenre.map((x) => x[1]), backgroundColor: COLORS }] }, options: { cutout: "65%" } });
  const days = [0, 0, 0, 0, 0, 0, 0]; plays.forEach((p) => days[(new Date(p.t).getDay() + 6) % 7]++);
  chart("lDays", { type: "line", data: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ data: days, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.2)", fill: true, tension: 0.4 }] },
    options: { plugins: noLegend } });
  $("lRecent").innerHTML = plays.slice(-6).reverse().map((p) =>
    `<div class="rec"><span>${p.s.name}<br><span class="muted">${p.s.artist}</span></span><span class="muted">${new Date(p.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span></div>`).join("");
}

// ---------- 3 + 4. ML (ml_results.json from ml_train.py) ----------
let mlData;
const loadML = () => (mlData ||= getJSON("ml_results.json"));

async function buildPredict() {
  const d = await loadML();
  if (!d) return missing($("tab-predict"), "ML results", ML_HELP);
  const best = d.models.find((m) => m.name === d.best_model);
  $("mRows").textContent = d.n_rows.toLocaleString(); $("mBest").textContent = d.best_model; $("mR2").textContent = best.r2;
  $("mRmse").textContent = `${best.rmse} vs ${d.baseline_rmse}`;
  const top3 = d.importance.slice(0, 3).map((i) => i.feature).join(", ");
  $("mNote").innerHTML = `<b>How to read this:</b> R&sup2; = ${best.r2} means the model explains about ${Math.round(best.r2 * 100)}% of the differences in song popularity; the rest depends on things audio cannot capture (artist fame, marketing, playlists). On average its guess is off by ${best.mae} popularity points. The features that matter most: <b>${top3}</b>.`;
  chart("modelChart", { type: "bar", data: { labels: d.models.map((m) => m.name),
    datasets: [{ data: d.models.map((m) => m.r2), backgroundColor: "#22c55e", borderRadius: 8 }] }, options: { plugins: noLegend } });
  chart("impChart", { type: "bar", data: { labels: d.importance.map((i) => i.feature),
    datasets: [{ data: d.importance.map((i) => i.importance), backgroundColor: "#8b5cf6", borderRadius: 6 }] },
    options: { indexAxis: "y", plugins: noLegend } });
  chart("scatterChart", { type: "scatter", data: { datasets: [{ data: d.scatter.map((p) => ({ x: p.actual, y: p.pred })),
    backgroundColor: "rgba(236,72,153,.6)", pointRadius: 3 }] },
    options: { plugins: noLegend, scales: { x: { title: { display: true, text: "Actual popularity" } }, y: { title: { display: true, text: "Predicted popularity" } } } } });
}

async function buildRecommend() {
  const d = await loadML();
  if (!d) return missing($("tab-recommend"), "ML results", ML_HELP);
  const label = (s) => `${s.name} - ${s.artist}`, byLabel = new Map(d.catalog.map((s) => [label(s), s]));
  d.catalog.forEach((s) => $("songs").insertAdjacentHTML("beforeend", `<option value="${label(s).replace(/"/g, "&quot;")}">`));
  $("q").addEventListener("input", (e) => {
    const seed = byLabel.get(e.target.value);
    if (!seed) return ($("recs").innerHTML = "");
    const top = d.catalog.filter((s) => s.id !== seed.id)
      .map((s) => ({ s, sim: s.vec.reduce((a, v, i) => a + v * seed.vec[i], 0) })).sort((a, b) => b.sim - a.sim).slice(0, 5);
    $("recs").innerHTML = top.map((t) => `<div class="rec"><span>${t.s.name}<br><span class="muted">${t.s.artist}</span></span><span>${(t.sim * 100).toFixed(0)}% match</span></div>`).join("");
  });
}
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (builders[t]) show(t); });
