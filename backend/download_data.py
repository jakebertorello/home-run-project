
import pandas as pd
from pybaseball import statcast
from pathlib import Path

# Project directories
BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Download date range
START_DATE = "2026-03-25"
END_DATE = "2026-11-01"

print("Downloading 2026 Statcast data...")

try:
    data = statcast(
        start_dt=START_DATE,
        end_dt=END_DATE
    )

    print(f"\nDownloaded {len(data):,} pitches.")

    # Save the original dataset
    output_file = RAW_DIR / "statcast_2026.csv"
    data.to_csv(output_file, index=False)

    print(f"Saved to: {output_file}")

    # Inspect extra-base hit outcomes
    if "events" in data.columns:
        print("\nExtra-base hit counts:")
        print(
            data[data["events"].isin(
                ["home_run", "double", "triple"]
            )]["events"].value_counts()
        )

    # Inspect important columns
    columns = [
        "game_date",
        "batter",
        "pitcher",
        "events",
        "launch_speed",
        "launch_angle",
        "hc_x",
        "hc_y",
        "venue"
    ]

    print("\nAvailable project columns:")
    print([c for c in columns if c in data.columns])

except Exception as e:
    print(f"Download failed: {e}")

import pandas as pd
from pybaseball import statcast
from pathlib import Path

# Project directories
BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Download date range
START_DATE = "2026-03-25"
END_DATE = "2026-11-01"

print("Downloading 2026 Statcast data...")

try:
    data = statcast(
        start_dt=START_DATE,
        end_dt=END_DATE
    )

    print(f"\nDownloaded {len(data):,} pitches.")

    # Save the original dataset
    output_file = RAW_DIR / "statcast_2026.csv"
    data.to_csv(output_file, index=False)

    print(f"Saved to: {output_file}")

    # Inspect extra-base hit outcomes
    if "events" in data.columns:
        print("\nExtra-base hit counts:")
        print(
            data[data["events"].isin(
                ["home_run", "double", "triple"]
            )]["events"].value_counts()
        )

    # Inspect important columns
    columns = [
        "game_date",
        "batter",
        "pitcher",
        "events",
        "launch_speed",
        "launch_angle",
        "hc_x",
        "hc_y",
        "venue"
    ]

    print("\nAvailable project columns:")
    print([c for c in columns if c in data.columns])

except Exception as e:
    print(f"Download failed: {e}")

