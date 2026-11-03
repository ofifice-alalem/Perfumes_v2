import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

function hexToHsl(hex: string): string | null {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  const num = parseInt(hex, 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  const page = usePage();
  const [isDark, setIsDark] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  // تطبيق متغيرات الألوان المخصصة من قاعدة البيانات مباشرة
  const themeColors = (page.props as any)?.storeBranding?.theme_colors;
  useEffect(() => {
    if (themeColors) {
      const root = document.documentElement;
      if (themeColors.primary) {
        root.style.setProperty('--brand-primary', themeColors.primary);
        const hsl = hexToHsl(themeColors.primary);
        if (hsl) root.style.setProperty('--primary', hsl);
      }
      if (themeColors.btn_primary) {
        root.style.setProperty('--btn-primary', themeColors.btn_primary);
      }
      if (themeColors.btn_secondary) {
        root.style.setProperty('--btn-secondary', themeColors.btn_secondary);
      }
      if (themeColors.accent) {
        root.style.setProperty('--brand-accent', themeColors.accent);
      }
    }
  }, [themeColors]);

  useEffect(() => {
    return router.on('navigate', () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = saved === 'dark' || (!saved && prefersDark);
    applyTheme(useDark);
    setIsDark(useDark);

    // تطبيق نسبة تبعيد وتكبير الشاشة المحفوظة (مثل 67%)
    const savedZoom = localStorage.getItem('app_zoom_factor');
    if (savedZoom) {
      const zoomVal = Number(savedZoom);
      if (!isNaN(zoomVal) && zoomVal >= 50 && zoomVal <= 150) {
        if ((window as any).electronAPI?.setZoomFactor) {
          (window as any).electronAPI.setZoomFactor(zoomVal / 100);
          document.body.style.zoom = '';
        } else {
          (document.documentElement.style as any).zoom = `${zoomVal}%`;
        }
      }
    }
  }, []);

  // Keep-alive heartbeat to prevent php artisan serve and DB from sleeping
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/up').catch(() => { });
    }, 4 * 60 * 1000); // Every 4 minutes

    return () => clearInterval(interval);
  }, []);

  function applyTheme(dark: boolean) {
    const body = document.body;
    if (dark) {
      document.documentElement.classList.add('dark');
      body.classList.add('body-bg-dark');
      body.classList.remove('body-bg-light');
    } else {
      document.documentElement.classList.remove('dark');
      body.classList.add('body-bg-light');
      body.classList.remove('body-bg-dark');
    }
  }

  const toggleTheme = () => {
    const next = !isDark;
    applyTheme(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col overflow-hidden font-['Tajawal'] select-none bg-slate-100/80 dark:bg-[#0a121e] text-slate-800 dark:text-white transition-colors duration-200" dir="rtl">
      <div className="w-full h-full flex relative overflow-hidden bg-transparent">

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <AppSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((prev) => !prev)} />

        <div className="flex-1 flex flex-col p-3 md:p-5 lg:p-6 overflow-y-auto min-w-0 h-full relative custom-scroll">

          <div className="lg:hidden flex items-center mb-4 p-2 rounded-[3px] bg-white dark:bg-[#171d25] border border-slate-300 dark:border-[#2a3848]">
            <button onClick={() => setIsSidebarOpen(true)} className="w-8 h-8 rounded-[3px] bg-[#1a9fff] hover:bg-[#0088eb] text-white flex items-center justify-center shrink-0 cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
            <span className="mr-3 font-black text-slate-800 dark:text-white text-sm">
              {(page.props as any)?.storeBranding?.name || 'منظومة السحابة'}
            </span>
          </div>

          <TopNav isDark={isDark} onToggleTheme={toggleTheme} pageTitle={pageTitle} />

          <div key={page.url} className="app-page-transition flex-1 flex flex-col min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
