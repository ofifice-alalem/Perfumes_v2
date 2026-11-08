import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';

// اعتراض الأخطاء الشبكية، وتضارب الأصول (Asset Version Mismatch)،
// وانتهاء صلاحية الجلسة أو الرمز الأمني (HTTP 419 / 401 / 500)
// وإجراء إعادة تحميل كاملة وذكية للمتصفح لتجديد الرموز وكاش المكونات تلقائياً
router.on('invalid', (event) => {
  const status = event.detail.response?.status;
  if (status === 419 || status === 401) {
    event.preventDefault();
    window.location.href = '/login';
    return;
  }

  // في حال حدوث خطأ 500 مفاجئ أو تضارب في جلب مكونات الصفحات،
  // يتم عمل Hard Reload تلقائي لإنعاش الشاشة دون إظهار شاشة الخطأ للمستخدم
  if (status === 500 || status === 404) {
    const isNavigation = event.detail.response?.headers?.['x-inertia'];
    if (isNavigation) {
      event.preventDefault();
      window.location.reload();
    }
  }
});

// معالجة خطأ تضارب النسخ (Version Mismatch) لإجبار المتصفح على تحميل الأصول الجديدة فوراً
router.on('exception', (event) => {
  // إذا كان الخطأ بسبب عدم العثور على ملفات JS/CSS قديمة بعد تحديث المنظومة
  const msg = String(event.detail?.error || '');
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk')) {
    event.preventDefault();
    window.location.reload();
  }
});

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true });
    return pages[`./pages/${name}.tsx`];
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  progress: {
    delay: 250,
    color: '#3b82f6',
    includeCSS: true,
    showSpinner: false,
  },
});
