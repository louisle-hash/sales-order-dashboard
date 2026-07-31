-- Shared monthly drivers for the Excel-style finished-good forecast.
-- The existing shared-config row and its RLS policies continue to govern access.

alter table public.dashboard_shared_config
  add column if not exists forecast_settings jsonb not null
  default '{
    "monthlyFactors": [1, 1, 1.6, 0.81, 0.99, 1, 1.08, 1.06, 0.91, 0.85, 1.2, 1]
  }'::jsonb;

alter table public.dashboard_shared_config
  drop constraint if exists dashboard_shared_config_forecast_settings_object;

alter table public.dashboard_shared_config
  add constraint dashboard_shared_config_forecast_settings_object
  check (jsonb_typeof(forecast_settings) = 'object');
