-- Source Registry Tables for Source Discovery + Validation Service
-- This stores metadata about trusted sources, NOT full content

-- Sources table: represents source providers (OpenStax, Python docs, etc.)
create table if not exists public.source_registry_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('openstax', 'sphinx_docs', 'generic_html', 'custom')),
  base_url text not null,
  description text,
  license_name text,
  license_url text,
  license_confidence real check (license_confidence >= 0 and license_confidence <= 1),
  robots_status text not null default 'unknown' check (robots_status in ('allowed', 'disallowed', 'partial', 'unknown', 'needs_review')),
  rate_limit_per_minute integer not null default 30,
  user_agent text not null default 'LyceumSourceRegistryBot/1.0',
  last_scan_at timestamptz,
  scan_status text check (scan_status in ('idle', 'scanning', 'completed', 'failed')),
  scan_error text,
  config jsonb, -- adapter-specific configuration
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assets table: individual scannable resources (books, documentation versions)
create table if not exists public.source_registry_assets (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.source_registry_sources (id) on delete cascade,
  slug text not null, -- unique identifier within source (e.g., "calculus-volume-1" for OpenStax)
  title text not null,
  url text not null,
  description text,
  version text, -- for versioned docs
  license_name text,
  license_url text,
  license_confidence real check (license_confidence >= 0 and license_confidence <= 1),
  robots_status text not null default 'unknown' check (robots_status in ('allowed', 'disallowed', 'partial', 'unknown', 'needs_review')),
  active boolean not null default false, -- must be manually activated
  toc_extraction_success boolean,
  toc_stats jsonb, -- {chapters: N, sections: N, total_nodes: N}
  selector_hints jsonb, -- CSS selectors for future content extraction
  last_scan_at timestamptz,
  scan_status text check (scan_status in ('idle', 'scanning', 'completed', 'failed')),
  scan_error text,
  validation_report jsonb, -- stores full validation report
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, slug)
);

-- Nodes table: TOC hierarchy (chapters, sections, etc.)
-- This stores structure ONLY, not full content
create table if not exists public.source_registry_nodes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.source_registry_assets (id) on delete cascade,
  parent_id uuid references public.source_registry_nodes (id) on delete cascade,
  slug text not null, -- unique within asset
  title text not null,
  url text not null,
  node_type text not null check (node_type in ('root', 'part', 'chapter', 'section', 'subsection', 'page', 'other')),
  depth integer not null default 0,
  sort_order integer not null default 0,
  selector_hints jsonb, -- CSS selectors for content extraction
  metadata jsonb, -- any extra metadata (e.g., page numbers, estimated reading time)
  created_at timestamptz not null default now(),
  unique(asset_id, slug)
);

-- Scan logs for auditing
create table if not exists public.source_registry_scan_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.source_registry_sources (id) on delete set null,
  asset_id uuid references public.source_registry_assets (id) on delete set null,
  action text not null check (action in ('discover', 'validate', 'map_toc', 'activate', 'deactivate', 'error')),
  status text not null check (status in ('started', 'completed', 'failed', 'skipped')),
  message text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index if not exists source_registry_sources_type_idx on public.source_registry_sources (type);
create index if not exists source_registry_sources_scan_status_idx on public.source_registry_sources (scan_status);
create index if not exists source_registry_assets_source_id_idx on public.source_registry_assets (source_id);
create index if not exists source_registry_assets_active_idx on public.source_registry_assets (active);
create index if not exists source_registry_assets_scan_status_idx on public.source_registry_assets (scan_status);
create index if not exists source_registry_nodes_asset_id_idx on public.source_registry_nodes (asset_id);
create index if not exists source_registry_nodes_parent_id_idx on public.source_registry_nodes (parent_id);
create index if not exists source_registry_nodes_slug_idx on public.source_registry_nodes (asset_id, slug);
create index if not exists source_registry_scan_logs_source_id_idx on public.source_registry_scan_logs (source_id, created_at desc);
create index if not exists source_registry_scan_logs_asset_id_idx on public.source_registry_scan_logs (asset_id, created_at desc);
create index if not exists source_registry_scan_logs_created_at_idx on public.source_registry_scan_logs (created_at desc);

-- Updated_at trigger function (reuse if exists)
create or replace function public.source_registry_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Updated_at triggers
drop trigger if exists trg_source_registry_sources_updated_at on public.source_registry_sources;
create trigger trg_source_registry_sources_updated_at
before update on public.source_registry_sources
for each row
execute function public.source_registry_set_updated_at();

drop trigger if exists trg_source_registry_assets_updated_at on public.source_registry_assets;
create trigger trg_source_registry_assets_updated_at
before update on public.source_registry_assets
for each row
execute function public.source_registry_set_updated_at();

-- RLS Policies
-- Source registry is admin/service-only, no user access needed
-- We use service role key for all operations

alter table public.source_registry_sources enable row level security;
alter table public.source_registry_assets enable row level security;
alter table public.source_registry_nodes enable row level security;
alter table public.source_registry_scan_logs enable row level security;

-- Service role policies (allow all for service role)
drop policy if exists "Service role full access to sources" on public.source_registry_sources;
create policy "Service role full access to sources"
  on public.source_registry_sources
  for all
  using (true)
  with check (true);

drop policy if exists "Service role full access to assets" on public.source_registry_assets;
create policy "Service role full access to assets"
  on public.source_registry_assets
  for all
  using (true)
  with check (true);

drop policy if exists "Service role full access to nodes" on public.source_registry_nodes;
create policy "Service role full access to nodes"
  on public.source_registry_nodes
  for all
  using (true)
  with check (true);

drop policy if exists "Service role full access to scan_logs" on public.source_registry_scan_logs;
create policy "Service role full access to scan_logs"
  on public.source_registry_scan_logs
  for all
  using (true)
  with check (true);

-- Comment on tables for documentation
comment on table public.source_registry_sources is 'Trusted source providers for Lyceum content grounding. Does NOT store full content.';
comment on table public.source_registry_assets is 'Individual scannable resources (textbooks, doc versions). Only metadata and TOC structure.';
comment on table public.source_registry_nodes is 'TOC hierarchy for assets. Stores structure (titles, URLs) not full content.';
comment on table public.source_registry_scan_logs is 'Audit log for all registry scan operations.';

