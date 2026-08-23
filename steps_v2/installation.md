# 🚀 دليل تثبيت ونشر المشروع على جهاز جديد (Installation Guide)

> 💡 **ملاحظة هامّة**: للتعرف على الدليل الشامل والمفصل لتثبيت وإعداد Apache 2.4 + PHP 8.4 JIT + Redis وسكريبتات التشغيل التلقائي والطوارئ، يرجى مراجعة [MASTER_DEPLOYMENT_GUIDE.md](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/steps_v2/deployment_and_maintenance/MASTER_DEPLOYMENT_GUIDE.md).

---

## 🛠️ المتطلبات الأساسية للنظام (Prerequisites)
- **PHP**: الإصدار **8.4** (أو >= 8.2) مجهز بـ Extensions: `pdo_mysql`, `curl`, `mbstring`, `openssl`, `gd`, `zip`, `fileinfo`, `opcache`, `redis` (أو predis).
- **Composer**: أحدث إصدار لإدارة حزم PHP.
- **Node.js**: الإصدار 18 أو أعلى مع `npm`.
- **MySQL / MariaDB**: منفذ `3306`.
- **Redis Server**: منفذ `6379` (ضروري لكاش الذاكرة الفائق وسرعة الجلسات).
- **Apache HTTP Server 2.4**: مثبت على `C:\Apache24`.
- **mkcert**: مثبت في `C:\Apache24\bin\mkcert.exe` لتوليد الشهادات المحلية.
- **C++ Compiler (مترجم C++)**: لتوليد تقارير الإكسيل الفائقة (`bin/export_xlsx.exe`).

---

## ⚡ 1. إعدادات السرعة القصوى في PHP (`php.ini`)
افتح ملف `C:\php-8.4.24\php.ini` وأضف/عدل الإعدادات التالية لتفعيل المترجم الفوري (JIT) وتوسيع كاش المسارات:

```ini
; ── OPcache & JIT Compiler (أقصى سرعة لمعالجة الكود) ────────
opcache.enable=1
opcache.enable_cli=1
opcache.jit=tracing
opcache.jit_buffer_size=64M
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0

; ── Realpath Cache (تسريع قراءة مسارات الملفات من القرص) ──
realpath_cache_size=4096k
realpath_cache_ttl=600

; ── الذاكرة والرفع ──────────────────────────────────────
memory_limit=512M
upload_max_filesize=64M
post_max_size=64M
```

---

## ⚡ 2. تثبيت وإعداد خادم Redis (على منفذ 6379)

خادم **Redis** أساسي جداً لتشغيل كاش كتالوج المنتجات اللحظي (`pos_products_catalog_base`) وإدارة جلسات المستخدمين في الذاكرة العشوائية:

