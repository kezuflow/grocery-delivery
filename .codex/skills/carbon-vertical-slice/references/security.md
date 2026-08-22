# Security

Authorization is server-side and scoped: customers see their own records, deliverymen see assigned
work, and admins use permission-scoped access. Hiding a button is not authorization. Sensitive
admin actions require audit events and recent authentication/MFA where the domain requires it.

Validate all input and output at contracts. Use secure HTTP-only cookies, origin/CSRF controls,
strict CORS, CSP, rate limits, and signed webhook verification. Keep secrets in Workers Secrets,
never source, fixtures, or wrangler vars. Do not log credentials, payment data, tokens, or personal
data. Use cryptographic randomness for IDs/tokens and timing-safe comparisons for secrets.

Review tenant/customer scope on every read and write, object/media authorization, export/deletion
eligibility, replay/idempotency abuse, and error disclosure. Treat local fixtures as test-only and
keep staging credentials outside version control.
