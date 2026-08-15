import time
from dataclasses import dataclass

from ultralytics import __version__ as ultralytics_version

from src.pipeline.attributes import (
    compute_movement_stats,
    generate_recommendations,
    resolve_confidence,
    score_pace,
    score_physical,
)
from src.pipeline.calibrate import pixels_per_meter
from src.pipeline.confidence import resolve_confidence as resolve_phase_b_confidence
from src.pipeline.decision_making import score_decision_making
from src.pipeline.defending import score_defending
from src.pipeline.detect_track import PERSON_CLASS, detect_ball_specialized, track_frames
from src.pipeline.event_scoring import DRIVE_MODEL_PRECISION, PASS_MODEL_PRECISION, score_dribbling, score_passing
from src.pipeline.events import detect_events, find_subject_touch_frames
from src.pipeline.extract import extract_frames
from src.pipeline.goalkeeper import (
    find_gk_touch_events,
    find_ball_speed_norm,
    score_aerial_ability,
    score_command_of_area,
    score_distribution,
    score_handling,
    score_kicking,
    score_reflexes,
)
from src.pipeline.jersey import check_jersey_signal
from src.pipeline.pose import estimate_pose_on_crop
from src.pipeline.positioning import find_touch_frame_indices, score_ball_control, score_positioning
from src.pipeline.recommendations import combine as combine_recommendations
from src.pipeline.subject import SubjectHint, select_subject
from src.pipeline.teams import cluster_teams
from src.pipeline.vision import score_vision


@dataclass
class PipelineResult:
    ok: bool
    skipped_reason: str | None
    category: str  # 'outfield' | 'goalkeeper' — which taxonomy `scores` keys belong to
    scores: dict[str, tuple[int, str]] | None  # {'pace': (score, confidence), ...}
    result_summary: dict


