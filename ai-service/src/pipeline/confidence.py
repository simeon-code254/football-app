"""Unified confidence resolution for every attribute added after Phase A.

Phase A's Pace/Physical keep their own bespoke resolve_confidence() in
attributes.py exactly as shipped and already reasoned through (capped at
Medium, gated on subject-selection dominance margin + valid interval count
+ clip duration) -- this module doesn't touch that, so nothing already
live silently changes behavior.

Every attribute added from here on (Phase B's Positioning/Ball Control,
Phase C's classifier-backed Shooting/Passing/Defending, Phase D's
composites) calls resolve_confidence() below instead of inventing its own
ad hoc cap, so confidence stays consistently earned and comparable across
the whole attribute set rather than each phase picking its own rule.

Confidence is a function of three real, measured inputs, never assigned
optimistically:
  - sample_count: how many valid events/intervals/touches back the score.
  - coverage: fraction (0-1) of the clip where the attribute's required
    tracking signal was actually present (subject visible, ball visible,
    pose landmarks above a visibility threshold -- whatever the calling
    attribute needs).
  - model_precision: for classifier-backed attributes only (Phase C+), the
    classifier's own measured test-set precision for the predicted class,
    pulled from a real confusion matrix in training/reports/. None for
    heuristic/formula-only attributes, which have no such number to point
    to -- and therefore structurally cannot reach High confidence, the
    same honest ceiling Phase A's Pace/Physical already sit under, just
    made explicit and general instead of hand-coded per attribute.
"""

MIN_SAMPLES_FOR_MEDIUM = 30
MIN_SAMPLES_FOR_HIGH = 80
MIN_COVERAGE_FOR_MEDIUM = 0.3
MIN_COVERAGE_FOR_HIGH = 0.6
MIN_PRECISION_FOR_MEDIUM = 0.6
MIN_PRECISION_FOR_HIGH = 0.8


def resolve_confidence(
    sample_count: int,
    coverage: float = 1.0,
    model_precision: float | None = None,
) -> str:
    """Returns 'Low' | 'Medium' | 'High'.

    High is only reachable when a real model_precision is supplied and
    clears MIN_PRECISION_FOR_HIGH alongside strong sample_count/coverage --
    a formula-only attribute (model_precision=None) always tops out at
    Medium, since there's no held-out precision number to justify more.
    """
    if sample_count < MIN_SAMPLES_FOR_MEDIUM or coverage < MIN_COVERAGE_FOR_MEDIUM:
        return "Low"

    if model_precision is not None:
        if model_precision < MIN_PRECISION_FOR_MEDIUM:
            return "Low"
        if (
            sample_count >= MIN_SAMPLES_FOR_HIGH
            and coverage >= MIN_COVERAGE_FOR_HIGH
            and model_precision >= MIN_PRECISION_FOR_HIGH
        ):
            return "High"

    return "Medium"
