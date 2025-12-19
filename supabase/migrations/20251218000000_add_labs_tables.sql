-- Labs table
create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  template_type text not null check (template_type in ('analyze', 'build', 'derive', 'explain', 'explore', 'revise')),
  template_data jsonb not null,
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'completed')),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_duration integer, -- in minutes
  topics text[],
  starred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  due_date timestamptz,
  completed_at timestamptz
);

-- Lab progress tracking (for tracking step completion, notes, etc.)
create table if not exists public.lab_progress (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  step_id text not null,
  step_data jsonb, -- stores user's work/responses for each step
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lab_id, user_id, step_id)
);

-- Lab comments
create table if not exists public.lab_comments (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists labs_user_id_idx on public.labs (user_id, created_at desc);
create index if not exists labs_status_idx on public.labs (status);
create index if not exists labs_template_type_idx on public.labs (template_type);
create index if not exists lab_progress_lab_id_idx on public.lab_progress (lab_id, user_id);
create index if not exists lab_comments_lab_id_idx on public.lab_comments (lab_id, created_at desc);

-- Updated_at triggers
create or replace function public.labs_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.lab_progress_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_labs_set_updated_at on public.labs;
create trigger trg_labs_set_updated_at
before update on public.labs
for each row
execute function public.labs_set_updated_at();

drop trigger if exists trg_lab_progress_set_updated_at on public.lab_progress;
create trigger trg_lab_progress_set_updated_at
before update on public.lab_progress
for each row
execute function public.lab_progress_set_updated_at();

-- RLS Policies
alter table public.labs enable row level security;
alter table public.lab_progress enable row level security;
alter table public.lab_comments enable row level security;

-- Labs policies
drop policy if exists "Labs are readable by owner" on public.labs;
create policy "Labs are readable by owner"
  on public.labs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Labs are insertable by owner" on public.labs;
create policy "Labs are insertable by owner"
  on public.labs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Labs are updatable by owner" on public.labs;
create policy "Labs are updatable by owner"
  on public.labs
  for update
  using (auth.uid() = user_id);

drop policy if exists "Labs are deletable by owner" on public.labs;
create policy "Labs are deletable by owner"
  on public.labs
  for delete
  using (auth.uid() = user_id);

-- Lab progress policies
drop policy if exists "Lab progress is readable by owner" on public.lab_progress;
create policy "Lab progress is readable by owner"
  on public.lab_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "Lab progress is insertable by owner" on public.lab_progress;
create policy "Lab progress is insertable by owner"
  on public.lab_progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Lab progress is updatable by owner" on public.lab_progress;
create policy "Lab progress is updatable by owner"
  on public.lab_progress
  for update
  using (auth.uid() = user_id);

drop policy if exists "Lab progress is deletable by owner" on public.lab_progress;
create policy "Lab progress is deletable by owner"
  on public.lab_progress
  for delete
  using (auth.uid() = user_id);

-- Lab comments policies
drop policy if exists "Lab comments are readable by lab owner" on public.lab_comments;
create policy "Lab comments are readable by lab owner"
  on public.lab_comments
  for select
  using (
    exists (
      select 1 from public.labs
      where labs.id = lab_comments.lab_id
      and labs.user_id = auth.uid()
    )
  );

drop policy if exists "Lab comments are insertable by lab owner" on public.lab_comments;
create policy "Lab comments are insertable by lab owner"
  on public.lab_comments
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.labs
      where labs.id = lab_comments.lab_id
      and labs.user_id = auth.uid()
    )
  );

drop policy if exists "Lab comments are deletable by comment owner" on public.lab_comments;
create policy "Lab comments are deletable by comment owner"
  on public.lab_comments
  for delete
  using (auth.uid() = user_id);
