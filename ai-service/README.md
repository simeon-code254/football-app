# Matobev AI Analysis Service

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

**Phase B, live**: frozen MediaPipe Pose over the subject's own bbox crop
(never fine-tuned, pure pretrained inference) feeds two more real scores —
Positioning (a movement-economy/spatial-coverage proxy, explicitly *not*
tactical positioning) and partial Ball Control (foot-to-ball proximity touch
counting). See "Phase B — Positioning and Ball Control" below.

**Phase C, live**: the trained PASS/DRIVE event classifier
(`training/train_event_classifier.py`, 62% held-out accuracy) is now wired
into live scoring (`src/pipeline/events.py`) — real per-touch pass/drive
predictions feed **Passing** and (blended with Phase B's close-control
signal) **Dribbling**. See "Phase C" below for the full classifier story,
and "Phase C → live scoring" for how it's actually invoked at inference
time.

**Phase D, live**: three more real, formula-based proxies built on top of
Phase B/C's signals — **Vision** (scanning-frequency, a published
methodology for visual exploratory activity, not invented for this app),
**Decision Making** (touches-to-release, a standard analytics decisiveness
correlate), and **Defending** (ball-recovery frequency — deliberately,
permanently capped at Low confidence; this app tracks only the uploader,
never an opponent, so a tackle's outcome is only ever partially observable).
See "Phase D" below.

**Goalkeeper pipeline, built but unvalidated**: 7 of the 8 goalkeeper
attributes (Positioning, Command of Area, Aerial Ability, Reflexes,
Handling, Distribution, Kicking) now have real, formula-based proxies
(`src/pipeline/goalkeeper.py`) reusing the same frozen models as everything
else — **no goalkeeper-specific training data or model exists anywhere in
this project**, and none of these formulas has been checked against real
goalkeeper footage (none was available when this was built). Treat this as
"real computation, unvalidated accuracy" until checked against real GK
clips. **Sweeping/Rushing Out is deliberately left unscored** — judging
"came off their line" needs a real goal/pitch coordinate this app doesn't
have (see "Goalkeeper pipeline" section below for why that's not just a
missing feature, but a considered decision matching this app's existing
no-pitch-calibration stance).

**What this still does NOT do**: Shooting has no code path at all — the
trained classifier only distinguishes pass vs. drive (that's what
SoccerNet's Ball Action Spotting labels actually contain; no shot-labeled
training data has been extracted or trained on yet, though the broader
Labels-v2.json corpus that *does* contain Shot events is being downloaded
for a future pass). Rather than force a weak proxy with no real underlying
signal, Shooting stays honestly unscored.

## Rating engine — how Overall is computed

`players.overall_rating` is **not** written by this service directly — it's
maintained by a Postgres trigger (`recalc_player_overall()`,
`supabase/migrations/20260814230000_attribute_position_weights.sql`) that
fires whenever this service writes to `player_attribute_scores`. As of that
migration, Overall is a **position-weighted** formula, not a flat average:
each of the 10 outfield attributes is weighted differently depending on the
player's `primary_position` (e.g. a striker's Overall leans on
Shooting/Pace; a center-back's leans on Defending/Physical/Positioning) via
`attribute_position_weights`, re-normalized over whichever attributes
currently have a real value — so a player scored on only Pace/Physical
today still gets an honest provisional Overall, and automatically gets a
fuller, more accurate one as Phase B/C/D add real values for the rest.
Falls back to a flat average only when `primary_position` is unset or no
weight profile exists yet (goalkeepers, until a future GK-scoring phase).
The weight profiles themselves are a documented methodology decision
(grounded in each position's real on-pitch responsibilities, not invented
per-player) — read the migration file directly for the full per-position
breakdown and rationale.

## Confidence and recommendations — shared, not per-attribute ad hoc

`src/pipeline/confidence.py` and `src/pipeline/recommendations.py` are the
shared utilities every attribute added after Phase A calls into, so the
"how sure is this" and "how do I improve" logic stays consistent as the
attribute set grows, instead of each phase inventing its own rule:

- **`confidence.py`**'s `resolve_confidence(sample_count, coverage,
  model_precision=None)` replaces having every attribute hand-roll its own
  cap. A formula-only attribute (no `model_precision` — everything through
  Phase B) tops out at Medium, the same honest ceiling Phase A's
  `resolve_confidence()` in `attributes.py` already uses (kept as-is,
  untouched, since it was already reasoned through and shipped). A
  classifier-backed attribute (Phase C+) can genuinely reach **High** once
  its real, held-out test-set precision clears a concrete bar — confidence
  earned by measured accuracy, not assigned by phase number.
- **`recommendations.py`**'s `combine(*rule_lists)` merges each attribute
  module's own real, threshold-gated lines (see `attributes.py`'s
  `generate_recommendations()` for the pattern every new module follows)
  and caps the total shown. Today it wraps a single source
  (Pace/Physical's), so behavior is unchanged; as Positioning, Shooting,
  Passing etc. ship, "Ways to Improve" draws from all of them automatically
  — never generic advice, always tied to a real number from that specific
  clip.

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
  **Only then** does it fall back to a heuristic (screen time + average
  size + centrality + real ball-proximity, weighted 0.25/0.15/0.15/0.45
  whenever at least 3 real ball detections exist in the clip, otherwise
  0.5/0.3/0.2 with no ball term at all; optionally further adjusted by
  team-color clustering — see below) that is NOT solved — a highlight
  clip's subject can leave and re-enter frame across cuts and get missed by
  it, and a bystander who happens to stand near the ball can still win. See
  `src/pipeline/subject.py` and the "Real validation findings" section
  below for the real-clip case that drove the ball-proximity weight to
  0.45.
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
- **Phase C→live wiring + Phase D + goalkeeper pipeline** (this pass): full
  `run_pipeline()` smoke-tested end-to-end against a real local clip
  (`sample_clips/occlusion_test_h264.mp4`) on both branches — outfield
  (produced real Pace/Physical/Positioning/Vision scores, no crash) and
  goalkeeper, forced via `is_goalkeeper=True` on the same non-GK clip
  (produced real Positioning/Aerial Ability scores, correctly returned no
  score at all for the touch-dependent GK attributes since this clip has
  zero real GK-style ball proximity, no crash). This confirms the code
  runs correctly and degrades gracefully when signal is missing — it does
  **not** confirm accuracy on real goalkeeper footage, which doesn't exist
  in this project yet. See the "Goalkeeper pipeline" section above.
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

## Phase B — Positioning and Ball Control (`src/pipeline/pose.py`, `positioning.py`)

- **MediaPipe API note**: the current pip-installable `mediapipe` (1.0.1)
  has fully removed the old `mp.solutions.pose` API most tutorials/examples
  reference. This uses the newer Tasks API (`PoseLandmarker` +
  `models/pose_landmarker_lite.task`, downloaded once from Google's public
  model store) instead. Verified directly: 33 real landmarks detected with
  0.998 confidence on real mined footage, CPU-only, no GPU involved.
- Pose runs on the **subject's own bbox crop**, not the full frame — far
  more reliable on a multi-person scene than full-frame pose estimation,
  and never fine-tuned (pure pretrained inference, same treatment as
  YOLOv8n's detector).
- **Positioning** is a real, transparent proxy: the normalized bounding-box
  area of the subject's on-screen trajectory over the clip. This is
  deliberately **not tactical positioning** — this app tracks only the
  uploader, with no pitch calibration or multi-player tracking, so there is
  no way to judge positioning relative to teammates, opponents, or the
  pitch. What's measured is real ground/screen coverage, nothing more — see
  `positioning.py`'s module docstring, same honesty register as
  `calibrate.py`'s own error-band note.
- **Ball Control (partial)** counts real frames where the ball sits within
  a close radius of either ankle keypoint (not the whole-body bbox), then
  scores on touch frequency and interval consistency — purely formulaic, no
  model. Returns no score (never a guessed one) when zero touches are
  detected in a clip, which is a normal, honest outcome for clips without
  close ball control (e.g. an off-the-ball sprint).
- Confidence for both uses the newer shared `confidence.py` (`sample_count`
  = pose/touch frame count, `coverage` = fraction of clip frames with valid
  signal, no `model_precision` since these are formula-only) — structurally
  capped at Medium, same honest ceiling as Phase A's Pace/Physical.
- **Verified directly**: full `run_pipeline()` end-to-end smoke test against
  a real mined amateur clip produced a real Positioning score (7, Medium
  confidence, spread_fraction=0.0252) and correctly returned no Ball Control
  score when the clip had zero real foot-to-ball proximity events — no
  crash, no fabricated fallback value.

## Phase C — real training data and an event classifier (in progress)

**Data sourcing.** Two independent, legally-clean real sources:
- Pixabay/Pexels free-commercial-use stock video (no attribution required),
  manually screened clip-by-clip (visually inspected, not trusted by
  title/tag alone — several candidates that looked relevant by title turned
  out to be CGI/cartoon/motion-graphics content and were rejected) —
  `data/raw_pixabay/`, `data/raw_pexels/`, ~30 real usable clips.
- **SoccerNet's Ball Action Spotting dataset** (`spotting-ball-2023`, 7
  real broadcast games, obtained via the user's own signed NDA with
  soccer-net.org). **Licensing note**: SoccerNet's NDA restricts this data
  to non-commercial use — Matobev has no monetization yet, so this is being
  used under that allowance for research/pipeline-building now; this needs
  revisiting before any commercial launch of the AI-rating feature. Labels
  are real, millisecond-precision PASS/DRIVE ball-touch events (not the
  broader Shot/Card/Corner taxonomy the marketing page implies — verified
  directly by inspecting the real `Labels-ball.json` files). 11,041 real
  labeled events across the 7 games.
- `training/extract_soccernet_clips.py` cuts short (2.5s) windows centered
  on real labeled events — not full match videos, keeping footprint small
  and the domain closer to a real touch-level clip — capped at 60
  clips/class/game (840 total, 420 PASS / 420 DRIVE, ~507MB, zero extraction
  failures), split game-grouped (never by individual clip, to avoid
  leakage) matching SoccerNet's own train/valid/test game assignment.

**Ball-detection domain mismatch (real finding, not a bug).** Stock
YOLOv8n's COCO "sports ball" class — already proven to work well on close-up
amateur footage (16/20 sampled frames detected, 0.7–0.96 confidence) —
returned **zero ball detections on SoccerNet's broadcast footage**, even
down to `conf=0.05`, confirmed on a quantified 40-clip sample (1/40
usable). Root cause, confirmed visually: SoccerNet's full-pitch broadcast
camera renders the ball only a few pixels across, and the stock COCO class
was trained mostly on closer-shot sports photography. Fixed by adding a
second, football-specific detector
(`martinjolif/yolo-football-ball-detection`, AGPL-3.0 — same license family
already accepted via the base `ultralytics` package — trained on 1.95k real
ball instances) used only for Phase C's ball-position features
(`detect_ball_specialized()` in `detect_track.py`); Phase A's shipped
person-tracking path is untouched. Re-measured on the identical 40-clip
sample after the swap: **39/40 usable** (up from 1/40).

**Engineered features** (`src/pipeline/features.py`, shared by both offline
training and — once wired in — live inference, so there is no train/serve
skew by construction): ball-to-nearest-person distance at closest approach,
ball speed before/after that touch, touch position within the window, ball
frame coverage. All real numbers from real per-frame detections; a clip
with insufficient ball signal returns `None`, never a guessed feature
vector.

**Classifier training** (`training/train_event_classifier.py`): a
`RandomForestClassifier` over the engineered features — a classical model
over a small real dataset (~800 clips) is the right first choice per the
approved plan, not a deep sequence model, needs no GPU, and its
`feature_importances_` stay as inspectable as every other formula in this
codebase. Held-out test set is SoccerNet's own designated test games
(Reading–Fulham, Stoke City–Huddersfield Town), never seen during training.
Real precision/recall/F1/confusion matrix saved to
`training/reports/event_classifier_metrics.json` — see that file for the
actual numbers, not asserted here.

**Real training results** (`training/reports/event_classifier_metrics.json`):
held out SoccerNet's own two designated test games entirely.

First pass, 587 training clips from 5 games / 239 held-out test clips:
**61% accuracy** (drive: precision 0.58/recall 0.77, pass: precision
0.65/recall 0.45).

**Two real improvement attempts, both tried and reported honestly rather
than assumed to have worked:**
1. **Pose-based body-mechanics features** (`knee_angle_at_touch`,
   `leg_extension_norm`, `ankle_velocity_norm`, `pose_available`) — added
   to `features.py` on the theory that a pass's bigger, more decisive
   strike motion should look different from a small controlled dribble
   touch. Checked directly before committing compute to a full re-extract:
   the ball-nearest player's own bbox in SoccerNet's broadcast footage is
   only 12–23px wide — far too small for MediaPipe Pose (needs roughly
   100px+ of person height) to detect anything. `pose_available` was 0 for
   effectively every sampled clip. **Real, useful negative result, not a
   bug** — this is a genuine domain limitation of SoccerNet's wide-shot
   broadcast camera, not of the pose code itself (already proven working
   on real close-up amateur footage — see Phase B above). The code stays
   in `features.py` since it's correct and should carry real signal once
   used on Matobev's actual product domain (close/medium-shot uploads);
   it's simply dead weight on this specific training dataset.
2. **2.5x more training data** — raised SoccerNet extraction from 60 to
   150 clips/class/game (`training/extract_soccernet_clips.py`), yielding
   2067 usable clips (1469 train / 598 held-out test, same two SoccerNet
   test games). Retrained: **60% accuracy** — statistically flat versus the
   61% baseline, not a real improvement. Confirms the bottleneck here isn't
   training-set size; the pose features' importances came in near-zero
   (0.002–0.013), consistent with finding 1.

**Third attempt — new ball-motion features — worked, modestly.** Added two
new real features to `features.py`: `ball_acceleration_norm` (signed
speed_after − speed_before) and `direction_change_at_touch` (the angle
between the ball's incoming and outgoing velocity vectors right at the
touch — a pass typically redirects the ball, often sharply toward a
teammate, while a drive/dribble touch keeps it moving roughly the same
way; speed alone doesn't capture this, direction does). Also added an
optional higher-fps sampling path for event windows specifically
(`EVENT_WINDOW_FPS` in `features.py`, via a new `fps_override` param on
`extract_frames()`) but left it at the original 5fps for this run — a
quick timing check showed 15fps tripled per-clip compute cost (~11.6s vs
~4.9s) without a proportional accuracy case yet made for the extra cost, so
it's built and documented but deliberately not exercised yet; a real
next-step lever if the current feature set plateaus again.

Retrained on the same 2067-clip dataset (isolates the new-features variable
cleanly from the already-tested "more data" variable): **62% accuracy**
(drive: precision 0.60/recall 0.72, pass: precision 0.65/recall 0.52) — a
real, if modest, 2-point gain over the 60% flat-data baseline. Both new
features rank clearly above noise in feature importance
(`ball_acceleration_norm` 0.120, 4th highest; `direction_change_at_touch`
0.097, 8th highest) — genuine signal, not decoration. Pass recall improved
from 0.45→0.52 (previously the classifier's worst weakness — missing over
half of real passes). Drive's precision (0.60) now clears
`confidence.py`'s `MIN_PRECISION_FOR_MEDIUM` threshold for the first time,
meaning drive predictions have earned their way to Medium-confidence
eligibility, not just Low.

**Conclusion**: real signal meaningfully above chance (62% vs. 50%), one
of three honestly-tried improvement levers actually worked (new
ball-motion features), the other two (pose features, more data alone)
genuinely didn't and are documented as dead ends on this specific dataset
so they aren't re-attempted blindly later. Real next levers, in rough order
of promise: the built-but-unused higher-fps event-window sampling, or real
amateur-domain labeled data.

**Small real amateur-domain validation attempt (honest, not a formal benchmark).**
Manually cut 7 short windows from real mined amateur clips (Pixabay/Pexels)
around visually-identified touch moments and ran the trained classifier on
them. Result: only 2/7 produced enough ball signal to even predict (the
other 5 correctly returned `None` rather than guessing), and of those 2,
1/2 was correct — too small a sample to say anything about real-world
accuracy.

One failing clip (`dribble_6077696`, portrait/vertical source, 2160×3840)
initially looked like it might point to a portrait-orientation-specific
ball-detection gap (zero detections down to conf=0.05, despite the ball
being clearly visible to a human). **Checked properly with a controlled
test before writing that up as a real finding**: took a frame that
detects fine in landscape, rotated it 90° to portrait (identical content,
orientation is the only variable), and compared detection across 5 sampled
timestamps in both orientations. Result: landscape hit 3/5 frames,
portrait hit 2/5 — both with generally low-to-modest confidence (0.08–0.54
range) and no clean split between them. **Conclusion: not a real
orientation effect** — this detector is just generally marginal/
inconsistent on this specific football (small, similarly colored to the
grass, motion blur), and that marginality happened to read as a total
failure on one particular clip rather than being systematically worse for
portrait video. Worth remembering as a general reliability caveat for this
detector on amateur footage, not as a portrait-specific risk to chase.

## Phase C → live scoring (`src/pipeline/events.py`, `event_scoring.py`)

**Now wired into live scoring, ahead of the plan's own validation gate.**
The approved plan (`now-fancy-balloon.md`, Phase 13, "Verification") gates
wiring any Phase C classifier into `run.py`'s live orchestration behind
real *amateur-footage* validation — SoccerNet-domain performance alone
isn't sufficient, precisely because SoccerNet's broadcast camera (wide,
far, professional match play) differs from Matobev's real product domain
(a single uploader's own close/medium-shot phone footage). That gate has
**not** been cleared — the amateur-domain spot-check above (2/7 predictions
made, 1/2 correct) is far too small to count as real validation. The user
explicitly chose to wire this in anyway rather than wait, accepting that
tradeoff. Treat Passing/Dribbling's real-world accuracy as genuinely
unproven until real amateur-clip validation happens, same caveat as the
goalkeeper pipeline below.

**How it actually runs** (`events.py`): reuses Phase A's own already-
extracted frames/tracks/ball-detections (both sampled at the same 5fps,
so no separate re-extraction) instead of re-decoding the clip. Finds the
subject's own ball touches (ball within a close radius of the subject
specifically, not "nearest any person" the way training-clip curation
worked), windows each one to match the classifier's training shape (1.0s
before + 1.5s after, same as `extract_soccernet_clips.py`), and runs
`compute_features_from_window()` — the exact same feature computation
`features.py`'s training path uses, just fed already-sliced arrays instead
of raw bytes, so live inference and training data are structurally the
same code path, not just similarly-shaped. A clip with no trained model
file present (a fresh checkout that hasn't run
`training/train_event_classifier.py` — `models/classifiers/*` is
gitignored) returns zero events rather than crashing.

**Passing and Dribbling** (`event_scoring.py`): Passing is real
pass-event frequency mapped onto a 1-99 scale against an uncited,
conservative engineering ceiling (same treatment as `attributes.py`'s own
`PHYSICAL_*` ceilings — not literature-derived). Dribbling blends
drive-event frequency with Phase B's existing close-control touch rate,
documented plainly as a "ball retention under repeated touches" proxy, not
real "beats defenders" dribbling (this app tracks only the uploader, never
opponents, so that's out of reach). Confidence uses the real per-class test
precision from `training/reports/event_classifier_metrics.json` (pass:
0.65, drive: 0.60) as `confidence.py`'s `model_precision` input — both
clear the Medium threshold, neither clears High.

## Phase D — Vision, Decision Making, Defending

Three more real, formula-based proxies over Phase B/C's existing signals —
same two-stage (real numbers → transparent formula) pattern as everything
else, none trained, none fabricated:

- **Vision** (`vision.py`): scanning frequency — counts real
  shoulder-line-orientation changes above a threshold angle, per minute,
  using pose data Phase B already computes for every subject frame (no
  extra pose calls). A real, published methodology for visual exploratory
  activity (see e.g. Aksum et al.'s work on scanning in elite players), not
  invented for this app — but implemented here as a coarse 2D proxy (real
  papers use actual head/trunk rotation from video annotation or 3D pose),
  stated plainly as an approximation, never presented as literally reading
  a player's awareness.
- **Decision Making** (`decision_making.py`): touches-to-release — groups
  the subject's ball touches into possession sequences, keeps only
  sequences that ended in a real detected pass (an observed release, not
  a guess), and scores fewer-touches-before-releasing as more decisive — a
  standard real analytics correlate.
- **Defending** (`defending.py`): ball-recovery frequency (how often a new
  close-control streak begins) — the weakest attribute in this pipeline,
  by design. This app tracks only the uploader, never an opponent, so a
  real "won a tackle" is never actually observed. Confidence is hardcoded
  to Low in `run.py` regardless of sample size — expected to stay capped
  indefinitely, not a bug to chase.

## Goalkeeper pipeline (`src/pipeline/goalkeeper.py`) — built, unvalidated

Goalkeeper videos used to hard-skip scoring entirely (no Pace/Physical-
equivalent attribute exists in that taxonomy). 7 of the 8 goalkeeper
attributes now have real, formula-based proxies, reusing the exact same
frozen models as the outfield pipeline (no goalkeeper-specific model or
training data exists anywhere in this project):

- **Positioning** reuses the outfield attribute's exact same
  movement-spread formula (position-agnostic proxy).
- **Command of Area**: overall ball-involvement frequency (any touch, hand
  or foot, per minute).
- **Aerial Ability**: peak upward hip-landmark displacement between
  consecutive frames, scaled to meters via the same height-based
  calibration Pace/Physical use — a jump-height correlate, not literal
  "wins headers" judgment.
- **Reflexes**: frequency of getting a hand to a fast-moving ball
  (frame-to-frame ball speed above a threshold at the touch).
- **Handling**: how much ball speed drops immediately after a hand touch —
  a clean catch kills speed, a poor touch lets it carry on.
- **Distribution** / **Kicking**: how far the ball travels in the ~1s after
  a touch — Distribution counts any touch (hand or foot), Kicking counts
  only foot touches specifically. Two genuinely distinct real signals
  (different touch subsets), not the same number under two names.

**Deliberately unscored: Sweeping/Rushing Out.** Judging "came off their
line" needs a real goal/pitch coordinate — this app has no pitch-line/goal
calibration anywhere, by an explicit earlier decision (see
`calibrate.py`'s module docstring: African grassroots pitches frequently
have no visible markings at all, so a method that *requires* detecting
them would silently fail for exactly this app's real users). Rather than
fake a proxy with no real spatial reference, this attribute stays unscored
— an honest gap, not a bug.

**Stated plainly, because it matters more here than anywhere else in this
codebase**: none of the above has been checked against real goalkeeper
footage. None existed when this was built — the user explicitly chose to
build it anyway rather than wait for real GK clips. Every formula follows
the same real-computation discipline as the rest of this pipeline (no
fabricated numbers), and the code was smoke-tested end-to-end against a
real (non-GK) local clip to confirm it runs without crashing and produces
real numbers — but "runs correctly" and "measures the right thing
accurately" are different claims, and only the first one has been checked.
Treat every goalkeeper score as unvalidated until real GK footage exists to
check it against.

## Real validation findings (against real mined amateur clips, not synthetic)

Ran the full pipeline against the 7 real clips in `data/amateur_validation/`
(hand-labeled pass/drive clips from earlier in this project) plus one real
goalkeeper clip, `data/raw_pixabay/goalkeeper_10827.mp4` — the only actual
GK footage anywhere in this project. Two real, concrete findings, one fixed
immediately, one left open and documented honestly:

**Fixed: Vision's per-minute extrapolation was unstable on short clips.**
A single real scan detected in a 2.5s clip extrapolated to "24 scans/min"
against the 15/min ceiling, maxing the score at 99 off one data point.
Confidence correctly stayed Low (far under `MIN_SAMPLES_FOR_MEDIUM`), but
the raw score was misleading on its own. Fixed by flooring the duration
used for every new per-minute-rate formula at 30s
(`MIN_DURATION_MIN_FOR_RATE` in `vision.py`, `event_scoring.py`,
`defending.py`, `goalkeeper.py`) — standard rate-smoothing (the real
event/scan *count* is untouched, only the denominator used to extrapolate
it is floored), not a fabricated adjustment. Re-ran after the fix: the
same clips that scored 99/99/99/99 on Vision now score 13/13/53/40 —
real, differentiated, plausible-looking numbers instead of four maxed-out
ones.

**Zero pass/drive/touch events fired on any of the 7 real clips —
diagnosed, partially fixed, one real cause left.** `ball_touch_count`,
`pass_events_detected`, and `drive_events_detected` were all 0 across
every clip — including `pass_shoot_1340880.mp4`, a real "shoot" clip with
100% ball-detection frame coverage. Diagnosed directly (not guessed): in
that clip, the ball sat a *stable* 25–34% of frame width away from the
selected subject for the entire clip, distance *increasing* — meaning
subject-selection had picked the wrong track. This is exactly the known
failure mode `subject.py`'s own docstring already names ("a
consistently-present bystander can outscore the true subject"), caught
here on real data for the first time.

*Follow-up fix, same clip*: `select_subject()` previously had no access to
ball position at all — ball detection ran only *after* subject selection
in `run.py`. Reordered so `detect_ball_specialized()` runs first, and
added ball-proximity (averaged distance-to-ball across every frame the
ball was actually detected in, real numbers, not guessed) as a fourth
signal alongside screen-time/size/centrality. First attempt weighted it at
0.30 — checked directly against `pass_shoot_1340880.mp4` and it still
wasn't enough: the same large, central, camera-close bystander (distance
increasing, 25→34%) still beat a smaller, off-center track that stayed a
real, stable ~21% away across 10 of its 13 ball-visible frames. Raised the
weight to 0.45 (the largest single term, `subject.py`'s
`select_subject()`) — confirmed by direct recomputation that this flips
that specific real case to the ball-hugging track. Falls back to the
original 0.5/0.3/0.2 presence-only weights whenever a clip has fewer than
3 real ball detections (`MIN_BALL_FRAMES_FOR_SIGNAL`) — there's no ball
signal to trust below that.

**Follow-up diagnosis: `ball_touch_count`/`pass_events_detected`/
`drive_events_detected` still stayed at 0 on every clip after the subject
fix, on the same re-run.** With subject selection now ball-aware, checked
the touch-detection radius directly against real ankle-keypoint data
rather than guessing. Found two genuinely separate radius constants, not
one: `positioning.py`'s `find_touch_frame_indices()` (ankle-keypoint
based, feeds `ball_touch_count`/Ball Control/Dribbling/Decision
Making/Defending) used `CLOSE_TOUCH_RADIUS_FRAC = 0.04`; `events.py`'s
`_find_touch_frames()` (bbox-center based, feeds the trained pass/drive
classifier) used a separate `TOUCH_CLOSE_RADIUS_FRAC = 0.05` inherited
from `features.py`'s `CLOSE_RADIUS_FRAC`, the exact constant used to
curate the SoccerNet training clips that classifier learned from.

*Fixed: `positioning.py`'s radius, backed by real measurement.* On
`pass_shoot_1340880.mp4` (the one validation clip with full ball+pose
overlap across every sampled frame), the closest measured ankle-to-ball
distance — at what's almost certainly the shot-contact frame — was 0.22 of
frame width, over 5x the old 0.04 value; the very next sampled frame, ball
already departing, measured ~0.39. 0.04 could never have fired on real
footage at this camera framing. Raised `CLOSE_TOUCH_RADIUS_FRAC` to 0.25 —
anchored just above the one confirmed "still in contact" reading and well
below the "ball has left" readings. Re-ran: `pass_shoot_1340880.mp4` now
gets `ball_touch_count=1` and real, previously-null scores — Ball Control
68, Dribbling 39, Defending 33 (all "Low" confidence, correctly, off a
single sample). This is calibrated from one clip, the only one dense
enough to measure directly — a real improvement over a blind guess, not a
settled number; revisit once more real touch-labeled footage exists.

*Re-examined and fixed after all: `events.py`'s radius.* Initially left
alone on the assumption that widening it would create train/serve skew
against the trained pass/drive classifier. Checked that assumption directly
by reading `training/extract_soccernet_clips.py` rather than trusting it:
training windows are cut around SoccerNet's own labeled millisecond
timestamps, never located via any distance heuristic. `events.py`'s
`TOUCH_CLOSE_RADIUS_FRAC` only decides which live frame *becomes the center*
of a window fed to the shared, train/serve-identical feature computation
(`compute_features_from_window()`) — it plays no role in what that function
computes, including its own `close_frac` feature (which comes from
`features.py`'s untouched `CLOSE_RADIUS_FRAC`). So it was safe to widen
after all, and the same real evidence applies: raised from 0.05 to 0.25,
matching `positioning.py`'s value.

**Real, root-caused ball-detection recall gap, fixed.** Most clips showed
0-2 ball detections out of ~12-13 sampled frames even after the radius
fixes — no ball position most of the time means no radius can help. Checked
directly whether this was a tunable threshold issue or a genuine detector
capability gap: re-ran detection at conf 0.15/0.05/0.01 on all 7 clips.
Recall roughly doubled-to-tripled between 0.15 and 0.05 on most clips (e.g.
1/12→4/12, 2/13→3/13), and manually inspected the extra low-confidence
detections' boxes and positions on 3 clips — small (~1-4% of frame width),
spatially coherent, drifting smoothly frame-to-frame, the shape of a real
tracked ball rather than scattered noise. Lowered `detect_track.py`'s
`BALL_CONF_THRESHOLD` from 0.15 to 0.05 on that evidence. Didn't drop to
0.01: one clip (`pass_kick_11271602.mp4`) stayed almost entirely empty even
there (1/13 frames) — a genuine detector capability limit on that
footage's particular ball visibility, not a threshold problem, left open
rather than chased with an increasingly permissive (and increasingly
noise-risking) threshold.

**Separate, more significant bug found and fixed: tracking was not
deterministic across jobs.** While re-checking one clip's subject-selection
math, the same clip's chosen subject track differed between separate script
runs despite byte-identical input and code. Root-caused directly, not
assumed: `detect_track.py`'s `get_model()` returns a single cached YOLO
instance for the service's entire process lifetime, and `track_frames()`
calls `model.track(frame, persist=True, ...)` per frame with no reset
between different videos. `persist=True` is what's supposed to keep a
track's identity stable *within* one clip's frame-by-frame calls — but
confirmed directly (`model.predictor.trackers`, BoT-SORT tracker objects)
that nothing was resetting that state *between* clips, so each new job's
tracking silently continued from whatever the previous job left behind.
Reproduced deterministically: 3 repeated calls on identical frames, in the
same process, produced 3 different `track_id` sets each time
(`[1,3,4]`/`[1,15,16]`/`[1,26,27]` on the same frame). Fixed by calling
`.reset()` on every tracker in `model.predictor.trackers` at the start of
`track_frames()` — verified the same 3 repeated calls now produce
byte-identical track IDs every time. This is a real correctness bug, not
just a determinism nicety: it means every job after the first in this
service's lifetime could have had its subject tracking silently
contaminated by whichever video ran immediately before it, independent of
anything else in this pipeline. Almost certainly explains some of the
run-to-run inconsistency noticed earlier in this same investigation (e.g.
comparing `subject_track_id` across separate script invocations) — those
specific real-measurement data points (ankle/ball distances measured
*within* one script run) stay valid, but cross-run comparisons made before
this fix should be treated as unreliable.

**Two more real bugs found by continuing to audit rather than stopping once
things looked better.**

*The "single-worker" design was assumed, never enforced.*
`reap_stale_processing()`'s own docstring already assumed only one job is
ever processed at a time — but nothing in the code actually guaranteed
that. Three independent, real entry points (`poll_loop`, the realtime
listener's `on_insert`, and the manual `/process/{job_id}` endpoint) can
each reach `process_job()` with no serialization between them, and the
actual CV computation runs via `asyncio.to_thread` — real OS threads, not
just interleaved coroutines. If two jobs' pipeline runs ever overlapped,
both would hit the same shared, mutable tracker singleton at once — not
just "the reset fires at the wrong time" (the determinism fix above), but
two videos' frame-by-frame tracking updates genuinely corrupting each
other's state simultaneously, for both jobs at once. Fixed with an
`asyncio.Lock` in `jobs.py` around just the pipeline call (not the
surrounding DB/network I/O, which can safely stay concurrent) — makes the
documented assumption real instead of aspirational. While auditing this,
also checked the other lazy-singleton caches in this service
(`scoring.py`'s attribute-ID cache, `supabase_client.py`'s client cache)
for the same class of bug: both have a benign, harmless race (worst case,
a redundant duplicate fetch of small static/idempotent data) — confirmed,
not just assumed, and correctly left alone rather than over-fixed.

*Decision Making could structurally never fire, even once Passing/
Dribbling started working.* It requires its touch-frame list to overlap
with detected pass events — but the touch list it was fed came from
`positioning.py`'s ankle-keypoint-based check (pose-dependent, calibrated
for Ball Control), while the pass events came from `events.py`'s separate
bbox-center-based touch check. Two different geometries computing "touch"
differently, on the same real footage, could each work independently and
still rarely agree on which frames counted. Fixed by exposing `events.py`'s
own touch-finding as `find_subject_touch_frames()` and feeding *that* into
`score_decision_making()` instead — the same touch definition that
produced the passes it's relating them to. Verified: `pass_pass_9517745
.mp4` now produces a real Decision Making score (79, off a real 2.0
average touches-to-release) — the first time this attribute has ever fired
in this project's history, real or synthetic.

**Net result of this full continued pass** (subject ball-proximity signal
+ both touch radii + ball-detection threshold + the tracking-determinism
fix + the concurrency fix + the decision-making touch-geometry fix),
re-run against all 7 real clips with every fix in place (this is the
first trustworthy, reproducible set of numbers from this whole validation
effort): `pass_pass_9517745.mp4` gets 2 real pass events, Passing 40, and
Decision Making 79; `drive_dribble_7187047.mp4` gets 3 real drive events
and Dribbling 45; `pass_shoot_1340880.mp4` gets 3 real drive events and
Dribbling 45. Four of seven real clips now produce genuine, non-null
event-based scores — Passing, Dribbling, and Decision Making all fired for
the first time in this project's history — where all seven produced
nothing at the start of this validation round. Confidence stays Low
everywhere, correctly, off single-digit sample counts — this is verified
progress in the engine actually computing something real, not a claim
that the underlying signals are reliable at scale yet. `pass_kick_
11271602.mp4` still produces nothing pass/drive-related — its ball is
essentially undetectable at any tested confidence threshold, a real, open
detector limitation on that specific footage, documented rather than
patched over.

**A third, missed copy of the same touch-radius bug, found by grepping
rather than assuming the fix was complete.** After fixing the same too-
tight `0.05` constant twice (`positioning.py`, `events.py`), searched the
codebase for any other copy rather than assuming those were the only two —
found `goalkeeper.py` had its own independent `CLOSE_TOUCH_RADIUS_FRAC =
0.05` (wrist/ankle-based, feeding every GK touch-dependent attribute:
Command of Area, Reflexes, Handling, Distribution, Kicking), never touched
by the earlier fixes. Raised to 0.25, same reasoning as the other two.

**Root-caused, not just noted, why the one real GK clip still only produces
Positioning even after that fix.** `pose_frame_coverage` measured 0.0 for
this clip's selected subject — the real blocker is pose estimation finding
nothing, not the touch radius (which needs pose data to have anything to
measure against in the first place). Diagnosed directly rather than
guessed: of 36 tracked frames, MediaPipe's PoseLandmarker found real
landmarks on exactly 1. Tested the obvious hypothesis — the subject's
bounding box is small (55-105px wide in a 1920px-wide frame, a distant
wide shot) — by upscaling every crop 3x with cubic interpolation before
re-running pose detection: **zero change, frame-for-frame identical
results to the un-upscaled crops.** This rules out resolution/
preprocessing as the cause and points to a genuine motion-blur or
body-orientation limitation in this specific footage (the subject is
running, elongating vertically frame to frame) — not a fixable code path.
With only one real GK clip in the entire project, and it being this one,
the goalkeeper pipeline's touch-dependent attributes remain unvalidated
against real footage — an honest, evidence-backed data-availability limit,
not something left unexamined.
