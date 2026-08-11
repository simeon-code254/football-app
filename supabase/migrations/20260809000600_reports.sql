-- Content-report table. Nothing in the mobile app can create a row here yet
-- (no "Report" button exists anywhere) -- this ships the real schema/RLS
-- and an admin review queue now, honestly empty until that mobile-side
-- entry point is built later. target_id is intentionally not a foreign key
-- (target_type decides which table it points into: video/profile/message).
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('video', 'profile', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create index reports_status_idx on public.reports (status, created_at);

alter table public.reports enable row level security;

create policy reports_insert_own on public.reports for insert
  with check (reporter_id = auth.uid());
create policy reports_select_own on public.reports for select
  using (reporter_id = auth.uid());
create policy reports_select_admin on public.reports for select
  using (public.is_admin());
create policy reports_update_admin on public.reports for update
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.stamp_report_resolution()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status and old.status = 'open' and new.status in ('resolved', 'dismissed') then
    new.resolved_at = now();
    new.resolved_by = auth.uid();
  end if;
  return new;
end;
$$;

create trigger reports_stamp_resolution
  before update on public.reports
  for each row execute function public.stamp_report_resolution();
