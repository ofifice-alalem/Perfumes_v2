# ✅ Step 1 — الجداول والبنية الأساسية

## Migrations (17 جدول)
- `users`, `cache`, `jobs` — Laravel defaults
- `categories`, `price_tiers`, `sizes` — تصنيفات وأحجام وتيرات
- `products`, `tier_prices`, `product_prices` — المنتجات والتسعير
- `customers`, `payment_methods` — العملاء ووسائل الدفع
- `invoices`, `invoice_items`, `payments` — الفواتير والبيع
- `original_perfume_details` — تفاصيل العطور الأصلية
- `suppliers`, `purchases`, `purchase_items`, `supplier_payments` — المشتريات

## Models (16 Model)
`Category` · `PriceTier` · `Size` · `Product` · `TierPrice` · `ProductPrice` · `Customer` · `PaymentMethod` · `Invoice` · `InvoiceItem` · `Payment` · `OriginalPerfumeDetail` · `Supplier` · `Purchase` · `PurchaseItem` · `SupplierPayment`

## Seeders
بيانات أولية جاهزة:
- 5 تصنيفات (عطور زيتية، أصلية، بخور، وشق، مبخرة)
- 10 أحجام (ml, pcs, g)
- 3 تيرات (A, B, C) مع 12 سعر
- زبون نقدي (id=1)
- 3 وسائل دفع (نقدي، بطاقة، تحويل بنكي)

## Frontend
- Spatial UI / VisionOS Design System منقول من المرجع
- `AppShell` + `AppSidebar` + `TopNav` جاهزة
- `SpatialCard` + `ModernInput` + `ModernSelect` جاهزة
- صفحة Dashboard أولية للتحقق من المظهر ✅
