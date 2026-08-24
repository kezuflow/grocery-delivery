# Carbon Admin Dashboard Design System

Status: canonical design authority for the authenticated admin dashboard only.

This document turns a sampled set of authenticated Customer.io screens into Carbon-specific
rules. Customer.io/Mobbin controls UX and structural inspiration for the admin dashboard.
This document controls Carbon's admin visual identity and implementation rules.

Customer.io-derived rules apply only to the admin dashboard. They must not be propagated to the
landing page, marketplace, grocery browsing, customer product pages, cart, checkout, delivery
flows, or other consumer-facing surfaces.

## Admin Design Philosophy

Carbon admin is an operations console, not a marketing surface. It should help an authenticated
operator answer three questions quickly:

1. What needs attention?
2. What is the current state of the operation or record?
3. What is the safest next action I can take?

The design is quiet, structured, and information-dense. Hierarchy comes from alignment, whitespace,
type, borders, and state semantics before decoration. A page may be sparse when the work is sparse;
it should not manufacture cards, charts, or activity merely to look full.

## Product Character

- Calm, precise, operational, and accountable.
- Dense enough for repeated work, with enough breathing room to prevent scanning errors.
- Restrained color: color signals state, selection, or action; it is not wallpaper.
- Direct language: name the object, state, consequence, and next action.
- Progressive disclosure: expose the common path first and move advanced controls into a filter
  panel, popover, drawer, or detail page according to scope.
- Server truth is visible. Show source, status, last updated time, permission, and correlation
  context when those facts affect an operator's decision.

## Core Principles

1. **Persistent orientation.** Keep global navigation visible on desktop and recover it through a
   labeled mobile menu on smaller screens.
2. **One primary job per page.** A route has one clear title, one dominant content representation,
   and one primary action group.
3. **Operational hierarchy over visual novelty.** Tables, queues, forms, and detail panels are the
   default tools; decorative widgets require a measurable operational purpose.
4. **Scan before read.** Use stable columns, short labels, aligned values, status markers, and
   predictable row actions so an operator can scan without opening every record.
5. **Reveal complexity at the point of need.** Keep filters, advanced settings, inspectors, and
   destructive consequences close to their triggering context.
6. **Every state is designed.** Loading, empty, unavailable, forbidden, validation, pending,
   success, and destructive states are first-class compositions, not afterthoughts.
7. **Reversible by default.** Prefer inline undo, archive, pause, or a review step. Irreversible
   actions require a consequence-specific confirmation.
8. **Use the smallest suitable container.** Do not place every section in a floating card. A
   divider, table frame, or open page section is often the correct container.
9. **Brand translation, not imitation.** Borrow Customer.io's product grammar; adapt color,
   typography, copy, and assets to Carbon.

## Information Architecture

The current admin route family is organized around operational permission scopes:

- **Workspace:** Overview.
- **Operations:** Orders, Procurement, Packing, Dispatch, Support, Promotions, Reporting.
- **Manage:** Catalog, Staff, Configuration, Security.

Navigation labels should describe a stable work domain, not an implementation detail. Keep the
route-to-label mapping stable so links, permissions, breadcrumbs, and page titles agree.

Use the following hierarchy:

```text
Application shell
  -> primary domain (sidebar group)
    -> page (route)
      -> local view (tabs or filter state)
        -> record or workflow step (detail, drawer, or editor)
```

Do not encode a fifth level in the sidebar. If a page has more than two local levels, use a detail
page, tabs, or a contextual back link rather than adding another navigation rail.

## Application Shell

### Desktop

The desktop shell uses three zones already established by `AppShell`:

- a narrow utility rail for product shortcuts and support;
- a wider grouped navigation rail for the admin workspace;
- a fluid content region with a sticky utility header.

Keep the shell visually quiet: a light rail surface, 1px separators, compact iconography, and one
clear selected navigation state. The workspace switcher/account identity belongs at the top of the
navigation rail. Global search and account actions belong in the sticky header, not in page content.

Recommended geometry (tokens are in `TOKENS.css`): utility rail 48px, navigation rail 216px,
content max width 1380px, header 48px. These are defaults, not reasons to introduce arbitrary
breakpoints or fixed-width content.

### Mobile and tablet

- Collapse both rails behind one labeled navigation control.
- Keep page title, primary action, and current location visible without opening navigation.
- Let tables scroll horizontally inside their own frame; never make the entire document overflow.
- Move secondary actions into a menu or overflow control.
- Preserve the same information architecture and permission behavior; only the container changes.

### Workspace switcher and account controls

