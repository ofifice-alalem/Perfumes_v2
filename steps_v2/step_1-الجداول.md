# Step 1 — الجداول الكاملة (الحالة الفعلية للمشروع)

## الفلسفة

نظام إدارة متجر عطور متكامل يدعم:
- **4 أنواع منتجات:** عطور زيتية، عطور أصلية، بخور، وشق
- **نظام تسعير مزدوج:** تيرات للزيتية + أسعار خاصة للباقي، مع دعم Regular/VIP
- **دورة بيع كاملة:** POS → فاتورة → دفع → دين عميل
- **دورة شراء كاملة:** مورد → فاتورة شراء → مخزون → دفع للمورد
- **نظام مالي مستقل:** مدفوعات وتسويات مرتبطة بالعميل/المورد مباشرة، لا بالفاتورة فقط
- **تتبع التالف** والمواد التشغيلية
- **نظام المرتجعات:** إرجاع بضاعة للمورد مع تسوية مالية تلقائية أو يدوية

---

## عدد الجداول: 25 جدول

```
 1. users
 2. password_reset_tokens
 3. sessions
 4. categories
 5. price_tiers
 6. sizes
 7. products
 8. tier_prices
 9. product_prices
10. original_perfume_details
11. payment_methods
12. customers
13. invoices
14. invoice_items
15. payments
16. settlements
17. suppliers
20. purchases
21. purchase_items
22. supplier_payments
23. supplier_settlements
24. purchase_returns
25. purchase_return_items
26. waste_logs
27. waste_items
```

---

## الجداول بالتفصيل

---

### 1. `users`

**الوظيفة:** حسابات الدخول للنظام وتحديد الصلاحيات.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| name | VARCHAR(255) | NOT NULL | الاسم الكامل |
| username | VARCHAR(255) | UNIQUE, NULLABLE | اسم الدخول |
| email | VARCHAR(255) | UNIQUE | البريد الإلكتروني |
| email_verified_at | TIMESTAMP | NULLABLE | تاريخ التحقق |
| password | VARCHAR(255) | NOT NULL | كلمة المرور (مشفرة) |
| role | ENUM | DEFAULT 'saler' | الدور |
| remember_token | VARCHAR(100) | NULLABLE | رمز التذكر |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**ENUM role:**
```
'super-admin' → صلاحيات كاملة + لوحة التحكم والإحصائيات
'admin'       → إدارة المنتجات والأسعار والتصنيفات
'saler'       → تسجيل المبيعات فقط
```

**Constraints:**
```
UNIQUE (username)
UNIQUE (email)
```

---

### 2. `password_reset_tokens`

**الوظيفة:** رموز إعادة تعيين كلمة المرور (Laravel built-in).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| email | VARCHAR(255) | PK | البريد الإلكتروني |
| token | VARCHAR(255) | NOT NULL | الرمز |
| created_at | TIMESTAMP | NULLABLE | تاريخ الإنشاء |

---

### 3. `sessions`

**الوظيفة:** جلسات المستخدمين (Laravel built-in).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | VARCHAR | PK | معرف الجلسة |
| user_id | BIGINT | NULLABLE, INDEX | المستخدم |
| ip_address | VARCHAR(45) | NULLABLE | عنوان IP |
| user_agent | TEXT | NULLABLE | معلومات المتصفح |
| payload | LONGTEXT | NOT NULL | بيانات الجلسة |
| last_activity | INT | INDEX | آخر نشاط |

---

### 4. `categories`

**الوظيفة:** تصنيف المنتجات وتحديد وحدة القياس ونوع الاستخدام.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| name | VARCHAR(255) | NOT NULL | اسم التصنيف |
| unit | ENUM | NOT NULL | وحدة القياس |
| is_operational | BOOLEAN | DEFAULT false | هل تشغيلي؟ |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**ENUM unit:**
```
'ml'  → مليلتر  (عطور زيتية، عطور أصلية)
'pcs' → قطعة    (بخور، مبخرة)
'g'   → غرام    (وشق)
```

**قاعدة is_operational:**
```
false → منتج قابل للبيع — يظهر في POS
true  → مادة تشغيلية (أكياس، كحول، ...) — لا تظهر في POS
```

**أمثلة:**
```
عطور زيتية  → unit: ml,  is_operational: false
عطور أصلية  → unit: ml,  is_operational: false
بخور         → unit: pcs, is_operational: false
وشق          → unit: g,   is_operational: false
مستلزمات    → unit: pcs, is_operational: true
```

---

### 5. `price_tiers`

**الوظيفة:** مستويات جودة العطور الزيتية (A, B, C). كل عطور نفس التير تشترك في نفس الأسعار تلقائياً.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| name | VARCHAR(10) | UNIQUE, NOT NULL | اسم التير |
| description | VARCHAR(255) | NULLABLE | وصف المستوى |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Constraints:**
```
UNIQUE (name)
```

**ملاحظة:** يُستخدم فقط مع `selling_type = 'tier_based'`.

---

### 6. `sizes`

**الوظيفة:** الأحجام المتاحة للبيع والتسعير. مشتركة بين جميع المنتجات، تُعرض حسب وحدة المنتج.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| label | VARCHAR(50) | NOT NULL | التسمية المعروضة (3ml, 5g) |
| value | DECIMAL(10,2) | NOT NULL | القيمة الرقمية للخصم من المخزون |
| unit | ENUM | NOT NULL | الوحدة |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**ENUM unit:** `'ml'` / `'pcs'` / `'g'`

**قاعدة الخصم:**
```
عند البيع: products.stock -= size.value
```


---

### 7. `products`

