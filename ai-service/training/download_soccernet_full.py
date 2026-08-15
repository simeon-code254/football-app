"""Downloads the label/metadata layer of SoccerNet broadly (all real,
comparatively small JSON/label files across the full ~550-game corpus),
without pulling the full HQ/LQ broadcast video corpus (500-1000+ GB,
doesn't fit on this machine -- see the disk-space check below).

Video for a curated subset of games is a separate, later step
(extract_soccernet_clips.py's pattern, extended with more games) --
this script is the "get every label/metadata thing that's cheap and real"
pass the user asked for, with an explicit disk-space guard so a genuinely
large task (e.g. Frames-v3.zip) can't silently fill the drive.

Usage: python training/download_soccernet_full.py
Requires SOCCERNET_PASSWORD in ai-service/.env.
"""

import os
import shutil
import sys

from dotenv import load_dotenv

load_dotenv()

PASSWORD = os.environ.get("SOCCERNET_PASSWORD")
if not PASSWORD:
    print("Missing SOCCERNET_PASSWORD -- set it in ai-service/.env.", file=sys.stderr)
    sys.exit(1)

from SoccerNet.Downloader import SoccerNetDownloader  # noqa: E402

LOCAL_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "soccernet")
MIN_FREE_GB = 20  # stop starting new downloads once free space drops below this


def free_gb() -> float:
    return shutil.disk_usage(LOCAL_DIR if os.path.exists(LOCAL_DIR) else ".").free / (1024**3)


def guarded(label: str, fn):
    free = free_gb()
    if free < MIN_FREE_GB:
        print(f"SKIPPING {label}: only {free:.1f}GB free (< {MIN_FREE_GB}GB minimum)")
        return False
    print(f"\n=== {label} ({free:.1f}GB free) ===")
    try:
        fn()
        print(f"  done. {free_gb():.1f}GB free now.")
        return True
    except Exception as exc:
        print(f"  FAILED: {exc}")
        return False


def main():
    downloader = SoccerNetDownloader(LocalDirectory=LOCAL_DIR)
    downloader.password = PASSWORD

    # Real per-game event labels across the full ~500-game corpus -- 17
    # classes (Goal, Shots on/off target, Foul, Corner, Card, etc.), small
    # JSON per game, this is the genuinely new signal (Shot-relevant events
    # weren't in the Ball Action Spotting subset already downloaded).
    guarded(
        "Labels-v2.json (action spotting labels, all games)",
        lambda: downloader.downloadGames(files=["Labels-v2.json"], split=["train", "valid", "test", "challenge"]),
    )

    guarded(
        "Labels-cameras.json (replay grounding labels)",
        lambda: downloader.downloadGames(files=["Labels-cameras.json"], split=["train", "valid", "test"]),
    )

    for task in ["reid", "reid-2023"]:
        guarded(
            f"{task} (re-identification labels/crops)",
            lambda t=task: downloader.downloadDataTask(task=t, split=["train", "valid", "test", "challenge"], password=PASSWORD),
        )

    for task in ["tracking", "tracking-2023"]:
        guarded(
            f"{task} (player/ball tracklets)",
            lambda t=task: downloader.downloadDataTask(task=t, split=["train", "test", "challenge"], password=PASSWORD),
        )

    guarded(
        "jersey-2023 (tracklet videos + jersey number labels)",
        lambda: downloader.downloadDataTask(task="jersey-2023", split=["train", "test", "challenge"], password=PASSWORD),
    )

    guarded(
        "caption-2023 (dense video captioning labels)",
        lambda: downloader.downloadDataTask(task="caption-2023", split=["train", "valid", "test", "challenge"], password=PASSWORD),
    )

    print(f"\nAll done. {free_gb():.1f}GB free.")


if __name__ == "__main__":
    main()
