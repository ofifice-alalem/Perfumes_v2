# 🚀 تثبيت المشروع على جهاز جديد

> 💡 **ملاحظة هامّة**: للتعرف على الدليل الشامل والمفصل لتثبيت وإعداد Apache + SSL + Redis وسكريبتات الطوارئ التلقائية، يرجى مراجعة [MASTER_DEPLOYMENT_GUIDE.md](file:///c:/Users/alale/OneDrive/Desktop/work/Perfumes_v2/steps_v2/deployment_and_maintenance/MASTER_DEPLOYMENT_GUIDE.md).

## المتطلبات
- PHP >= 8.2
- Composer
- Node.js >= 18 + npm
- MySQL >= 8.0
- Redis (مطلوب للـ Cache والـ Sessions)
- **C++ Compiler (مترجم C++)**: مطلوبة لتوليد تقارير الإكسيل الفائقة بـ C++ (`g++` أو `MinGW-w64`).

### تثبيت C++ Compiler ومحرك التصدير (`/bin`)
يعتمد النظام على محرك تصدير خارجي عالي السرعة مكتوب بـ C++ داخل مجلد `/bin`:
- **Windows**: `bin/export_xlsx.exe` (ملف مدمج مسبقاً جاهز للعمل).
- **Linux**: `bin/export_xlsx` (يمكن تجميعه عبر `g++ -O3 ...`).

تجميع محرك C++ تلقائياً على Windows:
```powershell
powershell -ExecutionPolicy Bypass -File scratch/build_cpp_exporter.ps1
```

تجميع محرك C++ على Linux (Ubuntu/Debian):
```bash
sudo apt install build-essential zlib1g-dev
g++ -O3 -DHAVE_LIBXLSXWRITER -I bin/libxlsxwriter/include -I bin/zlib bin/export_xlsx.cpp bin/libxlsxwriter/obj/*.o -o bin/export_xlsx
chmod +x bin/export_xlsx
```

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

### 3. تعديل إعدادات البيئة في `.env`
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tajori.store:8443

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

---

## 🖨️ إعداد وتثبيت محرك الطباعة الحرارية المباشرة (Node Thermal Printer Engine)

يعتمد النظام على محرك طباعة مدمج فائق السرعة (`thermal-printer-engine`) لإرسال أوامر الطباعة المباشرة لجميع طابعات الفواتير (مثل POS-80 / XP-80) في جزء من الثانية (أقل من 0.1 ثانية) دون الحاجة لنوافذ المتصفح.

### 1. تثبيت اعتماديات المحرك
عند تثبيت المشروع على جهاز جديد، يجب تثبيت حزم النود الخاصة بالمحرك:
```powershell
cd thermal-printer-engine
npm install
cd ..
```

### 2. استثناء مجلد المحرك من فحص حماية الويندوز (Windows Defender Exclusion)
لتفادي أي تأخير أثناء الفحص الأمني لملفات التجميع `raw-print.exe` عند أول طلب طباعة، يوصى بإضافة مجلد المحرك لقائمة الاستثناءات:

**عبر أمر PowerShell (كأدمن):**
```powershell
Add-MpPreference -ExclusionPath "C:\path\to\Perfumes_v2\thermal-printer-engine"
```

**أو يدويًا عبر إعدادات الويندوز:**
`Windows Security` ➔ `Virus & threat protection` ➔ `Manage settings` ➔ `Exclusions (Add or remove exclusions)` ➔ إضافة مجلد: `thermal-printer-engine`.

### 3. تشغيل خادم الطباعة دائمًا في الخلفية (Background Daemon)

ضمان استجابة الطباعة الفورية فور الضغط على الزر يتطلب تشغيل خادم `server.js` في خلفية النظام:

**عبر مجلد بدء التشغيل تلقائيًا (Windows Startup):**
1. اضغط `Win + R` واكتب `shell:startup` ثم وافق.
2. أنشئ ملفاً جديداً باسم `start-printer.vbs` وضع بداخله:
```vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d C:\path\to\Perfumes_v2\thermal-printer-engine && node server.js", 0, False
```

**أو عبر PM2 Process Manager:**
```cmd
cd thermal-printer-engine
npx pm2 start server.js --name "thermal-printer"
npx pm2 save
```

---

### 4. 🖥️ إنشاء اختصار تشغيل المنظومة المباشر على سطح المكتب (Edge Kiosk / POS Mode)

لتشغيل المنظومة كعقار أو تطبيق محلي مستقل على الكاشير بدون شريط عناوين المتصفح وبدون ظهور نافذة إعدادات الطباعة عند استخدام الاسترداد المباشر:

1. انقر بزر الماوس الأيمن على سطح المكتب ➔ `New` ➔ `Shortcut`.
2. ضع المسار التالي في خانة **Target**:
```cmd
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=https://tajori.store --start-fullscreen --user-data-dir="C:\EdgeAppData"
```
*(ملاحظة: إذا كان متصفح Edge في مجلد 64-bit، استخدم `"C:\Program Files\Microsoft\Edge\Application\msedge.exe"`)*

3. سمّ الاختصار: **نظام تاجوري للعطور**.

#### 💡 فوائد هذا الاختصار:
* `--app=https://tajori.store`: تحويل الموقع إلى تطبيق مستقل بدون شريط عناوين أو تبويبات متصفح.
* `--kiosk-printing`: الطباعة الفورية المباشرة بدون ظهور نافذة معاينة الطباعة الخاصة بالمتصفح.
* `--start-fullscreen`: فتح المنظومة مباشرة ملء الشاشة لشاشات اللمس والـ POS.
* `--user-data-dir="C:\EdgeAppData"`: إنشاء جلسة تصفح معزولة تماماً لمنع التعارض مع تصفح الإنترنت العادي على الجهاز.