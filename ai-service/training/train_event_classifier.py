"""Trains the PASS vs DRIVE ball-touch classifier on real, engineered
features (src/pipeline/features.py) extracted from real SoccerNet clips.

Split is grouped by source game, never by individual clip -- per the
approved Phase 13 plan's anti-leakage requirement, since two clips from the
same broadcast can look near-identical. Held-out test set is the same two
games SoccerNet's own dataset split designated as "test" (Reading - Fulham,
Stoke City - Huddersfield Town) -- reusing the dataset creators' own
train/test boundary rather than inventing a new one.

A RandomForestClassifier, not a deep model -- matches the approved plan's
reasoning: at this dataset size (~800 real clips), a classical model on
engineered features is the right first choice over a GRU/1D-CNN, needs no
GPU, and its feature_importances_ stay as inspectable as attributes.py's
existing hand-written formulas.

Usage: python training/train_event_classifier.py
"""

import csv
import json
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

FEATURES_CSV = Path(__file__).parent / "reports" / "clip_features.csv"
REPORT_PATH = Path(__file__).parent / "reports" / "event_classifier_metrics.json"
MODEL_PATH = Path(__file__).parent.parent / "models" / "classifiers" / "pass_drive_classifier.joblib"

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

# SoccerNet's own designated test-split games (see training/extract_soccernet_clips.py's
# GAMES list) -- reusing their train/test boundary rather than inventing a new one.
TEST_GAME_SLUGS = {
    "20191001_reading_fulham",
    "20191001_stoke_city_huddersfield_town",
}


def main():
    rows = list(csv.DictReader(open(FEATURES_CSV)))
    train_rows = [r for r in rows if r["game"] not in TEST_GAME_SLUGS]
    test_rows = [r for r in rows if r["game"] in TEST_GAME_SLUGS]

    print(f"train: {len(train_rows)} clips from {len({r['game'] for r in train_rows})} games")
    print(f"test:  {len(test_rows)} clips from {len({r['game'] for r in test_rows})} games (held out)")

    X_train = [[float(r[k]) for k in FEATURE_KEYS] for r in train_rows]
    y_train = [r["label"] for r in train_rows]
    X_test = [[float(r[k]) for k in FEATURE_KEYS] for r in test_rows]
    y_test = [r["label"] for r in test_rows]

    clf = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred, labels=clf.classes_)

    print("\n" + classification_report(y_test, y_pred))
    print("confusion matrix (rows=true, cols=predicted), labels =", list(clf.classes_))
    print(cm)

    importances = dict(zip(FEATURE_KEYS, clf.feature_importances_.tolist()))
    print("\nfeature importances:")
    for k, v in sorted(importances.items(), key=lambda kv: -kv[1]):
        print(f"  {k}: {v:.3f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": clf, "feature_keys": FEATURE_KEYS, "classes": list(clf.classes_)}, MODEL_PATH)

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w") as f:
        json.dump(
            {
                "train_clips": len(train_rows),
                "test_clips": len(test_rows),
                "test_games": sorted(TEST_GAME_SLUGS),
                "classification_report": report,
                "confusion_matrix": cm.tolist(),
                "confusion_matrix_labels": list(clf.classes_),
                "feature_importances": importances,
            },
            f,
            indent=2,
        )
    print(f"\nSaved model to {MODEL_PATH}")
    print(f"Saved metrics to {REPORT_PATH}")


if __name__ == "__main__":
    main()
