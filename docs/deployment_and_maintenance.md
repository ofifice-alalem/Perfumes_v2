# Deployment and Maintenance Guide

This document outlines the deployment procedure, directory requirements, server permissions, and maintenance tasks for **Perfumes_v2**.

---

## 🚀 Deployment Checklist

### 1. High-Performance C++ Exporter Requirement (`/bin`)
For high-performance streamed report generation, ensure the compiled C++ binary is deployed in the `/bin` directory:

- **Directory Path**: `<project_root>/bin/`
- **Windows Executable**: `bin/export_xlsx.exe`
- **Linux Executable**: `bin/export_xlsx`

> **Note:** The executable is pre-compiled and tracked in Git. Ensure `bin/export_xlsx.exe` (or `bin/export_xlsx`) has executable permissions (`chmod +x bin/export_xlsx` on Linux).

---

### 2. Standard Deployment Steps

```bash
# 1. Pull latest code from production branch
git pull origin V4

# 2. Install/Update PHP Dependencies
composer install --no-dev --optimize-autoloader

# 3. Build Frontend Assets
npm install
npm run build

# 4. Execute Database Migrations
php artisan migrate --force

# 5. Clear and Re-cache Framework Configs
php artisan optimize

# 6. Verify Permissions on Temp Storage
chmod -R 775 storage bootstrap/cache
```

---

## 🛠️ Maintenance & Diagnostics

### Verifying C++ Exporter Execution
To verify that reports are generated via the high-performance C++ engine:
1. Open Browser Developer Tools (`F12`).
2. Trigger Excel export on Customer Invoices or Supplier Reports.
3. Inspect HTTP Response Headers for:
   ```http
   X-Export-Engine: C++ Static Binary Exporter
   ```

### Troubleshooting Fallback
If exports take longer than expected (>25 seconds):
1. Check if `bin/export_xlsx.exe` (or `bin/export_xlsx`) exists in the project root.
2. Ensure PHP process user (`www-data` or Apache service user) has execution rights on the `/bin` folder.
3. Test running the binary directly:
   ```bash
   ./bin/export_xlsx test.xlsx
   ```
