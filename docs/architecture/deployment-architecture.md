# 🚀 Deployment Architecture & Infrastructure — Perfumes_v2

This document details the infrastructure topology, Apache web server configuration, Windows background service wrappers, and automated recovery setups for **Perfumes_v2**.

---

## 🖥️ Server Environment Topology

```text
+-----------------------------------------------------------------------------------+
| Host Machine: Windows 10/11 / Windows Server                                      |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Apache 2.4 Web Server (C:\Apache24)                                        |  |
|  | - Port 80 (HTTP -> HTTPS Redirect)                                          |  |
|  | - Port 443 (SSL Enabled - tajori.store)                                     |  |
|  | - PHP 8.4 Engine (php8apache2_4.dll)                                       |  |
|  +------------------+----------------------------------------------------------+  |
|                     |                                                             |
|                     v                                                             |
|  +------------------+----------------------------------------------------------+  |
|  | Laravel 13 Application (C:\Users\alale\...\Perfumes_v2\public)               |  |
|  +------------------+-----------------------+----------------------------------+  |
|                     |                       |                                     |
|                     v                       v                                     |
|  +------------------+------+   +------------+----------------------------------+  |
|  | MySQL 8.0 Database      |   | Redis Server (Predis Client)                     |  |
|  | (perfumes_v2)           |   | (127.0.0.1:6379)                             |  |
|  +-------------------------+   +-----------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 🔧 Apache VirtualHost Configuration

Configured in `C:\Apache24\conf\extra\httpd-vhosts.conf`:

```apache
Listen 443

<VirtualHost *:80>
    ServerName tajori.store
    ServerAlias www.tajori.store
    Redirect permanent / https://tajori.store/
</VirtualHost>

<VirtualHost *:443>
    ServerName tajori.store
    ServerAlias www.tajori.store
    DocumentRoot "C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/public"

    SSLEngine on
    SSLCertificateFile "C:/Apache24/conf/ssl/tajori.store.pem"
    SSLCertificateKeyFile "C:/Apache24/conf/ssl/tajori.store-key.pem"

    <Directory "C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/public">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

---

## ⚡ Windows Auto-Recovery & Background Services

To prevent system downtime in local Windows production deployments, background VBScript wrappers and service recovery rules are active:

1. **Service Failure Action (`sc.exe`)**:
   ```cmd
   sc.exe failure Apache2.4 reset= 86400 actions= restart/1000/restart/1000/restart/1000
   ```
   Forces Windows to automatically restart Apache within 1 second if the process crashes.

2. **Silent Startup Script ([`start.vbs`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/steps_v2/deployment_and_maintenance/repair_and_recovery/start.vbs))**:
   Placed in `shell:startup` to verify server HTTP `200 OK` response on system boot and launch Edge PWA fullscreen mode (`--start-fullscreen`).

3. **Emergency Desktop Repair ([`repair_and_start.vbs`](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/steps_v2/deployment_and_maintenance/repair_and_recovery/repair_and_start.vbs))**:
   Allows cashiers or managers to restart Apache and purge caches silently with a single click.

---

## 📦 Asset Build Pipeline

Vite 8 compiles React components, TailwindCSS styling, and Lucide icons into minified production assets under `public/build/`:
```bash
npm run build
```
Production assets are gzip and brotli compressed (`vite-plugin-compression`).
