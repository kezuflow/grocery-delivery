# Security-header verification

Run this check against each deployed API and web origin after every release:

```text
curl -sSI https://api-staging.getscenepass.com/health
curl -sSI https://app-staging.getscenepass.com/
```

Confirm the response includes `cache-control: no-store` for health and authenticated responses,
HSTS on HTTPS origins, `x-content-type-options: nosniff`, a restrictive content-security policy,
and frame protection. Confirm CORS allows only the configured application origin and that a
state-changing request with no origin or an untrusted origin is rejected.

Record the timestamp, release version, origin, response headers, and correlation ID. A missing
header blocks the release until the configuration is corrected and rechecked.