**الوظيفة:** قلب النظام. يعرّف كل منتج ويحدد طريقة بيعه ومخزونه.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| name | VARCHAR(255) | NOT NULL | اسم المنتج |
| category_id | BIGINT | FK → categories.id, RESTRICT | التصنيف |
| price_tier_id | BIGINT | FK → price_tiers.id, NULL ON DELETE, NULLABLE | التير (للزيتية فقط) |
| selling_type | ENUM | NOT NULL | طريقة البيع |
| stock | DECIMAL(10,2) | DEFAULT 0 | المخزون الحالي |
| min_stock | DECIMAL(10,2) | DEFAULT 0 | الحد الأدنى للتنبيه |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**ENUM selling_type:**
```
'tier_based'  → عطر زيتي: السعر من tier_prices (tier + size)
                price_tier_id مطلوب
'unit_priced' → عطر أصلي / بخور / وشق / تشغيلي: سعر خاص في product_prices
                price_tier_id = NULL
```

**قواعد:**
```
selling_type = 'tier_based'  → price_tier_id مطلوب
selling_type = 'unit_priced' → price_tier_id = NULL
selling_type = 'unit_priced' → يجب وجود سجل في product_prices
is_operational = true        → لا يظهر في POS، يظهر في المشتريات والتالف
```

---

### 8. `tier_prices`

**الوظيفة:** جدول الأسعار المركزي للعطور الزيتية. ربط كل تير بكل حجم بسعرين (regular/vip).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| tier_id | BIGINT | FK → price_tiers.id, CASCADE | التير |
| size_id | BIGINT | FK → sizes.id, CASCADE | الحجم |
| price_regular | DECIMAL(10,2) | NOT NULL | سعر العميل العادي |
| price_vip | DECIMAL(10,2) | NOT NULL | سعر عميل VIP |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Constraints:**
```
UNIQUE (tier_id, size_id)
```

**منطق جلب السعر عند البيع:**
```sql
SELECT price_regular / price_vip
FROM tier_prices
WHERE tier_id = product.price_tier_id
  AND size_id = :size_id
```

---

### 9. `product_prices`

**الوظيفة:** الأسعار الخاصة للمنتجات من نوع `unit_priced` (عطور أصلية، بخور، وشق، تشغيلية).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| product_id | BIGINT | FK → products.id, CASCADE, UNIQUE | المنتج |
| price_per_unit_regular | DECIMAL(10,2) | NOT NULL | سعر الوحدة (عادي) |
| price_per_unit_vip | DECIMAL(10,2) | NOT NULL | سعر الوحدة (VIP) |
| full_bottle_regular | DECIMAL(10,2) | NULLABLE | سعر العبوة كاملة (عادي) |
| full_bottle_vip | DECIMAL(10,2) | NULLABLE | سعر العبوة كاملة (VIP) |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Constraints:**
```
UNIQUE (product_id)
```

**قواعد:**
```
full_bottle_regular/vip → NULL للبخور والوشق والتشغيلية
full_bottle_regular/vip → يُملأ للعطور الأصلية فقط (اختياري)
```

---

### 10. `original_perfume_details`

**الوظيفة:** معلومات إضافية خاصة بالعطور الأصلية فقط. يحدد حجم العبوة الكاملة لمعرفة كم يُخصم من المخزون عند بيع عبوة كاملة.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| product_id | BIGINT | FK → products.id, CASCADE, UNIQUE | المنتج |
| bottle_volume | DECIMAL(10,2) | NOT NULL | حجم العبوة بالـ ml |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Constraints:**
```
UNIQUE (product_id)
```

**قاعدة:**
```
يوجد سجل هنا فقط إذا كان المنتج من تصنيف "عطور أصلية"
عند بيع عبوة كاملة: products.stock -= bottle_volume
```

---

### 11. `payment_methods`

**الوظيفة:** وسائل الدفع المتاحة في النظام. جدول مستقل يسمح بإضافة وسائل جديدة بدون تعديل في الكود.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| name | VARCHAR(50) | UNIQUE, NOT NULL | اسم الوسيلة |
| is_active | BOOLEAN | DEFAULT true | هل متاحة؟ |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Constraints:**
```
UNIQUE (name)
```

---

### 12. `customers`

**الوظيفة:** بيانات العملاء لتتبع مشترياتهم وديونهم. العميل اختياري في الفاتورة — إذا لم يُحدد = زبون نقدي (id=1).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| name | VARCHAR(255) | NOT NULL | اسم العميل |
| phone | VARCHAR(20) | UNIQUE, NULLABLE | رقم الهاتف |
| email | VARCHAR(255) | NULLABLE | البريد الإلكتروني |
| address | TEXT | NULLABLE | العنوان |
| total_purchases | DECIMAL(10,2) | DEFAULT 0 | إجمالي المشتريات (cached) |
| total_paid | DECIMAL(10,2) | DEFAULT 0 | إجمالي المدفوع (cached) |
| total_returns | DECIMAL(10,2) | DEFAULT 0 | إجمالي المرتجع (cached) |
| total_settlements | DECIMAL(10,2) | DEFAULT 0 | إجمالي التسويات (cached) |
| total_debt | DECIMAL(10,2) | DEFAULT 0 | إجمالي الديون الحالية (cached) |
| is_active | BOOLEAN | DEFAULT true | حالة النشاط |
| created_at | TIMESTAMP | — | تاريخ التسجيل |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Indexes:**
```
INDEX (is_active)
UNIQUE (phone)
```

**الحقول المالية:** جميعها cached values تُحدَّث تلقائياً من النظام.

**قواعد الزبون النقدي (id=1):**
```
- لا يُعدَّل ولا يُحذف
- total_debt يبقى دائماً = 0
- لا يظهر في قائمة اختيار العملاء عند البيع
- عند إنشاء فاتورة له: يجب الدفع الكامل فوراً
```

