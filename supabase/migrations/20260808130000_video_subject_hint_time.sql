-- The tap-to-confirm point is only meaningful at the moment it was taken —
-- the subject moves, so the same (x,y) means something different a few
-- seconds later in the clip. Without knowing *when* the tap was captured,
-- the AI service had no principled way to know which of its own
-- independently-decoded frames to check it against.

alter table public.videos
  add column subject_hint_time_ms integer check (subject_hint_time_ms >= 0);
