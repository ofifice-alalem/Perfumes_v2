import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  const page = usePage();
  const [isDark, setIsDark] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

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
    <div className="h-[100dvh] w-screen flex items-center justify-center p-0 lg:p-6 transition-colors duration-500 overflow-hidden bg-slate-100 dark:bg-slate-950 lg:bg-transparent">
      <div className="spatial-window w-full h-full flex relative overflow-hidden rounded-none lg:rounded-[40px]">

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998] lg:hidden animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <AppSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((prev) => !prev)} />

        <div className="flex-1 flex flex-col p-4 pb-12 md:p-8 md:pb-16 lg:p-10 lg:pb-16 overflow-y-auto min-w-0 h-full relative custom-scroll">

          <div className="lg:hidden flex items-center mb-6">
            <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
            <img
              src="/images/uzba80.png"
              alt="طيب التاجوري"
              className="mr-4 h-8 w-auto object-contain drop-shadow-sm"
            />
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
