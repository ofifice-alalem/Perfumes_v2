# ✅ Step 3 — المنتجات

## Features المنجزة

### Products (المنتجات)
- Repository: `ProductRepository` + `ProductRepositoryInterface`
- Controller: index, store, update, destroy
- Route: `/products`

## منطق الإضافة حسب النوع

| النوع | selling_type | الجداول |
|-------|-------------|---------|
| عطر زيتي | tier_based | products فقط |
| عطر أصلي | unit_priced | products + original_perfume_details + product_prices |
| بخور/وشق/مبخرة | unit_priced | products + product_prices |

## قواعد مطبقة
- التصنيف يحدد نوع البيع تلقائياً (ml → يظهر خيار زيتي/أصلي، pcs/g → unit_priced مباشرة)
- `price_tier_id` مطلوب للزيتي فقط
- `full_bottle` و `bottle_volume` للعطور الأصلية فقط
- المخزون لا يُدخل هنا — يُضاف عبر المشتريات

## الواجهة
- جدول في Desktop مع كل الحقول
- كاردات في Mobile مع إخفاء الحقول الفارغة
- Sidebar فلتر في Desktop / Collapsible في Mobile
- فلاتر: اسم، تصنيف، نطاق مخزون، نطاق سعر الوحدة
- Edit Modal مع ConfirmModal للحذف
