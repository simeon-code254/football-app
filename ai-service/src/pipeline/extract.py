import tempfile
from pathlib import Path

import cv2

from src.config import FPS_SAMPLE_RATE


def extract_frames(video_bytes: bytes, fps_override: float | None = None) -> tuple[list, float]:
    """Writes video_bytes to a temp file, samples frames at FPS_SAMPLE_RATE
    (or `fps_override` when given).

    Phase A's full-highlight-clip extraction (Pace/Physical) always uses the
    default -- this override exists for features.py's short (~2.5s)
    event-window clips, where a touch itself only lasts a few frames at 5fps
    and finer temporal resolution genuinely changes what's measurable (where
    exactly the touch lands, how sharply the ball redirects). Both the
    offline training path and, once wired in, live event-window inference
    call this with the same override, so train/serve parity is preserved --
    it's Phase A's own full-clip default that stays untouched, not a
    per-caller inconsistency.

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

        target_fps = fps_override if fps_override is not None else FPS_SAMPLE_RATE
        skip = max(1, round(native_fps / target_fps))
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
