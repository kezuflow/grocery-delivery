# Carbon Admin Components

This is the reusable component specification for the authenticated admin dashboard only. Use
existing Carbon primitives first; future implementation should add a named variant or a new
component only when the behavior below is reused and testable.

## Component rules

- Components are presentation and interaction units; they do not own API calls, permissions, or
  domain rules.
- Every component exposes semantic variants, not arbitrary color/class escape hatches.
- All interactive components preserve keyboard, focus, disabled, loading, and error behavior.
- Admin components use the admin token contract in `DESIGN.md` and `TOKENS.css`.
- Do not use these components in the landing page or customer marketplace unless a separate shared
  brand decision explicitly authorizes it.

## Admin shell

**Purpose:** establish persistent orientation and account context.

**Anatomy:** utility rail, grouped navigation rail, workspace switcher, sticky utility header,
global search, account menu, responsive navigation trigger, content container.

**Variants:** desktop persistent, tablet compact, phone overlay.

**Sizes:** utility rail 48px; navigation rail 216px; header 48px; phone trigger at least 40px.

**Typography:** 12-13px navigation text; 11px group labels; 12px metadata.

**Spacing:** 8px item rhythm; 12px navigation padding; 16px rail section separation.

**States:** active, hover, focus, disabled/permission-hidden, mobile open/closed.

**Icon behavior:** 14-18px Lucide icons with labels; icon-only rail controls require accessible names.

**Interaction:** active route uses `aria-current`; mobile menu restores focus to its trigger; account
and workspace menus close on Escape.

**Accessibility:** landmarks for navigation/header/main; keyboard traversal; visible focus; menu
semantics for switchers.

**Use when:** every authenticated admin route.

**Do not use when:** rendering public, marketplace, or delivery-staff shells.

## Page header

**Purpose:** anchor the page's job, location, description, and primary action.

**Anatomy:** optional breadcrumb, eyebrow, title, description, status/freshness, action group,
bottom divider.

**Variants:** list, detail, settings, editor, reporting.

**Sizes:** title 24/32; header padding 16-24px; action controls 36-40px.

**Typography:** title 600 weight; description 14/20 muted; eyebrow 11/16 tracked.

**Spacing:** 4-8px between title elements; 16-24px below header.

**States:** normal, loading title skeleton, dirty editor, unavailable status.

**Interaction:** primary action remains visible at desktop; action group moves to overflow on phone.

**Accessibility:** one `h1`; status uses a live region only when it changes.

**Use when:** each route has a distinct work context.

**Do not use when:** a tiny drawer or popover needs only a local heading.

## Breadcrumbs

**Purpose:** show nested location and provide a return path.

**Anatomy:** linked ancestors, separators, current non-link label.

**Variants:** short, deep, editor-with-back.

**Sizes:** 12-13px text; 8px horizontal gap.

**States:** default, hover, focus, truncated on narrow screens.

**Interaction:** links preserve list/search context where possible.

**Accessibility:** `nav` with an accessible label; current page is not a link.

**Use when:** detail, nested configuration, or editor routes.

**Do not use when:** the page is a top-level sidebar destination.

## Navigation item

**Purpose:** represent one stable admin destination.

**Anatomy:** optional icon, label, optional count/status marker.

**Variants:** default, active, compact, disabled.

**Sizes:** 32px minimum row desktop; 40px touch row mobile.

**States:** hover, focus, active, disabled, permission-hidden.

**Interaction:** entire item is a link; do not nest a menu button inside it.

**Accessibility:** current route and label remain available without color.

## Search field

**Purpose:** discover records or filter the current collection.

**Anatomy:** search icon, labeled input, optional clear button, optional keyboard hint.

**Variants:** global, local, compact toolbar.

**Sizes:** 36px compact, 40px default; full width in phone toolbars.

**States:** empty, typing, loading, results, no results, error.

**Interaction:** clear restores the prior unfiltered state; global search never silently changes
the local table query.

**Accessibility:** visible or screen-reader label; clear button named; debounce must not hide status.

## Filter toolbar and filter panel

**Purpose:** expose common filters without permanently cluttering the page.

