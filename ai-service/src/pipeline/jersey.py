from src.pipeline.detect_track import PERSON_CLASS, Detection

BACK_CROP_Y_RANGE = (0.15, 0.55)  # upper back/shoulders -- avoids head and shorts/socks
MAX_SAMPLES_PER_TRACK = 8
MAX_OTHER_CANDIDATES = 5

_reader = None


def _get_reader():
    """Lazy singleton -- EasyOCR downloads its recognition weights on first
    use (like yolov8n.pt already does), so importing this module doesn't pay
    that cost unless jersey OCR actually runs."""
    global _reader
    import easyocr

    if _reader is None:
        _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


def _crop(frame, xyxy: tuple[float, float, float, float]):
    x1, y1, x2, y2 = [int(v) for v in xyxy]
    w, h = x2 - x1, y2 - y1
    if w <= 0 or h <= 0:
        return None
    cy1 = y1 + int(h * BACK_CROP_Y_RANGE[0])
    cy2 = y1 + int(h * BACK_CROP_Y_RANGE[1])
    if cy2 <= cy1:
        return None
    crop = frame[max(0, cy1):cy2, max(0, x1):x2]
    return crop if crop.size else None


def _best_reading_for_track(frames: list, per_frame: list[list[Detection]], track_id: int) -> int | None:
    """OCR a handful of the track's frames, allowlisted to digits only, and
    return the number with the highest summed confidence across reads (a
    number read once at 0.9 confidence beats one read three times at 0.2).
    None if nothing legible was found -- a real, common outcome (motion
    blur, number not facing camera, low resolution) not treated as an error.
    """
    reader = _get_reader()
    votes: dict[int, float] = {}
    sampled = 0
    for frame, frame_dets in zip(frames, per_frame):
        if sampled >= MAX_SAMPLES_PER_TRACK:
            break
        for det in frame_dets:
            if det.cls != PERSON_CLASS or det.track_id != track_id:
                continue
            crop = _crop(frame, det.xyxy)
            if crop is None:
                continue
            sampled += 1
            for _bbox, text, conf in reader.readtext(crop, allowlist="0123456789"):
                if text.isdigit():
                    votes[int(text)] = votes.get(int(text), 0.0) + conf
            break  # one crop per frame per track is enough
    if not votes:
        return None
    return max(votes, key=votes.get)


def check_jersey_signal(
    frames: list,
    per_frame: list[list[Detection]],
    subject_track_id: int,
    expected_jersey_number: int | None,
) -> dict | None:
    """Light, non-authoritative corroboration signal -- jersey number OCR is
    a genuinely unsolved research problem even for well-funded teams (see
    SoccerNet's own dedicated jersey-number challenge), so this NEVER
    overrides the subject already selected by tap-to-confirm / the
    heuristic. It only checks: does a DIFFERENT track's jersey read match
    the player's own registered number better than the selected track's
    does? If so, that's worth surfacing for audit (result_summary), not
    silently acting on. Returns None when there's nothing to flag (no
    registered number, OCR found nothing, or the selected track's own
    reading already matches).
    """
    if expected_jersey_number is None:
        return None

    candidate_ids = {det.track_id for dets in per_frame for det in dets if det.cls == PERSON_CLASS}
    if subject_track_id not in candidate_ids:
        return None

    subject_reading = _best_reading_for_track(frames, per_frame, subject_track_id)
    if subject_reading == expected_jersey_number:
        return None

    other_ids = [tid for tid in candidate_ids if tid != subject_track_id][:MAX_OTHER_CANDIDATES]
    for tid in other_ids:
        reading = _best_reading_for_track(frames, per_frame, tid)
        if reading == expected_jersey_number:
            return {
                "expected_jersey_number": expected_jersey_number,
                "subject_track_reading": subject_reading,
                "conflicting_track_id": tid,
                "note": (
                    "a different track's jersey OCR matched the player's registered number; "
                    "informational only, subject selection was NOT changed"
                ),
            }
    return None
