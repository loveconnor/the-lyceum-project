-- Dashboard state per user
create table if not exists public.dashboard_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  overall_success_rate numeric not null default 0,
  total_courses integer not null default 0,
  total_activities integer not null default 0,
  total_minutes integer not null default 0,
  most_active_month text,
  progress numeric not null default 0,
  top_topics jsonb not null default '[]'::jsonb,
  learning_path jsonb not null default '[]'::jsonb,
  recommended_topics jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  last_recomputed_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dashboard_state_user_id_idx on public.dashboard_state (user_id);
create index if not exists dashboard_state_recommended_topics_gin on public.dashboard_state using gin (recommended_topics);

create or replace function public.handle_dashboard_state_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dashboard_state_set_updated_at on public.dashboard_state;
create trigger dashboard_state_set_updated_at
before update on public.dashboard_state
for each row execute procedure public.handle_dashboard_state_updated_at();

alter table public.dashboard_state enable row level security;

drop policy if exists "Dashboard state viewable by owner" on public.dashboard_state;
create policy "Dashboard state viewable by owner" on public.dashboard_state
  for select using (auth.uid() = user_id);

drop policy if exists "Dashboard state insertable by owner" on public.dashboard_state;
create policy "Dashboard state insertable by owner" on public.dashboard_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "Dashboard state updatable by owner" on public.dashboard_state;
create policy "Dashboard state updatable by owner" on public.dashboard_state
  for update using (auth.uid() = user_id);
