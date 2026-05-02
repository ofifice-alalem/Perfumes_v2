# Step 9 — فصل الدفع عن الفاتورة

## الفكرة الجوهرية

الدفع يصبح مرتبطاً بـ `customer_id` مباشرة وليس بـ `invoice_id`.
الفاتورة تبقى سجلاً للمبيعات فقط، والدين يُحسب على مستوى العميل كاملاً.
التسوية هي عملية عكسية — المتجر يُعيد مبلغاً للعميل.

---

## معادلة الدين الكلي

```
دين العميل = مجموع الفواتير - مجموع المدفوعات + مجموع التسويات
```

> إذا كانت النتيجة سالبة → المتجر مدين للعميل

---

## قواعد العمل

### الزبون النقدي
- عند إنشاء الفاتورة يجب الدفع الكامل فوراً
- لا يُسمح بأي متبقي
- الدفع يُنشأ تلقائياً مع الفاتورة

### الزبون المسجّل
- الدين الكلي = مجموع كل فواتيره - مجموع كل مدفوعاته + مجموع كل تسوياته
- لا يوجد ربط إجباري بين دفعة وفاتورة معينة
- يمكن سداد الدين من أي واجهة (صفحة الفاتورة، صفحة العميل، صفحة المدفوعات)
- عند تعديل فاتورة → الدين يُعاد حسابه تلقائياً

---

## التغييرات في قاعدة البيانات

### جدول `payments` (تعديل فقط)

```
الحالي:
- id
- invoice_id (required, FK)
- payment_method_id
- amount
- notes
- created_at

بعد التعديل:
- id
- customer_id (required, FK) ← التغيير الوحيد
- invoice_id (nullable, FK)  ← للمرجعية فقط، لا يُستخدم في الحساب
- payment_method_id
- amount
- notes
- created_at
```

### جدول `settlements` (جديد — التسويات)

```
- id
- customer_id (required, FK)
- invoice_id (nullable, FK)  ← الفاتورة الملغاة أو السبب للمرجعية
- payment_method_id          ← كيف تم رد المبلغ (نقد، تحويل، إلخ)
- amount
- notes
- created_at
```

### جدول `customers`
```
يبقى كما هو:
- total_purchases (يُحسب من مجموع الفواتير)
- total_debt     (يُحسب من الفواتير - المدفوعات + التسويات)
```

### جدول `invoices`
```
يبقى كـ cached values تُحدَّث عند كل دفعة جديدة:
- paid_amount   ← يُحسب من payments التي تحمل invoice_id هذه
- due_amount    ← يُحسب ديناميكياً
- payment_status ← يُحسب ديناميكياً
```

> **ملاحظة:** إبقاؤها كـ cached values لتجنب N+1 queries

---

## النماذج (Models)

### Payment (تعديل)
```php
- id
- customer_id
- invoice_id (nullable)
- payment_method_id
- amount
- notes
- created_at

Relations:
- belongsTo Customer
- belongsTo Invoice (nullable)
- belongsTo PaymentMethod
```

### Settlement (جديد — التسويات)
```php
- id
- customer_id
- invoice_id (nullable)   ← الفاتورة الملغاة أو سبب التسوية
- payment_method_id       ← كيف تم رد المبلغ
- amount
- notes
- created_at

Relations:
- belongsTo Customer
- belongsTo Invoice (nullable)
- belongsTo PaymentMethod
```

### Customer (تعديل)
```php
// علاقات جديدة
public function payments(): HasMany
public function settlements(): HasMany

// حساب الدين
public function getTotalDebtAttribute():
  = sum(invoices.total) - sum(payments.amount) + sum(settlements.amount)
```

### Invoice (تعديل)
```php
// العلاقة تبقى كما هي
public function payments(): HasMany
  → where invoice_id = this->id

// recalculate() تتغير
// paid_amount يُحسب من payments التي تحمل invoice_id هذه
```

---

## الـ Repositories

### PaymentRepository (تعديل)
```
- allWithRelations()
- filter(array $params)
- findWithRelations(int $id)
- createPayment(array $data): Payment
- getCustomerBalance(int $customerId): decimal
```

