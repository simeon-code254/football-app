-- Canonical attribute taxonomy — the app renders attribute lists from this
-- table, never hardcoded, so adding/renaming an attribute is a data change,
-- not a code change. 10 outfield + 8 goalkeeper attributes.

create table public.attribute_definitions (
  id smallint generated always as identity primary key,
  key text not null,
  display_name text not null,
  category text not null check (category in ('outfield','goalkeeper')),
  sort_order smallint not null,
  unique (key, category)
);

alter table public.attribute_definitions enable row level security;

create policy attribute_definitions_select_all on public.attribute_definitions
  for select using (true);

insert into public.attribute_definitions (key, display_name, category, sort_order) values
  ('pace', 'Pace', 'outfield', 1),
  ('shooting', 'Shooting', 'outfield', 2),
  ('passing', 'Passing', 'outfield', 3),
  ('dribbling', 'Dribbling', 'outfield', 4),
  ('defending', 'Defending', 'outfield', 5),
  ('physical', 'Physical', 'outfield', 6),
  ('vision', 'Vision', 'outfield', 7),
  ('positioning', 'Positioning', 'outfield', 8),
  ('ball_control', 'Ball Control', 'outfield', 9),
  ('decision_making', 'Decision Making', 'outfield', 10),
  ('reflexes', 'Reflexes', 'goalkeeper', 1),
  ('handling', 'Handling', 'goalkeeper', 2),
  ('distribution', 'Distribution', 'goalkeeper', 3),
  ('aerial_ability', 'Aerial Ability', 'goalkeeper', 4),
  ('sweeping_rushing', 'Sweeping/Rushing Out', 'goalkeeper', 5),
  ('positioning', 'Positioning', 'goalkeeper', 6),
  ('command_of_area', 'Command of Area', 'goalkeeper', 7),
  ('kicking', 'Kicking', 'goalkeeper', 8);