The workspace/account control is a compact header row with a name, optional environment marker,
and chevron. It opens a menu, never a bespoke full-screen surface. Environment labels such as
`Local` are operational metadata and should use a quiet status treatment.

## Navigation Hierarchy

- **Sidebar:** global destinations and stable work domains.
- **Tabs:** sibling views of the same object or page, such as Overview, Activity, and Settings.
- **Breadcrumbs:** location context two or more levels deep, and a safe return path from detail or
  editor pages. Do not use breadcrumbs as a second sidebar.
- **Secondary navigation:** only when a domain has a stable set of sub-areas that would make tabs
  too wide; keep it visually subordinate to the page title.
- **Context menu:** row or object actions that are not the page's primary action.
- **Back navigation:** editor/detail flows where returning preserves the operator's list context.
- **Global search:** destination and record discovery; it should not silently become a table filter.

Selected navigation is communicated by a quiet filled surface and stronger text/icon contrast. Do
not rely on color alone. Current page links expose `aria-current="page"`.

## Page Anatomy

The default admin page anatomy is:

```text
Shell
  -> breadcrumb (when nested)
  -> eyebrow / domain label (optional)
  -> title + concise description
  -> primary action and contextual actions
  -> local status or freshness context
  -> toolbar (search, filters, view controls)
  -> primary representation (table, queue, form, chart, or editor)
  -> pagination / supporting notes / audit context
```

Page headers use a bottom divider rather than a floating panel. Keep descriptions to one or two
lines; move instructions into field hints or an adjacent help affordance.

## Page Archetypes

### Overview / operations dashboard

Use for cross-domain health and work queues. Start with a short status summary, then show only
metrics that lead to an action. Prefer a two-column alert/feed composition or a queue over a grid
of decorative metric cards. A metric must have a source, timeframe, and drill-in destination.

### List / table page

```text
Header -> action group -> filter/search toolbar -> selection/bulk toolbar -> table -> pagination
```

Use for comparable records with stable columns. Keep the table in an outlined frame and allow the
toolbar to remain visually separate. Empty, forbidden, and unavailable states retain the page
header and explain what the operator can do next.

### Detail page

```text
Breadcrumb -> record header -> status/metadata -> tabs -> detail sections or activity table
```

The record header exposes identity, current status, last updated time, and safe contextual actions.
Use tabs only for genuinely sibling content; do not hide critical status in a tab.

### Settings / configuration page

```text
Header -> settings navigation (if needed) -> grouped sections -> field controls -> save bar
```

Group related operational policies into titled sections with descriptions. Use one save action per
coherent transaction, show dirty state, and explain server validation or conflicts near the save
bar. Destructive settings are separated by a divider and use danger treatment sparingly.

### Analytics / reporting page

```text
Header -> timeframe/source/filter controls -> primary metric or chart -> supporting table
```

Charts answer a question and expose units, timeframe, empty state, and data freshness. Pair charts
with a table or summary for exact values. Avoid random charts or a dashboard wall of cards.

### Creation flow

Use a full page when the task has multiple dependent decisions, validation, or review. Keep a
contextual header with back navigation, draft status, and one primary save/publish action. Preserve
the list context when returning.

### Complex editor

Use a full work surface for builders, configuration editors, or multi-step operational tools:

```text
context header -> toolbar -> work surface -> optional inspector/drawer -> validation/status -> save
```

The work surface owns selection and keyboard interaction. The inspector owns properties of the
selected object. Do not duplicate the same controls in both places.

## Typography

Use the existing Carbon font family and semantic tokens; this document does not authorize a global
font replacement. Admin type is compact and readable, with sentence case by default.

| Role            | Size / line-height | Weight | Use                                                              |
| --------------- | ------------------ | ------ | ---------------------------------------------------------------- |
| Page title      | 24px / 32px        | 600    | One per page; never marketing-scale                              |
| Section title   | 16px / 24px        | 600    | Major groups and panels                                          |
| Panel title     | 14px / 20px        | 600    | Local sections, table groups                                     |
| Body            | 14px / 20px        | 400    | Primary reading text                                             |
| Dense body      | 13px / 18px        | 400    | Table cells and operational metadata                             |
| Label           | 12px / 16px        | 600    | Form labels and control headings                                 |
| Helper/meta     | 12px / 16px        | 400    | Hints, timestamps, source context                                |
| Table header    | 11px / 16px        | 600    | Uppercase only for compact column labels; use tracking sparingly |
| Eyebrow         | 11px / 16px        | 600    | Domain context; uppercase with restrained tracking               |
| Metric value    | 28px / 32px        | 600    | Only when the metric has an action or comparison                 |
| Technical value | 12-13px / 18px     | 500    | IDs, timestamps, code; use a monospace face only where useful    |

