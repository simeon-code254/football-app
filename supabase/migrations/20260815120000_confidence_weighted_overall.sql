-- players.overall_rating: weight each attribute by how much the analysis
-- actually trusts it, on top of the existing position weighting.
--
-- 20260814230000_attribute_position_weights.sql made the overall respect the
-- player's role -- pace counts for more in a full-back than in a centre-half.
-- That weighting is kept exactly as it is here. What it did not account for
-- is how *confident* the pipeline was in each measurement: a Low-confidence
-- score counted as heavily as a High-confidence one at the same position
-- weight.
--
-- That is how a real player ended up with a headline 16. Their pace scored 1
-- from a clip the analysis could barely track, and it was combined at full
-- strength with a physical score of 34 it was far surer of. These values sit
-- on the 0-99 scale (see the CHECK on player_attribute_scores.value) -- the
-- same scale players read fluently from football games, where 99 is world
-- class. So the headline is not a neutral statistic, it is a verdict, and it
-- was being driven hardest by the number we were least sure of. A Low
-- confidence usually means the subject could not be tracked well in that
-- clip: a fact about our footage and our detector, not about the player.
--
-- The two weightings are independent and therefore multiply. Position weight
-- answers "how much does this attribute matter for this role"; confidence
-- answers "how much do we trust this particular measurement". Neither
-- substitutes for the other.
--
-- WHERE THE CONFIDENCE WEIGHTS COME FROM
--
-- ai-service/src/pipeline/confidence.py resolves confidence from real,
-- measured inputs -- sample_count and coverage -- against documented
-- thresholds (MIN_SAMPLES_FOR_MEDIUM = 30, MIN_SAMPLES_FOR_HIGH = 80). The
-- standard error of a mean scales as sigma/sqrt(n), so combining noisy
-- estimates by inverse variance means weighting each in proportion to the
-- evidence n behind it. That is the principle these constants follow.
--
-- The exact constants are calibrated judgment, not derived values, and it is
-- worth being straight about that. Low's band is bounded (n < 30) but High's
-- is open-ended (n >= 80), so any single "representative n" for High is a
-- choice that would silently set the whole ratio. Round numbers in the right
-- proportion are more honest than precise-looking ones reverse-engineered
-- from an arbitrary upper bound.
--
-- Low is deliberately 0.2 rather than 0. Dropping low-confidence attributes
-- outright would be a different product decision -- hiding data rather than
-- qualifying it -- and this app's position is to show every number the engine
-- produced and be clear about how sure it is.
--
-- KNOWN LIMITATION, worth fixing later: player_attribute_scores stores only
-- the resolved tier, not the sample_count and coverage behind it. If it
-- stored those, this could weight by the actual evidence per attribute rather
-- than by a three-step approximation. Schema change plus a pipeline write,
-- deliberately out of scope here.

-- Confidence -> weight, in one place so the trigger and the backfill cannot
-- drift apart.
--
-- The CASE has no ELSE on purpose: confidence is
-- `not null check (confidence in ('High','Medium','Low'))`, so the three arms
-- are exhaustive today. If a fourth tier is ever added its weight would come
-- out NULL and sum() would silently drop that attribute -- so any migration
-- adding a tier must update this function too.
create or replace function public.confidence_weight(p_confidence text)
returns numeric language sql immutable as $$
  select case p_confidence
           when 'High' then 1.0
           when 'Medium' then 0.6
           when 'Low' then 0.2
         end::numeric;
$$;

-- The whole overall calculation, extracted so it is verifiable on its own and
-- so the backfill below runs exactly what the trigger runs.
--
-- Preserves the fallback chain introduced with position weights: a player
-- with no primary_position, or whose scored attributes have no weight rows
-- for their position, still gets a number -- now confidence-weighted rather
-- than a flat mean.
create or replace function public.weighted_overall(p_player_id uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_position public.position_code;
  v_weighted numeric;
begin
  select primary_position into v_position from public.players where id = p_player_id;

  if v_position is not null then
    select round(
             sum(w.weight * public.confidence_weight(s.confidence) * s.value)
             / nullif(sum(w.weight * public.confidence_weight(s.confidence)), 0), 2)
      into v_weighted
      from public.player_attribute_scores s
      join public.attribute_position_weights w
        on w.attribute_id = s.attribute_id and w.position = v_position
      where s.player_id = p_player_id;
  end if;

  return coalesce(
    v_weighted,
    (select round(
              sum(public.confidence_weight(confidence) * value)
              / nullif(sum(public.confidence_weight(confidence)), 0), 2)
     from public.player_attribute_scores
     where player_id = p_player_id)
  );
end;
$$;

-- SECURITY DEFINER functions are executable by PUBLIC unless revoked, and
-- this one returns a value derived from player_attribute_scores -- a table
-- whose RLS deliberately returns nothing to anon (verified against the live
-- project with the anon key: []). The trigger is unaffected, as it runs as
-- the owner.
revoke all on function public.weighted_overall(uuid) from public, anon, authenticated;

create or replace function public.recalc_player_overall()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid := coalesce(new.player_id, old.player_id);
begin
  update public.players
    set overall_rating = public.weighted_overall(v_player_id)
  where id = v_player_id;
  return null;
end;
$$;

-- A player's overall now depends on their position, so it has to be
-- recomputed when that changes -- not only when a score does. Without this a
-- player who corrects their position keeps a rating computed for the old one.
create or replace function public.recalc_overall_on_position_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.players
    set overall_rating = public.weighted_overall(new.id)
  where id = new.id;
  return null;
end;
$$;

drop trigger if exists trg_recalc_overall_on_position on public.players;
create trigger trg_recalc_overall_on_position
  after update of primary_position on public.players
  for each row
  when (new.primary_position is distinct from old.primary_position)
  execute function public.recalc_overall_on_position_change();

-- Backfill every existing player.
--
-- The score trigger only fires on insert/update/delete of an attribute score,
-- so changing the formula alone would leave every already-rated player on a
-- number computed by the old one, with the code and the data quietly
-- disagreeing.
--
-- Players with no scores are covered too: the calculation returns NULL for
-- them (sum over no rows), which is the correct "not rated yet" state and
-- matches what the previous version produced.
update public.players p
set overall_rating = public.weighted_overall(p.id)
where p.overall_rating is distinct from public.weighted_overall(p.id);
