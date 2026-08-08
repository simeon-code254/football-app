import tempfile
from pathlib import Path

import cv2

from src.config import FPS_SAMPLE_RATE


def extract_frames(video_bytes: bytes) -> tuple[list, float]:
    """Writes video_bytes to a temp file, samples frames at FPS_SAMPLE_RATE.

    Returns (frames, duration_seconds). Frames are BGR numpy arrays (OpenCV
    default), in playback order.
    """
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = Path(tmp.name)

    try:
        cap = cv2.VideoCapture(str(tmp_path))
        if not cap.isOpened():
            raise RuntimeError(f"OpenCV could not open the downloaded video (path={tmp_path})")

        native_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_s = frame_count / native_fps if native_fps > 0 else 0.0

        skip = max(1, round(native_fps / FPS_SAMPLE_RATE))
        frames = []
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % skip == 0:
                frames.append(frame)
            idx += 1
        cap.release()

        if not frames:
            raise RuntimeError("No frames could be decoded from the downloaded video")

        return frames, duration_s
    finally:
        tmp_path.unlink(missing_ok=True)
