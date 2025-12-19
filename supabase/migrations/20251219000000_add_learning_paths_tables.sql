-- Learning paths table
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  topics text[],
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_duration integer, -- total in minutes
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'completed')),
  progress numeric not null default 0, -- percentage 0-100
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Learning path items (labs or other activities in the path)
create table if not exists public.learning_path_items (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  lab_id uuid references public.labs (id) on delete cascade,
  order_index integer not null,
  title text not null,
  description text,
  item_type text not null check (item_type in ('lab', 'reading', 'video', 'quiz', 'project')),
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(path_id, order_index)
);

-- Indexes
create index if not exists learning_paths_user_id_idx on public.learning_paths (user_id, created_at desc);
create index if not exists learning_paths_status_idx on public.learning_paths (status);
create index if not exists learning_path_items_path_id_idx on public.learning_path_items (path_id, order_index);
create index if not exists learning_path_items_lab_id_idx on public.learning_path_items (lab_id);

-- Updated_at triggers
create or replace function public.learning_paths_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.learning_path_items_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_learning_paths_set_updated_at on public.learning_paths;
create trigger trg_learning_paths_set_updated_at
before update on public.learning_paths
for each row
execute function public.learning_paths_set_updated_at();

drop trigger if exists trg_learning_path_items_set_updated_at on public.learning_path_items;
create trigger trg_learning_path_items_set_updated_at
before update on public.learning_path_items
for each row
execute function public.learning_path_items_set_updated_at();

-- Function to update learning path progress when items complete
create or replace function public.update_learning_path_progress()
returns trigger as $$
declare
  total_items integer;
  completed_items integer;
  new_progress numeric;
  all_completed boolean;
begin
  -- Count total and completed items for this path
  select count(*), count(*) filter (where status = 'completed')
  into total_items, completed_items
  from public.learning_path_items
  where path_id = NEW.path_id;
  
  -- Calculate progress percentage
  new_progress := case 
    when total_items > 0 then (completed_items::numeric / total_items::numeric) * 100
    else 0
  end;
  
  -- Check if all items are completed
  all_completed := (completed_items = total_items and total_items > 0);
  
  -- Update the learning path
  update public.learning_paths
  set 
    progress = new_progress,
    status = case 
      when all_completed then 'completed'
      when completed_items > 0 then 'in-progress'
      else 'not-started'
    end,
    completed_at = case 
      when all_completed and completed_at is null then now()
      else completed_at
    end
  where id = NEW.path_id;
  
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_update_learning_path_progress on public.learning_path_items;
create trigger trg_update_learning_path_progress
after update or insert on public.learning_path_items
for each row
execute function public.update_learning_path_progress();

-- RLS Policies
alter table public.learning_paths enable row level security;
alter table public.learning_path_items enable row level security;

-- Learning paths policies
drop policy if exists "Learning paths are readable by owner" on public.learning_paths;
create policy "Learning paths are readable by owner"
  on public.learning_paths
  for select
  using (auth.uid() = user_id);

drop policy if exists "Learning paths are insertable by owner" on public.learning_paths;
create policy "Learning paths are insertable by owner"
  on public.learning_paths
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Learning paths are updatable by owner" on public.learning_paths;
create policy "Learning paths are updatable by owner"
  on public.learning_paths
  for update
  using (auth.uid() = user_id);

drop policy if exists "Learning paths are deletable by owner" on public.learning_paths;
create policy "Learning paths are deletable by owner"
  on public.learning_paths
  for delete
  using (auth.uid() = user_id);

-- Learning path items policies (can read if owner of the path)
drop policy if exists "Learning path items are readable by path owner" on public.learning_path_items;
create policy "Learning path items are readable by path owner"
  on public.learning_path_items
  for select
  using (
    exists (
      select 1 from public.learning_paths
      where id = learning_path_items.path_id
      and user_id = auth.uid()
    )
  );

drop policy if exists "Learning path items are insertable by path owner" on public.learning_path_items;
create policy "Learning path items are insertable by path owner"
  on public.learning_path_items
  for insert
  with check (
    exists (
      select 1 from public.learning_paths
      where id = learning_path_items.path_id
      and user_id = auth.uid()
    )
  );

drop policy if exists "Learning path items are updatable by path owner" on public.learning_path_items;
create policy "Learning path items are updatable by path owner"
  on public.learning_path_items
  for update
  using (
    exists (
      select 1 from public.learning_paths
      where id = learning_path_items.path_id
      and user_id = auth.uid()
    )
  );

drop policy if exists "Learning path items are deletable by path owner" on public.learning_path_items;
create policy "Learning path items are deletable by path owner"
  on public.learning_path_items
  for delete
  using (
    exists (
      select 1 from public.learning_paths
      where id = learning_path_items.path_id
      and user_id = auth.uid()
    )
  );
