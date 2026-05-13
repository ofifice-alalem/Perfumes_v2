# 🚀 تثبيت المشروع على جهاز جديد

## المتطلبات
- PHP >= 8.2
- Composer
- Node.js >= 18 + npm
- MySQL >= 8.0

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
DB_DATABASE=perfumes
DB_USERNAME=root
DB_PASSWORD=
```

### 4. إنشاء قاعدة البيانات
```sql
CREATE DATABASE perfumes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. توليد مفتاح التطبيق
```bash
php artisan key:generate
```

### 6. تشغيل الـ Migrations
```bash
php artisan migrate
```

### 7. تشغيل الـ Seeder الأساسي
```bash
php artisan db:seed --class=StartOperationSeeder
```

### 8. تثبيت اعتماديات JavaScript
```bash
npm install
```

### 9. بناء الـ Frontend
```bash
npm run build
```

### 10. تشغيل السيرفر
```bash
php artisan serve --host=0.0.0.0 --port=8000
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
  php artisan serve --host=0.0.0.0 --port=8000
  ```

- لإعادة تهيئة المشروع من الصفر:
  ```bash
  php artisan migrate:fresh
  php artisan db:seed --class=StartOperationSeeder
  ```
