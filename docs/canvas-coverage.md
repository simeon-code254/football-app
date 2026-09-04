# Canvas coverage — 87 screens

Source of truth: `docs/design-handoff/matobev-mobile-app-flow/project/Matobev.dc.html`
(22 Aug 2026, 87 screens). See `app/src/theme/canvas.ts` for the porting rule.

Three states, and the distinction matters:

- **Built** — written or rebuilt against the current canvas.
- **Routed, not rebuilt** — a working screen exists, but it predates this canvas
  and still carries the older 23-screen design. It functions; it does not match.
- **Absent** — no screen.

Everything below is verified against the working tree, not assumed.

## Built (78)

| # | Screen | Where |
|---|---|---|
| 01 | Splash | `app/index.tsx` |
| 02 | Welcome | `app/welcome.tsx` |
| 03 | Role selection | `app/role-select.tsx` |
| 04 | Browse (signed out) | `app/browse.tsx` |
| 05 | Sign up | `app/signup.tsx` (three-role rework) |
| 06 | Verify email | `app/verify-email.tsx` |
| 08 | Guardian consent | `app/guardian-consent.tsx` |
| 09 | Onboarding | `app/onboarding.tsx` |
| 10 | Player home | `app/(player-tabs)/home.tsx` |
| 11 | Rating reveal | `src/components/RatingReveal.tsx` |
| 15 | Upload · success | `app/upload-success.tsx` |
| 16 | Leaderboard | `app/leaderboard.tsx` |
| 17 | Player profile | `app/(player-tabs)/profile.tsx` |
| 18 | Trials | `app/trials.tsx` |
| 19 | Messages | `app/messages.tsx` |
| 20 | Notifications | `app/notifications.tsx` |
| 21 | Scout home | `app/(scout-tabs)/home.tsx` |
| 12 | AI ratings · FIFA attrs | `app/ai-ratings.tsx` |
| 14 | Upload | `app/(player-tabs)/upload.tsx` |
| 23 | Player detail | `app/player/[id].tsx` (disclaimer only) |
| 07 | Profile completion | `app/profile-complete.tsx` |
| 13 | Reels | `app/(player-tabs)/reels.tsx` (overlay chrome) |
| 22 | Scout search | `app/(scout-tabs)/players.tsx` |
| 24 | Compare | `app/compare.tsx` |
| 25 | Scout verification | `app/scout-verification.tsx` |
| 32 | Notification settings | `app/notification-settings.tsx` |
| 33 | Settings | `app/settings.tsx` |
| 47 | Scout path · organisation | `app/scout-onboarding.tsx` |
| 48 | Scout path · ID check | `app/scout-verification.tsx` |
| 56 / 58 | Full-screen trial / news alert | `src/components/FullScreenAlert.tsx` |
| 57 | Trial detail | `app/trial/[id].tsx` |
| 59 | News feed | `app/news.tsx` |
| 61 | Player edit profile | `app/profile-complete.tsx` (edit mode) |
| 62 | Scout edit profile | `app/scout-edit-profile.tsx` |
| 63 | Settings · account | `app/account-settings.tsx` |
| 64 | Settings · security | `app/security-settings.tsx` |
| 65 | Settings · blocked | `app/blocked-accounts.tsx` |
| 66 | Settings · language | `app/language-settings.tsx` |
| 67 | Settings · help & legal | `app/help-settings.tsx` |
| 68 | Forgot password | `app/forgot-password.tsx` |
| 72 | Search filters | `app/(scout-tabs)/players.tsx` |
| 79 | Permissions primer | `src/components/PushPrimer.tsx` |
| 39 | Empty · search | `app/(scout-tabs)/players.tsx` |
| 40 | Empty · messages | `app/messages.tsx` |
| 27 / 50 | Club home / dashboard | `app/(club-tabs)/home.tsx` |
| 30 | Trial posting | `app/trial-post.tsx` |
| 36 | 404 | `app/+not-found.tsx` |
| 37 | No connection | `app/no-connection.tsx` |
| 38 | Server error | `app/server-error.tsx` |
| 41 | Payment success | `app/payment-success.tsx` |
| 42 | Deep link · trial | `app/invite/[token].tsx` |
| 43 | Deep link · expired | `app/link-expired.tsx` |
| 44 | Deep link · shared profile | `app/p/[id].tsx` |
| 45 | Maintenance | `app/maintenance.tsx` |
| 46 | Player path · position | `src/components/PositionPicker.tsx` |
| 49 | Club path · details | `app/club-onboarding.tsx` |
| 51 | Club applicants | `app/club-applicants/[trialId].tsx` |
| 52 | Applicant review | `app/applicant/[applicationId].tsx` |
| 53 | Club team | `app/(club-tabs)/team.tsx` |
| 54 | Club profile (public) | `app/club/[id].tsx` |
| 55 | Club edit profile | `app/(club-tabs)/profile.tsx` |
| 60 | News article | `app/news/[id].tsx` |
| 70 | Analysis in progress | `app/analysis-progress.tsx` |
| 71 | Rating history | `app/rating-history.tsx` |
| 73 | Scout shortlist | `app/shortlist.tsx` |
| 74 | Scout profile (public) | `app/scout/[id].tsx` |
| 75 | Report account | `src/components/ReportModal.tsx` |
| 76 | Trial applied · success | `app/trial-applied.tsx` |
| 78 | Milestones | `app/milestones.tsx` |
| 80 | The verification badge | `app/verification-badge.tsx` |
| 81 | Player verification | `app/player-verification.tsx` |
| 82 | Verification payment | `app/checkout.tsx` |
| 83 / 84 | Scout tiers / club plans | `app/premium.tsx` |
| 85 | Billing history | `app/billing.tsx` |
| 86 | Verification pending | `app/verification-pending.tsx` |
| 87 | Verification rejected | `app/verification-rejected.tsx` |

