from dataclasses import dataclass
from pathlib import Path

from ultralytics import YOLO

from src.config import MODEL_PATH

PERSON_CLASS = 0
SPORTS_BALL_CLASS = 32

# BoT-SORT with appearance re-ID (model: auto — reuses YOLO's own detector
# features, no extra model/training) instead of plain ByteTrack, so a
# subject briefly occluded or leaving/re-entering frame is more likely to
# keep the same track_id. See botsort_reid.yaml for the full rationale and
# its still-real limits (short-term recovery, not long-term re-ID).
TRACKER_CONFIG = str(Path(__file__).parent / "botsort_reid.yaml")

_model: YOLO | None = None
_ball_model: YOLO | None = None

# Stock YOLOv8n's COCO "sports ball" class was trained mostly on close/
# medium-shot sports photography -- confirmed directly this session that it
# detects zero balls (down to conf=0.05) on SoccerNet's full-pitch broadcast
# camera angle, where the ball is only a few pixels across, even though it
# detects real amateur close-up footage's ball fine (16/20 sampled frames,
# 0.7-0.96 confidence). This is a separate, football-specific detector
# (martinjolif/yolo-football-ball-detection, AGPL-3.0 -- same license family
# already accepted via the base `ultralytics` package) used only for ball
# detection in Phase C's event-feature extraction; Phase A's shipped
# person-tracking path above is untouched.
# Lowered from 0.15 after real validation against 7 mined amateur clips
# (ai-service/README.md's validation findings) found this specialized
# detector's ball recall was near-zero at 0.15 on most of them (0-2 of
# ~12-13 sampled frames) -- not because the ball wasn't there, but because
# real amateur footage often puts it small/blurred/motion-streaked enough
# that its own confidence stays low even on a genuine detection. Checked
# directly (not just lowered blind): at conf=0.05 the extra detections are
# small (~1-4% of frame width), spatially coherent boxes that drift smoothly
# frame-to-frame -- the shape of a real tracked ball, not scattered noise --
# and recall on most clips roughly doubled to tripled. Didn't drop further
# to 0.01: one clip stayed almost empty even there (1/13 frames), suggesting
# a genuine detector capability limit on that footage rather than a
# threshold problem, and 0.01 is permissive enough that risk of true noise
# rises without further evidence it helps.
BALL_MODEL_PATH = str(Path(__file__).parent.parent.parent / "models" / "yolo-football-ball-detection.pt")
BALL_CONF_THRESHOLD = 0.05


def get_model() -> YOLO:
    global _model
    if _model is None:
        # ultralytics auto-downloads yolov8n.pt into MODEL_PATH's parent dir
        # on first use if it isn't already cached there.
        _model = YOLO(MODEL_PATH)
    return _model


def get_ball_model() -> YOLO:
    global _ball_model
    if _ball_model is None:
        _ball_model = YOLO(BALL_MODEL_PATH)
    return _ball_model


@dataclass
class Detection:
    track_id: int
    cls: int  # PERSON_CLASS or SPORTS_BALL_CLASS
    conf: float
    xyxy: tuple[float, float, float, float]


def detect_ball_specialized(frames: list) -> list[list[Detection]]:
    """Runs the football-specific ball detector over already-sampled frames.
    Detection only, no tracking (features.py just needs a per-frame ball
    position, not a persistent ball track_id) -- returns one Detection list
    per frame, same length/order as `frames`, track_id always 0.
    """
    model = get_ball_model()
    per_frame: list[list[Detection]] = []
    for frame in frames:
        result = model.predict(frame, conf=BALL_CONF_THRESHOLD, verbose=False)[0]
        detections: list[Detection] = []
        boxes = result.boxes
        if boxes is not None:
            for cls, conf, xyxy in zip(boxes.cls.int().cpu().tolist(), boxes.conf.cpu().tolist(), boxes.xyxy.cpu().tolist()):
                detections.append(Detection(track_id=0, cls=SPORTS_BALL_CLASS, conf=conf, xyxy=tuple(xyxy)))
        per_frame.append(detections)
    return per_frame


def track_frames(frames: list) -> list[list[Detection]]:
    """Runs YOLOv8 + BoT-SORT (with appearance re-ID) over already-sampled
    frames, in order, with persist=True so track IDs stay consistent
    frame-to-frame. Returns one Detection list per frame (same length/order
    as `frames`).

    `get_model()` returns a cached, process-lifetime-singleton YOLO instance
    (real production concern: the same model object processes every job the
    service ever handles), and `persist=True` is what keeps a track's
    identity stable *within* one clip's frame-by-frame calls. Confirmed
    directly this session that without an explicit reset, that persistence
    leaks *across* clips too: BoT-SORT's tracker state (`model.predictor.
    trackers`) simply keeps accumulating from whatever video was processed
    last, so a job's tracking is contaminated by the previous job's people/
    positions -- and, observed directly, produces different track_id
    assignments for the exact same input video depending on what ran before
    it (verified: 3 repeated calls on identical frames in the same process
    produced 3 different track_id sets). Resetting the tracker at the start
    of every call is the fix -- each video now genuinely starts from a clean
    slate, matching what "persist=True" is actually supposed to mean (state
    persists across this clip's own frames, not across unrelated clips).
    """
    model = get_model()
    for tracker in getattr(model.predictor, "trackers", None) or []:
        tracker.reset()
    per_frame: list[list[Detection]] = []

    for frame in frames:
        result = model.track(
            frame,
            tracker=TRACKER_CONFIG,
            persist=True,
            classes=[PERSON_CLASS, SPORTS_BALL_CLASS],
            conf=0.35,
            verbose=False,
        )[0]

        detections: list[Detection] = []
        boxes = result.boxes
        if boxes is not None and boxes.id is not None:
            ids = boxes.id.int().cpu().tolist()
            classes = boxes.cls.int().cpu().tolist()
            confs = boxes.conf.cpu().tolist()
            xyxys = boxes.xyxy.cpu().tolist()
            for track_id, cls, conf, xyxy in zip(ids, classes, confs, xyxys):
                detections.append(Detection(track_id=track_id, cls=cls, conf=conf, xyxy=tuple(xyxy)))
        per_frame.append(detections)

    return per_frame
