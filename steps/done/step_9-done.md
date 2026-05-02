# ✅ Step 9 — فصل الدفع عن الفاتورة

## Features المنجزة

### قاعدة البيانات
- **Migration**: إضافة `customer_id` (required) لجدول `payments` + جعل `invoice_id` nullable
- **Migration**: إنشاء جدول `settlements` (customer_id, invoice_id nullable, payment_method_id, amount, notes)
- نقل `customer_id` تلقائياً من الفواتير إلى الدفعات الموجودة عند التهجير

### معادلة الدين الكلي
```
دين العميل = مجموع الفواتير - مجموع المدفوعات + مجموع التسويات
```

### Models
- **Payment**: إضافة `customer_id` + علاقة `belongsTo Customer`
- **Settlement**: نموذج جديد كامل مع علاقات Customer, Invoice, PaymentMethod
- **Customer**: إضافة علاقات `payments()` و `settlements()`

### Repositories
- **PaymentRepository** + **PaymentRepositoryInterface**: allWithRelations, filter, findWithRelations, createPayment, deletePayment
- **SettlementRepository** + **SettlementRepositoryInterface**: allWithRelations, filter, findWithRelations, createSettlement, deleteSettlement
- **InvoiceRepository**: تعديل `addPayment()` لإضافة `customer_id` + تعديل `updateCustomerDebt()` لاستخدام المعادلة الجديدة (فواتير - مدفوعات + تسويات)

### Controllers
- **PaymentController**: index, show, store, destroy
- **SettlementController**: index, show, store, destroy
- **InvoiceController**: تعديل `storeWithItems()` و `destroy()` لاستدعاء `updateCustomerDebt()`
- **CustomerController**: إضافة `paymentMethods` للـ props

### Routes
```
GET/POST  /payments          → PaymentController
GET       /payments/{id}     → PaymentController@show
DELETE    /payments/{id}     → PaymentController@destroy

GET/POST  /settlements       → SettlementController
GET       /settlements/{id}  → SettlementController@show
DELETE    /settlements/{id}  → SettlementController@destroy
```

### Frontend

#### صفحات جديدة
- `Payments/Index.tsx` — قائمة المدفوعات مع فلاتر + نموذج دفعة جديدة
- `Payments/Show.tsx` — تفاصيل دفعة مع بيانات العميل والفاتورة المرتبطة
- `Settlements/Index.tsx` — قائمة التسويات مع فلاتر + نموذج تسوية جديدة
- `Settlements/Show.tsx` — تفاصيل تسوية مع بيانات العميل والفاتورة المرتبطة

#### تعديلات على صفحات موجودة
- **Customers/Index.tsx**: إضافة زر "دفعة" وزر "تسوية" لكل عميل مع modals مدمجة
- **Invoices/Create.tsx**: إضافة قسم الدين السابق مع زر "سداد الدين" يُضيف دفعة تلقائياً
- **AppSidebar.tsx**: إضافة روابط "المدفوعات" و"التسويات"

## الملفات المنجزة

### Backend
- `database/migrations/2026_05_02_125847_add_customer_id_to_payments_table.php`
- `database/migrations/2026_05_02_125848_create_settlements_table.php`
- `app/Models/Payment.php` — تعديل
- `app/Models/Settlement.php` — جديد
- `app/Models/Customer.php` — تعديل (علاقات)
- `app/Repositories/Contracts/PaymentRepositoryInterface.php` — جديد
- `app/Repositories/Contracts/SettlementRepositoryInterface.php` — جديد
- `app/Repositories/PaymentRepository.php` — جديد
- `app/Repositories/SettlementRepository.php` — جديد
- `app/Repositories/InvoiceRepository.php` — تعديل
- `app/Repositories/Contracts/InvoiceRepositoryInterface.php` — تعديل
- `app/Http/Controllers/PaymentController.php` — جديد
- `app/Http/Controllers/SettlementController.php` — جديد
- `app/Http/Controllers/InvoiceController.php` — تعديل
- `app/Http/Controllers/CustomerController.php` — تعديل
- `app/Providers/RepositoryServiceProvider.php` — تعديل
- `routes/web.php` — تعديل

### Frontend
- `resources/js/pages/Payments/Index.tsx` — جديد
- `resources/js/pages/Payments/Show.tsx` — جديد
- `resources/js/pages/Settlements/Index.tsx` — جديد
- `resources/js/pages/Settlements/Show.tsx` — جديد
- `resources/js/pages/Customers/Index.tsx` — تعديل
- `resources/js/pages/Invoices/Create.tsx` — تعديل
- `resources/js/components/layout/AppSidebar.tsx` — تعديل
