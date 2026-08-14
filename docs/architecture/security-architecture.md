# 🛡️ Security Architecture & Controls — Perfumes_v2

This document describes the security controls, authentication mechanisms, authorization rules, encryption, and threat modeling for **Perfumes_v2**.

---

## 🔒 Authentication & Identity Management

- **Authentication Driver**: Laravel Session Authentication with Redis store (`SESSION_DRIVER=redis`).
- **Password Hashing**: Bcrypt with round work factor of 12 (`BCRYPT_ROUNDS=12`).
- **Session Encryption**: Configurable session payload encryption with automatic cookie rotation (`SESSION_LIFETIME=120`).

---

## 🔑 Role-Based Access Control (RBAC)

Permission handling is enforced via **Spatie Laravel Permission** (`spatie/laravel-permission`):

```mermaid
graph TD
    User["Authenticated User"]
    RoleCheck{"Check Middleware Role"}
    SuperAdmin["Super Admin Role"]
    Admin["Admin Role"]
    Cashier["Cashier / User Role"]

    User --> RoleCheck
    RoleCheck -->|`role:super-admin`| Dashboard["Full System Access (Backups, Periods, Users)"]
    RoleCheck -->|`role:super-admin|admin`| Inventory["Management Access (Products, Invoices, Reports)"]
    RoleCheck -->|`auth`| POS["POS & Standard Sales Entry"]
```

---

## 🌐 Network & Infrastructure Security (SSL/HTTPS)

- **Local & Production HTTPS**: Enforced SSL certificate generated via `mkcert` bound to Apache 2.4 VirtualHost on Port 443 (`tajori.store.pem` & `tajori.store-key.pem`).
- **HTTP to HTTPS Redirection**: Permanent 301 redirection on Port 80.
- **CSRF Protection**: Laravel CSRF Token validation enforced on all POST/PUT/PATCH/DELETE requests via Inertia Axios headers.

---

## 📜 Software Licensing Subsystem

The application features a built-in software licensing module managed by [`app/Services/LicenseService.php`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/app/Services/LicenseService.php):
- Checks hardware machine signatures and expiration dates.
- Restricts access if the system license is inactive or expired via [`app/Http/Controllers/LicenseController.php`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/app/Http/Controllers/LicenseController.php).

---

## ⚠️ Threat Model & Security Mitigations

| Threat | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **SQL Injection** | High | PDO parameterized queries via Eloquent ORM & QueryBuilder |
| **Cross-Site Scripting (XSS)** | Medium | React JSX auto-escaping & Inertia JSON prop serialization |
| **CSRF Attacks** | Medium | `VerifyCsrfToken` middleware + SameSite cookie policies |
| **Unauthorized Backup Download** | High | Restricted to `super-admin` role via middleware |
| **Uncontrolled PDF Memory Exhaustion** | High | Capped execution memory (512M) & time limit (180s) |
