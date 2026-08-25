# Marketplace Components

These are the reusable components required by the current customer marketplace. Components remain presentation-focused; API calls, sessions, permissions, and business rules stay in features or routes.

## Marketplace shell

Purpose: persistent customer context. Anatomy: wordmark, location, fulfillment mode, search, account, cart, responsive navigation. Variants: desktop, mobile, signed-out, signed-in. States: cart count, offline, open drawer. Use on every customer marketplace route.

## Location control

Purpose: expose the active delivery address. Show recipient/location summary and serviceability. Open account/address flow rather than inventing address state. Use a minimum 44px target and an accessible name.

## Search field

Purpose: primary discovery entry. 44-48px height, leading search icon, clear action when populated, submitted query preserved in URL. Mobile stays full-width in the header. Do not use for admin navigation.

## Category rail

Purpose: preserve browse context. Horizontal scroll, active state, optional icon/media, keyboard reachable. Use text labels for grocery categories; do not make every category a decorative card.

## Filter and sort controls

Purpose: narrow a result set. Filters use compact controls; the applied state is visible near results. On mobile open a bottom sheet; on desktop use a popover or side sheet. Include clear-all and disabled states.

## Promotion module

Purpose: communicate one actionable offer. Use real server banner data where available, otherwise Carbon fallback assets. Limit visible modules. Always provide meaningful alt text and a clear destination.

## Product card

Purpose: fast product comparison and add-to-cart. Anatomy: stable media, name, unit, price, availability, add/quantity action. Variants: compact rail, grid, unavailable, discounted. Keep metadata concise. The add control must be keyboard accessible and at least 40px.

## Product detail surface

Purpose: progressive disclosure for description, imagery, unit/weight, substitutions, quantity, and add action. Desktop may use a page or dialog; mobile may use a bottom sheet. Preserve the feature's existing cart mutation and subscription guards.

## Quantity control

Purpose: change an existing cart line. Anatomy: decrement, quantity, increment. Use stable dimensions, disabled/pending state, accessible label, and minimum 40-44px touch targets. Never calculate prices locally.

## Cart drawer and cart page

Purpose: give immediate cart feedback and a complete review surface. Drawer is a preview; cart page owns substitution controls, adjustments, subtotal, and checkout navigation. Empty cart has one browse action.

## Checkout section

Purpose: one step of address, delivery, promotion, payment, or review. Use selectable rows, inline validation, pending feedback, and a sticky order summary. The final action uses the server quote and idempotent mutation already provided by the feature.

## Order summary

Purpose: make the payable amount legible. Show subtotal, discounts, credit, overage, delivery fee, weekly fee, and total using server values. Keep the final CTA adjacent to the total.

## Delivery status tracker

Purpose: communicate the current fulfillment state. Show current state, window/ETA, event timeline, support action, and receipt. A map is optional supporting context.

## Account navigation

Purpose: move between shopping, orders, saved items, subscription, addresses, and support. Use the marketplace shell and focused page sections. Do not rebuild the generic admin navigation.

## Feedback primitives

Use existing `Skeleton`, `EmptyState`, `ErrorState`, `StatusPill`, `Dialog`, and `Sheet` primitives. Add marketplace variants only when their semantics differ. Every mutation reports pending, success, recoverable error, and retry where applicable.
