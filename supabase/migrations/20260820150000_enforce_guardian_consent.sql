-- Actually enforce guardian consent before a minor's body is analysed.
--
-- 20260815100000 built the whole consent record -- separate flags for
-- account, AI analysis and scout contact, a single-use confirmation token, a
-- revocation trail -- and has_ai_consent() to read it. Nothing ever called
-- it. A 15-year-old was shown a sentence in profile-complete.tsx saying "ask
-- a parent or guardian" and then allowed to upload video of themselves for
-- pose estimation regardless of what any guardian said.
--
-- Under the amended COPPA rules in force since 22 April 2026, that processing
-- is biometric handling of a child's personal information and needs its own
-- verifiable parental consent. A sentence of advice is not consent.
--
-- Enforced in the database, not the client. An upload screen check is a UX
-- affordance; it can be bypassed by anyone calling the API directly, and the
-- obligation here is legal rather than cosmetic.
--
-- Deliberately scoped to video, which is what carries the biometric payload.
-- Holding an account, messaging and being ranked are governed by the other
-- two consent flags and are not gated here -- blocking a minor from their own
-- account would be a different and worse product.
--
-- Unknown date_of_birth fails safe as a minor: we cannot show they are an
-- adult, and the cost of being wrong is analysing a child's body without
-- permission.

create or replace function public.enforce_guardian_consent_for_video()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dob date;
begin
  select date_of_birth into v_dob from public.players where id = new.player_id;

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

drop trigger if exists trg_enforce_guardian_consent on public.videos;
create trigger trg_enforce_guardian_consent
  before insert on public.videos
  for each row execute function public.enforce_guardian_consent_for_video();
