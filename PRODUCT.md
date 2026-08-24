# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are middle- to high-income earners who want grocery delivery with the convenience,
selection, and reliability expected from a modern digital service.

The existing product also includes administrator and delivery-staff workflows. Those operational roles
are part of the repository baseline and should remain distinct from the customer shopping experience.

## Product Purpose

Freshmarkets is a grocery-delivery service that lets customers shop for everyday groceries and have
them delivered without going to the market themselves. Its success means making market-priced grocery
shopping feel convenient, trustworthy, and easy to complete on phone and desktop.

## Positioning

Freshmarkets combines the convenience of grocery delivery with prices sourced from Carbon Public
Market. Its meaningful customer promise is access to prices lower than typical supermarkets while
retaining a polished, dependable ordering experience.

## Operating Context

Customers browse a public grocery storefront, review available products and server-confirmed prices,
build a basket, select an available delivery window, and complete checkout. The repository baseline
uses weekly fulfillment with a Friday cutoff and weekend delivery windows, interpreted in the
Philippines/Manila operating context.

Administrators manage catalog, pricing, operational workspaces, support, reporting, staff, and
configuration. Delivery staff execute assigned stops, record delivery outcomes, synchronize work, and
provide delivery proof.

## Capabilities and Constraints

- Product, pricing, availability, delivery-window, cart, checkout, order, support, and tracking
  behavior are server-backed and server-owned.
- Customer, administrator, and delivery-staff roles have separate navigation, permissions, and
  workflows.
- Weekly scheduled delivery is the active fulfillment model; instant delivery is not an active promise
  unless the complete backend workflow supports it.
- Prices, totals, fees, credits, statuses, roles, permissions, and availability must not be trusted
  from the client.
- PHP amounts are represented as integer centavos in the domain and API boundaries.
- The web experience must remain usable on phone and desktop, with keyboard-visible focus and complete
  loading, empty, error, forbidden, disabled, pending, offline, and success states where applicable.
- Local development with local Workers, D1, deterministic fixtures, and local browser sessions is the
  default workflow. Deployment and remote data publication are separate promotion actions.

## Brand Commitments

- The customer-facing product name is **freshmarkets**.
- Freshmarkets is connected to Carbon Public Market pricing; future work must not imply supermarket
  pricing or invent unsupported savings claims.
- Carbon remains the operational/infrastructure identity behind the customer and staff workflows.
- The product should communicate convenience, value, trust, and practical market access without making
  unsupported financial, quality, or delivery guarantees.

## Evidence on Hand

- Existing customer storefront and marketplace routes under `apps/web/src/features/storefront` and
  `apps/web/src/components/layout/marketplace-shell.tsx`.
- Existing account, checkout, admin, and delivery routes under `apps/web/src/app`.
- Local product and campaign imagery under `apps/web/public/marketplace` and `apps/web/public/landing`.
- Server-backed catalog, cart, checkout, subscription, delivery, support, and role workflows in the
  existing API, contracts, application, domain, and database packages.
- No additional testimonials, benchmark claims, or customer research were provided; future UI must not
  fabricate them.

## Product Principles

1. Make market value visible without making the experience feel cheap or improvised.
2. Remove friction from discovery, basket building, delivery selection, and checkout.
3. Keep pricing, availability, fulfillment, and permissions truthful and server-authoritative.
4. Give customers a polished shopping experience while giving operators focused tools for real work.
5. Treat local delivery context and reliable execution as part of the product, not implementation detail.
