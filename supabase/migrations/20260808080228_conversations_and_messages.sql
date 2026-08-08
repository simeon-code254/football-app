-- Messaging. Conversation creation requires is_verified_scout() on the scout
-- side — matches the RN Messages screen's verification gate, enforced here
-- too (defense in depth on top of the app-level check).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (scout_id, player_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.bump_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select_participant on public.conversations for select
  using (scout_id = auth.uid() or player_id = auth.uid());
create policy conversations_insert_verified_scout on public.conversations for insert
  with check (scout_id = auth.uid() and public.is_verified_scout());

create policy messages_select_participant on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.scout_id = auth.uid() or c.player_id = auth.uid())
  ));
create policy messages_insert_participant on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.scout_id = auth.uid() or c.player_id = auth.uid())
    )
  );
