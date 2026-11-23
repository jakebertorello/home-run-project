
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Load both datasets
statcast = pd.read_csv(
    RAW_DIR / "statcast_2026.csv",
    low_memory=False
)

stadiums = pd.read_csv(
    RAW_DIR / "game_stadiums.csv"
)

# Normalize game IDs
statcast["game_pk"] = pd.to_numeric(
    statcast["game_pk"], errors="coerce"
).astype("Int64")

stadiums["game_pk"] = pd.to_numeric(
    stadiums["game_pk"], errors="coerce"
).astype("Int64")

print("===== DUPLICATE SCHEDULE ENTRIES =====")

duplicates = stadiums[
    stadiums.duplicated("game_pk", keep=False)
].sort_values("game_pk")

print("Duplicate schedule rows:", len(duplicates))
print("Affected games:", duplicates["game_pk"].nunique())

# Check whether duplicate entries disagree
if not duplicates.empty:
    conflicts = (
        duplicates.groupby("game_pk")["venue_id"]
        .nunique()
    )
    print("Games with conflicting venue IDs:", (conflicts > 1).sum())

print("\n===== GAME ID MATCHING =====")

statcast_ids = set(statcast["game_pk"].dropna())
schedule_ids = set(stadiums["game_pk"].dropna())

print("Statcast unique games:", len(statcast_ids))
print("Schedule unique games:", len(schedule_ids))
print("Statcast games missing from schedule:", len(statcast_ids - schedule_ids))
print("Schedule games missing from Statcast:", len(schedule_ids - statcast_ids))

# Deduplicate schedule entries for the merge
stadiums_clean = stadiums.drop_duplicates(
    subset="game_pk",
    keep="first"
).copy()

# Merge stadium information into Statcast
merged = statcast.merge(
    stadiums_clean[
        ["game_pk", "venue_id", "venue_name"]
    ],
    on="game_pk",
    how="left",
    validate="many_to_one"
)

# Keep extra-base hits
hits = merged[
    merged["events"].isin(["home_run", "double", "triple"])
].copy()

print("\n===== MERGE RESULTS =====")
print("Total Statcast rows:", len(merged))
print("Extra-base hits:", len(hits))
print("Hits with missing stadium:", hits["venue_name"].isna().sum())
print("Hits with missing coordinates:", hits["hc_x"].isna().sum())

print("\nExtra-base hits by stadium:")
print(hits["venue_name"].value_counts(dropna=False).to_string())

# Save the extra-base hit dataset
output = PROCESSED_DIR / "extra_base_hits_2026.csv"
hits.to_csv(output, index=False)

print(f"\nSaved cleaned data to: {output}")