---

### 13. `invoices`

**الوظيفة:** رأس كل عملية بيع. تجمع معلومات البائع والعميل وحالة الدفع. الإجمالي يُحسب من مجموع أسطر invoice_items.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| user_id | BIGINT | FK → users.id, RESTRICT | البائع |
| customer_id | BIGINT | FK → customers.id, NULL ON DELETE, NULLABLE | العميل (NULL = زبون نقدي) |
| customer_type | ENUM | DEFAULT 'regular' | نوع العميل |
| total | DECIMAL(10,2) | DEFAULT 0 | الإجمالي (cached من invoice_items) |
| paid_amount | DECIMAL(10,2) | DEFAULT 0 | إجمالي المدفوع (cached من payments) |
| due_amount | DECIMAL(10,2) | DEFAULT 0 | المتبقي = total - paid_amount |
| payment_status | ENUM | DEFAULT 'unpaid' | حالة الدفع |
| notes | TEXT | NULLABLE | ملاحظات |
| created_at | TIMESTAMP | — | تاريخ الفاتورة |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**ENUM customer_type:** `'regular'` / `'vip'`

**ENUM payment_status:** `'unpaid'` / `'partial'` / `'paid'`

**Indexes:**
```
INDEX (user_id)
INDEX (customer_id)
INDEX (payment_status)
INDEX (created_at)
```

**قواعد الحساب:**
```
total          = SUM(invoice_items.line_total)
paid_amount    = SUM(payments.amount WHERE invoice_id = this.id)
due_amount     = total - paid_amount
payment_status:
  paid_amount = 0         → 'unpaid'
  0 < paid_amount < total → 'partial'
  paid_amount >= total    → 'paid'
```

**ملاحظة:** `total` و `paid_amount` و `due_amount` و `payment_status` هي **cached values** تُحدَّث عند كل تغيير في الأسطر أو الدفعات. الهدف: تجنب N+1 queries.

---

### 14. `invoice_items`

**الوظيفة:** سطر واحد لكل منتج داخل الفاتورة. يحفظ السعر وقت البيع (snapshot) — لا يتأثر بأي تغيير لاحق في الأسعار.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| invoice_id | BIGINT | FK → invoices.id, CASCADE | الفاتورة |
| product_id | BIGINT | FK → products.id, RESTRICT | المنتج |
| size_id | BIGINT | FK → sizes.id, NULL ON DELETE, NULLABLE | الحجم |
| sale_type | ENUM | NOT NULL | نوع البيع |
| quantity | DECIMAL(10,2) | DEFAULT 1 | الكمية |
| unit_price | DECIMAL(10,2) | NOT NULL | سعر الوحدة وقت البيع (snapshot) |
| line_total | DECIMAL(10,2) | NOT NULL | الإجمالي = unit_price × quantity |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |

**ENUM sale_type:**
```
'tier_decant'  → عطر زيتي بالحجم
                 size_id مطلوب
                 unit_price من tier_prices
                 stock -= size.value

'unit_decant'  → عطر أصلي بالتقسيم
                 size_id مطلوب
                 unit_price من product_prices.price_per_unit
                 stock -= size.value

'full_bottle'  → عطر أصلي بالعبوة الكاملة
                 size_id = NULL
                 unit_price من product_prices.full_bottle
                 stock -= original_perfume_details.bottle_volume

'unit_based'   → بخور / وشق / مبخرة
                 size_id = NULL
                 quantity يدخله البائع يدوياً
                 unit_price من product_prices.price_per_unit
                 stock -= quantity
```

**قاعدة line_total:**
```
جميع أنواع البيع: line_total = unit_price × quantity
ملاحظة: full_bottle → quantity = bottle_volume، unit_price = سعر العبوة الكاملة
         tier_decant → quantity = size.value، unit_price = سعر التير
```

**Indexes:**
```
INDEX (invoice_id)
INDEX (product_id)
FOREIGN KEY (invoice_id) ON DELETE CASCADE
```

---

### 15. `payments`

**الوظيفة:** كل دفعة مرتبطة بعميل. الدفعة مرتبطة بالعميل مباشرة (`customer_id` إجباري) وبالفاتورة اختيارياً (`invoice_id` nullable). هذا يسمح بسداد الدين بشكل مستقل عن أي فاتورة.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| customer_id | BIGINT | FK → customers.id, NULL ON DELETE, NOT NULL | العميل |
| invoice_id | BIGINT | FK → invoices.id, NULL ON DELETE, NULLABLE | الفاتورة (للمرجعية فقط) |
| payment_method_id | BIGINT | FK → payment_methods.id, RESTRICT | وسيلة الدفع |
| amount | DECIMAL(10,2) | NOT NULL | المبلغ المدفوع |
| notes | VARCHAR(255) | NULLABLE | ملاحظة |
| created_at | TIMESTAMP | — | تاريخ الدفعة |

**Indexes:**
```
INDEX (invoice_id)
INDEX (created_at)
```

**قواعد:**
```
- invoice_id = NULL  → دفعة مستقلة لسداد الدين العام للعميل
- invoice_id موجود  → دفعة مرتبطة بفاتورة محددة
- عند حذف فاتورة: invoice_id يصبح NULL (nullOnDelete) — الدفعة تبقى كسجل مالي
- عند حذف عميل: customer_id يصبح NULL (nullOnDelete)
```

**تأثير على invoices:**
```
paid_amount = SUM(payments.amount WHERE invoice_id = invoice.id)
```

**تأثير على customers:**
```
total_debt يُعاد حسابه: SUM(invoices.total) - SUM(payments.amount) + SUM(settlements.amount)
```

---

### 16. `settlements`