Rules:

- Keep body text at least 14px for normal reading and 13px for dense table contexts.
- Use weight and placement before color for emphasis.
- Use muted text for metadata, not for essential instructions or errors.
- Do not use all caps for sentences, buttons, or long labels.
- Numeric columns are right-aligned when comparison matters; identifiers and names are left-aligned.

## Color

Admin color is a restrained translation of Carbon's existing brand primitives. Do not copy
Customer.io's teal, logo colors, or exact palette.

- **Canvas:** warm/light neutral distinct from white content surfaces.
- **Surface:** white or near-white for primary work areas; subtle surface for toolbars and rails.
- **Text:** deep Carbon ink, secondary slate, muted gray.
- **Accent:** Carbon green/lime for primary actions and selected/focus emphasis, used with contrast.
- **Success:** reserved for confirmed healthy, active, or completed states.
- **Warning:** reserved for attention, capacity, pending, or policy risk.
- **Danger:** reserved for destructive actions, failed states, and irreversible consequences.
- **Information:** quiet blue/teal only when informational context is not a success/warning state.

Color must not be the sole state indicator. Pair it with text, icon, position, or an accessible
status label. Avoid gradients, tinted page backgrounds, and decorative chart colors.

## Spacing and Density

Use the 4px base scale in `TOKENS.css`, with 8px as the dominant rhythm:

```text
4 8 12 16 20 24 32 40 48 64
```

- **Compact:** tables, rails, dense toolbars; 8-12px internal gaps.
- **Normal:** page sections, forms, detail blocks; 16-24px gaps.
- **Spacious:** page boundaries, major empty states, editor work surfaces; 32-64px gaps.

Page gutters are 16px on narrow screens, 24px on medium screens, and 32px on wide screens. A
section should not use a larger gap than the gap separating it from a sibling section unless that
larger gap communicates a new hierarchy level.

## Layout and Grid

- Use a fluid content column with a 1380px maximum for operational pages.
- Use CSS grid for stable two-column settings/detail compositions and flex for toolbars.
- Prefer a 12-column mental grid for wide pages; most admin content uses 8/4 or 7/5 splits.
- Keep primary tables full width within their content region.
- Do not place a card inside another card unless the inner object has independent identity,
  selection, or lifecycle; a divider is usually enough.
- Avoid forcing every overview metric into an equal-width row. Prioritize the queue or alert that
  needs attention.

## Shape Language

Carbon admin uses modest radii with intentional categories:

- controls and table frames: 4-6px;
- panels and grouped sections: 6-8px;
- overlays and drawers: 8-10px;
- status badges: pill only when the value is a short status token;
- never use pill styling for ordinary buttons, inputs, tabs, or page containers.

Consistent geometry should make click targets predictable without making the interface playful.

## Surfaces, Borders, and Shadows

Hierarchy is established in this order:

1. whitespace and alignment;
2. surface change;
3. 1px border or divider;
4. elevation only for overlays.

Most page sections should be open or bordered, not floating. Use no shadow for ordinary cards or
tables. Use one restrained overlay shadow for menus, popovers, dialogs, and drawers. Never stack
multiple shadows or use glassmorphism/backdrop blur as a visual style.

## Iconography

Use the existing Lucide icon family with 14-18px icons in dense contexts and 20px icons for primary
navigation. Icons support labels; they do not replace labels for unfamiliar actions. Keep stroke
weight consistent. Avoid decorative icon grids and redundant icons in every row.

## Buttons and Controls

- One primary action per page or dialog. Secondary actions are outlined or ghost; danger is a
  semantic variant, not a red default.
- Controls use a 36px compact height, 40px default height, and 44px touch-oriented height.
- Button labels use verbs: Save changes, Open dispatch, Archive product.
- Loading buttons preserve width and expose `aria-busy`; disabled buttons explain why when the
  reason is not obvious.
- Do not use a pill button recipe across the admin; the existing global pill primitive is a known
  MODIFY item for future implementation work.

## Forms

- Labels sit above controls and remain visible; placeholders are not labels.
- A field group has label, optional/required cue, control, and helper/error text in that order.
- Keep related fields in a section with a title and one-sentence purpose.
- Use progressive disclosure for advanced or destructive settings.
- Validation is local and specific. Preserve entered values and point to the first invalid field.
- Save bars show dirty, saving, saved, conflict, and failed states. Do not silently autosave
  high-impact operational policy.
- Confirmation copy names the affected object and irreversible consequence.

## Tables and Lists

Tables are the default for comparable operational records.

