// A.Fm player: data-driven UI (songs.js), playlists, search, genre browse, recommendations, downloads.
let playBtn = document.getElementById("play");          // auth-gate.js relies on these two globals
let audio = new Audio();
const progressBar = document.getElementById("progressBar");
audio.volume = 0.8;

const $ = (s) => document.querySelector(s);
const LS = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
             set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
const byId = (id) => songs.find((s) => s.id == id);
const state = { query: "", genre: "All", queue: [], cur: -1, shuffle: false, repeat: 0, view: null };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (t) => (isFinite(t) ? Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0") : "0:00");

// ---------- small UI helpers ----------
let toastTimer;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.style.display = "block";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.style.display = "none"), 2600); }
function dialog(title, html) {
  const d = document.createElement("div"); d.className = "dlg";
  d.innerHTML = `<div><h3>${title}</h3>${html}</div>`;
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.remove(); });
  document.body.appendChild(d); return d;
}
const scrollTo = (sel) => $(sel).scrollIntoView({ behavior: "smooth", block: "start" });

// ---------- data ----------
const getPl = () => LS.get("afm_playlists", {});
const getHist = () => LS.get("afm_history", []);
function logPlay(id) { const h = getHist(); h.push({ id, t: Date.now() }); LS.set("afm_history", h.slice(-300)); }

function filtered() {
  const q = state.query.toLowerCase();
  return songs.filter((s) => (state.genre === "All" || s.genre === state.genre) &&
    (!q || [s.name, s.artist, s.genre, ...s.tags].join(" ").toLowerCase().includes(q)));
}

function recommend() {
  const hist = getHist(), seed = hist.length ? byId(hist[hist.length - 1].id) : null;
  const counts = {}; hist.forEach((h) => (counts[h.id] = (counts[h.id] || 0) + 1));
  const list = songs.filter((s) => s.file && (!seed || s.id !== seed.id)).map((s) => ({ s,
    score: (seed ? (s.genre === seed.genre) * 3 + (s.artist === seed.artist) * 2 + s.tags.filter((t) => seed.tags.includes(t)).length : 0)
           + 0.1 * (counts[s.id] || 0) }));
  list.sort((a, b) => b.score - a.score);
  return { seed, items: list.slice(0, 5).map((x) => x.s) };
}

// ---------- render ----------
function card(s, opt = {}) {
  return `<div class="music-card" data-id="${s.id}">
    <img src="${s.cover}" alt="" onerror="this.onerror=null;this.src='unnamed.jpg'">
    <div class="music-play-btn"><i data-id="${s.id}" class="playMusic fa-solid fa-circle-play"></i></div>
    ${opt.pl ? `<button class="card-add" data-rm="${s.id}" title="Remove from playlist">&times;</button>`
             : `<button class="card-add" data-add="${s.id}" title="Add to playlist">+</button>`}
    <div class="img-title">${s.name}</div><div class="img-description">${s.artist}</div>
    ${s.file ? "" : '<div class="badge">Audio not added</div>'}
    ${opt.dl && s.file ? `<a class="dl-btn" data-dl href="${s.file}" download="${s.artist} - ${s.name}.mp3"><i class="fa-solid fa-download"></i> Download</a>` : ""}
  </div>`;
}
const fill = (sel, list, opt) => ($(sel).innerHTML = list.length ? list.map((s) => card(s, opt)).join("") : '<p class="empty">Nothing here yet.</p>');

function renderRecommended() {
  const { seed, items } = recommend();
  $("#recTitle").textContent = seed ? `Because you played ${seed.name}` : "Recommended for you";
  fill("#recommended", items);
}
function renderPlaylists() {
  const pl = getPl(), names = Object.keys(pl);
  $("#playlists").innerHTML = names.map((n) => `<div class="pl-item" data-pl="${esc(n)}"><span>${esc(n)}</span><span>${pl[n].length}</span></div>`).join("");
}
function renderPlaylistView() {
  const sec = $("#playlistSection"), pl = getPl();
  if (!state.view || !pl[state.view]) { sec.style.display = "none"; return; }
  const list = pl[state.view].map(byId).filter(Boolean);
  sec.style.display = "block";
  sec.innerHTML = `<div class="pl-head"><h2>Playlist: ${esc(state.view)}</h2><button data-playall>Play all</button><button data-closepl>Close</button><button data-delpl>Delete</button></div>
    <div class="songs">${list.length ? list.map((s) => card(s, { pl: true })).join("") : '<p class="empty">Empty - use the + on any song to add it.</p>'}</div>`;
}
function renderAll() {
  const list = filtered();
  fill("#popular", list);
  fill("#downloads", list.filter((s) => s.file), { dl: true });
  $("#noResult").style.display = list.length ? "none" : "block";
  $("#chips").innerHTML = ["All", ...new Set(songs.map((s) => s.genre))]
    .map((g) => `<button class="chip ${g === state.genre ? "on" : ""}" data-genre="${g}">${g}</button>`).join("");
  renderRecommended(); renderPlaylists(); renderPlaylistView();
}

