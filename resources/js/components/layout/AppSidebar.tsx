import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  Tags, Layers, Ruler, DollarSign, Power, UserCog,
  PanelRightClose, PanelRightOpen, CreditCard, ArrowLeftRight, Trash2, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const mainItems = [
  { icon: <LayoutDashboard className="w-[18px] h-[18px]" />, label: 'الرئيسية',  href: '/' },
  { icon: <ShoppingCart className="w-[18px] h-[18px]" />,    label: 'الفواتير',   href: '/invoices' },
  { icon: <CreditCard className="w-[18px] h-[18px]" />,      label: 'المدفوعات',   href: '/payments' },
  { icon: <ArrowLeftRight className="w-[18px] h-[18px]" />,  label: 'التسويات',    href: '/settlements' },
  { icon: <Users className="w-[18px] h-[18px]" />,           label: 'العملاء',     href: '/customers' },
];

const groups = [
  {
    label: 'المشتريات',
    items: [
      { icon: <Truck className="w-[18px] h-[18px]" />,   label: 'المشتريات', href: '/purchases' },
      { icon: <Truck className="w-[18px] h-[18px]" />,   label: 'الموردون',  href: '/suppliers' },
    ],
  },
  {
    label: 'الإعدادات',
    items: [
      { icon: <Package className="w-[18px] h-[18px]" />,    label: 'المنتجات',        href: '/products' },
      { icon: <Trash2 className="w-[18px] h-[18px]" />,     label: 'التالف',           href: '/waste' },
      { icon: <Layers className="w-[18px] h-[18px]" />,     label: 'التصنيفات',       href: '/categories' },
      { icon: <Tags className="w-[18px] h-[18px]" />,       label: 'التيرات والأسعار', href: '/price-tiers' },
      { icon: <Ruler className="w-[18px] h-[18px]" />,      label: 'الأحجام',          href: '/sizes' },
      { icon: <DollarSign className="w-[18px] h-[18px]" />, label: 'وسائل الدفع',    href: '/payment-methods' },
      { icon: <UserCog className="w-[18px] h-[18px]" />,    label: 'المستخدمون',      href: '/users' },
    ],
  },
];

function NavLink({ item, isOpen, indent = false }: {
  item: { icon: React.ReactNode; label: string; href: string };
  isOpen: boolean;
  indent?: boolean;
}) {
  const { url } = usePage();
  const isActive = url === item.href || (item.href !== '/' && url.startsWith(item.href));
  return (
    <Link href={item.href}
      className={`flex items-center w-full transition-all duration-150 group rounded-[14px] ${
        !isOpen ? 'justify-center p-2' : `px-2 py-1.5 ${indent ? 'pr-3' : ''}`
      } ${
        isActive
          ? 'bg-primary/15 dark:bg-primary/20'
          : 'hover:bg-black/4 dark:hover:bg-white/6'
      }`}
    >
      <div className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center transition-all ${
        isActive
          ? 'bg-primary text-white shadow-md shadow-primary/30'
          : 'text-slate-400 dark:text-white/35 group-hover:text-primary dark:group-hover:text-primary/80'
      }`}>
        {item.icon}
      </div>
      {isOpen && (
        <span className={`text-[13.5px] font-semibold mr-2.5 whitespace-nowrap ${
          isActive
            ? 'text-primary dark:text-primary/90 font-bold'
            : 'text-slate-500 dark:text-white/50 group-hover:text-slate-800 dark:group-hover:text-white/80'
        }`}>
          {item.label}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ group, isOpen }: { group: typeof groups[0]; isOpen: boolean }) {
  const { url } = usePage();
  const hasActive = group.items.some(i => url === i.href || (i.href !== '/' && url.startsWith(i.href)));
  const [expanded, setExpanded] = useState(true);

  if (!isOpen) {
    return (
      <div className="flex flex-col gap-0.5 mt-1">
        {group.items.map(item => <NavLink key={item.href} item={item} isOpen={false} />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center w-full px-2 py-2 group"
      >
        <span className={`text-[10.5px] font-black uppercase tracking-[0.12em] flex-1 text-right transition-colors ${
          hasActive ? 'text-primary/70 dark:text-primary/60' : 'text-slate-300 dark:text-white/20 group-hover:text-slate-400 dark:group-hover:text-white/35'
        }`}>
          {group.label}
        </span>
        <ChevronDown className={`w-3 h-3 transition-all duration-200 ${
          hasActive ? 'text-primary/60' : 'text-slate-300 dark:text-white/20 group-hover:text-slate-400 dark:group-hover:text-white/35'
        } ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <div className={`flex flex-col gap-0.5 overflow-hidden transition-all duration-200 ${
        expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        {group.items.map(item => <NavLink key={item.href} item={item} isOpen={true} indent />)}
      </div>
    </div>
  );
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  return (
    <aside className={`
      ${isOpen ? 'w-[220px] translate-x-0' : 'w-[60px] max-lg:translate-x-full'}
      max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:h-screen
      max-lg:border-l max-lg:border-black/10 dark:max-lg:border-white/8
      transition-all duration-300 overflow-hidden
      border-l border-black/5 dark:border-white/[0.06]
      flex flex-col pt-6 pb-4
      bg-white dark:bg-[#0f1117]
      lg:bg-white/30 lg:dark:bg-[#0f1117]/80
      relative z-[999] shrink-0 self-stretch
    `}>

      {/* Logo & Toggle */}
      <div className={`flex items-center w-full mb-6 px-3 ${
        isOpen ? 'justify-between' : 'justify-center'
      }`}>
        {isOpen && (
          <div className="flex items-center gap-2.5 animate-in fade-in">
            <div className="w-8 h-8 bg-primary/15 dark:bg-primary/20 rounded-[10px] flex items-center justify-center font-black text-sm text-primary">
              P
            </div>
            <span className="text-[15px] font-black text-slate-800 dark:text-white/90 whitespace-nowrap tracking-tight">عطور</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/8 text-slate-400 dark:text-white/25 hover:text-slate-700 dark:hover:text-white/60 transition-all"
        >
          {isOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 w-full px-2 overflow-y-auto custom-scroll">

        {/* Main */}
        {mainItems.map(item => <NavLink key={item.href} item={item} isOpen={isOpen} />)}

        {/* Divider */}
        <div className="h-px bg-black/5 dark:bg-white/6 my-3 mx-1" />

        {/* Groups */}
        <div className="flex flex-col gap-2">
          {groups.map(group => (
            <NavGroup key={group.label} group={group} isOpen={isOpen} />
          ))}
        </div>

      </nav>

      {/* Logout */}
      <div className="px-2 pt-3 border-t border-black/5 dark:border-white/6 mt-2">
        <Link href="/logout" method="post" as="button"
          className={`flex items-center w-full rounded-[14px] transition-all duration-150 group ${
            !isOpen ? 'justify-center p-2' : 'px-2 py-1.5'
          } hover:bg-red-500/8 dark:hover:bg-red-500/12`}
        >
          <div className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center text-red-400/70 dark:text-red-400/50 group-hover:bg-red-500 group-hover:text-white transition-all">
            <Power className="w-[18px] h-[18px]" />
          </div>
          {isOpen && (
            <span className="text-[13.5px] font-semibold text-red-400/70 dark:text-red-400/50 group-hover:text-red-500 dark:group-hover:text-red-400 mr-2.5 whitespace-nowrap">
              تسجيل الخروج
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}
