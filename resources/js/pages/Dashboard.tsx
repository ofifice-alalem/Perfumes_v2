import { usePage, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import {
  ShoppingCart, TrendingUp, Truck, Users,
  AlertTriangle, ArrowDownLeft, Package,
} from 'lucide-react';

interface DashboardProps {
  today: { sales: number; received: number; due: number; count: number };
  month: {
    sales: number; received: number; due: number;
    purchases_total: number; purchases_paid: number; purchases_due: number;
    losses: number;
  };
  debts: { customers: number; suppliers: number };
  recent_invoices: Array<{
    id: number; customer: string; total: number;
    paid: number; status: string; created_at: string;
  }>;
  low_stock: Array<{
    id: number; name: string; stock: number; min_stock: number; ratio: number;
  }>;
}

function fmt(n: number) {
  return n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusMap: Record<string, { label: string; cls: string }> = {
  paid:    { label: 'مدفوعة',      cls: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' },
  partial: { label: 'جزئي',        cls: 'text-amber-600 bg-amber-500/10 dark:text-amber-400' },
  unpaid:  { label: 'غير مدفوعة', cls: 'text-red-500 bg-red-500/10' },
};

function StatBadge({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div className={`flex flex-col gap-0.5 px-4 py-3 rounded-2xl ${color}`}>
      <span className="text-[11px] font-bold opacity-70 uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black">{value}</span>
        <span className="text-[11px] font-bold opacity-60">{unit}</span>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="font-black text-slate-700 dark:text-white text-sm">{title}</span>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const { today, month, debts, recent_invoices, low_stock } = usePage().props as unknown as DashboardProps;

  const collectPct = today.sales > 0 ? Math.min((today.received / today.sales) * 100, 100) : 0;
  const monthSalesPct = month.sales > 0 ? Math.min((month.received / month.sales) * 100, 100) : 0;
  const monthPurchPct = month.purchases_total > 0 ? Math.min((month.purchases_paid / month.purchases_total) * 100, 100) : 0;

  return (
    <AppShell pageTitle="لوحة التحكم">
      <div className="flex flex-col gap-5 pb-32 lg:pb-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">لوحة التحكم</h1>
            <p className="text-sm text-slate-400 dark:text-white/40 mt-0.5 font-medium">ملخص نشاط اليوم والشهر الحالي</p>
          </div>
          <Link
            href="/invoices/create"
            className="hidden sm:flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-white text-sm font-black hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <ShoppingCart className="w-4 h-4" />
            فاتورة جديدة
          </Link>
        </div>

        {/* ── بطاقة اليوم الكبيرة ── */}
        <div className="spatial-card overflow-hidden">
          {/* الشريط الملوّن العلوي */}
          <div className="h-1.5 w-full bg-gradient-to-l from-primary/20 via-primary to-primary/20" />
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">ملخص اليوم</span>
              <span className="text-xs font-bold text-slate-400 dark:text-white/30 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
                {today.count} فاتورة
              </span>
            </div>

            {/* الأرقام الرئيسية */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 dark:text-white/40">إجمالي البيع</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{fmt(today.sales)}</span>
                <span className="text-xs text-slate-400 dark:text-white/30 font-medium">دينار ليبي</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">تم استلامه</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(today.received)}</span>
                <span className="text-xs text-emerald-500/50 font-medium">دينار ليبي</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">دين اليوم</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{fmt(today.due)}</span>
                <span className="text-xs text-amber-500/50 font-medium">دينار ليبي</span>
              </div>
            </div>

            {/* شريط التحصيل */}
            {today.sales > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 dark:text-white/40">نسبة التحصيل</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${collectPct >= 90 ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10' : collectPct >= 60 ? 'text-amber-600 bg-amber-100 dark:bg-amber-500/10' : 'text-red-500 bg-red-100 dark:bg-red-500/10'}`}>
                    {collectPct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${collectPct >= 90 ? 'bg-emerald-500' : collectPct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${collectPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ملخص الشهر ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* مبيعات الشهر */}
          <div className="spatial-card p-5">
            <SectionTitle icon={<TrendingUp className="w-3.5 h-3.5" />} title="مبيعات الشهر الحالي" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
                <span className="text-sm font-bold text-slate-500 dark:text-white/50">الإجمالي</span>
                <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{fmt(month.sales)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">المستلم</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(month.received)} <span className="text-xs">د.ل</span></span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">الباقي (دين)</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">{fmt(month.due)} <span className="text-xs">د.ل</span></span>
              </div>
              {month.sales > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${monthSalesPct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 dark:text-white/30 font-medium text-left">{monthSalesPct.toFixed(0)}% تم تحصيله</span>
                </div>
              )}
            </div>
          </div>

          {/* مشتريات الشهر */}
          <div className="spatial-card p-5">
            <SectionTitle icon={<ArrowDownLeft className="w-3.5 h-3.5" />} title="مشتريات الشهر الحالي" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
                <span className="text-sm font-bold text-slate-500 dark:text-white/50">الإجمالي</span>
                <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{fmt(month.purchases_total)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">المدفوع للموردين</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(month.purchases_paid)} <span className="text-xs">د.ل</span></span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-red-500 dark:text-red-400">دين الموردين</span>
                <span className="text-sm font-black text-red-500 dark:text-red-400 tabular-nums">{fmt(month.purchases_due)} <span className="text-xs">د.ل</span></span>
              </div>
              {month.purchases_total > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${monthPurchPct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 dark:text-white/30 font-medium text-left">{monthPurchPct.toFixed(0)}% تم دفعه</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── الديون ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatBadge label="ديون العملاء (إجمالي)" value={fmt(debts.customers)} unit="د.ل" color="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" />
          <StatBadge label="ديون الموردين (إجمالي)" value={fmt(debts.suppliers)} unit="د.ل" color="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300" />
          <StatBadge label="تالف الشهر" value={month.losses} unit="عنصر" color="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/70" />
        </div>

        {/* ── أسفل: فواتير + مخزون ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* فواتير اليوم */}
          <div className="lg:col-span-3 spatial-card p-5">
            <SectionTitle
              icon={<ShoppingCart className="w-3.5 h-3.5" />}
              title="آخر فواتير اليوم"
              action={
                <Link href="/invoices" className="text-xs font-black text-primary hover:underline">
                  عرض الكل
                </Link>
              }
            />
            {recent_invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-300 dark:text-white/20">
                <ShoppingCart className="w-8 h-8" />
                <span className="text-sm font-bold">لا توجد فواتير اليوم بعد</span>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                {recent_invoices.map((inv) => {
                  const s = statusMap[inv.status] ?? { label: inv.status, cls: 'text-slate-500 bg-slate-500/10' };
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-xl px-2 -mx-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-primary">{inv.id}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-700 dark:text-white/80 truncate">{inv.customer}</span>
                          <span className="text-xs text-slate-400 dark:text-white/30">{inv.created_at}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{fmt(inv.total)}</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${s.cls}`}>{s.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* مخزون منخفض */}
          <div className="lg:col-span-2 spatial-card p-5">
            <SectionTitle
              icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
              title="مخزون منخفض"
              action={
                <Link href="/reports/stock-status" className="text-xs font-black text-primary hover:underline">
                  التقرير الكامل
                </Link>
              }
            />
            {low_stock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-emerald-500">
                <Package className="w-8 h-8" />
                <span className="text-sm font-bold">المخزون بخير ✓</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {low_stock.map((item) => (
                  <div key={item.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700 dark:text-white/80 truncate max-w-[150px]">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">{item.stock}</span>
                        <span className="text-xs text-slate-300 dark:text-white/20">/</span>
                        <span className="text-xs font-bold text-slate-400 dark:text-white/30">{item.min_stock}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.ratio <= 25 ? 'bg-red-500' : item.ratio <= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(item.ratio, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
