# ADR-0004: Implement Server-Side 30-Item Slice + AJAX Load-More Pagination for Reports

## Status
Accepted

## Context
Rendering large movement histories (e.g. 1000+ customer or supplier transactions) caused client-side browser DOM sluggishness and excessive server memory payloads.

## Decision
Implement a hybrid pagination architecture across all reporting screens (Customer Invoices, Supplier Invoices, Customer Aging, Supplier Aging, Product Movement):
1. **Server-Side Aggregations**: Calculate total debt, net balance, and aging buckets across 100% of historical records in SQL.
2. **Initial Slice**: Return only the first 30 movements/invoices in the initial Inertia prop payload.
3. **AJAX Load-More Protocol**: Expose `/reports/{domain}/load-more` endpoints to fetch subsequent 30-item chunks on demand and append to React component state.

## Consequences

### Positive
- Initial page load rendered in milliseconds regardless of total history volume.
- Preserves 100% accuracy of financial totals and debt age metrics.
- Seamless UI experience with dynamic "Load More" buttons without full page refreshes.

### Negative
- Requires maintaining client-side state maps in React components for dynamic row appending.
