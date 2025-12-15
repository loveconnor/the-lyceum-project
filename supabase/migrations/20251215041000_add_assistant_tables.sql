-- Assistant conversations and messages storage
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists assistant_conversations_user_id_idx on public.assistant_conversations (user_id, updated_at desc);
create index if not exists assistant_messages_conversation_id_idx on public.assistant_messages (conversation_id, created_at);

-- updated_at trigger for conversations
create or replace function public.assistant_conversations_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assistant_conversations_set_updated_at on public.assistant_conversations;
create trigger trg_assistant_conversations_set_updated_at
before update on public.assistant_conversations
for each row
execute function public.assistant_conversations_set_updated_at();

-- RLS
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

-- Policies for conversations
drop policy if exists "Conversations are readable by owner" on public.assistant_conversations;
create policy "Conversations are readable by owner"
  on public.assistant_conversations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Conversations are insertable by owner" on public.assistant_conversations;
create policy "Conversations are insertable by owner"
  on public.assistant_conversations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Conversations are updatable by owner" on public.assistant_conversations;
create policy "Conversations are updatable by owner"
  on public.assistant_conversations
  for update
  using (auth.uid() = user_id);

drop policy if exists "Conversations are deletable by owner" on public.assistant_conversations;
create policy "Conversations are deletable by owner"
  on public.assistant_conversations
  for delete
  using (auth.uid() = user_id);

-- Policies for messages (ownership via conversation)
drop policy if exists "Messages are readable by conversation owner" on public.assistant_messages;
create policy "Messages are readable by conversation owner"
  on public.assistant_messages
  for select
  using (
    exists (
      select 1
      from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Messages are insertable by conversation owner" on public.assistant_messages;
create policy "Messages are insertable by conversation owner"
  on public.assistant_messages
  for insert
  with check (
    exists (
      select 1
      from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Messages are deletable by conversation owner" on public.assistant_messages;
create policy "Messages are deletable by conversation owner"
  on public.assistant_messages
  for delete
  using (
    exists (
      select 1
      from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
