-- Guardian consent for players under 18.
--
-- Why this exists: the FTC's amended COPPA rules (in force 22 April 2026)
-- treat biometric identifiers as personal information and state that
-- processing a child's data for AI training is never part of "providing a
-- service" -- it requires separate verifiable parental consent. This app
-- runs pose estimation over video of the player's own body. GDPR-K sets a
-- threshold as high as 16 in parts of the EU.
--
-- SCOPE, STATED PLAINLY: this migration builds the MECHANISM -- recording
-- who consented, to what, when, and from where. It does NOT decide the
-- policy. Which age threshold applies in which market, what counts as
-- "verifiable" consent there, and how long records must be kept are legal
-- questions for a lawyer, not engineering ones. The schema is deliberately
-- shaped so those answers can be filled in without another migration:
-- `method` and `scope` are free text, and the audit fields are captured
-- regardless of which regime turns out to apply.
create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,

  -- Who gave it. Kept minimal on purpose: collecting more of a third
  -- party's data than is needed to evidence consent would itself be a
  -- privacy problem.
  guardian_name text not null check (char_length(trim(guardian_name)) > 0),
  guardian_email text not null check (position('@' in guardian_email) > 1),
  guardian_relationship text,

  -- What was consented to. Separate flags because COPPA treats AI
  -- processing as a distinct purpose requiring its own consent -- a
  -- guardian can allow an account without allowing body analysis.
  consents_to_account boolean not null default false,
  consents_to_ai_analysis boolean not null default false,
  consents_to_scout_contact boolean not null default false,

  -- How it was obtained. 'email_confirmation' is what this app implements;
  -- stronger methods (card verification, signed form, video call) exist and
  -- may be required in some jurisdictions, hence free text rather than an
  -- enum that would need a migration to extend.
  method text not null default 'email_confirmation',

  -- Evidence trail. Regulators ask when consent was given and that it was
  -- actually confirmed, not merely requested.
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  -- Single-use token emailed to the guardian; cleared once confirmed so a
  -- leaked mailbox cannot re-confirm later.
  confirmation_token uuid not null default gen_random_uuid(),
  revoked_at timestamptz,

  created_at timestamptz not null default now()
);

create index guardian_consents_player_idx on public.guardian_consents (player_id);
-- One live consent record per player. A revoked or superseded record stays
-- for the audit trail rather than being deleted.
create unique index guardian_consents_active_idx
  on public.guardian_consents (player_id)
  where revoked_at is null;

alter table public.guardian_consents enable row level security;

-- The player may see and create their own request, so they can tell whether
-- a guardian has responded.
create policy guardian_consents_select_own on public.guardian_consents for select
  using (player_id = auth.uid());
create policy guardian_consents_insert_own on public.guardian_consents for insert
  with check (player_id = auth.uid());

-- Deliberately NO client update policy. A player must not be able to mark
-- their own guardian's consent as confirmed -- that is the entire point of
-- the mechanism. Confirmation happens through a SECURITY DEFINER function
-- called with the emailed token, never by a direct client write.
create policy guardian_consents_select_admin on public.guardian_consents for select
  using (public.is_admin());

-- Confirms a consent from the token in the guardian's email. Runs as the
-- function owner so it can write a row the client is forbidden from
-- touching, and takes no user id at all -- possession of the token is the
-- evidence.
create or replace function public.confirm_guardian_consent(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  update public.guardian_consents
     set confirmed_at = now(),
         -- Single-use: rotating the token means the same link cannot
         -- confirm twice, and a forwarded email cannot be replayed.
         confirmation_token = gen_random_uuid()
   where confirmation_token = p_token
     and confirmed_at is null
     and revoked_at is null
  returning id into v_id;

  return v_id is not null;
end;
$$;

-- Anyone holding a valid token may call this; it reveals nothing and
-- succeeds only for an unconfirmed, unrevoked record.
grant execute on function public.confirm_guardian_consent(uuid) to anon, authenticated;

-- Convenience read for the app: does this player have live consent covering
-- AI analysis? Kept as a function so the rule lives in one place rather
-- than being re-implemented per screen.
create or replace function public.has_ai_consent(p_player_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guardian_consents
     where player_id = p_player_id
       and confirmed_at is not null
       and revoked_at is null
       and consents_to_ai_analysis
  );
$$;
