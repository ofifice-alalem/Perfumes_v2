# Step 10 — النظام المالي للموردين (المدفوعات والتسويات)

## الفكرة الجوهرية

الدفع للمورد يصبح مرتبطاً بـ `supplier_id` مباشرة وليس بـ `purchase_id` فقط.
فاتورة الشراء تبقى سجلاً للمشتريات فقط، والدين يُحسب على مستوى المورد كاملاً.
التسوية هي عملية عكسية — المورد يُعيد مبلغاً للمتجر (أو خصم).

---

## معادلة الدين الكلي

```
دين المتجر للمورد = مجموع فواتير الشراء - مجموع المدفوعات + مجموع التسويات
```

> إذا كانت النتيجة سالبة → المورد مدين للمتجر

---

## قواعد العمل

### المورد النقدي
- عند إنشاء فاتورة شراء يجب الدفع الكامل فوراً
- لا يُسمح بأي متبقي
- الدفع يُنشأ تلقائياً مع فاتورة الشراء

### المورد المسجّل
- الدين الكلي = مجموع كل فواتير الشراء - مجموع كل مدفوعاته + مجموع كل تسوياته
- لا يوجد ربط إجباري بين دفعة وفاتورة شراء معينة
- يمكن سداد الدين من أي واجهة (صفحة فاتورة الشراء، صفحة المورد، صفحة المدفوعات)
- عند تعديل فاتورة شراء → الدين يُعاد حسابه تلقائياً

---

## التغييرات في قاعدة البيانات

### جدول `supplier_payments` (تعديل)

```
الحالي:
- id
- purchase_id (required, FK)
- payment_method_id
- amount
- notes
- created_at

بعد التعديل:
- id
- supplier_id (required, FK) ← التغيير الأساسي
- purchase_id (nullable, FK)  ← للمرجعية فقط، لا يُستخدم في الحساب
- payment_method_id
- amount
- notes
- created_at
```

### جدول `supplier_settlements` (جديد — التسويات)

```
- id
- supplier_id (required, FK)
- purchase_id (nullable, FK)  ← فاتورة الشراء الملغاة أو السبب للمرجعية
- payment_method_id           ← كيف تم رد المبلغ (نقد، تحويل، إلخ)
- amount
- notes
- created_at
```

### جدول `suppliers`
```
يبقى كما هو:
- total_purchases (يُحسب من مجموع فواتير الشراء)
- total_debt     (يُحسب من الشراء - المدفوعات + التسويات)
```

### جدول `purchases`
```
يبقى كـ cached values تُحدَّث عند كل دفعة جديدة:
- paid_amount   ← يُحسب من supplier_payments التي تحمل purchase_id هذه
- due_amount    ← يُحسب ديناميكياً
- payment_status ← يُحسب ديناميكياً
```

> **ملاحظة:** إبقاؤها كـ cached values لتجنب N+1 queries

---

## النماذج (Models)

### SupplierPayment (تعديل)
```php
- id
- supplier_id
- purchase_id (nullable)
- payment_method_id
- amount
- notes
- created_at

Relations:
- belongsTo Supplier
- belongsTo Purchase (nullable)
- belongsTo PaymentMethod
```

### SupplierSettlement (جديد — التسويات)
```php
- id
- supplier_id
- purchase_id (nullable)   ← فاتورة الشراء الملغاة أو سبب التسوية
- payment_method_id        ← كيف تم رد المبلغ
- amount
- notes
- created_at

Relations:
- belongsTo Supplier
- belongsTo Purchase (nullable)
- belongsTo PaymentMethod
```

### Supplier (تعديل)
```php
// علاقات جديدة
public function supplierPayments(): HasMany
public function supplierSettlements(): HasMany

// حساب الدين
public function getTotalDebtAttribute():
  = sum(purchases.total) - sum(supplier_payments.amount) + sum(supplier_settlements.amount)
```

### Purchase (تعديل)
```php
// العلاقة تبقى كما هي
public function supplierPayments(): HasMany
  → where purchase_id = this->id

// recalculate() تتغير
// paid_amount يُحسب من supplier_payments التي تحمل purchase_id هذه
```

---

## الـ Repositories

### SupplierPaymentRepository (تعديل/جديد)
```
- allWithRelations()
- filter(array $params)
- findWithRelations(int $id)
- createPayment(array $data): SupplierPayment
- getSupplierBalance(int $supplierId): decimal
```

### SupplierSettlementRepository (جديد)
```
- allWithRelations()
- filter(array $params)
- findWithRelations(int $id)
- createSettlement(array $data): SupplierSettlement
```

