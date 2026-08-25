# Marketplace KEEP / REFACTOR / REPLACE Audit

Scope: customer marketplace only. Admin, delivery, marketing, and backend systems are excluded.

## Keep

- `apps/web/src/lib/marketplace.ts`, `catalog.ts`, `catalog-item.ts`, `checkout.ts`, `orders.ts`, and `account.ts` as server-backed data loaders.
- Typed API transport in `apps/web/src/lib/api/client.ts` and runtime transport.
- Catalog query parsing and URL-backed search/filter/sort behavior.
- Cart draft helpers, expected-update timestamps, stale-cart refresh, and server-owned totals.
- Product detail subscription guard and existing product mutation actions.
- Checkout quote, delivery address/window, payment reference, order idempotency, and retry behavior.
- Existing generic accessibility and feedback primitives where their semantics fit.

## Refactor

- Normalize marketplace shell usage across `/shop` and customer `/account` routes.
- Consolidate repeated marketplace spacing, surfaces, controls, and typography into semantic tokens and named primitives.
- Keep route files thin and move reusable presentation into marketplace layout/features.
- Replace dashboard-like account composition with focused marketplace sections while preserving each existing child form/action.
- Align product card, cart, checkout, order, and subscription states to one density and shape language.

## Replace

- The current mixed visual language in marketplace shell, product cards, promotion rails, and product detail presentation.
- Generic account shell treatment on customer shopping flows.
- Excessive pill controls, inconsistent radius, arbitrary campaign colors, and opaque card shadows in customer marketplace surfaces.

## Risks and regression boundaries

Do not change API contracts, business rules, server pricing, authorization, payment provider references, order creation, or persistence as part of the visual migration. Validate cart mutation, stale data, checkout readiness, order payment, and responsive navigation after each slice.

## Local evidence

- `http://localhost:3000/shop` verified at desktop and 390px phone width: shell, search, category rail, fallback campaigns, product rails, cart affordance, and bottom navigation rendered without browser console errors.
- `http://localhost:3000/shop/apple` verified at 390px phone width: back navigation, product image, category, unit-aware price, availability, add-to-cart, and save actions rendered without browser console errors.
- `/account` correctly redirected to `/forbidden` for the unauthenticated local browser session. Protected customer routes were not bypassed; authenticated cart/checkout/order evidence remains pending a customer fixture session.
- API ran locally on `http://127.0.0.1:8788`; existing web dev server ran on `http://localhost:3000`.

## Current slice status

The foundation slice is locally verified and includes marketplace semantic tokens, shared page shell migration, product-card links/detail continuity, responsive navigation, and compressed fallback merchandising. Full authenticated regression coverage and broader page migration remain the next slice.
