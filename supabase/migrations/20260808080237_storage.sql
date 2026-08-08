-- Buckets are created here (in a migration), not via the dashboard, so they
-- stay in version control instead of drifting.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- avatars: path convention {profile_id}/avatar.jpg — public read (bucket is
-- public), owner-only write.
create policy avatars_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- videos: path convention {player_id}/{video_id}/source.mp4 (+ thumb.jpg) —
-- private bucket, owner has full access to their own folder.
create policy videos_owner_all on storage.objects for all to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- videos: any authenticated user can read a file once the matching `videos`
-- row is status='ready'. This join back to the public table is what keeps
-- in-progress uploads invisible to scouts even though Storage RLS by itself
-- can't see upload_intent/status — that's a Postgres-level column, not
-- something the storage.objects policy can inspect directly otherwise.
create policy videos_read_ready on storage.objects for select to authenticated
  using (
    bucket_id = 'videos'
    and exists (
      select 1 from public.videos v
      where v.storage_path = name and v.status = 'ready'
    )
  );
