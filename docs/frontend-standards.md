# Frontend Standards

These rules are the source of truth for frontend structure and styling in `apps/web`. They are
intentionally concise so engineers and coding agents can make consistent decisions without
repeating architecture discussions.

## Existing Product Baseline

Frontend work is not starting from an unimplemented backend. The repository already provides the
working product boundaries that the UI must consume and preserve:

- the Hono API and D1 repositories implement the customer, administrator, and delivery workflows;
- Better Auth provides persistent sessions, while the server resolves roles and administrator
  permissions;
- `@carbon/contracts` owns the shared Zod request and response contracts;
- `apps/web/src/lib/api/client.ts` is the typed web transport surface;
- the existing public, account, admin, and delivery routes already exercise API-backed behavior.

Before changing a workflow, inspect its current route/component, API-client method, shared contract,
and server endpoint. Refactor connected behavior into the modular structure; do not create a second
API layer, parallel DTOs, mock business rules, or replacement authentication flow. A visual redesign
must preserve working behavior unless the slice explicitly changes a product requirement.

## Design Reference Baseline

Use the following references consistently when auditing or building frontend slices. They define
visual direction and interaction patterns only; repository contracts, authorization, domain rules,
and server-owned values remain authoritative for product behavior.

| Surface | Primary reference | Usage |
| ------- | ----------------- | ----- |
| Customer mobile experience | [Figma mobile UI](https://www.figma.com/design/h7jAYr1rVKvT2jkggzS88j/Main-File?node-id=0-1) | Customer onboarding, authentication, categories, search, product detail, cart, checkout, addresses, payments, orders, tracking, account, support, and privacy patterns at the 375 by 812 reference viewport. |
| Shared customer visual language | [Figma style guide](https://www.figma.com/design/h7jAYr1rVKvT2jkggzS88j/Main-File?node-id=51-12484) | Color roles, Satoshi typography, type scale, component density, control sizing, spacing, and interaction states. Map these into Carbon semantic tokens and primitives rather than scattering literal values through features. |
| Public landing and desktop marketplace | `E:/grocery/web/Hatbazar/index.html` and `E:/grocery/web/Hatbazar/shop.html` | Reference the information hierarchy, grocery merchandising, category/search navigation, product-grid density, promotional sections, and desktop composition. Do not copy template scripts, vendor assumptions, fake prices, or inaccessible markup. |
| Admin console | Existing Carbon admin routes, layout primitives, and permission-scoped workflows | Use a conventional responsive operations dashboard: clear navigation, metrics, tables, filters, forms, alerts, confirmations, audit context, and role-aware states. It does not need to imitate the customer-mobile Figma composition. |
| Delivery console | Existing Carbon delivery routes, PWA shell, and offline workflow | Use a conventional task-focused delivery dashboard optimized for phone use, route order, large actions, minimum customer data, connectivity state, offline queueing, conflicts, and proof capture. |

Useful customer-mobile frame IDs include `26:421` for categories, `25:685` for search, `48:840`
for product detail, `3:589` for checkout, `3:893` for orders, `3:942` for tracking, and `35:696`
for account settings. Read the target frame through the Figma integration before implementing that
journey; do not infer a screen from the page-level overview alone.

When references differ, preserve the Carbon product contract first, use the Figma customer patterns
for phone behavior, use Hatbazar for public and desktop merchandising composition, and resolve the
result through the existing semantic-token and component layers. Admin and delivery surfaces should
remain operationally dense, accessible, and role-specific rather than being styled as consumer
storefront pages.

## Dependency Direction

```text
styles/tokens.css
  -> components/ui
    -> components/layout
      -> features
        -> app routes
```

Dependencies flow downward only. A primitive must not import a feature, and a feature must not
import a route.

| Layer               | Owns                                                       | Must not own                                          |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `styles/tokens.css` | Semantic color and shared visual values                    | Component or feature selectors                        |
| `components/ui`     | Generic typed controls and display primitives              | API calls, sessions, permissions, domain workflows    |
| `components/layout` | Headers, sidebars, navigation, containers, page shells     | Feature-specific data mutations                       |
| `features/*`        | Domain-specific UI, loaders/hooks, workflow composition    | Unrelated feature internals                           |
| `app/*`             | Routes, metadata, server reads, authorization, composition | Large reusable components or duplicated style recipes |

## Reuse Decision

Before adding code, check in this order:

1. Use an existing semantic token.
2. Use or compose an existing UI primitive.
3. Use an existing layout or feature component.
4. Add a named variant when the same component has a real semantic state.
5. Create a new component only when it has a clear owner and makes the caller easier to read.

Do not create a generic abstraction for one short use. Extract when behavior is reused, is complex
enough to test independently, or represents a stable product concept. Prefer composition over one
component with many boolean props.

## Tailwind And Tokens

- Tailwind is the primary styling system.
- Use semantic utilities such as `bg-paper`, `text-ink`, and `border-line` instead of raw brand
  colors.
- Add a token when a visual value carries shared meaning across screens. Do not add tokens for
  incidental one-off spacing or positioning.
- Use local Tailwind classes for one-off layout composition such as grid, flex, gap, width, and
  responsive behavior.
- Move repeated component appearance into a primitive or named class recipe.
- Use the shared `cn` helper for conditional classes.
- Keep variants as explicit typed maps. Add `class-variance-authority` only if variant combinations
  become difficult to maintain with plain maps.
- Avoid arbitrary color values. If one is necessary, explain why and prefer promoting it to a
  semantic token before the slice is complete.
- Avoid `@apply`; it hides composition and creates another styling vocabulary.
- Use CSS Modules only for isolated visuals that are substantially clearer in CSS, such as complex
  animation, selectors, or generated content.
- Keep global CSS limited to Tailwind import, tokens, reset/base behavior, typography, and temporary
  legacy rules scheduled for migration.

### Imagery

- Product-facing pages must use purposeful bitmap imagery for hero and supporting sections when
  the subject benefits from visual inspection. Prefer optimized, stable remote sources (for example,
  Unsplash with explicit `auto=format`, WebP, width, and quality parameters) or committed local
  assets.
- ImageGen is optional and must not block a frontend slice. When ImageGen is unavailable, use an
  approved remote or local image and record the replacement path, prompt, and intended composition
  in a handoff note so the asset can be swapped without changing layout code.
- Keep image `alt` text meaningful, reserve layout space with stable dimensions, and do not use
  decorative gradients, blurred stock imagery, or background images that hide the product subject.

## Component Rules

- Components use typed, descriptive props and readable named functions.
- Generic primitives accept presentation and interaction props, not domain records or API clients.
- Feature components may understand domain data but expose a small public entrypoint.
- Do not import another feature's private files. Export intentional public modules through its
  `index.ts` only when a cross-feature dependency is justified.
- Use `children` and composition for flexible content. Avoid large configuration objects when
  normal JSX is clearer.
- Keep `className` as an escape hatch for layout placement, not as a way to replace a component's
  core visual contract.
- Use native semantic HTML first. Add Radix only where native behavior is insufficient or difficult
  to make accessible consistently.
- Client Components must have a concrete interaction, browser API, or client-state reason.

## Data And Authorization

- Server Components perform initial reads and protected route decisions where practical.
- Use the existing typed API client and `@carbon/contracts`; do not redefine API DTOs.
- Extend the existing client only when an implemented server endpoint is not represented; do not
  introduce feature-local fetch wrappers for routes the client already supports.
- Prices, totals, fees, credits, roles, permissions, statuses, and availability remain server-owned.
- Hiding a control is not authorization. Protected pages and mutations must enforce permissions on
  the server.
- Do not add global state for server data. Add TanStack Query only when caching, invalidation,
  polling, or interactive mutation workflows require it.

## Verification Sequence

- Every vertical slice runs focused unit/component checks, lint, typecheck, production web build,
  and the repository `pnpm check`.
- Perform practical responsive checks while building and run the relevant cross-role Playwright,
  accessibility, and visual checks before the slice is complete.
- Verify both deterministic local fixture behavior and the deployed staging workflow.
- Do not replace missing server-backed behavior with placeholders; record it as a contract gap and
  complete the backend and frontend together in the same slice.

## Required UI States

Every applicable screen or component accounts for:

- loading and skeleton behavior;
- empty data;
- recoverable and terminal errors;
- unauthorized or forbidden access;
- disabled and in-progress actions;
- durable success feedback;
- phone and desktop layouts;
- keyboard navigation and visible focus;
- accessible labels, descriptions, and status announcements.

## Naming And File Shape

- Use kebab-case filenames and PascalCase component exports.
- Keep one primary responsibility per module.
- Keep tests beside the module or feature they verify.
- Prefer imports from a layer's public `index.ts` when crossing a layer boundary.
- Avoid vague names such as `Common`, `Shared`, `Helper`, or `Utils` when a specific name exists.

## Review Checklist

Before completing a frontend slice, confirm:

- existing tokens and primitives were reused;
- no Tailwind recipe was needlessly duplicated;
- route files remain thin;
- server-owned values were not reimplemented;
- responsive and accessibility states exist;
- focused web lint, typecheck, tests, and production build pass;
- the full repository `pnpm check` passes.
