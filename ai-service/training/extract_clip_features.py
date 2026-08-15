"""Runs features.extract_event_features() over every curated SoccerNet clip
and writes one CSV row per clip (features + label + source game). The source
game column is what train_event_classifier.py groups the train/test split
on, so no two clips from the same match end up on opposite sides of the
split (leakage-by-near-duplicate, the exact failure mode the approved plan
calls out).

Usage: python training/extract_clip_features.py
"""

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.pipeline.features import extract_event_features

CLIPS_DIR = Path(__file__).parent.parent / "data" / "soccernet_clips"
OUT_CSV = Path(__file__).parent / "reports" / "clip_features.csv"

FEATURE_KEYS = [
    "min_ball_person_dist_norm",
    "speed_before_norm",
    "speed_after_norm",
    "speed_ratio",
    "close_frac",
    "ball_frame_coverage",
    "touch_position_in_window",
    "pose_available",
    "knee_angle_at_touch",
    "leg_extension_norm",
    "ankle_velocity_norm",
    "ball_acceleration_norm",
    "direction_change_available",
    "direction_change_at_touch",
]


def game_slug_from_filename(name: str) -> str:
    # "{game_slug}_{half}_{position_ms}.mp4" -- half is always "1" or "2".
    stem = name.rsplit(".", 1)[0]
    parts = stem.rsplit("_", 2)
    return parts[0]


def main():
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    skipped = 0

    for label_dir in sorted(CLIPS_DIR.iterdir()):
        if not label_dir.is_dir():
            continue
        label = label_dir.name
        clips = sorted(label_dir.glob("*.mp4"))
        for i, clip_path in enumerate(clips):
            video_bytes = clip_path.read_bytes()
            try:
                features = extract_event_features(video_bytes)
            except Exception as exc:
                print(f"  ERROR on {clip_path.name}: {exc}")
                skipped += 1
                continue
            if features is None:
                skipped += 1
                continue
            row = {
                "clip": clip_path.name,
                "label": label,
                "game": game_slug_from_filename(clip_path.name),
                **features,
            }
            rows.append(row)
            if (i + 1) % 20 == 0:
                print(f"  {label}: {i + 1}/{len(clips)}")

    with open(OUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["clip", "label", "game"] + FEATURE_KEYS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} rows to {OUT_CSV} ({skipped} clips skipped -- insufficient ball signal)")


if __name__ == "__main__":
    main()
