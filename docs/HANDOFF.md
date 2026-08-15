
# Matobev — Session Handoff

**Purpose of this document**: a complete record of what's been built this session, so work can resume cleanly after a context reset without re-deriving decisions or re-discovering what already exists. Read this before doing anything else.

**Repo**: https://github.com/simeon-code254/football-app (branch `main`)
**Supabase project**: ref `qefovzbhnmdhbqldtptc`, URL `https://qefovzbhnmdhbqldtptc.supabase.co`
**Stack**: React Native + Expo Router (TypeScript) frontend, Supabase (Postgres/Auth/Storage/Realtime) backend.

---

## 1. What Matobev is

An AI football-scouting platform for Africa, connecting **Players** (upload highlights, get AI performance ratings, get discovered) and **Scouts** (search/filter players, review AI reports, run trials, recruit). Two user roles, two different app experiences, one shared backend.

---

## 2. UI — everything built, screen by screen

All paths relative to `app/app/` (Expo Router file-based routing).

### Auth / onboarding stack (shared by both roles)
| Screen | File | Status |
|---|---|---|
| Splash | `index.tsx` | Done — animated, uses uploaded logo + photo |
| Onboarding (3 slides) | `onboarding.tsx` | Done |
| Welcome | `welcome.tsx` | Done |
| Role Select | `role-select.tsx` | Done — sets role in Zustand store |
| Signup | `signup.tsx` | Done — role-aware (scout gets an Organization field), password visibility toggle |
| Verify Email | `verify-email.tsx` | Done — branches: player → Profile Complete, scout → straight to Scout Dashboard. Resend has a real cooldown/sent state (actual `supabase.auth.resend()` call still pending backend wiring) |
| Profile Complete | `profile-complete.tsx` | Done — 4-step wizard (Personal → Football Info → Bio → Social), player-only. Doubles as Edit Profile via `?mode=edit` |
| Login | `login.tsx` | Done, but has a **temporary "Continue as Player/Scout" toggle** standing in for real post-auth role routing — delete this when wiring auth. Forgot Password now wired to a real screen |
| Forgot Password | `forgot-password.tsx` | Done — email → sent confirmation (real `resetPasswordForEmail` call pending backend wiring) |

### Player tabs — `(player-tabs)/`
| Screen | File | Status |
|---|---|---|
| Home | `home.tsx` | Done — rating card, quick actions, Trials Near You (now real data, tappable), Recent Activity, bell → Notifications |
| Reels | `reels.tsx` | Done — real vertical paging feed (multiple clips), working like/save/share/comment with a real comment sheet |
| Upload | `upload.tsx` | Done — Highlight/AI-Analysis toggle, title/description/match/opponent/tags form |
| Discover | `discover.tsx` | Done — search, position-chip filters, trending list |
| Profile | `profile.tsx` | Done — About/Videos/AI Ratings/Stats tabs, Settings section, Edit Profile entry point (pencil icon on cover) |

### Scout tabs — `(scout-tabs)/`
| Screen | File | Status |
|---|---|---|
| Home (Scout Dashboard) | `home.tsx` | Done — verification banner (wired to `/scout-verification`), global search, quick actions, scouting overview, Recommended For You (with match-reason), Recently Uploaded, Top Performers leaderboard, Active Trials, bell → Notifications |
| Players (Discover) | `players.tsx` | Done — real filter bottom sheet, Compare mode (checkbox select → `/compare`), cards now navigate to Player Details |
| Trials | `trials.tsx` | Done — list + Create Trial modal form |
| Messages | `messages.tsx` | Done — conversation list + thread, verification-gated, accepts a `playerId` param to deep-link into a specific thread |
| Profile | `profile.tsx` | Done — bio/org/positions/activity, Settings list, working Scouting Preferences form, verification CTA, Edit Profile link |

### Dynamic + standalone routes
| Screen | File | Status |
|---|---|---|
| Player Details | `player/[id].tsx` | Done — Overview/AI Analysis (confidence-annotated attributes)/Videos tabs, Save-to-folder, private Scout Notes, Invite to Trial, Message (deep-links to a specific thread) |
| Trial Detail | `trial/[id].tsx` | Done — role-aware: scout gets applicant status tabs + bulk actions, player gets trial info + Apply/status view |
| Scout Verification | `scout-verification.tsx` | Done — document upload flow (ID, proof of organization, optional certification) via `expo-document-picker`; submission itself stubbed pending backend wiring |
| Player Trials | `trials.tsx` | Done — Open Trials / My Applications, reachable from player Home |
| Notifications | `notifications.tsx` | Done — role-aware list, mark-as-read, reachable from both dashboards' bell icons |
| Compare Players | `compare.tsx` | Done — side-by-side attribute table for 2–3 selected players |
| Scout Edit Profile | `scout-edit-profile.tsx` | Done — name/organization/country/bio |

### Shared components — `src/components/`
`PrimaryButton`, `SecondaryButton`, `IconButton` (has a `light` variant for photo headers), `AppTextField` (has `isPassword` for show/hide toggle), `SelectField` (modal picker), `TypeaheadField` (type-ahead combobox, used for Africa-only nationality), `Checkbox`, `RatingBadge`, `PlayerCard`, `ScoutPlayerCard` (the signature FIFA-card-style scout view), `Logo` (color/white variants from the uploaded mark).

### Mock data — `src/data/`
`mockPlayers.ts`, `mockTrials.ts` (+ `MY_APPLICATIONS` for the player-side application-status view), `mockNotifications.ts`, `mockReels.ts`.

### Design system
`src/theme/` (colors, typography, spacing extracted from the original mockup), `src/constants/images.ts` (verified African-context Unsplash photos + local uploaded assets), `src/constants/africanCountries.ts` (54-country list, Africa-only scope), `src/constants/football.ts` (12-position enum, genders).

