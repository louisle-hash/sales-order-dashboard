-- Split write policies from read policies so PostgreSQL evaluates only one
-- permissive SELECT policy for each authenticated request.

drop policy if exists admins_manage_scopes on public.user_access_scopes;

create policy admins_insert_scopes
on public.user_access_scopes for insert to authenticated
with check ((select app_private.current_user_role()) = 'admin');

create policy admins_update_scopes
on public.user_access_scopes for update to authenticated
using ((select app_private.current_user_role()) = 'admin')
with check ((select app_private.current_user_role()) = 'admin');

create policy admins_delete_scopes
on public.user_access_scopes for delete to authenticated
using ((select app_private.current_user_role()) = 'admin');

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'business_units',
    'warehouses',
    'product_master',
    'item_master',
    'product_item_map',
    'uom_conversions',
    'suppliers',
    'supplier_item_policy',
    'inventory_balance',
    'inventory_snapshot',
    'purchase_order_header',
    'purchase_order_line',
    'bom_header',
    'bom_line'
  ]
  loop
    execute format('drop policy if exists supply_roles_manage on public.%I', target_table);
    execute format('drop policy if exists supply_roles_insert on public.%I', target_table);
    execute format('drop policy if exists supply_roles_update on public.%I', target_table);
    execute format('drop policy if exists supply_roles_delete on public.%I', target_table);

    execute format(
      'create policy supply_roles_insert on public.%I for insert to authenticated with check ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[])))',
      target_table
    );
    execute format(
      'create policy supply_roles_update on public.%I for update to authenticated using ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[]))) with check ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[])))',
      target_table
    );
    execute format(
      'create policy supply_roles_delete on public.%I for delete to authenticated using ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[])))',
      target_table
    );
  end loop;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'forecast_version',
    'forecast_line',
    'mrp_run',
    'mrp_recommendation'
  ]
  loop
    execute format('drop policy if exists planning_roles_manage on public.%I', target_table);
    execute format('drop policy if exists planning_roles_insert on public.%I', target_table);
    execute format('drop policy if exists planning_roles_update on public.%I', target_table);
    execute format('drop policy if exists planning_roles_delete on public.%I', target_table);

    execute format(
      'create policy planning_roles_insert on public.%I for insert to authenticated with check ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[])))',
      target_table
    );
    execute format(
      'create policy planning_roles_update on public.%I for update to authenticated using ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[]))) with check ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[])))',
      target_table
    );
    execute format(
      'create policy planning_roles_delete on public.%I for delete to authenticated using ((select app_private.has_any_role(array[''admin'', ''supply_admin'', ''planner'']::text[])))',
      target_table
    );
  end loop;
end
$$;
