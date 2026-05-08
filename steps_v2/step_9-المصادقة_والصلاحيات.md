# Step 9 — المصادقة والصلاحيات (Authentication & Authorization)

## الفلسفة

النظام يعمل بدون أي حماية حالياً — كل المسارات مكشوفة.
هذه المرحلة تُضيف:
- **تسجيل الدخول** عبر Laravel Sanctum (Session-based)
- **حماية جميع المسارات** بـ middleware
- **نظام أدوار** عبر `spatie/laravel-permission` (حذف عمود `role` من `users`)
- **API Token** للاستخدام المستقبلي

---

## الأدوار الثلاثة

```
'super-admin' → صلاحيات كاملة + لوحة التحكم والإحصائيات
'admin'       → إدارة المنتجات والأسعار والتصنيفات والمستخدمين
'saler'       → تسجيل المبيعات فقط (invoices + payments + settlements + invoice-returns)
```

---

## 🗂️ الملفات المُنشأة أو المُعدَّلة في هذه المرحلة

```
Backend:
   database/migrations/2026_05_08_092604_create_permission_tables.php  → جداول Spatie
   database/migrations/2026_05_08_092612_drop_role_column_from_users_table.php → حذف عمود role
   database/seeders/RolesAndAdminSeeder.php     → إنشاء الأدوار ومستخدم super-admin
   app/Models/User.php                          → إضافة HasRoles trait
   app/Http/Controllers/Auth/LoginController.php → تسجيل الدخول
   app/Http/Requests/Auth/LoginRequest.php      → validation تسجيل الدخول
   app/Http/Middleware/HandleInertiaRequests.php → تمرير بيانات المستخدم والأدوار
   routes/web.php                               → تغليف المسارات بـ auth + role

Frontend:
   resources/js/pages/Auth/Login.tsx            → صفحة تسجيل الدخول
```

---

## 1️⃣ spatie/laravel-permission

**الوظيفة:** نظام أدوار وصلاحيات كامل عبر جداول منفصلة.

```
الجداول المُنشأة:
   roles                → الأدوار (super-admin, admin, saler)
   permissions          → الصلاحيات (غير مستخدمة حالياً)
   model_has_roles      → ربط المستخدمين بالأدوار
   model_has_permissions → ربط المستخدمين بالصلاحيات
   role_has_permissions  → ربط الأدوار بالصلاحيات
```

**الاستخدام في routes:**
```
->middleware('role:super-admin')
->middleware('role:super-admin,admin')
->middleware('role:super-admin,admin,saler')
```

**قواعد:**
```
- إذا لم يكن للمستخدم الدور المطلوب → abort(403)
- super-admin يملك صلاحية كل شيء
- saler لا يستطيع الوصول لصفحات الإدارة
```

---

## 2️⃣ LoginController

**الوظيفة:** تسجيل الدخول وتسجيل الخروج.

```
POST /login  → تسجيل الدخول (username + password)
POST /logout → تسجيل الخروج
```

**قواعد:**
```
- تسجيل الدخول بـ username (ليس email)
- عند النجاح → redirect إلى /
- عند الفشل → رسالة خطأ
- تسجيل الخروج → invalidate session → redirect إلى /login
```

---

## 3️⃣ RolesAndAdminSeeder

**الوظيفة:** إنشاء الأدوار الثلاثة ومستخدم super-admin افتراضي.

```
البيانات المُنشأة:
   Role: super-admin
   Role: admin
   Role: saler
   
   User:
      username: admin
      password: password
      role: super-admin
```

---

## 4️⃣ حماية المسارات

**التقسيم حسب الدور:**

```
متاح للجميع (super-admin + admin + saler):
   /invoices, /payments, /settlements, /invoice-returns
   /customers, /suppliers
   /purchases, /supplier-payments, /supplier-settlements
   /purchase-returns
   /waste-logs

متاح لـ (super-admin + admin) فقط:
   /categories, /sizes, /price-tiers, /products
   /payment-methods
   /users

متاح لـ (super-admin) فقط:
   / (Dashboard مع الإحصائيات)
```

---

## 5️⃣ صفحة Login

**التصميم:** نفس نظام Spatial UI المستخدم في المشروع.

```
الحقول:
   username → اسم الدخول
   password → كلمة المرور
   زر تسجيل الدخول

قواعد:
   - لا يوجد "تسجيل حساب جديد" — المستخدمون يُنشأون من لوحة التحكم فقط
   - لا يوجد "نسيت كلمة المرور" — يُعاد تعيينها من لوحة التحكم
```

---

## 🔄 تدفق العمل

```
المستخدم يفتح أي صفحة
      ↓
middleware auth يتحقق من الجلسة
      ↓
┌─────────────────────────────────────────────────────┐
│ غير مسجّل دخول                                      │
│   → redirect إلى /login                             │
├─────────────────────────────────────────────────────┤
│ مسجّل دخول                                          │
│   → RoleMiddleware يتحقق من الدور                   │
│   → إذا مسموح → يعرض الصفحة                        │
│   → إذا ممنوع → 403                                 │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ قواعد العمل المهمة

```
1. ✅ جميع المسارات محمية بـ middleware('auth') + middleware('role:...')
2. ✅ عمود `role` محذوف من جدول `users` — الأدوار في جداول Spatie
3. ✅ تسجيل الدخول بـ username وليس email
3. ✅ لا يوجد تسجيل حساب جديد من الواجهة
4. ✅ saler لا يرى صفحات الإدارة في الـ Sidebar (categories, sizes, price-tiers, products, payment-methods, users)
5. ✅ user_id في invoices/purchases يأخذ من Auth::id() دائماً (لا fallback)
6. ✅ Sanctum يُهيأ لدعم API Tokens مستقبلاً
7. ✅ بيانات المستخدم الحالي تُمرَّر لـ Inertia عبر HandleInertiaRequests
```

---

## 🎯 ما اكتمل بعد هذه المرحلة

```
✅ النظام محمي بالكامل — لا يمكن الوصول لأي صفحة بدون تسجيل دخول
✅ الأدوار مُطبَّقة — كل مستخدم يرى فقط ما يُسمح له
✅ user_id صحيح دائماً في جميع السجلات
✅ Sanctum جاهز للـ API مستقبلاً
```

---

## انتهى
