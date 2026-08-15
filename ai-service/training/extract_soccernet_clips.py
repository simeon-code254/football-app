"""Extract short event-window clips from SoccerNet's Ball Action Spotting data.

Labels-ball.json gives millisecond-precision timestamps for real PASS/DRIVE
ball touches (see ai-service/README.md's SoccerNet section) -- this turns
those into short, subject-centered training clips instead of the raw full
match videos (which would be a domain/footprint mismatch, per the approved
Phase 13 plan's Phase C dataset strategy: short windows around labeled
timestamps, not full matches).

Processes one game at a time: extracts that game's two half-videos from its
zip archive to a temp location, cuts every sampled event's window with
ffmpeg, then deletes the temp half-videos before moving to the next game --
keeps peak disk usage to ~1 game's videos rather than all 7 at once.

Usage: python training/extract_soccernet_clips.py [--per-class-cap N] [--games N]
"""

import argparse
import json
import random
import subprocess
import zipfile
from pathlib import Path

SOCCERNET_DIR = Path(__file__).parent.parent / "data" / "soccernet" / "spotting-ball-2023"
OUT_DIR = Path(__file__).parent.parent / "data" / "soccernet_clips"
TEMP_DIR = Path(__file__).parent.parent / "data" / "_soccernet_temp"

# (split_zip, game_folder_name) -- matches the real archive contents,
# confirmed directly against `unzip -l` output for all three zips.
GAMES = [
    ("valid", "2019-10-01 - Middlesbrough - Preston North End"),
    ("train", "2019-10-01 - Blackburn Rovers - Nottingham Forest"),
    ("train", "2019-10-01 - Brentford - Bristol City"),
    ("train", "2019-10-01 - Hull City - Sheffield Wednesday"),
    ("train", "2019-10-01 - Leeds United - West Bromwich"),
    ("test", "2019-10-01 - Reading - Fulham"),
    ("test", "2019-10-01 - Stoke City - Huddersfield Town"),
]

WINDOW_BEFORE_S = 1.0
WINDOW_AFTER_S = 1.5
CLIP_WIDTH = 640


def slugify(name: str) -> str:
    return name.replace(" ", "_").replace("-", "").replace("__", "_").strip("_").lower()


def game_zip_path(split: str, game: str) -> str:
    return f"england_efl/2019-2020/{game}"


def extract_game_video(split: str, game: str, half: str, dest: Path) -> bool:
    zip_path = SOCCERNET_DIR / f"{split}.zip"
    member = f"{game_zip_path(split, game)}/{half}_720p.mkv"
    with zipfile.ZipFile(zip_path) as zf:
        if member not in zf.namelist():
            return False
        with zf.open(member) as src, open(dest, "wb") as out:
            while chunk := src.read(1024 * 1024):
                out.write(chunk)
    return True


def load_events(split: str, game: str) -> list[dict]:
    zip_path = SOCCERNET_DIR / f"{split}.zip"
    member = f"{game_zip_path(split, game)}/Labels-ball.json"
    with zipfile.ZipFile(zip_path) as zf:
        with zf.open(member) as f:
            data = json.load(f)
    return [a for a in data["annotations"] if a["visibility"] == "visible"]


def cut_clip(source: Path, start_s: float, duration_s: float, out_path: Path) -> bool:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", f"{max(0, start_s):.2f}",
        "-i", str(source),
        "-t", f"{duration_s:.2f}",
        "-vf", f"scale={CLIP_WIDTH}:-2",
        "-c:v", "libx264", "-preset", "ultrafast", "-an",
        str(out_path),
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0 and out_path.exists() and out_path.stat().st_size > 1000


def process_game(split: str, game: str, per_class_cap: int, rng: random.Random) -> dict:
    events = load_events(split, game)
    by_label: dict[str, list[dict]] = {}
    for e in events:
        by_label.setdefault(e["label"], []).append(e)

    sampled: list[dict] = []
    for label, items in by_label.items():
        rng.shuffle(items)
        sampled.extend(items[:per_class_cap])

    slug = slugify(game)
    counts = {"kept": 0, "failed": 0}
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    half_video_cache: dict[str, Path] = {}

    try:
        for event in sampled:
            half = event["gameTime"].split(" - ")[0].strip()
            if half not in half_video_cache:
                dest = TEMP_DIR / f"{slug}_{half}.mkv"
                if not dest.exists():
                    print(f"  extracting half {half} video for {game}...")
                    ok = extract_game_video(split, game, half, dest)
                    if not ok:
                        print(f"  WARNING: could not extract half {half} for {game}")
                        continue
                half_video_cache[half] = dest

            position_ms = int(event["position"])
            timestamp_s = position_ms / 1000.0
            start_s = timestamp_s - WINDOW_BEFORE_S
            duration_s = WINDOW_BEFORE_S + WINDOW_AFTER_S

            label_dir = event["label"].lower()
            out_name = f"{slug}_{half}_{position_ms}.mp4"
            out_path = OUT_DIR / label_dir / out_name

            ok = cut_clip(half_video_cache[half], start_s, duration_s, out_path)
            if ok:
                counts["kept"] += 1
            else:
                counts["failed"] += 1
    finally:
        for path in half_video_cache.values():
            path.unlink(missing_ok=True)

    return counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-class-cap", type=int, default=60, help="max clips per label per game")
    parser.add_argument("--games", type=int, default=len(GAMES), help="how many of the 7 games to process")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    total = {"kept": 0, "failed": 0}
    for split, game in GAMES[: args.games]:
        print(f"=== {split}: {game} ===")
        counts = process_game(split, game, args.per_class_cap, rng)
        print(f"  kept={counts['kept']} failed={counts['failed']}")
        total["kept"] += counts["kept"]
        total["failed"] += counts["failed"]

    print(f"\nTotal: kept={total['kept']} failed={total['failed']}")


if __name__ == "__main__":
    main()
