import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import {
  ShoppingCart, TrendingUp, Package, Users,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const stats = [
  { label: 'إجمالي المبيعات', value: '12,450', unit: 'د.ج', change: '+12%', up: true, icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'الفواتير اليوم', value: '24', unit: 'فاتورة', change: '+5%', up: true, icon: <ShoppingCart className="w-5 h-5" /> },
  { label: 'المنتجات', value: '86', unit: 'منتج', change: '+3', up: true, icon: <Package className="w-5 h-5" /> },
  { label: 'العملاء', value: '142', unit: 'عميل', change: '-2%', up: false, icon: <Users className="w-5 h-5" /> },
];

const recentInvoices = [
  { id: '#1024', customer: 'خالد إبراهيم', total: '103.5', status: 'مدفوعة', statusColor: 'text-emerald-500 bg-emerald-500/10' },
  { id: '#1023', customer: 'فاطمة محمد', total: '55.0', status: 'جزئي', statusColor: 'text-amber-500 bg-amber-500/10' },
  { id: '#1022', customer: 'زبون نقدي', total: '36.0', status: 'مدفوعة', statusColor: 'text-emerald-500 bg-emerald-500/10' },
  { id: '#1021', customer: 'عبدالله سالم', total: '200.0', status: 'غير مدفوعة', statusColor: 'text-red-500 bg-red-500/10' },
  { id: '#1020', customer: 'زبون نقدي', total: '18.0', status: 'مدفوعة', statusColor: 'text-emerald-500 bg-emerald-500/10' },
];

const lowStock = [
  { name: 'Dior Sauvage', stock: '15 ml', min: '50 ml' },
  { name: 'بخور عود', stock: '8 قطعة', min: '20 قطعة' },
  { name: 'وشق مسك', stock: '12 g', min: '30 g' },
];

export default function Dashboard() {
  return (
    <AppShell pageTitle="لوحة التحكم">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">لوحة التحكم</h1>
          <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">مرحباً، هذا ملخص نشاط اليوم</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="spatial-card p-4 lg:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[14px] bg-primary/10 text-primary flex items-center justify-center">
                  {stat.icon}
                </div>
                <span className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-[8px] ${stat.up ? 'text-emerald-600 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</span>
                  <span className="text-xs font-bold text-slate-400 dark:text-white/40 mb-1">{stat.unit}</span>
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-white/50 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Invoices */}
          <div className="lg:col-span-2">
            <SpatialCard title="آخر الفواتير" icon={<ShoppingCart className="w-4 h-4" />}
              action={
                <button className="text-xs font-bold text-primary hover:underline">عرض الكل</button>
              }
            >
              <div className="flex flex-col gap-2">
                {recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-primary">{inv.id}</span>
                      <span className="text-sm font-bold text-slate-600 dark:text-white/70">{inv.customer}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-slate-800 dark:text-white">{inv.total} د.ج</span>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-[8px] ${inv.statusColor}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SpatialCard>
          </div>

          {/* Low Stock */}
          <div>
            <SpatialCard title="مخزون منخفض" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} headerDot={false}>
              <div className="flex flex-col gap-3">
                {lowStock.map((item) => (
                  <div key={item.name} className="flex flex-col gap-1.5 p-3 rounded-[16px] bg-amber-500/5 border border-amber-500/10">
                    <span className="text-sm font-black text-slate-800 dark:text-white">{item.name}</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">المتبقي: {item.stock}</span>
                      <span className="text-xs font-bold text-slate-400 dark:text-white/30">الحد: {item.min}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: '25%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </SpatialCard>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