**الوظيفة:** التسويات — عملية عكسية للدفع. المتجر يُعيد مبلغاً للعميل (رد بضاعة، إلغاء فاتورة مدفوعة، خصم، ...).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| customer_id | BIGINT | FK → customers.id, CASCADE | العميل |
| invoice_id | BIGINT | FK → invoices.id, NULL ON DELETE, NULLABLE | الفاتورة المرجعية |
| payment_method_id | BIGINT | FK → payment_methods.id, CASCADE | وسيلة رد المبلغ |
| amount | DECIMAL(10,2) | NOT NULL | المبلغ المُرجَع |
| notes | VARCHAR(255) | NULLABLE | ملاحظة |
| created_at | TIMESTAMP | — | تاريخ التسوية |

**قواعد:**
```
- التسوية تزيد الدين الكلي للعميل (المتجر مدين للعميل)
- إذا كان total_debt سالباً → المتجر مدين للعميل
- invoice_id = NULL → تسوية مستقلة
- invoice_id موجود → تسوية مرتبطة بفاتورة محددة (مثل إلغاء فاتورة مدفوعة)
```

**معادلة الدين بعد التسوية:**
```
total_debt = SUM(invoices.total) - SUM(payments.amount) + SUM(settlements.amount)
إذا النتيجة سالبة → المتجر مدين للعميل (يظهر بلون مختلف في الواجهة)
```

---

### 17. `invoice_returns`

**الوظيفة:** رأس سجل المرتجع من العميل. كل عملية إرجاع تزيد المخزون وقد تُنشئ تسوية مالية تلقائياً أو يدوياً.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| customer_id | BIGINT | FK → customers.id, RESTRICT | العميل |
| invoice_id | BIGINT | FK → invoices.id, NULL ON DELETE, NULLABLE | الفاتورة المرجعية |
| settlement_id | BIGINT | FK → settlements.id, NULL ON DELETE, NULLABLE | التسوية المرتبطة |
| total | DECIMAL(10,2) | DEFAULT 0 | إجمالي قيمة المرتجع |
| notes | TEXT | NULLABLE | ملاحظات |
| created_at | TIMESTAMP | — | تاريخ الإرجاع |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Indexes:**
```
INDEX (customer_id)
INDEX (created_at)
```

**قواعد:**
```
- invoice_id = NULL  → مرتجع مستقل غير مرتبط بفاتورة محددة
- invoice_id موجود  → مرتجع من فاتورة بيع محددة
- settlement_id = NULL  → لم تُنشأ تسوية بعد أو لا حاجة لها
- settlement_id موجود  → تسوية مرتبطة بهذا المرتجع
- عند حذف فاتورة: invoice_id يصبح NULL
- عند حذف التسوية: settlement_id يصبح NULL
```

**منطق التسوية عند الإرجاع:**
```
زبون نقدي (id=1):
  → تسوية تلقائية دائماً بقيمة المرتجع

زبون مسجّل:
  → النظام يحسب total_debt بعد الإرجاع
  → إذا total_debt بعد الإرجاع > 0:
       لا تسوية — المرتجع يُخفّض الدين فقط
  → إذا total_debt بعد الإرجاع <= 0:
       يظهر خيار: [إنشاء تسوية] [لاحقاً]
```

---

### 18. `invoice_return_items`

**الوظيفة:** أسطر المرتجع من العميل — كل سطر يمثل منتجاً واحداً مع كميته وسعره. عند إضافة السطر: `products.stock += quantity` فوراً.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| invoice_return_id | BIGINT | FK → invoice_returns.id, CASCADE | سجل المرتجع |
| product_id | BIGINT | FK → products.id, RESTRICT | المنتج |
| quantity | DECIMAL(10,2) | NOT NULL | الكمية المرتجعة |
| unit_price | DECIMAL(10,2) | NOT NULL | سعر الوحدة وقت الإرجاع (snapshot) |
| line_total | DECIMAL(10,2) | NOT NULL | الإجمالي = unit_price × quantity |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |

**Indexes:**
```
INDEX (invoice_return_id)
INDEX (product_id)
FOREIGN KEY (invoice_return_id) ON DELETE CASCADE
```

**قاعدة تحديث المخزون:**
```
إضافة سطر:  products.stock += quantity
حذف سطر:    products.stock -= quantity
حذف السجل:  يُعاد خصم مخزون كل الأسطر قبل الحذف (CASCADE)
```

---

### 19. `suppliers`

**الوظيفة:** بيانات الموردين لتتبع المشتريات والمدفوعات. نفس منطق customers لكن من جهة الشراء.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| name | VARCHAR(255) | NOT NULL | اسم المورد |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | رقم الهاتف |
| email | VARCHAR(255) | NULLABLE | البريد الإلكتروني |
| address | TEXT | NULLABLE | العنوان |
| total_purchases | DECIMAL(10,2) | DEFAULT 0 | إجمالي المشتريات منه (cached) |
| total_paid | DECIMAL(10,2) | DEFAULT 0 | إجمالي ما دفعته له (cached) |
| total_returns | DECIMAL(10,2) | DEFAULT 0 | إجمالي المرتجعات (cached) |
| total_settlements | DECIMAL(10,2) | DEFAULT 0 | إجمالي التسويات (cached) |
| total_debt | DECIMAL(10,2) | DEFAULT 0 | إجمالي ما ندين له (cached) |
| is_active | BOOLEAN | DEFAULT true | حالة النشاط |
| created_at | TIMESTAMP | — | تاريخ التسجيل |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Indexes:**
```
INDEX (is_active)
UNIQUE (phone)
```

**الحقول المالية:** جميعها cached values تُحدَّث تلقائياً عبر Observers.

