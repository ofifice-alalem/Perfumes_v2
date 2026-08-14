# 🗺️ Architectural Improvement Roadmap — Perfumes_v2

This document outlines strategic architectural recommendations and improvement pathways for **Perfumes_v2**.

---

## 🎯 Architectural Priorities Matrix

```text
High Impact  | [Rec-1: Split ReportRepository]   [Rec-2: Production Hardening (APP_DEBUG=false)]
             |
Low Impact   | [Rec-3: Clean Root Test Scripts]  [Rec-4: Add Automated Feature Tests]
             +-------------------------------------------------------------------------
               Low Effort                          High Effort
```

---

## 📋 Recommendations Detail

### 1. Refactor `ReportRepository.php` into Modular Domain Services
- **Goal**: Decompose the 4,700+ line repository into targeted reporting services:
  - `App\Services\Reports\CustomerReportService`
  - `App\Services\Reports\SupplierReportService`
  - `App\Services\Reports\InventoryReportService`
  - `App\Services\Reports\ProfitReportService`
- **Benefit**: Improves testability, code isolation, and team readability.

### 2. Enforce Production Security Defaults
- **Goal**: Set `APP_DEBUG=false` and `LOG_LEVEL=error` in the production environment.
- **Benefit**: Prevents disclosure of system information on unexpected runtime errors.

### 3. Cleanup Root Scratch Scripts
- **Goal**: Remove stray files `test_profit.php`, `test_sql.php`, `fix_fonts.php` from root directory or move to `tests/Scratch/`.
- **Benefit**: Keeps codebase clean and standard compliant.

### 4. Implement Automated Pest / PHPUnit Test Coverage
- **Goal**: Add automated Pest unit/feature tests for key financial calculations (Customer Aging, Supplier Debt, Stock Valuation, Period Rollover).
- **Benefit**: Guarantees zero financial regressions during future refactoring.
