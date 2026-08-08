from src.config import DEFAULT_PLAYER_HEIGHT_M
from src.pipeline.detect_track import PERSON_CLASS, Detection


def pixels_per_meter(per_frame: list[list[Detection]], subject_track_id: int, height_cm: int | None) -> float | None:
    """Average the subject's bbox height across frames where the box looks
    plausibly upright (height > width — filters out crouching/occluded/
    sliding frames that would skew the calibration), then scale against a
    real-world height. No camera calibration/homography — this assumes a
    roughly perpendicular, unzoomed view held constant for the whole clip.
    Returns None if no plausible frame exists (caller must treat this as a
    failed calibration, not fall back to a guess).
    """
    heights = []
    for frame_dets in per_frame:
        for det in frame_dets:
            if det.cls != PERSON_CLASS or det.track_id != subject_track_id:
                continue
            x1, y1, x2, y2 = det.xyxy
            w, h = x2 - x1, y2 - y1
            if h > w and h > 0:
                heights.append(h)

    if not heights:
        return None

    avg_height_px = sum(heights) / len(heights)
    height_m = (height_cm / 100) if height_cm else DEFAULT_PLAYER_HEIGHT_M
    return avg_height_px / height_m
