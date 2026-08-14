# 📊 C4 Architecture Model — Perfumes_v2

This document describes the architectural structure of **Perfumes_v2** using the C4 model specification (Context, Container, Component, Code).

---

## Level 1: System Context Diagram

The System Context diagram shows the high-level boundary of the Perfumes_v2 application, its actors, and external system integrations.

```mermaid
graph TD
    User["Store Manager / POS Operator / Super Admin"]
    System["Perfumes_v2 POS & Inventory ERP System (Laravel 13 + Inertia + React)"]
    MySQL[("MySQL 8.0 Database")]
    Redis[("Redis 7.0 Cache & Sessions")]
    ExternalPrinter["POS Barcode & Receipt Printers"]

    User -->|HTTP / HTTPS (SSL)| System
    System -->|Eloquent / SQL QueryBuilder| MySQL
    System -->|Cache / Sessions / Queues| Redis
    System -->|Thermal Print / Direct PDF| ExternalPrinter
```

### Context Entities
- **Users**: Super Admins, Administrators, Cashiers, and Inventory Staff accessing via browser or desktop PWA wrapper.
- **Perfumes_v2 System**: The primary ERP system handling sales, purchases, customer/supplier aging, inventory logs, waste tracking, accounting periods, and reporting.
- **MySQL Database**: Stores core entities, audit logs, accounting period snapshots, and transactions.
- **Redis Server**: High-speed memory store for session persistence (`SESSION_DRIVER=redis`), query caching (`CACHE_STORE=redis`), and background queue listeners (`QUEUE_CONNECTION=redis`).
- **External Hardware**: Thermal receipt printers, ESC/POS hardware, barcode scanners.

---

## Level 2: Container Diagram

The Container diagram illustrates the high-level technical building blocks that make up the system architecture.

```mermaid
graph TB
    subgraph Browser ["Client Browser / Edge PWA"]
        ReactUI["React 19 Frontend Components (Inertia.js + TailwindCSS + Lucide)"]
    end

    subgraph WebServer ["Web Server Layer (C:\\Apache24)"]
        Apache["Apache 2.4 Server (HTTPS / Port 443)"]
        PHPRuntime["PHP 8.4 Engine (Apache Module php8apache2_4.dll)"]
    end

    subgraph AppLayer ["Laravel 13 Application Layer"]
        InertiaAdapter["Inertia Router Adapter"]
        Controllers["Http Controllers (Report, Invoice, Purchase, Period, Backup)"]
        Services["Business Services (RolloverService, LicenseService)"]
        Repositories["Repository Pattern Layer (ReportRepository, ProductRepository, etc.)"]
    end

    subgraph DataLayer ["Data & Storage Layer"]
        MySQL[("MySQL Database (perfumes_v2)")]
        Redis[("Redis In-Memory Store (predis)")]
        LocalStorage["Local Storage (Backups, Storage Disks)"]
    end

    ReactUI -->|Inertia / JSON / Axios| Apache
    Apache -->|CGI / Module| PHPRuntime
    PHPRuntime --> InertiaAdapter
    InertiaAdapter --> Controllers
    Controllers --> Services
    Controllers --> Repositories
    Services --> Repositories
    Repositories -->|SQL Queries| MySQL
    Repositories -->|Cache / Lock| Redis
    Controllers -->|Disk Backups| LocalStorage
```

---

## Level 3: Component Diagram (Reporting Subsystem)

The Component diagram breaks down the Reporting & Data Retrieval subsystem, highlighting repository abstraction and pagination mechanisms.

```mermaid
graph LR
    subgraph FrontendPage ["React Component"]
        Page["CustomerAging.tsx / ProductMovement.tsx"]
        AJAX["Fetch API (load-more)"]
    end

    subgraph ControllerLayer ["Http Layer"]
        Ctrl["ReportController.php"]
    end

    subgraph RepositoryLayer ["Data Abstraction Layer"]
        RepoInterface["ReportRepositoryInterface.php"]
        RepoImpl["ReportRepository.php"]
    end

    subgraph StorageEngine ["Database Engine"]
        MySQL[("MySQL Database")]
        DomPDF["DomPDF / ArPHP Streamer"]
        PhpExcel["PhpSpreadsheet Writer"]
    end

    Page -->|Initial Render Request| Ctrl
    AJAX -->|AJAX JSON Load More| Ctrl
    Ctrl --> RepoInterface
    RepoInterface --> RepoImpl
    RepoImpl -->|Raw DB SQL Aggregates & Slice| MySQL
    RepoImpl -->|Render PDF Stream| DomPDF
    RepoImpl -->|Generate XLSX File| PhpExcel
```

---

## Level 4: Code Diagram (Report Pagination Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor User as Store Manager
    participant UI as React UI (Inertia)
    participant Route as Laravel Router
    participant Ctrl as ReportController
    participant Repo as ReportRepository
    participant DB as MySQL DB

    User->>UI: Request Report (e.g., Customer Aging / Product Movement)
    UI->>Route: GET /reports/customer-aging?limit=30
    Route->>Ctrl: customerAging(Request $request)
    Ctrl->>Repo: customerAging(customerId, dateFrom, dateTo, showAllHistory, 30)
    Repo->>DB: Query DB::table('invoices', 'payments', 'settlements') Aggregates
    DB-->>Repo: Financial Aggregates & Initial 30 Movements
    Repo->>Repo: Slice movements to 30 & compute movements_count
    Repo-->>Ctrl: Array Data (opening_stock, movements, total_count)
    Ctrl-->>UI: Inertia::render('Reports/CustomerAging', data)
    UI-->>User: Render Spatial Table + "Load More" Button

    opt Load More Clicked
        User->>UI: Click "رؤية المزيد من الحركات"
        UI->>Route: GET /reports/customer-aging/load-more?offset=30&limit=30
        Route->>Ctrl: customerAgingLoadMore(Request $request)
        Ctrl->>Repo: loadMoreCustomerMovements(customerId, 30, 30, ...)
        Repo->>DB: Fetch next offset slice
        DB-->>Repo: Next 30 Movements
        Repo-->>Ctrl: JSON Response { movements, has_more }
        Ctrl-->>UI: JSON Response
        UI-->>User: Append Rows Dynamically to Table
    end
```
