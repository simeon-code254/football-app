import math
from dataclasses import dataclass, field

from src.config import FPS_SAMPLE_RATE
from src.pipeline.detect_track import PERSON_CLASS, Detection

MAX_PLAUSIBLE_KMH = 40.0
# 18 km/h matches Catapult's own commonly-used sprint-threshold default in
# GPS sports-science tooling; published high-speed-running literature more
# broadly puts the range at ~19.8-25.2 km/h high-speed / >25.2 km/h strict
# sprinting. Kept at 18 rather than raised, since amateur/grassroots footage
# (this app's actual usage) skews slower than pro-level GPS datasets.
SPRINT_THRESHOLD_KMH = 18.0
DIRECTION_CHANGE_DEGREES = 45.0
PACE_FLOOR_KMH = 15.0
PACE_CEILING_KMH = 32.0
PHYSICAL_AVG_SPEED_CEILING_MPS = 4.5
PHYSICAL_SPRINTS_PER_MIN_CEILING = 8.0
PHYSICAL_DIR_CHANGES_PER_MIN_CEILING = 20.0

MIN_VALID_INTERVALS_FOR_MEDIUM = 30
MIN_DURATION_S_FOR_MEDIUM = 5.0
DOMINANCE_MARGIN_FOR_MEDIUM = 0.4


@dataclass
class MovementStats:
    peak_speed_kmh: float
    total_distance_m: float
    avg_speed_m_per_s: float
    sprint_count: int
    direction_change_count: int
    valid_interval_count: int


@dataclass
class AttributeResult:
    pace_score: int
    physical_score: int
    confidence: str  # 'Medium' | 'Low'
    movement: MovementStats


def _bottom_center(xyxy: tuple[float, float, float, float]) -> tuple[float, float]:
    x1, y1, x2, y2 = xyxy
    return (x1 + x2) / 2, y2


def _build_trajectory(per_frame: list[list[Detection]], subject_track_id: int) -> list[tuple[int, float, float]]:
    points = []
    for frame_idx, frame_dets in enumerate(per_frame):
        for det in frame_dets:
            if det.cls == PERSON_CLASS and det.track_id == subject_track_id:
                x, y = _bottom_center(det.xyxy)
                points.append((frame_idx, x, y))
                break
    return points


def compute_movement_stats(
    per_frame: list[list[Detection]], subject_track_id: int, px_per_m: float
) -> MovementStats:
    points = _build_trajectory(per_frame, subject_track_id)

    speeds_kmh: list[float] = []
    intervals: list[tuple[float, float]] = []  # (distance_m, bearing_degrees)

    for (f1, x1, y1), (f2, x2, y2) in zip(points, points[1:]):
        dt = (f2 - f1) / FPS_SAMPLE_RATE
        if dt <= 0:
            continue
        px_dist = math.hypot(x2 - x1, y2 - y1)
        meters = px_dist / px_per_m
        speed_kmh = (meters / dt) * 3.6
        if speed_kmh > MAX_PLAUSIBLE_KMH:
            continue  # tracking glitch / scene cut artifact
        speeds_kmh.append(speed_kmh)
        bearing = math.degrees(math.atan2(y2 - y1, x2 - x1))
        intervals.append((meters, bearing))

    if not speeds_kmh:
        return MovementStats(0.0, 0.0, 0.0, 0, 0, 0)

    sorted_speeds = sorted(speeds_kmh)
    p95_idx = min(len(sorted_speeds) - 1, math.ceil(0.95 * len(sorted_speeds)) - 1)
    peak_speed_kmh = sorted_speeds[p95_idx]

    total_distance_m = sum(d for d, _ in intervals)

    sprint_count = 0
    run_len = 0
    for s in speeds_kmh:
        if s >= SPRINT_THRESHOLD_KMH:
            run_len += 1
            if run_len == 2:
                sprint_count += 1
        else:
            run_len = 0

    direction_change_count = 0
    for (_, b1), (_, b2) in zip(intervals, intervals[1:]):
        delta = abs(b2 - b1) % 360
        if delta > 180:
            delta = 360 - delta
        if delta > DIRECTION_CHANGE_DEGREES:
            direction_change_count += 1

    return MovementStats(
        peak_speed_kmh=peak_speed_kmh,
        total_distance_m=total_distance_m,
        avg_speed_m_per_s=0.0,  # filled in by caller once clip duration is known
        sprint_count=sprint_count,
        direction_change_count=direction_change_count,
        valid_interval_count=len(speeds_kmh),
    )


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def score_pace(peak_speed_kmh: float) -> int:
    raw = 20 + (peak_speed_kmh - PACE_FLOOR_KMH) / (PACE_CEILING_KMH - PACE_FLOOR_KMH) * 79
    return int(round(_clamp(raw, 1, 99)))


def score_physical(movement: MovementStats, duration_s: float) -> int:
    duration_min = max(duration_s / 60, 1e-6)
    speed_term = _clamp(movement.avg_speed_m_per_s / PHYSICAL_AVG_SPEED_CEILING_MPS, 0, 1)
    sprint_term = _clamp((movement.sprint_count / duration_min) / PHYSICAL_SPRINTS_PER_MIN_CEILING, 0, 1)
    dir_term = _clamp((movement.direction_change_count / duration_min) / PHYSICAL_DIR_CHANGES_PER_MIN_CEILING, 0, 1)
    raw = 0.4 * speed_term * 99 + 0.3 * sprint_term * 99 + 0.3 * dir_term * 99
    return int(round(_clamp(raw, 1, 99)))


def resolve_confidence(dominance_margin: float, valid_interval_count: int, duration_s: float) -> str:
    """Capped at Medium — never High in this phase. See README for why."""
    if (
        dominance_margin > DOMINANCE_MARGIN_FOR_MEDIUM
        and valid_interval_count >= MIN_VALID_INTERVALS_FOR_MEDIUM
        and duration_s >= MIN_DURATION_S_FOR_MEDIUM
    ):
        return "Medium"
    return "Low"
