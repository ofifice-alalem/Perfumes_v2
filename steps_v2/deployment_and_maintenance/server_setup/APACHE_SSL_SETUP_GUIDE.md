# 🚀 دليل إعداد وتجهيز السيرفر المحلي (Apache + SSL + PHP 8.4)

هذا المستند يمثل التوثيق الشامل والشديد الدقة لإعداد وتشغيل مشروع **Perfumes_v2** على خادم **Apache 2.4** محلياً مع شهادات الأمان **HTTPS (mkcert)** والدومين المحلي `https://tajori.store:8443` (على المنفذ المخصص `8443` و `8085` لمنع أي تعارض مع خدمات الويندوز).

---

## 📁 السكريبتات التنفيذية المرفقة بهذا المجلد

| اسم الملف | المسار المباشر | الوظيفة |
| :--- | :--- | :--- |
| **`restart_apache.vbs`** | `steps_v2/deployment_and_maintenance/server_setup/restart_apache.vbs` | سكريبت صمت تام لإعادة تشغيل Apache ومسح ذاكرة كاش Laravel بدون أي شاشات سوداء |
| **`setup_server.bat`** | `steps_v2/deployment_and_maintenance/server_setup/setup_server.bat` | ملف تجريبي لفحص سلامة أكواد Apache (`httpd -t`) وتحديث كاش الإنتاج |

---

## 📋 المتغيرات الأساسية للمشروع (Parameters)

| اسم المتغير | القيمة لهذا المشروع | الشرح |
| :--- | :--- | :--- |
| **PROJECT_PATH** | `C:\Users\alale\OneDrive\Desktop\work\Perfumes_v2` | المسار الكامل للمشروع الأصلي |
| **PUBLIC_PATH** | `C:\Users\alale\OneDrive\Desktop\work\Perfumes_v2\public` | مسار المجلد العام public |
| **DOMAIN_NAME** | `tajori.store` | اسم الدومين المحلي |
| **APACHE_PATH** | `C:\Apache24` | مسار تثبيت خادم Apache |
| **PHP_PATH** | `C:\php-8.4.24` | مسار بيئة PHP |
| **SERVICE_NAME** | `Apache2.4` | اسم خدمة الويندوز |

---

## 🛠️ الخطوات التفصيلية للتثبيت والإعداد

### 1️⃣ الخطوة الأولى: توليد وتثبيت شهادات الأمان SSL (HTTPS)

نفذ الأوامر التالية في **PowerShell كمسؤول**:

```powershell
# 1. تثبيت Root CA الخاص بـ mkcert في النظام
C:\Apache24\bin\mkcert.exe -install

# 2. إنشاء مجلد حفظ الشهادات داخل Apache
New-Item -ItemType Directory -Path "C:\Apache24\conf\ssl" -Force

# 3. توليد الشهادة والمفتاح الخاص بالدومين المحلي
C:\Apache24\bin\mkcert.exe -cert-file "C:\Apache24\conf\ssl\tajori.store.pem" -key-file "C:\Apache24\conf\ssl\tajori.store-key.pem" tajori.store *.tajori.store
```

---

### 2️⃣ الخطوة الثانية: ربط الدومين المحلي بملف النظام Hosts (IPv4 + IPv6)

أضف السطور التالية إلى ملف النظام `C:\Windows\System32\drivers\etc\hosts` (ضروري جداً إضافة `::1` لمنع تأخر الـ DNS لعدة ثوانٍ):

```text
127.0.0.1    tajori.store
127.0.0.1    www.tajori.store
::1          tajori.store
::1          www.tajori.store
```

---

### 3️⃣ الخطوة الثالثة: إعداد موديولات وتحسينات أداء Apache

في ملف الإعدادات الرئيسي `C:\Apache24\conf\httpd.conf`:

1. **تفعيل الموديولات المطلوبة (حذف `#`):**
   - `mod_rewrite`
   - `mod_ssl`
   - `mod_socache_shmcb`
   - `mod_vhost_alias`
   - `Include conf/extra/httpd-vhosts.conf`
   - `Include conf/extra/httpd-mpm.conf`

2. **ضبط `DirectoryIndex` لتشغيل Laravel:**
   ```apache
   <IfModule dir_module>
       DirectoryIndex index.php index.html
   </IfModule>
   ```

3. **ربط محرك PHP 8.4:**
   ```apache
   PHPIniDir "C:/php-8.4.24"
   LoadModule php_module "C:/php-8.4.24/php8apache2_4.dll"
   AddType application/x-httpd-php .php
   ```

4. **إعدادات تسريع استجابة السوكيت لويندوز (Windows Socket Tuning):**
   ```apache
   Listen 8085
   ServerName localhost:8085

   AcceptFilter http none
   AcceptFilter https none
   EnableMMAP off
   EnableSendfile off
   KeepAlive On
   MaxKeepAliveRequests 100
   KeepAliveTimeout 5
   HostnameLookups off
   ```

---

### 4️⃣ الخطوة الرابعة: ضبط الـ VirtualHost (HTTP: 8085 -> HTTPS: 8443)

في الملف `C:\Apache24\conf\extra\httpd-vhosts.conf`:

```apache
Listen 8443

# Grant access to parent OneDrive directory tree for Apache
<Directory "C:/Users/alale/OneDrive">
    Options Indexes FollowSymLinks MultiViews
    AllowOverride All
    Require all granted
</Directory>

<Directory "C:/Users/alale/OneDrive/Desktop/work/Perfumes_v2">
    Options Indexes FollowSymLinks MultiViews
    AllowOverride All
    Require all granted
</Directory>

# 1. HTTP (Port 8085) - Redirects to HTTPS (Port 8443)
<VirtualHost *:8085>
    ServerName tajori.store
    ServerAlias www.tajori.store
    Redirect permanent / https://tajori.store:8443/
</VirtualHost>

# 2. HTTPS (Port 8443) - Secure Laravel Application
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

    # التحويل التلقائي عند كتابة http:// بدلاً من https://
    ErrorDocument 400 "<html><head><meta http-equiv='refresh' content='0;url=https://tajori.store:8443/'></head><body><script>window.location.href='https://tajori.store:8443/';</script><p>Redirecting to https://tajori.store:8443/...</p></body></html>"

    ErrorLog "logs/tajori.store-error.log"
    CustomLog "logs/tajori.store-access.log" combined
</VirtualHost>
```

---

### 5️⃣ الخطوة الخامسة: تفعيل محرك التسريع الفائق OPcache & JIT في PHP 8.4

في ملف `C:\php-8.4.24\php.ini`:
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

### 6️⃣ الخطوة السادسة: تهيئة تحسينات Laravel للإنتاج

```powershell
# 1. ضبط ملف البيئة .env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tajori.store:8443

# 2. بناء الأصول وتثبيت الروابط والتخزين المؤقت
php artisan storage:link
php artisan optimize
npm run build
```

---

### 7️⃣ الخطوة السابعة: تثبيت وتفعيل خدمة Apache في الويندوز

```cmd
C:\Apache24\bin\httpd.exe -k install -n "Apache2.4"
powershell Set-Service -Name "Apache2.4" -StartupType Automatic
net start Apache2.4
```
