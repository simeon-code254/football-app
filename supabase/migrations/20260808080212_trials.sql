-- Scout-created recruitment opportunities. Insert requires is_verified_scout()
-- — matches the RN Trials screen's "Verification required before creating
-- public trials" banner and disabled Create button exactly, enforced at the
-- DB layer too (defense in depth).

create table public.trials (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  title text not null,
  club text not null,
  location text not null,
  age_min smallint,
  age_max smallint,
  positions position_code[] not null default '{}',
  trial_date date not null,
  application_deadline date not null,
  description text,
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trials_set_updated_at
  before update on public.trials
  for each row execute function public.set_updated_at();

alter table public.trials enable row level security;

create policy trials_select_all on public.trials
  for select to authenticated using (true);
create policy trials_insert_own_verified on public.trials for insert
  with check (scout_id = auth.uid() and public.is_verified_scout());
create policy trials_update_own on public.trials for update
  using (scout_id = auth.uid());
create policy trials_delete_own on public.trials for delete
  using (scout_id = auth.uid());
