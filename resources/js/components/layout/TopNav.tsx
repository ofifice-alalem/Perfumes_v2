import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Plus, LogOut, X, Check, Wallet, Search, Sparkles, ChevronDown, User, ShieldCheck } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';

interface TopNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  pageTitle?: string;
}

export function TopNav({ isDark, onToggleTheme, pageTitle }: TopNavProps) {
  const { auth, globalPaymentMethods = [] } = usePage().props as any;
  const userName = auth?.user?.name || 'مستخدم';
  const userRole = (auth?.user?.roles?.[0] as string) || '';
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

  const selectedPaymentName = globalPaymentMethods.find((m: any) => String(m.id) === defaultPaymentId)?.name || 'نقدي';

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 mb-6 lg:mb-8 py-3 px-4 sm:px-6 rounded-[24px] bg-white/80 dark:bg-[#121c26]/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-sm transition-all duration-300">
      
      {/* Left Area: Page Title & Breadcrumb Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#caa13a] dark:bg-[#ecd068] animate-pulse shadow-[0_0_8px_rgba(202,161,58,0.8)]" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {pageTitle || 'لوحة التحكم'}
            </h1>
          </div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-white/40 truncate hidden sm:block">
            طيب التاجوري · نظام إدارة العطور والمبيعات
          </span>
        </div>
      </div>

      {/* Right Area: Tools, Payment Selector, Actions, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">

        {/* Default Payment Selector Pill */}
        <button
          type="button"
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 h-11 sm:h-12 px-3.5 sm:px-4 rounded-[16px] sm:rounded-[18px] border-2 border-[#caa13a]/30 dark:border-[#ecd068]/30 bg-[#caa13a]/10 dark:bg-[#ecd068]/10 hover:bg-[#caa13a]/20 text-slate-800 dark:text-white transition-all font-black text-xs sm:text-sm shrink-0 shadow-sm active:scale-95 cursor-pointer"
          title="طريقة الدفع الافتراضية للفواتير"
        >
          <Wallet className="w-4 h-4 text-[#caa13a] dark:text-[#ecd068] shrink-0" />
          <span className="text-slate-500 dark:text-white/60 font-bold hidden md:inline">الدفع الافتراضي:</span>
          <span className="font-black text-[#caa13a] dark:text-[#ecd068] truncate max-w-[100px]">{selectedPaymentName}</span>
        </button>

        {/* Quick Action: New Invoice with Signature Gold Gradient */}
        <Link
          href="/invoices/create"
          className="spatial-button h-11 sm:h-12 px-4 sm:px-5 rounded-[16px] sm:rounded-[18px] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5 text-slate-950" />
          <span className="hidden sm:inline">فاتورة بيع</span>
        </Link>

        {/* Theme Toggle (Moon / Sun) */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-[#caa13a]/15 border border-black/5 dark:border-white/10 text-slate-600 dark:text-white/70 hover:text-[#caa13a] dark:hover:text-[#ecd068] flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-[#ecd068] hover:rotate-90 transition-transform duration-300" />
          ) : (
            <Moon className="w-5 h-5 text-[#caa13a] hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        {/* User Profile Capsule with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 h-11 sm:h-12 pl-2 pr-1 rounded-[16px] sm:rounded-[18px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#f7d984] to-[#caa13a] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-sm shrink-0">
              {initial}
            </div>
            <div className="hidden lg:flex flex-col text-right min-w-0 pr-1">
              <span className="font-black text-xs text-slate-900 dark:text-white truncate max-w-[110px]">
                {userName}
              </span>
              <span className="text-[10px] font-bold text-[#caa13a] dark:text-[#ecd068] truncate">
                {userRole === 'super-admin' ? 'مدير عام' : userRole === 'admin' ? 'مدير' : 'بائع'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] w-56 rounded-[22px] p-2 bg-white/95 dark:bg-[#141d26]/95 backdrop-blur-2xl border-2 border-black/10 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-black/5 dark:border-white/10 mb-1">
                <span className="block font-black text-sm text-slate-900 dark:text-white truncate">
                  {userName}
                </span>
                <span className="block text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  طيب التاجوري · متجر العطور
                </span>
              </div>

              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 p-2.5 rounded-[14px] text-xs font-bold text-slate-700 dark:text-white/80 hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>إعدادات النظام</span>
              </Link>

              <Link
                href="/reports"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 p-2.5 rounded-[14px] text-xs font-bold text-slate-700 dark:text-white/80 hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>تقارير النشاط</span>
              </Link>

              <div className="h-px bg-black/5 dark:border-white/10 my-1" />

              <Link
                href="/logout"
                method="post"
                as="button"
                className="flex items-center gap-2.5 w-full p-2.5 rounded-[14px] text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div
          onClick={() => setShowPaymentModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-[#141d26]/95 backdrop-blur-2xl rounded-[32px] border-2 border-amber-500/30 p-6 sm:p-8 w-full max-w-xl shadow-2xl flex flex-col gap-6 cursor-default"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-[20px] bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm">
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    طريقة الدفع الافتراضية
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-white/50">
                    اختر وسيلة الدفع التي تُحدد تلقائياً عند فتح فاتورة جديدة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-11 h-11 rounded-full bg-black/5 dark:bg-white/10 hover:bg-rose-500 hover:text-white flex items-center justify-center text-slate-500 dark:text-white/60 transition-all cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {globalPaymentMethods.map((m: any) => {
                const isSelected = defaultPaymentId === String(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      setDefaultPaymentId(String(m.id));
                      setShowPaymentModal(false);
                    }}
                    className={`flex items-center justify-between h-20 px-5 rounded-[20px] border-2 font-black text-base sm:text-lg transition-all cursor-pointer active:scale-95 shadow-sm ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/30'
                        : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-slate-800 dark:text-white hover:border-amber-500/40 hover:bg-amber-500/5'
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    {isSelected ? (
                      <div className="w-8 h-8 rounded-full bg-slate-950/20 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 text-slate-950 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-black/20 dark:border-white/20 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
