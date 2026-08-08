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
| Verify Email | `verify-email.tsx` | Done — branches: player → Profile Complete, scout → straight to Scout Dashboard. **"Resend" link is dead** (see §4) |
| Profile Complete | `profile-complete.tsx` | Done — 4-step wizard (Personal → Football Info → Bio → Social), player-only |
| Login | `login.tsx` | Done, but has a **temporary "Continue as Player/Scout" toggle** standing in for real post-auth role routing — delete this when wiring auth. **"Forgot Password?" link is dead** (see §4) |

### Player tabs — `(player-tabs)/`
| Screen | File | Status |
|---|---|---|
| Home | `home.tsx` | Done — rating card, quick actions, Trials Near You (cards, **not tappable**), Recent Activity |
| Reels | `reels.tsx` | Done UI — like/comment/share/save icons with counts (now backed by real tables), but **single static video, no swipe feed, no comment thread** |
| Upload | `upload.tsx` | Done — Highlight/AI-Analysis toggle, title/description/match/opponent/tags form |
| Discover | `discover.tsx` | Done — search, position-chip filters, trending list |
| Profile | `profile.tsx` | Done — About/Videos/AI Ratings/Stats tabs + **Settings section (just added)** |

### Scout tabs — `(scout-tabs)/`
| Screen | File | Status |
|---|---|---|
| Home (Scout Dashboard) | `home.tsx` | Done — verification banner (now wired to `/scout-verification`), global search, quick actions, scouting overview, Recommended For You (with match-reason), Recently Uploaded, Top Performers leaderboard, Active Trials |
| Players (Discover) | `players.tsx` | Done — real filter bottom sheet (position, age range, min overall, country, foot) |
| Trials | `trials.tsx` | Done — list + Create Trial modal form |
| Messages | `messages.tsx` | Done UI — conversation list + thread, verification-gated |
| Profile | `profile.tsx` | Done — bio/org/positions/activity, Settings list, working Scouting Preferences form, **verification CTA (just added)** |

### Dynamic routes
| Screen | File | Status |
|---|---|---|
| Player Details | `player/[id].tsx` | Done — Overview/AI Analysis (confidence-annotated attributes)/Videos tabs, Save-to-folder, private Scout Notes, **Invite to Trial (just added)** |
| Trial Detail | `trial/[id].tsx` | Done — applicant status tabs (pending/shortlisted/accepted/rejected), bulk select + actions |
| Scout Verification | `scout-verification.tsx` | **Just added** — document upload flow (ID, proof of organization, optional certification) via `expo-document-picker`; submission itself is stubbed pending backend wiring |

### Shared components — `src/components/`
`PrimaryButton`, `SecondaryButton`, `IconButton` (has a `light` variant for photo headers), `AppTextField` (has `isPassword` for show/hide toggle), `SelectField` (modal picker), `TypeaheadField` (type-ahead combobox, used for Africa-only nationality), `Checkbox`, `RatingBadge`, `PlayerCard`, `ScoutPlayerCard` (the signature FIFA-card-style scout view), `Logo` (color/white variants from the uploaded mark).

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

## 4. Recommended: UI screens/fixes to build *before* resuming backend wiring

Wiring screens to real data is much cheaper if the screens and navigation are already complete — otherwise you end up wiring something, then immediately reshaping it. In priority order:

1. **Player Trials screen — the single biggest gap.** There is currently **no way for a player to browse or apply to a trial anywhere in the app.** Home's "Trials Near You" cards aren't tappable. Scouts can create trials and invite players, but a player can't independently discover and apply to one. Needs: a Trials tab or a screen reachable from Home, listing open trials (reuse `trials` schema + `trial_applications` insert-as-player path, already fully supported by RLS), with an Apply action and a way to see application status (My Applications).

2. **Notifications screen.** The bell icon exists on both dashboards with a static badge, but tapping it goes nowhere — there's no list screen. The `notifications` table + Realtime are ready; this is a pure UI gap.

3. **Forgot Password flow.** `login.tsx`'s "Forgot Password?" is dead text. Needs a screen (email input → Supabase's `resetPasswordForEmail`) — small, but blocks a real auth flow from being complete.

4. **Wire "Resend" on Verify Email** — currently dead text, same screen, needs a loading/success state once connected to `supabase.auth.resend()`.

5. **Message button should open a specific conversation, not the generic tab.** `player/[id].tsx`'s Message button currently just navigates to `/(scout-tabs)/messages` (the conversation list) instead of directly into a thread with that player. Small fix, but matters for the UX to make sense once real.

6. **Reels needs to actually be a feed.** Right now it's one static video with no scroll/swipe between clips, and no comment-thread UI (comment count shows, but there's no screen to read or write comments — `video_comments` table is ready). Doesn't have to be perfect, but "swipe to next video" and a basic comment sheet are expected Reels behavior.

7. **Edit Profile.** `profile-complete.tsx` is a one-time wizard; there's no way to edit profile fields afterward. Either make that wizard re-enterable in an "edit" mode, or build a dedicated Edit Profile screen.

8. **Compare Players** — named in the original scout spec, never built. Lower priority than the above; needs a multi-select-from-list + side-by-side attribute view. No new schema needed, purely UI.

**Not recommended to build yet**: an in-app Admin UI (deliberately out of scope — separate web dashboard was the architecture decision, and `admins` table has zero policies for `authenticated`/`anon` by design), Google/Apple social auth buttons (decorative, fine to leave until real auth priorities settle), skeleton/loading/error states (worth doing, but naturally falls out of the wiring work itself rather than needing to precede it).

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
