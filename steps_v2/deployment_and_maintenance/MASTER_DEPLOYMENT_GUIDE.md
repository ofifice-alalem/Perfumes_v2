# 🌐 الدليل الشامل والمعياري لنشر وإدارة وتثبيت المشروع على جهاز جديد (Master Deployment & Recovery Guide)

هذا المستند يعتبر المرجع الرئيسي والكامل لنقل وتثبيت مشروع **Perfumes_v2** على أي جهاز أو سيرفر جديد، وضبط خادم **Apache 2.4** مع تشفير **SSL (HTTPS)** وذاكرة **Redis** والتشغيل الآلي بالكامل.

---

## 📁 خريطة المجلد والسكريبتات المرفقة (`deployment_and_maintenance`)

```text
steps_v2/deployment_and_maintenance/
├── MASTER_DEPLOYMENT_GUIDE.md              <-- هذا الدليل الشامل
├── server_setup/
│   ├── APACHE_SSL_SETUP_GUIDE.md          <-- دليل إعداد Apache و SSL و Hosts
│   ├── restart_apache.vbs                  <-- سكريبت صامت لتفريغ الكاش وإعادة تشغيل Apache
│   └── setup_server.bat                    <-- سكريبت اختبار فحص سلامة أكواد Apache
└── repair_and_recovery/
    ├── EMERGENCY_RECOVERY_GUIDE.md         <-- دليل خطة الطوارئ والتعافي
    ├── start.vbs                           <-- سكريبت التشغيل التلقائي عند بدء الويندوز
    └── repair_and_start.vbs                <-- سكريبت زر الإصلاح السريع والطوارئ على سطح المكتب
```

---

## 🛠️ المتطلبات الأساسية للنظام (Prerequisites)

1. **PHP**: الإصدار **8.4** (أو >= 8.2) مجهز بـ Extensions: `pdo_mysql`, `curl`, `mbstring`, `openssl`, `gd`, `zip`, `fileinfo`.
2. **Node.js**: الإصدار 18 أو أعلى مع `npm`.
3. **Composer**: أحدث إصدار إدارة حزم PHP.
4. **MySQL / MariaDB**: منفذ `3306`.
5. **Redis Server**: منفذ `6379` (لتحسين أداء الكاش والجلسات والصفوف).
6. **C++ Exporter Engine (`/bin`)**: محرك تصدير الإكسيل الفائق (`bin/export_xlsx.exe` أو `bin/export_xlsx`) لتوليد التقارير في 7-11 ثانية.
7. **Apache HTTP Server 2.4**: مثبت على `C:\Apache24`.
8. **mkcert**: مثبت وموجود في `C:\Apache24\bin\mkcert.exe` لتوليد الشهادات المحلية.

---

## 🚀 خطوات التثبيت على جهاز جديد من الصفر

### 1️⃣ الخطوة الأولى: تثبيت الاعتماديات وإعداد البيئة

1. **تنزيل حزم PHP & JS**:
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
   APP_URL=https://tajori.store:8443

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

3. **توليد المفتاح وإنشاء الهيكل**:
   ```bash
   php artisan key:generate
   php artisan migrate --seed
   ```

---

### 2️⃣ الخطوة الثانية: إعداد Apache و SSL والدومين المحلي `tajori.store`

1. **إضافة الدومين لملف Hosts (IPv4 + IPv6)**:
   أضف السطور التالية في `C:\Windows\System32\drivers\etc\hosts`:
   ```text
   127.0.0.1    tajori.store
   127.0.0.1    www.tajori.store
   ::1          tajori.store
   ::1          www.tajori.store
   ```

2. **توليد شهادات HTTPS بـ mkcert**:
   نفذ في PowerShell كأدمن:
   ```powershell
   C:\Apache24\bin\mkcert.exe -install
   New-Item -ItemType Directory -Path "C:\Apache24\conf\ssl" -Force
   C:\Apache24\bin\mkcert.exe -cert-file "C:\Apache24\conf\ssl\tajori.store.pem" -key-file "C:\Apache24\conf\ssl\tajori.store-key.pem" tajori.store *.tajori.store
   ```

