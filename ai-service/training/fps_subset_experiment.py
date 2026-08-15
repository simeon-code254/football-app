"""One-off controlled experiment: does higher event-window fps actually
improve the PASS/DRIVE classifier, on a fast subset before committing to a
multi-hour full re-extraction?

Same clips, same train/test game split, two fps settings compared head to
head. Not part of the regular training pipeline -- ad hoc, deleted after
use.
"""

import csv
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import src.pipeline.features as features_module
from src.pipeline.features import extract_event_features
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

CLIPS_DIR = Path(__file__).parent.parent / "data" / "soccernet_clips"
FEATURE_KEYS = [
    "min_ball_person_dist_norm", "speed_before_norm", "speed_after_norm", "speed_ratio",
    "close_frac", "ball_frame_coverage", "touch_position_in_window", "pose_available",
    "knee_angle_at_touch", "leg_extension_norm", "ankle_velocity_norm",
    "ball_acceleration_norm", "direction_change_available", "direction_change_at_touch",
]
TEST_GAME_SLUGS = {"20191001_reading_fulham", "20191001_stoke_city_huddersfield_town"}
PER_CLASS_SAMPLE = 200


def game_slug(name: str) -> str:
    return name.rsplit(".", 1)[0].rsplit("_", 2)[0]


def sample_clips(seed: int) -> list[Path]:
    rng = random.Random(seed)
    picked = []
    for label in ("pass", "drive"):
        all_clips = sorted((CLIPS_DIR / label).glob("*.mp4"))
        picked.extend(rng.sample(all_clips, min(PER_CLASS_SAMPLE, len(all_clips))))
    return picked


def run_at_fps(fps: float, clip_paths: list[Path]) -> dict:
    features_module.EVENT_WINDOW_FPS = fps
    rows = []
    t0 = time.time()
    for clip_path in clip_paths:
        label = clip_path.parent.name
        video_bytes = clip_path.read_bytes()
        feats = extract_event_features(video_bytes)
        if feats is None:
            continue
        rows.append({"clip": clip_path.name, "label": label, "game": game_slug(clip_path.name), **feats})
    elapsed = time.time() - t0

    train_rows = [r for r in rows if r["game"] not in TEST_GAME_SLUGS]
    test_rows = [r for r in rows if r["game"] in TEST_GAME_SLUGS]
    X_train = [[float(r[k]) for k in FEATURE_KEYS] for r in train_rows]
    y_train = [r["label"] for r in train_rows]
    X_test = [[float(r[k]) for k in FEATURE_KEYS] for r in test_rows]
    y_test = [r["label"] for r in test_rows]

    clf = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=42)
    clf.fit(X_train, y_train)
    acc = accuracy_score(y_test, clf.predict(X_test)) if test_rows else None

    return {
        "fps": fps,
        "usable_clips": len(rows),
        "train_clips": len(train_rows),
        "test_clips": len(test_rows),
        "seconds_per_clip": elapsed / len(clip_paths),
        "accuracy": acc,
    }


def main():
    clip_paths = sample_clips(seed=7)
    print(f"Sampled {len(clip_paths)} clips ({PER_CLASS_SAMPLE}/class)")

    for fps in (5.0, 12.0):
        result = run_at_fps(fps, clip_paths)
        print(f"\n=== fps={fps} ===")
        for k, v in result.items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
