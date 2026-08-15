"""Shared recommendations-combining utility.

Each attribute module owns its own real, threshold-gated rules -- see
attributes.py's generate_recommendations() for the original pattern this
generalizes (real numbers against real benchmark constants, empty list
when nothing stands out, never padded with generic advice just to always
show something). run.py calls each attribute module's own recommendation
function explicitly and passes the results here to combine and cap, the
same explicit-orchestration style already used everywhere else in this
pipeline -- no hidden registry, no import-order coupling.

This is what lets "Ways to Improve" scale honestly as Phase B/C/D land:
today it's just Pace/Physical's contribution; once Positioning, Shooting,
Passing etc. exist, their modules pass their own real lines in here too,
same cap, same rule.
"""

MAX_RECOMMENDATIONS = 5


def combine(*rule_lists: list[str]) -> list[str]:
    combined: list[str] = []
    for lines in rule_lists:
        combined.extend(lines)
    return combined[:MAX_RECOMMENDATIONS]
