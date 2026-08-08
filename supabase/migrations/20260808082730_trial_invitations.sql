-- The original scout workflow (DISCOVER -> ... -> INVITE TO TRIAL -> REVIEW
-- APPLICATION -> ...) has a scout-initiated path distinct from a player
-- browsing and applying themself. The existing trial_applications insert
-- policy only allowed player-initiated rows; this adds the scout-invite path
-- alongside it without changing the existing player-apply behavior.

alter table public.trial_applications
  add column source text not null default 'applied' check (source in ('applied','invited')),
  add column invited_by_scout_id uuid references public.scouts(id);

create policy applications_insert_scout_invite on public.trial_applications for insert
  with check (
    source = 'invited'
    and invited_by_scout_id = auth.uid()
    and exists (select 1 from public.trials t where t.id = trial_id and t.scout_id = auth.uid())
  );

-- Multiple permissive INSERT policies are OR'd together in Postgres RLS, so
-- the original applications_insert_player policy (which doesn't know about
-- `source`/`invited_by_scout_id`) would otherwise let a player set those new
-- columns to misleading values while still satisfying its own check. Redefine
-- it now that the columns exist, closing that gap.
drop policy if exists applications_insert_player on public.trial_applications;
create policy applications_insert_player on public.trial_applications for insert
  with check (
    player_id = auth.uid()
    and source = 'applied'
    and invited_by_scout_id is null
    and exists (select 1 from public.trials t where t.id = trial_id and t.status = 'open')
  );
