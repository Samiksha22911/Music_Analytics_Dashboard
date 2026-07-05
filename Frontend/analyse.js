Chart.defaults.color = "white";

fetch("data.json")
.then(res => res.json())
.then(data => {

  console.log("DATA:", data); // debug

  // SAFETY CHECKS
  if (!data.top_songs || !data.top_artists || !data.pop_dist) {
    alert("Data format issue. Check data.json");
    return;
  }

  //  GRADIENTS
  const ctx = document.getElementById("songChart").getContext("2d");
  const gradientPink = ctx.createLinearGradient(0,0,400,0);
  gradientPink.addColorStop(0, "#ec4899");
  gradientPink.addColorStop(1, "#8b5cf6");

  const ctx2 = document.getElementById("yearChart").getContext("2d");
  const gradientGreen = ctx2.createLinearGradient(0,0,0,400);
  gradientGreen.addColorStop(0, "#22c55e");
  gradientGreen.addColorStop(1, "#4ade80");

  // STATS
  document.getElementById("totalSongs").textContent = data.top_songs.length;
  document.getElementById("topArtist").textContent = Object.keys(data.top_artists)[0];

  const avg = data.top_songs.reduce((a,b)=>a+b.popularity,0)/data.top_songs.length;
  document.getElementById("avgPop").textContent = avg.toFixed(1);

  document.getElementById("explicitCount").textContent =
    data.top_songs.filter(s => s.is_explicit === true).length;

  // MOST PLAYED SONGS
  new Chart(document.getElementById("songChart"), {
    type: "bar",
    data: {
      labels: data.top_songs.map(s => s.song),
      datasets: [{
        data: data.top_songs.map(s => s.popularity),
        backgroundColor: gradientGreen,
        borderRadius: 10
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } }
    }
  });

  // DONUT
  new Chart(document.getElementById("popChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(data.pop_dist),
      datasets: [{
        data: Object.values(data.pop_dist),
        backgroundColor: ["#3b82f6","#06b6d4","#22c55e","#facc15","#ef4444"]
      }]
    },
    options: { cutout: "70%" }
  });

  // ACTIVITY
  new Chart(document.getElementById("activityChart"), {
    type: "line",
    data: {
      labels: ["Mon","Tue","Wed","Thu" , "Fri", "Sat", "Sun"],
      datasets: [{
        data: [45,32,50,40,30,60,10],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.2)",
        fill: true,
        tension: 0.4
      }]
    },
    options: { plugins: { legend: { display: false } } }
  });

// YEAR TREND
if (data.year_trend && Array.isArray(data.year_trend)) {

  const ctx = document.getElementById("yearChart").getContext("2d");

  // CREATE GRADIENT (IMPORTANT FIX)
  const gradientGreen = ctx.createLinearGradient(0, 0, 0, 400);
  gradientGreen.addColorStop(0, "rgba(34, 197, 94, 0.5)");
  gradientGreen.addColorStop(1, "rgba(34, 197, 94, 0)");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.year_trend.map(i => i.year),
      datasets: [{
        label: "Popularity Trend",
        data: data.year_trend.map(i => i.popularity),
        borderColor: "#22c55e",
        backgroundColor: gradientGreen,
        fill: true,
        tension: 0.4,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}

  //  TOP ARTISTS
  const container = document.getElementById("artistList");
  container.innerHTML = "";

  const max = Math.max(...Object.values(data.top_artists));

  Object.entries(data.top_artists).forEach(([name, value], index) => {

    const percent = (value / max) * 100;

    const div = document.createElement("div");
    div.innerHTML = `
      <div style="margin-bottom:15px;">
        <div style="display:flex; justify-content:space-between;">
          <span>${index+1}. ${name}</span>
          <span>${value}</span>
        </div>
        <div class="bar">
          <div class="fill"></div>
        </div>
      </div>
    `;

    container.appendChild(div);

    setTimeout(() => {
      div.querySelector(".fill").style.width = percent + "%";
    }, index * 200);
  });

})
.catch(err => {
  console.error(err);
  alert("Failed to load data.json");
});