def run_pipeline(
    video_bytes: bytes,
    player_height_cm: int | None,
    is_goalkeeper: bool,
    subject_hint: SubjectHint | None = None,
    jersey_number: int | None = None,
) -> PipelineResult:
    t0 = time.monotonic()
    category = "goalkeeper" if is_goalkeeper else "outfield"

    frames, duration_s = extract_frames(video_bytes)
    t_extract = time.monotonic()

    per_frame = track_frames(frames)
    t_track = time.monotonic()

    frame_h, frame_w = frames[0].shape[:2]
    team_clusters = cluster_teams(frames, per_frame)

    # Ball detection is moved ahead of subject selection (it used to run
    # only after) so select_subject() can actually use it -- real detected
    # ball positions, not just presence/size/centrality, as a signal for
    # which track is the true ball-involved subject. See subject.py's own
    # docstring and ai-service/README.md's validation findings for why this
    # was added.
    ball_per_frame = detect_ball_specialized(frames)
    ball_positions: list[tuple[int, float, float]] = []
    for i, balls in enumerate(ball_per_frame):
        if balls:
            best = max(balls, key=lambda d: d.conf)
            x1, y1, x2, y2 = best.xyxy
            ball_positions.append((i, (x1 + x2) / 2, (y1 + y2) / 2))

    subject = select_subject(
        per_frame,
        frame_width=frame_w,
        frame_height=frame_h,
        hint=subject_hint,
        team_clusters=team_clusters,
        ball_positions=ball_positions,
    )

    if subject.track_id is None:
        return PipelineResult(
            ok=False,
            skipped_reason="no person detected in any sampled frame",
            category=category,
            scores=None,
            result_summary={
                "frame_count": len(frames),
                "duration_s": duration_s,
                "subject_hint_provided": subject_hint is not None,
                "error": "no_person_detected",
            },
        )

    px_per_m = pixels_per_meter(per_frame, subject.track_id, player_height_cm)
    if px_per_m is None or px_per_m <= 0:
        return PipelineResult(
            ok=False,
            skipped_reason="could not calibrate pixel-to-meter scale (no upright frame for the subject track)",
            category=category,
            scores=None,
            result_summary={
                "frame_count": len(frames),
                "duration_s": duration_s,
                "subject_track_id": subject.track_id,
                "error": "calibration_failed",
            },
        )

    # ball_per_frame/ball_positions were already computed above (needed by
    # select_subject itself now); shared here by both branches below for
    # subject pose, at every frame the subject was tracked in.
    subject_centers: list[tuple[float, float]] = []
    pose_by_frame: dict[int, "PoseFrame"] = {}
    for i, dets in enumerate(per_frame):
        for det in dets:
            if det.cls == PERSON_CLASS and det.track_id == subject.track_id:
                sx1, sy1, sx2, sy2 = det.xyxy
                subject_centers.append(((sx1 + sx2) / 2, (sy1 + sy2) / 2))
                pose_frame = estimate_pose_on_crop(frames[i], det.xyxy)
                if pose_frame is not None:
                    pose_by_frame[i] = pose_frame
                break

    jersey_signal_conflict = check_jersey_signal(frames, per_frame, subject.track_id, jersey_number)

    common_summary = {
        "frame_count": len(frames),
        "duration_s": round(duration_s, 2),
        "subject_track_id": subject.track_id,
        "subject_hint_provided": subject_hint is not None,
        "subject_hint_matched": subject.hint_matched,
        "subject_candidate_count": subject.candidate_count,
        "subject_dominance_margin": round(subject.dominance_margin, 3),
        "subject_ball_signal_used": subject.ball_signal_used,
        "team_clusters_found": len(set(team_clusters.values())) if team_clusters else 0,
        "jersey_signal_conflict": jersey_signal_conflict,
        "calibration_source": "player.height_cm" if player_height_cm else "default_170cm",
        "pixels_per_meter": round(px_per_m, 2),
        "ball_detection_frame_coverage": round(len(ball_positions) / len(frames), 3) if frames else 0.0,
        "pose_frame_coverage": round(len(pose_by_frame) / len(frames), 3) if frames else 0.0,
        "is_goalkeeper": is_goalkeeper,
        "model_version": f"yolov8n+ultralytics-{ultralytics_version}",
        "tracker": "botsort+reid",
    }

    if is_goalkeeper:
        scores, gk_summary, skipped_reason = _score_goalkeeper(
            ball_positions, pose_by_frame, subject_centers, px_per_m, frame_w, frame_h, duration_s, len(frames)
        )
        t_score = time.monotonic()
        if not scores:
            return PipelineResult(
                ok=True,
                skipped_reason=skipped_reason,
                category=category,
                scores=None,
                result_summary={**common_summary, **gk_summary, "skipped_reason": skipped_reason},
            )
        return PipelineResult(
            ok=True,
            skipped_reason=None,
            category=category,
            scores=scores,
            result_summary={
                **common_summary,
                **gk_summary,
                "timings_s": {
                    "extract": round(t_extract - t0, 2),
                    "detect_track": round(t_track - t_extract, 2),
                    "scoring": round(t_score - t_track, 2),
                    "total": round(t_score - t0, 2),
                },
            },
        )

    movement = compute_movement_stats(per_frame, subject.track_id, px_per_m)
    movement.avg_speed_m_per_s = movement.total_distance_m / duration_s if duration_s > 0 else 0.0

    if movement.valid_interval_count == 0:
        return PipelineResult(
            ok=False,
            skipped_reason="subject was detected but never moved between consecutive tracked frames",
            category=category,
            scores=None,
            result_summary={
                "frame_count": len(frames),
                "duration_s": duration_s,
                "subject_track_id": subject.track_id,
                "error": "no_valid_movement_intervals",
            },
        )

    pace = score_pace(movement.peak_speed_kmh)
    physical = score_physical(movement, duration_s)
    confidence = resolve_confidence(subject.dominance_margin, movement.valid_interval_count, duration_s)

    positioning_result = score_positioning(subject_centers, frame_w, frame_h)
    ball_control_result = score_ball_control(ball_positions, pose_by_frame, frame_w, duration_s)
    touch_frame_indices = find_touch_frame_indices(ball_positions, pose_by_frame, frame_w)

    # Phase C: real pass/drive event detection + the scores built on top of
    # it. detect_events() returns [] (never a guess) if no trained
    # classifier file is present.
    events = detect_events(frames, per_frame, ball_per_frame, subject.track_id, frame_w)
    pass_events = [e for e in events if e.label == "pass"]
    passing_result = score_passing(events, duration_s)
    dribbling_result = score_dribbling(
        events, ball_control_result.touches_per_min if ball_control_result else None, duration_s
    )

    # decision_making.py needs touches counted the SAME way the pass/drive
    # events themselves were found (bbox-center-based) -- not positioning.py's
    # separate ankle-keypoint-based touch_frame_indices above, which uses a
    # different geometry calibrated for Ball Control. Recomputing here (cheap
    # pure geometry, no model inference) rather than threading a second
    # return value through detect_events() -- see find_subject_touch_frames()'s
    # own docstring for why this mismatch mattered in practice.
    event_touch_frame_indices = find_subject_touch_frames(per_frame, ball_per_frame, subject.track_id, frame_w)

    # Phase D: composite proxies built on top of Phase B/C's real signals.
    vision_result = score_vision(pose_by_frame, duration_s)
    decision_result = score_decision_making(event_touch_frame_indices, pass_events)
    defending_result = score_defending(touch_frame_indices, duration_s)

    scores: dict[str, tuple[int, str]] = {"pace": (pace, confidence), "physical": (physical, confidence)}
    event_coverage = round(len(ball_positions) / len(frames), 3) if frames else 0.0

    if positioning_result is not None:
        pos_confidence = resolve_phase_b_confidence(
            sample_count=positioning_result.sample_count, coverage=positioning_result.sample_count / len(frames)
        )
        scores["positioning"] = (positioning_result.score, pos_confidence)
    if ball_control_result is not None:
        bc_confidence = resolve_phase_b_confidence(sample_count=ball_control_result.touch_count, coverage=event_coverage)
        scores["ball_control"] = (ball_control_result.score, bc_confidence)
    if passing_result is not None:
        pass_confidence = resolve_phase_b_confidence(
            sample_count=passing_result.event_count, coverage=event_coverage, model_precision=PASS_MODEL_PRECISION
        )
        scores["passing"] = (passing_result.score, pass_confidence)
    if dribbling_result is not None:
        drib_confidence = resolve_phase_b_confidence(
            sample_count=dribbling_result.event_count, coverage=event_coverage, model_precision=DRIVE_MODEL_PRECISION
        )
        scores["dribbling"] = (dribbling_result.score, drib_confidence)
    if vision_result is not None:
        vis_confidence = resolve_phase_b_confidence(
            sample_count=vision_result.sample_count, coverage=vision_result.sample_count / len(frames)
        )
        scores["vision"] = (vision_result.score, vis_confidence)
    if decision_result is not None:
        dm_confidence = resolve_phase_b_confidence(sample_count=decision_result.sequence_count * 10, coverage=event_coverage)
        scores["decision_making"] = (decision_result.score, dm_confidence)
    if defending_result is not None:
        # Always Low -- this app tracks only the uploader, never an
        # opponent, so "won a tackle" is never really observed here. See
        # defending.py's module docstring. Not resolve_phase_b_confidence's
        # call — deliberately never allowed to earn Medium/High.
        scores["defending"] = (defending_result.score, "Low")

    recommendations = combine_recommendations(generate_recommendations(movement, duration_s))
    t_score = time.monotonic()

    return PipelineResult(
        ok=True,
        skipped_reason=None,
        category=category,
        scores=scores,
        result_summary={
            **common_summary,
            "positioning_spread_fraction": round(positioning_result.spread_fraction, 4) if positioning_result else None,
            "ball_touch_count": ball_control_result.touch_count if ball_control_result else 0,
            "ball_touches_per_min": ball_control_result.touches_per_min if ball_control_result else None,
            "pass_events_detected": len(pass_events),
            "drive_events_detected": len([e for e in events if e.label == "drive"]),
            "vision_scan_count": vision_result.scan_count if vision_result else None,
            "decision_making_avg_touches_to_release": decision_result.avg_touches_to_release if decision_result else None,
            "defending_recovery_count": defending_result.recovery_count if defending_result else None,
            "peak_speed_kmh": round(movement.peak_speed_kmh, 2),
            "total_distance_m": round(movement.total_distance_m, 2),
            "avg_speed_m_per_s": round(movement.avg_speed_m_per_s, 2),
            "sprint_count": movement.sprint_count,
            "direction_change_count": movement.direction_change_count,
            "valid_interval_count": movement.valid_interval_count,
            "recommendations": recommendations,
            "timings_s": {
                "extract": round(t_extract - t0, 2),
                "detect_track": round(t_track - t_extract, 2),
                "scoring": round(t_score - t_track, 2),
                "total": round(t_score - t0, 2),
            },
        },
    )


