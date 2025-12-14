alter table public.profiles
add column if not exists onboarding_complete boolean not null default false,
add column if not exists onboarding_data jsonb;

create index if not exists profiles_onboarding_complete_idx
  on public.profiles (onboarding_complete);
