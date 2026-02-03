alter table public.learning_paths
  add column if not exists web_sources jsonb not null default '[]'::jsonb;