**Anatomy:** local search, primary filter triggers, sort/view controls, active chips, clear-all;
advanced panel has grouped fields and Apply/Cancel when changes are staged.

**Variants:** inline, popover, side panel.

**Sizes:** 36-40px controls; 8-12px gaps.

**States:** no filters, active filters, pending changes, loading, invalid filter.

**Interaction:** chips remove one filter; Clear all resets; Apply updates results atomically.

**Accessibility:** filter count announced; panel focus managed; labels describe operator/value.

## Button

**Purpose:** invoke an action.

**Anatomy:** optional leading/trailing icon, verb label, loading indicator.

**Variants:** primary, secondary, ghost, danger, text; never default pill.

**Sizes:** sm 32-36px, md 40px, lg 44px.

**Typography:** 13-14px, 600 weight.

**States:** default, hover, pressed, focus, disabled, loading.

**Interaction:** one primary action per local context; loading preserves width and blocks duplicate use.

**Accessibility:** native button/link semantics; `aria-busy` while loading; disabled reason nearby.

## Status badge

**Purpose:** summarize a short, stable state.

**Anatomy:** text, optional status dot/icon.

**Variants:** neutral, info, success, warning, danger, accent.

**Sizes:** 20-24px height, 11-12px text.

**States:** stable and updating; do not animate continuously.

**Interaction:** non-interactive by default; use a button when it filters or opens details.

**Accessibility:** text must name the state; color is supplemental.

## Table

**Purpose:** compare records and execute operational work.

**Anatomy:** caption/title context, header row, optional selection column, body rows, row actions,
empty/loading/error state, pagination.

**Variants:** standard, dense audit, selectable, expandable, responsive scroll.

**Sizes:** header 40px; row 44px default, 52px with secondary content.

**Typography:** 13px cells; 11px headers; numeric values aligned right.

**States:** hover, selected, expanded, disabled row action, loading skeleton, empty, unavailable.

**Interaction:** sortable headers expose direction; row actions stop propagation; bulk toolbar appears
on selection; pagination retains query state.

**Accessibility:** real table semantics, scoped headers, checkbox labels, keyboard-accessible menus,
status for asynchronous updates.

**Use when:** records share columns and comparison matters.

**Do not use when:** records require narrative cards, heterogeneous actions, or a single detail focus.

## List / queue

**Purpose:** show ordered work where narrative context or a next action matters more than columns.

**Anatomy:** item identity, supporting metadata, state, next action, optional divider.

**Variants:** queue, activity feed, audit list, compact.

**States:** empty, loading, unavailable, selected, resolved.

**Use when:** order, urgency, or narrative is primary.

**Do not use when:** operators need to compare many fields across records.

## Panel / section

**Purpose:** group related content without forcing a card-heavy composition.

**Anatomy:** optional title/description, content, optional footer/action row.

**Variants:** open section, bordered panel, inset section, warning/danger section.

**Sizes:** 16-24px padding; 6-8px radius only when bordered.

**States:** normal, loading, unavailable, dirty.

**Use when:** content has an independent purpose or lifecycle.

**Do not use when:** a divider or page flow communicates the grouping more clearly.

## Form field and field group

**Purpose:** collect or edit server-validated values.

**Anatomy:** label, required/optional cue, control, hint, error, optional dirty indicator.

**Variants:** input, select, textarea, checkbox, radio, switch, combobox, date/time.

**Sizes:** 36px compact, 40px default, 44px touch; 8px field gap.

**States:** default, focus, filled, disabled, loading, invalid, valid/saved, conflict.

**Interaction:** preserve values after validation; submit only coherent groups; support keyboard and
native semantics before custom widgets.

**Accessibility:** label association, described-by hint/error, `aria-invalid`, fieldset/legend for
related controls.

## Save bar

**Purpose:** make persistence state and the next action explicit.

**Anatomy:** dirty/saved/conflict message, primary Save, secondary Cancel/Reset, optional last-saved.

**Variants:** inline footer, sticky bottom bar, editor header.

**States:** clean, dirty, saving, saved, failed, conflict, forbidden.

**Interaction:** block duplicate saves; explain conflicts; do not silently discard edits.

**Accessibility:** status region; focus moves to first invalid field, not merely the banner.

## Tabs

