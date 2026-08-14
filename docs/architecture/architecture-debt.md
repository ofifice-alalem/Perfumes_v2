# ⚠️ Architecture Debt Analysis & Vulnerability Audit — Perfumes_v2

This document identifies technical debt, code smells, god classes, and architectural bottlenecks in **Perfumes_v2**.

---

## 🔍 Technical Debt Register

| ID | Finding / Debt Item | Severity | Evidence / File Path | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **DEBT-001** | **Monolithic Repository God Class** | `High` | [`app/Repositories/ReportRepository.php`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/app/Repositories/ReportRepository.php) (4,700+ lines, 250KB) | Reduced maintainability; multiple complex reporting domains combined in a single class. |
| **DEBT-002** | **Direct Database QueryBuilder Usage in Repositories** | `Medium` | [`app/Repositories/ReportRepository.php#L67-L160`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/app/Repositories/ReportRepository.php#L67-L160) | Skips Eloquent model abstractions; relies heavily on manual `DB::table(...)` joins. |
| **DEBT-003** | **Debug Flag Enabled in Environment** | `Medium` | [`file:///.env#L4`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/.env#L4) (`APP_DEBUG=true`) | Potential information disclosure if stack traces are rendered on production errors. |
| **DEBT-004** | **Database Default Credentials in Repository Configs** | `Low` | [`file:///config/database.php`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/config/database.php) | Standard dev credentials fallback present in default files. |
| **DEBT-005** | **Legacy Root Testing Scripts** | `Low` | [`test_profit.php`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/test_profit.php), [`test_sql.php`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/test_sql.php) in root | Stray CLI scratch files lingering in project root directory. |

---

## 🛠️ Detailed Analysis of Key Debt Items

### 1. DEBT-001: Large Monolithic `ReportRepository.php`
- **Context**: `ReportRepository.php` contains method implementations for product movement, stock status, customer aging, supplier aging, sales reports, purchase reports, profit analysis, and Excel/PDF generation for each.
- **Risk**: Hard to unit test individual reports; changes to one report risk side effects on others.
- **Recommended Action**: Refactor into domain-specific reporting services (e.g. `CustomerAgingReportService`, `ProductMovementReportService`).

### 2. DEBT-003: `APP_DEBUG=true` in Production `.env`
- **Context**: The `.env` file currently sets `APP_DEBUG=true`.
- **Risk**: Exposes detailed PHP stack traces, SQL queries, and environment secrets to client browsers on uncaught exceptions.
- **Recommended Action**: Set `APP_DEBUG=false` for production deployments.
