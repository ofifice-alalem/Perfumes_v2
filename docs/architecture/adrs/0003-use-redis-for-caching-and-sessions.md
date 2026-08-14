# ADR-0003: Use Redis for In-Memory Caching and Session Persistence

## Status
Accepted

## Context
High-frequency POS operations, rapid Inertia page transitions, and concurrent report queries created session lock bottlenecks when using file-based sessions and database caching.

## Decision
Configure **Redis 7.0** via `predis/predis` as the primary driver for:
- `SESSION_DRIVER=redis`
- `CACHE_STORE=redis`
- `QUEUE_CONNECTION=redis`

## Consequences

### Positive
- Zero file locking overhead on concurrent requests.
- Sub-millisecond session retrieval and cache response times.
- Supports background job processing without SQLite or MySQL queue table contention.

### Negative
- Requires Redis service to be running on the host system (mitigated by environment deployment guides and scripts).