// ---------- playback ----------
const setPlayIcon = (playing) => { playBtn.classList.toggle("fa-pause", playing); playBtn.classList.toggle("fa-play", !playing); };

function play(id, ids) {
  const s = byId(id); if (!s) return;
  if (!s.file) return toast(`"${s.name}" has no audio yet - add Audio/${s.id}.mp3 and set file in songs.js`);
  if (ids) state.queue = ids.map(Number).filter((i) => byId(i) && byId(i).file);
  if (!state.queue.includes(s.id)) state.queue = songs.filter((x) => x.file).map((x) => x.id);
  state.cur = state.queue.indexOf(s.id);
  audio.src = s.file; audio.play().catch(() => {}); setPlayIcon(true);
  $(".img-title-info").innerText = s.name; $(".img-des-info").innerText = s.artist; $("#pbCover").src = s.cover;
  logPlay(s.id); renderRecommended();
}
function step(dir) {
  const q = state.queue; if (!q.length) return;
  let i;
  if (state.shuffle && dir > 0 && q.length > 1) { do { i = Math.floor(Math.random() * q.length); } while (i === state.cur); }
  else i = (state.cur + dir + q.length) % q.length;
  play(q[i]);
}
playBtn.addEventListener("click", () => {
  if (!audio.src) { const first = songs.find((s) => s.file); return first && play(first.id); }
  if (audio.paused) { audio.play(); setPlayIcon(true); } else { audio.pause(); setPlayIcon(false); }
});
$("#forward").onclick = () => step(1);
$("#backward").onclick = () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1));
$("#shuffle").onclick = () => { state.shuffle = !state.shuffle; $("#shuffle i").classList.toggle("active", state.shuffle);
  toast(state.shuffle ? "Shuffle on" : "Shuffle off"); };
$("#repeat").onclick = () => { state.repeat = (state.repeat + 1) % 3; $("#repeat").dataset.mode = state.repeat;
  $("#repeat i").classList.toggle("active", state.repeat > 0); toast(["Repeat off", "Repeat all", "Repeat one"][state.repeat]); };
audio.addEventListener("ended", () => {
  if (state.repeat === 2) { audio.currentTime = 0; audio.play(); }
  else if (state.repeat === 0 && !state.shuffle && state.cur === state.queue.length - 1) setPlayIcon(false);
  else step(1);
});
let seeking = false;
const paintBar = () => progressBar.style.setProperty("--p", progressBar.value + "%");
audio.addEventListener("timeupdate", () => {
  if (audio.duration && !seeking) { progressBar.value = (audio.currentTime / audio.duration) * 100; paintBar(); }
  if (!seeking) $("#curTime").textContent = fmt(audio.currentTime);
});
audio.addEventListener("loadedmetadata", () => ($("#durTime").textContent = fmt(audio.duration)));
audio.addEventListener("error", () => { if (audio.src) { toast("Could not load this audio file"); setPlayIcon(false); } });
["pointerdown", "touchstart"].forEach((ev) => progressBar.addEventListener(ev, () => (seeking = true), { passive: true }));
progressBar.addEventListener("input", () => { paintBar(); if (audio.duration) $("#curTime").textContent = fmt((progressBar.value / 100) * audio.duration); });
progressBar.addEventListener("change", () => {          // jump when the user lets go (also fires for keyboard / click)
  if (audio.duration) {
    const target = (progressBar.value / 100) * audio.duration;
    audio.currentTime = target;
    setTimeout(() => { if (Math.abs(audio.currentTime - target) > 3)
      toast("This server can't skip ahead. Run 'npm start' in backend/ and open http://localhost:5000"); }, 600);
  }
  seeking = false;
});
$("#volume").addEventListener("input", (e) => (audio.volume = e.target.value));
document.addEventListener("keydown", (e) => { if (e.code === "Space" && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); playBtn.click(); } });