Plus a login screen the canvas never drew (it offers "Sign in" on 02 and a
forgotten-password flow on 68, but no sign-in form), designed from the canvas's
own vocabulary.

## Covered by another surface (5)

Not separate screens here, and deliberately so:

- `26 Scout premium`, `28 Club verification fee`, `29 Verification badge detail`
  — covered in substance by `premium.tsx`, `checkout.tsx` and
  `verification-badge.tsx`. The canvas draws them as three screens; the same
  content lives on one screen each in the app because the tier lists and the
  checkout are shared between scout and club.
- `34 Log out` — the shared confirm alert (`GlobalAlert`).
- `35 Session expired` — `StatusScreen`, fired by the root layout when an
  unflagged SIGNED_OUT arrives.
- `69 Chat conversation` — the thread inside `messages.tsx`, not its own route.

`13 Reels` keeps its black ground on purpose: it is a full-bleed video surface
and paper behind a player would be wrong. Its overlay chrome is ported.

## Absent (2)

| # | Screen | Why |
|---|---|---|
| 31 | Lock screen push | **Not an app screen.** It is the OS notification shade. The payload behind it is real (`send-push` Edge Function); the rendering is Android's. |
| 77 | Guardian approval (guardian's view) | **Not an app screen.** The guardian has no app — this is the public page served by `supabase/functions/guardian-consent`. Its design should be updated there, not here. |

## Where the canvas was deliberately not followed

Every case is the same shape: the canvas asserts a number the database cannot
produce. Each is commented at the site.

| Canvas says | Reality |
|---|---|
| `🔥 4` streak (10, 15, 78) | Nothing counts consecutive days |
| `ANALYSING · STEP 2 OF 4`, bar at 34% (15, 70) | Jobs record only `queued/processing/completed/failed` |
| "lands in about two minutes" (15) | Worker polls on a 120s interval before claiming the job |
| `SIGNED 7`, `FOLLOWERS 4.1k` (54) | No signing event, no club follows |
| `SIGNED 11`, `REPLY RATE 92%` (74) | No signing event, no response tracking |
| Per-attribute deltas `68→81` (71) | `player_rating_snapshots` stores overall only |
| "Players who post monthly gain twice as fast" (71) | Unmeasured causal claim about our own data |
| Bare attribute numbers (12) | Confidence label added — a 0–99 on the FIFA scale is a verdict |
| Entry fee field (30) | Locked free, structurally: no fee column exists |
| "Verified scouts get replies 4× more often" (47) | Nothing measures reply rate |
| "FULLY TRANSLATED" as static text (66) | Measured against English, nested keys walked |
| Hardcoded build "2.4.1" (67) | Read from expo-constants, or it drifts on first ship |
| Role row with a chevron (63) | `prevent_role_change` is a trigger; roles are fixed at signup |

One further deviation is ergonomic rather than evidential: touch targets keep
platform sizes instead of scaling (rule 5 in `theme/canvas.ts`).

## The 28 Aug 2026 canvas: what changed beyond colour

Diffing the live canvas against the 22 Aug copy, with colour normalised out,
found **six screens with copy changes** and two new sub-screens. The rest of the
markup churn is the design-system swap (radii, borders), not design intent.

| Screen | Change | Status |
|---|---|---|
| 20 Notifications | Grouped under TODAY / EARLIER | **Built** |
| 18 Trials | Segmented NEARBY / MY POSITION / SAVED | **Partly built** — see below |
| 10 Player home | 6-attribute grid in the identity card; "Nearby trials for you" card | Not built |
| 17 Player profile | `SO RB · 78` relabelled `OVR 78 RB` | Not built |
| 05B Log in | **New sub-screen** the canvas never drew before | Not built |
| 20B Push notification | **New sub-screen** (lock screen) | Not an app screen — the OS draws it |

Two of Trials' three new segments have nothing behind them, so only one shipped:

| Segment | Verdict |
|---|---|
| MY POSITION | **Built.** `trials.positions` is a real column and players carry a primary and secondary position. |
| NEARBY | `trials.location` is free text with no coordinates anywhere in the schema. "Nearby" would be a string match dressed as proximity. |
| SAVED | No saved/bookmark table exists. |

Screen 05B also draws a **"Continue with Google"** button. There is no Google
OAuth provider configured in Supabase and no native sign-in module in the app, so
that button would be decoration that fails on tap. It needs a decision before it
is worth building.

**Coverage caveat:** the live canvas was read through an API that caps at
256 KiB against a ~304 KB file, so this diff covers screens 01–72 only. Anything
that changed in **73–87** — including 80, the verification-badge explainer — is
unexamined. Export the zip to close that gap.

## The 28 Aug 2026 re-skin

The canvas was re-skinned off navy/gold onto the `_ds/` "Industry" palette, and
the app followed. Every canvas token kept its **name** and changed its value, so
`--gold` now holds the blue `#1B66C4`. Read `src/theme/colors.ts` before
touching colour anywhere — two rules inverted with the swap:

- **Gold-on-light reversed.** The old `#FFC53D` was 1.58:1 on white and could
  never sit on a light surface. The new accent is 5.01:1 on paper and 2.50:1 on
  navy — the opposite constraint. Four components branched on the old rule
  (`RatingRing`, `PlayerRatingCard`, `AttributeBar`, `RatingHistory`); all four
  collapsed to a single theme-aware token.
- **Gold and steel collapsed** into one value, so "gold means achievement and
  nothing else" no longer holds in the source.

Three things do not come from the canvas, and each is deliberate:

| Token | Why |
|---|---|
| `textMuted` `#5d5d60` | Canvas `--muted` is 3.82:1 on paper, under AA |
| `success` / `error` | Canvas values are 3.82:1 / 4.41:1 on `surfaceMuted`, under AA |
| `warningTint` + `warning` | No amber survives the re-skin, and a blue warning is indistinguishable from an info notice |

The icon set was repainted from the same mapping (`#FFC53D` → `#b5d9fd`,
`#0A1B33` → `#1d2d3d`), preserving each file's alpha edge. While doing it,
`android-icon-background.png` turned out to be **solid white**, which had been
putting the mark at 1.58:1 in the Android launcher — the exact pairing the theme
file warns about. It is now the field colour, matching `adaptiveIcon.backgroundColor`.

## Blocked on decisions

- **Billing** — `billingRepository` throws `NotWiredError` on every call. No
  provider is configured. Canvas 82 names M-Pesa first, which settles the
  design but not the integration.
- **OTP** — screen 06 needs `{{ .Token }}` in the Supabase "Confirm signup"
  template. Until then the link path carries the flow.
- **Selfie check** (81) — no identity provider connected.
