# Frontend Engineering

Follow `tokens -> components/ui -> components/layout -> features -> app routes`. Reuse existing
tokens and primitives before adding new recipes. Routes own authorization, metadata, server reads,
and composition; features own domain UI; primitives remain free of sessions, API calls, and
business rules.

Use the typed client and `@carbon/contracts`; do not create feature-local DTOs or a second fetch
layer. Server Components perform initial reads where practical. Add client state only for a real
interaction, browser API, or mutation workflow. Keep server ownership of commerce and permission
values.

Every applicable surface handles loading, empty, recoverable error, terminal error, forbidden,
disabled/in-progress, success, offline/retry, phone, desktop, keyboard, focus, and accessible
status states. Use stable dimensions for media and controls. Follow `docs/frontend-standards.md`
for imagery, tokens, Tailwind, naming, and visual verification.
