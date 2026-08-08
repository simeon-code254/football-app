import math
from dataclasses import dataclass

from src.config import FPS_SAMPLE_RATE
from src.pipeline.detect_track import PERSON_CLASS, Detection

# How far (in seconds) from the tap's actual timestamp we'll still trust a
# match. The tap frame is decoded client-side (expo-video-thumbnails) and
# the service decodes its own frames independently (OpenCV) — they won't
# line up exactly, but the subject also won't have teleported. Wide enough
# to absorb decoder disagreement, narrow enough that a match outside this
# window is more likely "some other frame that happens to line up" than
# genuinely the tapped moment.
HINT_TIME_TOLERANCE_S = 2.0


@dataclass
class SubjectHint:
    x: float  # normalized 0-1
    y: float  # normalized 0-1
    time_s: float  # when this (x,y) was captured, seconds into the clip


@dataclass
class SubjectResult:
    track_id: int | None
    dominance_margin: float  # 0 if fewer than 2 candidate tracks
    candidate_count: int
    hint_matched: bool  # True if a user-provided tap point identified the subject directly


def _center_and_area(xyxy: tuple[float, float, float, float]) -> tuple[float, float, float]:
    x1, y1, x2, y2 = xyxy
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    return cx, cy, area


def _match_hint(per_frame: list[list[Detection]], frame_width: int, frame_height: int, hint: SubjectHint) -> int | None:
    """The tap is only meaningful near the moment it was taken — the subject
    moves, so the same (x,y) means something different a few seconds later.
    Searches this service's own sampled frames ordered by how close their
    timestamp is to hint.time_s (closest first), within
    HINT_TIME_TOLERANCE_S, for the first person detection whose box
    contains the tapped point. Returns None (caller falls back to the
    heuristic) if nothing matches within that window — a match found far
    from the real tap moment is more likely coincidence than the same
    person, so this deliberately does not fall back to searching the whole
    clip.
    """
    px, py = hint.x * frame_width, hint.y * frame_height
    target_frame_idx = hint.time_s * FPS_SAMPLE_RATE
    max_frame_delta = HINT_TIME_TOLERANCE_S * FPS_SAMPLE_RATE

    frame_order = sorted(range(len(per_frame)), key=lambda i: abs(i - target_frame_idx))

    for frame_idx in frame_order:
        if abs(frame_idx - target_frame_idx) > max_frame_delta:
            break  # frame_order is sorted by distance — nothing further out will be closer
        for det in per_frame[frame_idx]:
            if det.cls != PERSON_CLASS:
                continue
            x1, y1, x2, y2 = det.xyxy
            if x1 <= px <= x2 and y1 <= py <= y2:
                return det.track_id
    return None


def select_subject(
    per_frame: list[list[Detection]],
    frame_width: int,
    frame_height: int,
    hint: SubjectHint | None = None,
) -> SubjectResult:
    """If `hint` (a timestamped tap point from the upload flow) is given and
    lands inside a detected person's box near that timestamp, that track is
    the subject — no guessing, dominance_margin=1.0, hint_matched=True.
    Otherwise falls back to the heuristic below: NOT a solved problem, see
    ai-service/README.md. Picks the person track with the most screen time,
    largest average size, and most central average position, weighted
    0.5/0.3/0.2. Known failure mode: a highlight clip's subject can leave
    and re-enter frame across cuts, splitting their track ID — this can
    make a consistently-present bystander outscore the true subject. This
    is exactly why the caller must cap confidence using dominance_margin.
    """
    if hint is not None:
        matched_id = _match_hint(per_frame, frame_width, frame_height, hint)
        if matched_id is not None:
            return SubjectResult(track_id=matched_id, dominance_margin=1.0, candidate_count=1, hint_matched=True)

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
        return SubjectResult(track_id=None, dominance_margin=0.0, candidate_count=0, hint_matched=False)

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

    return SubjectResult(
        track_id=top_id, dominance_margin=dominance_margin, candidate_count=len(scored), hint_matched=False
    )