**معادلة الدين الكلي:**
```
total_debt = total_purchases - total_paid + total_settlements - total_returns
```

**قواعد المورد النقدي (id=1):**
```
- لا يُعدَّل ولا يُحذف
- total_debt يبقى دائماً = 0
- لا يظهر في قائمة اختيار الموردين عند الشراء
- عند إنشاء فاتورة شراء منه: يجب الدفع الكامل فوراً
```

---

### 20. `purchases`

**الوظيفة:** رأس فاتورة الشراء. نفس منطق invoices لكن معكوس — أنت المشتري والمورد هو البائع.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| supplier_id | BIGINT | FK → suppliers.id, RESTRICT | المورد |
| total | DECIMAL(10,2) | DEFAULT 0 | الإجمالي (cached) |
| paid_amount | DECIMAL(10,2) | DEFAULT 0 | المدفوع (cached) |
| due_amount | DECIMAL(10,2) | DEFAULT 0 | المتبقي (cached) |
| payment_status | ENUM | DEFAULT 'unpaid' | حالة الدفع |
| notes | TEXT | NULLABLE | ملاحظات |
| created_at | TIMESTAMP | — | تاريخ الشراء |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**ENUM payment_status:** `'unpaid'` / `'partial'` / `'paid'`

**Indexes:**
```
INDEX (supplier_id)
INDEX (payment_status)
INDEX (created_at)
```

**قواعد الحساب:**
```
total          = SUM(purchase_items.line_total)
paid_amount    = SUM(supplier_payments.amount WHERE purchase_id = this.id)
due_amount     = total - paid_amount
payment_status: نفس منطق invoices
```

---

### 21. `purchase_items`

**الوظيفة:** أسطر فاتورة الشراء. كل سطر يمثل منتجاً واحداً مع كميته وسعر شرائه. عند إضافة السطر: `products.stock += quantity` تلقائياً.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| purchase_id | BIGINT | FK → purchases.id, CASCADE | فاتورة الشراء |
| product_id | BIGINT | FK → products.id, RESTRICT | المنتج |
| quantity | DECIMAL(10,2) | NOT NULL | الكمية المشتراة |
| unit_cost | DECIMAL(10,2) | NOT NULL | سعر الوحدة وقت الشراء (snapshot) |
| line_total | DECIMAL(10,2) | NOT NULL | الإجمالي = unit_cost × quantity |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |

**Indexes:**
```
INDEX (purchase_id)
INDEX (product_id)
FOREIGN KEY (purchase_id) ON DELETE CASCADE
```

**قاعدة تحديث المخزون:**
```
إضافة سطر:  products.stock += quantity
حذف سطر:    products.stock -= quantity
تعديل سطر:  products.stock += (new_quantity - old_quantity)
```

---

### 22. `supplier_payments`

**الوظيفة:** كل دفعة تدفعها للمورد. مرتبطة بالمورد مباشرة (`supplier_id` إجباري) وبفاتورة الشراء اختيارياً (`purchase_id` nullable).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| supplier_id | BIGINT | FK → suppliers.id, CASCADE | المورد |
| purchase_id | BIGINT | FK → purchases.id, NULL ON DELETE, NULLABLE | فاتورة الشراء (للمرجعية) |
| payment_method_id | BIGINT | FK → payment_methods.id, RESTRICT | وسيلة الدفع |
| amount | DECIMAL(10,2) | NOT NULL | المبلغ المدفوع |
| notes | VARCHAR(255) | NULLABLE | ملاحظة |
| created_at | TIMESTAMP | — | تاريخ الدفعة |

**Indexes:**
```
INDEX (supplier_id)
INDEX (created_at)
```

**قواعد:**
```
- purchase_id = NULL  → دفعة مستقلة لسداد الدين العام للمورد
- purchase_id موجود  → دفعة مرتبطة بفاتورة شراء محددة
- عند حذف فاتورة شراء: purchase_id يصبح NULL (nullOnDelete)
```

**تأثير على purchases:**
```
paid_amount = SUM(supplier_payments.amount WHERE purchase_id = purchase.id)
```

**تأثير على suppliers:**
```
total_debt يُعاد حسابه: SUM(purchases.total) - SUM(supplier_payments.amount) + SUM(supplier_settlements.amount)
```

---

### 23. `supplier_settlements`

**الوظيفة:** التسويات مع الموردين — المورد يُعيد مبلغاً للمتجر (رد بضاعة، خصم، إلغاء فاتورة مدفوعة، ...).

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| supplier_id | BIGINT | FK → suppliers.id, CASCADE | المورد |
| purchase_id | BIGINT | FK → purchases.id, NULL ON DELETE, NULLABLE | فاتورة الشراء المرجعية |
| payment_method_id | BIGINT | FK → payment_methods.id, RESTRICT | وسيلة رد المبلغ |
| amount | DECIMAL(10,2) | NOT NULL | المبلغ المُرجَع |
| notes | VARCHAR(255) | NULLABLE | ملاحظة |
| created_at | TIMESTAMP | — | تاريخ التسوية |

**Indexes:**
```
INDEX (supplier_id)
INDEX (created_at)
```

**قواعد:**
```
- التسوية تزيد الدين الكلي للمورد (المورد مدين للمتجر)
- إذا كان total_debt سالباً → المورد مدين للمتجر
```

---

### 24. `purchase_returns`

