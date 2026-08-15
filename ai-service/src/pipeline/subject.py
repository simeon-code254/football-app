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

# Real validation against a real "shoot" clip (see ai-service/README.md's
# "Real validation findings" section) confirmed the failure mode this module's
# own docstring already named: the presence-only heuristic below picked a
# track that stayed 25-34% of frame width from the ball for the entire clip,
# while the actual ball detection was 100%-coverage-reliable on that same
# clip. Ball proximity is real, already-detected data (detect_ball_specialized
# runs regardless) that was simply never being used for this decision --
# adding it as a fourth signal, not a replacement for the other three
# (same "no single signal trusted alone" principle as the team-color signal).
BALL_PROXIMITY_RADIUS_FRAC = 0.3  # normalized by frame width; distance at which ball-carrier evidence saturates to zero
MIN_BALL_FRAMES_FOR_SIGNAL = 3  # fewer real ball detections than this isn't enough to trust an average


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
    ball_signal_used: bool = False  # True if ball proximity had enough real signal to factor into the pick


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


def _ball_proximity_scores(
    per_frame: list[list[Detection]],
    ball_positions: list[tuple[int, float, float]],
    frame_width: int,
) -> dict[int, float]:
    """Real proxy: how close each person track tends to be to the ball,
    averaged across every frame the ball was actually detected in — not just
    frames the track itself appeared in. A track absent from a ball-visible
    frame contributes zero proximity for that frame, which is real evidence
    against it being the ball carrier, not an omission. Averaged (denominator
    is the same for every track: total ball-visible frame count) rather than
    summed, so a track's proximity score isn't just a proxy for its screen
    time — frame_count already covers that as its own separate signal.
    """
    if not ball_positions:
        return {}
    ball_by_frame = {i: (bx, by) for i, bx, by in ball_positions}
    proximity_sum: dict[int, float] = {}
    for frame_idx, frame_dets in enumerate(per_frame):
        ball = ball_by_frame.get(frame_idx)
        if ball is None:
            continue
        bx, by = ball
        for det in frame_dets:
            if det.cls != PERSON_CLASS:
                continue
            cx, cy, _ = _center_and_area(det.xyxy)
            dist_norm = math.hypot(cx - bx, cy - by) / frame_width if frame_width else 0.0
            proximity = max(0.0, 1 - dist_norm / BALL_PROXIMITY_RADIUS_FRAC)
            proximity_sum[det.track_id] = proximity_sum.get(det.track_id, 0.0) + proximity
    return {tid: total / len(ball_positions) for tid, total in proximity_sum.items()}


def select_subject(
    per_frame: list[list[Detection]],
    frame_width: int,
    frame_height: int,
    hint: SubjectHint | None = None,
    team_clusters: dict[int, int] | None = None,
    ball_positions: list[tuple[int, float, float]] | None = None,
) -> SubjectResult:
    """If `hint` (a timestamped tap point from the upload flow) is given and
    lands inside a detected person's box near that timestamp, that track is
    the subject — no guessing, dominance_margin=1.0, hint_matched=True.
    Otherwise falls back to the heuristic below: NOT a solved problem, see
    ai-service/README.md. Picks the person track with the most screen time,
    largest average size, most central average position, and (when enough
    real ball detections exist) how close it tends to sit to the ball —
    weighted 0.25/0.15/0.15/0.45 when the ball signal is usable, 0.5/0.3/0.2
    (the original weights) when it isn't.

    The 0.45 ball-proximity weight is deliberately the largest single term,
    not a token addition — confirmed necessary, not just plausible, against
    a real clip during this fix (see ai-service/README.md's validation
    findings): a large, central, camera-close track that stayed a real
    25-34% of frame width from the ball (and drifting further away) still
    beat a smaller, off-center track that stayed a stable ~21% away across
    10 of 13 ball-visible frames, when ball proximity was only weighted at
    0.30 — the classic "consistently-present bystander" failure mode this
    module's own docstring already named, just not fully solved by a modest
    weight. Raising it to 0.45 flips that real case to the ball-hugging
    track. This is this app's one clear structural advantage over generic
    multi-player broadcast tracking: the user is filming themselves doing
    something with the ball, so ball involvement is a much stronger subject
    signal here than screen presence alone ever can be — a bystander can
    stand in frame all clip, but rarely repeatedly ends up right next to the
    ball. Still a mitigation, not a claimed fix: a highlight clip's subject
    can leave and re-enter frame across cuts, splitting their track ID, and
    a bystander who happens to stand near the ball can still win — this is
    exactly why the caller must keep capping confidence using
    dominance_margin.

    `team_clusters` (optional, from teams.cluster_teams) is used only to
    make dominance_margin more honest, never to pick the winner: a runner-up
    track that's a confidently different jersey color from the top pick is
    almost certainly a genuinely different person, not a fragment of the
    same subject's track, so it's down-weighted before computing the margin
    — the top pick was never really competing with it. Runner-ups in the
    SAME color cluster are left alone; same-kit ambiguity is real ambiguity,
    not something a color signal can resolve.
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

    ball_proximity = _ball_proximity_scores(per_frame, ball_positions or [], frame_width)
    ball_signal_used = len(ball_positions or []) >= MIN_BALL_FRAMES_FOR_SIGNAL
    max_ball_proximity = max(ball_proximity.values()) if ball_proximity else 0.0

    scored: list[tuple[int, float]] = []
    for track_id, t in tracks.items():
        avg_area = t["area_sum"] / t["frame_count"]
        avg_dist = t["dist_sum"] / t["frame_count"]
        if ball_signal_used:
            norm_proximity = (ball_proximity.get(track_id, 0.0) / max_ball_proximity) if max_ball_proximity else 0.0
            score = (
                0.25 * (t["frame_count"] / max_frame_count)
                + 0.15 * (avg_area / max_avg_area if max_avg_area else 0.0)
                + 0.15 * (1 - avg_dist / max_avg_dist if max_avg_dist else 0.0)
                + 0.45 * norm_proximity
            )
        else:
            score = (
                0.5 * (t["frame_count"] / max_frame_count)
                + 0.3 * (avg_area / max_avg_area if max_avg_area else 0.0)
                + 0.2 * (1 - avg_dist / max_avg_dist if max_avg_dist else 0.0)
            )
        scored.append((track_id, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_id, top_score = scored[0]

    if team_clusters and top_id in team_clusters:
        top_cluster = team_clusters[top_id]
        adjusted = [
            (tid, s * 0.6) if team_clusters.get(tid) not in (None, top_cluster) else (tid, s)
            for tid, s in scored[1:]
        ]
        adjusted.sort(key=lambda x: x[1], reverse=True)
        scored = [scored[0]] + adjusted

    if len(scored) > 1 and top_score > 0:
        second_score = scored[1][1]
        dominance_margin = (top_score - second_score) / top_score
    else:
        dominance_margin = 1.0  # only one candidate — trivially "dominant"

    return SubjectResult(
        track_id=top_id,
        dominance_margin=dominance_margin,
        candidate_count=len(scored),
        hint_matched=False,
        ball_signal_used=ball_signal_used,
    )