### SupplierRepository (تعديل)
```
- getTotalDebt(int $supplierId): decimal
  = sum(purchases) - sum(supplier_payments) + sum(supplier_settlements)
- getTotalPaid(int $supplierId): decimal
- recalculateBalance(int $supplierId): void
```

### PurchaseRepository (تعديل)
```
- addPayment() → يبقى لكن يربط بالمورد بدل فاتورة الشراء
- recalculatePurchase() → يحسب من supplier_payments بـ purchase_id
```

---

## الـ Controllers

### SupplierPaymentController (جديد)
```
GET    /supplier-payments          → index (قائمة المدفوعات مع فلترة)
GET    /supplier-payments/{id}     → show (تفاصيل دفعة)
POST   /supplier-payments          → store (إنشاء دفعة جديدة)
DELETE /supplier-payments/{id}     → destroy
```

### SupplierSettlementController (جديد)
```
GET    /supplier-settlements          → index (قائمة التسويات مع فلترة)
GET    /supplier-settlements/{id}     → show (تفاصيل تسوية)
POST   /supplier-settlements          → store (إنشاء تسوية جديدة)
DELETE /supplier-settlements/{id}     → destroy
```

### PurchaseController (تعديل)
```
- show() يُضيف supplier_financial_summary للـ props:
  {
    total_purchases: decimal,
    total_payments: decimal,
    total_settlements: decimal,
    total_debt: decimal
  }
- addPayment() → يبقى لكن يربط بالمورد بدل فاتورة الشراء
- destroy() → يتحقق من supplier_payments المرتبطة بفاتورة الشراء
  إذا وجد مبلغ مدفوع → يعرض تنبيه ويطلب تأكيداً قبل الحذف
  بعد الحذف → يعرض خيار إنشاء تسوية بقيمة المبلغ المدفوع
- منطق إنشاء SupplierPayment تلقائي عند storeWithItems()
```

### SupplierController (تعديل)
```
- show() يُضيف total_debt و supplier_payments و supplier_settlements للـ props
```

---

## الصفحات (Frontend)

### صفحات جديدة

#### `/supplier-payments` — قائمة المدفوعات للموردين
```
- نفس تصميم صفحة /payments (للعملاء)
- فلاتر: المورد، وسيلة الدفع، التاريخ من/إلى، المبلغ من/إلى
- pagination
- كل دفعة تعرض: رقمها، المورد، المبلغ، وسيلة الدفع، التاريخ، فاتورة الشراء المرتبطة (إن وجدت)
- زر "دفعة جديدة"
```

#### `/supplier-payments/{id}` — تفاصيل دفعة
```
- معلومات الدفعة
- المورد + دينه الكلي
- فاتورة الشراء المرتبطة (إن وجدت) مع رابط لها
```

#### `/supplier-settlements` — قائمة التسويات
```
- نفس تصميم صفحة /settlements (للعملاء)
- فلاتر: المورد، وسيلة الدفع، التاريخ من/إلى، المبلغ من/إلى
- pagination
- كل تسوية تعرض: رقمها، المورد، المبلغ، وسيلة الدفع، التاريخ، فاتورة الشراء المرتبطة (إن وجدت)
- زر "تسوية جديدة"
```

#### `/supplier-settlements/{id}` — تفاصيل تسوية
```
- معلومات التسوية الكاملة
- المورد + دينه الكلي بعد التسوية
- فاتورة الشراء المرتبطة (إن وجدت) مع رابط لها
```

### تعديلات على صفحات موجودة

#### صفحة إنشاء فاتورة الشراء `/purchases/create`
```
عند اختيار مورد مسجّل يظهر قسم جديد:

┌─────────────────────────────────────┐
│ الوضع المالي للمورد                 │
│ الدين الحالي: 1500.00 د             │
│ [زر: سداد دفعة للمورد ←]            │
└─────────────────────────────────────┘

- زر "سداد دفعة للمورد" يفتح نموذج دفعة جديدة بقيمة الدين (قابل للتعديل)
- الدفعة تُنشأ مستقلاً (بدون purchase_id)
- بعد الحفظ يُحدَّث الدين المعروض تلقائياً
- إذا كان الدين = 0 لا يظهر هذا القسم
```

