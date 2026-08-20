-- Tell a player when their rating actually goes up.
--
-- The app computes this on every analysis and never says it out loud. A
-- player uploads a clip, waits, and the only notification they get is
-- "analysis complete" -- which reports that a process finished, not that
-- anything good happened. The number moving is the reward the whole upload
-- loop is built around, and it was silent.
--
-- FIRED FROM THE SCORE PATH ONLY, ON PURPOSE
--
-- The logic lives inside recalc_player_overall rather than in a trigger on
-- players.overall_rating, because a rating also changes when a player
-- corrects their primary_position (see 20260815120000 -- position weights
-- feed the overall). Telling someone "your rating went up" because they fixed
-- a dropdown would be a fabricated achievement. Only new analysis counts.
--
-- ONLY INCREASES, AND ONLY VISIBLE ONES
--
-- Rounded values are compared, because that is what the UI shows: a move from
-- 16.4 to 16.6 is a real change the player can see (16 -> 17), while 16.4 to
-- 16.45 is not, and notifying about invisible movement trains people to
-- ignore notifications.
--
-- Decreases are deliberately not pushed. This is not hiding them -- the
-- number is on the player's home screen either way. But a rating here can
-- drop because a new low-confidence clip dragged a weighted average, which is
-- a measurement artifact rather than the player getting worse, and pushing
-- that to a teenager is both discouraging and not actionable.

create or replace function public.recalc_player_overall()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid := coalesce(new.player_id, old.player_id);
  v_old numeric;
  v_new numeric;
  v_existing bigint;
begin
  select overall_rating into v_old from public.players where id = v_player_id;

  update public.players
    set overall_rating = public.weighted_overall(v_player_id),
        rating_has_low_confidence = public.rating_has_low_confidence(v_player_id)
  where id = v_player_id
  returning overall_rating into v_new;

  if v_new is not null and v_old is not null and round(v_new) > round(v_old) then
    -- One analysis writes several attribute rows, so this function runs
    -- several times in quick succession and the rating climbs in steps. Rather
    -- than sending a notification per step, the first one is kept and its
    -- body is rewritten as the number rises, so the record a player opens
    -- always shows where the rating actually landed.
    select id into v_existing
    from public.notifications
    where profile_id = v_player_id
      and type = 'rating_improved'
      and created_at >= date_trunc('day', now())
    limit 1;

    if v_existing is not null then
      update public.notifications
        set body = format('Your overall rating is now %s.', round(v_new)),
            data = jsonb_build_object('overall', round(v_new))
      where id = v_existing;
    else
      insert into public.notifications (profile_id, type, title, body, data)
      values (
        v_player_id,
        'rating_improved',
        'Your rating went up',
        format('Your overall rating is now %s.', round(v_new)),
        jsonb_build_object('overall', round(v_new))
      );
    end if;
  end if;

  return null;
end;
$$;
