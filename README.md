# A.Fm - Music Player + Analytics + ML Insights

A full-stack music web app: stream songs with a custom player, log in with email or Google, build playlists, and explore your listening through an analytics dashboard with a machine-learning model that predicts what makes a song popular.

**Live demo:** https://music-analytics-dashboard-teal.vercel.app  |  **API health check:** https://music-analytics-dashboard-ax3w.onrender.com/health

> The free backend sleeps when idle, so the first request after a pause can take 30-60 seconds.

## Screenshots

| Player | Insights dashboard |
|---|---|
| ![Player](docs/screenshots/player-desktop.png) | ![Insights](docs/screenshots/insights-overview.png) |

| Mobile player | Login |
|---|---|
| <img src="docs/screenshots/player-mobile.png" width="260" alt="Mobile player"> | ![Login](docs/screenshots/login.png) |

## Why I built this

I wanted one project that covers the whole path: a real web app with users and a database, the data work (cleaning, analysis, charts), and a machine-learning model that is trained, evaluated honestly and shown inside the product, instead of staying in a notebook.

## Features

**Music player**
- Play, pause, previous/next, seek bar, volume, shuffle and repeat (off / all / one), keyboard Space to play and pause
- Search by song, artist, genre or mood; browse by genre
- Playlists: create, add and remove songs, play all, open them from the navbar
- Recommended section that adapts to what you played last (genre, artist and mood overlap)
- Song downloads for logged-in users
- Responsive layout for phones, tablets and desktops

**Accounts**
- Register and log in with email and password, or with Google
- Guests can listen for 60 seconds, then a login prompt appears (configurable in `auth-gate.js`)

**Music Insights dashboard (one page, four tabs)**
- **Overview:** top songs, popularity distribution, year trend and top artists from a cleaned dataset (Python + pandas)
- **What Makes a Hit:** ML model comparison, feature importance and actual vs predicted popularity
- **Recommender:** pick a song and get similar songs by audio features

## Machine learning

- **Data:** Kaggle Spotify Tracks Dataset (about 114k tracks with audio features and a popularity score); about 81k tracks remain after cleaning
- **Cleaning:** drop missing values, remove duplicate tracks (the same song appears under many genres), filter invalid durations
- **Task 1 - popularity regression:** Ridge Regression, Random Forest and Gradient Boosting, compared with a "predict the average" baseline using RMSE, MAE and R² on a held-out 20% test set
- **Task 2 - recommender:** audio features are standardised and songs are ranked by cosine similarity; the similarity runs in the browser
- **Output:** `ml_train.py` writes `ml_results.json`, which the dashboard reads (same pattern as `processing.py` -> `data.json`)

### Results

| Model | RMSE | MAE | R² |
|---|---|---|---|
| Baseline (predict mean) | 19.37 | - | 0.00 |
| Ridge Regression | 18.76 | 15.36 | 0.06 |
| **Random Forest** | **17.69** | **13.93** | **0.17** |
| Gradient Boosting | 17.72 | 14.02 | 0.16 |

**Takeaway:** Random Forest performed best (RMSE 17.69 vs 19.37 for the baseline), with Gradient Boosting almost tied and Ridge Regression clearly behind, which suggests the relationship between audio features and popularity is non-linear. The most important features were acousticness, instrumentalness and duration, followed by danceability, speechiness and valence.

**Honest limitation:** audio features explain only part of a song's popularity (the best model reaches R² of about 0.17). Artist fame, marketing and playlist placement are not in the data, so a modest R² is expected.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (no framework), Chart.js |
| Backend | Node.js, Express 5 |
| Database | MySQL (mysql2) |
| Auth | JWT, bcryptjs, Google Identity Services |
| Data / ML | Python, pandas, scikit-learn |
| Hosting | Vercel (frontend), Render (API), Aiven (MySQL) |

## Project structure

