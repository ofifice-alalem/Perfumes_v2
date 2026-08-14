# 📈 Quality Attributes & Performance Blueprint — Perfumes_v2

This document defines performance benchmarks, scalability limits, availability controls, and observability for **Perfumes_v2**.

---

## ⚡ Performance Optimizations

### 1. Server-Side Data Slicing (30-Item Pagination)
To prevent browser UI lag and database memory overload on large datasets (e.g. 1000+ invoices or movements per customer/supplier), reports load **30 items initially**:
- Compute financial aggregates (totals, debts, aging buckets) across all records in SQL.
- Slice movements array to 30 items for initial render.
- Provide AJAX `load-more` API to append subsequent 30-item batches on demand.

### 2. High-Speed Redis Caching
- **Sessions**: Stored in Redis to bypass file I/O locks (`SESSION_DRIVER=redis`).
- **Data Caching**: Key metrics and query results cached in Redis (`CACHE_STORE=redis`).

### 3. PDF & Excel Export Streaming Limits
Large PDF/Excel reports are protected against out-of-memory errors:
```php
@ini_set('memory_limit', '512M');
@set_time_limit(180);
```

---

## 🛡️ Availability & Fault Tolerance

| Attribute | Strategy | Implementation |
| :--- | :--- | :--- |
| **Server Crash Recovery** | Automatic Windows Service Restart | `sc.exe failure Apache2.4 actions= restart/1000` |
| **Session Loss Prevention** | Redis In-Memory Session Storage | Persistent Redis session driver |
| **Data Integrity & Backups** | Database Backup Subsystem | Zip compressed MySQL dumps via `BackupController` |
| **System Health Check** | Startup VBS Probe Loop | Checks HTTP `200 OK` status before launching UI |

---

## 🔍 Observability & Logging

- **Log Channel**: Single stack logging configured in [`config/logging.php`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/config/logging.php) pointing to `storage/logs/laravel.log`.
- **Error Level**: Settable in `.env` (`LOG_LEVEL=error`).
- **Laravel Pail**: Development live log viewer integration (`laravel/pail`).
- **Audit Logging**: Model audit tracking via **Spatie / Owen-it Laravel Auditing** (`owen-it/laravel-auditing`).
