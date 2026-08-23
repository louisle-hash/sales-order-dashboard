-- Shared planning parameters entered directly from the MRP screen.
-- Part Number is the durable business key because the current operational
-- layer still consumes versioned Fishbowl Part Master imports.

create table if not exists public.mrp_item_policies (
  normalized_part_number text primary key,
  part_number text not null,
  lead_time_days integer
    check (lead_time_days is null or lead_time_days >= 0),
  moq_qty numeric(24, 6)
    check (moq_qty is null or moq_qty >= 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  check (btrim(normalized_part_number) <> ''),
  check (btrim(part_number) <> '')
);

drop trigger if exists mrp_item_policies_touch_updated_at
  on public.mrp_item_policies;
create trigger mrp_item_policies_touch_updated_at
before update on public.mrp_item_policies
for each row execute function app_private.touch_updated_at();

alter table public.mrp_item_policies enable row level security;

drop policy if exists active_users_read_mrp_item_policies
  on public.mrp_item_policies;
create policy active_users_read_mrp_item_policies
on public.mrp_item_policies for select to authenticated
using ((select app_private.is_active_user()));

drop policy if exists planning_roles_insert_mrp_item_policies
  on public.mrp_item_policies;
create policy planning_roles_insert_mrp_item_policies
on public.mrp_item_policies for insert to authenticated
with check (
  updated_by = (select auth.uid())
  and (select app_private.has_any_role(
    array['admin', 'supply_admin', 'planner']::text[]
  ))
);

drop policy if exists planning_roles_update_mrp_item_policies
  on public.mrp_item_policies;
create policy planning_roles_update_mrp_item_policies
on public.mrp_item_policies for update to authenticated
using (
  (select app_private.has_any_role(
    array['admin', 'supply_admin', 'planner']::text[]
  ))
)
with check (
  updated_by = (select auth.uid())
  and (select app_private.has_any_role(
    array['admin', 'supply_admin', 'planner']::text[]
  ))
);

revoke all on public.mrp_item_policies from anon;
revoke all on public.mrp_item_policies from authenticated;
grant select, insert, update on public.mrp_item_policies to authenticated;
