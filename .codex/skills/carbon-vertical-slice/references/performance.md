# Performance

Measure before optimizing. For web work, capture request counts, dependency chains, TTFB, FCP,
LCP, INP, CLS, bundle sizes, and API latency with the browser performance workflow when available.
For Workers/API work, measure D1 query time, transaction duration, queue lag, cache hit rate, and
provider latency.

Avoid request waterfalls and N+1 reads. Compose a bounded server read or projection rather than
serially fetching each card/item. Cache only public or safely disposable data; never cache
customer, permission, order, payment, price-lock, or availability decisions without an explicit
correctness design. Use stable image dimensions, optimized remote/local media, streaming for large
payloads, and dynamic imports for non-critical UI.

Record the baseline, expected impact, and verification result. A performance claim without before
and after evidence is an audit hypothesis, not a completed optimization.
