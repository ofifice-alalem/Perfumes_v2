# 🔌 API & Integration Architecture — Perfumes_v2

This document details the routing architecture, Inertia protocol integration, AJAX pagination contracts, and export endpoints in **Perfumes_v2**.

---

## 🛰️ Architecture Pattern: Inertia Server-Driven SPA

Rather than exposing a traditional REST/GraphQL API for internal UI, Perfumes_v2 uses **Inertia.js** to bridge Laravel controllers directly to React frontend components.

```text
Browser Client (React UI)  <===> Inertia Request / JSON Prop Payloads <===> Laravel Controllers
```

---

## 🗺️ Key Route Domains (`routes/web.php`)

### 1. Authentication & Licensing
- `GET /license` — License status check
- `POST /license/activate` — License activation
- `GET /login` — Guest login screen
- `POST /logout` — Authenticated session termination

### 2. Super Admin System Management (`role:super-admin`)
- `GET /` — Executive Dashboard
- `GET /backups` — Database backup listing
- `POST /backups/create` — Trigger database dump backup
- `POST /backups/restore/{filename}` — Restore database state
- `GET /periods` — Accounting period overview
- `GET /periods/rollover` — Period closure & rollover wizard

### 3. Inventory & Operations (`role:super-admin|admin`)
- `RESOURCE /categories` — Category CRUD
- `RESOURCE /products` — Product CRUD & stock adjustment
- `PATCH /products/{id}/qrcode` — Update barcode/QR code
- `RESOURCE /purchases` — Supplier purchase bills
- `RESOURCE /invoices` — Customer sales invoices
- `RESOURCE /waste-logs` — Damage / waste tracking

### 4. Advanced Reporting & AJAX Pagination (`role:super-admin|admin`)
- `GET /reports/sales/customer-invoices` — Customer sales report
- `GET /reports/sales/customer-invoices/load-more` — AJAX load 30 more invoices
- `GET /reports/purchases/supplier-invoices` — Supplier purchase report
- `GET /reports/purchases/supplier-invoices/load-more` — AJAX load 30 more invoices
- `GET /reports/customer-aging` — Customer debt aging report
- `GET /reports/customer-aging/load-more` — AJAX load 30 more movements
- `GET /reports/supplier-aging` — Supplier debt aging report
- `GET /reports/supplier-aging/load-more` — AJAX load 30 more movements
- `GET /reports/product-movement` — Product movement ledger
- `GET /reports/product-movement/load-more` — AJAX load 30 more movements

---

## ⚡ AJAX Load-More Protocol Contract

All load-more endpoints follow a unified request/response contract:

### Request Format
`GET /reports/{report-type}/load-more?id={entity_id}&offset=30&limit=30`

### Response Format
```json
{
  "movements": [
    {
      "date": "2026-08-14 15:30:00",
      "type": "sale",
      "quantity": -2,
      "unit_price": 150.0,
      "reference": "INV#1042",
      "balance": 48.0
    }
  ],
  "has_more": true,
  "next_offset": 60
}
```
