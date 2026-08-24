---
name: Freshmarkets
description: A modern public market with trusted local pricing and premium delivery convenience.
colors:
  deep-market-green: "#244d3e"
  ink-green: "#17332b"
  muted-sage: "#63756e"
  market-ink: "#161616"
  market-muted: "#545454"
  paper: "#f6f7f2"
  market-paper: "#ffffff"
  soft-sage: "#edf2e8"
  market-soft: "#f6f6f6"
  line-sage: "#dfe7df"
  market-line: "#e2e2e2"
  lime-accent: "#c6e46b"
  accent-dark: "#527018"
  market-green: "#15803d"
  market-green-dark: "#166534"
  coral: "#9f3f27"
  sun: "#f0c75e"
  success: "#047857"
  warning: "#b45309"
  danger: "#b91c1c"
  action-black: "#000000"
  action-hover: "#333333"
typography:
  display:
    fontFamily: "Outfit, Arial, Helvetica, sans-serif"
    fontSize: "5.8rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "normal"
  headline:
    fontFamily: "Outfit, Arial, Helvetica, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "Outfit, Arial, Helvetica, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Outfit, Arial, Helvetica, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Outfit, Arial, Helvetica, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  control: "4px"
  surface: "6px"
  card: "8px"
  selection: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "92px"
components:
  button-primary:
    backgroundColor: "{colors.action-black}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.deep-market-green}"
    rounded: "{rounded.pill}"
    padding: "12px 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.market-paper}"
    textColor: "{colors.ink-green}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.market-paper}"
    textColor: "{colors.ink-green}"
    rounded: "{rounded.surface}"
    padding: "20px"
---

# Design System: Freshmarkets

## Overview

**Creative North Star: "The Modern Public Market"**

Freshmarkets should feel like a well-run public market brought into a premium digital service: local,
fresh, direct, and easy to trust. The interface uses Carbon's market-green identity with clear neutral
surfaces, purposeful produce imagery, and strong but practical typography. Value is communicated through
clarity and confidence, not discount-store decoration.

The system is soft and layered. Customer surfaces can breathe and use imagery for discovery; admin and
delivery surfaces stay denser so operators can scan queues and complete tasks. The same visual family
must still be recognizable across both modes through shared tokens, controls, focus treatment, and status
language.

**Key Characteristics:**

- Modern public-market character with local, trustworthy warmth.
- Premium convenience without ornamental complexity.
- Soft tonal layering with restrained borders and stateful depth.
- Strong Outfit typography and concise uppercase metadata.
- Customer discovery balanced with operational clarity.

## Colors

The palette pairs deep market greens with warm paper, cool sage neutrals, a lime action accent, and
small coral and sun signals. Neutral surfaces do most of the work; accents are reserved for action,
selection, brand recognition, and status.

### Primary

