-- Narrow the guardian-consent gate to uploads that are actually analysed.
--
-- 20260820150000 blocked every video insert from an under-18 account without
-- confirmed AI consent. That over-blocks: videos.upload_intent already
-- distinguishes 'highlight_only' from 'ai_analysis', and a highlight-only
-- upload never reaches pose estimation, so no biometric processing of a
-- child occurs and no consent for it is owed. The previous version would have
-- stopped a 15-year-old from posting a highlight reel at all -- a worse
-- product, and stricter than the obligation.
--
-- Found by testing the trigger rather than reading it: the insert failed on
-- upload_intent's not-null constraint, which is what surfaced that the column
-- -- and therefore the distinction -- existed.
--
-- The gate now matches the actual harm: consent is required exactly when a
-- minor's body is about to be measured.

create or replace function public.enforce_guardian_consent_for_video()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dob date;
begin
  -- Nothing to consent to unless this upload is destined for analysis.
  if new.upload_intent is distinct from 'ai_analysis' then
    return new;
  end if;

  select date_of_birth into v_dob from public.players where id = new.player_id;

  -- Unknown date_of_birth fails safe as a minor: we cannot show they are an
  -- adult, and the cost of being wrong is measuring a child's body without
  -- permission.
  if v_dob is null or date_part('year', age(current_date, v_dob)) < 18 then
    if not public.has_ai_consent(new.player_id) then
      raise exception 'guardian_consent_required'
        using hint = 'A parent or guardian must confirm consent before videos from an under-18 account can be analysed.',
              errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
