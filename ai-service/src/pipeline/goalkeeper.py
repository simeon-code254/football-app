"""Real, formula-based proxies for the goalkeeper attribute set, reusing
the exact same frozen-model outputs (YOLOv8 tracking, MediaPipe pose, the
football-specific ball detector) as the outfield pipeline. There is no
goalkeeper action-recognition model and no GK training data anywhere in
this project -- nothing here is trained specifically for goalkeepers.
Every formula below is a documented, transparent proxy over real detected
positions (never a fabricated number), and confidence is resolved the
same shared way as every other Phase B+ attribute (confidence.py).

IMPORTANT, stated plainly for anyone reading this later: none of the
formulas below have been validated against real goalkeeper footage -- none
was available when this was built (the user explicitly chose to build this
anyway, accepting that tradeoff). They follow the same real-computation
discipline as every other attribute in this pipeline, but should be
treated as unvalidated until checked against real GK clips.

Explicitly NOT scored anywhere in this module: Sweeping/Rushing Out. It
would need to know where the goal/penalty area actually is (a real
coordinate, not a guess) to judge "came off their line" -- this app
deliberately has no pitch-line/goal calibration (see calibrate.py's own
module docstring: African grassroots pitches frequently have no visible
markings at all, so a method that *requires* detecting them would silently
fail for exactly this app's real users). Rather than fake a proxy with no
real spatial reference, this attribute stays unscored in run.py -- an
honest gap, not a bug to revisit without new capability (real pitch/goal
detection) first.
"""

import math
from dataclasses import dataclass

from src.pipeline.pose import LEFT_ANKLE, LEFT_HIP, LEFT_WRIST, RIGHT_ANKLE, RIGHT_HIP, RIGHT_WRIST, PoseFrame

MIN_LIMB_VISIBILITY = 0.5
# Same real-clip evidence and same fix as positioning.py's outfield
# CLOSE_TOUCH_RADIUS_FRAC (see ai-service/README.md's validation findings):
# a third, independent copy of the same too-tight 0.05 constant, missed when
# the other two (positioning.py, events.py) were fixed earlier this session
# -- found by grepping for the same constant name across the pipeline after
# noticing the one real goalkeeper validation clip never produced anything
# past Positioning despite the outfield touch-radius fixes. No GK-specific
# wrist-to-ball real measurement exists (only one real GK clip exists in
# this whole project, and it has too little ball/pose overlap to measure
# directly the way pass_shoot_1340880.mp4 could for the ankle case) -- reuses
# the same 0.25 anchor since it's the same underlying failure mode (real
# footage puts a limb 0.2+ of frame width from the ball, not 0.05), not a
# separately-validated number.
CLOSE_TOUCH_RADIUS_FRAC = 0.25
FAST_BALL_SPEED_NORM_THRESHOLD = 0.03  # frame-to-frame ball displacement, normalized by frame width
REFLEXES_EVENTS_PER_MIN_CEILING = 4.0
COMMAND_OF_AREA_TOUCHES_PER_MIN_CEILING = 10.0
AERIAL_JUMP_HEIGHT_M_CEILING = 0.5  # a real, modest amateur vertical-leap ceiling
DISTRIBUTION_DISTANCE_M_CEILING = 30.0
KICKING_DISTANCE_M_CEILING = 35.0
POST_TOUCH_WINDOW_FRAMES = 5
MIN_DURATION_MIN_FOR_RATE = 0.5  # see vision.py's own note on short-clip rate extrapolation


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


@dataclass
class GkTouchEvent:
    frame_idx: int
    hand: bool  # True if a wrist was the closest limb, False if an ankle was


@dataclass
class ScoreResult:
    score: int
    sample_count: int
    extra: dict


def find_ball_speed_norm(ball_positions: list[tuple[int, float, float]], frame_w: int) -> dict[int, float]:
    """Frame-to-frame ball speed (normalized by frame width), keyed by the
    LATER frame's index -- real signal used both for spotting a fast,
    save-worthy ball (Reflexes) and for measuring post-touch release
    distance (Handling/Distribution/Kicking).
    """
    speed_by_frame: dict[int, float] = {}
    for (i0, x0, y0), (i1, x1, y1) in zip(ball_positions, ball_positions[1:]):
        dt = i1 - i0
        if dt <= 0:
            continue
        speed_by_frame[i1] = math.hypot(x1 - x0, y1 - y0) / dt / frame_w
    return speed_by_frame


