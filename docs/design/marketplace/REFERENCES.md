# Marketplace Research References

Mobbin was used as a research dataset for DoorDash's web customer marketplace. The references below are representative saturated groups, not copied screens or assets.

## Discovery and browse

### Reference

[DoorDash browse category flow](https://mobbin.com/flows/cac7afe0-c653-4048-ba71-780ad38e7616), [browse all flow](https://mobbin.com/flows/82296b38-7e9e-4509-a07a-efad8c1e271b), and [home flow](https://mobbin.com/flows/ee9618ed-3c43-4adf-b698-ebc919a7e889).

### Why It Matters

The home experience combines persistent location/search context, category rails, limited promotions, and repeated product/store modules without making the page a single undifferentiated grid.

### Principles Extracted

Keep context persistent; organize discovery into labeled rails; make category entry points compact; use `See all` as a predictable escape hatch.

### Adaptation

Carbon uses grocery aisles, produce collections, weekly campaigns, and product rails. The same hierarchy supports fresh produce and pantry shopping.

### Do Not Copy

Do not copy DoorDash red, logos, restaurant imagery, exact copy, or proprietary promotional art.

## Search and filtering

### Reference

[DoorDash filtering items flow](https://mobbin.com/flows/e5a9fa49-2c63-4e38-8ab1-5d9eacf18f93), [searching items by list](https://mobbin.com/flows/64576f73-4cc4-46c7-9694-b8f291ce4756), and [searching market](https://mobbin.com/flows/f24595cf-abe7-455e-b427-39288d222869).

### Why It Matters

Results retain the search context, expose active filters, and use category changes to move from broad intent to actionable products.

### Principles Extracted

Keep query and filters visible, use a small set of high-value controls, preserve result density, and make no-result recovery obvious.

### Adaptation

Carbon prioritizes category, price, availability, unit, and sort. Search remains URL-backed through the existing catalog query parser.

## Grocery store and item detail

### Reference

[DoorDash market detail](https://mobbin.com/flows/574c9430-44d3-40b4-9605-305e6990d11d), [grocery item details](https://mobbin.com/flows/3ce0bff7-a442-47ab-8da8-7b0b75d25e06), and [store details](https://mobbin.com/flows/c1d56dd4-1694-46e4-9595-e944dbe6761c).

### Why It Matters

The product identity, store/category hierarchy, promotional context, item detail, and add action are progressively disclosed.

### Principles Extracted

Expose identity and price first, keep detail scannable, put add controls near the price, and make availability visible.

### Adaptation

Carbon translates merchant/store patterns into market categories, source/freshness context, substitutions, per-piece/per-pack/per-weight units, and seasonal availability.

## Cart and checkout

### Reference

[DoorDash placing an order flow](https://mobbin.com/flows/7f3299cb-8374-42f7-b2c6-16394ed74ed6) and [carts flow](https://mobbin.com/flows/46e17b83-1813-4cd0-943e-a0e12bd64ad6).

### Why It Matters

Checkout keeps address, delivery timing, payment, order summary, fees, and final action in a decisive composition.

### Principles Extracted

Group steps by user decision, keep totals visible, explain fees, and make the final action state-dependent.

### Adaptation

Carbon preserves its server quote, subscription eligibility, delivery windows, payment references, and idempotent order/payment flow.

## Tracking and orders

### Reference

[DoorDash order detail flow](https://mobbin.com/flows/fd49d560-1eb8-4372-b7bc-b34cfcc47e8a), [orders flow](https://mobbin.com/flows/7d95f692-87d1-422f-9be1-466aeb079edd), and [address editing flow](https://mobbin.com/flows/e640858f-3163-46db-bff8-95aab8e78adc).

### Why It Matters

Status, timing, receipt, support, and repeat purchase are treated as one post-purchase system.

### Principles Extracted

Lead with current status, retain order context, make support discoverable, and keep reorder close to completed orders.

### Adaptation

Carbon uses its existing tracking events, proof media, order requests, receipts, and reorder behavior.
