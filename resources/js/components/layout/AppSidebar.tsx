import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  Tags, Layers, Ruler, DollarSign, Power, RotateCcw,
  CreditCard, RefreshCw, ChevronDown,
  PanelRightClose, PanelRightOpen, AlertTriangle, BarChart2, HardDrive, BookOpen, Settings
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

const navSections: NavSection[] = [
  {
    title: 'العملاء',
    items: [
      { icon: <ShoppingCart className="w-5 h-5" />, label: 'الفواتير', href: '/invoices' },
      { icon: <CreditCard className="w-5 h-5" />, label: 'دفعات العملاء', href: '/payments' },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'تسويات العملاء', href: '/settlements' },
      { icon: <RotateCcw className="w-5 h-5" />, label: 'مرتجعات العملاء', href: '/invoice-returns' },
      { icon: <Users className="w-5 h-5" />, label: 'قائمة العملاء', href: '/customers', roles: ['super-admin', 'admin', 'saler'] },
    ],
  },
  {
    title: 'الموردون',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <Truck className="w-5 h-5" />, label: 'المشتريات', href: '/purchases' },
      { icon: <CreditCard className="w-5 h-5" />, label: 'مدفوعات للموردين', href: '/supplier-payments' },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'تسويات الموردين', href: '/supplier-settlements' },
      { icon: <RotateCcw className="w-5 h-5" />, label: 'مرتجعات الموردين', href: '/purchase-returns' },
      { icon: <Truck className="w-5 h-5" />, label: 'قائمة الموردين', href: '/suppliers' },
    ],
  },
  {
    title: 'المخزون',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <AlertTriangle className="w-5 h-5" />, label: 'التالف والخسائر', href: '/waste-logs' },
    ],
  },
  {
    title: 'إدارة المنتجات',
    roles: ['super-admin', 'admin', 'saler'],
    items: [
      { icon: <Layers className="w-5 h-5" />, label: 'التصنيفات', href: '/categories' },
      { icon: <Ruler className="w-5 h-5" />, label: 'الأحجام', href: '/sizes' },
      { icon: <Tags className="w-5 h-5" />, label: 'التيرات والأسعار', href: '/price-tiers' },
      { icon: <Package className="w-5 h-5" />, label: 'المنتجات', href: '/products' },
    ],
  },
  {
    title: 'الإعدادات العامة والسياسات',
    roles: ['super-admin', 'admin', 'saler', 'cashier'],
    items: [
      { icon: <Settings className="w-5 h-5 text-primary" />, label: 'الاعدادات', href: '/settings', roles: ['super-admin', 'admin'] },
      { icon: <BarChart2 className="w-5 h-5" />, label: 'التقارير', href: '/reports', roles: ['super-admin', 'admin'] },
      { icon: <DollarSign className="w-5 h-5" />, label: 'وسائل الدفع', href: '/payment-methods', roles: ['super-admin', 'admin'] },
      { icon: <Users className="w-5 h-5" />, label: 'المستخدمون', href: '/users', roles: ['super-admin', 'admin'] },
      { icon: <HardDrive className="w-5 h-5" />, label: 'النسخ الاحتياطية', href: '/backups', roles: ['super-admin'] },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'الإقفال والجرد', href: '/periods', roles: ['super-admin'] },
      { icon: <BookOpen className="w-5 h-5" />, label: 'سياسات ودليل النظام', href: '/policy' },
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

  // Scroll active link into view
  useEffect(() => {
    // Small delay to ensure render is complete
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
      ${isOpen ? 'w-64 translate-x-0' : 'w-[88px] max-lg:translate-x-full'}
      max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:h-screen max-lg:border-l max-lg:border-black/10 dark:max-lg:border-white/10
      transition-all duration-500 overflow-hidden
      border-l border-black/5 dark:border-white/[0.08]
      flex flex-col py-8
      bg-white/90 dark:bg-slate-900/90 lg:bg-white/20 lg:dark:bg-white/[0.02]
      backdrop-blur-2xl lg:backdrop-blur-none
      relative z-[999] shrink-0 self-stretch
    `}>
      {/* Logo & Toggle */}
      <div className={`flex items-center w-full mb-4 ${isOpen ? 'justify-between px-5' : 'justify-center'}`}>
        {isOpen && (
          <div className="flex items-center animate-in fade-in pl-2">
            <img 
              src="/images/uzba80.png" 
              alt="طيب التاجوري" 
              className="h-10 w-auto object-contain drop-shadow-sm"
            />
          </div>
        )}
        <button onClick={onToggle} className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white transition-all focus:outline-none">
          {isOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
        </button>
      </div>

      {/* User Info */}
      {isOpen && (
        <div className="px-5 mb-6">
          <div className="flex flex-col px-4 py-3 rounded-[18px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/8">
            <span className="font-black text-slate-800 dark:text-white text-sm truncate">
              {(props.auth?.user?.name as string) ?? ''}
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-white/40 truncate mt-0.5">
              {userRoles[0] === 'super-admin' ? 'مدير عام'
                : userRoles[0] === 'admin'   ? 'مدير'
                : userRoles[0] === 'saler'   ? 'بائع'
                : userRoles[0] === 'cashier' ? 'أمين صندوق'
                : ''}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 w-full px-4 overflow-y-auto custom-scroll pb-14">
        {/* الرئيسية — super-admin فقط */}
        {isSuperAdmin && (
          <Link href="/"
            className={`flex items-center w-full p-2 rounded-[20px] transition-all duration-200 group ${!isOpen ? 'justify-center' : ''} ${url === '/' ? 'bg-primary' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <div className={`w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center transition-all ${url === '/' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 group-hover:bg-black/10 dark:group-hover:bg-white/10 group-hover:text-primary'}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            {isOpen && (
              <span className={`text-[15px] font-bold mr-4 whitespace-nowrap animate-in fade-in ${url === '/' ? 'text-white drop-shadow-sm' : 'text-slate-600 dark:text-white/70 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                الرئيسية
              </span>
            )}
          </Link>
        )}

        {isSuperAdmin && <div className="h-px bg-black/10 dark:bg-white/10 my-2 mx-3" />}

        {/* الأقسام */}
        {navSections.filter(s => canAccess(s.roles)).map((section) => (
          <div key={section.title} className="mb-2">
            {/* عنوان القسم */}
            {isOpen && (
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest hover:text-slate-600 dark:hover:text-white/50 transition-colors"
              >
                <span>{section.title}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedSections[section.title] ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* عناصر القسم */}
            {(isOpen ? expandedSections[section.title] : true) && (
              <div className="flex flex-col gap-1">
                {section.items.filter(item => canAccess(item.roles)).map((item) => {
                  const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}
                      id={isActive ? 'active-nav-link' : undefined}
                      className={`flex items-center w-full p-2 rounded-[20px] transition-all duration-200 group ${!isOpen ? 'justify-center' : ''} ${isActive ? 'bg-primary' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      <div className={`w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center transition-all ${isActive ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 group-hover:bg-black/10 dark:group-hover:bg-white/10 group-hover:text-primary'}`}>
                        {item.icon}
                      </div>
                      {isOpen && (
                        <span className={`text-[15px] font-bold mr-4 whitespace-nowrap animate-in fade-in ${isActive ? 'text-white drop-shadow-sm' : 'text-slate-600 dark:text-white/70 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
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

        <div className="h-px bg-black/20 dark:bg-white/20 my-3 mx-3" />

        <Link href="/logout" method="post" as="button"
          className={`flex items-center w-full p-2 rounded-[20px] transition-all duration-200 group ${!isOpen ? 'justify-center' : ''} hover:bg-red-500/10`}
        >
          <div className="w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center bg-red-500/5 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all">
            <Power className="w-5 h-5" />
          </div>
          {isOpen && <span className="text-[15px] font-bold text-red-400 group-hover:text-red-500 mr-4 whitespace-nowrap animate-in fade-in">تسجيل الخروج</span>}
        </Link>
      </nav>
    </aside>
  );
}
