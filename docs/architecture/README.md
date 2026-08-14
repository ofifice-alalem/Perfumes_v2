# 🏛️ Executive Architecture Overview — Perfumes_v2

Welcome to the architectural documentation suite for **Perfumes_v2**, a high-performance, single-tenant POS, Inventory ERP, Accounting & Reporting Management System built for perfume and retail businesses.

---

## 🎯 Architecture Summary

- **Architecture Pattern**: Monolithic Single-Page Application (SPA) driven by **Inertia.js** coupling Laravel backend logic directly with React frontend components without decoupled REST overhead.
- **Backend Framework**: [Laravel 13](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/composer.json) on [PHP 8.4](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/composer.json#L9) with repository abstraction pattern.
- **Frontend Engine**: React 19 + TypeScript + Vite 8 + TailwindCSS v3 + Lucide Icons + Spatial UI (VisionOS inspired design system).
- **Data & Caching Layer**: MySQL 8.0 / MariaDB for persistent relational storage + Redis 7.0 for session management, fast caching (`CACHE_STORE=redis`), and queue processing (`QUEUE_CONNECTION=redis`).
- **Web Server Topology**: Apache 2.4 Server on Windows (`C:\Apache24`) with SSL (`mkcert` generated certificates for `tajori.store`) and VBScript auto-recovery background service wrappers.
- **Reporting Engine**: Dynamic AJAX server-side pagination (30-item slice rendering + load-more API endpoints), DomPDF for PDF streaming, and PhpSpreadsheet for Excel exports.

---

## 🧭 Architecture Documentation Index

| Document | Purpose & Scope |
| :--- | :--- |
| 📊 [**C4 Architecture Model**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/c4-model.md) | System Context (L1), Container View (L2), Component View (L3), and Workflow Code Views (L4). |
| 💾 [**Data Architecture**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/data-architecture.md) | Database schema, Eloquent models, accounting periods, snapshots, and Redis caching topology. |
| 🔌 [**API & Route Architecture**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/api-architecture.md) | Routing maps, Inertia endpoints, AJAX load-more protocols, and role-based permissions. |
| 🛡️ [**Security Architecture**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/security-architecture.md) | Authentication guards, Spatie RBAC, HTTPS/SSL certificates, license activation, and threat model. |
| 🚀 [**Deployment & Infrastructure**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/deployment-architecture.md) | Apache 2.4 configuration, PHP 8.4 binding, Windows `sc.exe` auto-recovery, and VBS startup automation. |
| 📈 [**Quality Attributes**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/quality-attributes.md) | Performance benchmarks, memory allocation strategies, PDF/Excel streaming limits, and availability. |
| ⚠️ [**Architecture Debt Analysis**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/architecture-debt.md) | Code smells, large repository files (`ReportRepository.php`), legacy scripts, and technical debt log. |
| 🗺️ [**Architectural Roadmap**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/recommendations.md) | Proposed refactoring pathways, query optimizations, and future architectural enhancements. |
| 📝 [**ADRs (Decision Records)**](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/docs/architecture/adrs/0001-use-laravel-inertia-react-monolith.md) | Formal records of technical architectural choices (Monolith, Repository Pattern, Redis, Pagination). |

---

## 🛠️ Key Technology Stack Table

| Component | Technology | Version | Key Responsibility |
| :--- | :--- | :--- | :--- |
| **Language Runtime** | PHP | `^8.4` | Backend server execution |
| **Framework** | Laravel | `^13.0` | Core application framework & dependency injection |
| **SPA Bridge** | Inertia.js | `^3.0` | Server-driven SPA page routing & prop passing |
| **Frontend Framework**| React | `^19.2` | Interactive Spatial UI component framework |
| **Bundler** | Vite | `^8.0` | Fast asset compilation & HMR |
| **Database** | MySQL | `>= 8.0` | Relational persistence & aggregate queries |
| **In-Memory Store** | Redis (Predis) | `^3.5` | Sessions, application cache, and queued jobs |
| **Web Server** | Apache HTTP Server | `2.4` | Reverse proxy, SSL termination, and static asset serving |
| **Reporting PDF** | DomPDF / ArPHP | `^3.1` / `^7.0` | Arabic RTL PDF document generation |
| **Reporting Excel** | PhpSpreadsheet | `^3.1` | Excel file export generation |