**Purpose:** switch between sibling views without changing the record identity.

**Anatomy:** tablist, tab buttons, one tabpanel.

**Variants:** line, compact, scrollable.

**Sizes:** 36-40px height; 12px horizontal padding.

**States:** active, hover, focus, disabled, loading panel.

**Interaction:** arrow/Home/End navigation; preserve panel state when safe.

**Accessibility:** WAI-ARIA tab pattern with `aria-controls` and `aria-selected`.

## Menu / popover

**Purpose:** reveal short contextual actions or staged filters.

**Anatomy:** trigger, anchored surface, grouped items, optional footer.

**Variants:** action menu, filter popover, date picker, help popover.

**Sizes:** 8px outer padding; 32-36px item height; modest overlay radius/shadow.

**States:** open, hover, focus, disabled, loading action.

**Interaction:** Escape closes; focus returns to trigger; destructive item is separated and labeled.

**Accessibility:** menu semantics only for actions; popover content gets a heading/label.

## Dialog

**Purpose:** confirm a consequence or complete a short self-contained task.

**Anatomy:** title, consequence/description, fields if needed, cancel, primary/danger action.

**Variants:** confirmation, short form, alert.

**Sizes:** max width 480px for confirmation; wider only for a genuinely short form.

**States:** opening, submitting, error, success/closed.

**Interaction:** focus trap, Escape when safe, no destructive default focus, explicit consequence copy.

**Accessibility:** dialog label/description, focus management, `aria-describedby` for consequence.

**Do not use when:** the workflow needs multiple steps, deep links, or a large table/editor.

## Drawer / inspector

**Purpose:** inspect or edit related detail without losing the current list/editor context.

**Anatomy:** title/context, close, content, optional sticky action footer.

**Variants:** detail drawer, filter panel, editor inspector; full-height mobile.

**Sizes:** 360-480px desktop; full width or near-full height on phone.

**States:** open, loading, dirty, validation error, saving, forbidden.

**Interaction:** restore focus; preserve background context; close confirmation for dirty changes.

**Accessibility:** labeled dialog or complementary region; focus management; Escape behavior.

## Feedback message

**Purpose:** explain a current state or result near its source.

**Anatomy:** semantic icon (optional), title or short message, detail, optional retry/action.

**Variants:** info, success, warning, danger, empty, unavailable, forbidden.

**States:** static or live update.

**Interaction:** retry is a labeled action; dismiss only when dismissal is safe.

**Accessibility:** `role=status` for non-urgent changes, `role=alert` for blocking errors.

## Pagination

**Purpose:** move through a bounded collection without losing filters.

**Anatomy:** range/total text, previous/next, optional page selector.

**Variants:** compact, table footer, infinite-load trigger only when the product requirement calls for it.

**States:** first, middle, last, loading, unavailable.

**Accessibility:** disabled controls expose state; current page/range is announced.

## Metric summary

**Purpose:** expose a decision-relevant operational measure.

**Anatomy:** label, value, comparison/timeframe, source or drill-in link.

**Variants:** inline summary, small panel, chart companion.

**States:** ready, loading, unavailable, forbidden, stale.

**Use when:** the value leads to a queue, report, or action.

**Do not use when:** it is decorative or duplicates a table count without added context.

## Chart and reporting block

**Purpose:** show a trend or relationship that supports an operational decision.

**Anatomy:** question/title, timeframe/source/filter controls, visualization, legend, exact-value
table or tooltip, freshness/empty state.

**Variants:** line, bar, comparison, status distribution.

**States:** loading, no data, partial, error, stale.

**Accessibility:** provide a text/table alternative and descriptive title; do not rely on color-only
series.

## Complex editor surface

**Purpose:** construct or configure a multi-step workflow.

**Anatomy:** contextual header, toolbar, canvas/work surface, selected-object inspector, validation
summary, save/publish controls.

**Variants:** workflow builder, policy editor, catalog editor.

**States:** draft, dirty, selected, invalid, saving, published, permission-limited.

**Interaction:** selection is obvious; inspector is contextual; publish is distinct from save draft.

**Accessibility:** keyboard navigation, focusable nodes, labels for connection/relationship actions,
non-visual validation summary.
