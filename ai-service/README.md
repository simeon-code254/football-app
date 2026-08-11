# Matobev AI Analysis Service — Phase A (Pace + Physical)

Real, non-fabricated player attribute scores computed from tracked player
movement in uploaded highlight videos. This is deliberately scoped to what
runs on pretrained, zero-training models — no fine-tuning, no GPU rental, no
dataset curation. See `C:\Users\Admin\.claude\plans\now-fancy-balloon.md`
("Phase 4" for the original pipeline, "Phase 5" for the multi-signal
subject-tracking hardening described below) for the full design rationale.

**What this does**: watches for `video_analysis_jobs` rows with
`status='queued'` (auto-created by a DB trigger whenever a player uploads a
video with `upload_intent='ai_analysis'`), downloads the source clip,
detects + tracks the subject player with YOLOv8 + BoT-SORT (appearance
re-ID), computes real Pace and Physical scores from their tracked motion,
and writes them to `player_attribute_scores`.

**Positioning, deliberately**: this app tracks *one* player — the uploader
— never a full multi-player match. That's a narrower, more tractable
problem than broadcast-grade tracking vendors solve, and it's what lets
every signal below stay cheap, pretrained, and CPU-only. Subject
identification is four independent, training-free signals that degrade
gracefully into each other: tap-to-confirm (authoritative when present) →
appearance re-ID (survives brief occlusion/cuts) → team-color clustering
(narrows the candidate pool in crowded shots) → jersey-number OCR (a light,
non-authoritative cross-check). No single one is trusted alone.

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
# Settings > API > service_role secret) and AI_SERVICE_INTERNAL_TOKEN (any
# random string, e.g. `python -c "import secrets; print(secrets.token_urlsafe(32))"`
# — protects POST /process, see below). Never commit this file — it's
# already gitignored.
```

## Running

```powershell
.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

- `GET /health` — liveness check, no auth.
- `POST /process/{job_id}` — manually trigger processing of a specific job
  (useful for testing without waiting on Realtime/the poll loop). Requires
  `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>` — this route has no
  other access control, so without it anyone who found the URL could trigger
  the CV pipeline.
- On startup: resets any job stuck in `processing` back to `queued` (safe
  only because this is a single-worker local design — see `src/jobs.py`),
  then starts a Realtime subscription (`video_analysis_jobs` INSERT) and a
  polling safety-net (every `POLL_INTERVAL_SECONDS`, default 120s) in case
  the realtime connection drops.

The first run downloads YOLOv8n's pretrained weights automatically into
`models/`. The first video that actually needs jersey-OCR (i.e. has a
`players.jersey_number` set) additionally triggers a one-time EasyOCR model
download (detection + recognition weights, a few hundred MB) — this only
happens lazily, not on service startup.

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
  largest average size + most central position, optionally adjusted by
  team-color clustering — see below) that is NOT solved — a highlight
  clip's subject can leave and re-enter frame across cuts and get missed by
  it. See `src/pipeline/subject.py`.
