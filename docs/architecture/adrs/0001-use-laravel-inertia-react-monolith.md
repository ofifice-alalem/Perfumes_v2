# ADR-0001: Use Laravel + Inertia.js + React Monolithic Architecture

## Status
Accepted

## Context
The business requires a modern, rich, highly responsive single-page application (SPA) user interface for POS and inventory management without the architectural complexity, API duplication, and token management overhead of a decoupled REST/GraphQL API + SPA setup.

## Decision
Adopt **Laravel 13** with **Inertia.js 3** and **React 19**.
- Inertia acts as the routing adapter, receiving server responses and passing props directly to React components.
- Controllers handle logic and return `Inertia::render('PageName', $props)` instead of Blade templates or JSON API payloads.

## Consequences

### Positive
- Single codebase for route definition, authorization, and UI presentation.
- No need to maintain separate API serializers, Swagger specs, or OAuth token refresh flows.
- Full SPA user experience (zero page reloads) with server-side simplicity.

### Negative
- Not directly usable by non-web clients (e.g. native iOS/Android apps) without creating dedicated API endpoints.
