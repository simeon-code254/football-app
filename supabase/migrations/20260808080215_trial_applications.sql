-- Player applications to a trial. Two separate UPDATE policies below since
-- players and scouts are allowed different status transitions on the same
-- row (player: only withdraw their own; scout: manage any status on trials
-- they own) — a single shared policy can't express that asymmetry cleanly.

create table public.trial_applications (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','shortlisted','accepted','rejected','withdrawn')),
  applied_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now(),
  unique (trial_id, player_id)
);

-- Prevent an UPDATE (status change) from also reassigning the row to a
-- different trial/player, and keep status_updated_at honest.
create or replace function public.lock_application_identity()
returns trigger language plpgsql as $$
begin
  if new.trial_id <> old.trial_id or new.player_id <> old.player_id then
    raise exception 'trial_id/player_id cannot be changed on an existing application';
  end if;
  if new.status <> old.status then
    new.status_updated_at = now();
  end if;
  return new;
end;
$$;

create trigger trial_applications_lock_identity
  before update on public.trial_applications
  for each row execute function public.lock_application_identity();

alter table public.trial_applications enable row level security;

create policy applications_select on public.trial_applications for select
  using (
    player_id = auth.uid()
    or exists (select 1 from public.trials t where t.id = trial_id and t.scout_id = auth.uid())
  );
create policy applications_insert_player on public.trial_applications for insert
  with check (
    player_id = auth.uid()
    and exists (select 1 from public.trials t where t.id = trial_id and t.status = 'open')
  );
create policy applications_update_player_withdraw on public.trial_applications for update
  using (player_id = auth.uid() and status = 'pending')
  with check (player_id = auth.uid() and status = 'withdrawn');
create policy applications_update_scout on public.trial_applications for update
  using (exists (select 1 from public.trials t where t.id = trial_id and t.scout_id = auth.uid()))
  with check (exists (select 1 from public.trials t where t.id = trial_id and t.scout_id = auth.uid()));
create policy applications_delete_own_pending on public.trial_applications for delete
  using (player_id = auth.uid() and status = 'pending');