```
.
├── Frontend/
│   ├── index.html, style.css, app.css      player page
│   ├── songs.js, script.js                 song catalog, playback, playlists, recommendations
│   ├── auth-gate.js                        guest preview limit + login prompt
│   ├── login.html, register.html           auth pages
│   ├── analyse.html, insights.js           Insights dashboard (4 tabs)
│   ├── processing.py, data.csv, data.json  data cleaning for the Overview tab
│   ├── ml_train.py                         ML training script -> ml_results.json
│   ├── config.js                           backend URL
│   └── Audio/, images/
├── backend/
│   ├── server.js                           Express app, mounts routes, serves Frontend
│   ├── config/                             env.js, db.js (MySQL pool + tables)
│   ├── middleware/auth.js                  JWT check
│   ├── routes/ controllers/ models/        auth, playlists, songs, analytics
│   └── schema.sql, .env.example
├── docs/screenshots/
├── render.yaml, DEPLOY.md, AUTH_SETUP.md
```

## Run it locally

You need Node.js 20+, MySQL (for example MySQL Workbench with a local server) and Python 3 for the ML part.

```bash
# 1. database: in MySQL run  CREATE DATABASE afm;
# 2. backend settings
cd backend
cp .env.example .env        # then fill in DB_USER, DB_PASSWORD, JWT_SECRET
npm install
npm start                   # http://localhost:5000  (also serves the frontend)
```

Open http://localhost:5000. Tables are created automatically on start. Full walkthrough: `AUTH_SETUP.md`.

**ML results (optional):**

```bash
pip install pandas scikit-learn numpy
# download the Kaggle "Spotify Tracks Dataset" and save it as Frontend/spotify_tracks.csv
cd Frontend && python ml_train.py     # creates ml_results.json
```

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | signs login tokens (required in production) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | local MySQL |
| `MYSQL_URL`, `MYSQL_SSL`, `MYSQL_SSL_STRICT` | cloud MySQL instead of the `DB_*` lines |
| `GOOGLE_CLIENT_ID` | enables Google sign-in |
| `FRONTEND_URL` | allowed origin when the frontend is on another domain |

## API

All responses are JSON. Everything except register, login and Google needs `Authorization: Bearer <token>`.

| Method and path | Description |
|---|---|
| `POST /api/auth/register`, `/login`, `/google` | create account / sign in |
| `GET /api/auth/me` | current user |
| `GET /api/playlists`, `POST /api/playlists` | list / create playlists |
| `DELETE /api/playlists/:id` | delete a playlist |
| `POST /api/playlists/:id/songs`, `DELETE /api/playlists/:id/songs/:songId` | add / remove a song |
| `POST /api/playlists/import` | merge guest playlists into the account |
| `POST /api/songs/play`, `GET /api/songs/history` | log a play / recent plays |
| `GET /api/analytics/summary` | totals, top songs and weekday counts (SQL aggregation) |

## Deployment

- **Backend:** Render web service with root directory `backend`, plus the environment variables above
- **Database:** cloud MySQL (Aiven or similar); the server creates the tables on first start
- **Frontend:** Vercel (static); set `PROD_API_URL` in `Frontend/config.js` to the Render URL and add the Vercel URL to `FRONTEND_URL` on Render
- Alternatively `render.yaml` deploys everything as one service. Step-by-step: `DEPLOY.md`

## Security

- Passwords are stored only as bcrypt hashes; tokens are JWTs that expire after 7 days
- Rate limiting on auth routes, CORS limited to the configured frontend, request size limits
- All SQL uses parameterised queries; inputs are validated; users can only access their own playlists and history
- Secrets live in environment variables and `.env` is git-ignored

## Limitations and next steps

- The 60-second guest limit and the download lock are enforced in the browser; serving audio only to authenticated users would make them server-side
- The song catalog is small and the Overview dataset has about 14 songs, so the Overview tab is a demo of the pipeline rather than a statistical study
- Ideas: interactive "predict popularity" sliders backed by a small Python API, upload-your-own-CSV analysis, recommender evaluation (precision@k) against a most-popular baseline, automated tests

## Author

**Samiksha Sharma** - Madhav Institute of Technology & Science, Gwalior (M.P.), INDIA Deemed University 
[LinkedIn](https://www.linkedin.com/) 
[GitHub](https://github.com/)

*Song audio and cover art belong to their respective owners and are used here only to demonstrate the application. Remove them before reusing the project commercially.*
