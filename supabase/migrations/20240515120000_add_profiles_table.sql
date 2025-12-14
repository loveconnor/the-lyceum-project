-- Create profiles table to store user names and avatar separate from auth metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

create or replace function public.handle_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.handle_profiles_updated_at();

-- Enable RLS and add basic policies for authenticated users to manage their own profile row
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owners" on public.profiles;
create policy "Profiles are viewable by owners" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Profiles can be inserted by owners" on public.profiles;
create policy "Profiles can be inserted by owners" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Profiles can be updated by owners" on public.profiles;
create policy "Profiles can be updated by owners" on public.profiles
  for update using (auth.uid() = id);
