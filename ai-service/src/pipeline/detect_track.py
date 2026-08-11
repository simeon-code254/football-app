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


def get_model() -> YOLO:
    global _model
    if _model is None:
        # ultralytics auto-downloads yolov8n.pt into MODEL_PATH's parent dir
        # on first use if it isn't already cached there.
        _model = YOLO(MODEL_PATH)
    return _model


@dataclass
class Detection:
    track_id: int
    cls: int  # PERSON_CLASS or SPORTS_BALL_CLASS
    conf: float
    xyxy: tuple[float, float, float, float]


def track_frames(frames: list) -> list[list[Detection]]:
    """Runs YOLOv8 + BoT-SORT (with appearance re-ID) over already-sampled
    frames, in order, with persist=True so track IDs stay consistent
    frame-to-frame. Returns one Detection list per frame (same length/order
    as `frames`).
    """
    model = get_model()
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
