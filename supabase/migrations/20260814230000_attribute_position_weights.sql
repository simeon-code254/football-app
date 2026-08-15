-- Position-weighted Overall rating. Real rating systems (FIFA included)
-- weight each attribute differently per position -- a striker's Overall
-- leans on Shooting/Pace, a center-back's on Defending/Physical. The
-- previous recalc_player_overall() (20260808080209) was a flat, unweighted
-- avg() across whatever attribute rows existed -- real, not fabricated,
-- but not position-aware. This table is a documented methodology decision
-- (weights grounded in each position's real on-pitch responsibilities,
-- checked in here so the rationale is reviewable), not an invented output.
--
-- Goalkeepers are deliberately excluded: they need their own weight
-- profile over the 8 GK attributes, which stay unscored until a future
-- GK-scoring phase ships. Until then a GK's overall_rating falls back to
-- the flat-average path below (currently null, since no GK attribute has
-- a real value yet).
create table public.attribute_position_weights (
  position position_code not null,
  attribute_id smallint not null references public.attribute_definitions(id),
  weight numeric not null check (weight >= 0 and weight <= 1),
  primary key (position, attribute_id)
);

alter table public.attribute_position_weights enable row level security;

create policy attribute_position_weights_select_all on public.attribute_position_weights
  for select using (true);

-- Each position's 10 outfield weights sum to 1.00. Resolved against
-- attribute_definitions.id via a join (not hardcoded ids, which are
-- generated-identity values this migration shouldn't assume).
insert into public.attribute_position_weights (position, attribute_id, weight)
select v.position::position_code, d.id, v.weight
from (values
  -- Center-back: defending/physical/positioning-led
  ('CB','pace',0.08), ('CB','shooting',0.01), ('CB','passing',0.10), ('CB','dribbling',0.02),
  ('CB','defending',0.32), ('CB','physical',0.18), ('CB','vision',0.04), ('CB','positioning',0.16),
  ('CB','ball_control',0.03), ('CB','decision_making',0.06),

  -- Fullback (LB/RB): pace/defending/passing balanced
  ('LB','pace',0.16), ('LB','shooting',0.01), ('LB','passing',0.14), ('LB','dribbling',0.08),
  ('LB','defending',0.24), ('LB','physical',0.14), ('LB','vision',0.05), ('LB','positioning',0.10),
  ('LB','ball_control',0.05), ('LB','decision_making',0.03),
  ('RB','pace',0.16), ('RB','shooting',0.01), ('RB','passing',0.14), ('RB','dribbling',0.08),
  ('RB','defending',0.24), ('RB','physical',0.14), ('RB','vision',0.05), ('RB','positioning',0.10),
  ('RB','ball_control',0.05), ('RB','decision_making',0.03),

  -- Defensive mid: defending/passing/positioning-led
  ('CDM','pace',0.06), ('CDM','shooting',0.02), ('CDM','passing',0.18), ('CDM','dribbling',0.04),
  ('CDM','defending',0.22), ('CDM','physical',0.14), ('CDM','vision',0.08), ('CDM','positioning',0.16),
  ('CDM','ball_control',0.04), ('CDM','decision_making',0.06),

  -- Central mid: passing/vision/positioning-led
  ('CM','pace',0.06), ('CM','shooting',0.04), ('CM','passing',0.22), ('CM','dribbling',0.08),
  ('CM','defending',0.08), ('CM','physical',0.10), ('CM','vision',0.14), ('CM','positioning',0.12),
  ('CM','ball_control',0.08), ('CM','decision_making',0.08),

  -- Attacking mid: passing/dribbling/vision-led
  ('CAM','pace',0.06), ('CAM','shooting',0.12), ('CAM','passing',0.20), ('CAM','dribbling',0.14),
  ('CAM','defending',0.02), ('CAM','physical',0.06), ('CAM','vision',0.16), ('CAM','positioning',0.08),
  ('CAM','ball_control',0.10), ('CAM','decision_making',0.06),

  -- Wide midfield (LM/RM): pace/dribbling/passing balanced
  ('LM','pace',0.16), ('LM','shooting',0.08), ('LM','passing',0.16), ('LM','dribbling',0.16),
  ('LM','defending',0.04), ('LM','physical',0.08), ('LM','vision',0.08), ('LM','positioning',0.06),
  ('LM','ball_control',0.12), ('LM','decision_making',0.06),
  ('RM','pace',0.16), ('RM','shooting',0.08), ('RM','passing',0.16), ('RM','dribbling',0.16),
  ('RM','defending',0.04), ('RM','physical',0.08), ('RM','vision',0.08), ('RM','positioning',0.06),
  ('RM','ball_control',0.12), ('RM','decision_making',0.06),

  -- Winger (LW/RW): pace/dribbling/shooting-led
  ('LW','pace',0.20), ('LW','shooting',0.12), ('LW','passing',0.10), ('LW','dribbling',0.20),
  ('LW','defending',0.02), ('LW','physical',0.06), ('LW','vision',0.06), ('LW','positioning',0.04),
  ('LW','ball_control',0.16), ('LW','decision_making',0.04),
  ('RW','pace',0.20), ('RW','shooting',0.12), ('RW','passing',0.10), ('RW','dribbling',0.20),
  ('RW','defending',0.02), ('RW','physical',0.06), ('RW','vision',0.06), ('RW','positioning',0.04),
  ('RW','ball_control',0.16), ('RW','decision_making',0.04),

  -- Striker: shooting/pace/physical-led
  ('ST','pace',0.14), ('ST','shooting',0.26), ('ST','passing',0.06), ('ST','dribbling',0.10),
  ('ST','defending',0.01), ('ST','physical',0.12), ('ST','vision',0.04), ('ST','positioning',0.12),
  ('ST','ball_control',0.10), ('ST','decision_making',0.05)
) as v(position, key, weight)
join public.attribute_definitions d on d.key = v.key and d.category = 'outfield';

-- Replaces the flat avg() with the position-weighted formula above,
-- re-normalized over whichever attributes currently have a real value
-- (sum(weight*value)/sum(weight), not divided by a fixed 1.00) so a
-- partially-scored player -- today, everyone: only Pace/Physical have a
-- real code path yet -- still gets an honest provisional Overall instead
-- of a null, while a fully-scored player gets the complete weighted
-- formula automatically as more attributes go live. Falls back to the
-- original flat average when the player has no primary_position set, or
-- no weight row matches at all (goalkeepers, until a future GK phase).
create or replace function public.recalc_player_overall()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid := coalesce(new.player_id, old.player_id);
  v_position public.position_code;
  v_weighted numeric;
begin
  select primary_position into v_position from public.players where id = v_player_id;

  if v_position is not null then
    select round(sum(w.weight * s.value) / nullif(sum(w.weight), 0), 2)
      into v_weighted
      from public.player_attribute_scores s
      join public.attribute_position_weights w
        on w.attribute_id = s.attribute_id and w.position = v_position
      where s.player_id = v_player_id;
  end if;

  update public.players
    set overall_rating = coalesce(
      v_weighted,
      (select round(avg(value)::numeric, 2) from public.player_attribute_scores where player_id = v_player_id)
    )
    where id = v_player_id;

  return null;
end;
$$;
