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

The foundation and transactional presentation slices are locally verified. The marketplace now has
semantic tokens, a shared page shell, responsive navigation, product-card/detail continuity, compact
fallback merchandising, marketplace cart and checkout composition, responsive order history/detail
surfaces, and scoped account form styling. Cart expected-version refresh, checkout quote/payment
idempotency, server totals, order tracking, reorder, and authorization behavior remain unchanged.

Focused web lint, typecheck, 23 Vitest files / 77 tests, production build, and `git diff --check`
pass. The local browser verifies `/shop` at desktop and 390px phone width and `/shop/apple` at 390px
without console errors or horizontal overflow. Protected `/account` routes correctly redirect the
current unauthenticated browser session to `/forbidden`. Customer fixture E2E verifies cart,
checkout, payment retry, reorder, account preferences, and tracking/proof flows across phone,
tablet, and desktop. The combined stateful run passed 14/18 before later projects inherited earlier
payment/delivery fixture state; fresh tablet and desktop reruns passed the four affected scenarios.

Remaining gaps are limited to the existing cross-project fixture isolation issue, broader manual
authenticated visual comparison, and future extraction of repeated account form primitives if more
customer sections are added.
