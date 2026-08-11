-- videos_insert_own (20260808080202_videos.sql) only checks
-- player_id = auth.uid(), not that storage_path actually belongs to that
-- player. videos_read_ready's storage policy (20260808080237_storage.sql)
-- grants read to any authenticated user once *some* videos row with a
-- matching storage_path is status='ready' -- so a player could claim
-- another player's real storage path in a fake row and read their private
-- video. This closes it at the table level too, matching the path
-- convention ({player_id}/{video_id}/...) already enforced at the
-- Storage-object level.
alter table public.videos
  add constraint videos_storage_path_owned check (storage_path like player_id::text || '/%');
