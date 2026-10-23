import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  Tags, Layers, Ruler, DollarSign, Power, RotateCcw,
  CreditCard, RefreshCw, ChevronDown,
  PanelRightClose, PanelRightOpen, AlertTriangle, BarChart2, HardDrive, BookOpen, Settings,
  Sparkles, Pin, PinOff
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
  { icon: <Package className="w-5 h-5" />, label: 'المنتجات', href: '/products' },
  { icon: <Truck className="w-5 h-5" />, label: 'المشتريات', href: '/purchases' },
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'الفواتير', href: '/invoices' },
];

const navSections: NavSection[] = [
  {
    title: 'العملاء والبيع',
    items: [
      { icon: <ShoppingCart className="w-5 h-5" />, label: 'الفواتير', href: '/invoices' },
      { icon: <CreditCard className="w-5 h-5" />, label: 'دفعات العملاء', href: '/payments' },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'تسويات العملاء', href: '/settlements' },
      { icon: <RotateCcw className="w-5 h-5" />, label: 'مرتجعات العملاء', href: '/invoice-returns' },
      { icon: <Users className="w-5 h-5" />, label: 'قائمة العملاء', href: '/customers', roles: ['super-admin', 'admin', 'saler'] },
    ],
  },
  {
    title: 'الموردون والمشتريات',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <Truck className="w-5 h-5" />, label: 'المشتريات', href: '/purchases' },
      { icon: <CreditCard className="w-5 h-5" />, label: 'مدفوعات الموردين', href: '/supplier-payments' },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'تسويات الموردين', href: '/supplier-settlements' },
      { icon: <RotateCcw className="w-5 h-5" />, label: 'مرتجعات الموردين', href: '/purchase-returns' },
      { icon: <Truck className="w-5 h-5" />, label: 'قائمة الموردين', href: '/suppliers' },
    ],
  },
  {
    title: 'المخزون والمنتجات',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <Package className="w-5 h-5" />, label: 'المنتجات', href: '/products' },
      { icon: <Layers className="w-5 h-5" />, label: 'التصنيفات', href: '/categories' },
      { icon: <Tags className="w-5 h-5" />, label: 'التيرات والأسعار', href: '/price-tiers' },
      { icon: <Ruler className="w-5 h-5" />, label: 'الأحجام', href: '/sizes' },
      { icon: <AlertTriangle className="w-5 h-5" />, label: 'التالف والخسائر', href: '/waste-logs' },
    ],
  },
  {
    title: 'الإدارة والتقارير',
    roles: ['super-admin', 'admin', 'saler', 'cashier'],
    items: [
      { icon: <Settings className="w-5 h-5 text-amber-500" />, label: 'الإعدادات العامة', href: '/settings', roles: ['super-admin', 'admin'] },
      { icon: <BarChart2 className="w-5 h-5" />, label: 'التقارير والمبيعات', href: '/reports', roles: ['super-admin', 'admin'] },
      { icon: <DollarSign className="w-5 h-5" />, label: 'وسائل الدفع', href: '/payment-methods', roles: ['super-admin', 'admin'] },
      { icon: <Users className="w-5 h-5" />, label: 'فريق العمل', href: '/users', roles: ['super-admin', 'admin'] },
      { icon: <HardDrive className="w-5 h-5" />, label: 'النسخ الاحتياطية', href: '/backups', roles: ['super-admin'] },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'الإقفال والجرد', href: '/periods', roles: ['super-admin'] },
      { icon: <BookOpen className="w-5 h-5" />, label: 'سياسات ودليل النظام', href: '/policy' },
    ],
  },
];

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const { url, props } = usePage<{ auth: { user: { roles: string[]; name: string } } }>();
  const userRoles: string[] = (props.auth?.user?.roles as string[]) ?? [];
  const userName = (props.auth?.user?.name as string) ?? '';

  const canAccess = (roles?: string[]) =>
    !roles || roles.some(r => userRoles.includes(r));

  // Hover expansion state for desktop icon-rail
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('perfumes_sidebar_pinned') === 'true';
    }
    return false;
  });

  // Effective expanded state: on desktop, expanded if pinned OR hovered. On mobile, controlled by isOpen.
  const isExpanded = isOpen && (isPinned || isHovered);

  const togglePin = () => {
    setIsPinned(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('perfumes_sidebar_pinned', String(next));
      }
      return next;
    });
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    navSections.reduce((acc, section) => ({ ...acc, [section.title]: true }), {})
  );

  const toggleSection = (title: string) => {
    if (!isExpanded) return;
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
  }, [url, isExpanded]);

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        /* Desktop: icon rail (w-[84px]) expanding to w-72 on hover/pin */
        ${isExpanded ? 'lg:w-72 shadow-[0_20px_50px_rgba(0,0,0,0.25)]' : 'lg:w-[84px]'}
        /* Mobile: off-canvas drawer */
        ${isOpen ? 'max-lg:w-72 max-lg:translate-x-0' : 'max-lg:w-72 max-lg:translate-x-full'}
        max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:h-screen
        max-lg:border-l max-lg:border-amber-500/20 max-lg:z-[999]
        transition-all duration-300 ease-in-out overflow-hidden
        border-l border-black/5 dark:border-white/[0.08]
        flex flex-col py-6
        bg-white/95 dark:bg-[#0e1620]/95
        backdrop-blur-2xl
        relative z-40 shrink-0 self-stretch
      `}
    >
      {/* Brand Header */}
      <div className={`flex items-center w-full mb-5 px-4 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 rounded-[16px] bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <img
              src="/images/uzba80.png"
              alt="طيب التاجوري"
              className="h-8 w-auto object-contain drop-shadow-sm"
            />
            {/* Live Gold Status Pulse */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </div>

          {isExpanded && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight truncate">
                طيب التاجوري
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tracking-wide uppercase truncate">
                العطور والزيوت الفاخرة
              </span>
            </div>
          )}
        </div>

        {/* Pin Button (Desktop Only) */}
        {isExpanded && (
          <button
            type="button"
            onClick={togglePin}
            title={isPinned ? 'إلغاء التثبيت (العودة للوضع المغلق الذكي)' : 'تثبيت القائمة مفتوحة'}
            className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-amber-500/15 hover:text-amber-500 text-slate-400 dark:text-white/40 transition-all cursor-pointer active:scale-95"
          >
            {isPinned ? <PinOff className="w-4 h-4 text-amber-500" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* User Info Capsule (When Expanded) */}
      {isExpanded && (
        <div className="px-4 mb-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-3 rounded-[18px] bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                {userName.charAt(0) || 'م'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-black text-slate-900 dark:text-white text-xs truncate">
                  {userName}
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 truncate">
                  {userRoles[0] === 'super-admin' ? 'مدير عام النظام'
                    : userRoles[0] === 'admin'   ? 'مدير فرع'
                    : userRoles[0] === 'saler'   ? 'بائع معتمد'
                    : userRoles[0] === 'cashier' ? 'أمين صندوق'
                    : 'مستخدم'}
                </span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      )}

      {/* Simple Mode Toggle Card */}
      {canToggleSimpleMode && (
        <div className={`px-4 mb-3 ${!isExpanded ? 'flex justify-center' : ''}`}>
          {isExpanded ? (
            <button
              type="button"
              onClick={toggleSimpleMode}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[18px] border transition-all duration-300 cursor-pointer ${
                isSimpleMode
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isSimpleMode
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-white/50'
                }`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-black leading-tight">الوضع المبسط</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-white/40">
                    {isSimpleMode ? '3 روابط بيع سريعة' : 'كامل القوائم الإدارية'}
                  </span>
                </div>
              </div>

              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                isSimpleMode ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-white/20 justify-start'
              }`}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSimpleMode}
              title={isSimpleMode ? 'الوضع المبسط (مفعل)' : 'الوضع المبسط (معطل)'}
              className={`w-11 h-11 rounded-[14px] flex items-center justify-center relative transition-all duration-300 cursor-pointer ${
                isSimpleMode
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:bg-amber-500/10 hover:text-amber-500'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              {isSimpleMode && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-amber-500" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 flex flex-col gap-1.5 w-full px-3 overflow-y-auto custom-scroll pb-10">
        {canToggleSimpleMode && isSimpleMode ? (
          /* Simple Mode */
          <div className="flex flex-col gap-1.5">
            {simpleModeItems.map((item) => {
              const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  id={isActive ? 'active-nav-link' : undefined}
                  className={`flex items-center w-full p-2 rounded-[18px] transition-all duration-200 group relative ${
                    !isExpanded ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'hover:bg-amber-500/10 dark:hover:bg-white/5 text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <div className={`w-10 h-10 shrink-0 rounded-[12px] flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 group-hover:bg-amber-500/20 group-hover:text-amber-600'
                  }`}>
                    {item.icon}
                  </div>
                  {isExpanded && (
                    <span className="text-sm font-black mr-3 whitespace-nowrap animate-in fade-in duration-200">
                      {item.label}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-amber-500" />
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          /* Full Navigation */
          <>
            {/* Dashboard Link (Super Admin) */}
            {isSuperAdmin && (
              <Link
                href="/"
                prefetch
                id={url === '/' ? 'active-nav-link' : undefined}
                className={`flex items-center w-full p-2 rounded-[18px] transition-all duration-200 group relative ${
                  !isExpanded ? 'justify-center' : ''
                } ${
                  url === '/'
                    ? 'bg-gradient-to-r from-[#caa13a]/20 to-[#caa13a]/10 text-[#caa13a] dark:text-[#ecd068] border border-[#caa13a]/30 shadow-sm'
                    : 'hover:bg-[#caa13a]/10 dark:hover:bg-white/5 text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <div className={`w-10 h-10 shrink-0 rounded-[12px] flex items-center justify-center transition-all ${
                  url === '/'
                    ? 'bg-[#caa13a] text-slate-950 shadow-md shadow-[#caa13a]/30'
                    : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 group-hover:bg-[#caa13a]/20 group-hover:text-[#caa13a]'
                }`}>
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                {isExpanded && (
                  <span className="text-sm font-black mr-3 whitespace-nowrap animate-in fade-in duration-200">
                    الرئيسية
                  </span>
                )}
                {url === '/' && (
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-[#caa13a] dark:bg-[#ecd068]" />
                )}
              </Link>
            )}

            {isSuperAdmin && <div className="h-px bg-black/5 dark:bg-white/10 my-2 mx-2" />}

            {/* Nav Sections */}
            {navSections.filter(s => canAccess(s.roles)).map((section) => (
              <div key={section.title} className="mb-2">
                {isExpanded && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest hover:text-[#caa13a] dark:hover:text-[#ecd068] transition-colors cursor-pointer"
                  >
                    <span>{section.title}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedSections[section.title] ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {(isExpanded ? expandedSections[section.title] : true) && (
                  <div className="flex flex-col gap-1">
                    {section.items.filter(item => canAccess(item.roles)).map((item) => {
                      const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch
                          id={isActive ? 'active-nav-link' : undefined}
                          className={`flex items-center w-full p-2 rounded-[18px] transition-all duration-200 group relative ${
                            !isExpanded ? 'justify-center' : ''
                          } ${
                            isActive
                              ? 'bg-gradient-to-r from-[#caa13a]/20 to-[#caa13a]/10 text-[#caa13a] dark:text-[#ecd068] border border-[#caa13a]/30 shadow-sm'
                              : 'hover:bg-[#caa13a]/10 dark:hover:bg-white/5 text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
                          }`}
                        >
                          <div className={`w-10 h-10 shrink-0 rounded-[12px] flex items-center justify-center transition-all ${
                            isActive
                              ? 'bg-[#caa13a] text-slate-950 shadow-md shadow-[#caa13a]/30'
                              : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 group-hover:bg-[#caa13a]/20 group-hover:text-[#caa13a]'
                          }`}>
                            {item.icon}
                          </div>
                          {isExpanded && (
                            <span className="text-sm font-black mr-3 whitespace-nowrap animate-in fade-in duration-200">
                              {item.label}
                            </span>
                          )}
                          {isActive && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-[#caa13a] dark:bg-[#ecd068]" />
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

        <div className="h-px bg-black/10 dark:bg-white/10 my-2 mx-2" />

        {/* Logout Button */}
        <Link
          href="/logout"
          method="post"
          as="button"
          className={`flex items-center w-full p-2 rounded-[18px] transition-all duration-200 group ${
            !isExpanded ? 'justify-center' : ''
          } hover:bg-rose-500/10 text-rose-600 dark:text-rose-400`}
        >
          <div className="w-10 h-10 shrink-0 rounded-[12px] flex items-center justify-center bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-white transition-all">
            <Power className="w-5 h-5" />
          </div>
          {isExpanded && (
            <span className="text-sm font-black mr-3 whitespace-nowrap animate-in fade-in duration-200">
              تسجيل الخروج
            </span>
          )}
        </Link>
      </nav>
    </aside>
  );
}
