import os
import sys

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "120"))
# Bearer token required on POST /process/{job_id} — that route has no other
# auth (it's meant for local manual testing, not public exposure), so
# without this anyone who finds the URL could trigger the CV pipeline.
AI_SERVICE_INTERNAL_TOKEN = os.environ.get("AI_SERVICE_INTERNAL_TOKEN")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not AI_SERVICE_INTERNAL_TOKEN:
    print(
        "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / AI_SERVICE_INTERNAL_TOKEN — "
        "copy .env.example to .env and fill them in.",
        file=sys.stderr,
    )
    sys.exit(1)

DEFAULT_PLAYER_HEIGHT_M = 1.70
FPS_SAMPLE_RATE = 5
MODEL_PATH = "models/yolov8n.pt"
