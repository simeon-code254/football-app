-- messages (20260808080228_conversations_and_messages.sql) has no UPDATE
-- policy at all, so messagesRepository.markMessagesRead() silently no-ops
-- for every user -- read_at never actually gets set. A participant of the
-- conversation may mark a message read, but never their own sent message
-- (read receipts aren't trust-critical the way ratings/verification are,
-- so a simple participant check is enough -- no column-lock trigger needed).
create policy messages_update_mark_read on public.messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.scout_id = auth.uid() or c.player_id = auth.uid())
    )
  );
