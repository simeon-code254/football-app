-- messages.body was unbounded text with no check constraint, so a pasted
-- megabyte went straight to Postgres and then to every participant's device on
-- their next fetch -- over metered mobile data, for a user base that cannot
-- afford it.
--
-- 4000 characters is far beyond any real message (the longest in the table when
-- this was added was 13) and still small enough that a pathological paste
-- cannot be used to push cost onto the person receiving it.
--
-- Enforced here rather than only in the client because the client is not the
-- authority: anything holding a session token can POST to PostgREST directly.
alter table public.messages
  add constraint messages_body_length check (char_length(body) <= 4000);

comment on constraint messages_body_length on public.messages is
  'Upper bound on a single message. The client stops at the same number and
   shows a counter; this is what actually guarantees it.';
