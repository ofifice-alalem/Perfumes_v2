# ✅ Step 4 — المستخدمون والعملاء

## Features المنجزة

### Users (المستخدمون)
- Repository: `UserRepository` + `UserRepositoryInterface`
- Controller: index, store, update, destroy
- Route: `/users`
- Migration: إضافة `username` و `role` لجدول `users`
- Page: قائمة + إضافة + Edit Modal + ConfirmModal للحذف
- أدوار: `super-admin` / `admin` / `saler`
- كلمة المرور اختيارية عند التعديل

### Customers (العملاء)
- Repository: `CustomerRepository` + `CustomerRepositoryInterface`
- Controller: index, store, update, destroy
- Route: `/customers`
- Page: قائمة + إضافة + Edit Modal + ConfirmModal للحذف
- زبون نقدي (id=1) مخفي من القائمة ومحمي من الحذف
- toggle نشط/غير نشط
- حماية: لا يمكن حذف عميل مرتبط بفواتير

## ملاحظة مهمة
حقول `total_purchases` و `total_debt` موجودة في الجدول لكن لم تُضف للعرض بعد.
**بعد الانتهاء من Step 5 (الفواتير)** يجب تحديث صفحة العملاء لتشمل:
- عرض الجدول مع حقل `total_purchases` و `total_debt`
- ربطها بالفواتير الفعلية
