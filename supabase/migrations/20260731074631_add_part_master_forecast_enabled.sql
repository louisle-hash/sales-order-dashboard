-- Make the user-controlled Forecast flag queryable without reading the JSON payload.
-- Existing imports are backfilled so older cloud revisions remain compatible.

alter table public.part_master_rows
  add column if not exists forecast_enabled boolean not null default false;

update public.part_master_rows
set forecast_enabled = upper(trim(coalesce(payload->>'Forecast', ''))) = 'YES'
where forecast_enabled is distinct from (
  upper(trim(coalesce(payload->>'Forecast', ''))) = 'YES'
);

create index if not exists part_master_rows_forecast_enabled_idx
  on public.part_master_rows(forecast_enabled)
  where forecast_enabled;
