# Step 9 — فصل الدفع عن الفاتورة (نظام الإيصالات)

## الفكرة الجوهرية

الدفع يصبح مرتبطاً بـ `customer_id` مباشرة وليس بـ `invoice_id`.
الفاتورة تبقى سجلاً للمبيعات فقط، والدين يُحسب على مستوى العميل كاملاً.
التسوية هي عملية عكسية — المتجر يُعيد مبلغاً للعميل.

---

## معادلة الدين الكلي

```
دين العميل = مجموع الفواتير - مجموع الإيصالات + مجموع التسويات
```

> إذا كانت النتيجة سالبة → المتجر مدين للعميل

---

## قواعد العمل

### الزبون النقدي
- عند إنشاء الفاتورة يجب الدفع الكامل فوراً
- لا يُسمح بأي متبقي
- الإيصال يُنشأ تلقائياً مع الفاتورة

### الزبون المسجّل
- الدين الكلي = مجموع كل فواتيره - مجموع كل إيصالاته + مجموع كل تسوياته
- لا يوجد ربط إجباري بين إيصال وفاتورة معينة
- يمكن سداد الدين من أي واجهة (صفحة الفاتورة، صفحة العميل، صفحة الإيصالات)
- عند تعديل فاتورة → الدين يُعاد حسابه تلقائياً

---

## التغييرات في قاعدة البيانات

### جدول `payments` (يتحول إلى `receipts`)

```
الحالي:
- id
- invoice_id (required, FK)
- payment_method_id
- amount
- notes
- created_at

الجديد:
- id
- customer_id (required, FK) ← التغيير الأساسي
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
- total_debt     (يُحسب من الفواتير - الإيصالات + التسويات)
```

### جدول `invoices`
```
يُحذف منه:
- paid_amount   ← يُحسب ديناميكياً من receipts
- due_amount    ← يُحسب ديناميكياً
- payment_status ← يُحسب ديناميكياً

أو يبقى كـ cached values تُحدَّث عند كل إيصال جديد
```

> **ملاحظة:** الأفضل إبقاؤها كـ cached values لتجنب N+1 queries

---

## النماذج (Models)

### Receipt (جديد — بدل Payment)
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
public function receipts(): HasMany
public function settlements(): HasMany

// حساب الدين
public function getTotalDebtAttribute():
  = sum(invoices.total) - sum(receipts.amount) + sum(settlements.amount)
```

### Invoice (تعديل)
```php
// العلاقة تتغير
public function receipts(): HasMany  // بدل payments()
  → where invoice_id = this->id

// recalculate() تتغير
// paid_amount يُحسب من receipts التي تحمل invoice_id هذه
```

---

## الـ Repositories

### ReceiptRepository (جديد)
```
- allWithRelations()
- filter(array $params)
- findWithRelations(int $id)
- createReceipt(array $data): Receipt
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
  = sum(invoices) - sum(receipts) + sum(settlements)
- getTotalPaid(int $customerId): decimal
- recalculateBalance(int $customerId): void
```

### InvoiceRepository (تعديل)
```
- addPayment() → يُحذف
- recalculateInvoice() → يحسب من receipts بـ invoice_id
```

---

## الـ Controllers

### ReceiptController (جديد)
```
GET    /receipts          → index (قائمة الإيصالات مع فلترة)
GET    /receipts/{id}     → show (تفاصيل إيصال)
POST   /receipts          → store (إنشاء إيصال جديد)
DELETE /receipts/{id}     → destroy
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
- حذف addPayment()
- destroy() → يتحقق من receipts المرتبطة بالفاتورة
  إذا وجد مبلغ مدفوع → يعرض تنبيه ويطلب تأكيداً قبل الحذف
  بعد الحذف → يعرض خيار إنشاء تسوية بقيمة المبلغ المدفوع