### SettlementRepository (جديد)
```
- allWithRelations()
- filter(array $params)
- findWithRelations(int $id)
- createSettlement(array $data): Settlement
```

### CustomerRepository (تعديل)
```
- getTotalDebt(int $customerId): decimal
  = sum(invoices) - sum(payments) + sum(settlements)
- getTotalPaid(int $customerId): decimal
- recalculateBalance(int $customerId): void
```

### InvoiceRepository (تعديل)
```
- addPayment() → يبقى لكن يربط بالعميل بدل الفاتورة
- recalculateInvoice() → يحسب من payments بـ invoice_id
```

---

## الـ Controllers

### PaymentController (تعديل للدعم المستقل)
```
GET    /payments          → index (قائمة المدفوعات مع فلترة)
GET    /payments/{id}     → show (تفاصيل دفعة)
POST   /payments          → store (إنشاء دفعة جديدة)
DELETE /payments/{id}     → destroy
```

### SettlementController (جديد)
```
GET    /settlements          → index (قائمة التسويات مع فلترة)
GET    /settlements/{id}     → show (تفاصيل تسوية)
POST   /settlements          → store (إنشاء تسوية جديدة)
DELETE /settlements/{id}     → destroy
```

### InvoiceController (تعديل)
```
- addPayment() → يبقى لكن يربط بالعميل بدل الفاتورة
- destroy() → يتحقق من payments المرتبطة بالفاتورة
  إذا وجد مبلغ مدفوع → يعرض تنبيه ويطلب تأكيداً قبل الحذف
  بعد الحذف → يعرض خيار إنشاء تسوية بقيمة المبلغ المدفوع
- منطق إنشاء Payment تلقائي عند storeWithItems()
```

### CustomerController (تعديل)
```
- show() يُضيف total_debt و payments و settlements للـ props
```

---

## الصفحات (Frontend)

### صفحات جديدة

#### `/payments` — قائمة المدفوعات
```
- نفس تصميم صفحة الفواتير
- فلاتر: العميل، وسيلة الدفع، التاريخ من/إلى، المبلغ من/إلى
- pagination
- كل دفعة تعرض: رقمها، العميل، المبلغ، وسيلة الدفع، التاريخ، الفاتورة المرتبطة (إن وجدت)
- زر "دفعة جديدة"
```

#### `/payments/{id}` — تفاصيل دفعة
```
- معلومات الدفعة
- العميل + دينه الكلي
- الفاتورة المرتبطة (إن وجدت) مع رابط لها
```

#### `/settlements` — قائمة التسويات
```
- نفس تصميم صفحة المدفوعات
- فلاتر: العميل، وسيلة الدفع، التاريخ من/إلى، المبلغ من/إلى
- pagination
- كل تسوية تعرض: رقمها، العميل، المبلغ، وسيلة الدفع، التاريخ، الفاتورة المرتبطة (إن وجدت)
- زر "تسوية جديدة"
```

#### `/settlements/{id}` — تفاصيل تسوية
```
- معلومات التسوية الكاملة
- العميل + دينه الكلي بعد التسوية
- الفاتورة المرتبطة (إن وجدت) مع رابط لها
```

### تعديلات على صفحات موجودة

#### صفحة إنشاء الفاتورة `/invoices/create`
```
عند اختيار عميل مسجّل يظهر قسم جديد:

┌─────────────────────────────────────┐
│ الوضع المالي للعميل                 │
│ الدين السابق: 150.00 د              │
│ [زر: إنشاء دفعة للدين ←]            │
└─────────────────────────────────────┘

- زر "إنشاء دفعة للدين" يفتح نموذج دفعة جديدة بقيمة الدين (قابل للتعديل)
- الدفعة تُنشأ مستقلاً (بدون invoice_id)
- بعد الحفظ يُحدَّث الدين المعروض تلقائياً
- إذا كان الدين = 0 لا يظهر هذا القسم
```