**الوظيفة:** رأس سجل المرتجع — إرجاع بضاعة للمورد. كل عملية إرجاع تخصم من المخزون وقد تُنشئ تسوية مالية تلقائياً أو يدوياً.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| supplier_id | BIGINT | FK → suppliers.id, RESTRICT | المورد |
| purchase_id | BIGINT | FK → purchases.id, NULL ON DELETE, NULLABLE | فاتورة الشراء المرجعية |
| settlement_id | BIGINT | FK → supplier_settlements.id, NULL ON DELETE, NULLABLE | التسوية المرتبطة |
| total | DECIMAL(10,2) | DEFAULT 0 | إجمالي قيمة المرتجع |
| notes | TEXT | NULLABLE | ملاحظات |
| created_at | TIMESTAMP | — | تاريخ الإرجاع |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Indexes:**
```
INDEX (supplier_id)
INDEX (created_at)
```

**قواعد:**
```
- purchase_id = NULL  → مرتجع مستقل غير مرتبط بفاتورة محددة
- purchase_id موجود  → مرتجع من فاتورة شراء محددة
- settlement_id = NULL  → لم تُنشأ تسوية بعد أو لا حاجة لها
- settlement_id موجود  → تسوية مرتبطة بهذا المرتجع
- عند حذف فاتورة شراء: purchase_id يصبح NULL
- عند حذف التسوية: settlement_id يصبح NULL
```

**منطق التسوية عند الإرجاع:**
```
مورد نقدي (id=1):
  → تسوية تلقائية دائماً بقيمة المرتجع

مورد مسجّل:
  → النظام يحسب total_debt بعد الإرجاع
  → إذا total_debt بعد الإرجاع > 0:
       لا تسوية — المرتجع يُخفّض الدين فقط
  → إذا total_debt بعد الإرجاع <= 0:
       يظهر خيار: [إنشاء تسوية] [لاحقاً]
```

---

### 25. `purchase_return_items`

**الوظيفة:** أسطر المرتجع — كل سطر يمثل منتجاً واحداً مع كميته وسعره. عند إضافة السطر: `products.stock -= quantity` فوراً.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| purchase_return_id | BIGINT | FK → purchase_returns.id, CASCADE | سجل المرتجع |
| product_id | BIGINT | FK → products.id, RESTRICT | المنتج |
| quantity | DECIMAL(10,2) | NOT NULL | الكمية المرتجعة |
| unit_cost | DECIMAL(10,2) | NOT NULL | سعر الوحدة وقت الإرجاع (snapshot) |
| line_total | DECIMAL(10,2) | NOT NULL | الإجمالي = unit_cost × quantity |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |

**Indexes:**
```
INDEX (purchase_return_id)
INDEX (product_id)
FOREIGN KEY (purchase_return_id) ON DELETE CASCADE
```

**قاعدة تحديث المخزون:**
```
إضافة سطر:  products.stock -= quantity
حذف سطر:    products.stock += quantity
حذف السجل:  يُعاد مخزون كل الأسطر قبل الحذف (CASCADE)
```

---

### 26. `waste_logs`

**الوظيفة:** رأس سجل التالف. يجمع معلومات من سجّله ومتى. سجل واحد يمكن أن يحتوي على أكثر من منتج تالف.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| user_id | BIGINT | FK → users.id, RESTRICT | من سجّل التالف |
| notes | TEXT | NULLABLE | ملاحظات عامة |
| created_at | TIMESTAMP | — | تاريخ التسجيل |
| updated_at | TIMESTAMP | — | تاريخ التحديث |

**Indexes:**
```
INDEX (user_id)
INDEX (created_at)
```

---

### 27. `waste_items`

**الوظيفة:** سطر واحد لكل منتج تالف داخل السجل. عند إضافة السطر: `products.stock -= quantity` فوراً.

| الحقل | النوع | القيود | الوصف |
|-------|-------|--------|-------|
| id | BIGINT | PK, AUTO_INCREMENT | المعرف |
| waste_log_id | BIGINT | FK → waste_logs.id, CASCADE | السجل |
| product_id | BIGINT | FK → products.id, RESTRICT | المنتج |
| quantity | DECIMAL(10,2) | NOT NULL | الكمية التالفة |
| reason | ENUM | DEFAULT 'other' | سبب التلف |
| notes | TEXT | NULLABLE | ملاحظة إضافية |
| created_at | TIMESTAMP | — | تاريخ الإنشاء |

**ENUM reason:**
```
'broken'   → كسر (عبوة مكسورة، زجاجة سقطت)
'spilled'  → انسكاب
'expired'  → انتهاء الصلاحية / فساد
'lost'     → مفقود
'other'    → سبب آخر
```

**Indexes:**
```
INDEX (waste_log_id)
INDEX (product_id)
FOREIGN KEY (waste_log_id) ON DELETE CASCADE
```

**قاعدة تحديث المخزون:**
```
إضافة سطر:  products.stock -= quantity
حذف سطر:    products.stock += quantity
تعديل سطر:  products.stock += (old_quantity - new_quantity)
حذف السجل:  يُعاد مخزون كل الأسطر قبل الحذف (CASCADE)
```

---

## مخطط العلاقات الكاملة

```
users
  ├── invoices.user_id
  └── waste_logs.user_id

customers
  ├── invoices.customer_id
  ├── payments.customer_id
  └── settlements.customer_id

categories (unit + is_operational)
  └── products.category_id

price_tiers
  ├── products.price_tier_id   [tier_based فقط]
  └── tier_prices.tier_id

sizes
  ├── tier_prices.size_id
  └── invoice_items.size_id

products (selling_type + stock + min_stock)
  ├── product_prices.product_id        [unit_priced فقط]
  ├── original_perfume_details.product_id  [عطور أصلية فقط]
  ├── invoice_items.product_id
  ├── purchase_items.product_id
  ├── purchase_return_items.product_id
  └── waste_items.product_id

payment_methods
  ├── payments.payment_method_id
  ├── settlements.payment_method_id
  ├── supplier_payments.payment_method_id
  └── supplier_settlements.payment_method_id

invoices (رأس الفاتورة)
  ├── invoice_items.invoice_id   [CASCADE]
  ├── payments.invoice_id        [NULL ON DELETE]
  └── settlements.invoice_id     [NULL ON DELETE]

suppliers
  ├── purchases.supplier_id
  ├── supplier_payments.supplier_id
  └── supplier_settlements.supplier_id

purchases (رأس فاتورة الشراء)
  ├── purchase_items.purchase_id       [CASCADE]
  ├── supplier_payments.purchase_id    [NULL ON DELETE]
  └── supplier_settlements.purchase_id [NULL ON DELETE]

purchase_returns (رأس سجل المرتجع)
  ├── purchase_return_items.purchase_return_id  [CASCADE]
  └── supplier_settlements.id  [NULL ON DELETE]

waste_logs (رأس سجل التالف)
  └── waste_items.waste_log_id  [CASCADE]
```

