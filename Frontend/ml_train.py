"""
ML layer for the Music Analytics Dashboard.
1) Predicts track popularity from audio features (regression)
2) Builds a content-based song recommender (cosine similarity)
Exports ml_results.json, which analyse.html (ML tabs) reads (same pattern as processing.py -> data.json).

Dataset: Kaggle "Spotify Tracks Dataset" (maharshipandya) -> save as spotify_tracks.csv
Run:  pip install pandas scikit-learn numpy   then   python ml_train.py
"""
import json, sys
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

CSV = sys.argv[1] if len(sys.argv) > 1 else "spotify_tracks.csv"
SEED = 42
FEATURES = ["danceability", "energy", "loudness", "speechiness", "acousticness",
            "instrumentalness", "liveness", "valence", "tempo", "duration_ms",
            "explicit", "mode", "key"]
REC_FEATURES = ["danceability", "energy", "loudness", "speechiness", "acousticness",
                "instrumentalness", "liveness", "valence", "tempo"]

# ---------- 1. CLEAN ----------
df = pd.read_csv(CSV)
n0 = len(df)
df = df.dropna(subset=FEATURES + ["popularity", "track_name", "artists"])
df = df.drop_duplicates(subset=["track_name", "artists"])   # same song appears under many genres
df["explicit"] = df["explicit"].astype(int)
df = df[df["duration_ms"].between(30_000, 900_000)]          # drop broken durations
print(f"Cleaned: {n0} -> {len(df)} rows")

# ---------- 2. POPULARITY PREDICTION ----------
X, y = df[FEATURES], df["popularity"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=SEED)

models = {
    "Ridge Regression": Ridge(alpha=1.0),
    "Random Forest": RandomForestRegressor(n_estimators=150, max_depth=18, min_samples_leaf=3,
                                           n_jobs=-1, random_state=SEED),
    "Gradient Boosting": HistGradientBoostingRegressor(max_iter=300, learning_rate=0.08,
                                                       random_state=SEED),
}
baseline_rmse = float(np.sqrt(mean_squared_error(y_te, np.full(len(y_te), y_tr.mean()))))
results, preds = [], {}
for name, m in models.items():
    m.fit(X_tr, y_tr)
    p = m.predict(X_te)
    preds[name] = p
    results.append({"name": name,
                    "rmse": round(float(np.sqrt(mean_squared_error(y_te, p))), 3),
                    "mae": round(float(mean_absolute_error(y_te, p)), 3),
                    "r2": round(float(r2_score(y_te, p)), 3)})
    print(results[-1])
print("Baseline (predict mean) RMSE:", round(baseline_rmse, 3))

best = max(results, key=lambda r: r["r2"])["name"]
rf = models["Random Forest"]
importance = sorted(({"feature": f, "importance": round(float(i), 4)}
                     for f, i in zip(FEATURES, rf.feature_importances_)),
                    key=lambda d: -d["importance"])
rng = np.random.RandomState(SEED)
idx = rng.choice(len(y_te), size=min(300, len(y_te)), replace=False)
scatter = [{"actual": float(y_te.iloc[i]), "pred": round(float(preds[best][i]), 2)} for i in idx]

# ---------- 3. RECOMMENDER (content-based) ----------
catalog = df.sort_values("popularity", ascending=False).head(600).reset_index(drop=True)
Z = StandardScaler().fit_transform(catalog[REC_FEATURES])
Z = Z / np.linalg.norm(Z, axis=1, keepdims=True)             # unit vectors -> dot product = cosine
catalog_out = [{"id": int(i), "name": r.track_name, "artist": r.artists,
                "popularity": int(r.popularity), "vec": [round(float(v), 4) for v in Z[i]]}
               for i, r in catalog.iterrows()]

# sanity check printed to console
sims = Z @ Z[0]
top = np.argsort(-sims)[1:4]
print(f"Seed: {catalog.track_name[0]} -> ", [catalog.track_name[j] for j in top])

with open("ml_results.json", "w") as f:
    json.dump({"n_rows": int(len(df)), "best_model": best, "baseline_rmse": round(baseline_rmse, 3),
               "models": results, "importance": importance, "scatter": scatter,
               "rec_features": REC_FEATURES, "catalog": catalog_out}, f)
print("Done -> ml_results.json")
