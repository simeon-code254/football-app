"""Phase C: transparent scoring formulas over real detected pass/drive
events (events.py). The classifier's only job is ever "is this window a
pass or a drive touch, at what confidence" -- this module turns that into
an actual attribute score, the same two-stage (real numbers -> formula)
pattern every other attribute in this pipeline follows. Never presents the
classifier's raw label as a score by itself.
"""

from dataclasses import dataclass

from src.pipeline.events import EventDetection
from src.pipeline.positioning import BALL_CONTROL_TOUCHES_PER_MIN_CEILING

# Uncited, conservative engineering ceilings -- same treatment as
# attributes.py's own PHYSICAL_* ceilings (not literature-derived; a
# reasonable amateur-footage benchmark, subject to recalibration once real
# usage data accumulates, not claimed as a scientific figure).
PASSING_EVENTS_PER_MIN_CEILING = 10.0
DRIVE_EVENTS_PER_MIN_CEILING = 8.0
DRIBBLING_BALL_CONTROL_WEIGHT = 0.4  # Dribbling blends drive-events with Phase B's existing close-control signal
# Real amateur clips run just a few seconds -- flooring the duration used
# for the per-minute rate (not the real event_count) stops a single real
# event from extrapolating into a maxed score, same fix as vision.py's,
# confirmed necessary by direct validation against real mined clips.
MIN_DURATION_MIN_FOR_RATE = 0.5

# Real numbers from training/reports/event_classifier_metrics.json's
# per-class test-set precision (2067 real SoccerNet clips, held-out games)
# -- the only model_precision confidence.py has to work with for these two
# attributes. Update if the classifier is ever retrained.
PASS_MODEL_PRECISION = 0.65
DRIVE_MODEL_PRECISION = 0.60


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


@dataclass
class EventScoreResult:
    score: int
    event_count: int


def score_passing(events: list[EventDetection], duration_s: float) -> EventScoreResult | None:
    passes = [e for e in events if e.label == "pass"]
    if not passes:
        return None
    duration_min = max(duration_s / 60, MIN_DURATION_MIN_FOR_RATE)
    rate = len(passes) / duration_min
    raw = _clamp(rate / PASSING_EVENTS_PER_MIN_CEILING, 0, 1) * 99
    return EventScoreResult(score=int(round(_clamp(raw, 1, 99))), event_count=len(passes))


def score_dribbling(
    events: list[EventDetection], ball_control_touches_per_min: float | None, duration_s: float
) -> EventScoreResult | None:
    """Real proxy: classifier-detected 'drive' (ball-carrying) touch
    frequency, blended with Phase B's already-computed close-control touch
    rate. "Beats defenders" dribbling isn't observable without opponent
    tracking (deliberately out of this app's single-subject scope) -- this
    measures ball retention under repeated close touches instead, and is
    documented plainly as that proxy, not the real thing.
    """
    drives = [e for e in events if e.label == "drive"]
    if not drives and not ball_control_touches_per_min:
        return None
    duration_min = max(duration_s / 60, MIN_DURATION_MIN_FOR_RATE)
    drive_term = _clamp((len(drives) / duration_min) / DRIVE_EVENTS_PER_MIN_CEILING, 0, 1)
    control_term = _clamp((ball_control_touches_per_min or 0.0) / BALL_CONTROL_TOUCHES_PER_MIN_CEILING, 0, 1)
    raw = (1 - DRIBBLING_BALL_CONTROL_WEIGHT) * drive_term * 99 + DRIBBLING_BALL_CONTROL_WEIGHT * control_term * 99
    return EventScoreResult(score=int(round(_clamp(raw, 1, 99))), event_count=len(drives))
