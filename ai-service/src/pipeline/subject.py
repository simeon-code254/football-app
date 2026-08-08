import math
from dataclasses import dataclass

from src.pipeline.detect_track import PERSON_CLASS, Detection


@dataclass
class SubjectResult:
    track_id: int | None
    dominance_margin: float  # 0 if fewer than 2 candidate tracks
    candidate_count: int


def _center_and_area(xyxy: tuple[float, float, float, float]) -> tuple[float, float, float]:
    x1, y1, x2, y2 = xyxy
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    return cx, cy, area


def select_subject(per_frame: list[list[Detection]], frame_width: int, frame_height: int) -> SubjectResult:
    """Heuristic subject-player disambiguation — NOT a solved problem, see
    ai-service/README.md. Picks the person track with the most screen time,
    largest average size, and most central average position, weighted
    0.5/0.3/0.2. Known failure mode: a highlight clip's subject can leave
    and re-enter frame across cuts, splitting their track ID — this can
    make a consistently-present bystander outscore the true subject. This
    is exactly why the caller must cap confidence using dominance_margin.
    """
    frame_area = frame_width * frame_height
    frame_cx, frame_cy = frame_width / 2, frame_height / 2
    max_center_dist = math.hypot(frame_cx, frame_cy) or 1.0

    tracks: dict[int, dict] = {}
    for frame_dets in per_frame:
        for det in frame_dets:
            if det.cls != PERSON_CLASS:
                continue
            cx, cy, area = _center_and_area(det.xyxy)
            center_dist = math.hypot(cx - frame_cx, cy - frame_cy)
            t = tracks.setdefault(det.track_id, {"frame_count": 0, "area_sum": 0.0, "dist_sum": 0.0})
            t["frame_count"] += 1
            t["area_sum"] += area / frame_area if frame_area else 0.0
            t["dist_sum"] += center_dist / max_center_dist

    if not tracks:
        return SubjectResult(track_id=None, dominance_margin=0.0, candidate_count=0)

    max_frame_count = max(t["frame_count"] for t in tracks.values())
    max_avg_area = max(t["area_sum"] / t["frame_count"] for t in tracks.values())
    max_avg_dist = max(t["dist_sum"] / t["frame_count"] for t in tracks.values()) or 1.0

    scored: list[tuple[int, float]] = []
    for track_id, t in tracks.items():
        avg_area = t["area_sum"] / t["frame_count"]
        avg_dist = t["dist_sum"] / t["frame_count"]
        score = (
            0.5 * (t["frame_count"] / max_frame_count)
            + 0.3 * (avg_area / max_avg_area if max_avg_area else 0.0)
            + 0.2 * (1 - avg_dist / max_avg_dist if max_avg_dist else 0.0)
        )
        scored.append((track_id, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_id, top_score = scored[0]
    if len(scored) > 1 and top_score > 0:
        second_score = scored[1][1]
        dominance_margin = (top_score - second_score) / top_score
    else:
        dominance_margin = 1.0  # only one candidate — trivially "dominant"

    return SubjectResult(track_id=top_id, dominance_margin=dominance_margin, candidate_count=len(scored))
