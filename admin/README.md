# Matobev Admin

Internal admin dashboard for the Matobev app: scout verification review, user/video/trial browsing, content
moderation, and AI pipeline health. Next.js 14 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, talking to
the same Supabase project (`qefovzbhnmdhbqldtptc`) as the mobile app.

## Security model

This app has **no service_role key anywhere**. It authenticates as a real logged-in Supabase Auth user and
relies entirely on Row Level Security policies gated by the `is_admin()` function (`profiles.role = 'admin'`)
— the same trust model as the mobile app, just with an admin-role account. Never add
`SUPABASE_SERVICE_ROLE_KEY` to this project; a browser-bundled app has no legitimate use for it.

Every mutating server action (`app/actions/*.ts`) also calls `assertAdmin()` before touching the database —
RLS is the real enforcement either way, but this gives a clean "Not authorized" instead of a raw Postgres
error surfacing to a non-admin who somehow calls the action directly.

Security headers (CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) are set in
`next.config.mjs`.

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same value as
   `app/.env`'s `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
3. Apply the migrations this app depends on (`supabase/migrations/20260809000000_players_select_admin.sql`
   through `20260809000600_reports.sql`) via `supabase db push` from the repo root.
4. **Promote your own account to admin** (no self-serve flow, by design — `role` is immutable through the
   client). Run once in the Supabase SQL editor against an existing signed-up account:
   ```sql
   alter table public.profiles disable trigger profiles_role_immutable;
   update profiles set role = 'admin' where id = '<your-auth-user-uuid>';
   alter table public.profiles enable trigger profiles_role_immutable;
   ```
   (The trigger has to be disabled for this one write — it fires for every writer, including the SQL editor,
   not just RLS-gated clients.)
5. `npm run dev`, sign in at `/login` with that account's email/password.

## What's real vs. read-only

- **Scout Verification**: full approve/reject, uses the pre-existing `scouts_update_admin` policy.
- **Users**: browse/search, plus **Suspend/Reactivate** (real, see Moderation below).
- **Videos**: browse/search including non-ready ones, plus **Remove/Restore** (real, see Moderation below).
- **Reports**: review queue for user-submitted content reports, with Resolve/Dismiss. Honestly empty until the
  mobile app has a "Report" button — nothing today can create a row here. Built now anyway so the admin side
  is ready the moment that mobile entry point exists.
- **AI Pipeline**: one write action, requeuing a `failed` job back to `queued`. Pickup happens on
  `ai-service`'s next poll cycle (`POLL_INTERVAL_SECONDS`, default 120s) — its realtime listener only
  subscribes to `INSERT`, not `UPDATE`, so a requeue is not instant.
- **Trials**: read-only browse, no new policies needed (`trials_select_all` was already open).

## Moderation — what's actually enforced today

Suspend/ban and video takedown are **real RLS enforcement, not decorative flags**, even though no mobile-app
code was touched to build them:

- **Suspending an account** (`profiles.is_active = false`) immediately hides a suspended player from
  `players_select_verified_scouts` (scout browsing/Discover) and a suspended scout from `scouts_select_public`
  (player-facing discovery/messaging) — both re-checked live on every read via RLS.
- **Removing a video** (`videos.is_removed = true`) immediately hides it from `videos_select_ready_public`
  (every non-owner's read path) *and* revokes storage access to both the source file and thumbnail, so a
  cached signed URL stops working too.

**What this does *not* yet do**: block a suspended user's own writes (they can still upload/message/apply to
trials — RLS on those insert/update policies isn't touched), or show a suspended/removed-content author a
friendly explanation instead of a raw error. Closing that needs policy-by-policy work across several more
tables plus mobile UI copy — deliberately left for when the mobile app is back in scope, rather than rushed
here.

## Phase 2 items still fully deferred

- **Mobile "Report" button** — the only thing standing between the Reports queue and real data.
- **Write-blocking for suspended accounts** — RLS updates across videos/messages/trials/trial_applications
  insert policies.
- **User-facing suspension/removal messaging** in the mobile app (currently just a generic RLS error if they
  hit a blocked path at all, which today they mostly won't since writes aren't blocked yet).
- **Deploying this app anywhere** (Vercel or otherwise) — local dev only for now.

## Known gaps this app fixed for the whole product, not just itself

- `videos_read_ready`'s storage policy only ever covered the exact source-file path
  (`{player_id}/{video_id}/source.mp4`), never the sibling thumbnail (`thumb.jpg`) — so *no* signed-in user,
  admin or otherwise, could ever load another player's video thumbnail, even a `ready` one.
  `20260809000300_video_thumbnail_public_read.sql` closed this for everyone (e.g. scout home's "Recently
  Uploaded" section).
- Both video storage policies (`videos_read_ready`, `videos_thumbnail_read_ready`) now also check
  `not is_removed`, so a removed video's files stop being fetchable even via an already-cached signed URL —
  not just hidden at the table-row level.
