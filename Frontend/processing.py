import pandas as pd
import json

df = pd.read_csv("data.csv")

# CLEAN
df = df.dropna()

# TOP SONGS
top_songs = df.sort_values(by="popularity", ascending=False).head(10)

# TOP ARTISTS
top_artists = df['artist'].value_counts().head(5)

# POPULARITY DISTRIBUTION
bins = [0, 20, 40, 60, 80, 100]
labels = ["0-20", "20-40", "40-60", "60-80", "80-100"]

df['pop_range'] = pd.cut(df['popularity'], bins=bins, labels=labels)
pop_dist = df['pop_range'].value_counts()

# ✅ FIXED YEAR TREND (IMPORTANT CHANGE)
df['year'] = pd.to_numeric(df['year'], errors='coerce')

df = df.dropna(subset=['year'])  # remove invalid years

df['year'] = df['year'].astype(int)

year_trend = df.groupby('year', as_index=False)['popularity'].mean()

# SAVE JSON
result = {
    "top_songs": top_songs.to_dict(orient="records"),
    "top_artists": top_artists.to_dict(),
    "pop_dist": pop_dist.to_dict(),
    "year_trend": year_trend.to_dict(orient="records")
}

with open("data.json", "w") as f:
    json.dump(result, f, indent=4)

print("✅ Done")