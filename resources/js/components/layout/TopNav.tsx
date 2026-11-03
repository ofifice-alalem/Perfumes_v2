import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Plus, LogOut, X, Check, Wallet, ChevronDown, CreditCard, Building2, DollarSign, Info } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { ZoomControl } from '@/components/ui/ZoomControl';

interface TopNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  pageTitle?: string;
}

function getPaymentMethodMeta(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('نقد') || lower.includes('كاش') || lower.includes('cash')) {
    return {
      icon: <Wallet className="w-5 h-5 text-emerald-500" />,
      bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
      tag: 'سداد فوري',
      desc: 'الدفع المباشر نقداً داخل درج الكاشير',
    };
  }
  if (lower.includes('بطاق') || lower.includes('card') || lower.includes('فيزا') || lower.includes('مدى') || lower.includes('pos')) {
    return {
      icon: <CreditCard className="w-5 h-5 text-sky-500" />,
      bg: 'bg-sky-500/10 text-sky-500 border-sky-500/25',
      tag: 'إلكتروني',
      desc: 'السداد عبر أجهزة نقاط البيع POS والبطاقات',
    };
  }
  if (lower.includes('تحويل') || lower.includes('بنك') || lower.includes('حوالة') || lower.includes('bank')) {
    return {
      icon: <Building2 className="w-5 h-5 text-purple-500" />,
      bg: 'bg-purple-500/10 text-purple-500 border-purple-500/25',
      tag: 'مصرفي',
      desc: 'إيداع أو حوالة مباشرة إلى الحساب البنكي',
    };
  }
  return {
    icon: <DollarSign className="w-5 h-5 text-[#1a9fff]" />,
    bg: 'bg-[#1a9fff]/10 text-[#1a9fff] border-[#1a9fff]/25',
    tag: 'معتمد',
    desc: 'وسيلة دفع معتمدة ومسجلة في النظام',
  };
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
    const syncDefault = () => {
      const saved = localStorage.getItem('defaultPaymentMethodId');
      if (saved && globalPaymentMethods.find((m: any) => String(m.id) === saved)) {
        setDefaultPaymentId(saved);
      } else if (globalPaymentMethods.length > 0) {
        setDefaultPaymentId(String(globalPaymentMethods[0].id));
      } else {
        setDefaultPaymentId('');
      }
    };

    syncDefault();

    window.addEventListener('defaultPaymentMethodChanged', syncDefault);
    return () => window.removeEventListener('defaultPaymentMethodChanged', syncDefault);
  }, [globalPaymentMethods]);

  useEffect(() => {
    if (defaultPaymentId) {
      localStorage.setItem('defaultPaymentMethodId', defaultPaymentId);
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

  const selectedPaymentName = globalPaymentMethods.find((m: any) => String(m.id) === defaultPaymentId)?.name || 'افتراضي';

  return (
    <header className="h-12 px-3 md:px-4 rounded-[6px] bg-white dark:bg-[#0e1726] border border-slate-200/90 dark:border-[#1c2c40] flex items-center justify-between shrink-0 mb-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors z-30 select-none">
      
      {/* الطرف الأيمن: عنوان الصفحة ووسم محطة العمل المكتبي */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase bg-sky-500/10 px-2 py-0.5 rounded-[2px] border border-sky-500/30 dark:border-sky-500/25">
          محطة العمل
        </span>
        {pageTitle && (
          <h1 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white tracking-wide">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* الطرف الأيسر: أدوات التحكم المكتبي بنمط Steam المصقول */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        
        {/* زر تحديد وسيلة الدفع الافتراضية */}
        <button 
          type="button"
          onClick={() => setShowPaymentModal(true)}
          className="h-8 px-2.5 sm:px-3 rounded-[5px] border border-slate-200 dark:border-[#24374e] bg-slate-50 dark:bg-[#142032] hover:bg-slate-100 dark:hover:bg-[#1a2b42] text-slate-700 dark:text-[#c6d4df] hover:text-slate-900 dark:hover:text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          title="طريقة الدفع الافتراضية"
        >
          <Wallet className="w-3.5 h-3.5 text-brand shrink-0" />
          <span className="hidden md:inline text-slate-500 dark:text-slate-400">الدفع الافتراضي:</span>
          <span className="font-black text-brand truncate max-w-[80px] sm:max-w-[120px]">{selectedPaymentName}</span>
        </button>

        {/* نافذة اختيار وسيلة الدفع المحسنة والمنسقة */}
        {showPaymentModal && (
          <div 
            onClick={() => setShowPaymentModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#0f1928] border border-slate-200 dark:border-[#22354c] rounded-[8px] p-5 sm:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 cursor-default relative overflow-hidden"
            >
              {/* خط تزييني علوي بنمط Steam */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px]" 
                style={{ background: 'linear-gradient(to right, transparent, var(--brand-primary, #1a9fff), var(--brand-accent, var(--brand-primary, #1a9fff)), transparent)' }} 
              />

              {/* ترويسة المودال */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1d2e44]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[2px] bg-sky-500/10 dark:bg-[#152336] border border-sky-500/30 dark:border-[#253a54] flex items-center justify-center text-brand shrink-0 shadow-inner">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">طريقة الدفع الافتراضية</h3>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-[#8fa1b5]">تحديد وسيلة السداد المفضلة لتطبيقها تلقائياً</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-7 h-7 rounded-[2px] border border-slate-200 dark:border-[#2b3a4c] bg-slate-100 dark:bg-[#1e2632] hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* خيارات طرق الدفع كبطاقات متناسقة كاملة العرض */}
              <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto custom-scroll p-0.5">
                {globalPaymentMethods.map((m: any) => {
                  const isSelected = defaultPaymentId === String(m.id);
                  const meta = getPaymentMethodMeta(m.name);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setDefaultPaymentId(String(m.id));
                        setShowPaymentModal(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-[3px] border transition-all cursor-pointer group text-right ${
                        isSelected
                          ? 'border-brand bg-[var(--brand-primary,#1a9fff)]/10 shadow-sm ring-1 ring-[var(--brand-primary,#1a9fff)]/40'
                          : 'border-slate-200 dark:border-[#213042] bg-slate-50/70 dark:bg-[#0d131b] hover:border-slate-300 dark:hover:border-[#2d3e54] hover:bg-white dark:hover:bg-[#131b26]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-[3px] border flex items-center justify-center shrink-0 ${meta.bg}`}>
                          {meta.icon}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs sm:text-sm text-slate-800 dark:text-white">
                              {m.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-[#8fa1b5]">
                              {meta.tag}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-[#8fa1b5] mt-0.5">
                            {meta.desc}
                          </span>
                        </div>
                      </div>

                      {/* مؤشر الاختيار الدائري المعتمد المتوافق مع لون الهوية */}
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'border-slate-300 dark:border-[#3d4f65] group-hover:border-brand'
                        }`}
                        style={isSelected ? { backgroundColor: 'var(--brand-primary, #1a9fff)', borderColor: 'var(--brand-primary, #1a9fff)' } : undefined}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ملاحظة توجيهية خفيفة في الأسفل */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#1d2e44] flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-[#56718d] font-bold">
                <Info className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>يمكنك دائماً تغيير وسيلة الدفع أثناء إنشاء الفاتورة يدوياً.</span>
              </div>
            </div>
          </div>
        )}

        {/* زر فاتورة جديدة متوافق مع زر الإجراء الرئيسي المعرف في النظام */}
        <Link
          href="/invoices/create"
          className="btn-theme-primary h-8 px-3 rounded-[5px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 text-xs shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span className="hidden sm:inline">فاتورة جديدة</span>
        </Link>

        {/* تحكم زوم سطح المكتب بنمط Steam */}
        <ZoomControl variant="desktop" />

        {/* زر تبديل الثيم المكتبي */}
        <button 
          type="button"
          onClick={onToggleTheme} 
          className="w-8 h-8 rounded-[5px] border border-slate-200 dark:border-[#24374e] bg-slate-50 dark:bg-[#142032] hover:bg-slate-100 dark:hover:bg-[#1a2b42] text-amber-500 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
          title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
        </button>

        {/* قائمة المستخدم الشخصية */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button 
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-8 px-2 rounded-[5px] border border-slate-200 dark:border-[#24374e] bg-slate-50 dark:bg-[#142032] hover:bg-slate-100 dark:hover:bg-[#1a2b42] flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            title={userName}
          >
            <div className="w-5 h-5 rounded-[3px] bg-[var(--brand-primary,#1a9fff)]/15 text-brand font-bold text-[11px] flex items-center justify-center">
              {initial}
            </div>
            <span className="hidden md:inline text-xs font-bold text-slate-700 dark:text-[#c6d4df] max-w-[80px] truncate">
              {userName}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-[#0f1928] rounded-[6px] shadow-xl border border-slate-200 dark:border-[#21354e] p-1 z-50 animate-in fade-in duration-100">
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-[#1d2e44]">
                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{userName}</p>
                <span className="text-[10px] font-bold text-brand block mt-0.5">جلسة نشطة</span>
              </div>
              <div className="pt-1">
                <Link
                  href="/logout"
                  method="post"
                  as="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-[4px] transition-colors text-right cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
