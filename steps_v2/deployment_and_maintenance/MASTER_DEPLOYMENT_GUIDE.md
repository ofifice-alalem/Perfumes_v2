# 🌐 الدليل الشامل والمعياري لنشر وإدارة وتثبيت المشروع على جهاز جديد (Master Deployment & Recovery Guide)

هذا المستند يعتبر المرجع الرئيسي والكامل لنقل وتثبيت مشروع **Perfumes_v2** على أي جهاز أو سيرفر جديد، وضبط خادم **Apache 2.4** بأعلى كفاءة وسرعة على المنفذ **80 و 443** مع تشفير **SSL (HTTPS)** ومترجم **PHP 8.4 JIT** وذاكرة **Redis** والتشغيل الآلي بالكامل.

---

## 📁 خريطة المجلد والسكريبتات المرفقة (`deployment_and_maintenance`)

```text
steps_v2/deployment_and_maintenance/
├── MASTER_DEPLOYMENT_GUIDE.md              <-- هذا الدليل الشامل
├── server_setup/
│   ├── APACHE_SSL_SETUP_GUIDE.md          <-- دليل إعداد Apache و SSL و Hosts و JIT
│   ├── restart_apache.vbs                  <-- سكريبت صامت لإعادة تشغيل Apache
│   └── setup_server.bat                    <-- سكريبت فحص سلامة أكواد Apache وتحديث الكاش
└── repair_and_recovery/
    ├── EMERGENCY_RECOVERY_GUIDE.md         <-- دليل خطة الطوارئ والتعافي
    ├── free_port_80.bat                    <-- سكريبت تعطيل IIS وتحرير المنفذ 80 بضغطة زر
    ├── start.vbs                           <-- سكريبت التشغيل التلقائي عند بدء الويندوز
    └── repair_and_start.vbs                <-- سكريبت زر الإصلاح السريع والطوارئ على سطح المكتب
```

---

## 🛠️ المتطلبات الأساسية للنظام (Prerequisites)

1. **PHP**: الإصدار **8.4** (أو >= 8.2) مجهز بـ Extensions: `pdo_mysql`, `curl`, `mbstring`, `openssl`, `gd`, `zip`, `fileinfo`, `opcache`, `redis` (أو predis).
2. **Node.js**: الإصدار 18 أو أعلى مع `npm`.
3. **Composer**: أحدث إصدار إدارة حزم PHP.
4. **MySQL / MariaDB**: منفذ `3306`.
5. **Redis Server**: منفذ `6379` (لتحسين أداء الكاش والجلسات والصفوف).
6. **C++ Exporter Engine (`/bin`)**: محرك تصدير الإكسيل الفائق (`bin/export_xlsx.exe`).
7. **Apache HTTP Server 2.4**: مثبت على `C:\Apache24`.
8. **mkcert**: مثبت وموجود في `C:\Apache24\bin\mkcert.exe` لتوليد الشهادات المحلية.

---

## 🚀 خطوات التثبيت على جهاز جديد من الصفر

### 1️⃣ الخطوة الأولى: إعداد PHP 8.4 JIT Compiler (`php.ini`)

افتح `C:\php-8.4.24\php.ini` وأضف/عدل الإعدادات التالية لتحقيق أعلى أداء وسرعة معالجة:
```ini
; ── OPcache & JIT Compiler ───────────────────────────────────
opcache.enable=1
opcache.enable_cli=1
opcache.jit=tracing
opcache.jit_buffer_size=64M
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0

; ── Realpath Cache (تسريع مسارات الملفات) ─────────────────────
realpath_cache_size=4096k
realpath_cache_ttl=600

; ── الذاكرة ──────────────────────────────────────────────────
memory_limit=512M
upload_max_filesize=64M
post_max_size=64M
```

---

### 2️⃣ الخطوة الثانية: تثبيت وتشغيل خادم Redis

