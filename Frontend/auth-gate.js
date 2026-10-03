/* Login gate for the player.
   Guests can listen for GUEST_PREVIEW_SECONDS in total, then playback stops and a login prompt appears.
   Set GUEST_PREVIEW_SECONDS = 0 to block playing completely until the user logs in.
   Works with the token that login.html already saves in localStorage. Needs script.js loaded first. */
(function () {
  const GUEST_PREVIEW_SECONDS = 60;
  const KEY = "guestListened";
  let listened = parseInt(sessionStorage.getItem(KEY)) || 0;

  function loggedIn() {
    const t = localStorage.getItem("token");
    if (!t) return false;
    try {   // if it is a JWT, honour its expiry
      const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (p.exp && p.exp * 1000 < Date.now()) {
        localStorage.removeItem("token"); localStorage.removeItem("user");
        return false;
      }
    } catch (e) {}
    return true;
  }

  // ----- popup -----
  const css = document.createElement("style");
  css.textContent = `
    #authModal{position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;z-index:9999;font-family:Montserrat,Arial,sans-serif}
    #authModal .box{background:#181818;color:#fff;padding:32px;border-radius:14px;max-width:380px;text-align:center}
    #authModal h2{margin:0 0 10px} #authModal p{color:#b3b3b3;margin:0 0 22px}
    #authModal a,#authModal button{display:inline-block;padding:10px 24px;border-radius:30px;border:0;font-weight:700;cursor:pointer;text-decoration:none;margin:4px}
    #authModal .go{background:#1ed760;color:#000} #authModal .no{background:transparent;color:#b3b3b3}`;
  document.head.appendChild(css);

  const modal = document.createElement("div");
  modal.id = "authModal";
  modal.innerHTML = `<div class="box"><h2>Log in to keep listening</h2><p id="authMsg"></p>
    <a class="go" href="login.html">Log in</a><a class="go" href="register.html">Sign up</a><br>
    <button class="no" id="authClose">Not now</button></div>`;
  document.body.appendChild(modal);
  document.getElementById("authClose").onclick = () => (modal.style.display = "none");

  function showModal(msg) {
    document.getElementById("authMsg").textContent = msg ? msg : GUEST_PREVIEW_SECONDS > 0
      ? "Your free preview has ended. Log in to continue playing songs."
      : "Please log in to play songs.";
    modal.style.display = "flex";
  }

  window.isLoggedIn = loggedIn;
  window.showLoginModal = showModal;

  // ----- block play clicks once the preview is used up (capture phase runs before script.js handlers) -----
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".playMusic, #play")) return;
    if (loggedIn() || listened < GUEST_PREVIEW_SECONDS) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showModal();
  }, true);

  // ----- count listening time for guests -----
  setInterval(() => {
    if (loggedIn() || audio.paused) return;
    listened++;
    sessionStorage.setItem(KEY, listened);
    if (listened >= GUEST_PREVIEW_SECONDS) {
      audio.pause();
      playBtn.classList.replace("fa-pause", "fa-play");
      showModal();
    }
  }, 1000);

  // ----- navbar: show name + logout when logged in -----
  const slot = document.querySelector(".right-half-p2 .nav-text");
  if (slot && loggedIn()) {
    let u = {};
    try { u = JSON.parse(localStorage.getItem("user")) || {}; } catch (e) {}
    slot.innerHTML = `${u.name || u.email || "Account"} · <a href="#" id="logoutLink">Log out</a>`;
    document.getElementById("logoutLink").onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem("token"); localStorage.removeItem("user");
      location.reload();
    };
  }
})();