---

## التناسق الكامل بين العملاء والموردين

```
العملاء (Customers)          ←→  الموردين (Suppliers)
├── invoices                  ←→  purchases
├── payments                  ←→  supplier_payments
├── settlements               ←→  supplier_settlements
├── /payments                 ←→  /supplier-payments
├── /settlements              ←→  /supplier-settlements
└── معادلة الدين              ←→  معادلة الدين
```

---

## قواعد العمل الكاملة

### قواعد المنتجات
```
1.  selling_type = 'tier_based'  → price_tier_id مطلوب
2.  selling_type = 'unit_priced' → price_tier_id = NULL
3.  selling_type = 'unit_priced' → يجب وجود سجل في product_prices
4.  original_perfume_details     → يوجد فقط للعطور الأصلية
5.  full_bottle_regular/vip      → NULL للبخور والوشق والتشغيلية
6.  is_operational = true        → لا يظهر في POS
```

### قواعد البيع
```
7.  لا يمكن البيع إذا stock < الكمية المطلوبة
8.  unit_price يُسجَّل وقت البيع ولا يتغير (snapshot)
9.  خصم المخزون يحدث فور إضافة السطر للفاتورة
10. sale_type = 'tier_decant'  → selling_type يجب أن يكون 'tier_based'
11. sale_type = 'unit_decant' أو 'full_bottle' → selling_type يجب 'unit_priced'
12. sale_type = 'full_bottle'  → size_id = NULL
13. sale_type = 'unit_based'   → size_id = NULL
```

### قواعد الفواتير
```
14. invoices.total = SUM(invoice_items.line_total)
15. paid_amount = SUM(payments.amount WHERE invoice_id = this.id)
16. due_amount = total - paid_amount
17. لا يمكن أن يتجاوز paid_amount قيمة total
18. حذف invoice → يحذف invoice_items تلقائياً (CASCADE)
19. حذف invoice → payments.invoice_id يصبح NULL (تبقى كسجل مالي)
```

### قواعد الزبون النقدي
```
20. الزبون النقدي (id=1) → يجب الدفع الكامل فوراً عند إنشاء الفاتورة
21. الزبون النقدي → total_debt يبقى دائماً = 0
22. الزبون النقدي → لا يظهر في صفحة المدفوعات/التسويات المستقلة
```

### قواعد الديون
```
23. total_debt للعميل = SUM(invoices.total) - SUM(payments.amount) + SUM(settlements.amount)
24. total_debt للمورد = SUM(purchases.total) - SUM(supplier_payments.amount) + SUM(supplier_settlements.amount)
25. الدين السالب → الطرف الآخر مدين (يظهر بلون مختلف في الواجهة)
26. المدفوعات المستقلة (invoice_id=NULL) → تُخفّض الدين الكلي فقط
27. التسويات المستقلة (invoice_id=NULL) → تزيد الدين الكلي
```

### قواعد المشتريات
```
28. products.stock += quantity عند إضافة كل سطر شراء
29. unit_cost يُسجَّل وقت الشراء ولا يتغير (snapshot)
30. حذف purchase → يحذف purchase_items تلقائياً (CASCADE)
31. حذف purchase → supplier_payments.purchase_id يصبح NULL
```

### قواعد مرتجعات الموردين
```
32. products.stock -= quantity فور إضافة أي سطر مرتجع
33. لا يمكن إرجاع أكثر من المخزون المتاح
34. حذف سطر مرتجع → stock += quantity (إعادة المخزون)
35. حذف سجل المرتجع → يُعاد مخزون كل الأسطر قبل الحذف (CASCADE)
36. مورد نقدي → تسوية تلقائية دائماً بقيمة المرتجع
37. مورد مسجّل + total_debt بعد الإرجاع > 0 → لا تسوية، المرتجع يُخفّض الدين
38. مورد مسجّل + total_debt بعد الإرجاع <= 0 → يظهر خيار إنشاء تسوية
```


### قواعد مرتجعات العملاء
```
39. products.stock += quantity فور إضافة أي سطر مرتجع من عميل
40. حذف سطر مرتجع → stock -= quantity
41. حذف سجل المرتجع → يُعاد خصم مخزون كل الأسطر (CASCADE)
42. زبون نقدي → تسوية تلقائية دائماً بقيمة المرتجع
43. زبون مسجّل + total_debt بعد الإرجاع > 0 → لا تسوية، المرتجع يُخفّض الدين
44. زبون مسجّل + total_debt بعد الإرجاع <= 0 → يظهر خيار إنشاء تسوية
```
### قواعد التالف
```
39. stock -= quantity فور إضافة أي سطر تالف
40. لا يمكن تسجيل تالف أكثر من المخزون المتاح
41. حذف سطر تالف → stock += quantity (إعادة المخزون)
42. حذف سجل التالف → يُعاد مخزون كل الأسطر ثم يحذف (CASCADE)
```

