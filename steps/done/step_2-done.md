# ✅ Step 2 — البنية التحتية للتسعير

## Features المنجزة

### Categories (التصنيفات)
- Repository: `CategoryRepository` + `CategoryRepositoryInterface`
- Controller: index, store, update, destroy
- Route: `/categories`
- Page: قائمة + إضافة + تعديل inline + حذف
- حماية: لا يمكن حذف تصنيف مرتبط بمنتجات

### Sizes (الأحجام)
- Repository: `SizeRepository` + `SizeRepositoryInterface`
- Controller: index, store, update, destroy
- Route: `/sizes`
- Page: قائمة + إضافة + تعديل inline + حذف
- ملاحظة: ml فقط — البخور والوشق يُباعان بكمية يدوية

### Price Tiers (التيرات والأسعار)
- Repository: `PriceTierRepository` + `PriceTierRepositoryInterface`
- Controller: index, store, update, destroy, updatePrices
- Routes: `/price-tiers` + `PUT /price-tiers/{id}/prices`
- Page: قائمة التيرات + جدول أسعار لكل تير (عادي + VIP) + تعديل inline

## ملاحظات
- Flash messages مشتركة عبر `HandleInertiaRequests`
- `RepositoryServiceProvider` يربط كل الـ interfaces بالـ implementations
- الـ Sidebar محدث بروابط صحيحة لكل الصفحات
