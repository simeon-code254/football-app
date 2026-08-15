-- Backfill for the position-weighted Overall (20260814230000).
--
-- That migration replaced the flat-average recalc_player_overall() with a
-- position-weighted one, but nothing recomputed the overall_rating values
-- already stored. The trigger only fires on player_attribute_scores
-- writes, so every player scored BEFORE that migration kept their old
-- flat-average number indefinitely -- and would keep it forever if they
-- never upload again.
--
-- Verified live against the real project before writing this, not assumed:
-- a real RB with pace=1, physical=34 had overall_rating = 17.50, which is
-- exactly the flat average (1+34)/2. The weighted formula for RB
-- (pace 0.16, physical 0.14) gives (0.16*1 + 0.14*34)/0.30 = 16.40. The
-- stored value matched the OLD formula, confirming the trigger had never
-- re-fired for that player.
--
-- overall_rating is what the Discover/browse screens sort and filter on,
-- so a stale value is a real, user-visible wrong number, not cosmetic
-- drift.
--
-- Also extracts the computation into a plain callable function so this
-- never again requires duplicating the formula: the trigger delegates to
-- it, and the backfill below calls the same single definition.

create or replace function public.recalc_player_overall_for(p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_position public.position_code;
  v_weighted numeric;
begin
  select primary_position into v_position from public.players where id = p_player_id;

  if v_position is not null then
    select round(sum(w.weight * s.value) / nullif(sum(w.weight), 0), 2)
      into v_weighted
      from public.player_attribute_scores s
      join public.attribute_position_weights w
        on w.attribute_id = s.attribute_id and w.position = v_position
      where s.player_id = p_player_id;
  end if;

  update public.players
    set overall_rating = coalesce(
      v_weighted,
      (select round(avg(value)::numeric, 2) from public.player_attribute_scores where player_id = p_player_id)
    )
    where id = p_player_id;
end;
$$;

-- Identical behavior to before, single definition of the formula. Keeps
-- returning null (an after-trigger) exactly as the previous version did.
create or replace function public.recalc_player_overall()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_player_overall_for(coalesce(new.player_id, old.player_id));
  return null;
end;
$$;

-- One-time backfill. Scoped to players who actually have scores: a player
-- with none would just get null written over null, so there's no reason to
-- touch rows the change cannot affect.
do $$
declare r record;
begin
  for r in
    select p.id from public.players p
    where exists (select 1 from public.player_attribute_scores s where s.player_id = p.id)
  loop
    perform public.recalc_player_overall_for(r.id);
  end loop;
end $$;