- إضافة منطق إنشاء Receipt تلقائي عند storeWithItems()
```

### CustomerController (تعديل)
```
- show() يُضيف total_debt و receipts و settlements للـ props
```

---

## الصفحات (Frontend)

### صفحات جديدة

#### `/receipts` — قائمة الإيصالات
```
- نفس تصميم صفحة الفواتير
- فلاتر: العميل، وسيلة الدفع، التاريخ من/إلى، المبلغ من/إلى
- pagination
- كل إيصال يعرض: رقمه، العميل، المبلغ، وسيلة الدفع، التاريخ، الفاتورة المرتبطة (إن وجدت)
```

#### `/receipts/{id}` — تفاصيل إيصال
```
- معلومات الإيصال
- العميل + دينه الكلي
- الفاتورة المرتبطة (إن وجدت) مع رابط لها
```

#### `/settlements` — قائمة التسويات
```
- نفس تصميم صفحة الإيصالات
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
│ [زر: إنشاء إيصال للدين ←]           │
└─────────────────────────────────────┘

- زر "إنشاء إيصال للدين" يفتح نموذج إيصال جديد بقيمة الدين (قابل للتعديل)
- الإيصال يُنشأ مستقلاً (بدون invoice_id)
- بعد الحفظ يُحدَّث الدين المعروض تلقائياً
- إذا كان الدين = 0 لا يظهر هذا القسم
```

#### صفحة تفاصيل الفاتورة `/invoices/{id}`
```
- قسم "الدفعات" يصبح "الإيصالات المرتبطة"
- يعرض الإيصالات التي تحمل invoice_id = هذه الفاتورة
- يبقى زر "إضافة إيصال" يُنشئ إيصالاً مرتبطاً بهذه الفاتورة
- عند الحذف إذا كان paid_amount > 0 يظهر modal تنبيه:

  ┌──────────────────────────────────────────┐
  │ ⚠️ تنبيه                                 │
  │ هذه الفاتورة تحتوي على مبلغ مدفوع       │
  │ (40.00 د). هل تريد إنشاء تسوية؟       │
  │ [نعم، أنشئ تسوية] [لا، احذف فقط]        │
  └──────────────────────────────────────────┘
```

#### صفحة العميل (مستقبلاً)
```
- بطاقة "الوضع المالي":
  - إجمالي المشتريات
  - إجمالي الإيصالات
  - إجمالي التسويات
  - الدين الكلي = المشتريات - الإيصالات + التسويات
- زر "إيصال جديد" → نموذج دفع مستقل
- زر "تسوية جديدة" → نموذج تسوية مستقلة
- تاريخ الإيصالات والتسويات كاملاً
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
   - إنشاء Receipt بـ customer_id = 1 (نقدي) و invoice_id = invoice.id
   - التحقق: amount >= invoice.total (وإلا رفض)
```

### إنشاء فاتورة لزبون مسجّل
```
1. اختيار العميل → يظهر دينه السابق
2. (اختياري) سداد الدين القديم → إنشاء Receipt مستقل
3. إضافة منتجات للفاتورة الجديدة
4. (اختياري) إضافة دفع للفاتورة الجديدة
5. عند الحفظ:
   - إنشاء Invoice
   - إنشاء Receipt بـ invoice_id = invoice.id (إن وجد دفع)
   - تحديث total_debt للعميل
```

### سداد دين من صفحة الإيصالات
```
1. POST /receipts
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
1.  Migration: تعديل جدول payments → receipts
2.  Migration: إنشاء جدول settlements
3.  Models: Receipt + Settlement + تعديل Customer + Invoice
4.  ReceiptRepository + Interface
5.  SettlementRepository + Interface
6.  ReceiptController + Routes
7.  SettlementController + Routes
8.  Frontend: /receipts (Index + Show)
9.  Frontend: /settlements (Index + Show)
10. Frontend: تعديل Create.tsx (قسم الدين السابق + إيصال للدين)
11. Frontend: تعديل Show.tsx (إيصالات + تنبيه الحذف + تسوية)
12. Frontend: تعديل Customers (بطاقة الوضع المالي)
```

---

## ملاحظات مهمة

- `invoice.payment_status` يبقى كـ cached value يُحسب من receipts التي تحمل `invoice_id`
- الإيصالات المستقلة (بدون invoice_id) تُخفّض الدين الكلي للعميل فقط
- التسويات المستقلة (بدون invoice_id) تزيد الدين الكلي للعميل (المتجر مدين)
- الدين السالب يظهر بلون مختلف في الواجهة (المتجر مدين للعميل)
- عند حذف فاتورة → إيصالاتها تبقى كما هي (سجل مالي للعميل لا يُمس)
- الزبون النقدي (id=1) لا يظهر في صفحة الإيصالات/التسويات المستقلة
