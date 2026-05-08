# Step 9 — المصادقة والصلاحيات (Authentication & Authorization)

## الفلسفة

النظام يعمل بدون أي حماية حالياً — كل المسارات مكشوفة.
هذه المرحلة تُضيف:
- **تسجيل الدخول** عبر Laravel Sanctum (Session-based)
- **حماية جميع المسارات** بـ middleware
- **نظام أدوار** مبني على عمود `role` الموجود في جدول `users`
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
   app/Http/Middleware/RoleMiddleware.php       → التحقق من الدور
   app/Http/Controllers/Auth/LoginController.php → تسجيل الدخول
   app/Http/Requests/LoginRequest.php           → validation تسجيل الدخول
   routes/web.php                               → تغليف المسارات بـ auth
   bootstrap/app.php                            → تسجيل RoleMiddleware

Frontend:
   resources/js/pages/Auth/Login.tsx            → صفحة تسجيل الدخول
   resources/js/Layouts/AuthenticatedLayout.tsx → تحديث لعرض بيانات المستخدم
```

---

## 1️⃣ RoleMiddleware

**الوظيفة:** يتحقق أن المستخدم المسجّل دخوله يملك الدور المطلوب.

```
الاستخدام في routes:
   ->middleware('role:super-admin')
   ->middleware('role:super-admin,admin')
   ->middleware('role:super-admin,admin,saler')
```

**قواعد:**
```
- إذا لم يكن للمستخدم الدور المطلوب → abort(403)
- super-admin يملك صلاحية كل شيء
- saler لا يستطيع الوصول لصفحات الإدارة (categories, sizes, price-tiers, products, users)
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

## 3️⃣ حماية المسارات

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

## 4️⃣ صفحة Login

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
1. ✅ جميع المسارات محمية بـ middleware('auth') بدون استثناء
2. ✅ تسجيل الدخول بـ username وليس email
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
