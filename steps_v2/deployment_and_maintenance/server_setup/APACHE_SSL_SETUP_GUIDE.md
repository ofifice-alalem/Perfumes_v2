# 🚀 دليل إعداد وتجهيز السيرفر المحلي (Apache 2.4 + PHP 8.4 JIT + SSL)

هذا المستند يمثل التوثيق الشامل والشديد الدقة لإعداد وتشغيل مشروع **Perfumes_v2** على خادم **Apache 2.4** محلياً بأعلى كفاءة وسرعة على المنفذ **80 المباشر** والمنفذ **443 (HTTPS)** مع ضبط كامل لإعدادات المترجم الفوري (JIT) وتسريع مقابس شبكة ويندوز.

---

## 📁 السكريبتات التنفيذية المرفقة بهذا المجلد

| اسم الملف | المسار المباشر | الوظيفة |
| :--- | :--- | :--- |
| **`restart_apache.vbs`** | `steps_v2/deployment_and_maintenance/server_setup/restart_apache.vbs` | سكريبت صامت لإعادة تشغيل Apache بدون أي شاشات سوداء |
| **`setup_server.bat`** | `steps_v2/deployment_and_maintenance/server_setup/setup_server.bat` | فحص سلامة أكواد Apache (`httpd -t`) وتحديث كاش الإنتاج |
| **`free_port_80.bat`** | `steps_v2/deployment_and_maintenance/repair_and_recovery/free_port_80.bat` | تعطيل خدمة IIS وتحرير المنفذ 80 لأباتشي |

---

## 📋 المتغيرات الأساسية للمشروع (Parameters)

| اسم المتغير | القيمة لهذا المشروع | الشرح |
| :--- | :--- | :--- |
| **PROJECT_PATH** | `C:\Users\alale\OneDrive\Desktop\work\Perfumes_v2` | المسار الكامل للمشروع الأصلي |
| **PUBLIC_PATH** | `C:\Users\alale\OneDrive\Desktop\work\Perfumes_v2\public` | مسار المجلد العام public |
| **DOMAIN_NAME** | `tajori.store` | اسم الدومين المحلي |
| **APACHE_PATH** | `C:\Apache24` | مسار تثبيت خادم Apache |
| **PHP_PATH** | `C:\php-8.4.24` | مسار بيئة PHP |

---

## 🛠️ الخطوات التفصيلية للتثبيت والإعداد

### 1️⃣ الخطوة الأولى: إعدادات PHP 8.4 JIT (`php.ini`)
في ملف `C:\php-8.4.24\php.ini`:
```ini
opcache.enable=1
opcache.enable_cli=1
opcache.jit=tracing
opcache.jit_buffer_size=64M
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0

realpath_cache_size=4096k
realpath_cache_ttl=600
```

---

### 2️⃣ الخطوة الثانية: تحرير المنفذ 80 وربط الدومين بـ Hosts
1. **تحرير المنفذ 80 من خدمة IIS**:
   ```powershell
   Stop-Service -Name W3SVC, WAS -Force -ErrorAction SilentlyContinue
   Set-Service -Name W3SVC -StartupType Disabled
   Set-Service -Name WAS -StartupType Disabled
   ```

2. **ملف `C:\Windows\System32\drivers\etc\hosts`**:
   ```text
   127.0.0.1    tajori.store
   127.0.0.1    www.tajori.store
   ```

3. **توليد شهادات mkcert**:
   ```powershell
   C:\Apache24\bin\mkcert.exe -install
   New-Item -ItemType Directory -Path "C:\Apache24\conf\ssl" -Force
   C:\Apache24\bin\mkcert.exe -cert-file "C:\Apache24\conf\ssl\tajori.store.pem" -key-file "C:\Apache24\conf\ssl\tajori.store-key.pem" tajori.store *.tajori.store
   ```

---

### 3️⃣ الخطوة الثالثة: إعداد وتحسين أداء Apache (`httpd.conf`)
في نهاية ملف `C:\Apache24\conf\httpd.conf`:
```apache
Listen 0.0.0.0:80
Listen [::]:80

# تفعيل الموديولات المطلوبة
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule ssl_module modules/mod_ssl.so
LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
LoadModule deflate_module modules/mod_deflate.so
Include conf/extra/httpd-vhosts.conf

# ربط PHP 8.4
PHPIniDir "C:/php-8.4.24"
LoadModule php_module "C:/php-8.4.24/php8apache2_4.dll"
AddType application/x-httpd-php .php

# تسريع السوكيت وقفل الملفات
AcceptFilter http none
AcceptFilter https none
EnableMMAP off
EnableSendfile off
HostnameLookups Off

# KeepAlive لتسريع التصفح اللحظي
KeepAlive On
MaxKeepAliveRequests 500
KeepAliveTimeout 15
Timeout 30

# ضغط البيانات (Gzip)
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
</IfModule>
```

---

### 4️⃣ الخطوة الرابعة: إعداد VirtualHosts (`httpd-vhosts.conf`)
في ملف `C:\Apache24\conf\extra\httpd-vhosts.conf`:
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
    DocumentRoot "C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/public"

    <Directory "C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/public">
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
    DocumentRoot "C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/public"

    SSLEngine on
    SSLCertificateFile "C:/Apache24/conf/ssl/tajori.store.pem"
    SSLCertificateKeyFile "C:/Apache24/conf/ssl/tajori.store-key.pem"

    <Directory "C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/public">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog "logs/tajori.store-error.log"
    CustomLog "logs/tajori.store-access.log" combined
</VirtualHost>
```