- Header: 40px target, 11px label, muted surface, clear sort affordance.
- Row: 44px default, 52px when a secondary line or avatar is needed.
- Cell padding: 12px horizontal, 10-12px vertical; reduce only for very dense audit logs.
- Keep names/identifiers left, numeric values right, statuses near the identity or next action.
- Selection uses a leading checkbox column. When selected, replace or augment the page toolbar
  with a bulk-action toolbar; do not hide bulk actions in a row menu.
- Row hover is subtle. A selected row has a stronger surface and a non-color indicator where
  useful. Do not make the whole row a button if it contains independent actions.
- Row menus contain uncommon actions; the primary next action may be a labeled button in the row.
- Pagination shows range and total when available, preserves filters, and exposes disabled states.
- Empty table: retain column context only when it helps explain what will appear; otherwise use a
  concise empty state with one next action.
- Loading table: use row skeletons that match the final density; do not replace the entire page.
- Unavailable/forbidden: preserve the page shell and explain whether retry or permission change is
  the next step.

Use a list when records need narrative ordering, a card when each item has a distinct action or
visual identity, and a detail panel when the operator must compare one record's fields and history.

## Search, Filters, and Sorting

- Global search discovers destinations and records; local search filters the current collection.
- Start with one visible search field and a small number of high-frequency filters.
- Put advanced filters in a popover or side panel. Show active filters as removable chips and a
  count on the trigger.
- Provide Clear all when two or more filters are active. Preserve filters across pagination and
  back navigation.
- Sort controls belong in table headers for column sorting or in a compact toolbar for collection
  sorting. Show direction and provide a keyboard-accessible label.
- Search/filter loading should not erase the last known result without explanation.

## Tabs, Breadcrumbs, Menus, Popovers, Modals, and Drawers

- **Tabs:** sibling views, one active underline or bottom border, keyboard arrow/Home/End support.
- **Breadcrumbs:** route context and return path; the final item is current text, not a link.
- **Dropdown menu:** short list of actions or navigation from one trigger.
- **Popover:** anchored, transient configuration such as filters, date range, or a compact picker.
- **Drawer:** inspect or edit related detail while preserving list/editor context; keep a visible
  title, close control, and focus management.
- **Dialog:** confirmation, short self-contained form, or an interruption that requires a decision.
  Never put a multi-step workflow or large table in a modal.
- **Full page:** multi-step creation, complex configuration, analytics, and anything needing a
  stable URL, back navigation, or deep linking.

Overlays close on Escape where safe, restore focus to the trigger, trap focus when modal, and do
not rely on clicking the backdrop as the only exit.

## Feedback and States

Every applicable surface defines:

- default;
- hover/pressed/focus;
- selected/active;
- disabled;
- loading/skeleton;
- empty/no data;
- unavailable/retry;
- forbidden/permission denied;
- validation error;
- warning/attention;
- success/saved;
- pending/in progress;
- destructive confirmation;
- unsaved changes/conflict.

Feedback is placed near the affected object and repeated in a durable status region when the result
persists beyond the interaction. Toasts are for short-lived confirmation or failure; they do not
replace inline validation, audit context, or a saved-state indicator.

## Complex Editors

Use a persistent context header, a bounded work surface, and an optional inspector. Nodes or steps
should be visually connected and individually selectable. The inspector opens from the selected
object, shows only relevant properties, and can be a drawer on narrow screens. Keep validation
attached to the invalid node and summarize blockers in the header. Save/publish is explicit and
distinguishes draft from live state.

## Motion

Motion is utilitarian and short (roughly 120-180ms for local transitions). Use it to communicate:

- a menu/popover's relationship to its trigger;
- a drawer/dialog entering or leaving;
- a tab or selection change;
- expansion/collapse;
- progress or loading.

Avoid decorative parallax, springy marketing motion, looping animation, and motion that delays a
routine operation. Respect `prefers-reduced-motion`.

## Responsive Behavior

- Desktop: persistent rails, multi-column layouts, full table density.
- Tablet: compact rails or overlay navigation, two-column sections collapse as needed.
- Phone: single column, sticky or bottom action bar for important saves, drawer becomes full
  height, table remains scrollable with priority columns first.
- Do not hide authorization, status, or destructive consequences on smaller screens.

## Accessibility

- Use semantic landmarks, headings, lists, tables, labels, and native controls first.
- All controls have accessible names; icon-only controls have an explicit label and tooltip only as
  supplemental help.
- Focus is visible and never conveyed by color alone.
- Keyboard support covers navigation, tabs, menus, dialogs, drawers, tables, and bulk selection.
- Status messages use `role=status` or `role=alert` appropriately and do not steal focus except
  for a blocking error or dialog.
