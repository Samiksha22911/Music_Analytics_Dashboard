let playBtn = document.getElementById('play');
let progressBar = document.getElementById('progressBar');

// SONG DATA
let songs = [
    { id: 3, name: "DIE FOR YOU", artist: "The Weeknd", file: "Audio/3.mp3", cover: "images/3.jfif" },
    { id: 4, name: "UNHOLY", artist: "Sam Smith", file: "Audio/4.mp3", cover: "images/4.jfif" },
    { id: 5, name: "COLLIDE", artist: "Justine Skye", file: "Audio/5.mp3", cover: "images/5.jfif" },
    { id: 6, name: "GOOD FOR YOU", artist: "Selena Gomez", file: "Audio/6.mp3", cover: "images/6.jfif" },
    { id: 7, name: "MOCKINGBIRD", artist: "Eminem", file: "Audio/7.mp3", cover: "images/7.jfif" },
    { id: 8, name: "THE FATE OF OPHELIA", artist: "Taylor Swift", file: "Audio/8.mp3", cover: "images/8.jfif" },
];

let currentSongIndex = 0;
let audio = new Audio(songs[currentSongIndex].file);

// PLAY / PAUSE
playBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playBtn.classList.replace('fa-play', 'fa-pause');
    } else {
        audio.pause();
        playBtn.classList.replace('fa-pause', 'fa-play');
    }
});

// CLICK ON SONG
let playMusic = Array.from(document.getElementsByClassName('playMusic'));

playMusic.forEach((element) => {
    element.addEventListener('click', (e) => {

        let songId = parseInt(e.target.id);
        let selectedSong = songs.find(song => song.id === songId);

        if (!selectedSong) return;

        currentSongIndex = songs.indexOf(selectedSong);

        audio.src = selectedSong.file;
        audio.currentTime = 0;
        audio.play();

        playBtn.classList.replace('fa-play', 'fa-pause');

        document.querySelector('.img-title-info').innerText = selectedSong.name;
        document.querySelector('.img-des-info').innerText = selectedSong.artist;
        document.querySelector('.player-bar img').src = selectedSong.cover;
    });
});

// PROGRESS BAR
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
    }
});

// SEEK
progressBar.addEventListener('input', () => {
    if (audio.duration) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
});



/* SEARCH FUNCTIONALITY */

const searchInput = document.getElementById("searchInput");
const cards = document.querySelectorAll(".music-card");
const noResult = document.getElementById("noResult");

searchInput.addEventListener("input", () => {

    let value = searchInput.value.toLowerCase().trim();
    let found = false;

    cards.forEach((card) => {

        let title = card.querySelector(".img-title").innerText.toLowerCase();
        let artist = card.querySelector(".img-description").innerText.toLowerCase();

        // If search box empty → show all
        if (value === "") {
            card.style.display = "block";
            noResult.style.display = "none";
            return;
        }

        //  Match found
        if (title.includes(value) || artist.includes(value)) {
            card.style.display = "block";   // show
            found = true;
        } 
        //  No match
        else {
            card.style.display = "none";    // hide
        }
    });

    //  Show / Hide "Not Found"
    if (!found && value !== "") {
        noResult.style.display = "block";
    } else {
        noResult.style.display = "none";
    }
});