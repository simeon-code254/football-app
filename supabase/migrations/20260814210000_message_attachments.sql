-- messages.attachment_path has existed since the original messaging schema
-- but nothing ever wrote to it: no bucket, no storage policy, and the
-- compose screen's paperclip button was decorative. This wires the column
-- up for real.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Path convention: {conversation_id}/{random}.{ext}. Scoped to the two
-- participants of that conversation, same shape as messages_select_participant
-- on the table itself -- a conversation's attachments are only ever visible
-- to the scout and player actually in it.
create policy message_attachments_participant_rw on storage.objects for all to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.scout_id = auth.uid() or c.player_id = auth.uid())
    )
  )
  with check (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.scout_id = auth.uid() or c.player_id = auth.uid())
    )
  );