### Branding
App icon, favicon, Android adaptive icon (foreground/background/monochrome), and splash icon all generated from the uploaded `logofree.png` mark. Splash and Welcome screens use the real logo instead of a placeholder icon.

---

## 3. Backend — everything built

**67 migrations** (28 from the original build, then security hardening in Phases 6/7, the admin webapp, position-weighted ratings, and the blocking/push work in §7), all written and **pushed live** to the Supabase project (confirmed via `supabase migration list --linked` — local/remote history match exactly, zero drift). Full list in `supabase/migrations/`, roughly in this order:

1. Extensions/enums (`position_code`)
2. `countries` (Africa-only, 54 seeded rows)
3. `profiles` (role immutable after signup, via trigger)
4. `players` (position, physical stats, bio, social links, `overall_rating`)
5. `scouts` + `admins` (verification_status, `is_verified_scout()`/`is_admin()` helpers)
6. `handle_new_user()` — auto-creates profile + skeleton player/scout row on signup
7. `attribute_definitions` — 10 outfield + 8 goalkeeper attributes, seeded
8. `videos` (`upload_intent`: highlight_only|ai_analysis)
9. `video_analysis_jobs` (service_role-write-only — no player can fake a completed job)
10. `player_attribute_scores` + history (EAV shape, confidence High/Medium/Low, trigger-maintained `overall_rating`; service_role-write-only — no player can fake a rating)
11. `trials`
12. `trial_applications` (player-apply and scout-invite paths, per-actor update policies)
13. `saved_player_folders` + `saved_players` + `scout_notes` (private, 4 default folders auto-seeded per scout)
14. `scout_preferences` + `match_score()` SQL function (computed on read, never persisted)
15. `player_public_view`
16. `conversations` + `messages` (verified-scout-only conversation creation)
17. `notifications` (trigger-driven: new message, trial status change, scout verification change)
18. Realtime enabled on `messages`/`notifications`
19. Storage buckets: `avatars` (public), `videos` (private, visibility-gated via a join back to the `videos` table)
20. `video_engagement` — `video_likes`/`video_saves`/`video_comments` + denormalized counters + `increment_video_view`/`increment_video_share` RPCs
21. `trial_invitations` — `source`/`invited_by_scout_id` on `trial_applications`
22. `profile_views` — append-only log (backs "3 scouts viewed your profile" etc.)
23. `admin_scout_verification` — **fixed a real bug**: admins previously had no RLS policy allowing them to approve a scout at all
24. `tighten_scout_invite_policy` — closed a gap where a demoted scout could still invite off old trials
25. `scout_verification_documents` + private storage bucket + `scouts.verification_notes`
26. `queue_ai_analysis_jobs` — `SECURITY DEFINER` trigger auto-creates a queued `video_analysis_jobs` row on `ai_analysis` uploads (the table has no client-write policy at all — this trigger is the only path a job can ever be created)
27. `scouts_country` — adds `scouts.country_code` (was missing; `scout-edit-profile.tsx`'s Country field had no backing column)
28. `video_analysis_jobs_realtime` — enables Realtime on `video_analysis_jobs` so the new AI analysis service can pick up queued jobs via an outbound subscription (see §6)

**RLS is live-verified**, not just written — confirmed via the anon key (same path the app uses): seed data readable, unauthenticated writes to `player_attribute_scores`, `video_likes`, `profile_views`, and `scout_verification_documents` are all correctly blocked. See §5 for the full backend-integration verification pass (real authenticated writes, Realtime delivery, RLS spoof-blocking, etc.).

**RN app wiring: complete** — every screen calls Supabase via `src/repositories/*.ts`, no screen touches mock data anymore (`src/data/mock*.ts` has been deleted). See §5.

### Credentials on file (do not re-request these)
- Anon key: in `app/.env` (gitignored)
- Service role key: in `ai-service/.env` (gitignored) — treat as a secret, never let it reach the app bundle
- Supabase Personal Access Token: used for CLI auth (not stored persistently — `supabase link` state is what persists, in `supabase/.temp` locally, gitignored)
- **Sentry DSN**: in `app/.env` as `EXPO_PUBLIC_SENTRY_DSN`. Not a secret (write-only, ships in the bundle by design) — don't confuse it with the Sentry *auth token*, which is secret and only used for source-map upload at build time. Org `simeon-n4`, project `react-native`, EU (`.de`) ingest region.
- **EAS project**: `@simeonanyal/matobev`, id `20ee1c4b-9800-4006-adde-42a973d7beae`, written into `app.json` under `extra.eas.projectId`. Required by `getExpoPushTokenAsync` — without it push registration fails closed.
- **Push webhook secret**: stored in **Supabase Vault** under the name `push_webhook_secret`, and separately as the `PUSH_WEBHOOK_SECRET` env var on the `send-push` Edge Function. Deliberately not in git. Both ends must match; rotating means updating both.

---

## 4. UI screens/fixes — all closed

Everything listed here previously is now built (commit `51b8687`). Kept as a record of what was closed and how, in case any of it needs revisiting:

1. **Player Trials** — `app/trials.tsx` (Open Trials / My Applications segments) + `trial/[id].tsx` made role-aware (player gets an Apply flow, scout keeps applicant management). Home's "Trials Near You" now reads real `MOCK_TRIALS` (was a second, disconnected hardcoded array before) and is tappable.
2. **Notifications** — `app/notifications.tsx`, wired to both dashboards' bell icons. `src/data/mockNotifications.ts` shaped to match the `notifications` table.
3. **Forgot Password** — `app/forgot-password.tsx`, wired to Login.
4. **Resend on Verify Email** — real cooldown-timer + sent-confirmation state (still stubbed for the actual `supabase.auth.resend()` call, marked `TODO(backend wiring)`).
5. **Message deep link** — `player/[id].tsx` passes `?playerId=` to `(scout-tabs)/messages.tsx`, which opens that thread directly.
6. **Reels as a feed** — rebuilt on a paging `FlatList` (multiple clips, swipe between them), working like/save/share/comment (local state, matches `video_likes`/`video_saves`/`video_comments` shape), real comment bottom-sheet. `src/data/mockReels.ts`.
7. **Edit Profile** — `profile-complete.tsx` doubles as an edit flow via `?mode=edit` (pre-filled, "Save Changes", cancel-out X). Scout counterpart: `app/scout-edit-profile.tsx`.
8. **Compare Players** — selection mode (checkbox overlay + floating bar) on `(scout-tabs)/players.tsx`, `app/compare.tsx` for the side-by-side attribute table.

## 4a. Deep-link audit (done before backend wiring, as requested)

Cross-checked every route file against every `router.push`/`replace` call in the codebase, plus `_layout.tsx`/`Tabs.Screen` registrations. Found and fixed 4 more real gaps (commit `d82fbed`):

9. **No player-facing Messages screen existed at all.** A scout could message a player once verified, but the player had no way to see or reply — Home's "Messages" quick action had no `onPress`. Added `app/messages.tsx` (mirrors the scout side, accepts a `scoutId` param for deep-linking) + `src/data/mockScouts.ts`.
10. **Home's "Browse Trials" quick action navigated to Discover (players)**, not the Trials screen — mislabeled/wrong target from before `app/trials.tsx` existed. Fixed.
11. **Upload's video dropzone had no `onPress`** — tapping "Upload Video" did nothing. Wired to `expo-image-picker` (permission check, video library, preview once selected, Upload & Publish now requires a video).
12. **Profile-complete's "Add Photo" circle had no `onPress`** — same fix, image picker with square crop.

Confirmed after fixing: every top-level/dynamic route has at least one inbound navigation reference (no orphaned screens), and every `router.push` target resolves to a real file.

**Deliberately left as stubs (seen, not missed)** — these have no `onPress`/are decorative, judged lower priority than the above:
- Settings sub-rows (Account/Security/Notifications/Privacy/Language/Theme/Help) on both player and scout Profile — generic placeholders, not Matobev-specific functionality.
- "Delete Account" rows on both Profiles — destructive, needs a confirmation flow + real backend auth admin call anyway.
- "Create New Folder" in Player Details' Save modal — minor sub-flow (needs a text-input prompt).
- Bulk "Message" button in Trial Detail's applicant multi-select bar — messaging is modeled as 1:1 conversations, bulk-message needs its own design decision.
- Message composer's paperclip/attach button (both scout and player Messages) — needs Storage wiring anyway.
- Google/Apple social login buttons on Login — decorative, real OAuth is a separate setup task from email/password wiring.

**Still deliberately not built**: in-app Admin UI (separate web dashboard is the architecture decision), skeleton/loading/error states (falls out of the wiring work itself).

**One config change worth knowing about**: `experiments.typedRoutes` was disabled in `app.json`. The generated route-types file (`.expo/types/router.d.ts`) proved unreliable — `expo export` only sometimes regenerated it, with no dependable manual trigger found, and it caused repeated false-positive type errors on every new route (unrelated to actual bugs). Routes work identically at runtime either way; this just drops compile-time literal-route-string checking. If re-enabling it later, expect to need `npx expo start` (not just `export`) running at least once to populate the types file.

---

## 5. Backend integration — complete

Every screen now runs on real Supabase data. `src/repositories/*.ts` (8 files: `auth`, `profile`, `videos`, `trials`, `scouting`, `messages`, `notifications`, `verification`) is the only layer that imports `src/lib/supabase.ts` — screens never call Supabase directly. `src/lib/database.types.ts` is generated from the live schema (`supabase gen types typescript --linked`); regenerate it after any future migration. `src/lib/queryClient.ts` + `@tanstack/react-query` (`QueryClientProvider` in `_layout.tsx`) is the data-fetching/caching layer across the whole app. `src/data/mock*.ts` has been deleted — nothing references it anymore.

**Two new migrations landed this pass** (27 total now):
- `queue_ai_analysis_jobs` — a `SECURITY DEFINER` trigger on `videos` that auto-creates a queued `video_analysis_jobs` row when `upload_intent='ai_analysis'` (the table has no client-write policy, so this trigger is the only path a job can ever be created — no player can fake a completed analysis).
- `scouts_country` — adds `scouts.country_code` (was missing; `scout-edit-profile.tsx`'s Country field had no backing column).

**What each step covered** (all verified end-to-end against the live project with real, cleaned-up test accounts — not just "no type errors"):
1. Auth — real `signUp`/`signIn`/`signOut`/password-reset/resend; `useSessionStore` now derives `role`/`scoutVerified` from a real session + `profiles`/`players`/`scouts` rows (`hydrate()`), no more manual toggles. Verified: signup trigger creates the right skeleton rows for both roles, incl. auto-seeded scout folders.
2. Profile read/write — `profile-complete.tsx` (4-step wizard + avatar upload), `scout-edit-profile.tsx`, both Profile headers, Scouting Preferences form all read/write real rows. Verified: an authenticated RLS write actually persists (not just "no error").
3. Attributes (read-only) — AI Ratings/AI Analysis tabs and Home's rating tiles query real `player_attribute_scores` via `attribute_definitions`, with an honest empty state (no scores yet — service_role-write-only).
4. Discover/browse — `discover.tsx`, `players.tsx` (full filter sheet incl. multi-select position/country/foot), `compare.tsx` all query `player_public_view`.
5. Video upload — `upload.tsx` does a real Storage upload (base64→ArrayBuffer via `expo-file-system`, not `fetch().blob()` — that path is known to corrupt uploads on Android) + thumbnail + `videos` insert. Verified the new trigger fires only for `ai_analysis` uploads.
6. Reels — real vertical feed (`videos` + `player_public_view` join) with `expo-video` playback (only the centered clip plays), real like/save/comment/share/view backed by `video_likes`/`video_saves`/`video_comments` + the trigger-maintained counters and RPCs. Player Profile's Videos tab also got real thumbnails + a full-screen player.
7. Trials — full CRUD: scout create (verified-gated), player apply, scout shortlist/accept/reject, scout invite-to-trial from Player Details. Verified the unverified→blocked→verified→allowed sequence, the status-change notification trigger, and RLS spoof-blocking on both the application-status and invite paths.
8. Scouting tools — save-to-folder (incl. "Create New Folder", finally wired), private Scout Notes, `match_score` RPC (shown as a "% Match" pill on Player Details and used for scout Home's Recommended feed), real Scout Verification document upload. Verified `scout_notes`/`saved_players` are genuinely invisible to the player being saved/noted about (RLS silently returns 0 rows, not an error).
9. Messaging — real `conversations`/`messages` on both sides, with a live Realtime subscription (`postgres_changes` on `messages`) pushed straight into the TanStack Query cache. Verified actual cross-client Realtime delivery, not just the DB write.
10. Notifications — real `notifications` list/unread-count/mark-read on both dashboards' bells plus the `/notifications` screen, with a live Realtime subscription. Verified players cannot insert their own notifications directly (service_role/trigger-only, per the original design).

**Known trade-offs / fast-follows, not blockers:**
- Verify-email's "I've Verified My Email" can only succeed if a session already exists on-device (Supabase's default confirm-email flow doesn't hand back a session after signup) — no deep-link/`emailRedirectTo` auto-login is wired yet, so the honest fallback routes to Login.
- Upload's UI copy says "up to 500MB" but the base64 upload path is realistically good for far less (~100MB) before memory becomes an issue — fine for MVP, a resumable/TUS upload would be the real fix later.
- "Scout Saves" was dropped from the player's own Stats tab — `saved_players` is intentionally RLS-private to the saving scout, so a player has no honest way to see who saved them.

## 6. AI analysis engine — Phase A built (Pace + Physical), local dev only

Full design rationale in `C:\Users\Admin\.claude\plans\now-fancy-balloon.md` ("Phase 4"). New top-level `ai-service/` directory — a standalone Python/FastAPI service, separate from `app/` and `supabase/`, not deployed anywhere yet (deliberately local-dev-only per the user's own decision, given this machine's GPU is a 2GB-VRAM MX450, nowhere near enough to train/run the heavier action-recognition phases).

**Scope, deliberately narrow**: detection + tracking only, using pretrained zero-training models (YOLOv8n + its built-in ByteTrack) → real **Pace** and **Physical** attributes. No pose estimation, no action recognition (Shooting/Passing/Defending/GK attributes — needs SoccerNet fine-tuning and real GPU compute, not attempted here), no goalkeeper scores (no Pace/Physical-equivalent exists in that attribute taxonomy — GK jobs complete with no scores written, by design, not a bug).

**New migration** (28 total now): `video_analysis_jobs_realtime` — enables Realtime on `video_analysis_jobs` (previously only `messages`/`notifications` were enabled), so the service can pick up newly-queued jobs via an outbound Realtime subscription instead of needing a public inbound webhook endpoint.

**What's built and verified**:
- Full pipeline (`ai-service/src/pipeline/`): ffmpeg-free frame extraction (OpenCV's bundled backend) at 5fps → YOLOv8n person+ball detection/tracking → a heuristic subject-player disambiguation (most screen time + largest size + most central — a real, documented approximation, not solved) → pixel→meter calibration off the subject's bbox height vs. `players.height_cm` (or a 170cm default) → Pace/Physical formulas from tracked displacement → confidence capped at `Medium` (never `High` — this phase's inputs are never ground-truth-validated).
- Job orchestration (`src/jobs.py`): atomic claim (`UPDATE...WHERE status='queued'`, race-safe by construction), a startup self-heal that resets any stuck `processing` row back to `queued`, and an honest failure path (`status='failed'` + a real `error` message — never left stuck, never silently faked as `completed`).
- **Live-verified without needing the service_role key locally**: uploaded a real synthetic test clip through the actual app upload path as a real test player account, confirmed the existing auto-queue trigger still creates a `queued` job correctly. Ran the pipeline directly (no Supabase needed for this part) against two real test videos: (1) a synthetic clip with no person in it → correctly returned `ok=False, "no person detected"`, zero crash, matching the honest-failure design; (2) a real photo of footballers (Ultralytics' own official demo image, `zidane.jpg`) turned into a static test clip → YOLO genuinely detected and tracked two real people, but the calibration step correctly **refused** to calibrate off the selected subject's bounding box because its aspect ratio wasn't a plausible upright person (a same-scene neighboring detection was upright and would have calibrated fine) — a real, honest finding: the subject-heuristic can pick a wide/merged detection in a crowded scene, and the calibration safety check is what catches it and prevents a fabricated number, exactly as designed. Test artifacts (test player account, uploaded test video row) cleaned up after; one small leftover — the tiny synthetic test clip's Storage object under the now-deleted test player's path — couldn't be removed (storage deletion needs an authenticated owner session or service_role, and the account was already deleted first); harmless (private bucket, orphaned path, nothing can generate a valid URL to it), safe to ignore or delete manually from the Supabase dashboard's Storage browser.
- **Not yet run against real human movement** — this needs a real short video of an actual moving person, which nobody in this session could supply (the assistant can't record one; the synthetic/static tests above are the honest substitute for validating pipeline mechanics). **To see real Pace/Physical numbers**: copy `ai-service/.env.example` to `.env`, fill in the Supabase service_role key (dashboard → Project Settings → API), install deps per `ai-service/README.md`, film a few seconds of a person moving sideways across the camera, upload it through the app with AI Analysis mode on, run `uvicorn main:app --reload` from `ai-service/`.

**Small companion UI change also shipped this pass**: both `app/app/(player-tabs)/profile.tsx` and `app/app/player/[id].tsx` now show a "Provisional (X/Y attributes assessed)" label next to the overall rating whenever some but not all attributes are scored — otherwise a Phase-A-only player (2 of 10 attributes) would show a normal-looking overall rating that reads as complete.

## 6b. Multi-signal subject tracking (Phase 5) — production-direction hardening

Full design rationale in `now-fancy-balloon.md` ("Phase 5"), written after a research pass into how real production/academic sports-CV systems (SkillCorner, Second Spectrum, Veo, SoccerNet, the open-source `roboflow/sports` toolkit) actually solve detection/tracking/re-identification/calibration. Positioning decision confirmed with the user: Matobev stays deliberately narrower than those systems — tracking *one* player (the uploader), not a full match — which is what keeps every addition below cheap, pretrained, and CPU-only.

**What changed**, all in `ai-service/src/pipeline/`:
- **Tracker**: ByteTrack → BoT-SORT with appearance re-ID (`with_reid: True`, `model: auto` — reuses YOLO's own detector features, zero new models/training). Config in `botsort_reid.yaml`. Fixes short-term occlusion/cut recovery; still not long-term re-ID (open research problem).
- **Team-color clustering** (`teams.py`, new): training-free K-means (k=2) on jersey color, wired into `subject.py`'s heuristic to down-weight differently-colored runner-up candidates when computing `dominance_margin` — never used to positively assert identity.
- **Jersey-number OCR** (`jersey.py`, new, EasyOCR): a light, non-authoritative signal checked against `players.jersey_number`. Logs a `jersey_signal_conflict` in `result_summary` for audit; never overrides the selected track. `jersey_number` added to the `players` select in `jobs.py`.
- **Calibration deliberately left unchanged** — the user was explicit that pitch-line/homography calibration would fail exactly the users this app targets (grassroots African pitches frequently have no visible markings), so height-based calibration (`calibrate.py`) stays the only method, on purpose, not as a deferred TODO.
- `requirements.txt` gained `scikit-learn==1.9.0` and `easyocr==1.7.2`.

**Verified directly** (see `ai-service/README.md`'s "What was verified directly during development" for full detail): full pipeline re-run end-to-end against existing real-photo/synthetic test clips with no regressions; jersey OCR mechanism confirmed correct on a controlled synthetic digit crop, and the conflict-detection path confirmed to flag a genuine conflict without altering subject selection; team clustering confirmed to run and produce cluster assignments. **Honestly flagged, not hidden**: a synthetic test built specifically to isolate BoT-SORT+ReID's advantage over plain ByteTrack did not show a measurable difference — the existing `track_buffer` window already bridges gaps of that size via motion prediction alone in a 2-source-person synthetic clip. The upgrade is kept because it's a well-documented, zero-cost improvement per the library's own docs, not because this session independently proved a measurable lift with real crowded footage (which nobody in this session could film).

## 6c. Production-readiness hardening (Phase 6) — security, stability, UX, infra config

Triggered by the user's explicit ask to make the app "production ready, ux, security." Done via three parallel research audits (security/RLS, UX/frontend robustness, ops/deployment-readiness) rather than guessing, then a fix pass against the real findings. Full rationale in `now-fancy-balloon.md` ("Phase 6"). Explicitly **out of scope**, flagged not forgotten: deploying `ai-service` anywhere (still local-dev-only, unchanged from Phase 4/5), actual app-store submission (needs the user's own developer accounts), a full WCAG audit, offline-mode banners.

**Security — 4 new migrations** (`20260808140000`–`20260808170000`):
- `players_protected_columns` — a client can no longer self-write `players.overall_rating` (mirrors the existing `scouts.verification_status` self-change-lock trigger pattern exactly), and `profile_completed` can only become `true` when the wizard's actual required fields (`full_name`, `date_of_birth`, `nationality_code`, `primary_position`) are genuinely set — closes a real gap where a raw API call could fake a rating or skip onboarding.
- `messages_update_read_policy` — `messages` had **no UPDATE policy at all**, so `markMessagesRead()` was silently a no-op for every user; added (participant, excluding the sender).
- `profiles_restrict_public_select` — `profiles_select_players_public` granted full-row read (including `phone`) to *any* authenticated user, not just verified scouts; narrowed to `is_verified_scout()`. `player_public_view` (already phone-free) continues to work for general browsing — verified live this doesn't break Discover, since Postgres views run with the view owner's privileges by default, not the caller's (the migration's own old comment claiming the opposite was wrong).
- `videos_storage_path_owned` — a `CHECK` constraint requiring `storage_path` to start with the uploader's own id, closing a low-severity path-collision gap in the `videos_read_ready` storage policy.
- `ai-service`: `POST /process/{job_id}` was fully unauthenticated (compute-cost risk, not a data leak); added a shared-secret bearer-token check (`AI_SERVICE_INTERNAL_TOKEN`, new env var, constant-time comparison).
- All four migrations **live-verified with real spoofed writes** via fresh throwaway test accounts (created through the Admin API — see the incident note below) — confirmed each fix actually blocks what it should and doesn't break what it shouldn't.

**Stability/UX**:
- `src/components/ErrorBoundary.tsx` (new) — no Error Boundary existed anywhere before; a render-time throw white-screened the whole app with no recovery. Wraps `<Stack>` in `_layout.tsx`.
- `src/components/QueryState.tsx` (new) — `useQuery`'s `error` was never read anywhere in the app; a failed fetch rendered identically to "no data yet," with several screens (`(player-tabs)/home.tsx`, `(scout-tabs)/home.tsx`, `notifications.tsx`, both `messages.tsx`) not even checking `isLoading`. One reusable loading/error/empty component, rolled out across **all 15 screens** that use `useQuery`.
- Real self-service account deletion: `supabase/functions/delete-account` (new Edge Function, deployed) verifies the caller's own JWT, then uses service_role internally to clean up Storage (`avatars`/`videos`/`verification-documents`) and call `auth.admin.deleteUser` (cascades through everything via existing FKs). Wired to `settings.tsx`'s Delete Account row behind a real destructive-confirm dialog. **Two real bugs found and fixed while verifying this live**: (1) the function had no CORS headers, so the browser blocked every call before it ever reached the function — added an OPTIONS preflight handler + `Access-Control-Allow-*` on every response; (2) `auth.getUser()` called with no argument reads the client's own in-memory session state, not a manually-attached `Authorization` header (even via `global.headers`) — fixed by extracting the JWT and passing it explicitly as `getUser(jwt)`. Confirmed working end-to-end twice through the real browser UI (login → Settings → Delete Account → confirm → account, profile, and player rows all verified gone from the DB via SQL → redirected to `/welcome`).
- `IconButton` (the shared back/header-action button used on ~17 screens) now requires an `accessibilityLabel` prop — previously optional and unset almost everywhere, so most of the app's back buttons had no screen-reader label at all.
- `verify-email.tsx` had no back button at all; added, matching the pattern used elsewhere.

**Infra config (scaffolding only, no deployment)**:
- `.github/workflows/ci.yml` (new) — runs `tsc --noEmit` + `expo export -p web` on push/PR, the same manual loop documented in §7 below, now automated.
- `app/eas.json` (new) + `app.json` gained `ios.bundleIdentifier`/`buildNumber` and `android.package`/`versionCode` (all previously absent — not store-submittable as-is before this). `extra.eas.projectId` deliberately left unset — needs a real `eas init` run against the user's own Expo account.

**Incident during this pass, caught and fixed**: an earlier raw SQL `insert into auth.users` (for a throwaway test account, before switching to the proper Admin API) briefly broke the project's Auth service **entirely** — every login started failing with `"Database error querying schema"`. Root-caused to the malformed row (missing a matching `auth.identities` row, among other GoTrue-internal expectations a hand-written insert doesn't satisfy), deleted it, confirmed Auth healthy again before continuing. **Lesson applied for the rest of this pass and worth keeping**: always create test accounts via the Auth Admin API (`POST /auth/v1/admin/users` with the service_role key), never by hand-inserting into `auth.users` directly.

## 6d. "Fix all issues" pass (Phase 7) — a second, deeper audit + fixes

Requested after Phase 6, with an explicit ask for a *thorough* re-audit across UI, UX/"easy access", and security — run as three more research passes (this time each one told what Phase 6 already fixed, so they'd surface only new gaps). Findings below, and everything found was fixed and live-verified with real spoofed accounts, not just read from the audit reports.

**Security — 6 new migrations (`20260808180000`–`20260808230000`)**:
- `players` had the *same* over-broad-read bug already fixed once on `profiles` — `players_select_public` granted full-row select (DOB, height, weight, bio, jersey number, every social handle) to any signed-in user, verified live to be real. Narrowed to verified-scouts-only, same pattern as before.
- Storage buckets (`avatars`/`videos`/`verification-documents`) had **no file size or mime-type limits at all** — added (10MB/100MB/20MB, matching what the upload screen's own copy already claimed).
- No policy ever let a player read a *scout's* profile — `messages.tsx` joins scout name/avatar for the player's conversation view, which was silently rendering blank. Added, scoped narrowly to actual conversation participants only (verified both the negative case — blocked with no shared conversation — and the positive case — readable once one exists).
- A scout could set a trial application to `withdrawn`, a status meant to be player-exclusive by the schema's own design. Restricted (verified: shortlist still works, withdraw attempt now correctly 403s).
- `profile_views` had no dedupe — the same viewer could spam-insert unlimited rows against the same profile, directly inflating "3 scouts viewed your profile" / "Profile Views (30d)". Added a one-row-per-viewer-per-profile-per-day unique constraint (generated `viewed_day` column); `profileRepository.logProfileView()` now treats the resulting unique-violation as an expected no-op, not an error.
- `ai-service/requirements.txt`'s unpinned deps (`fastapi`, `uvicorn`, `opencv-python`, `python-dotenv`) pinned to their actually-installed versions.

**UX/"easy access"**:
- Notifications didn't fire for two things the UI already implied they should: a trial invitation (`inviteToTrial()` does a raw INSERT, the existing trigger only fired on status UPDATE) and AI analysis completing/failing. Both wired now (`20260808230000_notification_triggers_invite_and_analysis.sql`), live-verified — including the goalkeeper/skipped-analysis case getting its own honest "processed, not scored" message rather than a fake success.
- Notifications were previously mark-as-read-only — tapping one now deep-links to the real destination by type (`app/notifications.tsx`'s `routeForNotification()`), verified live end-to-end (tapped a trial-invitation notification, landed on the correct real trial detail screen).
- **Pull-to-refresh** added across every list/feed screen that had none: both dashboards, reels, discover, scout players, both messages screens, notifications.
- **Search debounce** (350ms) added to Discover and scout Players — was firing a full query on every keystroke.
- **Sort** (Rating/Name/Age) added to both Discover and scout Players — filtering existed, sorting didn't. `profileRepository.listPlayerPublicViews()` gained a `sortBy` param.
- **"Saved Players"** on the scout dashboard routed to the generic search screen — there was no actual saved-players view anywhere in the app (`listSavedPlayers` was only ever used to compute a count). `(scout-tabs)/players.tsx` now supports `?saved=1`, reusing its existing filter/sort/compare UI against the scout's real saved list, with its own specific empty state. `listPlayerPublicViews()` gained an `ids` filter to support this.
- Messaging: per-bubble timestamps, a Sent/Read indicator on your own messages (the read-tracking already existed from Phase 6's `messages` UPDATE policy, just never surfaced), auto-scroll to the newest message, and a real failure alert when sending fails (was completely silent before — the draft just reappeared with no explanation).
- Photo-library permission denial was a dead end (no path back once `canAskAgain` is `false`); added an "Open Settings" option via `expo-linking`, in both `upload.tsx` and `profile-complete.tsx`.
- Scout verification status was a single static "Pending" label regardless of whether you were actually pending *or rejected* — a rejected scout had no way to know or see why. Now distinguishes the two, shows the real `verification_notes` rejection reason, and `scout-verification.tsx` itself now detects "already submitted, awaiting review" instead of always showing a blank form.

**UI**: `KeyboardAvoidingView` added to every remaining text-input form that lacked it (login, signup, forgot-password, profile-complete, scout-edit-profile). Reel comment avatars now use the same `?? images.avatarMale` fallback pattern as every other avatar in the app. One hardcoded color (`#9CA3AF`) in profile-complete.tsx replaced with the existing `colors.textDisabled` token it was duplicating.

**Verified live** (real spoofed accounts via the Admin API, cleaned up after — see the Phase 6 incident note above for why never raw-SQL): all 6 new RLS/constraint fixes, both new notification triggers (invite + AI complete + AI failed), tappable-notification deep-linking, and the Saved Players flow, all through the real running app in a browser, not just direct API calls.

## 6e. AI engine — Phases B/C/D built, and honestly validated

Phase A (Pace + Physical) was extended to cover 16 of the 18 seeded attributes. Every score is still a transparent formula over real detected data — the standing "no mocked ratings, ever" rule held throughout, and it was verified rather than assumed.

- **Phase B** — `pose.py` (frozen MediaPipe), `positioning.py` (movement-economy proxy + foot-to-ball Ball Control).
- **Phase C** — a real trained classifier. `features.py` extracts engineered kinematics shared by training *and* live inference (structurally preventing train/serve skew); `train_event_classifier.py` produced `pass_drive_classifier.joblib` from 2,067 real SoccerNet clips. Held-out accuracy **62%** (pass precision 0.65, drive 0.60), recorded in `training/reports/event_classifier_metrics.json` and not rounded up anywhere.
- **Phase D** — `vision.py` (scanning frequency, a published methodology), `decision_making.py` (touches-to-release), `defending.py` (ball-recovery frequency, permanently capped at Low confidence by design), plus `goalkeeper.py` covering 7 of 8 GK attributes.
- **Deliberately NOT built**: Shooting (no shot-labelled training data at the time) and GK Sweeping/Rushing Out (needs pitch/goal calibration, which this app deliberately does not do — African grassroots pitches often have no visible markings).

**Validation against real mined amateur clips found real bugs**, all documented in `ai-service/README.md`:

- Vision maxed at 99 from a single sample on short clips (unstable per-minute extrapolation). Fixed with a 30s duration floor; scores went from 99/99/99/99 to a differentiated 13/13/53/40.
- Subject selection picked the wrong person. `select_subject()` had no access to ball position at all — ball detection ran *after* it. Reordered, and ball-proximity added as a fourth signal weighted 0.45 (0.30 was measured to be insufficient on a real clip).
- Three separate too-tight touch radii found across `positioning.py`, `events.py` and `goalkeeper.py`; ball-detector confidence lowered 0.15 → 0.05 after checking the extra detections were coherent rather than noise.
- **Tracking was not deterministic across jobs.** `get_model()` returns a process-lifetime singleton and nothing reset BoT-SORT state between videos, so each job continued from whatever ran before it — three identical calls produced three different track-id sets. Fixed with a per-video reset. A real correctness bug affecting every job after the first.
- The documented "single-worker" assumption was never enforced; three independent entry points could reach `process_job()` concurrently against shared mutable models. Now serialized with an `asyncio.Lock` around the pipeline call only.

**Still true**: the AI service runs **locally only** — no Dockerfile, no deployment. On 7 real clips only 3 produce event-based scores. Pace and Physical are dependable; everything else is provisional and the UI should keep saying so.

---

## 7. Production-readiness audit + the fixes that followed

A full audit (UI, UX, security, accessibility, performance, sessions, auth) benchmarked against competitors and 2026 store/compliance rules rated the app **5.5/10** for production readiness. Engineering quality was strong; product completeness, observability and compliance were not. Work since then, all committed:

**Observability** — Sentry wired (`app/_layout.tsx`), configured deliberately tighter than Sentry's own default snippet because this app handles minors' data: `sendDefaultPii: false`, **no Session Replay** (it records the screen), `tracesSampleRate: 0.2`. `ErrorBoundary` now calls `captureException` — it was catching render crashes and silently swallowing them.

**Performance** — 16 lists migrated to FlashList v2 (which drops `estimatedItemSize` / `windowSize` / `getItemLayout`; v2 sizes automatically). Fixed a real reels defect: `toggleLike` / `toggleSave` closed over `reels`, forcing it into `renderItem`'s dependency list, so a single like re-rendered every mounted video row. `expo-image` caching props added — none were used anywhere.

**Upload** — size is now checked **before** transfer. Supabase only enforced the 100MB cap after the whole file had uploaded, so an oversized clip cost the user their entire data spend and then failed. `quality: 1` was removed: it is an *image* option and a no-op for video, so keeping it implied a compression control that does not exist. Real video compression needs a native module and is not done. `.mov` now keeps its true content type, and a failed row insert cleans up its orphaned storage object.

**Offline** — React Query's online detection uses browser events that do not exist in React Native, so the client believed it was permanently online. `onlineManager` is now driven by NetInfo, keyed on `isInternetReachable` since mobile networks routinely hold a connection that routes nowhere. The query cache is persisted with a **deny-list**: messages, conversations, notifications and verification documents are never written to unencrypted AsyncStorage.

**Activation** — the path to first value was 10–20 minutes against a ~90 second target. Added signed-out browse (`app/browse.tsx`), which needed **no migration** because `player_public_view` was already anon-readable. Anonymous *video* access was in the plan and deliberately dropped: much of this user base is minors. The wizard now offers "Finish later" once step 2 is valid, since the DB invariant only requires four fields, and `ProfileStrength` supplies the pull that replaced the removed push.

**Safety + compliance** — user blocking shipped (an App Store launch blocker), enforced in RLS so a blocked scout can neither open a thread nor send into an existing one, with no policy letting the blocked party discover it. Anti-fraud guidance now appears at the top of scout message threads. An iOS privacy manifest was added with reason codes read from the dependencies' own `PrivacyInfo.xcprivacy` files. Age gate: under-13 refused outright, 13–17 told to involve a guardian.

**Push** — full pipeline, verified end to end. `push_tokens` + `notification_preferences` tables, a `send-push` Edge Function, and a **pg_net trigger** rather than a dashboard webhook, because Supabase's Webhooks UI cannot create hooks on this project (`supabase_functions` schema does not exist — error 3F000). `net.http_post` queues rather than awaits, so push can never delay or roll back a notification insert. Deployed with `--no-verify-jwt` because the gateway otherwise rejects pg_net's call before the function runs; the function does its own auth via the Vault-stored secret.

**Languages** — French, Swahili and Portuguese (`src/i18n/`), chosen by where African football talent actually is. Arabic deliberately excluded until right-to-left layout is supported properly. Applied to the signed-out funnel first; everything else falls back to English per key.

**Two live data bugs found by verification, not code review**: `recalc_player_overall()` was replaced with a position-weighted version but existing `overall_rating` values were never recomputed (a real RB stored 17.50, the flat average, where the weighted formula gives 16.40); and trials-as-news created rows only for *new* trials, leaving both existing trials invisible in the news feed permanently. Both backfilled.

### Known-open, honestly

- AI service still local-only; Shooting and GK Sweeping unbuilt; only 3 of 7 real clips produce event scores.
- Upload progress/cancel deferred — needs a device before rewriting a path five repositories share.
- Leaderboards not built: with one player in the database they would render as a list of one.
- Guardian-consent flow not invented — needs legal input, not just code.
- `player_public_view` is anonymously readable, exposing minors' names, photos, ages and clubs. This predates the current work; flagged as a safeguarding decision for the owner and a lawyer.
- **Nothing is device-verified.** Typecheck and web bundles pass, which proves it compiles — not that it feels right on a phone.

---

## 8. Verification commands (for whoever resumes)

```bash
# Confirm migrations are still in sync
cd matobev && SUPABASE_ACCESS_TOKEN=<pat> supabase migration list --linked

# Regenerate types after any future migration
cd matobev && SUPABASE_ACCESS_TOKEN=<pat> supabase gen types typescript --linked > app/src/lib/database.types.ts

# Type-check + bundle-verify the app after any change
cd app && npx tsc --noEmit && npx expo export -p web && rm -rf dist

# Run the AI service locally (after filling in ai-service/.env)
cd ai-service && .venv\Scripts\Activate.ps1 && uvicorn main:app --reload

# Redeploy the delete-account Edge Function after any change to it
cd matobev && SUPABASE_ACCESS_TOKEN=<pat> supabase functions deploy delete-account --project-ref qefovzbhnmdhbqldtptc

# Redeploy the push sender. --no-verify-jwt is REQUIRED: without it the
# Supabase gateway rejects the pg_net trigger call with
# UNAUTHORIZED_NO_AUTH_HEADER before the function ever runs. The function
# authenticates itself via the Vault-stored x-webhook-secret.
cd matobev && SUPABASE_ACCESS_TOKEN=<pat> supabase functions deploy send-push --project-ref qefovzbhnmdhbqldtptc --no-verify-jwt

# Prove the whole push chain works without a phone: insert a real
# notification, then read pg_net's own response table. Expect HTTP 200 and
# {"skipped":"no registered devices"} until a device registers.
#   insert into public.notifications (profile_id, type, title, body)
#     values (<profile-uuid>, 'test', 'Test', 'body');
#   select status_code, content from net._http_response order by created desc limit 1;

# Build an installable dev APK (needed for push and any real device test)
cd app && npx eas-cli build --profile development --platform android

# If Metro reports a module it can demonstrably resolve, the file-map cache
# is stale after an install -- this is the fix, not a code change:
cd app && npx expo start --clear
```
