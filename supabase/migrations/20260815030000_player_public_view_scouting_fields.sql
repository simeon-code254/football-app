-- The scout Discover Players filter sheet only had position/age/country/
-- foot/overall -- real columns like height, weight, and goalkeeper status
-- already exist on players but were never exposed through the public view,
-- so there was nothing for a richer filter set to query against.
-- create or replace view can only append columns, never reorder/rename
-- existing ones -- new columns go at the end, existing ones stay exactly
-- as they were.
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
     and v.created_at > now() - interval '14 days') as recently_active,
  p.is_goalkeeper,
  p.height_cm,
  p.weight_kg
from public.players p
join public.profiles pr on pr.id = p.id
left join public.countries c on c.code = p.nationality_code;
