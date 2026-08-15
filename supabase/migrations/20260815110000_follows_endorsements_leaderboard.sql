-- Peer recognition and segmented leaderboards.
--
-- Being scouted is a rare event. For most players it never happens, so an
-- app whose only reward is "a scout might message you" has nothing to offer
-- between uploads -- which is the churn pattern that kills products in this
-- category. Peer recognition is available every week to everyone, and is
-- what Tonsser used to reach ~1.5M players aged 13-19 at roughly 80%
-- retention.

-- ---------------------------------------------------------------- follows
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_not_self check (follower_id <> followed_id)
);

create index follows_followed_idx on public.follows (followed_id);

alter table public.follows enable row level security;

-- Follower counts are public (that is the point of the signal), so reads
-- are open to any signed-in user; writes are restricted to your own row.
create policy follows_select_all on public.follows for select to authenticated using (true);
create policy follows_insert_own on public.follows for insert
  with check (follower_id = auth.uid() and not public.is_blocked_between(follower_id, followed_id));
create policy follows_delete_own on public.follows for delete using (follower_id = auth.uid());

-- ----------------------------------------------------------- endorsements
-- A teammate vouching for a specific attribute -- human judgement alongside
-- the machine's. Deliberately constrained to the real attribute taxonomy so
-- endorsements can sit next to AI scores without inventing a second
-- vocabulary.
create table public.endorsements (
  endorser_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  attribute_key text not null,
  created_at timestamptz not null default now(),
  primary key (endorser_id, player_id, attribute_key),
  constraint endorsements_not_self check (endorser_id <> player_id)
);

create index endorsements_player_idx on public.endorsements (player_id, attribute_key);

alter table public.endorsements enable row level security;

create policy endorsements_select_all on public.endorsements for select to authenticated using (true);
create policy endorsements_insert_own on public.endorsements for insert
  with check (
    endorser_id = auth.uid()
    and not public.is_blocked_between(endorser_id, player_id)
    -- Only real attributes. Without this the table becomes free-text and
    -- the counts stop meaning anything.
    and exists (select 1 from public.attribute_definitions d where d.key = attribute_key)
  );
create policy endorsements_delete_own on public.endorsements for delete using (endorser_id = auth.uid());

-- ------------------------------------------------------------ leaderboard
-- Segmented on purpose. A global board produces a small group who compete
-- and a large majority who disengage because they cannot place; segmenting
-- by region, age band and position gives everyone a peer group they can
-- realistically rank in. All three dimensions already exist -- region via
-- countries.region, age via player_public_view, position on players.
--
-- Age bands follow real youth-football brackets rather than arbitrary
-- decades, so a 15-year-old is never ranked against a 23-year-old.
create or replace view public.player_leaderboard as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.primary_position,
  p.nationality_code,
  c.region,
  p.overall_rating,
  p.video_count,
  case
    when p.age is null then 'unknown'
    when p.age < 16 then 'u16'
    when p.age < 18 then 'u18'
    when p.age < 21 then 'u21'
    else 'senior'
  end as age_band,
  (select count(*) from public.follows f where f.followed_id = p.id) as follower_count,
  (select count(*) from public.endorsements e where e.player_id = p.id) as endorsement_count
from public.player_public_view p
left join public.countries c on c.code = p.nationality_code
where p.overall_rating is not null;