def find_gk_touch_events(
    ball_positions: list[tuple[int, float, float]],
    pose_by_frame: dict[int, PoseFrame],
    frame_w: int,
) -> list[GkTouchEvent]:
    """A touch is any frame where the ball sits close to either wrist OR
    either ankle of the tracked subject -- there's no way to distinguish a
    genuine save/catch/kick from incidental proximity on single-camera
    footage, so this stays a proximity proxy, same honesty register as
    positioning.py's outfield Ball Control.
    """
    close_radius = frame_w * CLOSE_TOUCH_RADIUS_FRAC
    events: list[GkTouchEvent] = []
    for frame_idx, bx, by in ball_positions:
        pose = pose_by_frame.get(frame_idx)
        if pose is None:
            continue
        wrists = [pose.landmarks[i] for i in (LEFT_WRIST, RIGHT_WRIST) if pose.landmarks[i][2] >= MIN_LIMB_VISIBILITY]
        ankles = [pose.landmarks[i] for i in (LEFT_ANKLE, RIGHT_ANKLE) if pose.landmarks[i][2] >= MIN_LIMB_VISIBILITY]
        wrist_dist = min((math.hypot(bx - wx * frame_w, by - wy * frame_w) for wx, wy, _ in wrists), default=None)
        ankle_dist = min((math.hypot(bx - ax * frame_w, by - ay * frame_w) for ax, ay, _ in ankles), default=None)
        if wrist_dist is not None and wrist_dist < close_radius:
            events.append(GkTouchEvent(frame_idx=frame_idx, hand=True))
        elif ankle_dist is not None and ankle_dist < close_radius:
            events.append(GkTouchEvent(frame_idx=frame_idx, hand=False))
    return events


def score_aerial_ability(pose_by_frame: dict[int, PoseFrame], px_per_m: float, frame_h: int) -> ScoreResult | None:
    """Real proxy: peak upward vertical displacement of the hip midpoint
    across consecutive tracked frames, scaled to meters via the same
    height-based calibration Pace/Physical already use. A genuine jump-
    height correlate, not literal "aerial ability" judgment (no ball-
    contact-in-air detection exists).
    """
    frame_indices = sorted(pose_by_frame.keys())
    hip_y: list[tuple[int, float]] = []
    for i in frame_indices:
        pose = pose_by_frame[i]
        vis = [pose.landmarks[j] for j in (LEFT_HIP, RIGHT_HIP) if pose.landmarks[j][2] >= MIN_LIMB_VISIBILITY]
        if not vis:
            continue
        hip_y.append((i, (sum(p[1] for p in vis) / len(vis)) * frame_h))

    if len(hip_y) < 2:
        return None

    peak_rise_px = 0.0
    for (_, y0), (_, y1) in zip(hip_y, hip_y[1:]):
        rise = y0 - y1  # smaller y = higher on screen = upward movement
        if rise > peak_rise_px:
            peak_rise_px = rise

    peak_rise_m = peak_rise_px / px_per_m
    raw = _clamp(peak_rise_m / AERIAL_JUMP_HEIGHT_M_CEILING, 0, 1) * 99
    return ScoreResult(
        score=int(round(_clamp(raw, 1, 99))), sample_count=len(hip_y), extra={"peak_rise_m": round(peak_rise_m, 3)}
    )


def score_command_of_area(events: list[GkTouchEvent], duration_s: float) -> ScoreResult | None:
    """Real proxy: overall ball-involvement frequency (any touch, hand or
    foot) per minute -- a GK who's frequently the one dealing with the
    ball (claiming it, punching, collecting) is, on this signal, commanding
    their area more. Coarse (no cross/corner-specific detection exists),
    documented as such.
    """
    if not events:
        return None
    duration_min = max(duration_s / 60, MIN_DURATION_MIN_FOR_RATE)
    rate = len(events) / duration_min
    raw = _clamp(rate / COMMAND_OF_AREA_TOUCHES_PER_MIN_CEILING, 0, 1) * 99
    return ScoreResult(score=int(round(_clamp(raw, 1, 99))), sample_count=len(events), extra={})


