# ✅ Step 7 — المواد التشغيلية

## Features المنجزة

### التعديل على قاعدة البيانات
- **Migration**: إضافة حقل `is_operational` لجدول `categories` (BOOLEAN, default: false)
- **Model Category**: إضافة `is_operational` في `$fillable` و `$casts`

### صفحة التصنيفات (/categories)
- **Toggle تشغيلي**: عند إضافة أو تعديل تصنيف يظهر toggle لتحديد إذا كان تشغيلياً
- **Badge "تشغيلي"**: يظهر بجانب اسم التصنيف في القائمة بلون أصفر مميز
- **عدد المنتجات**: كل تصنيف يعرض عدد المنتجات التابعة له (`withCount('products')`)

### صفحة المنتجات (/products)
- **إخفاء الأسعار**: عند اختيار تصنيف `is_operational = true` لا يظهر قسم الأسعار
- **إخفاء حد المخزون**: حقل `min_stock` يختفي للمواد التشغيلية
- **Backend**: `ProductController` لا يطلب `product_prices` للمواد التشغيلية

### فلترة صفحة البيع (/invoices/create و /invoices/{id})
- **InvoiceController**: المنتجات التشغيلية مفلترة بـ `whereHas('category', fn($q) => $q->where('is_operational', false))`
- المواد التشغيلية لا تظهر في قائمة المنتجات عند البيع
- لا يمكن بيعها للعميل بالخطأ

### Seeder
- إضافة تصنيف "مستلزمات تشغيلية" (`unit: pcs`, `is_operational: true`) في `InitialDataSeeder`
- تحديث التصنيفات الموجودة لتشمل `is_operational: false` صراحةً

## الملفات المعدّلة

### Backend
- `database/migrations/2026_04_30_172236_add_is_operational_to_categories_table.php`
- `app/Models/Category.php`
- `app/Http/Controllers/CategoryController.php`
- `app/Http/Controllers/InvoiceController.php`
- `app/Http/Controllers/ProductController.php`
- `app/Repositories/ProductRepository.php`
- `app/Repositories/Contracts/ProductRepositoryInterface.php`
- `app/Repositories/CategoryRepository.php` — إضافة `withCount('products')`
- `database/seeders/InitialDataSeeder.php`

### Frontend
- `resources/js/pages/Categories/Index.tsx` — toggle + badge + products_count
- `resources/js/pages/Products/Index.tsx` — إخفاء الأسعار وحد المخزون للتشغيلي

## القواعد المطبقة
- `is_operational = TRUE` → لا تظهر في البيع، تظهر في المشتريات
- `stock` للمواد التشغيلية = كمية مشتراة إجمالية (تراكمية) وليس المتبقي الفعلي
- `selling_type = 'unit_priced'` دائماً للمواد التشغيلية
- `product_prices` اختياري — لأنها لا تُباع
- يمكن إنشاء أكثر من تصنيف تشغيلي بنفس المنطق
