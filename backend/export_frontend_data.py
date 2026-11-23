
import pandas as pd
import json
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
OUTPUT_DIR = BASE_DIR.parent / "frontend" / "public" / "data"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

stadiums = pd.read_csv(RAW_DIR / "stadium_paths.csv")
hits = pd.read_csv(PROCESSED_DIR / "extra_base_hits_2026.csv")

hits = hits.dropna(subset=["hc_x", "hc_y"]).copy()

if "game_date" in hits.columns:
    hits["game_date"] = hits["game_date"].astype(str)

# Collect unique MLB player IDs
player_ids = set()

for column in ["batter", "pitcher"]:
    player_ids.update(
        hits[column].dropna().astype(int).unique().tolist()
    )

# Look up names from the MLB Stats API
player_names = {}

player_ids = list(player_ids)

for i in range(0, len(player_ids), 100):
    batch = player_ids[i:i + 100]
    ids_string = ",".join(map(str, batch))

    url = f"https://statsapi.mlb.com/api/v1/people?personIds={ids_string}"

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "MLB-Stadium-Explorer"}
        )

        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))

        for person in data.get("people", []):
            first = person.get("firstName", "")
            last = person.get("lastName", "")

            formatted_name = (
                f"{first[0]}. {last}" if first and last else "Unknown"
            )

            player_names[person["id"]] = formatted_name

    except Exception as e:
        print(f"Player lookup failed for batch: {e}")

# Add formatted player names to hit records
hits["batter_name"] = hits["batter"].map(
    lambda x: player_names.get(int(x), "Unknown") if pd.notna(x) else "Unknown"
)

hits["pitcher_name"] = hits["pitcher"].map(
    lambda x: player_names.get(int(x), "Unknown") if pd.notna(x) else "Unknown"
)

stadiums = stadiums.fillna("")
hits = hits.fillna("")

stadiums.to_json(OUTPUT_DIR / "stadiums.json", orient="records")
hits.to_json(OUTPUT_DIR / "hits.json", orient="records")

print("Export complete!")
print("Stadium geometry rows:", len(stadiums))
print("Extra-base hits exported:", len(hits))
print("Players found:", len(player_names))
print("Output directory:", OUTPUT_DIR)
