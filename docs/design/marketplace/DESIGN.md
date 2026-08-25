# Carbon Marketplace Design

This is the implementation authority for Carbon's customer-facing grocery marketplace. It applies to `/shop`, `/shop/[slug]`, and customer shopping flows under `/account`. It does not apply to the marketing site, admin dashboard, delivery console, or backend services.

## Marketplace Design Philosophy

Make the next useful shopping action obvious. The marketplace is a calm, image-led grocery tool: fast to scan, clear about price and unit, and transparent about delivery and availability. Use DoorDash/Mobbin as research evidence, not as a visual source to copy.

## Product Character

- Transactional first, with enough merchandising to support discovery.
- Warm, fresh, and local through Carbon's green and produce imagery.
- Dense enough for repeat shopping, spacious enough for touch use.
- Text-led for price, unit, availability, and delivery; image-led for discovery.
- Restrained surfaces with one primary accent and no decorative gradients.

## Core Principles

1. Preserve context: delivery address, fulfillment mode, search, and cart remain easy to reach.
2. Reduce decision cost: expose name, price, unit, freshness/availability, and add action together.
3. Progressive disclosure: keep browse lightweight; use detail sheets/pages for substitutions and complex options.
4. Server truth wins: never reimplement prices, totals, fees, availability, status, or eligibility in the UI.
5. Every commerce action has loading, disabled, success, retry, empty, and error states.
6. Reuse archetypes and primitives. Do not design individual marketplace pages independently.

## Information Hierarchy

1. Current location and delivery promise.
2. Search and category context.
3. Primary shopping intent: featured, category, or query result.
4. Product identity, price, unit, and availability.
5. Secondary metadata: source, substitution, savings, and supporting detail.
6. Tertiary actions: save, support, and account management.

## Navigation

Desktop uses a compact top bar with Carbon wordmark, address, delivery mode, search, account, and cart. A narrow left rail is allowed for primary shopping areas only. Mobile uses a two-row header when needed and a four-item bottom bar: Shop, Aisles, Orders, Account. Contextual back links belong inside detail, cart, checkout, and order flows.

## Marketplace Shell

The shell owns the persistent header, delivery context, search entry, account/cart overlays, responsive navigation, online status, and page container. It must not own catalog fetching or cart mutation. Customer account pages use the same shell language even when their content is form- or order-heavy.

## Page Archetypes

### Discovery

Context -> search -> one or two promotional modules -> category rail -> curated product rails -> broader catalog.

### Browse

Title/context -> horizontal category rail -> applied filters -> result count/sort -> product grid or rail -> pagination.

### Product Detail

Image -> category -> title -> description -> price/unit -> availability/substitution -> quantity -> sticky add action.

### Cart

Items -> quantity/substitution controls -> availability adjustments -> server subtotal -> checkout action.

### Checkout

Address -> delivery window -> promotion -> payment -> server quote -> decisive place-order action.

### Order Tracking

Current status -> delivery window/ETA -> timeline -> receipt -> support/reorder.

### Account / Orders

Account navigation -> subscription, address, saved cart, orders, payments, support, and privacy in focused sections.

## Typography

Use the existing Carbon display and text fonts. Marketplace headings use sentence case, 600-800 weight, and `text-wrap: balance`. Body copy stays within roughly 65 characters where possible. Prices use tabular figures and strong contrast. Metadata is 12-13px with muted color. Labels are sentence case; avoid all-caps except compact eyebrow labels.

Recommended hierarchy: page title 32-44px; section title 18-24px; product title 13-16px; price 16-22px; metadata 12-13px; helper text 12-14px; primary control text 13-15px.

## Color

Use Carbon semantic tokens. Canvas is white or very light neutral, surfaces are white, secondary surfaces are cool neutral, text is near-black, and the green accent is reserved for active/primary commerce actions and success. Coral is a price/promotion emphasis only. Warning and danger communicate state, never decoration. Do not use DoorDash red.

## Spacing

Use a 4px base rhythm. Common gaps are 8, 12, 16, 24, 32, and 48px. Mobile gutters are 16px; desktop content gutters are 24-32px. Product card gaps are 12-16px. Section gaps are 32-48px. Checkout groups use 24px between sections.

## Density and Layout

Use a max-width of 1440px for the marketplace content area. Discovery rails scroll horizontally on small screens and may expand to a grid on desktop. Browse results use 2 columns on narrow phones, 3-4 on tablets, and 5-7 compact columns on wide desktop when imagery and labels remain legible. Do not force equal-height cards.

## Shape Language and Surfaces

