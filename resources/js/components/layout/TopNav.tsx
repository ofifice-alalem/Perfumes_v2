import { Search, Bell, Moon, Sun } from 'lucide-react';

interface TopNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  pageTitle?: string;
}

export function TopNav({ isDark, onToggleTheme, pageTitle }: TopNavProps) {
  return (
    <header className="flex justify-between items-center mb-6 lg:mb-10 shrink-0">
      <div className="hidden sm:block">
        {pageTitle && (
          <p className="text-sm font-bold text-slate-400 dark:text-white/40 tracking-widest uppercase">
            {pageTitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-between sm:justify-end">
        <div className="relative hidden md:block">
          <input type="text" placeholder="البحث..." className="spatial-input w-44 lg:w-56 h-11 rounded-full px-5 pl-11 text-sm" />
          <Search className="w-4 h-4 text-slate-400 dark:text-white/50 absolute left-4 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={onToggleTheme} className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-primary flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95">
            {isDark ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
          </button>

          <div className="relative">
            <button className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white transition-colors">
              <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1a1a24]" />
          </div>

          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full border-2 border-primary/20 overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-black text-sm">م</span>
          </div>
        </div>
      </div>
    </header>
  );
}
