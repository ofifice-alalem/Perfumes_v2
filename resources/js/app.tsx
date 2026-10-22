import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';

// اعتراض انتهاء صلاحية الجلسة أو الرمز الأمني (HTTP 419 / 401)
// وإجراء إعادة تحميل كاملة للمتصفح لتجديد الرموز الأمنية وملفات تعريف الارتباط
router.on('invalid', (event) => {
  const status = event.detail.response?.status;
  if (status === 419 || status === 401) {
    event.preventDefault();
    window.location.href = '/login';
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
