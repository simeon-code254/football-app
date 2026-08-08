from dataclasses import dataclass

from ultralytics import YOLO

from src.config import MODEL_PATH

PERSON_CLASS = 0
SPORTS_BALL_CLASS = 32

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
    """Runs YOLOv8 + ByteTrack over already-sampled frames, in order, with
    persist=True so track IDs stay consistent frame-to-frame. Returns one
    Detection list per frame (same length/order as `frames`).
    """
    model = get_model()
    per_frame: list[list[Detection]] = []

    for frame in frames:
        result = model.track(
            frame,
            tracker="bytetrack.yaml",
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
