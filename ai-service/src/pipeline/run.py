import time
from dataclasses import dataclass

from ultralytics import __version__ as ultralytics_version

from src.pipeline.attributes import compute_movement_stats, resolve_confidence, score_pace, score_physical
from src.pipeline.calibrate import pixels_per_meter
from src.pipeline.detect_track import track_frames
from src.pipeline.extract import extract_frames
from src.pipeline.subject import select_subject


@dataclass
class PipelineResult:
    ok: bool
    skipped_reason: str | None
    scores: dict[str, tuple[int, str]] | None  # {'pace': (score, confidence), ...}
    result_summary: dict


def run_pipeline(video_bytes: bytes, player_height_cm: int | None, is_goalkeeper: bool) -> PipelineResult:
    t0 = time.monotonic()

    if is_goalkeeper:
        # No Pace/Physical-equivalent attribute exists in the goalkeeper
        # taxonomy — writing a speed number onto e.g. sweeping_rushing would
        # be a real number attached to the wrong meaning. See README.
        return PipelineResult(
            ok=True,
            skipped_reason=(
                "goalkeeper video: Phase A only computes Pace/Physical, which have no "
                "goalkeeper-category attribute row; goalkeeper scoring needs Phase C"
            ),
            scores=None,
            result_summary={"skipped_reason": "goalkeeper", "is_goalkeeper": True},
        )

    frames, duration_s = extract_frames(video_bytes)
    t_extract = time.monotonic()

    per_frame = track_frames(frames)
    t_track = time.monotonic()

    frame_h, frame_w = frames[0].shape[:2]
    subject = select_subject(per_frame, frame_width=frame_w, frame_height=frame_h)

    if subject.track_id is None:
        return PipelineResult(
            ok=False,
            skipped_reason="no person detected in any sampled frame",
            scores=None,
            result_summary={
                "frame_count": len(frames),
                "duration_s": duration_s,
                "error": "no_person_detected",
            },
        )

    px_per_m = pixels_per_meter(per_frame, subject.track_id, player_height_cm)
    if px_per_m is None or px_per_m <= 0:
        return PipelineResult(
            ok=False,
            skipped_reason="could not calibrate pixel-to-meter scale (no upright frame for the subject track)",
            scores=None,
            result_summary={
                "frame_count": len(frames),
                "duration_s": duration_s,
                "subject_track_id": subject.track_id,
                "error": "calibration_failed",
            },
        )

    movement = compute_movement_stats(per_frame, subject.track_id, px_per_m)
    movement.avg_speed_m_per_s = movement.total_distance_m / duration_s if duration_s > 0 else 0.0

    if movement.valid_interval_count == 0:
        return PipelineResult(
            ok=False,
            skipped_reason="subject was detected but never moved between consecutive tracked frames",
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

    t_score = time.monotonic()

    return PipelineResult(
        ok=True,
        skipped_reason=None,
        scores={"pace": (pace, confidence), "physical": (physical, confidence)},
        result_summary={
            "frame_count": len(frames),
            "duration_s": round(duration_s, 2),
            "subject_track_id": subject.track_id,
            "subject_candidate_count": subject.candidate_count,
            "subject_dominance_margin": round(subject.dominance_margin, 3),
            "calibration_source": "player.height_cm" if player_height_cm else "default_170cm",
            "pixels_per_meter": round(px_per_m, 2),
            "peak_speed_kmh": round(movement.peak_speed_kmh, 2),
            "total_distance_m": round(movement.total_distance_m, 2),
            "avg_speed_m_per_s": round(movement.avg_speed_m_per_s, 2),
            "sprint_count": movement.sprint_count,
            "direction_change_count": movement.direction_change_count,
            "valid_interval_count": movement.valid_interval_count,
            "model_version": f"yolov8n+ultralytics-{ultralytics_version}",
            "tracker": "bytetrack",
            "timings_s": {
                "extract": round(t_extract - t0, 2),
                "detect_track": round(t_track - t_extract, 2),
                "scoring": round(t_score - t_track, 2),
                "total": round(t_score - t0, 2),
            },
        },
    )