- **Deep Market Green** (#244d3e): Brand anchor, inverse sections, focused headings, and high-trust actions.
- **Lime Market Accent** (#c6e46b): Selected states, promotional emphasis, and positive customer affordances.
- **Market Green** (#15803d): Marketplace-specific positive and active states.

### Secondary

- **Market Coral** (#9f3f27): Limited promotional or attention accent; never the default action color.
- **Market Sun** (#f0c75e): Light contrast accent for hero metadata and small highlights.

### Neutral

- **Ink Green** (#17332b): Primary branded text on customer and account surfaces.
- **Market Ink** (#161616): High-contrast marketplace and action text.
- **Muted Sage** (#63756e): Supporting copy, metadata, and secondary navigation.
- **Paper** (#f6f7f2): Warm page canvas for customer and account surfaces.
- **Market Paper** (#ffffff): Raised cards, fields, and marketplace canvas.
- **Soft Sage** (#edf2e8): Low-contrast selected and supporting surfaces.
- **Line Sage** (#dfe7df): Customer dividers and borders.
- **Market Line** (#e2e2e2): Marketplace and operational dividers.

**The Rarity of Accent Rule.** Lime, coral, and sun should signal meaning. They should not become a
full-screen decorative wash when a neutral surface communicates the task more clearly.

## Typography

**Display Font:** Outfit (with Arial, Helvetica, sans-serif)
**Body Font:** Outfit (with Arial, Helvetica, sans-serif)
**Label/Mono Font:** Outfit for labels; system monospace only for technical codes and values.

**Character:** Outfit gives the system a friendly, contemporary market voice while its heavy weights
keep prices, actions, and operational headings legible at a glance.

### Hierarchy

- **Display** (700, 5.8rem, 0.95 line-height): Public landing hero headlines and major campaign moments.
- **Headline** (700, 3.5rem, 1 line-height): Large customer section titles and account introductions.
- **Title** (700, 1.8rem, approximately 1.15 line-height): Page and card titles in account, checkout, and delivery flows.
- **Body** (400, 0.9rem, 1.6 line-height): Explanations, descriptions, and supporting commerce copy.
- **Label** (700, 0.72rem, 0.14em tracking, uppercase where used): Eyebrows, section metadata, and compact operational context.

**The One Type Voice Rule.** Keep Outfit as the shared family. Create hierarchy through size, weight,
line height, and spacing rather than introducing a second display face.

## Layout

Customer and account pages use a centered content model around 1180px, with 20px mobile gutters and
32px desktop gutters. Public storefront sections expand to approximately 1240px for imagery and
merchandising. Admin operations use a denser three-column shell on large screens with compact side
navigation and a content region that can reach approximately 1380px.

The rhythm is based on 4/8px increments, with common gaps of 8, 16, 24, and 32px. Public sections use
large vertical breathing room, while admin, delivery, and checkout surfaces compress spacing around
repeated tasks. Responsive layouts collapse side navigation into mobile controls, stack two-column
content, and keep primary actions reachable on phone.

## Elevation & Depth

The intended direction is soft and layered. Most resting surfaces use borders and tonal contrast rather
than dramatic shadows. Shadows are reserved for dialogs, sheets, sticky cart or checkout actions,
floating marketplace controls, and other surfaces that genuinely sit above content. Backdrop dimming is
used for modal context; avoid turning ordinary cards into floating objects.

### Shadow Vocabulary

- **Dialog elevation** (`shadow-xl`): Modal and sheet separation from the page.
- **Floating action elevation** (`shadow-xl`): Sticky checkout actions, cart prompts, and transient notices.
- **Marketplace lift** (`shadow-sm` to `shadow-[0_2px_12px_rgba(17,24,39,0.04)]`): Subtle product and cart affordance lift.

**The Layered Surface Rule.** Use a surface color change or a quiet border before adding a shadow; depth
should explain hierarchy, not decorate every container.

## Shapes

The form language mixes compact rounded controls with more restrained rectangular content surfaces.
Buttons and status badges are pills (`999px`), fields are lightly rounded (`4px`), ordinary cards and
dialogs use small corners (approximately 6-8px), and selected commerce options may use a larger 12px
corner for touch-friendly grouping. Sheets intentionally use square outer corners where they meet the
viewport.

Borders are thin and quiet. Selected states typically combine a stronger deep-green border with a
soft lime wash rather than relying on color alone.

## Components

### Buttons

- **Shape:** Pill silhouette for shared Button and LinkButton variants (`999px`).
- **Primary:** Black action surface with white text; 44px default height and bold Outfit label.
- **Accent:** Deep green surface or dark accent text on lime where a promotional or primary customer action needs emphasis.
- **Secondary:** Transparent surface with deep-green border and text.
- **Ghost / Danger:** Quiet text action or outlined red action for destructive operations.
- **Hover / Focus:** Small color transition, visible deep-green focus outline, and no layout shift.

### Chips and Status

- **Style:** Compact pill with bold text and a semantic tone: neutral, success, warning, danger, or accent.
- **State:** Selected filters use a dark action fill or lime surface; status meaning must remain readable without color alone.

### Cards and Containers

- **Corner Style:** 6-8px for ordinary surfaces; 12px for selected commerce options; larger rounded imagery is a storefront-specific treatment.
- **Background:** White or market-paper raised surface over paper, soft sage, or neutral marketplace backgrounds.
- **Shadow Strategy:** Flat at rest; use soft lift only for floating or interactive priority.
- **Border:** One-pixel line tokens define grouping and separation.
- **Internal Padding:** 16-24px for operational cards; 20-32px for customer sections depending on density.

### Inputs and Fields

- **Style:** White field, one-pixel line border, compact 4px radius, 44px minimum height, 12px horizontal padding.
- **Focus:** Deep-green border and lime ring; retain a visible keyboard focus state.
- **Error / Disabled:** Red error copy with `role="alert"`; disabled controls reduce contrast and disable interaction without changing layout.

### Navigation

- **Customer:** Brand header, category navigation, search, fulfillment/address controls, and a phone bottom navigation bar.
- **Account / Delivery:** Shared Carbon shell with left navigation on desktop and mobile navigation controls on phone.
- **Admin:** Dense operations shell with product shortcuts, workspace navigation, search, breadcrumbs, and compact account controls.
- **States:** Active navigation uses stronger text and a quiet tonal background or border, not animation-heavy indicators.

### Marketplace Product Surface

Product imagery, category chips, sticky cart access, delivery-address context, and server-confirmed price
are the signature customer elements. Keep product photos inspectable and layout dimensions stable so
the catalog feels like a real market rather than a generic card grid.

## Do's and Don'ts

### Do:

- **Do** use semantic token names and shared UI primitives before adding route-level styles.
- **Do** make market value visible through clear prices, units, availability, and delivery context.
- **Do** preserve the difference between customer discovery density and operator task density.
- **Do** use real produce and delivery imagery where the subject improves trust or inspection.
- **Do** keep focus, disabled, loading, empty, error, and selected states visually explicit.
- **Do** use soft tonal layering and restrained shadows for hierarchy.

### Don't:

- **Don't** introduce a second brand voice or token family without an explicit product decision.
- **Don't** use raw colors or one-off radii when a semantic token or primitive exists.
- **Don't** turn every section into a rounded floating card or nest cards inside cards.
- **Don't** use decorative gradients, generic AI dashboard motifs, or unsupported savings claims.
- **Don't** make operational screens as spacious or promotional as the storefront.
- **Don't** let client-provided prices, totals, statuses, permissions, or availability define the UI truth.