#### صفحة تفاصيل فاتورة الشراء `/purchases/{id}`
```
- إضافة قسم "الوضع المالي للمورد" (مثل صفحة المبيعات تماماً):

  ┌─────────────────────────────────────────────┐
  │ الوضع المالي للمورد                        │
  │ إجمالي المشتريات: 5000.00 د                │
  │ إجمالي المدفوعات: 3000.00 د                │
  │ إجمالي التسويات: 200.00 د                  │
  │ الدين الكلي: 2200.00 د                     │
  │ [زر: سداد دفعة للمورد ←]                   │
  └─────────────────────────────────────────────┘

- زر "سداد دفعة للمورد" يفتح modal لإنشاء دفعة مستقلة (بدون purchase_id)
- الدفعة تُخصم من الدين الكلي للمورد
- بعد الحفظ يُحدَّث القسم تلقائياً

- قسم "الدفعات" يبقى باسمه لكن يعرض supplier_payments التي تحمل purchase_id هذه
- يبقى زر "إضافة دفعة" يُنشئ دفعة مرتبطة بهذه الفاتورة
- عند الحذف إذا كان paid_amount > 0 يظهر modal تنبيه:

  ┌──────────────────────────────────────────┐
  │ ⚠️ تنبيه                                 │
  │ فاتورة الشراء تحتوي على مبلغ مدفوع     │
  │ (500.00 د). هل تريد إنشاء تسوية؟       │
  │ [نعم، أنشئ تسوية] [لا، احذف فقط]        │
  └──────────────────────────────────────────┘
```

#### صفحة الموردين `/suppliers` (تعديل)
```
- إضافة أزرار "دفعة" و"تسوية" لكل مورد (مثل صفحة العملاء)
- عند الضغط على "دفعة" → modal لإنشاء دفعة جديدة للمورد
- عند الضغط على "تسوية" → modal لإنشاء تسوية جديدة
- عرض الدين بشكل واضح مع لون مميز (أحمر = ندين له، أخضر = مسدد)
```

#### صفحة المورد (مستقبلاً - إذا تم إنشاؤها)
```
- بطاقة "الوضع المالي":
  - إجمالي المشتريات
  - إجمالي المدفوعات
  - إجمالي التسويات
  - الدين الكلي = المشتريات - المدفوعات + التسويات
- زر "دفعة جديدة" → نموذج دفع مستقل
- زر "تسوية جديدة" → نموذج تسوية مستقلة
- تاريخ المدفوعات والتسويات كاملاً
```

---

## تدفق العمل (Workflows)

### إنشاء فاتورة شراء من مورد نقدي
```
1. اختيار "مورد نقدي"
2. إضافة منتجات
3. إضافة دفع كامل (إجباري)
4. عند الحفظ:
   - إنشاء Purchase
   - إنشاء SupplierPayment بـ supplier_id = 1 (نقدي) و purchase_id = purchase.id
   - التحقق: amount >= purchase.total (وإلا رفض)
```

### إنشاء فاتورة شراء من مورد مسجّل
```
1. اختيار المورد → يظهر دينه الحالي
2. (اختياري) سداد الدين القديم → إنشاء SupplierPayment مستقل
3. إضافة منتجات لفاتورة الشراء الجديدة
4. (اختياري) إضافة دفع لفاتورة الشراء الجديدة
5. عند الحفظ:
   - إنشاء Purchase
   - إنشاء SupplierPayment بـ purchase_id = purchase.id (إن وجد دفع)
   - تحديث total_debt للمورد
```

### سداد دين من صفحة المدفوعات
```
1. POST /supplier-payments
   { supplier_id, payment_method_id, amount, notes }
   purchase_id = null
2. تحديث total_debt للمورد تلقائياً
```

### حذف فاتورة شراء بها مبلغ مدفوع
```
1. المشغل يضغط حذف
2. النظام يتحقق: هل paid_amount > 0؟
3. إذا نعم → modal تنبيه بالمبلغ المدفوع
4. خيار أ: إنشاء تسوية تلقائية بالمبلغ المدفوع
   → SupplierSettlement بـ purchase_id=purchase.id و amount=paid_amount
5. خيار ب: الحذف بدون تسوية (المشغل يقرر لاحقاً)
6. حذف فاتورة الشراء + إعادة المخزون
7. تحديث total_debt للمورد
```

### إنشاء تسوية مستقلة
```
1. من /supplier-settlements أو من صفحة المورد
2. اختيار المورد + المبلغ + وسيلة الدفع + ملاحظات
3. POST /supplier-settlements
   { supplier_id, payment_method_id, amount, notes, purchase_id: null }
4. تحديث total_debt للمورد تلقائياً
```

---

## ترتيب التنفيذ المقترح

```
1.  Migration: إضافة supplier_id لجدول supplier_payments
2.  Migration: إنشاء جدول supplier_settlements
3.  Models: تعديل SupplierPayment + إنشاء SupplierSettlement + تعديل Supplier + Purchase
4.  SupplierPaymentRepository (جديد) + Interface
5.  SupplierSettlementRepository (جديد) + Interface
6.  SupplierPaymentController (جديد) + Routes
7.  SupplierSettlementController (جديد) + Routes
8.  Frontend: /supplier-payments (Index + Show)
9.  Frontend: /supplier-settlements (Index + Show)
10. Frontend: تعديل Purchases/Create.tsx (قسم الدين الحالي + دفعة للمورد)
11. Frontend: تعديل Purchases/Show.tsx (دفعات + تنبيه الحذف + تسوية)
12. Frontend: تعديل Suppliers/Index.tsx (أزرار دفعة + تسوية مع modals)
```

