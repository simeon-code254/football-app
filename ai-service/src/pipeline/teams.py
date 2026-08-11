import numpy as np
from sklearn.cluster import KMeans

from src.pipeline.detect_track import PERSON_CLASS, Detection

MAX_SAMPLES_PER_TRACK = 15


def _torso_mean_color(frame, xyxy: tuple[float, float, float, float]) -> np.ndarray | None:
    """Mean BGR color of a person box's inner-torso region -- horizontally
    centered (avoids background bleeding in at the box edges) and vertically
    between shoulders and waist (avoids head/skin tone at the top and
    shorts/socks/grass at the bottom), which is the most kit-color-dominant
    region of a standing or running person. Returns None if the box is too
    small/degenerate to crop meaningfully.
    """
    x1, y1, x2, y2 = [int(v) for v in xyxy]
    w, h = x2 - x1, y2 - y1
    if w <= 0 or h <= 0:
        return None
    tx1, tx2 = x1 + int(w * 0.25), x1 + int(w * 0.75)
    ty1, ty2 = y1 + int(h * 0.20), y1 + int(h * 0.55)
    if tx2 <= tx1 or ty2 <= ty1:
        return None
    crop = frame[max(0, ty1):ty2, max(0, tx1):tx2]
    if crop.size == 0:
        return None
    return crop.reshape(-1, 3).mean(axis=0)


def cluster_teams(frames: list, per_frame: list[list[Detection]]) -> dict[int, int]:
    """Training-free K-means (k=2) jersey-color clustering over every person
    track in the clip. This is a coarse, additive disambiguation signal --
    NOT an identity signal on its own: two players in the same kit still
    cluster together, and a third color (referee, mismatched bystander) gets
    forced into whichever of the two clusters it's nearer to. That's an
    accepted imprecision for a training-free approach; the caller
    (select_subject) only ever uses this to down-weight candidates that are
    CONFIDENTLY a different color from the current best guess, never to
    positively assert identity.

    Returns {track_id: 0 or 1}. Tracks with no sampleable color (entirely
    edge-of-frame boxes, etc.) are omitted, not guessed. Returns {} if fewer
    than 2 tracks have samples (nothing to separate).
    """
    samples: dict[int, list[np.ndarray]] = {}
    for frame, frame_dets in zip(frames, per_frame):
        for det in frame_dets:
            if det.cls != PERSON_CLASS:
                continue
            track_samples = samples.setdefault(det.track_id, [])
            if len(track_samples) >= MAX_SAMPLES_PER_TRACK:
                continue
            color = _torso_mean_color(frame, det.xyxy)
            if color is not None:
                track_samples.append(color)

    track_ids = [tid for tid, s in samples.items() if s]
    if len(track_ids) < 2:
        return {}

    features = np.array([np.mean(samples[tid], axis=0) for tid in track_ids])
    labels = KMeans(n_clusters=2, n_init=10, random_state=0).fit_predict(features)
    return {tid: int(label) for tid, label in zip(track_ids, labels)}
