"""One-off SoccerNet dataset download for Phase C dataset curation.

Targets the Ball Action Spotting task (spotting-ball-2023) first -- unlike
the main 500-game Action Spotting labels (match-event granularity: Goal,
Card, Corner...), this task's 7+2 games are densely labeled at individual
ball-touch granularity (Pass, Drive, Shot, Tackle, Header, Cross...), which
is the actual shape Phase C's event classifier needs.

Per the user's explicit scoping decision: SoccerNet's NDA restricts this
data to non-commercial use. Matobev has no monetization yet, so this is
being used for research/pipeline-building now under that non-commercial
allowance -- revisit before any commercial launch of the AI-rating feature.

Usage: python training/download_soccernet.py
Requires SOCCERNET_PASSWORD in ai-service/.env (see .env.example).
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()

PASSWORD = os.environ.get("SOCCERNET_PASSWORD")
if not PASSWORD:
    print("Missing SOCCERNET_PASSWORD -- set it in ai-service/.env (see .env.example).", file=sys.stderr)
    sys.exit(1)

from SoccerNet.Downloader import SoccerNetDownloader  # noqa: E402

LOCAL_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "soccernet")


def main():
    downloader = SoccerNetDownloader(LocalDirectory=LOCAL_DIR)
    downloader.password = PASSWORD

    print("Downloading spotting-ball-2023 (dense per-touch event labels + clips, 7+2 games)...")
    downloader.downloadDataTask(
        task="spotting-ball-2023",
        split=["train", "valid", "test"],
        password=PASSWORD,
    )
    print("Done.")


if __name__ == "__main__":
    main()