- Maintain WCAG AA contrast for text and focus indicators. Do not encode status with color alone.
- Respect reduced motion, zoom, text expansion, and horizontal scrolling within bounded tables.

## Design Tokens

The proposed admin semantic token contract is documented in `TOKENS.css`. It intentionally aliases
the existing Carbon brand values conceptually rather than replacing `apps/web/src/styles/tokens.css`.
Implementation work should add only the tokens that prove reusable and should keep admin aliases
scoped to admin layout/primitives.

Key tokens include canvas/surface/text roles, state colors, the 4px spacing scale, modest radii,
one overlay shadow, shell widths, control heights, and table density. Do not add per-screen tokens.

## Borrow / Adapt / Reject

### Borrow

- persistent grouped navigation with compact selected states;
- a sticky utility header with global search and account/help actions;
- page headers separated from content by a divider;
- dense but legible tables with local filters and bulk actions;
- tabs for sibling record views;
- contextual menus for uncommon row actions;
- drawers/inspectors for related detail without losing list context;
- explicit empty, pending, warning, and unavailable states;
- analytics controls that expose timeframe, source, filters, and exact values;
- complex editors with a work surface plus contextual inspector.

### Adapt

- Customer.io's cool neutral canvas becomes Carbon's warm neutral canvas;
- teal/blue state colors become Carbon semantic green/lime, amber, red, and information tones;
- Customer.io's product copy becomes Carbon's direct operational language;
- branded upgrade prompts, bottom bars, and assistant affordances become optional product decisions,
  never default shell elements;
- customer-data screens become Carbon catalog, order, delivery, support, and configuration models.

### Reject

- Customer.io logo, exact colors, illustrations, proprietary graphics, or copy;
- marketing landing-page composition or oversized campaign typography;
- decorative assistant bars or upgrade prompts in operational flows;
- every-section-as-card composition;
- pill-shaped controls for ordinary actions;
- using dialogs for multi-step configuration;
- color-only status or selection;
- auto-refresh that changes data without a visible freshness indicator;
- copying Customer.io's screen-specific labels or domain taxonomy.

## Anti-Patterns

Do not introduce:

- generic SaaS-template appearance;
- card-inside-card layouts or a card for every section;
- gratuitous gradients, glassmorphism, or heavy shadows;
- excessive border radius or pill controls;
- giant marketing typography or decorative hero areas;
- random metric cards or charts without an action;
- arbitrary colors, spacing, radii, or control heights;
- unnecessary badges, icons, or animation;
- inconsistent table density or hidden bulk actions;
- placing every action into a modal;
- new component variants without a semantic need;
- copied Customer.io branding or proprietary assets;
- admin aesthetics leaking into landing or customer marketplace pages.

## Existing Admin Audit: Keep / Modify / Replace

This is an analysis baseline, not an implementation checklist for this task.

### Keep

- `apps/web/src/components/layout/app-shell.tsx` three-zone admin shell and sticky header concept;
- grouped `AdminNavigation` and permission-aware navigation filtering;
- breadcrumbs and page-header composition;
- `Table`, `Tabs`, `EmptyState`, `ErrorState`, `StatusPill`, `Dialog`, and `Sheet` primitives;
- server-side role/permission guards and independent feed states;
- route families for catalog, orders, procurement, packing, dispatch, support, reporting, staff,
  configuration, and security;
- local fixture and Playwright role coverage.

### Modify

- replace raw admin hex utilities with scoped semantic admin tokens;
- align the shell's hard-coded geometry and neutral surfaces to the documented token contract;
- change the global pill button recipe to an admin control recipe without affecting customer-facing
  callers;
- normalize table header/row density, menu geometry, and control heights;
- reduce card wrappers where a bordered section, divider, or open layout better communicates work;
- add explicit dirty/saving/conflict feedback to configuration and editor surfaces;
- make active filters, pagination context, and freshness visible on list/reporting pages.

### Replace when the next implementation slice justifies it

- duplicated feature-local table/menu/form recipes that diverge from the primitives;
- raw color and spacing clusters that cannot be safely migrated through named variants;
- any component that makes a complex workflow modal-only or hides a primary action in an overflow menu.

## Validation Scenarios

The system is sufficient only if separate developers can use it to design these without opening
Mobbin: overview, SKU list, product editor, orders list, order detail, customers list, customer
detail, delivery management, subscription management, analytics, settings, and integrations.

For each scenario, the developer should be able to choose a page archetype, shell level, density,
table/list/detail representation, state treatment, and component set from this document and
`COMPONENTS.md`. If two implementations would differ materially in hierarchy, spacing, control
geometry, or state behavior, refine the documents before implementing the page.
