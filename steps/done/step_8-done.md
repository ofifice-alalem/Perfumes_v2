# ✅ Step 8 — التالف والخسائر

## Features المنجزة

### قاعدة البيانات
- **waste_logs**: رأس سجل التالف (user_id, notes, timestamps)
- **waste_items**: أسطر التالف (waste_log_id, product_id, quantity, reason, notes)
- **ENUM reason**: broken / spilled / expired / lost / other
- **CASCADE**: حذف السجل يحذف جميع الأسطر تلقائياً

### المنطق الأساسي
- `stock -= quantity` فور إضافة أي سطر
- `stock += quantity` عند حذف سطر (إعادة المخزون)
- `stock += quantity` عند حذف السجل كاملاً (قبل الحذف)
- لا يمكن تسجيل تالف أكثر من المخزون المتاح
- جميع المنتجات مؤهلة (بيعية + تشغيلية)
- عند تعديل الكمية: يُحدَّث المخزون بالفرق (`newQty - oldQty`)

### صفحة القائمة (/waste)
- قائمة سجلات التالف — نفس نمط المشتريات
- Strip أحمر مميز لكل سجل
- عرض: رقم السجل + التاريخ + عدد المنتجات + المسجِّل
- فلتر بالمسجِّل
- حذف السجل مع إعادة المخزون

### صفحة الإنشاء (/waste/create) — POS Style
- **لوحتان**: يسار (إدخال) + يمين (عناصر التالف)
- اختيار المنتج من قائمة (بما فيها التشغيلية)
- الكمية عبر NumberPadModal
- أزرار الأسباب الخمسة مباشرة (broken/spilled/expired/lost/other)
- جدول العناصر في اليمين مع زر حذف
- ملاحظات عامة + زر تأكيد

### صفحة التفاصيل (/waste/{id})
- معلومات السجل (المسجِّل + التاريخ + عدد المنتجات)
- **جدول المنتجات** مع:
  - تعديل inline (الكمية + السبب) مع تحديث المخزون بالفرق
  - إضافة منتج جديد من نفس الصفحة
  - حذف سطر مع إعادة المخزون
- **ملخص السجل**: إجمالي المنتجات + توزيع الأسباب بألوان مميزة

### Sidebar
- رابط "التالف" مضاف بين المشتريات والمنتجات

## الملفات المنجزة

### Backend
- `database/migrations/2026_05_01_130050_create_waste_logs_table.php`
- `database/migrations/2026_05_01_130051_create_waste_items_table.php`
- `app/Models/WasteLog.php`
- `app/Models/WasteItem.php`
- `app/Repositories/Contracts/WasteRepositoryInterface.php`
- `app/Repositories/WasteRepository.php` — createLog, addItem, updateItem, removeItem
- `app/Http/Controllers/WasteController.php`
- `app/Providers/RepositoryServiceProvider.php` — binding مضاف
- `routes/web.php` — routes مضافة

### Frontend
- `resources/js/pages/Waste/Index.tsx`
- `resources/js/pages/Waste/Create.tsx`
- `resources/js/pages/Waste/Show.tsx`
- `resources/js/components/layout/AppSidebar.tsx` — رابط التالف
