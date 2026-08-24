# Admin Design Research References

This document records the authenticated Customer.io references sampled through the Mobbin MCP. It
is research evidence, not implementation authority. Use `DESIGN.md` for Carbon decisions.

## Method

Searches were sampled across unrelated Customer.io product areas rather than processing every
screenshot. The sample reached saturation when new screens repeated the same shell, table, filter,
detail, editor, and state patterns. Marketing pages and consumer checkout screens were excluded.

The MCP results were inspected as images, not inferred from metadata alone.

## Application shell and settings

### Reference

[Customer.io subscription center / authenticated settings shell](https://mobbin.com/screens/feeb92d2-8b6e-4839-aa1d-c07a79149b96)

### Why It Matters

Shows the recurring authenticated shell: a compact left navigation, workspace context, global
search, help/account actions, a page title, local tabs, and bordered setting sections.

### Principles Extracted

- Keep global navigation persistent and contextual navigation separate.
- Use a sticky utility header for global search and account/help actions.
- Use an open page with bordered sections instead of a deep card hierarchy.
- Put enablement warnings close to the affected setting and provide a direct review action.

### Reference-Specific Elements

Customer.io branding, upgrade prompt, subscription terminology, and bottom assistant bar are not
Carbon defaults.

## People table, selection, and destructive confirmation

### Reference

[Customer.io people table with bulk actions](https://mobbin.com/screens/0596b84f-f48a-4e08-86df-052f7333ff9d)

[Customer.io people deletion confirmation](https://mobbin.com/screens/fe9949d6-77db-4e90-8d8c-2613496bef39)

### Why It Matters

This is the strongest table reference for selection, pagination, filter chips, bulk actions, and
consequence-specific destructive confirmation.

### Principles Extracted

- Keep a visible collection count and range.
- Put selection in the first column and expose bulk actions only after selection.
- Use a compact filter row with search and an advanced-condition affordance.
- A destructive dialog names the count, consequence, compliance implication, and final action.

### Reference-Specific Elements

GDPR/CCPA copy, email-address examples, Customer.io's exact table colors, and its app-specific tabs
must not be copied.

## Person detail and activity

### Reference

[Customer.io person detail activity view](https://mobbin.com/screens/a8cabaf8-cf6f-4331-9e8b-98523d4b1776)

### Why It Matters

Shows a detail archetype with breadcrumb context, identity/status metadata, sibling tabs, and a
chronological activity table with expandable rows.

### Principles Extracted

- Put identity and current status above tabs.
- Use tabs for Overview, Attributes, Relationships, Segments, and Activity-like sibling views.
- Make timestamps, source, and object identifiers explicit in audit-oriented views.
- Let a row expand for details without navigating away from the record.

### Reference-Specific Elements

Customer.io audience concepts and event names are not Carbon domain rules.

## Campaign list and filtering

### Reference

[Customer.io campaign list](https://mobbin.com/screens/2fdd46ae-e901-4277-b3f5-aa6a4c918a35)

### Why It Matters

Shows a mature list-page pattern: page header action, multiple compact filters, active/archived
tabs, date range, table metrics, row-level editing, status markers, and durable success feedback.

### Principles Extracted

- Combine high-frequency filters inline and move advanced filtering behind a controlled field.
- Keep active/archived state explicit rather than mixing lifecycle states into one opaque list.
- Make a successful action visible near the bottom of the work area without replacing durable state.
- Use short status labels and keep metrics aligned to the row.

### Reference-Specific Elements

Campaign metrics, tag taxonomy, date range, and "Create campaign" language are not Carbon copy.

## Workflow editor and inspector

### Reference

[Customer.io campaign workflow editor](https://mobbin.com/screens/fc8a07b1-a1f7-42e3-9b51-5c30143a41c1)

[Customer.io design-studio inspector](https://mobbin.com/screens/be7024ed-a683-4c0d-981a-41047fed0e4f)

### Why It Matters

Shows how a dense builder separates the canvas, toolbar, add-node surface, selected-object
inspector, draft/review controls, and validation hints.

### Principles Extracted

- Give complex work a stable URL and contextual header.
- Keep the work surface visually quiet so nodes, edges, and selected states carry meaning.
- Use an inspector/drawer for properties of the selected object; do not duplicate controls.
- Distinguish draft, review, save, and publish states.
- Attach warnings to the specific object and summarize blockers near the primary action.

### Reference-Specific Elements

Message-channel taxonomy, AI labels, grid styling, and Customer.io's beta/assistant affordances are
not Carbon defaults.

## Analytics and reporting

### Reference

[Customer.io analysis report](https://mobbin.com/screens/f6f69799-82ad-4071-892d-4de09085977e)

### Why It Matters

Shows filters, tags, source toggles, date range, chart, metric-definition help, and a table-oriented
reporting mindset.

### Principles Extracted

- Expose timeframe and source filters before the chart.
- Let users refine results without leaving the report.
- Give charts a clear metric definition and exact-value fallback.
- Treat no-data and excluded-data states as meaningful, not as blank canvas.

### Reference-Specific Elements

Customer.io's campaign channels, tag names, chart palette, and report vocabulary are not Carbon
identity or product requirements.

## Integrations and configuration

### Reference

[Customer.io integration settings](https://mobbin.com/screens/7034b4bb-b136-42b3-8d1f-3f3a24d5b3ec)

[Customer.io subscription-center settings](https://mobbin.com/screens/feeb92d2-8b6e-4839-aa1d-c07a79149b96)

### Why It Matters

Shows record-level tabs, enable/disable controls, warning banners, account connection state, and
actions grouped by integration lifecycle.

### Principles Extracted

- Put enablement state and warnings at the top of the relevant detail page.
- Group configuration by lifecycle: overview, data, actions, tester, settings.
- Use toggles for binary policy state and explicit buttons for connect/disconnect consequences.
- Keep a visible action menu for uncommon integration operations.

### Reference-Specific Elements

Google Sheets, OAuth wording, destination names, and exact teal toggle treatment are not Carbon
defaults.

## Empty and unavailable data

### Reference

[Customer.io activity logs empty state](https://mobbin.com/screens/718cd51f-9f60-4aa1-96c7-c2a6d83b581d)

### Why It Matters

Shows a table-shaped empty state that retains the page's structure while clearly stating that no
data is available.

### Principles Extracted

- Preserve orientation and column context when it helps the operator understand future data.
- Use a concise message rather than decorative illustration.
- Pair empty state with a next action only when one exists.
- Distinguish no data from loading, error, and permission denial.

### Reference-Specific Elements

Anonymous activity terminology and Customer.io's helper links are not Carbon copy.

## Research saturation summary

Across shell, lists, details, analytics, settings, editor, and state screens, the recurring system
rules were: persistent grouped navigation; compact global search; divider-led page headers; dense
tables; filter disclosure; sibling tabs; contextual menus; drawers/inspectors; explicit status and
freshness; and quiet, semantic feedback. Additional sampled screens primarily confirmed these rules.
