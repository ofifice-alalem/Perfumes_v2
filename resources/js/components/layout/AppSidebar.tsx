import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  Tags, Layers, Ruler, DollarSign, Power, RotateCcw,
  CreditCard, RefreshCw, ChevronDown,
  PanelRightClose, PanelRightOpen, AlertTriangle, BarChart2, HardDrive, BookOpen, Settings,
  Sparkles, ShieldCheck
} from 'lucide-react';

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavSection {
  title: string;
  roles?: string[];
  items: NavItem[];
}

interface NavItem {
  icon: JSX.Element;
  label: string;
  href: string;
  roles?: string[];
}

const simpleModeItems: NavItem[] = [
  { icon: <Package className="w-4 h-4" />, label: 'المنتجات', href: '/products' },
  { icon: <Truck className="w-4 h-4" />, label: 'المشتريات', href: '/purchases' },
  { icon: <ShoppingCart className="w-4 h-4" />, label: 'الفواتير', href: '/invoices' },
];

const navSections: NavSection[] = [
  {
    title: 'العملاء والمبيعات',
    items: [
      { icon: <ShoppingCart className="w-4 h-4" />, label: 'الفواتير', href: '/invoices' },
      { icon: <CreditCard className="w-4 h-4" />, label: 'دفعات العملاء', href: '/payments' },
      { icon: <RefreshCw className="w-4 h-4" />, label: 'تسويات العملاء', href: '/settlements' },
      { icon: <RotateCcw className="w-4 h-4" />, label: 'مرتجعات العملاء', href: '/invoice-returns' },
      { icon: <Users className="w-4 h-4" />, label: 'قائمة العملاء', href: '/customers', roles: ['super-admin', 'admin', 'saler'] },
    ],
  },
  {
    title: 'الموردون والمشتريات',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <Truck className="w-4 h-4" />, label: 'المشتريات', href: '/purchases' },
      { icon: <CreditCard className="w-4 h-4" />, label: 'مدفوعات للموردين', href: '/supplier-payments' },
      { icon: <RefreshCw className="w-4 h-4" />, label: 'تسويات الموردين', href: '/supplier-settlements' },
      { icon: <RotateCcw className="w-4 h-4" />, label: 'مرتجعات الموردين', href: '/purchase-returns' },
      { icon: <Truck className="w-4 h-4" />, label: 'قائمة الموردين', href: '/suppliers' },
    ],
  },
  {
    title: 'المخزون والهالك',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <AlertTriangle className="w-4 h-4" />, label: 'التالف والخسائر', href: '/waste-logs' },
    ],
  },
  {
    title: 'إدارة المنتجات والتسعير',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <Layers className="w-4 h-4" />, label: 'التصنيفات', href: '/categories' },
      { icon: <Ruler className="w-4 h-4" />, label: 'الأحجام', href: '/sizes' },
      { icon: <Tags className="w-4 h-4" />, label: 'التيرات والأسعار', href: '/price-tiers' },
      { icon: <Package className="w-4 h-4" />, label: 'المنتجات', href: '/products' },
    ],
  },
  {
    title: 'الإعدادات والرقابة',
    roles: ['super-admin', 'admin', 'saler', 'cashier'],
    items: [
      { icon: <Settings className="w-4 h-4" />, label: 'الاعدادات', href: '/settings', roles: ['super-admin', 'admin'] },
      { icon: <BarChart2 className="w-4 h-4" />, label: 'التقارير', href: '/reports', roles: ['super-admin', 'admin'] },
      { icon: <DollarSign className="w-4 h-4" />, label: 'وسائل الدفع', href: '/payment-methods', roles: ['super-admin', 'admin'] },
      { icon: <Users className="w-4 h-4" />, label: 'المستخدمون', href: '/users', roles: ['super-admin', 'admin'] },
      { icon: <HardDrive className="w-4 h-4" />, label: 'النسخ الاحتياطية', href: '/backups', roles: ['super-admin'] },
      { icon: <RefreshCw className="w-4 h-4" />, label: 'الإقفال والجرد', href: '/periods', roles: ['super-admin'] },
      { icon: <BookOpen className="w-4 h-4" />, label: 'سياسات ودليل النظام', href: '/policy' },
    ],
  },
];

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const { url, props } = usePage<{ auth: { user: { roles: string[] } } }>();
  const userRoles: string[] = (props.auth?.user?.roles as string[]) ?? [];

  const canAccess = (roles?: string[]) =>
    !roles || roles.some(r => userRoles.includes(r));

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    navSections.reduce((acc, section) => ({ ...acc, [section.title]: true }), {})
  );

  const toggleSection = (title: string) => {
    if (!isOpen) return;
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const isSuperAdmin = userRoles.includes('super-admin');
  const canToggleSimpleMode = userRoles.includes('admin') || userRoles.includes('super-admin');

  // Simple Mode state persisted in localStorage
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('perfumes_sidebar_simple_mode') === 'true';
    }
    return false;
  });

  const toggleSimpleMode = () => {
    setIsSimpleMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('perfumes_sidebar_simple_mode', String(next));
      }
      return next;
    });
  };

  // Scroll active link into view
  useEffect(() => {
    const timeout = setTimeout(() => {
      const activeEl = document.getElementById('active-nav-link');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [url, isOpen]);

  return (
    <aside className={`
      ${isOpen ? 'w-52 translate-x-0' : 'w-[58px] max-lg:translate-x-full'}
      max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:h-screen max-lg:z-[999]
      transition-all duration-300 overflow-hidden
      border-l border-slate-200/90 dark:border-[#19273b]
      flex flex-col py-3
      bg-slate-50 dark:bg-[#0a121f]
      relative shrink-0 self-stretch select-none shadow-[0_1px_3px_rgba(15,23,42,0.03)]
    `}>
      {/* ترويسة الشريط الجانبي: الشعار + زر الطي/الفتح */}
      <div className={`flex items-center w-full mb-2.5 px-2.5 ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <div className="flex items-center gap-2 pl-1 max-w-[130px] truncate">
            {(props as any)?.storeBranding?.logo ? (
              <img 
                src={(props as any).storeBranding.logo} 
                alt={(props as any).storeBranding.name || 'شعار المتجر'} 
                className="h-7 w-auto max-w-[90px] object-contain drop-shadow-xs rounded-none"
              />
            ) : (
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 rounded-none bg-[#1a9fff] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-black text-slate-800 dark:text-white text-xs truncate">
                  {(props as any)?.storeBranding?.name || 'منظومة السحابة'}
                </span>
              </div>
            )}
          </div>
        )}
        <button 
          type="button"
          onClick={onToggle} 
          className={`${!isOpen ? 'w-9 h-9' : 'w-7 h-7'} shrink-0 rounded-none border border-slate-200 dark:border-[#223348] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273a] text-slate-600 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs`}
          title={isOpen ? 'طي القائمة الجانبية' : 'توسيع القائمة الجانبية'}
        >
          {isOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* بطاقة المستخدم المكتبي — Live User Badge */}
      {isOpen && (
        <div className="px-2.5 mb-2">
          <div className="px-2.5 py-1.5 rounded-none bg-white dark:bg-[#0e1726] border border-slate-200/90 dark:border-[#1d2d42] flex items-center justify-between text-xs shadow-2xs">
            <span className="font-black text-slate-800 dark:text-white text-xs truncate">
              {(props.auth?.user?.name as string) ?? ''}
            </span>
            <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase bg-sky-500/10 dark:bg-sky-950/40 px-1.5 py-0.5 rounded-[2px] border border-sky-200 dark:border-sky-800/60">
              {userRoles[0] === 'super-admin' ? 'SUPER'
                : userRoles[0] === 'admin'   ? 'ADMIN'
                : userRoles[0] === 'saler'   ? 'SALER'
                : userRoles[0] === 'cashier' ? 'POS'
                : 'USER'}
            </span>
          </div>
        </div>
      )}

      {/* زر التبديل للوضع المبسط (للإدارة) */}
      {canToggleSimpleMode && (
        <div className={`px-2.5 mb-2 ${!isOpen ? 'flex justify-center' : ''}`}>
          {isOpen ? (
            <button
              type="button"
              onClick={toggleSimpleMode}
              className={`w-full flex items-center justify-between px-2 py-2 min-h-[40px] rounded-none border transition-all cursor-pointer shadow-2xs ${
                isSimpleMode
                  ? 'bg-brand/10 border-brand/30 text-brand font-bold'
                  : 'bg-white dark:bg-[#0e1726] border-slate-200/90 dark:border-[#1d2d42] text-slate-600 dark:text-[#8293a4] hover:bg-slate-100 dark:hover:bg-[#142032]'
              }`}
            >
              <div className="flex items-center">
                <div className="w-7 h-7 shrink-0 rounded-none flex items-center justify-center text-brand">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs mr-2 font-bold whitespace-nowrap">الوضع المبسط</span>
              </div>
              <div className={`w-4 h-4 shrink-0 rounded-none border flex items-center justify-center transition-all ${
                isSimpleMode ? 'border-brand bg-brand text-white shadow-xs' : 'border-slate-300 dark:border-[#3d4f65]'
              }`}>
                {isSimpleMode && <span className="text-[10px] font-black leading-none">✓</span>}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSimpleMode}
              title={isSimpleMode ? 'الوضع المبسط (مفعل)' : 'الوضع المبسط (معطل)'}
              className={`w-9 h-9 rounded-none border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                isSimpleMode
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white dark:bg-[#0e1726] border-slate-200 dark:border-[#223043] text-slate-600 dark:text-[#8fa1b5] hover:text-white'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* روابط التنقل الرئيسية بنمط Steam Workstation */}
      <nav className="flex-1 flex flex-col gap-1 w-full px-1.5 overflow-y-auto custom-scroll pb-6">
        {canToggleSimpleMode && isSimpleMode ? (
          /* الوضع المبسط: 3 روابط فقط */
          <div className="flex flex-col border border-slate-200/80 dark:border-[#192b42] divide-y divide-slate-200/80 dark:divide-[#192b42] bg-white dark:bg-[#0d1726] animate-in fade-in duration-150">
            {simpleModeItems.map((item) => {
              const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  id={isActive ? 'active-nav-link' : undefined}
                  className={`flex items-center w-full px-2 py-2 rounded-none transition-all cursor-pointer ${
                    !isOpen ? 'justify-center' : ''
                  } ${
                    isActive 
                      ? 'bg-sky-100/90 dark:bg-[#132840] text-slate-900 dark:text-white border-r-[3px] border-brand font-black shadow-xs' 
                      : 'text-slate-600 dark:text-[#8293a4] hover:bg-slate-100 dark:hover:bg-[#121e30] hover:text-slate-900 dark:hover:text-white font-bold border-r-[3px] border-transparent'
                  }`}
                >
                  <div className={`shrink-0 rounded-none flex items-center justify-center transition-all ${
                    !isOpen ? 'w-9 h-9 [&>svg]:w-5 [&>svg]:h-5' : 'w-7 h-7 [&>svg]:w-4 [&>svg]:h-4'
                  } ${
                    isActive ? 'bg-brand text-white shadow-xs' : 'text-slate-500 dark:text-[#6a7c8e]'
                  }`}>
                    {item.icon}
                  </div>
                  {isOpen && (
                    <span className={`text-xs mr-2 whitespace-nowrap truncate ${isActive ? 'font-black text-brand dark:text-sky-300' : ''}`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          /* القائمة المكتملة */
          <>
            {/* الرئيسية — لوحة التحكم للأدمن */}
            {isSuperAdmin && (
              <div className="border border-slate-200/80 dark:border-[#192b42] bg-white dark:bg-[#0d1726]">
                <Link 
                  href="/"
                  prefetch
                  id={url === '/' ? 'active-nav-link' : undefined}
                  className={`flex items-center w-full px-2 py-2 rounded-none transition-all cursor-pointer ${
                    !isOpen ? 'justify-center' : ''
                  } ${
                    url === '/' 
                      ? 'bg-sky-100/90 dark:bg-[#132840] text-slate-900 dark:text-white border-r-[3px] border-brand font-black shadow-xs' 
                      : 'text-slate-600 dark:text-[#8293a4] hover:bg-slate-100 dark:hover:bg-[#121e30] hover:text-slate-900 dark:hover:text-white font-bold border-r-[3px] border-transparent'
                  }`}
                >
                  <div className={`shrink-0 rounded-none flex items-center justify-center transition-all ${
                    !isOpen ? 'w-9 h-9 [&>svg]:w-5 [&>svg]:h-5' : 'w-7 h-7 [&>svg]:w-4 [&>svg]:h-4'
                  } ${
                    url === '/' ? 'bg-brand text-white shadow-xs' : 'text-slate-500 dark:text-[#6a7c8e]'
                  }`}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  {isOpen && (
                    <span className={`text-xs mr-2 whitespace-nowrap truncate ${url === '/' ? 'font-black text-brand dark:text-sky-300' : ''}`}>
                      لوحة التحكم
                    </span>
                  )}
                </Link>
              </div>
            )}

            {/* أقسام النظام */}
            {navSections.filter(s => canAccess(s.roles)).map((section) => (
              <div key={section.title} className="mb-1">
                {/* عنوان القسم */}
                {isOpen && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center justify-between w-full px-1.5 py-1 text-[10px] font-mono font-black text-slate-400 dark:text-[#56718d] uppercase tracking-wider hover:text-slate-700 dark:hover:text-[#8ba0b5] transition-colors cursor-pointer select-none"
                  >
                    <span>{section.title}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedSections[section.title] ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {/* عناصر القسم مقسمة بفواصل أفقية دقيقة */}
                {(isOpen ? expandedSections[section.title] : true) && (
                  <div className="flex flex-col border border-slate-200/80 dark:border-[#192b42] divide-y divide-slate-200/80 dark:divide-[#192b42] bg-white dark:bg-[#0d1726]">
                    {section.items.filter(item => canAccess(item.roles)).map((item) => {
                      const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                      return (
                        <Link 
                          key={item.href} 
                          href={item.href}
                          prefetch
                          id={isActive ? 'active-nav-link' : undefined}
                          className={`flex items-center w-full px-2 py-2 rounded-none transition-all cursor-pointer ${
                            !isOpen ? 'justify-center' : ''
                          } ${
                            isActive 
                              ? 'bg-sky-100/90 dark:bg-[#132840] text-slate-900 dark:text-white border-r-[3px] border-brand font-black shadow-xs' 
                              : 'text-slate-600 dark:text-[#8293a4] hover:bg-slate-100 dark:hover:bg-[#121e30] hover:text-slate-900 dark:hover:text-white font-bold border-r-[3px] border-transparent'
                          }`}
                        >
                          <div className={`shrink-0 rounded-none flex items-center justify-center transition-all ${
                            !isOpen ? 'w-9 h-9 [&>svg]:w-5 [&>svg]:h-5' : 'w-7 h-7 [&>svg]:w-4 [&>svg]:h-4'
                          } ${
                            isActive ? 'bg-brand text-white shadow-xs' : 'text-slate-500 dark:text-[#6a7c8e]'
                          }`}>
                            {item.icon}
                          </div>
                          {isOpen && (
                            <span className={`text-xs mr-2 whitespace-nowrap truncate ${isActive ? 'font-black text-brand dark:text-sky-300' : ''}`}>
                              {item.label}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* زر تسجيل الخروج بإطار مستقل ومميز */}
        <div className="border border-rose-200/70 dark:border-rose-900/40 bg-white dark:bg-[#0d1726] mt-1">
          <Link 
            href="/logout" 
            method="post" 
            as="button"
            className={`flex items-center w-full px-2 py-2 rounded-none transition-colors cursor-pointer ${
              !isOpen ? 'justify-center' : ''
            } text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-300 font-bold`}
          >
            <div className={`shrink-0 rounded-none flex items-center justify-center text-rose-500 ${
              !isOpen ? 'w-9 h-9 [&>svg]:w-5 [&>svg]:h-5' : 'w-7 h-7 [&>svg]:w-4 [&>svg]:h-4'
            }`}>
              <Power className="w-4 h-4" />
            </div>
            {isOpen && <span className="text-xs mr-2 whitespace-nowrap truncate">تسجيل الخروج</span>}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