Controls use 8-12px radius. Product media uses 12-16px radius. Sheets and dialogs use 16-24px radius. Pills are reserved for filters, status, and compact categorical context. Avoid pill-shaped buttons for every action. Prefer borders and spacing over shadows; use a soft shadow only for floating overlays, sticky cart bars, and dialogs.

## Imagery

Product imagery is object-centered, stable in aspect ratio, and uses `object-contain` for packaged goods and `object-cover` for lifestyle or store imagery. Keep the subject inspectable. Use committed Carbon assets or stable configured media URLs. Always reserve image space and provide meaningful alt text.

## Iconography

Use the existing Lucide set at a consistent 1.8-2px stroke. Icon-only controls require an accessible label and tooltip/title. Quantity controls, chevrons, search, location, cart, order, and account icons should remain familiar and visually quiet.

## Search, Discovery, Categories, and Filters

Search is always available in the shell. Query results preserve the query and show active filters near the result count. Use a small set of high-value filters: category, price, availability, and sorting. Categories are horizontal and scrollable, with the active state visually obvious. Promotional modules should be limited, contextual, and tied to a real action.

## Product Cards and Detail

Product cards show image, product name, unit, server price, availability, and one add/quantity action. Do not overload cards with descriptions or badges. Grocery detail must make per-piece, per-pack, per-kg, approximate-weight, and substitution implications explicit. The add action remains reachable on mobile.

## Pricing, Availability, Quantity, and Cart

Show server prices with currency and unit together. Discounted pricing may show original price and savings, but never obscure the actual payable amount. Availability is a state, not a decoration: in stock, low stock, unavailable, seasonal, and substitution-required are distinct. Quantity controls have a stable 40px minimum touch target. Cart adjustments must explain stale price or availability changes and offer retry.

## Checkout, Address, Delivery, and Subscription

Checkout is a focused two-column desktop layout and a stacked mobile flow. The summary remains visible or sticky on desktop and becomes a fixed bottom action region on mobile. Addresses use selectable rows with serviceability status. Delivery windows expose remaining capacity and disabled/full states. Subscription UI explains weekly fee, product credit, trial, pause/skip, and effective cycle without hiding the marketplace cart.

## Order Tracking and Account

Order tracking uses a clear current status, timestamp, delivery window, and chronological events. Map media is optional and must not replace status text. Orders support detail, receipt, support, and reorder. Account uses focused sections and links rather than a generic dashboard grid.

## Forms, Modals, Drawers, Bottom Sheets, and Feedback

Use inline form errors and visible focus rings. Use a dialog for confirmation or complex item detail, a drawer for cart/account navigation, and a bottom sheet for mobile item options or filters. Avoid modalizing routine edits. Toasts communicate short-lived mutation results; durable validation belongs near the field or action.

## Loading, Empty, Errors, and Accessibility

Skeletons match the final card/list geometry. Empty states explain what happens next and provide one action. Errors state what failed and expose retry when recoverable. Use semantic headings, labels, live regions for mutations, keyboard reachability, 44px touch targets, reduced-motion support, and sufficient contrast.

## Responsive Behavior

Mobile is touch-first: two-column product grids, horizontal rails, sticky bottom actions, sheets for filters/detail, and compact headers. Desktop uses productive whitespace, persistent context, compact product density, and sticky side summaries. Do not simply scale desktop down.

## Design Tokens

Marketplace-specific semantic values should be added only when shared tokens cannot express the meaning. Current aliases map to Carbon tokens:

```css
--marketplace-canvas: var(--color-market-paper-value);
--marketplace-surface: var(--color-market-paper-value);
--marketplace-surface-subtle: var(--color-market-soft-value);
--marketplace-text-primary: var(--color-market-ink-value);
--marketplace-text-secondary: var(--color-market-muted-value);
--marketplace-border: var(--color-market-line-value);
--marketplace-accent: var(--color-market-green-value);
--marketplace-accent-strong: var(--color-market-green-dark-value);
--marketplace-space-1: 4px;
--marketplace-space-2: 8px;
--marketplace-space-3: 12px;
--marketplace-space-4: 16px;
--marketplace-space-5: 24px;
--marketplace-radius-control: 10px;
--marketplace-radius-card: 14px;
--marketplace-radius-media: 16px;
--marketplace-radius-overlay: 20px;
```

## Anti-Patterns

Do not use generic SaaS dashboards, card-inside-card layouts, DoorDash branding, DoorDash red, arbitrary gradients, excessive pills, unclear units, hidden fees, overloaded product cards, tiny touch targets, scattered checkout information, decorative banners without a commerce action, or marketplace styling in marketing/admin surfaces.
