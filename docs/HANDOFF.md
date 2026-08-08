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

**28 migrations**, all written and **pushed live** to the Supabase project (confirmed via `supabase migration list --linked` — local/remote history match exactly, zero drift). Full list in `supabase/migrations/`, roughly in this order:

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
- Service role key: known, never written to any file — treat as a secret, use only via env var when actually needed
- Supabase Personal Access Token: used once for CLI auth this session (not stored anywhere persistent — `supabase link` state is what persists, in `supabase/.temp` locally, gitignored)

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

## 7. Verification commands (for whoever resumes)

```bash
# Confirm migrations are still in sync
cd matobev && SUPABASE_ACCESS_TOKEN=<pat> supabase migration list --linked

# Regenerate types after any future migration
cd matobev && SUPABASE_ACCESS_TOKEN=<pat> supabase gen types typescript --linked > app/src/lib/database.types.ts

# Type-check + bundle-verify the app after any change
cd app && npx tsc --noEmit && npx expo export -p web && rm -rf dist

# Run the AI service locally (after filling in ai-service/.env)
cd ai-service && .venv\Scripts\Activate.ps1 && uvicorn main:app --reload
```
