
import requests
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw"

START_DATE = "2026-03-25"
END_DATE = "2026-10-28"

url = "https://statsapi.mlb.com/api/v1/schedule"

params = {
    "sportId": 1,
    "startDate": START_DATE,
    "endDate": END_DATE,
    "gameTypes": "R,F,D,L,W",
    "hydrate": "venue"
}

print("Retrieving MLB schedule and stadium information...")

response = requests.get(url, params=params, timeout=60)
response.raise_for_status()

schedule = response.json()

games = []

for date_info in schedule.get("dates", []):
    for game in date_info.get("games", []):
        venue = game.get("venue", {})
        home = game.get("teams", {}).get("home", {})
        away = game.get("teams", {}).get("away", {})

        games.append({
            "game_pk": game.get("gamePk"),
            "game_date": date_info.get("date"),
            "game_type": game.get("gameType"),
            "home_team": home.get("team", {}).get("abbreviation"),
            "away_team": away.get("team", {}).get("abbreviation"),
            "venue_id": venue.get("id"),
            "venue_name": venue.get("name")
        })

games_df = pd.DataFrame(games)

output_file = RAW_DIR / "game_stadiums.csv"
games_df.to_csv(output_file, index=False)

print(f"\nGames retrieved: {len(games_df):,}")
print(f"Unique game IDs: {games_df['game_pk'].nunique():,}")
print(f"Missing stadium names: {games_df['venue_name'].isna().sum()}")

print("\nStadiums found:")
print(
    games_df[["venue_id", "venue_name"]]
    .drop_duplicates()
    .sort_values("venue_name")
    .to_string(index=False)
)

print(f"\nSaved to: {output_file}")

