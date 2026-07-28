# Sales + Supply Chain ERP Lite Foundation

Updated: 2026-07-28

## Implementation status

The cloud foundation is deployed to the dedicated Supabase project
`American Star Sales Supply Chain` in `us-east-1`.

Completed:

- Latest complete dashboard import migrated and verified: 16,396 rows.
- Shared product classification migrated.
- Supabase Auth profile, roles, and user access scopes deployed.
- Master data deployed for business units, warehouses, products, items,
  suppliers, sourcing policy, and UOM conversions.
- Operational foundations deployed for inventory, purchase orders, BOM,
  forecast versions/lines, and MRP runs/recommendations.
- RLS enabled on all application tables.
- Supabase security and performance advisors pass with no issues.
- The web app has a non-blocking account panel and requires an authorized role
  for Excel uploads and shared-configuration writes.

Pending before enforcing account-only dashboard access:

- Provision the first administrator account.
- Assign roles and data scopes to each user.
- Remove transitional anonymous dashboard read access after account rollout.

## Decision

The current storage model is good for a shared dashboard, but it is not sufficient as the long-term system of record for Forecast, BOM, MRP, and user-based access control.

We will keep the current dashboard tables as a raw import and audit layer:

- `public.dashboard_imports`
- `public.sales_order_rows`
- `public.dashboard_shared_config`

We will add a new operational layer for the future application instead of overloading raw JSON sales rows.

## Why the current model is not enough

Current data is stored as imported line snapshots plus `jsonb` payloads. That works for analytics restoration, but not for operational planning. Forecast, BOM, and MRP need stable relational keys and transaction-level planning tables.

Examples of missing capabilities in the current model:

- No product master with one stable ID per product family/SKU
- No component master or BOM structure
- No inventory by warehouse and date
- No supplier policy such as lead time, MOQ, lot size, or preferred source
- No purchase order or inbound supply model
- No forecast versioning, override workflow, or approval history
- No user-role access model for restricting what each account can view or edit

## Target architecture

### 1. Raw and audit layer

Keep the existing public dashboard tables for:

- import history
- browser restore
- analytics fallback
- source traceability

This layer remains read-friendly for the dashboard.

### 2. Operational data layer

Use normalized operational tables in the exposed `public` schema, with explicit
Data API grants and RLS on every table. Security helper functions live in the
non-exposed `app_private` schema.

This layer becomes the source of truth for supply-chain planning and controlled
editing.

### 3. Access model

Move away from anonymous write access for operational data.

Target model:

- Supabase Auth for login
- publishable key in browser
- RLS on every exposed table
- role and scope tables to control what each user can read or update
- Edge Functions for sensitive workflows such as bulk import, MRP run, and approvals

### 4. Reporting model

Dashboard pages can continue reading from:

- raw imports for legacy views
- operational tables or SQL views for new supply-chain modules

## Recommended implementation path

### Phase 1. Stabilize the platform

- Keep the current dashboard working
- Stop expanding `anon` write access for new modules
- Introduce normalized operational tables and a private authorization-helper schema
- Introduce user profiles and access scopes
- Separate raw import from operational planning tables

### Phase 2. Master data

Build controlled master data first:

- product family
- sellable SKU
- component item
- warehouse
- supplier
- supplier-item policy
- UOM and conversion rules

Without this layer, BOM and MRP will not stay consistent.

### Phase 3. Forecast

Add versioned demand planning:

- baseline forecast
- sales override
- approved forecast
- scenario support: base, upside, downside

Forecast should be stored by planning grain, not derived on demand only in the browser.

### Phase 4. BOM

Add BOM structures:

- header per finished good
- lines per component
- effectivity dates
- yield and scrap factor
- default sourcing or substitute options

### Phase 5. MRP

Add supply planning:

- on-hand inventory
- open supply
- demand by period
- net requirement
- planned order recommendation
- buy / build / expedite flags

MRP should run server-side so every user sees the same result.

### Phase 6. Role-based application

Recommended roles:

- `admin`
- `sales_admin`
- `supply_admin`
- `planner`
- `sales_user`
- `viewer`

Recommended scope controls:

- by salesperson
- by customer group
- by warehouse
- by business unit

## Data domains to build

### Identity and security

- `ops.user_profiles`
- `ops.user_access_scopes`

### Product and master data

- `ops.product_master`
- `ops.item_master`
- `ops.product_item_map`
- `ops.uom_conversion`

### Supply chain structure

- `ops.bom_header`
- `ops.bom_line`
- `ops.warehouse`
- `ops.inventory_balance`
- `ops.inventory_snapshot`

### Supplier and procurement

- `ops.supplier`
- `ops.supplier_item_policy`
- `ops.purchase_order_header`
- `ops.purchase_order_line`
- `ops.inbound_supply`

### Planning

- `ops.forecast_version`
- `ops.forecast_line`
- `ops.mrp_run`
- `ops.mrp_recommendation`

## Final recommendation

Best path for this app:

1. Keep the current dashboard storage as raw/staging only.
2. Build a new normalized `ops` schema for the real application.
3. Add Supabase Auth and RLS before building operational screens.
4. Run Forecast, BOM, and MRP on shared server-side logic, not browser-only logic.

This gives the safest route from dashboard to a real Sales + Supply Chain system without throwing away the work already done.
