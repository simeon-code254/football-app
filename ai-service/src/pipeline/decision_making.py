"""Phase D: a real touches-to-release Decision Making proxy -- fewer ball
touches before releasing possession (a pass, in this app's observable
vocabulary) is a standard real analytics correlate of decisiveness.
Derived from Phase B's ball-control touch tracking (positioning.py's
find_touch_frame_indices) + Phase C's event detection (a detected 'pass'
marks a real, observed release point -- not every possession sequence in
the clip, only ones we actually saw the outcome of).
"""

from dataclasses import dataclass

from src.pipeline.events import EventDetection

MAX_GAP_FRAMES_SAME_SEQUENCE = 3  # touches within this many frames count as one continuous possession
TOUCHES_TO_RELEASE_FLOOR = 1.0  # a single-touch release is the most decisive possible
TOUCHES_TO_RELEASE_CEILING = 6.0


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


@dataclass
class DecisionMakingResult:
    score: int
    sequence_count: int
    avg_touches_to_release: float


def score_decision_making(
    touch_frame_indices: list[int], pass_events: list[EventDetection]
) -> DecisionMakingResult | None:
    if not touch_frame_indices or not pass_events:
        return None

    pass_frames = {e.frame_idx for e in pass_events}

    sequences: list[list[int]] = [[touch_frame_indices[0]]]
    for prev, cur in zip(touch_frame_indices, touch_frame_indices[1:]):
        if cur - prev <= MAX_GAP_FRAMES_SAME_SEQUENCE:
            sequences[-1].append(cur)
        else:
            sequences.append([cur])

    # Only count possession sequences that actually included a detected
    # pass frame (a real, observed release) -- a sequence that just trails
    # off (clip ends, subject loses the ball off-screen) isn't a decision
    # we actually witnessed the outcome of.
    released_lengths = [len(seq) for seq in sequences if any(f in pass_frames for f in seq)]
    if not released_lengths:
        return None

    avg_touches = sum(released_lengths) / len(released_lengths)
    normalized = (TOUCHES_TO_RELEASE_CEILING - avg_touches) / (TOUCHES_TO_RELEASE_CEILING - TOUCHES_TO_RELEASE_FLOOR)
    raw = _clamp(normalized, 0, 1) * 99
    return DecisionMakingResult(
        score=int(round(_clamp(raw, 1, 99))),
        sequence_count=len(released_lengths),
        avg_touches_to_release=round(avg_touches, 2),
    )