### 🔹 التثبيت على Windows:
1. **التثبيت عبر حزمة winget (الأسهل والأسرع):**
   افتح PowerShell كمسؤول ونفذ:
   ```powershell
   winget install Redis.Redis
   ```
   *(أو قم بتحميل مثبت `Redis-x64-*.msi` من [مستودع Redis for Windows الرسمي](https://github.com/tporadowski/redis/releases))*.

2. **تشغيل Redis كخدمة ويندوز تلقائية دائمة:**
   ```powershell
   # تشغيل خدمة Redis وضبطها لتعمل تلقائياً عند إقلاع الويندوز
   Start-Service redis
   Set-Service -Name redis -StartupType Automatic
   ```

3. **التحقق من عمل Redis بنجاح:**
   ```powershell
   redis-cli ping
   # يجب أن تكون الاستجابة: PONG
   ```

### 🔹 التثبيت على Linux (Ubuntu / Debian):
```bash
sudo apt update && sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping # PONG
```

---

## 🚀 3. خطوات تثبيت المشروع

### الخطوة 1: تثبيت اعتماديات PHP
```bash
composer install --no-dev --optimize-autoloader
```

### الخطوة 2: نسخ وتعديل ملف البيئة `.env`
```bash
cp .env.example .env
```
اضبط القيم في `.env`:
```env
APP_NAME=perfumes_v2
APP_ENV=production
APP_DEBUG=false
APP_URL=http://tajori.store

# قاعدة البيانات
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=perfumes_v2
DB_USERNAME=root
DB_PASSWORD=YOUR_DB_PASSWORD

# الكاش والجلسات عبر Redis
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### الخطوة 3: توليد المفتاح وتشغيل الهيكل والبيانات
```bash
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=CoreSystemSeeder --force
```

### الخطوة 4: تثبيت وبناء الـ Frontend
```bash
npm install
npm run build
```

### الخطوة 5: تحسين كاش لارافيل للإنتاج
```bash
php artisan optimize
```

---

## 🌐 3. إعداد خادم أباتشي والمنفذ 80 المباشر

### 1. تحرير المنفذ 80 من خدمة IIS التابعة للويندوز:
نفذ في PowerShell كمسؤول (أو شغل سكريبت `free_port_80.bat`):
```powershell
Stop-Service -Name W3SVC, WAS -Force -ErrorAction SilentlyContinue
Set-Service -Name W3SVC -StartupType Disabled
Set-Service -Name WAS -StartupType Disabled
```

### 2. إضافة الدومين لملف Hosts:
أضف السطور التالية إلى `C:\Windows\System32\drivers\etc\hosts`:
```text
127.0.0.1    tajori.store
127.0.0.1    www.tajori.store
```

### 3. إعداد `C:\Apache24\conf\httpd.conf`:
تأكد من تفعيل الموديولات والإعدادات في نهاية الملف:
```apache
Listen 0.0.0.0:80
Listen [::]:80

# ── موديولات الأداء والتوجيه ──────────────────────────────
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule ssl_module modules/mod_ssl.so
LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
LoadModule deflate_module modules/mod_deflate.so
Include conf/extra/httpd-vhosts.conf

# ── ربط PHP 8.4 ─────────────────────────────────────────
PHPIniDir "C:/php-8.4.24"
LoadModule php_module "C:/php-8.4.24/php8apache2_4.dll"
AddType application/x-httpd-php .php

# ── تحسين أداء مقابس ويندوز وقفل الملفات ──────────────────
AcceptFilter http none
AcceptFilter https none
EnableMMAP off
EnableSendfile off
HostnameLookups Off

# ── KeepAlive لتسريع التصفح اللحظي ────────────────────────
KeepAlive On
MaxKeepAliveRequests 500
KeepAliveTimeout 15
Timeout 30

# ── ضغط البيانات ─────────────────────────────────────────
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
</IfModule>
```

### 4. إعداد `C:\Apache24\conf\extra\httpd-vhosts.conf`:
```apache
Listen 0.0.0.0:443
Listen [::]:443

<IfModule ssl_module>
    SSLSessionCache "shmcb:logs/ssl_scache(512000)"
    SSLSessionCacheTimeout 300
</IfModule>

# 1. HTTP (Port 80) - الموقع المباشر الفائق السرعة
<VirtualHost *:80>
    ServerName tajori.store
    ServerAlias www.tajori.store localhost 127.0.0.1
    DocumentRoot "C:/path/to/Perfumes_v2/public"

    <Directory "C:/path/to/Perfumes_v2/public">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog "logs/tajori.store-http-error.log"
    CustomLog "logs/tajori.store-http-access.log" combined
</VirtualHost>

# 2. HTTPS (Port 443) - الموقع الآمن
<VirtualHost *:443>
    ServerName tajori.store
    ServerAlias www.tajori.store localhost 127.0.0.1
    DocumentRoot "C:/path/to/Perfumes_v2/public"

    SSLEngine on
    SSLCertificateFile "C:/Apache24/conf/ssl/tajori.store.pem"
    SSLCertificateKeyFile "C:/Apache24/conf/ssl/tajori.store-key.pem"

    <Directory "C:/path/to/Perfumes_v2/public">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog "logs/tajori.store-error.log"
    CustomLog "logs/tajori.store-access.log" combined
</VirtualHost>
```

---

## 💻 4. الإقلاع التلقائي مع تشغيل ويندوز (Auto Startup)
ضع نسخة من ملف `steps_v2/deployment_and_maintenance/repair_and_recovery/start.vbs` داخل مجلد بدء التشغيل:
```text
C:\Users\%USERNAME%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\start.vbs
```
وأنشئ اختصاراً له على سطح المكتب باسم **Tajori POS**.