#### صفحة تفاصيل الفاتورة `/invoices/{id}`
```
- قسم "الدفعات" يبقى باسمه لكن يعرض payments التي تحمل invoice_id هذه
- يبقى زر "إضافة دفعة" يُنشئ دفعة مرتبطة بهذه الفاتورة
- عند الحذف إذا كان paid_amount > 0 يظهر modal تنبيه:

  ┌──────────────────────────────────────────┐
  │ ⚠️ تنبيه                                 │
  │ هذه الفاتورة تحتوي على مبلغ مدفوع       │
  │ (40.00 د). هل تريد إنشاء تسوية؟         │
  │ [نعم، أنشئ تسوية] [لا، احذف فقط]        │
  └──────────────────────────────────────────┘
```

#### صفحة العميل (مستقبلاً)
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

### إنشاء فاتورة لزبون نقدي
```
1. اختيار "زبون نقدي"
2. إضافة منتجات
3. إضافة دفع كامل (إجباري)
4. عند الحفظ:
   - إنشاء Invoice
   - إنشاء Payment بـ customer_id = 1 (نقدي) و invoice_id = invoice.id
   - التحقق: amount >= invoice.total (وإلا رفض)
```

### إنشاء فاتورة لزبون مسجّل
```
1. اختيار العميل → يظهر دينه السابق
2. (اختياري) سداد الدين القديم → إنشاء Payment مستقل
3. إضافة منتجات للفاتورة الجديدة
4. (اختياري) إضافة دفع للفاتورة الجديدة
5. عند الحفظ:
   - إنشاء Invoice
   - إنشاء Payment بـ invoice_id = invoice.id (إن وجد دفع)
   - تحديث total_debt للعميل
```

### سداد دين من صفحة المدفوعات
```
1. POST /payments
   { customer_id, payment_method_id, amount, notes }
   invoice_id = null
2. تحديث total_debt للعميل تلقائياً
```

### حذف فاتورة بها مبلغ مدفوع
```
1. المشغل يضغط حذف
2. النظام يتحقق: هل paid_amount > 0؟
3. إذا نعم → modal تنبيه بالمبلغ المدفوع
4. خيار أ: إنشاء تسوية تلقائية بالمبلغ المدفوع
   → Settlement بـ invoice_id=invoice.id و amount=paid_amount
5. خيار ب: الحذف بدون تسوية (المشغل يقرر لاحقاً)
6. حذف الفاتورة + إعادة المخزون
7. تحديث total_debt للعميل
```

### إنشاء تسوية مستقلة
```
1. من /settlements أو من صفحة العميل
2. اختيار العميل + المبلغ + وسيلة الدفع + ملاحظات
3. POST /settlements
   { customer_id, payment_method_id, amount, notes, invoice_id: null }
4. تحديث total_debt للعميل تلقائياً
```

---

## ترتيب التنفيذ المقترح

```
1.  Migration: إضافة customer_id لجدول payments
2.  Migration: إنشاء جدول settlements
3.  Models: تعديل Payment + إنشاء Settlement + تعديل Customer + Invoice
4.  PaymentRepository (تعديل) + Interface
5.  SettlementRepository (جديد) + Interface
6.  PaymentController (تعديل) + Routes
7.  SettlementController (جديد) + Routes
8.  Frontend: /payments (Index + Show)
9.  Frontend: /settlements (Index + Show)
10. Frontend: تعديل Create.tsx (قسم الدين السابق + دفعة للدين)
11. Frontend: تعديل Show.tsx (دفعات + تنبيه الحذف + تسوية)
12. Frontend: تعديل Customers (بطاقة الوضع المالي)
```

---

## ملاحظات مهمة

- `invoice.payment_status` يبقى كـ cached value يُحسب من payments التي تحمل `invoice_id`
- المدفوعات المستقلة (بدون invoice_id) تُخفّض الدين الكلي للعميل فقط
- التسويات المستقلة (بدون invoice_id) تزيد الدين الكلي للعميل (المتجر مدين)
- الدين السالب يظهر بلون مختلف في الواجهة (المتجر مدين للعميل)
- عند حذف فاتورة → مدفوعاتها تبقى كما هي (سجل مالي للعميل لا يُمس)
- الزبون النقدي (id=1) لا يظهر في صفحة المدفوعات/التسويات المستقلة
