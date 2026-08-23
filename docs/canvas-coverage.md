# Canvas coverage — 87 screens

Source of truth: `docs/design-handoff/matobev-mobile-app-flow/project/Matobev.dc.html`
(22 Aug 2026, 87 screens). See `app/src/theme/canvas.ts` for the porting rule.

Three states, and the distinction matters:

- **Built** — written or rebuilt against the current canvas.
- **Routed, not rebuilt** — a working screen exists, but it predates this canvas
  and still carries the older 23-screen design. It functions; it does not match.
- **Absent** — no screen.

Everything below is verified against the working tree, not assumed.

## Built (52)

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
| 24 | Compare | `app/compare.tsx` |
| 33 | Settings | `app/settings.tsx` |
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

## Routed, not rebuilt (27)

These work. They are still on the pre-canvas design and are the remaining
visual debt: 07, 13, 22, 25, 26, 28, 29, 31, 32, 34, 35, 57, 59, 61–69, 72, 79.

Notable ones: `13 Reels` and `22 Scout search` are the highest-traffic
remaining, and the settings detail screens (63–67) are still the old design
even though the hub above them (33) is not.

## Absent (4)

| # | Screen | Why |
|---|---|---|
| 47 | Scout path · organisation | Scout signup collects org at 05; the canvas's dedicated step is not built |
| 48 | Scout path · ID check | Partially covered by `app/scout-verification.tsx`, not rebuilt |
| 56 / 58 | Full-screen trial / news alerts | `NewsPopup` is adjacent but is not these |
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

Two further deviations are ergonomic rather than evidential: touch targets keep
platform sizes instead of scaling (rule 5 in `theme/canvas.ts`), and the
`AttributeBar` track uses the warm `colors.track` rather than the canvas's one
cool-grey outlier.

## Blocked on decisions

- **Billing** — `billingRepository` throws `NotWiredError` on every call. No
  provider is configured. Canvas 82 names M-Pesa first, which settles the
  design but not the integration.
- **OTP** — screen 06 needs `{{ .Token }}` in the Supabase "Confirm signup"
  template. Until then the link path carries the flow.
- **Selfie check** (81) — no identity provider connected.
