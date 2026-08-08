-- scout-edit-profile.tsx has a Country field with no backing column.
-- Adds one, matching the players.nationality_code pattern.

alter table public.scouts
  add column country_code text references public.countries(code);