- **Tracking: BoT-SORT with appearance re-ID** (`with_reid: True`,
  `model: auto` — reuses YOLO's own detector features, no extra model or
  training), not plain ByteTrack. This is short-term recovery — a subject
  briefly occluded or lost for a few seconds is more likely to keep the
  same `track_id` than under motion-only tracking. It is **not** long-term
  re-identification across a hard scene cut in a highlight reel; that's an
  open research problem (see SoccerNet's own Re-ID challenge). Verified
  directly: the tracker swap runs end-to-end with no regressions on real
  test footage, and correctly resumes a track across a synthetic occlusion
  gap — but a from-scratch synthetic test with only two real photographic
  source people wasn't able to cleanly isolate ReID's benefit *over* plain
  ByteTrack, since `track_buffer` (30 sampled frames) already provides
  motion-based recovery on its own for gaps within that window. Treat the
  ReID upgrade as a well-documented, zero-cost improvement per its own
  library docs, not as something this project has independently proven a
  measurable lift for. See `src/pipeline/botsort_reid.yaml`.
- **Team-color clustering** (`src/pipeline/teams.py`) — training-free
  K-means (k=2) on each track's torso color, used only to make
  `dominance_margin` more honest: a runner-up candidate in a confidently
  different jersey color is almost certainly a different person, not a
  fragment of the subject's own split track, so it's down-weighted before
  computing the margin. Never used to positively assert identity — two
  players in the same kit still cluster together, and a third color
  (referee) gets forced into whichever cluster is nearer.
- **Jersey-number OCR** (`src/pipeline/jersey.py`) — a light, *non-
  authoritative* signal, matched against `players.jersey_number` when set.
  SoccerNet runs a dedicated open research challenge on exactly this
  problem (motion blur, low resolution, number not always facing camera),
  so this never overrides tap-to-confirm or the tracker's own pick — it
  only logs a `jersey_signal_conflict` in `result_summary` when a
  *different* track's OCR reading matches the player's registered number
  better than the selected track's own reading, for later audit.
- **Pixel→meter calibration** has no camera calibration/homography — it
  uses the subject's average bounding-box height against `players.height_cm`
  (or a 170cm default) as a proxy for real-world scale. Assumes a roughly
  perpendicular, unzoomed, single-angle view. Error band: roughly ±20–30%.
  **Deliberately not upgraded to pitch-line/homography calibration**: that
  approach requires visible, detectable pitch markings, and much of this
  app's real target usage — grassroots pitches across Africa — often has
  none. A calibration method that silently fails without marked lines would
  fail exactly the users this app is for, so height-based calibration stays
  the primary (and only) method. See `src/pipeline/calibrate.py`.
- **Sprint threshold** (`SPRINT_THRESHOLD_KMH = 18.0` in
  `src/pipeline/attributes.py`) matches Catapult's own commonly-used
  default in GPS sports-science tooling; published high-speed-running
  literature more broadly puts high-speed running at ~19.8–25.2 km/h and
  strict sprinting above that — kept at the lower end since this app's
  actual footage (grassroots/amateur) skews slower than professional GPS
  datasets.
- **Confidence is capped at `Medium`, never `High`**, in this phase — reflect
  reality, don't overstate a heuristic. See `resolve_confidence()` in
  `src/pipeline/attributes.py`.
- Every written score is traceable: `player_attribute_scores.job_id` and
  `.source_video_id` point back to exactly which job/video produced it, and
  `video_analysis_jobs.result_summary` records the raw numbers (peak speed,
  distance, sprint count, calibration source, subject dominance margin,
  team clusters found, jersey signal conflict if any, stage timings) behind
  the final score for later audit.

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
8. Check `video_analysis_jobs.result_summary` for the new fields:
   `tracker` should read `"botsort+reid"`, `team_clusters_found` should be
   `2` whenever ≥2 people were detected in the clip, and
   `jersey_signal_conflict` should be `null` unless the player has
   `jersey_number` set **and** a different track's OCR read matched it — a
   real conflict is worth manually reviewing that job's video, not treated
   as an error.

### What was verified directly during development (not just asserted)

- The BoT-SORT+ReID swap runs end-to-end with no regressions against the
  existing real-photo and synthetic test clips in `sample_clips/`.
- A synthetic clip built from real photographic crops (two distinct people
  from the official Ultralytics `zidane.jpg` demo photo) confirmed the
  full pipeline — detection, tracking, team clustering, calibration,
  scoring — still produces sane, non-crashing output after all of this
  phase's changes, including `team_clusters_found: 2`.
- Jersey OCR was verified in isolation: a clean synthetic digit crop is
  read correctly by `_best_reading_for_track`, and `check_jersey_signal`
  correctly flags a conflict when a non-subject track's reading matches the
  registered number, without altering which track was actually scored.
- **Honest limitation found while verifying**: a synthetic test specifically
  built to isolate ReID's benefit over plain ByteTrack (subject occluded
  then reappearing among decoy bystanders) did not show a measurable
  difference between the two trackers — `track_buffer` (30 sampled frames)
  already bridges gaps within its own window via motion prediction alone,
  regardless of appearance matching. ReID's real-world benefit — per its
  own library documentation and the broader tracking literature — is
  expected to matter most in genuinely crowded scenes with real appearance
  diversity and motion unpredictability that a small synthetic clip (two
  source people, deterministic paths) can't fully replicate. This upgrade
  is retained because it's well-documented and zero-cost, not because this
  project independently proved a measurable lift for it.
