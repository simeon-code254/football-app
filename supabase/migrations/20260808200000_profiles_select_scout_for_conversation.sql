-- No policy ever let a player read a scout's profiles row -- messages.tsx
-- joins scouts(...).profiles(full_name, avatar_url) for the player's
-- conversation list/thread view, which would silently render blank
-- name/avatar for the scout side. Scoped narrowly: only readable by a
-- player who's actually in a shared conversation with that scout, not
-- broadly (a plain player has no general reason to browse scout profiles).
create policy profiles_select_scout_for_conversation_participant on public.profiles for select
  to authenticated using (
    role = 'scout'
    and exists (
      select 1 from public.conversations c
      where c.scout_id = profiles.id and c.player_id = auth.uid()
    )
  );
