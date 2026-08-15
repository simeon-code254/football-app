"""Phase D: the weakest attribute in this pipeline, by design -- this app
tracks only the uploader, never an opponent, so a tackle's outcome/intent
is only ever partially observable. Real proxy: ball-recovery frequency
(how often the subject's ball-proximity streak BEGINS -- the ball arrives
at their feet from not being there a moment before), not opponent-aware
"won a tackle" detection, which is out of reach without multi-player
possession tracking.

Confidence is hardcoded to Low in run.py regardless of sample size -- per
the approved Phase 13 plan, this attribute is expected to stay capped
indefinitely, not a bug to chase later.
"""

from dataclasses import dataclass

RECOVERIES_PER_MIN_CEILING = 6.0  # uncited engineering ceiling, see event_scoring.py's own note
MAX_GAP_FRAMES_SAME_POSSESSION = 3  # matches decision_making.py's own sequence grouping
MIN_DURATION_MIN_FOR_RATE = 0.5  # see vision.py's own note on short-clip rate extrapolation


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


@dataclass
class DefendingResult:
    score: int
    recovery_count: int


def score_defending(touch_frame_indices: list[int], duration_s: float) -> DefendingResult | None:
    if not touch_frame_indices:
        return None

    recoveries = 1
    for prev, cur in zip(touch_frame_indices, touch_frame_indices[1:]):
        if cur - prev > MAX_GAP_FRAMES_SAME_POSSESSION:
            recoveries += 1

    duration_min = max(duration_s / 60, MIN_DURATION_MIN_FOR_RATE)
    rate = recoveries / duration_min
    raw = _clamp(rate / RECOVERIES_PER_MIN_CEILING, 0, 1) * 99
    return DefendingResult(score=int(round(_clamp(raw, 1, 99))), recovery_count=recoveries)
