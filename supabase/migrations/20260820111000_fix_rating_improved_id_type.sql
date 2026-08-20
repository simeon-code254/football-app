-- Fix: v_existing was declared bigint, but notifications.id is uuid.
--
-- 20260820110000 shipped this inside recalc_player_overall, which runs on
-- EVERY player_attribute_scores write. The declaration only gets exercised
-- when a rating crosses a rounding boundary upward, so it would not show up
-- until a real analysis improved someone's score -- and then it would abort
-- the whole score write with "invalid input syntax for type bigint", losing
-- the analysis result rather than merely skipping a notification.
--
-- Caught by testing the trigger against real rows in a rolled-back
-- transaction instead of trusting that it applied cleanly. `supabase db push`
-- succeeding only means the function body parsed; plpgsql does not type-check
-- a SELECT INTO against the target's declared type until it runs.

create or replace function public.recalc_player_overall()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid := coalesce(new.player_id, old.player_id);
  v_old numeric;
  v_new numeric;
  v_existing uuid;
begin
  select overall_rating into v_old from public.players where id = v_player_id;

  update public.players
    set overall_rating = public.weighted_overall(v_player_id),
        rating_has_low_confidence = public.rating_has_low_confidence(v_player_id)
  where id = v_player_id
  returning overall_rating into v_new;

  if v_new is not null and v_old is not null and round(v_new) > round(v_old) then
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
