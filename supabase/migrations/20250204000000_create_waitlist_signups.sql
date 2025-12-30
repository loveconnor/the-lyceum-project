-- Create table to store waitlist signups
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Ensure emails are unique (case-insensitive)
create unique index if not exists waitlist_signups_email_key on public.waitlist_signups (lower(email));

comment on table public.waitlist_signups is 'Email addresses collected from the landing page waitlist.';
comment on column public.waitlist_signups.email is 'User email address';
comment on column public.waitlist_signups.source is 'Optional source tag (e.g., landing, referral code)';
comment on column public.waitlist_signups.metadata is 'Optional JSON metadata';
