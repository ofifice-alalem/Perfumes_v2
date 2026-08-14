# ADR-0002: Use Repository Pattern for Data Access Abstraction

## Status
Accepted

## Context
Complex financial calculations, inventory movement tracking, customer aging, and reporting require raw SQL performance, aggregation logic, and data access isolation separate from HTTP controllers.

## Decision
Implement the **Repository Pattern** using interfaces under `app/Repositories/Contracts/` and concrete implementations under `app/Repositories/`.
Controllers inject `ReportRepositoryInterface`, `ProductRepositoryInterface`, etc., via Laravel dependency injection.

## Consequences

### Positive
- Decouples controllers from direct database query building.
- Enables swapping or mocking data sources in tests.
- Centralizes complex SQL aggregations in dedicated repository classes.

### Negative
- `ReportRepository.php` has grown large and requires ongoing modularization into domain sub-services.