3. **إعداد وتحسين أداء Apache (`httpd.conf` & `httpd-vhosts.conf`)**:
   - تفعيل الموديولات وإعدادات تسريع السوكيت في `httpd.conf`:
     ```apache
     Listen 8085
     ServerName localhost:8085

     # تسريع استجابة السوكيت لويندوز
     AcceptFilter http none
     AcceptFilter https none
     EnableMMAP off
     EnableSendfile off
     KeepAlive On
     MaxKeepAliveRequests 100
     KeepAliveTimeout 5
     HostnameLookups off

     LoadModule rewrite_module modules/mod_rewrite.so
     LoadModule ssl_module modules/mod_ssl.so
     LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
     Include conf/extra/httpd-vhosts.conf
     Include conf/extra/httpd-mpm.conf

     PHPIniDir "C:/php-8.4.24"
     LoadModule php_module "C:/php-8.4.24/php8apache2_4.dll"
     AddType application/x-httpd-php .php
     ```

   - إعداد VirtualHost في `httpd-vhosts.conf`:
     ```apache
     Listen 8443

     # 1. HTTP (Port 8085) - تحويل تلقائي إلى HTTPS (Port 8443)
     <VirtualHost *:8085>
         ServerName tajori.store
         ServerAlias www.tajori.store
         Redirect permanent / https://tajori.store:8443/
     </VirtualHost>

     # 2. HTTPS (Port 8443) - الموقع الآمن
     <VirtualHost *:8443>
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

         ErrorDocument 400 "<html><head><meta http-equiv='refresh' content='0;url=https://tajori.store:8443/'></head><body><script>window.location.href='https://tajori.store:8443/';</script><p>Redirecting...</p></body></html>"
     </VirtualHost>
     ```

4. **تفعيل محرك التسريع OPcache & JIT في `C:\php-8.4.24\php.ini`**:
   ```ini
   zend_extension=opcache
   [opcache]
   opcache.enable=1
   opcache.enable_cli=1
   opcache.memory_consumption=256
   opcache.interned_strings_buffer=32
   opcache.max_accelerated_files=30000
   opcache.validate_timestamps=1
   opcache.revalidate_freq=60
   opcache.save_comments=1
   opcache.fast_shutdown=1

   [opcache_jit]
   opcache.jit_buffer_size=128M
   opcache.jit=tracing
   ```

---

### 3️⃣ الخطوة الثالثة: التعافي الذاتي التلقائي وتفعيل سكريبتات VBS

1. **تفعيل التعافي التلقائي عند أي انهيار (Auto-Recovery)**:
   نفّذ هذا الأمر كأدمن لتوجيه الويندوز بإعادة تشغيل Apache فوراً:
   ```cmd
   sc.exe failure Apache2.4 reset= 86400 actions= restart/1000/restart/1000/restart/1000
   ```

2. **التشغيل عند بدء الويندوز**:
   ضع اختصاراً لـ `steps_v2/deployment_and_maintenance/repair_and_recovery/start.vbs` في مجلد البدء `shell:startup`.

3. **اختصار الطوارئ على سطح المكتب**:
   أنشئ اختصاراً على سطح المكتب لملف `steps_v2/deployment_and_maintenance/repair_and_recovery/repair_and_start.vbs` باسم `إصلاح وتشغيل النظام.vbs`.

4. **اختصار تشغيل الكاشير والمبيعات (Kiosk / POS Mode Shortcut)**:
   أنشئ اختصاراً على سطح المكتب بالهدف التالي لفتح المنظومة كتطبيق مستقل وبطباعة فورية صامتة:
   ```cmd
   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=https://tajori.store --start-fullscreen --user-data-dir="C:\EdgeAppData"
   ```

### 4️⃣ الخطوة الرابعة: تحسينات الذاكرة وتفادي خطأ 500 في التقارير

تضمن الكود في `ReportRepository.php` الإعدادات التالية لمنع أخطاء الذاكرة والوقت في التقارير والتصدير:
- **حد الذاكرة**: `@ini_set('memory_limit', '512M');`
- **وقت التنفيذ**: `@set_time_limit(180);`
- **التقسيم التفاعلي**: 30 عنصر أولي لتقارير المبيعات والمشتريات والديون وحركة المنتجات مع إمكانية التحميل الإضافي عبر AJAX.

---

### ⚡ أوامر الصيانة الدورية وتحديث الكاش

عند إجراء أي تعديل على الكود أو `.env`:
```bash
php artisan optimize:clear
cmd /c "npm run build"
```
