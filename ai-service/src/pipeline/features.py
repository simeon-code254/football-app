"""Engineered kinematic features for a short ball-touch event window.

Shared by both training/extract_clip_features.py (offline, over curated
SoccerNet clips) and, once Phase C's classifier is wired into run.py, live
inference -- both call extract_event_features() on the same extract_frames()
+ track_frames() pipeline stages Phase A already uses, so training data and
live inference features are produced by the identical code path. This is
what structurally eliminates train/serve skew rather than relying on the two
call sites staying in sync by discipline.

Every value here is a real number computed from real per-frame YOLOv8
detections (and, for the pose-based features, real MediaPipe Pose landmarks
on the nearest-to-ball player's own bbox crop) over the clip -- distances/
speeds/angles in pixels or degrees, normalized where it makes them
comparable across differently-sized clips. No feature is fabricated or
hand-set; a clip with insufficient ball signal (too few frames with a
detected ball) returns None rather than a guessed feature vector, matching
every other hard-fail convention in this pipeline. Pose-based features
specifically can be legitimately absent even when the ball signal is fine
(pose estimation failed on that particular crop) -- `pose_available` is an
explicit binary feature for that, not a silently-zero-filled value, so a
tree-based model can learn to weight the other pose features differently
when they're real vs. missing.
"""

import math
from statistics import mean

from src.pipeline.detect_track import Detection, PERSON_CLASS, detect_ball_specialized, track_frames
from src.pipeline.extract import extract_frames
from src.pipeline.pose import LEFT_ANKLE, LEFT_HIP, LEFT_KNEE, RIGHT_ANKLE, RIGHT_HIP, RIGHT_KNEE, estimate_pose_on_crop

MIN_BALL_FRAMES = 3
CLOSE_RADIUS_FRAC = 0.05  # fraction of frame width counted as "ball at a player's feet"
MIN_LANDMARK_VISIBILITY = 0.5
POSE_MISSING_SENTINEL = -1.0  # paired with pose_available=0.0, never treated as a real 0
ANGLE_MISSING_SENTINEL = -1.0  # paired with direction_change_available=0.0

# Event windows are short (~2.5s) and the touch itself only spans a couple
# of frames at Phase A's 5fps default -- sampling faster here genuinely
# changes what's measurable (where exactly the touch lands, how sharply the
# ball redirects), unlike Pace/Physical's full-clip use of extract_frames()
# which stays on the default. See extract_frames()'s own docstring for the
# train/serve-parity reasoning.
EVENT_WINDOW_FPS = 5.0


def _center(xyxy: tuple[float, float, float, float]) -> tuple[float, float]:
    x0, y0, x1, y1 = xyxy
    return (x0 + x1) / 2, (y0 + y1) / 2


def _angle_between_degrees(v1: tuple[float, float], v2: tuple[float, float]) -> float | None:
    mag1, mag2 = math.hypot(*v1), math.hypot(*v2)
    if mag1 == 0 or mag2 == 0:
        return None
    cos_angle = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))


def _knee_angle_degrees(hip: tuple[float, float], knee: tuple[float, float], ankle: tuple[float, float]) -> float | None:
    return _angle_between_degrees((hip[0] - knee[0], hip[1] - knee[1]), (ankle[0] - knee[0], ankle[1] - knee[1]))


def _leg_metrics(pose, frame_w: int, frame_h: int) -> tuple[float | None, float | None]:
    """Averages both legs' knee angle / hip-to-ankle extension where each
    leg's landmarks are visible enough to trust -- returns (knee_angle_deg,
    leg_extension_norm), either or both None if no leg qualifies.
    """
    lm = pose.landmarks
    angles: list[float] = []
    extensions: list[float] = []
    for hip_i, knee_i, ankle_i in ((LEFT_HIP, LEFT_KNEE, LEFT_ANKLE), (RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE)):
        hip, knee, ankle = lm[hip_i], lm[knee_i], lm[ankle_i]
        if min(hip[2], knee[2], ankle[2]) < MIN_LANDMARK_VISIBILITY:
            continue
        hip_px = (hip[0] * frame_w, hip[1] * frame_h)
        knee_px = (knee[0] * frame_w, knee[1] * frame_h)
        ankle_px = (ankle[0] * frame_w, ankle[1] * frame_h)
        angle = _knee_angle_degrees(hip_px, knee_px, ankle_px)
        if angle is not None:
            angles.append(angle)
        extensions.append(math.hypot(hip_px[0] - ankle_px[0], hip_px[1] - ankle_px[1]))
    knee_angle = mean(angles) if angles else None
    leg_extension_norm = mean(extensions) / frame_w if extensions else None
    return knee_angle, leg_extension_norm


