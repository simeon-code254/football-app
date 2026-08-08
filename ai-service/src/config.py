import os
import sys

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "120"))

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print(
        "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — copy .env.example "
        "to .env and fill them in.",
        file=sys.stderr,
    )
    sys.exit(1)

DEFAULT_PLAYER_HEIGHT_M = 1.70
FPS_SAMPLE_RATE = 5
MODEL_PATH = "models/yolov8n.pt"
