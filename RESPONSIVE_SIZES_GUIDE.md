# دليل المقاسات السريع - صفحة POS المتجاوبة

## الأحجام القياسية

### الأزرار
```tsx
// أزرار صغيرة (إجراءات ثانوية)
h-7 sm:h-8          // 28px → 32px

// أزرار متوسطة (إجراءات عادية)
h-9 sm:h-11         // 36px → 44px
h-11 sm:h-12        // 44px → 48px

// أزرار كبيرة (إجراءات رئيسية)
h-12 sm:h-14        // 48px → 56px
h-14 sm:h-16        // 56px → 64px

// أزرار الإرسال
h-14 sm:h-[68px]    // 56px → 68px
```

### الأيقونات
```tsx
// صغيرة
w-3 h-3 sm:w-3.5 sm:h-3.5      // 12px → 14px

// متوسطة
w-3.5 h-3.5 sm:w-4 sm:h-4      // 14px → 16px
w-4 h-4 sm:w-5 sm:h-5          // 16px → 20px

// كبيرة
w-5 h-5 sm:w-6 sm:h-6          // 20px → 24px
w-6 h-6 sm:w-7 sm:h-7          // 24px → 28px
```

### النصوص
```tsx
// صغير جداً (تسميات)
text-[10px] sm:text-xs         // 10px → 12px

// صغير (نصوص ثانوية)
text-xs sm:text-sm             // 12px → 14px

// متوسط (نصوص عادية)
text-sm sm:text-base           // 14px → 16px
text-sm sm:text-[15px]         // 14px → 15px

// كبير (عناوين)
text-base sm:text-lg           // 16px → 18px
text-base sm:text-[18px]       // 16px → 18px

// كبير جداً (أرقام مهمة)
text-lg sm:text-xl             // 18px → 20px
```

### المسافات (Padding)
```tsx
// صغيرة
px-2 sm:px-3                   // 8px → 12px
py-2 sm:py-2.5                 // 8px → 10px

// متوسطة
px-3 sm:px-4                   // 12px → 16px
py-2.5 sm:py-3                 // 10px → 12px

// كبيرة
px-3 sm:px-5                   // 12px → 20px
py-3 sm:py-4                   // 12px → 16px
```

### الفجوات (Gap)
```tsx
gap-1.5 sm:gap-2               // 6px → 8px
gap-2 sm:gap-3                 // 8px → 12px
gap-2.5 sm:gap-3               // 10px → 12px
```

### الحواف المستديرة
```tsx
// صغيرة
rounded-[8px] sm:rounded-[10px]

// متوسطة
rounded-[12px] sm:rounded-[14px]
rounded-[14px] sm:rounded-[16px]

// كبيرة
rounded-[16px] sm:rounded-[18px]
rounded-[16px] sm:rounded-[20px]
```

---

## أنماط الحاويات

### البطاقات
```tsx
className="
  p-3 sm:p-4
  rounded-[14px] sm:rounded-[16px]
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700
  shadow-sm
"
```

### الحقول (Inputs)
```tsx
className="
  spatial-input
  h-12 sm:h-14
  rounded-[16px] sm:rounded-[20px]
  px-3 sm:px-4
  text-sm sm:text-base
"
```

### الأزرار الرئيسية
```tsx
className="
  spatial-button
  h-12 sm:h-14
  rounded-[14px] sm:rounded-[16px]
  px-6 sm:px-8
  text-base sm:text-lg
  font-black
  active:scale-95
  transition-transform
"
```

---

## التخطيطات الشائعة

### صف → عمود
```tsx
<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
  {/* المحتوى */}
</div>
```

### عرض كامل → عرض محدد
```tsx
<div className="w-full sm:w-auto">
  {/* المحتوى */}
</div>
```

### إخفاء/إظهار
```tsx
{/* إظهار على الموبايل فقط */}
<div className="lg:hidden">...</div>

{/* إظهار على Desktop فقط */}
<div className="hidden lg:block">...</div>

{/* نص مختلف حسب الحجم */}
<span className="hidden sm:inline">نص طويل</span>
<span className="sm:hidden">قصير</span>
```

### Grid متجاوب
```tsx
{/* عمودين على الموبايل، مرن على Desktop */}
<div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
  {/* العناصر */}
</div>
```

---

## نصائح سريعة

### 1. مساحات اللمس
- الحد الأدنى: `44x44px` (معيار Apple)
- المثالي: `48x48px` أو أكبر
- استخدم `p-3` على الأقل للأزرار

### 2. النصوص
- الحد الأدنى للقراءة: `12px`
- المثالي للنصوص الأساسية: `14px-16px`
- للعناوين: `18px+`

### 3. المسافات
- بين العناصر القابلة للنقر: `8px` على الأقل
- بين الأقسام: `12px-16px`
- داخل الحاويات: `12px-16px`

### 4. التأثيرات
```tsx
// للمس
active:scale-95

// للحركة
transition-all duration-200

// للتحويل
transition-transform
```

---

## Breakpoints

```
Mobile:  0px - 639px    (default)
Tablet:  640px - 1023px (sm:)
Desktop: 1024px+        (lg:)
```

---

## أمثلة عملية

### زر متجاوب كامل
```tsx
<button className="
  w-full sm:w-auto
  h-12 sm:h-14
  px-6 sm:px-8
  rounded-[14px] sm:rounded-[16px]
  bg-primary hover:bg-blue-500
  text-white
  text-base sm:text-lg
  font-bold
  active:scale-95
  transition-all
">
  نص الزر
</button>
```

### بطاقة متجاوبة كاملة
```tsx
<div className="
  flex flex-col sm:flex-row
  gap-2 sm:gap-3
  p-3 sm:p-4
  rounded-[14px] sm:rounded-[16px]
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700
  shadow-sm
  hover:border-primary/30
  transition-all
">
  {/* المحتوى */}
</div>
```

### حقل إدخال متجاوب
```tsx
<input className="
  spatial-input
  w-full
  h-12 sm:h-14
  rounded-[16px] sm:rounded-[20px]
  px-3 sm:px-4
  text-sm sm:text-base
  font-bold
" />
```

---

## الخلاصة

- استخدم `sm:` للتابلت والأكبر
- استخدم `lg:` للديسكتوب فقط
- ابدأ بالموبايل أولاً (Mobile First)
- اختبر على `375px` و `768px` و `1024px`