def _score_goalkeeper(
    ball_positions: list[tuple[int, float, float]],
    pose_by_frame: dict,
    subject_centers: list[tuple[float, float]],
    px_per_m: float,
    frame_w: int,
    frame_h: int,
    duration_s: float,
    frame_count: int,
) -> tuple[dict[str, tuple[int, str]], dict, str | None]:
    """Real, formula-based goalkeeper proxies -- see goalkeeper.py's module
    docstring for the full honesty caveats (unvalidated against real GK
    footage; Sweeping/Rushing Out deliberately left unscored, no pitch/goal
    calibration exists to judge it honestly).
    """
    gk_events = find_gk_touch_events(ball_positions, pose_by_frame, frame_w)
    ball_speed_by_frame = find_ball_speed_norm(ball_positions, frame_w)

    # Positioning reuses the exact same movement-spread formula as the
    # outfield attribute of the same name -- the proxy ("how much ground/
    # screen-space you covered") is position-agnostic.
    positioning_result = score_positioning(subject_centers, frame_w, frame_h)
    aerial = score_aerial_ability(pose_by_frame, px_per_m, frame_h)
    command = score_command_of_area(gk_events, duration_s)
    reflexes = score_reflexes(gk_events, ball_speed_by_frame, duration_s)
    handling = score_handling(gk_events, ball_speed_by_frame)
    distribution = score_distribution(gk_events, ball_positions, px_per_m)
    kicking = score_kicking(gk_events, ball_positions, px_per_m)

    scores: dict[str, tuple[int, str]] = {}
    summary: dict = {
        "gk_touch_events": len(gk_events),
        "sweeping_rushing_skipped_reason": "no pitch/goal-line calibration exists (see goalkeeper.py)",
    }

    pose_coverage = round(len(pose_by_frame) / frame_count, 3) if frame_count else 0.0
    ball_coverage = round(len(ball_positions) / frame_count, 3) if frame_count else 0.0

    def _add(key: str, result, coverage: float):
        if result is None:
            return
        conf = resolve_phase_b_confidence(sample_count=result.sample_count, coverage=coverage)
        scores[key] = (result.score, conf)
        summary[f"{key}_sample_count"] = result.sample_count
        summary.update({f"{key}_{k}": v for k, v in result.extra.items()})

    if positioning_result is not None:
        conf = resolve_phase_b_confidence(
            sample_count=positioning_result.sample_count, coverage=positioning_result.sample_count / frame_count
        )
        scores["positioning"] = (positioning_result.score, conf)
        summary["positioning_spread_fraction"] = round(positioning_result.spread_fraction, 4)
    _add("aerial_ability", aerial, pose_coverage)
    _add("command_of_area", command, ball_coverage)
    _add("reflexes", reflexes, ball_coverage)
    _add("handling", handling, ball_coverage)
    _add("distribution", distribution, ball_coverage)
    _add("kicking", kicking, ball_coverage)

    if not scores:
        return {}, summary, "no scoreable goalkeeper signal in this clip (no ball/pose proximity events detected)"
    return scores, summary, None
