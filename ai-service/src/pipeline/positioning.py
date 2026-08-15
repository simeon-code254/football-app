"""Phase B: a movement-economy / spatial-coverage Positioning proxy, and a
partial Ball Control heuristic from foot-keypoint-to-ball proximity.

Both explicitly NOT tactical positioning -- this app tracks only the
uploader, with no pitch calibration or multi-player tracking, so there is no
way to judge a player's positioning relative to teammates, opponents, or the
pitch itself. What IS measurable from a single tracked subject is how much
ground they cover and how varied their on-screen positioning is over a
clip -- a real, transparent proxy, not tactical judgment. This distinction
must stay visible in any UI/API surface that shows this score (same honesty
register as calibrate.py's own error-band caveat).

Ball Control here is "partial": it counts real foot-to-ball proximity
events, purely formulaic, no model. Full Ball Control (Phase D) graduates to
using Phase C's classifier for cleaner touch/no-touch windows once that
exists.
"""

import math
from dataclasses import dataclass

from src.pipeline.pose import LEFT_ANKLE, RIGHT_ANKLE, PoseFrame

# Fraction of on-screen frame area a subject's trajectory bounding box would
# need to cover to score near-max on this proxy. Chosen conservatively --
# most amateur clips are a fairly tight, following shot, so even active
# players rarely fill more than a third of the frame's extent.
POSITIONING_SPREAD_CEILING = 0.35

# Real-clip evidence (see ai-service/README.md's validation findings), not a
# guess: on the one validation clip with full ball+pose overlap across every
# sampled frame (a real "shoot" clip), the closest measured ankle-to-ball
# distance -- at what's almost certainly the shot-contact frame -- was 0.22
# of frame width, over 5x the old 0.04 value; the very next sampled frame,
# with the ball already departing, measured ~0.39. 0.04 could never have
# fired on real footage at this camera framing. Anchored just above the one
# confirmed "still in contact" reading and well below the "ball has left"
# readings -- but this is calibrated from a single clip (the only one dense
# enough to measure), so treat as a real improvement over a guess, not a
# settled number; revisit once more real touch-labeled footage exists.
CLOSE_TOUCH_RADIUS_FRAC = 0.25  # fraction of frame width counted as "ball at the subject's feet"
BALL_CONTROL_TOUCHES_PER_MIN_CEILING = 25.0
BALL_CONTROL_CONSISTENCY_WEIGHT = 0.3
MIN_ANKLE_VISIBILITY = 0.5


@dataclass
class PositioningResult:
    score: int
    spread_fraction: float
    sample_count: int


@dataclass
class BallControlResult:
    score: int
    touch_count: int
    touches_per_min: float


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def score_positioning(subject_centers: list[tuple[float, float]], frame_w: int, frame_h: int) -> PositioningResult | None:
    """Real proxy: normalized bounding-box area of the subject's on-screen
    trajectory over the clip. A player who only ever appears in one small
    patch of frame scores low; a player covering visible ground scores
    higher. See module docstring for why this is not tactical positioning.
    """
    if len(subject_centers) < 2:
        return None

    xs = [c[0] for c in subject_centers]
    ys = [c[1] for c in subject_centers]
    spread_fraction = ((max(xs) - min(xs)) / frame_w) * ((max(ys) - min(ys)) / frame_h)

    raw = (spread_fraction / POSITIONING_SPREAD_CEILING) * 99
    return PositioningResult(
        score=int(round(_clamp(raw, 1, 99))),
        spread_fraction=spread_fraction,
        sample_count=len(subject_centers),
    )


def find_touch_frame_indices(
    ball_positions: list[tuple[int, float, float]],  # (frame_idx, cx, cy) in pixel space
    pose_by_frame: dict[int, PoseFrame],
    frame_w: int,
) -> list[int]:
    """Frames where the ball sits within CLOSE_TOUCH_RADIUS_FRAC of either
    ankle keypoint (not the whole-body bbox -- feet are what actually touch
    the ball). Shared by score_ball_control() below and, once Phase D's
    decision_making.py/defending.py need real touch-timing data, those
    modules too -- one definition of "the subject touched the ball," not
    three drifting copies.
    """
    close_radius = frame_w * CLOSE_TOUCH_RADIUS_FRAC
    touch_frame_indices: list[int] = []

    for frame_idx, bx, by in ball_positions:
        pose = pose_by_frame.get(frame_idx)
        if pose is None:
            continue
        ankles = [pose.landmarks[i] for i in (LEFT_ANKLE, RIGHT_ANKLE) if pose.landmarks[i][2] > MIN_ANKLE_VISIBILITY]
        if not ankles:
            continue
        min_dist = min(math.hypot(bx - ax * frame_w, by - ay * frame_w) for ax, ay, _ in ankles)
        if min_dist < close_radius:
            touch_frame_indices.append(frame_idx)

    return touch_frame_indices


def score_ball_control(
    ball_positions: list[tuple[int, float, float]],  # (frame_idx, cx, cy) in pixel space
    pose_by_frame: dict[int, PoseFrame],
    frame_w: int,
    duration_s: float,
) -> BallControlResult | None:
    """Scores touch frequency and interval consistency from
    find_touch_frame_indices() above. Purely formulaic, no model.
    """
    touch_frame_indices = find_touch_frame_indices(ball_positions, pose_by_frame, frame_w)

    if not touch_frame_indices:
        return None

    duration_min = max(duration_s / 60, 1e-6)
    touches_per_min = len(touch_frame_indices) / duration_min

    gaps = [b - a for a, b in zip(touch_frame_indices, touch_frame_indices[1:])]
    if len(gaps) >= 2:
        mean_gap = sum(gaps) / len(gaps)
        variance = sum((g - mean_gap) ** 2 for g in gaps) / len(gaps)
        cv = (variance**0.5) / mean_gap if mean_gap > 0 else 1.0
        consistency_term = _clamp(1 - cv, 0, 1)
    else:
        consistency_term = 0.0

    freq_term = _clamp(touches_per_min / BALL_CONTROL_TOUCHES_PER_MIN_CEILING, 0, 1)
    raw = (1 - BALL_CONTROL_CONSISTENCY_WEIGHT) * freq_term * 99 + BALL_CONTROL_CONSISTENCY_WEIGHT * consistency_term * 99

    return BallControlResult(
        score=int(round(_clamp(raw, 1, 99))),
        touch_count=len(touch_frame_indices),
        touches_per_min=round(touches_per_min, 2),
    )
