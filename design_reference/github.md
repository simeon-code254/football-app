repo: simeon-code254/football-app
branch: main
path: docs/design-handoff/matobev-mobile-app-flow/project/

## Last sync
date: 2026-08-20T16:14:00Z

### Updated in this project
- Rebuilt the 23-screen flow on the report's navy/gold palette
- Recolored the existing Matobev logo (gold-on-navy via CSS mask) — silhouette preserved
- Reworked rating reveal, streak, and view-alert motion for retention
- Added a canvas overview: 4-across iOS grid with tap-to-zoom

## Screen map
| Project screen | Repo files |
| --- | --- |
| Splash, Welcome, Onboarding, Browse (signed-out) | app/app/index.tsx, welcome.tsx, onboarding.tsx, browse.tsx |
| Sign up, Login, Verify email, Profile completion, Role select | app/app/signup.tsx, login.tsx, verify-email.tsx, profile-complete.tsx, role-select.tsx |
| Player home, Reels, Upload, Discover, Player profile | app/app/(player-tabs)/ |
| Rating reveal, AI ratings, Leaderboard | app/app/ai-ratings.tsx, leaderboard.tsx |
| Scout dashboard, Search, Trials, Messages, Scout profile | app/app/(scout-tabs)/, app/app/trials.tsx, messages.tsx |
| Player detail, Compare | app/app/compare.tsx, app/src/repositories/players/* |
| Guardian consent | app/app/guardian-consent.tsx |
| Notifications, Notification settings | app/app/notifications.tsx, notification-settings.tsx |
| Settings hub, Log out | app/app/settings.tsx |
