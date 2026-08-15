"""Phase C: live PASS/DRIVE event detection over a full uploaded clip.

Reuses Phase A's own already-extracted frames/person-tracks/ball-detections
(all sampled at FPS_SAMPLE_RATE, which happens to equal features.py's own
EVENT_WINDOW_FPS -- no separate re-extraction needed) and the trained
pass_drive_classifier.joblib for real predictions. The classifier's only
job is ever "is this window a pass or a drive touch, at what confidence" --
turning that into an actual Passing/Dribbling score is event_scoring.py's
job, not this module's.

A clip run before training/train_event_classifier.py has ever produced a
model file (or on a fresh checkout -- models/classifiers/* is gitignored)
returns zero events rather than crashing, same hard-fail-gracefully
convention as every other optional signal in this pipeline (jersey OCR,
team clustering).
"""

import math
from dataclasses import dataclass
from pathlib import Path

import joblib

from src.pipeline.detect_track import Detection, PERSON_CLASS
from src.pipeline.features import EVENT_WINDOW_FPS, compute_features_from_window

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "classifiers" / "pass_drive_classifier.joblib"

# Matches training/extract_soccernet_clips.py's own window (1.0s before the
# touch + 1.5s after) so a live-detected touch gets fed the same-shaped
# window the classifier was trained on.
WINDOW_BEFORE_FRAMES = round(1.0 * EVENT_WINDOW_FPS)
WINDOW_AFTER_FRAMES = round(1.5 * EVENT_WINDOW_FPS)

# NOT the same thing as features.py's CLOSE_RADIUS_FRAC (0.05), despite the
# old value here matching it by coincidence -- confirmed directly by reading
# training/extract_soccernet_clips.py: training windows are cut around
# SoccerNet's own labeled millisecond timestamps, never located via a
# distance heuristic at all. This constant is purely a LIVE-inference
# heuristic for guessing "which frame is probably the touch" when there's no
# label to consult -- it only decides which frame a window gets centered on;
# compute_features_from_window() (shared, real train/serve-identical code)
# still computes every feature, including its own close_frac off
# features.py's untouched CLOSE_RADIUS_FRAC, the same way regardless. So
# widening this one is safe without retraining, and the same real evidence
# that justified positioning.py's CLOSE_TOUCH_RADIUS_FRAC applies here too:
# real touches in amateur footage measured around 0.20-0.25 of frame width,
# not 0.05 (see ai-service/README.md's validation findings).
TOUCH_CLOSE_RADIUS_FRAC = 0.25
MAX_EVENTS_PER_CLIP = 40  # real cap against a pathological many-touch clip

_model_bundle: dict | None = None
_model_load_attempted = False


def _load_model() -> dict | None:
    global _model_bundle, _model_load_attempted
    if not _model_load_attempted:
        _model_load_attempted = True
        if MODEL_PATH.exists():
            _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle


@dataclass
class EventDetection:
    frame_idx: int  # touch frame, index into the clip's full per-frame arrays
    label: str  # 'pass' or 'drive'
    probability: float  # the predicted class's own probability


def _center(xyxy: tuple[float, float, float, float]) -> tuple[float, float]:
    x1, y1, x2, y2 = xyxy
    return (x1 + x2) / 2, (y1 + y2) / 2


def find_subject_touch_frames(
    per_frame: list[list[Detection]],
    ball_per_frame: list[list[Detection]],
    subject_track_id: int,
    frame_w: int,
) -> list[int]:
    """Frame indices where the ball sits close to the SUBJECT specifically
    (unlike training-clip curation's "nearest any person", here we only
    care about the tracked subject's own touches). Consecutive close
    frames collapse into one touch at their closest point, so a lingering
    close-control moment isn't double-counted as many separate touches.

    Public (not module-private) because decision_making.py's touches-to-
    release proxy needs to count touches using the SAME bbox-center-based
    "touch" definition that produced the pass/drive events it's relating
    them to -- feeding it positioning.py's separate, ankle-keypoint-based
    touch list (a different geometry, pose-dependent, calibrated for Ball
    Control) meant the two signals could each work independently and still
    rarely overlap enough to ever produce a Decision Making score. Confirmed
    directly: across this session's full validation, Passing and Dribbling
    both fired on real clips, Decision Making never did, on any clip.
    """
    close_radius = frame_w * TOUCH_CLOSE_RADIUS_FRAC
    close_frames: list[tuple[int, float]] = []

    for i, dets in enumerate(per_frame):
        balls = ball_per_frame[i] if i < len(ball_per_frame) else []
        if not balls:
            continue
        subject_det = next((d for d in dets if d.cls == PERSON_CLASS and d.track_id == subject_track_id), None)
        if subject_det is None:
            continue
        sx, sy = _center(subject_det.xyxy)
        best_ball = max(balls, key=lambda d: d.conf)
        bx, by = _center(best_ball.xyxy)
        dist = math.hypot(sx - bx, sy - by)
        if dist < close_radius:
            close_frames.append((i, dist))

    if not close_frames:
        return []

    touches: list[int] = []
    run: list[tuple[int, float]] = [close_frames[0]]
    for prev, cur in zip(close_frames, close_frames[1:]):
        if cur[0] - prev[0] <= 1:
            run.append(cur)
        else:
            touches.append(min(run, key=lambda t: t[1])[0])
            run = [cur]
    touches.append(min(run, key=lambda t: t[1])[0])
    return touches[:MAX_EVENTS_PER_CLIP]


def detect_events(
    frames: list,
    per_frame: list[list[Detection]],
    ball_per_frame: list[list[Detection]],
    subject_track_id: int,
    frame_w: int,
) -> list[EventDetection]:
    """Real pass/drive predictions for each of the subject's own detected
    ball touches in this clip, using the trained classifier over the exact
    same engineered features it was trained on (compute_features_from_window
    -- the shared code path with training/extract_clip_features.py). Returns
    [] (never a guess) when the model file isn't present or a touch didn't
    produce enough signal to build a feature vector.
    """
    bundle = _load_model()
    if bundle is None:
        return []

    model = bundle["model"]
    feature_keys = bundle["feature_keys"]
    touch_frames = find_subject_touch_frames(per_frame, ball_per_frame, subject_track_id, frame_w)

    events: list[EventDetection] = []
    for t in touch_frames:
        start = max(0, t - WINDOW_BEFORE_FRAMES)
        end = min(len(frames), t + WINDOW_AFTER_FRAMES + 1)

        feats = compute_features_from_window(frames[start:end], per_frame[start:end], ball_per_frame[start:end])
        if feats is None:
            continue

        x = [[feats[k] for k in feature_keys]]
        proba = model.predict_proba(x)[0]
        class_idx = int(proba.argmax())
        label = model.classes_[class_idx]
        events.append(EventDetection(frame_idx=t, label=label, probability=float(proba[class_idx])))

    return events
