"""Frozen MediaPipe Pose estimation over a subject's bbox crop.

Confirmed directly this session: the current pip-installable mediapipe
(1.0.1) has removed the old `mp.solutions.pose` API most tutorials
reference -- this uses the newer Tasks API (PoseLandmarker + a downloaded
.task model file), verified working end-to-end (33 real landmarks, 0.998
confidence) on real mined football footage, CPU-only, no GPU needed.

Runs on the subject's bbox crop, not the full frame -- far more reliable
than full-frame pose estimation on a multi-person scene (the crop already
isolates the one person we care about), matching the Phase 13 plan's
"frozen MediaPipe Pose over the subject track's crops" design. Never
fine-tuned, never receives gradients -- pure pretrained inference, same
treatment as YOLOv8n's detector.
"""

from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

POSE_MODEL_PATH = str(Path(__file__).parent.parent.parent / "models" / "pose_landmarker_lite.task")

# MediaPipe Pose's standard 33-point topology -- ankle indices used by
# positioning.py's foot-to-ball proximity heuristic; hip/knee added for
# features.py's kicking-motion features (knee angle, leg extension).
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28
# Added for vision.py's scanning-frequency proxy (shoulder-line orientation)
# and goalkeeper.py's hand-to-ball proximity proxies (Reflexes/Handling).
NOSE = 0
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_WRIST = 15
RIGHT_WRIST = 16

_landmarker: vision.PoseLandmarker | None = None


def get_landmarker() -> vision.PoseLandmarker:
    global _landmarker
    if _landmarker is None:
        options = vision.PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=POSE_MODEL_PATH),
            running_mode=vision.RunningMode.IMAGE,
        )
        _landmarker = vision.PoseLandmarker.create_from_options(options)
    return _landmarker


@dataclass
class PoseFrame:
    # 33 (x, y, visibility) tuples, x/y normalized 0-1 relative to the FULL
    # frame (already translated back from the crop) -- so downstream code
    # never needs to know a crop was involved.
    landmarks: list[tuple[float, float, float]]


def estimate_pose_on_crop(frame, bbox: tuple[float, float, float, float]) -> PoseFrame | None:
    x1, y1, x2, y2 = (max(0, int(v)) for v in bbox)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return None

    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = get_landmarker().detect(mp_image)
    if not result.pose_landmarks:
        return None

    crop_h, crop_w = crop.shape[:2]
    frame_h, frame_w = frame.shape[:2]
    landmarks = [
        ((x1 + lm.x * crop_w) / frame_w, (y1 + lm.y * crop_h) / frame_h, lm.visibility)
        for lm in result.pose_landmarks[0]
    ]
    return PoseFrame(landmarks=landmarks)
