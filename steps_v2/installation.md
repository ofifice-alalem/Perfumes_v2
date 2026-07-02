# 🚀 تثبيت المشروع على جهاز جديد

## المتطلبات
- PHP >= 8.2
- Composer
- Node.js >= 18 + npm
- MySQL >= 8.0
- Redis (مطلوب للـ Cache والـ Sessions)

### تثبيت Redis على Windows
```bash
winget install Redis.Redis
```

### تثبيت Redis على Linux
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## الخطوات

### 1. تثبيت اعتماديات PHP
```bash
composer install
```

### 2. نسخ ملف البيئة
```bash
cp .env.example .env
```

### 3. تعديل إعدادات قاعدة البيانات في `.env`
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=perfumes_v2
DB_USERNAME=alalem
DB_PASSWORD=Alalem@12255!
```

### 3.1 إعدادات Redis في `.env`
```env
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 4. توليد مفتاح التطبيق
```bash
php artisan key:generate
```

### 5. تشغيل الـ Migrations
```bash
php artisan migrate
```

### 6. تشغيل الـ Seeder الأساسي
```bash
php artisan db:seed --class=CoreSystemSeeder
```

### 7. تثبيت اعتماديات JavaScript
```bash
npm install
```

### 8. بناء الـ Frontend
```bash
npm run build
```

### 9. تحسين الأداء للإنتاج
```bash
php artisan optimize
```

### 10. تثبيت وتجهيز Laravel Octane (لبيئة الإنتاج السريعة)
```bash
composer require laravel/octane
php artisan octane:install --server=roadrunner
```

### 11. تشغيل السيرفر في الخلفية

#### Windows — تشغيل عند بدء النظام تلقائياً

**الطريقة: Task Scheduler**

1. افتح `Task Scheduler` من قائمة Start
2. اختر `Create Basic Task`
3. اضبط الإعدادات:
   - **Name:** Perfumes Server
   - **Trigger:** When the computer starts
   - **Action:** Start a program
   - **Program:** `cmd.exe`
   - **Arguments:**
     ```
     /c start /B php artisan octane:start --host=0.0.0.0 --port=8000
     ```
   - **Start in:** `C:\path\to\Perfumes_v2`
4. ✅ فعّل خيار `Run whether user is logged on or not`

أو بدلاً من ذلك، أنشئ ملف `start.bat` في مجلد المشروع:
```bat
@echo off
cd /d C:\path\to\Perfumes_v2
start /B php artisan octane:start --host=0.0.0.0 --port=8000
```
ثم ضع اختصاره في:
```
C:\Users\%USERNAME%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
```

---

#### Linux — تشغيل عند بدء النظام تلقائياً

**الطريقة: systemd service**

أنشئ الملف `/etc/systemd/system/perfumes.service`:
```ini
[Unit]
Description=Perfumes V2 Laravel Server
After=network.target mysql.service

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/Perfumes_v2
ExecStart=/usr/bin/php artisan octane:start --host=0.0.0.0 --port=8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

ثم فعّله:
```bash
sudo systemctl daemon-reload
sudo systemctl enable perfumes
sudo systemctl start perfumes
```

للتحقق من حالته:
```bash
sudo systemctl status perfumes
```

---

## بيانات الدخول

| المستخدم | اسم المستخدم | كلمة المرور | الدور |
|----------|-------------|-------------|-------|
| Super Admin | `admin` | `password` | super-admin |
| Admin | `manager` | `password` | admin |

---

## ملاحظات

- لتشغيل الـ Frontend في وضع التطوير بدلاً من البناء:
  ```bash
  npm run dev
  ```
  ثم في terminal آخر:
  ```bash
  php artisan octane:start --watch --host=0.0.0.0 --port=8000
  ```

- لإعادة تهيئة المشروع من الصفر:
  ```bash
  php artisan migrate:fresh
  php artisan db:seed --class=CoreSystemSeeder
  ```


net stop Apache2.4
net start Apache2.4
php artisan optimize:clear
php artisan optimize

---

## إصلاح period_id الفارغة (في حال إنشاء معاملات قبل إنشاء دورة محاسبية)

```sql
-- 1. إنشاء الدورة المحاسبية من بداية السنة الحالية
INSERT INTO accounting_periods (name, started_at, closed_at, status, notes, created_by, created_at, updated_at)
SELECT
    CONCAT('دورة ', YEAR(NOW())),
    CONCAT(YEAR(NOW()), '-01-01 00:00:00'),
    NULL,
    'open',
    NULL,
    id,
    NOW(),
    NOW()
FROM users ORDER BY id ASC LIMIT 1;

-- 2. ربط جميع السجلات التي لا تحتوي على period_id بهذه الدورة
SET @period_id = LAST_INSERT_ID();

UPDATE invoices              SET period_id = @period_id WHERE period_id IS NULL;
UPDATE invoice_items         SET period_id = @period_id WHERE period_id IS NULL;
UPDATE payments              SET period_id = @period_id WHERE period_id IS NULL;
UPDATE settlements           SET period_id = @period_id WHERE period_id IS NULL;
UPDATE purchases             SET period_id = @period_id WHERE period_id IS NULL;
UPDATE purchase_items        SET period_id = @period_id WHERE period_id IS NULL;
UPDATE supplier_payments     SET period_id = @period_id WHERE period_id IS NULL;
UPDATE supplier_settlements  SET period_id = @period_id WHERE period_id IS NULL;
UPDATE invoice_returns       SET period_id = @period_id WHERE period_id IS NULL;
UPDATE invoice_return_items  SET period_id = @period_id WHERE period_id IS NULL;
UPDATE purchase_returns      SET period_id = @period_id WHERE period_id IS NULL;
UPDATE purchase_return_items SET period_id = @period_id WHERE period_id IS NULL;
UPDATE waste_logs            SET period_id = @period_id WHERE period_id IS NULL;
UPDATE waste_items           SET period_id = @period_id WHERE period_id IS NULL;
```