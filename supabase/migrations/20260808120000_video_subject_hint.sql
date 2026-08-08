-- Optional tap-to-confirm point from the upload flow: the uploader taps
-- themselves on the first frame before publishing an ai_analysis video.
-- Normalized 0-1 coordinates (relative to that frame's width/height), so
-- they're resolution-independent. Nullable — highlight-only uploads and
-- anyone who skips the tap step never set these; the AI service falls back
-- to its screen-time/size/centering heuristic when absent.

alter table public.videos
  add column subject_hint_x real check (subject_hint_x between 0 and 1),
  add column subject_hint_y real check (subject_hint_y between 0 and 1);