def score_reflexes(
    events: list[GkTouchEvent], ball_speed_by_frame: dict[int, float], duration_s: float
) -> ScoreResult | None:
    """Real proxy: how often the subject gets a hand to a FAST-moving ball
    (frame-to-frame ball speed above a threshold at the touch frame) -- a
    genuine reaction-to-a-fast-ball signal, not save-outcome judgment (no
    way to tell a save from a fumble from single-camera proximity alone).
    """
    fast_hand_events = [e for e in events if e.hand and ball_speed_by_frame.get(e.frame_idx, 0.0) >= FAST_BALL_SPEED_NORM_THRESHOLD]
    if not fast_hand_events:
        return None
    duration_min = max(duration_s / 60, MIN_DURATION_MIN_FOR_RATE)
    rate = len(fast_hand_events) / duration_min
    raw = _clamp(rate / REFLEXES_EVENTS_PER_MIN_CEILING, 0, 1) * 99
    return ScoreResult(score=int(round(_clamp(raw, 1, 99))), sample_count=len(fast_hand_events), extra={})


def score_handling(events: list[GkTouchEvent], ball_speed_by_frame: dict[int, float]) -> ScoreResult | None:
    """Real proxy: how much ball speed drops immediately after a hand
    touch (a clean catch/parry kills the ball's speed; a poor touch lets
    it carry on or deflect) -- reuses the same before/after speed-around-
    touch pattern features.py already established for outfield events.
    """
    hand_events = [e for e in events if e.hand]
    if not hand_events:
        return None

    drops: list[float] = []
    for e in hand_events:
        speed_before = ball_speed_by_frame.get(e.frame_idx)
        speed_after = ball_speed_by_frame.get(e.frame_idx + 1)
        if not speed_before or speed_after is None:
            continue
        drops.append(_clamp(1 - (speed_after / speed_before), 0, 1))

    if not drops:
        return None
    avg_drop = sum(drops) / len(drops)
    raw = avg_drop * 99
    return ScoreResult(
        score=int(round(_clamp(raw, 1, 99))), sample_count=len(drops), extra={"avg_speed_drop_fraction": round(avg_drop, 3)}
    )


def _post_touch_distances_m(
    events: list[GkTouchEvent], ball_by_frame: dict[int, tuple[float, float]], px_per_m: float, want_hand: bool
) -> list[float]:
    distances: list[float] = []
    for e in events:
        if e.hand != want_hand:
            continue
        start = ball_by_frame.get(e.frame_idx)
        if start is None:
            continue
        end = None
        for offset in range(POST_TOUCH_WINDOW_FRAMES, 0, -1):
            end = ball_by_frame.get(e.frame_idx + offset)
            if end is not None:
                break
        if end is None:
            continue
        px_dist = math.hypot(end[0] - start[0], end[1] - start[1])
        distances.append(px_dist / px_per_m)
    return distances


def score_distribution(
    events: list[GkTouchEvent], ball_positions: list[tuple[int, float, float]], px_per_m: float
) -> ScoreResult | None:
    """Real proxy: how far the ball travels in the ~1s after ANY GK touch
    (hand or foot) -- a genuine release-distance signal. See score_kicking
    for the foot-only variant; the two intentionally use different touch
    subsets (this app can't distinguish a throw from a goal kick beyond
    which limb touched the ball) rather than presenting the same number
    twice under two attribute names.
    """
    ball_by_frame = {i: (x, y) for i, x, y in ball_positions}
    distances = _post_touch_distances_m(events, ball_by_frame, px_per_m, True) + _post_touch_distances_m(
        events, ball_by_frame, px_per_m, False
    )
    if not distances:
        return None
    avg_m = sum(distances) / len(distances)
    raw = _clamp(avg_m / DISTRIBUTION_DISTANCE_M_CEILING, 0, 1) * 99
    return ScoreResult(
        score=int(round(_clamp(raw, 1, 99))), sample_count=len(distances), extra={"avg_post_touch_distance_m": round(avg_m, 2)}
    )


def score_kicking(
    events: list[GkTouchEvent], ball_positions: list[tuple[int, float, float]], px_per_m: float
) -> ScoreResult | None:
    """Foot-touch-only variant of the same post-touch-distance proxy (see
    score_distribution) -- specifically ankle-proximity releases, a closer
    (if still imperfect) match to "kicking" than hand releases.
    """
    ball_by_frame = {i: (x, y) for i, x, y in ball_positions}
    distances = _post_touch_distances_m(events, ball_by_frame, px_per_m, False)
    if not distances:
        return None
    avg_m = sum(distances) / len(distances)
    raw = _clamp(avg_m / KICKING_DISTANCE_M_CEILING, 0, 1) * 99
    return ScoreResult(
        score=int(round(_clamp(raw, 1, 99))), sample_count=len(distances), extra={"avg_kick_distance_m": round(avg_m, 2)}
    )