def extract_event_features(video_bytes: bytes) -> dict[str, float] | None:
    """Returns a real, transparent feature dict for one short event-window
    clip, or None if there isn't enough real ball-detection signal to trust
    (never a guessed/zero-filled fallback). Training-only entry point --
    re-extracts frames/tracks/ball detections from raw bytes for a single
    pre-cut clip. Live inference (events.py) already has these arrays from
    Phase A's own main pass and calls compute_features_from_window()
    directly instead, so the two never diverge in what they compute, only
    in how the inputs were obtained.
    """
    frames, _duration_s = extract_frames(video_bytes, fps_override=EVENT_WINDOW_FPS)
    per_frame = track_frames(frames)
    ball_per_frame = detect_ball_specialized(frames)
    return compute_features_from_window(frames, per_frame, ball_per_frame)


def compute_features_from_window(
    frames: list, per_frame: list[list[Detection]], ball_per_frame: list[list[Detection]]
) -> dict[str, float] | None:
    """The actual feature computation, over already-extracted arrays for one
    short (~2.5s) window. Shared verbatim by extract_event_features() above
    (training, whole-clip) and events.py (live, one window sliced out of a
    longer upload) -- this is the shared code path that keeps train/serve
    features identical, not just similarly-shaped.
    """
    frame_h, frame_w = frames[0].shape[:2]

    ball_track: list[tuple[int, float, float]] = []  # (frame_idx, cx, cy)
    person_dets_by_frame: list[list[Detection]] = [[d for d in dets if d.cls == PERSON_CLASS] for dets in per_frame]

    for i, balls in enumerate(ball_per_frame):
        if balls:
            best = max(balls, key=lambda d: d.conf)
            ball_track.append((i, *_center(best.xyxy)))

    if len(ball_track) < MIN_BALL_FRAMES:
        return None

    dists: list[float | None] = []
    nearest_person: list[Detection | None] = []
    for i, bx, by in ball_track:
        candidates = person_dets_by_frame[i]
        if not candidates:
            dists.append(None)
            nearest_person.append(None)
            continue
        best_person = min(candidates, key=lambda d: (bx - _center(d.xyxy)[0]) ** 2 + (by - _center(d.xyxy)[1]) ** 2)
        px, py = _center(best_person.xyxy)
        dists.append(((bx - px) ** 2 + (by - py) ** 2) ** 0.5)
        nearest_person.append(best_person)

    valid_dists = [d for d in dists if d is not None]
    if not valid_dists:
        return None

    min_dist = min(valid_dists)
    touch_idx = dists.index(min_dist)  # index within ball_track/dists

    speeds: list[float] = []
    for j in range(1, len(ball_track)):
        i0, x0, y0 = ball_track[j - 1]
        i1, x1, y1 = ball_track[j]
        dt_frames = i1 - i0
        if dt_frames <= 0:
            continue
        speeds.append(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5 / dt_frames)

    speed_before = mean(speeds[:touch_idx]) if touch_idx > 0 else 0.0
    speed_after = mean(speeds[touch_idx:]) if touch_idx < len(speeds) else 0.0

    close_radius = frame_w * CLOSE_RADIUS_FRAC
    close_frac = sum(1 for d in valid_dists if d < close_radius) / len(valid_dists)

    # Real, new signal: how sharply the ball's direction changes right at
    # the touch. A pass typically redirects the ball (often toward a
    # teammate, at an angle) while a drive/dribble touch keeps it moving in
    # roughly the same direction it was already going -- speed alone
    # doesn't capture this, direction does. Needs a real point on each
    # side of the touch; a touch at the very start/end of the window has
    # no "before" or "after" leg to compare, so this is legitimately
    # missing sometimes, not silently zero.
    direction_change_at_touch = None
    if touch_idx >= 1 and touch_idx + 1 < len(ball_track):
        _, x0, y0 = ball_track[touch_idx - 1]
        _, x1, y1 = ball_track[touch_idx]
        _, x2, y2 = ball_track[touch_idx + 1]
        direction_change_at_touch = _angle_between_degrees((x1 - x0, y1 - y0), (x2 - x1, y2 - y1))

    ball_acceleration_norm = (speed_after - speed_before) / frame_w

    # Real body-mechanics signal at the touch itself: a pass typically
    # involves a bigger, more decisive strike (straighter plant/kicking
    # leg, faster ankle swing) than a small controlled dribble touch. Pose
    # estimation runs only on the ball-nearest player's own bbox crop at
    # the touch frame (and, for ankle velocity, one neighboring frame with
    # a person still detected) -- never the full multi-person frame.
    touch_frame_idx = ball_track[touch_idx][0]
    touch_person = nearest_person[touch_idx]
    knee_angle, leg_extension_norm, ankle_velocity_norm = None, None, None
    if touch_person is not None:
        touch_pose = estimate_pose_on_crop(frames[touch_frame_idx], touch_person.xyxy)
        if touch_pose is not None:
            knee_angle, leg_extension_norm = _leg_metrics(touch_pose, frame_w, frame_h)
            neighbor_idx = touch_frame_idx + 1 if touch_frame_idx + 1 < len(frames) else touch_frame_idx - 1
            # Match by track_id, not just "whoever's in frame" -- BoT-SORT
            # already gives track continuity across adjacent sampled
            # frames, so this is the same physical player, not a guess.
            neighbor_person = (
                next((d for d in person_dets_by_frame[neighbor_idx] if d.track_id == touch_person.track_id), None)
                if 0 <= neighbor_idx < len(frames)
                else None
            )
            if neighbor_person is not None:
                neighbor_pose = estimate_pose_on_crop(frames[neighbor_idx], neighbor_person.xyxy)
                if neighbor_pose is not None:
                    a1 = touch_pose.landmarks[LEFT_ANKLE] if touch_pose.landmarks[LEFT_ANKLE][2] >= touch_pose.landmarks[RIGHT_ANKLE][2] else touch_pose.landmarks[RIGHT_ANKLE]
                    a2 = neighbor_pose.landmarks[LEFT_ANKLE] if neighbor_pose.landmarks[LEFT_ANKLE][2] >= neighbor_pose.landmarks[RIGHT_ANKLE][2] else neighbor_pose.landmarks[RIGHT_ANKLE]
                    if a1[2] >= MIN_LANDMARK_VISIBILITY and a2[2] >= MIN_LANDMARK_VISIBILITY:
                        ankle_velocity_norm = math.hypot((a1[0] - a2[0]) * frame_w, (a1[1] - a2[1]) * frame_h) / frame_w

    pose_available = knee_angle is not None

    return {
        "min_ball_person_dist_norm": min_dist / frame_w,
        "speed_before_norm": speed_before / frame_w,
        "speed_after_norm": speed_after / frame_w,
        "speed_ratio": (speed_after + 1e-6) / (speed_before + 1e-6),
        "close_frac": close_frac,
        "ball_frame_coverage": len(ball_track) / len(frames),
        "touch_position_in_window": touch_idx / max(1, len(ball_track) - 1),
        "pose_available": 1.0 if pose_available else 0.0,
        "knee_angle_at_touch": knee_angle if knee_angle is not None else POSE_MISSING_SENTINEL,
        "leg_extension_norm": leg_extension_norm if leg_extension_norm is not None else POSE_MISSING_SENTINEL,
        "ankle_velocity_norm": ankle_velocity_norm if ankle_velocity_norm is not None else POSE_MISSING_SENTINEL,
        "ball_acceleration_norm": ball_acceleration_norm,
        "direction_change_available": 1.0 if direction_change_at_touch is not None else 0.0,
        "direction_change_at_touch": direction_change_at_touch if direction_change_at_touch is not None else ANGLE_MISSING_SENTINEL,
    }
