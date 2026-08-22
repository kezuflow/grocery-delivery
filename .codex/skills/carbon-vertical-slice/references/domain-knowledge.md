# Domain Knowledge

The product is a weekly grocery subscription and delivery system. Customers choose plans with
weekly fees and included product-credit budgets; carts lock Friday night for weekend delivery.
Unused credit expires. Weekly charges include plan fee, cart overage, and configured service-zone
delivery fee.

SKU price is procurement cost plus markup, with per-SKU overrides. Cost, markup, fees, and order
lines are snapshotted at lock and cannot be edited afterward. Procurement supports STOCKED,
DEMAND_DRIVEN, and MIXED modes; shortages require an approved equal-value substitute or line-item
refund.

Roles are `customer`, `deliveryman`, and `admin`. Admin permissions include catalog, pricing,
finance, procurement, packing, dispatch, support, reporting, staff, and superadmin. The owned fleet
is dispatched by admins. Timestamps are UTC; cycle assignment uses `Asia/Manila`. Money is integer
PHP centavos. Payment, refund, order, subscription, dispatch, and identity writes are
idempotent and auditable.
