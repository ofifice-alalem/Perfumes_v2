import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Plus, LogOut, X, Check, Wallet } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';

interface TopNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  pageTitle?: string;
}

export function TopNav({ isDark, onToggleTheme, pageTitle }: TopNavProps) {
  const { auth, globalPaymentMethods = [] } = usePage().props as any;
  const userName = auth?.user?.name || 'مستخدم';
  const initial = userName.charAt(0);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [defaultPaymentId, setDefaultPaymentId] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('defaultPaymentMethodId');
    if (saved && globalPaymentMethods.find((m: any) => String(m.id) === saved)) {
      setDefaultPaymentId(saved);
    } else if (globalPaymentMethods.length > 0) {
      setDefaultPaymentId(String(globalPaymentMethods[0].id));
    }
  }, [globalPaymentMethods]);

  useEffect(() => {
    if (defaultPaymentId) {
      localStorage.setItem('defaultPaymentMethodId', defaultPaymentId);
      // Dispatch a custom event so other components can know about the change
      window.dispatchEvent(new Event('defaultPaymentMethodChanged'));
    }
  }, [defaultPaymentId]);

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

  const selectedPaymentName = globalPaymentMethods.find((m: any) => String(m.id) === defaultPaymentId)?.name || 'بطاقة';

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
        
        {/* Default Payment Selector Button */}
        <button 
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2.5 h-12 lg:h-14 px-5 sm:px-6 rounded-[18px] sm:rounded-[22px] border-2 border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-white hover:border-primary/60 transition-all font-black text-sm lg:text-base shrink-0 shadow-md active:scale-95 cursor-pointer"
            title="طريقة الدفع الافتراضية"
        >
          <Wallet className="w-5 h-5 text-primary shrink-0" />
          <span className="text-slate-500 dark:text-white/60 font-bold hidden sm:inline">الدفع الافتراضي:</span>
          <span className="font-black text-primary dark:text-primary-light">{selectedPaymentName}</span>
        </button>

        {/* Payment Selection Modal */}
        {showPaymentModal && (
          <div 
            onClick={() => setShowPaymentModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn cursor-pointer"
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-[#181824]/95 backdrop-blur-2xl rounded-[32px] border-2 border-black/10 dark:border-white/10 p-6 sm:p-8 w-full max-w-xl shadow-2xl flex flex-col gap-6 cursor-default"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-[22px] bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                    <Wallet className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">طريقة الدفع الافتراضية</h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-400 dark:text-white/40">اختر طريقة الدفع التي ترغب بتطبيقها تلقائياً</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-white/60 transition-all cursor-pointer active:scale-95"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {globalPaymentMethods.map((m: any) => {
                  const isSelected = defaultPaymentId === String(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setDefaultPaymentId(String(m.id));
                        setShowPaymentModal(false);
                      }}
                      className={`flex items-center justify-between h-20 sm:h-24 px-6 rounded-[24px] border-2 font-black text-lg sm:text-xl transition-all cursor-pointer active:scale-95 shadow-md ${
                        isSelected
                          ? 'border-primary bg-primary text-white shadow-xl shadow-primary/30 ring-4 ring-primary/20'
                          : 'border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/5 text-slate-800 dark:text-white hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      {isSelected ? (
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Check className="w-6 h-6 text-white stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full border-2 border-black/10 dark:border-white/20 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <Link
          href="/invoices/create"
          className="flex items-center gap-2 h-12 lg:h-14 px-5 sm:px-6 rounded-[18px] sm:rounded-[22px] bg-primary text-white hover:bg-primary/90 transition-all font-black text-sm lg:text-base shrink-0 shadow-lg shadow-primary/25 active:scale-95"
        >
          <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="hidden sm:inline">فاتورة جديدة</span>
        </Link>

        <div className="flex items-center gap-3">
          <button onClick={onToggleTheme} className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0">
            {isDark ? <Sun className="w-5 h-5 lg:w-6 lg:h-6 text-amber-400" /> : <Moon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-full border-2 border-primary/20 overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <span className="text-primary font-black text-base lg:text-lg">{initial}</span>
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