---

## ملاحظات مهمة

- `purchase.payment_status` يبقى كـ cached value يُحسب من supplier_payments التي تحمل `purchase_id`
- المدفوعات المستقلة (بدون purchase_id) تُخفّض الدين الكلي للمورد فقط
- التسويات المستقلة (بدون purchase_id) تزيد الدين الكلي للمورد (المورد مدين للمتجر)
- الدين السالب يظهر بلون مختلف في الواجهة (المورد مدين للمتجر)
- عند حذف فاتورة شراء → مدفوعاتها تبقى كما هي (سجل مالي للمورد لا يُمس)
- المورد النقدي (id=1) لا يظهر في صفحة المدفوعات/التسويات المستقلة

---

## أمثلة عملية

### مثال 1: دفع جزئي لفاتورة شراء
```
فاتورة شراء: 1000 د
دفع فوري: 600 د
→ supplier_payments: { supplier_id: 2, purchase_id: 5, amount: 600 }
→ supplier.total_debt: +400 د

لاحقاً، دفع الباقي:
→ supplier_payments: { supplier_id: 2, purchase_id: 5, amount: 400 }
→ supplier.total_debt: 0 د
```

### مثال 2: دفع مستقل (بدون فاتورة)
```
المورد له دين قديم: 1500 د
نريد سداد جزء منه: 500 د
→ supplier_payments: { supplier_id: 2, purchase_id: null, amount: 500 }
→ supplier.total_debt: 1000 د
```

### مثال 3: تسوية (إلغاء فاتورة شراء مدفوعة)
```
فاتورة شراء: 800 د (مدفوعة بالكامل)
المورد يسترجع البضاعة ويرد المبلغ
→ حذف فاتورة الشراء
→ supplier_settlements: { supplier_id: 2, purchase_id: 8, amount: 800 }
→ supplier.total_debt: -800 د (المورد مدين للمتجر)
```

### مثال 4: خصم من المورد
```
المورد يعطي خصم: 200 د
→ supplier_settlements: { supplier_id: 2, purchase_id: null, amount: 200, notes: "خصم ترويجي" }
→ supplier.total_debt: -200 د
```

---

## الفرق بين Step 9 و Step 10

| الجانب | Step 9 (العملاء) | Step 10 (الموردين) |
|--------|------------------|---------------------|
| **الجدول الأساسي** | `customers` | `suppliers` |
| **جدول المدفوعات** | `payments` | `supplier_payments` |
| **جدول التسويات** | `settlements` | `supplier_settlements` |
| **جدول الفواتير** | `invoices` | `purchases` |
| **الصفحات** | `/payments`, `/settlements` | `/supplier-payments`, `/supplier-settlements` |
| **الاتجاه** | نحن ندين للعميل | نحن ندين للمورد |
| **التسوية** | رد مبلغ للعميل | المورد يرد مبلغ لنا |

---

## التناسق الكامل (Symmetry)

بعد تنفيذ Step 10، سيكون النظام **متناسق تماماً**:

```
العملاء (Customers)          ←→  الموردين (Suppliers)
├─ invoices                   ←→  purchases
├─ payments                   ←→  supplier_payments
├─ settlements                ←→  supplier_settlements
├─ /payments                  ←→  /supplier-payments
├─ /settlements               ←→  /supplier-settlements
└─ معادلة الدين               ←→  معادلة الدين
```

---

## الفوائد

1. ✅ **التناسق الكامل** — نفس المنطق للطرفين
2. ✅ **المرونة** — دفعات مستقلة + تسويات
3. ✅ **الاحترافية** — نظام ERP متكامل
4. ✅ **قابلية الصيانة** — كود موحد
5. ✅ **الوضوح** — سهل الفهم والتطوير
6. ✅ **التوسع** — جاهز لأي متطلبات مستقبلية

---

## الخلاصة

Step 10 هو **نسخة مرآة** من Step 9، لكن للموردين بدلاً من العملاء.

هذا يضمن:
- نظام مالي متكامل للطرفين
- إمكانية سداد ديون بدون ربطها بفواتير
- إمكانية إنشاء تسويات عند إلغاء فواتير مدفوعة
- تناسق كامل في الكود والواجهات

---

**بعد تنفيذ Step 10، سيكون النظام المالي مكتملاً 100% للعملاء والموردين معاً.** ✅
