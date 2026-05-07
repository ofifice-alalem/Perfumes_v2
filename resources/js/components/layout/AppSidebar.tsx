import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  Tags, Layers, Ruler, DollarSign, Power, RotateCcw,
  CreditCard, RefreshCw, ChevronDown,
  PanelRightClose, PanelRightOpen, AlertTriangle,
} from 'lucide-react';

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  icon: JSX.Element;
  label: string;
  href: string;
}

const navSections: NavSection[] = [
  {
    title: 'العملاء',
    items: [
      { icon: <ShoppingCart className="w-5 h-5" />, label: 'الفواتير', href: '/invoices' },
      { icon: <CreditCard className="w-5 h-5" />, label: 'دفعات العملاء', href: '/payments' },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'تسويات العملاء', href: '/settlements' },
      { icon: <RotateCcw className="w-5 h-5" />, label: 'مرتجعات العملاء', href: '/invoice-returns' },
      { icon: <Users className="w-5 h-5" />, label: 'قائمة العملاء', href: '/customers' },
    ],
  },
  {
    title: 'الموردون',
    items: [
      { icon: <Truck className="w-5 h-5" />, label: 'المشتريات', href: '/purchases' },
      { icon: <CreditCard className="w-5 h-5" />, label: 'مدفوعات الموردين', href: '/supplier-payments' },
      { icon: <RefreshCw className="w-5 h-5" />, label: 'تسويات الموردين', href: '/supplier-settlements' },
      { icon: <RotateCcw className="w-5 h-5" />, label: 'مرتجعات الموردين', href: '/purchase-returns' },
      { icon: <Truck className="w-5 h-5" />, label: 'قائمة الموردين', href: '/suppliers' },
    ],
  },
  {
    title: 'المخزون',
    items: [
      { icon: <AlertTriangle className="w-5 h-5" />, label: 'التالف والخسائر', href: '/waste-logs' },
    ],
  },
  {
    title: 'الإعدادات العامة',
    items: [
      { icon: <Package className="w-5 h-5" />, label: 'المنتجات', href: '/products' },
      { icon: <Layers className="w-5 h-5" />, label: 'التصنيفات', href: '/categories' },
      { icon: <Tags className="w-5 h-5" />, label: 'التيرات والأسعار', href: '/price-tiers' },
      { icon: <Ruler className="w-5 h-5" />, label: 'الأحجام', href: '/sizes' },
      { icon: <DollarSign className="w-5 h-5" />, label: 'وسائل الدفع', href: '/payment-methods' },
      { icon: <Users className="w-5 h-5" />, label: 'المستخدمون', href: '/users' },
    ],
  },
];

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const { url } = usePage();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    navSections.reduce((acc, section) => ({ ...acc, [section.title]: true }), {})
  );

  const toggleSection = (title: string) => {
    if (!isOpen) return;
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

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
      <div className={`flex items-center w-full mb-8 ${isOpen ? 'justify-between px-5' : 'justify-center'}`}>
        {isOpen && (
          <div className="flex items-center gap-3 animate-in fade-in">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-lg text-primary">
              P<span className="text-primary/60">+</span>
            </div>
            <span className="text-xl font-black text-slate-800 dark:text-white whitespace-nowrap">
              عطور
            </span>
          </div>
        )}
        <button onClick={onToggle} className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white transition-all focus:outline-none">
          {isOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 w-full px-4 overflow-y-auto custom-scroll pb-14">
        {/* الرئيسية */}
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

        <div className="h-px bg-black/10 dark:bg-white/10 my-2 mx-3" />

        {/* الأقسام */}
        {navSections.map((section) => (
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
                {section.items.map((item) => {
                  const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}
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
