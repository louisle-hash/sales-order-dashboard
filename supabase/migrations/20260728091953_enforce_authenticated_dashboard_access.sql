-- End the transitional public-read phase. Dashboard data is now available
-- only to authenticated, active accounts through the existing RLS policies.
drop policy if exists dashboard_anon_read_imports
  on public.dashboard_imports;
drop policy if exists dashboard_anon_read_rows
  on public.sales_order_rows;
drop policy if exists dashboard_anon_read_shared_config
  on public.dashboard_shared_config;

revoke select on public.dashboard_imports from anon;
revoke select on public.sales_order_rows from anon;
revoke select on public.dashboard_shared_config from anon;
