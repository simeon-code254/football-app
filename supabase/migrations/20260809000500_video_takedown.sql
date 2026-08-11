-- Video takedown, admin-only. Real enforcement today: a removed video
-- disappears from videos_select_ready_public (every non-owner's read path)
-- immediately, plus the underlying storage objects (source + thumbnail)
-- stop being readable too -- closes the gap a table-only flag would leave
-- (someone with a cached signed URL could otherwise still fetch the file).
alter table public.videos
  add column is_removed boolean not null default false,
  add column removed_reason text,
  add column removed_at timestamptz,
  add column removed_by uuid references public.profiles(id);

create or replace function public.stamp_video_removal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_removed <> old.is_removed then
    if new.is_removed = true then
      new.removed_at = now();
      new.removed_by = auth.uid();
    else
      new.removed_at = null;
      new.removed_by = null;
      new.removed_reason = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger videos_stamp_removal
  before update on public.videos
  for each row execute function public.stamp_video_removal();

create policy videos_update_admin on public.videos for update
  using (public.is_admin()) with check (public.is_admin());

drop policy videos_select_ready_public on public.videos;
create policy videos_select_ready_public on public.videos for select
  to authenticated using (status = 'ready' and not is_removed);

drop policy videos_read_ready on storage.objects;
create policy videos_read_ready on storage.objects for select to authenticated
  using (
    bucket_id = 'videos'
    and exists (
      select 1 from public.videos v
      where v.storage_path = name and v.status = 'ready' and not v.is_removed
    )
  );

drop policy videos_thumbnail_read_ready on storage.objects;
create policy videos_thumbnail_read_ready on storage.objects for select to authenticated
  using (
    bucket_id = 'videos'
    and exists (
      select 1 from public.videos v
      where v.thumbnail_path = name and v.status = 'ready' and not v.is_removed
    )
  );
