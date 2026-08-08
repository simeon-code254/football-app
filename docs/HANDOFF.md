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

**25 migrations**, all written and **pushed live** to the Supabase project (confirmed via `supabase migration list --linked` — local/remote history match exactly, zero drift). Full list in `supabase/migrations/`, roughly in this order:

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

**RLS is live-verified**, not just written — confirmed via the anon key (same path the app uses): seed data readable, unauthenticated writes to `player_attribute_scores`, `video_likes`, `profile_views`, and `scout_verification_documents` are all correctly blocked.

**RN app wiring started but not finished**: `@supabase/supabase-js` + AsyncStorage + url-polyfill installed, `src/lib/supabase.ts` client module exists, `.env`/`.env.example` in place. **No screen actually calls Supabase yet** — everything still runs on `src/data/mockPlayers.ts`/`mockTrials.ts` and the Zustand store's manual role toggle. This is the next phase (see §5).

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

## 5. Next phase: backend wiring (already planned, not started)

Full step-by-step plan lives in `C:\Users\Admin\.claude\plans\now-fancy-balloon.md` on this machine (local Claude Code plan file, not in the repo) — Section 6 "Build sequence mapped to screens." Summary:

1. Auth + Profiles — `signup.tsx`/`login.tsx`/`verify-email.tsx`/`profile-complete.tsx`/`role-select.tsx` call real `supabase.auth.signUp`/`signInWithPassword`; delete Login's role toggle.
2. Attributes (read-only) — AI Ratings/AI Analysis tabs query real (empty) data.
3. Videos + Storage — `upload.tsx` does a real upload.
4. Retire mock player data — Discover/Players/Home query `player_public_view`.
5. Trials — real CRUD (once §4.1 above closes the player-side gap).
6. Saved Players + Scouting Preferences — real persistence.
7. Messaging — real `conversations`/`messages` + Realtime.
8. Notifications — real data + Realtime (once §4.2 above exists).

Build `src/repositories/*.ts` as the only layer that imports `src/lib/supabase.ts` — screens never call Supabase directly, same principle used throughout.

---

## 6. Verification commands (for whoever resumes)

```bash
# Confirm migrations are still in sync
cd matobev && SUPABASE_ACCESS_TOKEN=<pat> supabase migration list --linked

# Type-check + bundle-verify the app after any change
cd app && npx tsc --noEmit && npx expo export -p web && rm -rf dist
```
