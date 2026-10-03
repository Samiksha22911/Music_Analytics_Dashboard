Music Player with User Analytics

Project Overview
This project is a web-based **Music Player with User Analytics** that combines a simple music player interface with a data analytics dashboard. It allows users to play songs and view insights such as popular songs and artist trends.

**Features**
- Music Player
- Play and pause songs  
- Display song list with album images  
- Uses locally stored audio files  
- Simple and interactive UI  

**Analytics Dashboard**
- Top 10 songs by popularity  
- Top artists by frequency  
- Popularity distribution  
- Year-wise trend analysis  
- Graphs and charts visualization  

**Technologies Used**
- HTML, CSS, JavaScript  
- Python  
- Pandas  
- CSV (Dataset)  
- JSON (Processed Data)  
- Chart.js  

**Workflow**
1. Load dataset from CSV file  
2. Process data using Python (Pandas)  
3. Extract insights (top songs, artists, etc.)  
4. Convert data into JSON format  
5. Display graphs using JavaScript on analytics page  

**Project Structure**
Spotify-Clone/
│── index.html
│── analysis.html
│── style.css
│── script.js
│── chart.js
│── data_processing.py
│── data.csv
│── data.json
│── assets/
│ ├── songs/
│ ├── images/

**How to Run**
1. Run Python file:
2. Open `index.html` in browser  
3. Click on **Analysis** to view analytics  

**Output**
- Music Player Interface  
- Analytics Dashboard with Graphs  
- JSON Data for Visualization  

**Future Scope**
- Add user login system  
- Use real-time data (API)  
- Add recommendation system  
- Improve UI/UX  

**Conclusion**
This project shows how **web development and data science** can be combined to create an interactive system that plays music and provides useful insights.

**Author**
- Samiksha Sharma

---

## ML Extension (added)
- `ml_train.py` - trains Ridge / Random Forest / Gradient Boosting models to predict song popularity from audio features, and builds a content-based recommender (cosine similarity). Exports `ml_results.json`.
- `analyse.html` + `insights.js` - one "Music Insights" page with 4 tabs: Overview, My Listening, What Makes a Hit (ML), Recommender.

**How to run the ML part**
1. Download the Kaggle "Spotify Tracks Dataset" (maharshipandya) and save it as `Frontend/spotify_tracks.csv`
2. `pip install pandas scikit-learn numpy`
3. `cd Frontend && python ml_train.py` (creates ml_results.json - it is NOT included, run it on your real dataset)
4. `python -m http.server` in `Frontend/`, then open `http://localhost:5000/analyse.html#predict`

---

## Login gate (added)
- `auth-gate.js` - guests can listen for 60 seconds in total, then playback stops and a login popup appears. Change `GUEST_PREVIEW_SECONDS` at the top of the file (0 = block playing until login).
- `register.html`, `login.css` - sign-up page and the missing stylesheet for the login page.
- `backend/server.js` - small auth server (register / login with JWT). Run: `cd backend && npm install && npm start` (port 5000). Users are saved in `backend/users.json`.
- Google sign-in is not configured yet (server returns a "not configured" message).

---

## Player upgrade (added)
- `songs.js` - song catalog. To add a song: put the mp3 in `Audio/`, the cover in `images/`, add one line.
- `app.css` - compact player bar. `script.js` - rewritten: working shuffle / prev / next / repeat, time + volume, playlists (saved in browser), genre browse, search, downloads (login required), recommendations from listening history.

## Responsive layout (added)
Responsive rules live at the bottom of `app.css` (player page) and `styles.css` (analytics + ML pages). Breakpoints: 900px (tablet), 760px (compact player), 480px (phone).

## Deployment
See `DEPLOY.md` in the project root (Render + MySQL, step by step).

## Run locally (recommended)
    cd backend && npm install && npm start
Then open http://localhost:5000 . The backend serves the frontend too, which supports HTTP Range requests,
so the song seek bar works. (`python -m http.server` does not support Range, so seeking fails there.)