1. **التثبيت عبر PowerShell كمسؤول (Windows):**
   ```powershell
   winget install Redis.Redis
   ```
   *(أو تحميل `Redis-x64-*.msi` من [مستودع Redis for Windows الرسمي](https://github.com/tporadowski/redis/releases))*.

2. **تشغيل Redis كخدمة ويندوز تلقائية دائمة:**
   ```powershell
   Start-Service redis
   Set-Service -Name redis -StartupType Automatic
   ```

3. **التحقق من عمل Redis:**
   ```powershell
   redis-cli ping
   # الاستجابة المطلوبة: PONG
   ```

---

### 3️⃣ الخطوة الثالثة: تثبيت الاعتماديات وإعداد البيئة

1. **تنزيل حزم PHP & JS وبناء الواجهة**:
   ```bash
   composer install --no-dev --optimize-autoloader
   npm install
   npm run build
   ```

2. **إنشاء ملف `.env` الضامن لأعلى أداء**:
   انسخ `.env.example` إلى `.env` واضبط الإعدادات كالتالي:
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
   DB_PASSWORD=YOUR_PASSWORD

   # الكاش والجلسات عبر Redis
   SESSION_DRIVER=redis
   SESSION_LIFETIME=120
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis

   REDIS_CLIENT=predis
   REDIS_HOST=127.0.0.1
   REDIS_PASSWORD=null
   REDIS_PORT=6379
   ```

3. **توليد المفتاح وإنشاء الهيكل والبيانات الأساسية**:
   ```bash
   php artisan key:generate
   php artisan migrate --force
   php artisan db:seed --class=CoreSystemSeeder --force
   php artisan optimize
   ```

---

### 3️⃣ الخطوة الثالثة: تحرير المنفذ 80 وربط الدومين `tajori.store`

1. **تحرير المنفذ 80 من خدمة IIS**:
   شغل `steps_v2/deployment_and_maintenance/repair_and_recovery/free_port_80.bat` كمسؤول (أو نفذ في PowerShell كمسؤول):
   ```powershell
   Stop-Service -Name W3SVC, WAS -Force -ErrorAction SilentlyContinue
   Set-Service -Name W3SVC -StartupType Disabled
   Set-Service -Name WAS -StartupType Disabled
   ```

2. **إضافة الدومين لملف Hosts**:
   أضف السطور التالية في `C:\Windows\System32\drivers\etc\hosts`:
   ```text
   127.0.0.1    tajori.store
   127.0.0.1    www.tajori.store
   ```

3. **توليد شهادات HTTPS بـ mkcert**:
   نفذ في PowerShell كمسؤول:
   ```powershell
   C:\Apache24\bin\mkcert.exe -install
   New-Item -ItemType Directory -Path "C:\Apache24\conf\ssl" -Force
   C:\Apache24\bin\mkcert.exe -cert-file "C:\Apache24\conf\ssl\tajori.store.pem" -key-file "C:\Apache24\conf\ssl\tajori.store-key.pem" tajori.store *.tajori.store
   ```

---

### 4️⃣ الخطوة الرابعة: إعداد وضبط أداء Apache (`httpd.conf` & `httpd-vhosts.conf`)

1. **في نهاية `C:\Apache24\conf\httpd.conf`**:
   ```apache
   Listen 0.0.0.0:80
   Listen [::]:80

   # تفعيل الموديولات
   LoadModule rewrite_module modules/mod_rewrite.so
   LoadModule ssl_module modules/mod_ssl.so
   LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
   LoadModule deflate_module modules/mod_deflate.so
   Include conf/extra/httpd-vhosts.conf

   # ربط PHP 8.4
   PHPIniDir "C:/php-8.4.24"
   LoadModule php_module "C:/php-8.4.24/php8apache2_4.dll"
   AddType application/x-httpd-php .php

   # تسريع استجابة السوكيت وقفل الملفات لويندوز (Windows Socket & File Tuning)
   AcceptFilter http none
   AcceptFilter https none
   EnableMMAP off
   EnableSendfile off
   HostnameLookups Off

   # إبقاء الاتصال مفتوحاً (KeepAlive) لتسريع التنقل اللحظي
   KeepAlive On
   MaxKeepAliveRequests 500
   KeepAliveTimeout 15
   Timeout 30

   # ضغط استجابات JSON و HTML
   <IfModule mod_deflate.c>
       AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
   </IfModule>
   ```

2. **في `C:\Apache24\conf\extra\httpd-vhosts.conf`**:
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

### 5️⃣ الخطوة الخامسة: التشغيل التلقائي واختصارات سطح المكتب

1. **التشغيل عند إقلاع ويندوز (Startup)**:
   انسخ `steps_v2/deployment_and_maintenance/repair_and_recovery/start.vbs` إلى مجلد بدء التشغيل:
   ```text
   C:\Users\%USERNAME%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\start.vbs
   ```

2. **اختصار التشغيل الرئيسي**:
   أنشئ اختصاراً لـ `start.vbs` على سطح المكتب باسم **Tajori POS**.

3. **اختصار الطوارئ والإصلاح**:
   أنشئ اختصاراً لـ `repair_and_start.vbs` على سطح المكتب باسم **إصلاح وتشغيل المنظومة**.
