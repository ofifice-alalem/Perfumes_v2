import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Plus, LogOut } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';

interface TopNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  pageTitle?: string;
}

export function TopNav({ isDark, onToggleTheme, pageTitle }: TopNavProps) {
  const { auth } = usePage().props as any;
  const userName = auth?.user?.name || 'مستخدم';
  const initial = userName.charAt(0);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        
        {/* Quick Actions */}
        <Link
          href="/invoices/create"
          className="flex items-center gap-2 h-10 lg:h-11 px-4 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm shrink-0"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="hidden sm:inline">فاتورة جديدة</span>
        </Link>

        <div className="flex items-center gap-3">
          <button onClick={onToggleTheme} className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-primary flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shrink-0">
            {isDark ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-10 h-10 lg:w-11 lg:h-11 rounded-full border-2 border-primary/20 overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <span className="text-primary font-black text-sm">{initial}</span>
            </button>
            
            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a24] rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden z-50">
                <div className="p-3 border-b border-slate-100 dark:border-white/5">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{userName}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors text-right"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
