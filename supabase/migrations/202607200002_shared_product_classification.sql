-- Shared product classification for every browser using the dashboard.
-- Anonymous writes are temporary until the administrator login is enabled.

create table if not exists public.dashboard_shared_config (
  id text primary key,
  product_mappings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(product_mappings) = 'object'),
  parent_groups jsonb not null default '[]'::jsonb
    check (jsonb_typeof(parent_groups) = 'array'),
  category_definitions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(category_definitions) = 'array'),
  updated_at timestamptz not null default now(),
  constraint dashboard_shared_config_singleton
    check (id = 'product-classification')
);

alter table public.dashboard_shared_config enable row level security;

drop policy if exists "dashboard anon read shared config"
  on public.dashboard_shared_config;
create policy "dashboard anon read shared config"
  on public.dashboard_shared_config
  for select to anon
  using (id = 'product-classification');

drop policy if exists "dashboard anon insert shared config"
  on public.dashboard_shared_config;
create policy "dashboard anon insert shared config"
  on public.dashboard_shared_config
  for insert to anon
  with check (id = 'product-classification');

drop policy if exists "dashboard anon update shared config"
  on public.dashboard_shared_config;
create policy "dashboard anon update shared config"
  on public.dashboard_shared_config
  for update to anon
  using (id = 'product-classification')
  with check (id = 'product-classification');

grant select, insert, update on public.dashboard_shared_config to anon;