// ---------- playlists ----------
function createPlaylist(afterCreate) {
  const d = dialog("New playlist", `<input id="plName" placeholder="Playlist name" maxlength="40"><button class="ok" id="plOk">Create</button><button data-close>Cancel</button>`);
  const input = d.querySelector("#plName"); input.focus();
  const ok = () => { const n = input.value.trim(); if (!n) return; const pl = getPl();
    if (pl[n]) return toast("A playlist with that name already exists");
    pl[n] = []; LS.set("afm_playlists", pl); d.remove(); renderPlaylists(); toast(`Created "${n}"`); afterCreate && afterCreate(n); };
  d.querySelector("#plOk").onclick = ok; input.addEventListener("keydown", (e) => { if (e.key === "Enter") ok(); });
}
function addToPlaylist(id) {
  const names = Object.keys(getPl());
  if (!names.length) return createPlaylist((n) => addTo(n, id));
  const d = dialog("Add to playlist", names.map((n) => `<div class="pl-item" data-addto="${esc(n)}">${esc(n)}</div>`).join("") +
    `<button class="ok" id="plNew">New playlist</button><button data-close>Cancel</button>`);
  d.querySelector("#plNew").onclick = () => { d.remove(); createPlaylist((n) => addTo(n, id)); };
  d.querySelectorAll("[data-addto]").forEach((el) => (el.onclick = () => { addTo(el.dataset.addto, id); d.remove(); }));
}
function addTo(name, id) { const pl = getPl(); if (pl[name].includes(+id)) return toast("Already in this playlist");
  pl[name].push(+id); LS.set("afm_playlists", pl); renderAll(); toast(`Added to "${name}"`); }

function showPlaylists() {
  const pl = getPl(), names = Object.keys(pl);
  const d = dialog("My playlists", (names.length
    ? names.map((n, i) => `<div class="pl-item" data-i="${i}"><span>${esc(n)}</span><span>${pl[n].length} songs</span></div>`).join("")
    : '<p class="empty">You have no playlists yet.</p>') + '<button class="ok" id="plNew2">+ New playlist</button><button data-close>Close</button>');
  d.querySelectorAll("[data-i]").forEach((el) => (el.onclick = () => { state.view = names[el.dataset.i]; d.remove(); renderPlaylistView(); scrollTo("#playlistSection"); }));
  d.querySelector("#plNew2").onclick = () => { d.remove(); createPlaylist(); };
}

// ---------- clicks ----------
document.addEventListener("click", (e) => {
  const t = e.target, q = (sel) => t.closest(sel);
  if (q(".playMusic")) { const sec = q("[data-queue]"); return play(q(".playMusic").dataset.id,
      sec ? [...sec.querySelectorAll(".playMusic")].map((i) => i.dataset.id) : null); }
  if (q("[data-add]")) return addToPlaylist(q("[data-add]").dataset.add);
  if (q("[data-rm]")) { const pl = getPl(); pl[state.view] = pl[state.view].filter((i) => i != q("[data-rm]").dataset.rm);
    LS.set("afm_playlists", pl); return renderAll(); }
  if (q("[data-dl]")) { if (!window.isLoggedIn || !window.isLoggedIn()) { e.preventDefault();
    window.showLoginModal && window.showLoginModal("Please log in to download songs."); } return; }
  if (q("[data-genre]")) { state.genre = q("[data-genre]").dataset.genre; renderAll(); return scrollTo("#popular"); }
  if (q("[data-pl]")) { state.view = q("[data-pl]").dataset.pl; renderPlaylistView(); return scrollTo("#playlistSection"); }
  if (q("[data-playall]")) { const ids = (getPl()[state.view] || []).filter((i) => byId(i) && byId(i).file);
    return ids.length ? play(ids[0], ids) : toast("No playable songs in this playlist yet"); }
  if (q("#navPlaylists")) return showPlaylists();
  if (q("[data-closepl]")) { state.view = null; return renderPlaylistView(); }
  if (q("[data-delpl]")) { if (!confirm(`Delete playlist "${state.view}"?`)) return; const pl = getPl(); delete pl[state.view];
    LS.set("afm_playlists", pl); state.view = null; return renderAll(); }
  if (q("#createPl, #libPlus")) return createPlaylist();
  if (q("#browseBtn, #browseIcon")) return scrollTo("#genreSection");
  if (q("#navDownload")) return scrollTo("#downloadSection");
  if (q("#homeBtn")) { state.query = ""; state.genre = "All"; $("#searchInput").value = ""; renderAll(); $(".main-right-part").scrollTo({ top: 0, behavior: "smooth" }); }
});
$("#searchInput").addEventListener("input", (e) => { state.query = e.target.value.trim(); renderAll(); });

renderAll();
