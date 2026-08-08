# Matobev AI Analysis Service — Phase A (Pace + Physical)

Real, non-fabricated player attribute scores computed from tracked player
movement in uploaded highlight videos. This is deliberately scoped to what
runs on pretrained, zero-training models — no fine-tuning, no GPU rental, no
dataset curation. See `C:\Users\Admin\.claude\plans\now-fancy-balloon.md`
("Phase 4") for the full design rationale.

**What this does**: watches for `video_analysis_jobs` rows with
`status='queued'` (auto-created by a DB trigger whenever a player uploads a
video with `upload_intent='ai_analysis'`), downloads the source clip,
detects + tracks the subject player with YOLOv8 + ByteTrack, computes real
Pace and Physical scores from their tracked motion, and writes them to
`player_attribute_scores`.

**What this does NOT do** (future phases, not built here): pose estimation,
action recognition (Shooting/Passing/Defending/goalkeeper attributes — needs
SoccerNet fine-tuning and real GPU compute), or anything for goalkeeper
videos (no Pace/Physical-equivalent attribute exists in that taxonomy —
those jobs are marked `completed` with no scores written, not `failed`).

## Setup (Windows, from a clean machine)

```powershell
winget install -e --id Python.Python.3.11
winget install -e --id Gyan.FFmpeg
# open a NEW terminal so PATH refreshes before continuing
```

If `python`/`python3` resolve to the Microsoft Store stub instead of a real
interpreter, use the `py` launcher (`py -3.11`) instead, or disable the
Store aliases under Settings → Apps → Advanced app settings → App execution
aliases.

```powershell
cd ai-service
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

copy .env.example .env
# edit .env: fill in SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard > Project
# Settings > API > service_role secret). Never commit this file — it's
# already gitignored.
```

## Running

```powershell
.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

- `GET /health` — liveness check.
- `POST /process/{job_id}` — manually trigger processing of a specific job
  (useful for testing without waiting on Realtime/the poll loop).
- On startup: resets any job stuck in `processing` back to `queued` (safe
  only because this is a single-worker local design — see `src/jobs.py`),
  then starts a Realtime subscription (`video_analysis_jobs` INSERT) and a
  polling safety-net (every `POLL_INTERVAL_SECONDS`, default 120s) in case
  the realtime connection drops.

The first run downloads YOLOv8n's pretrained weights automatically into
`models/`.

## How scores are computed (honesty notes)

- **Subject-player disambiguation**: the upload flow has an optional "Tag
  Yourself" step (`app/(player-tabs)/upload.tsx`) — the uploader taps
  themselves on a frame before publishing, stored as a normalized point
  (`videos.subject_hint_x/y`) **plus the timestamp that frame was taken
  from** (`subject_hint_time_ms`). The timestamp matters because the
  subject moves — the same (x,y) means something different a few seconds
  later, and the tap frame is decoded client-side (expo-video-thumbnails)
  while the service decodes its own frames independently (OpenCV), so they
  don't line up exactly. `select_subject()` searches its own sampled frames
  ordered by closeness to that timestamp (within `HINT_TIME_TOLERANCE_S`,
  2s) for the first person box containing the tapped point, and uses that
  track directly (`dominance_margin=1.0`, `hint_matched=True` in
  `result_summary`) — no guessing. A match found outside that time window
  is deliberately *not* trusted (more likely coincidence than the same
  person), and it falls back the same as when no hint was given at all.
  **Only then** does it fall back to a heuristic (most screen time +
  largest average size + most central position) that is NOT solved — a
  highlight clip's subject can leave and re-enter frame across cuts and get
  missed by it. See `src/pipeline/subject.py`.
- **Pixel→meter calibration** has no camera calibration/homography — it
  uses the subject's average bounding-box height against `players.height_cm`
  (or a 170cm default) as a proxy for real-world scale. Assumes a roughly
  perpendicular, unzoomed, single-angle view. Error band: roughly ±20–30%.
  See `src/pipeline/calibrate.py`.
- **Confidence is capped at `Medium`, never `High`**, in this phase — reflect
  reality, don't overstate a heuristic. See `resolve_confidence()` in
  `src/pipeline/attributes.py`.
- Every written score is traceable: `player_attribute_scores.job_id` and
  `.source_video_id` point back to exactly which job/video produced it, and
  `video_analysis_jobs.result_summary` records the raw numbers (peak speed,
  distance, sprint count, calibration source, subject dominance margin,
  stage timings) behind the final score for later audit.

## Verification (do this after setup, with a real clip — zero mocking)

1. Film a few seconds of yourself jogging/sprinting **sideways across the
   camera** (perpendicular motion matters for the calibration in
   `calibrate.py` — moving straight at/away from the camera barely displaces
   in pixel-space).
2. Through the Matobev app, log in as a real player test account → Upload →
   AI Analysis mode → upload the clip.
3. Confirm a `queued` row appears in `video_analysis_jobs` (Supabase
   dashboard or SQL editor).
4. Start this service (`uvicorn main:app --reload`).
5. Watch the logs — the realtime listener should pick up the job within a
   few seconds and log `Processing job ...` → `Job ... completed`.
6. Check `player_attribute_scores` for that player: real (non-hardcoded)
   `pace`/`physical` values, `confidence` of `Medium` or `Low` (never
   `High`), `source_video_id`/`job_id` set.
7. Open the player's Profile → AI Ratings tab in the app and confirm the two
   real scores render instead of the empty state.
