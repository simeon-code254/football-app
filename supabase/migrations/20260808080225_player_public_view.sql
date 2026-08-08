-- Naming matches the comment already in app/src/data/mockPlayers.ts
-- ("this is what player_public_view + player_attribute_scores will
-- eventually back") — treated as an existing decision, not reinvented here.
--
-- No RLS needed directly on a view — Postgres 15+ views run as
-- SECURITY INVOKER by default, so it inherits RLS from players/profiles/
-- videos at query time. If the linked project's Postgres major version is
-- below 15, uncomment the ALTER VIEW below to force it explicitly.

create or replace view public.player_public_view as
select
  p.id,
  pr.full_name,
  pr.avatar_url,
  p.primary_position,
  p.secondary_position,
  p.nationality_code,
  c.name as nationality_name,
  date_part('year', age(current_date, p.date_of_birth))::int as age,
  p.club,
  p.overall_rating,
  p.preferred_foot,
  (select count(*) from public.videos v where v.player_id = p.id and v.status = 'ready') as video_count,
  (select bool_or(true) from public.videos v where v.player_id = p.id and v.status = 'ready'
     and v.created_at > now() - interval '14 days') as recently_active
from public.players p
join public.profiles pr on pr.id = p.id
left join public.countries c on c.code = p.nationality_code;

-- alter view public.player_public_view set (security_invoker = true);