---

## قواعد التحديث التلقائي (Observers)

### المبدأ

جميع الحقول المُعلَّمة بـ **(cached)** لا تُحدَّث يدوياً في كل مكان.
بدلاً من ذلك تُحدَّث عبر **Observers** مركزية تُستدعى تلقائياً عند أي تغيير.
الهدف: ضمان دقة البيانات وتجنب تكرار الكود.

---

### جدول `invoices` — الحقول المؤقتة

| الحقل | يُحدَّث عند | المصدر |
|-------|------------|--------|
| total | إضافة/حذف/تعديل invoice_item | SUM(invoice_items.line_total) |
| paid_amount | إضافة/حذف payment مرتبط بالفاتورة | SUM(payments.amount WHERE invoice_id) |
| due_amount | أي تغيير في total أو paid_amount | total - paid_amount |
| payment_status | أي تغيير في paid_amount | unpaid / partial / paid |

**Observer:** `InvoiceObserver` أو يُستدعى من `InvoiceItemObserver` و `PaymentObserver`

---

### جدول `purchases` — الحقول المؤقتة

| الحقل | يُحدَّث عند | المصدر |
|-------|------------|--------|
| total | إضافة/حذف/تعديل purchase_item | SUM(purchase_items.line_total) |
| paid_amount | إضافة/حذف supplier_payment مرتبط | SUM(supplier_payments.amount WHERE purchase_id) |
| due_amount | أي تغيير في total أو paid_amount | total - paid_amount |
| payment_status | أي تغيير في paid_amount | unpaid / partial / paid |

**Observer:** `PurchaseObserver` أو يُستدعى من `PurchaseItemObserver` و `SupplierPaymentObserver`

---

### جدول `customers` — الحقول المؤقتة

| الحقل | يُحدَّث عند | المصدر |
|-------|------------|--------|
| total_purchases | إضافة/حذف invoice | SUM(invoices.total) |
| total_paid | إضافة/حذف payment | SUM(payments.amount) |
| total_returns | إضافة/حذف invoice_return | SUM(invoice_returns.total) |
| total_settlements | إضافة/حذف settlement | SUM(settlements.amount) |
| total_debt | أي تغيير في الحقول أعلاه | total_purchases - total_paid + total_settlements - total_returns |

**Observer:** `CustomerBalanceObserver` — يُستدعى من:
```
InvoiceObserver        → عند إنشاء/حذف فاتورة
PaymentObserver        → عند إنشاء/حذف دفعة
SettlementObserver     → عند إنشاء/حذف تسوية
InvoiceReturnObserver  → عند إنشاء/حذف مرتجع
```

**قاعدة الزبون النقدي:**
```
customer_id = 1 → لا يُحدَّث أي حقل مالي
```

---

### جدول `suppliers` — الحقول المؤقتة

| الحقل | يُحدَّث عند | المصدر |
|-------|------------|--------|
| total_purchases | إضافة/حذف purchase | SUM(purchases.total) |
| total_paid | إضافة/حذف supplier_payment | SUM(supplier_payments.amount) |
| total_returns | إضافة/حذف purchase_return | SUM(purchase_returns.total) |
| total_settlements | إضافة/حذف supplier_settlement | SUM(supplier_settlements.amount) |
| total_debt | أي تغيير في الحقول أعلاه | total_purchases - total_paid + total_settlements - total_returns |

**Observer:** `SupplierBalanceObserver` — يُستدعى من:
```
PurchaseObserver          → عند إنشاء/حذف فاتورة شراء
SupplierPaymentObserver   → عند إنشاء/حذف دفعة
SupplierSettlementObserver → عند إنشاء/حذف تسوية
PurchaseReturnObserver    → عند إنشاء/حذف مرتجع
```

**قاعدة المورد النقدي:**
```
supplier_id = 1 → لا يُحدَّث أي حقل مالي
```

---

### ملاحظات مهمة

```
1. لا تُحدَّث الحقول المؤقتة مباشرة من Controller أو Repository
2. كل تغيير يمر عبر Observer المعني
3. عند حذف فاتورة → invoice_id في payments يصبح NULL
   لكن total_debt للعميل يُعاد حسابه بشكل صحيح
4. الدين السالب مسموح — يعني الطرف الآخر مدين
5. Observer لا يعمل على id=1 (نقدي) في كلا الجدولين
```

---

## ترتيب إنشاء الجداول (حسب التبعيات)

```
1.  users
2.  password_reset_tokens
3.  sessions
4.  categories
5.  price_tiers
6.  sizes
7.  payment_methods
8.  customers
9.  suppliers
10. products              ← يعتمد على categories + price_tiers
11. tier_prices           ← يعتمد على price_tiers + sizes
12. product_prices        ← يعتمد على products
13. original_perfume_details ← يعتمد على products
14. invoices              ← يعتمد على users + customers
15. invoice_items         ← يعتمد على invoices + products + sizes
16. payments              ← يعتمد على customers + invoices + payment_methods
17. settlements           ← يعتمد على customers + invoices + payment_methods
18. invoice_returns       ← يعتمد على customers + invoices + settlements
19. invoice_return_items  ← يعتمد على invoice_returns + products
20. purchases             ← يعتمد على suppliers
21. purchase_items        ← يعتمد على purchases + products
22. supplier_payments     ← يعتمد على suppliers + purchases + payment_methods
23. supplier_settlements  ← يعتمد على suppliers + purchases + payment_methods
24. purchase_returns      ← يعتمد على suppliers + purchases + supplier_settlements
25. purchase_return_items ← يعتمد على purchase_returns + products
26. waste_logs            ← يعتمد على users
27. waste_items           ← يعتمد على waste_logs + products
```
