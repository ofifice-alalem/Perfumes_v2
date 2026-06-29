import { usePage, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import {
  ShoppingCart, TrendingUp, Truck, Users,
  AlertTriangle, Package, ArrowLeft, CalendarDays,
} from 'lucide-react';

interface DailyStatRow {
  day: number;
  date: string;
  sales: number;
  received: number;
  due: number;
  returns: number;
  count: number;
}

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
  daily_stats: DailyStatRow[];
}

function fmt(n: number) {
  return n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  paid:    { label: 'مدفوعة',     cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
  partial: { label: 'جزئي',       cls: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
  unpaid:  { label: 'غير مدفوع', cls: 'text-red-500 bg-red-50 dark:bg-red-500/10' },
};

export default function Dashboard() {
  const { today, month, debts, recent_invoices, low_stock, daily_stats } = usePage().props as unknown as DashboardProps;

  const collectPct = today.sales > 0 ? Math.min((today.received / today.sales) * 100, 100) : 0;

  return (
    <AppShell pageTitle="لوحة التحكم">
      <div className="flex flex-col gap-6 pb-32 lg:pb-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">لوحة التحكم</h1>
          <p className="text-sm text-slate-400 dark:text-white/40 mt-0.5">ملخص نشاط اليوم والشهر الحالي</p>
        </div>

        {/* ── صف الإحصائيات اليوم ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* إجمالي البيع */}
          <div className="spatial-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">إجمالي البيع اليوم</span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{fmt(today.sales)}</p>
              <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">دينار ليبي</p>
            </div>
            {today.sales > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-slate-400 dark:text-white/30">
                  <span>نسبة التحصيل</span>
                  <span>{collectPct.toFixed(0)}%</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${collectPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* المستلم */}
          <div className="spatial-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">تم استلامه</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(today.received)}</p>
              <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">دينار ليبي</p>
            </div>
          </div>

          {/* الدين */}
          <div className="spatial-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">دين اليوم</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{fmt(today.due)}</p>
              <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">دينار ليبي</p>
            </div>
          </div>

          {/* عدد الفواتير */}
          <div className="spatial-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">فواتير اليوم</span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{today.count}</p>
              <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">فاتورة</p>
            </div>
          </div>
        </div>

        {/* ── ملخص الشهر ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* مبيعات الشهر */}
          <div className="spatial-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-slate-400 dark:text-white/40" />
              <h2 className="text-sm font-black text-slate-700 dark:text-white/80">مبيعات الشهر الحالي</h2>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                <tr>
                  <td className="py-2.5 text-[16px] text-slate-500 dark:text-white/50">الإجمالي</td>
                  <td className="py-2.5 text-[16px] font-black text-slate-800 dark:text-white text-left tabular-nums">{fmt(month.sales)} <span className="text-xs font-medium text-slate-400">د.ل</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 text-[16px] text-slate-500 dark:text-white/50">المستلم</td>
                  <td className="py-2.5 text-[16px] font-black text-emerald-600 dark:text-emerald-400 text-left tabular-nums">{fmt(month.received)} <span className="text-xs font-medium">د.ل</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 text-[16px] text-slate-500 dark:text-white/50">الباقي</td>
                  <td className="py-2.5 text-[16px] font-black text-amber-600 dark:text-amber-400 text-left tabular-nums">{fmt(month.due)} <span className="text-xs font-medium">د.ل</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* مشتريات الشهر */}
          <div className="spatial-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-slate-400 dark:text-white/40" />
              <h2 className="text-sm font-black text-slate-700 dark:text-white/80">مشتريات الشهر الحالي</h2>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                <tr>
                  <td className="py-2.5 text-[16px] text-slate-500 dark:text-white/50">الإجمالي</td>
                  <td className="py-2.5 text-[16px] font-black text-slate-800 dark:text-white text-left tabular-nums">{fmt(month.purchases_total)} <span className="text-xs font-medium text-slate-400">د.ل</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 text-[16px] text-slate-500 dark:text-white/50">المدفوع</td>
                  <td className="py-2.5 text-[16px] font-black text-emerald-600 dark:text-emerald-400 text-left tabular-nums">{fmt(month.purchases_paid)} <span className="text-xs font-medium">د.ل</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 text-[16px] text-slate-500 dark:text-white/50">دين الموردين</td>
                  <td className="py-2.5 text-[16px] font-black text-red-500 dark:text-red-400 text-left tabular-nums">{fmt(month.purchases_due)} <span className="text-xs font-medium">د.ل</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ديون العملاء */}
          <div className="spatial-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-400 dark:text-white/40" />
              <h2 className="text-sm font-black text-slate-700 dark:text-white/80">ديون العملاء الإجمالية</h2>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">{fmt(debts.customers)}<span className="text-base font-bold text-slate-400 dark:text-white/40 mr-1">د.ل</span></p>
            <Link href="/reports/customer-aging" className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-primary hover:underline">
              <span>عرض التفاصيل</span>
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>

          {/* ديون الموردين */}
          <div className="spatial-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-slate-400 dark:text-white/40" />
              <h2 className="text-sm font-black text-slate-700 dark:text-white/80">ديون الموردين الإجمالية</h2>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">{fmt(debts.suppliers)}<span className="text-base font-bold text-slate-400 dark:text-white/40 mr-1">د.ل</span></p>
            <Link href="/reports/supplier-aging" className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-primary hover:underline">
              <span>عرض التفاصيل</span>
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>

          {/* التالف */}
          <div className="spatial-card p-5 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-400 dark:text-white/40" />
                <h2 className="text-sm font-black text-slate-700 dark:text-white/80">عناصر تالفة هذا الشهر</h2>
              </div>
              <Link href="/waste-logs" className="text-xs font-bold text-primary hover:underline">عرض السجل</Link>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">{month.losses}</span>
              <span className="text-sm font-bold text-slate-400 dark:text-white/40">عنصر مُسجَّل</span>
            </div>
          </div>
        </div>

        {/* ── أسفل: فواتير اليوم + مخزون منخفض ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* فواتير اليوم */}
          <div className="lg:col-span-2 spatial-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-400 dark:text-white/40" />
                <h2 className="text-sm font-black text-slate-700 dark:text-white/80">آخر فواتير اليوم</h2>
              </div>
              <Link href="/invoices" className="text-xs font-bold text-primary hover:underline">عرض الكل</Link>
            </div>

            {recent_invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-300 dark:text-white/20">
                <ShoppingCart className="w-7 h-7" />
                <p className="text-sm font-bold">لا توجد فواتير اليوم</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 pb-2 mb-1 border-b border-black/5 dark:border-white/5">
                  <span className="text-xs font-bold text-slate-400 dark:text-white/30">العميل</span>
                  <span className="text-xs font-bold text-slate-400 dark:text-white/30 text-center">المبلغ</span>
                  <span className="text-xs font-bold text-slate-400 dark:text-white/30 text-left">الحالة</span>
                </div>
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {recent_invoices.map((inv) => {
                    const s = statusConfig[inv.status] ?? { label: inv.status, cls: 'text-slate-500 bg-slate-100' };
                    return (
                      <Link
                        key={inv.id}
                        href={`/invoices/${inv.id}`}
                        className="grid grid-cols-3 py-3 items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-white/80 truncate">{inv.customer}</p>
                          <p className="text-xs text-slate-400 dark:text-white/30">#{inv.id} · {inv.created_at}</p>
                        </div>
                        <p className="text-sm font-black text-slate-800 dark:text-white text-center tabular-nums">{fmt(inv.total)}</p>
                        <div className="flex justify-end">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${s.cls}`}>{s.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* مخزون منخفض */}
          <div className="spatial-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-black text-slate-700 dark:text-white/80">مخزون منخفض</h2>
              </div>
              <Link href="/reports/stock-status" className="text-xs font-bold text-primary hover:underline">التقرير</Link>
            </div>

            {low_stock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-emerald-500">
                <Package className="w-7 h-7" />
                <p className="text-sm font-bold">المخزون بخير</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                {low_stock.map((item) => (
                  <div key={item.id} className="py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700 dark:text-white/80 truncate flex-1 ml-2">{item.name}</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0">
                        {item.stock} <span className="font-medium text-slate-400">/ {item.min_stock}</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full ${item.ratio <= 25 ? 'bg-red-500' : item.ratio <= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(item.ratio, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── إحصائيات أيام الشهر ── */}
        {daily_stats.length > 0 && (
          <div className="spatial-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="w-4 h-4 text-slate-400 dark:text-white/40" />
              <h2 className="text-sm font-black text-slate-700 dark:text-white/80">إحصائيات أيام الشهر الحالي</h2>
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[560px] text-[16px]" dir="rtl">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5">
                    <th className="pb-2.5 text-sm font-bold text-slate-400 dark:text-white/30 text-right pr-2">اليوم</th>
                    <th className="pb-2.5 text-sm font-bold text-slate-400 dark:text-white/30 text-center">إجمالي البيع</th>
                    <th className="pb-2.5 text-sm font-bold text-slate-400 dark:text-white/30 text-center">المستلم</th>
                    <th className="pb-2.5 text-sm font-bold text-slate-400 dark:text-white/30 text-center">الدين</th>
                    <th className="pb-2.5 text-sm font-bold text-slate-400 dark:text-white/30 text-center">المرتجع</th>
                    <th className="pb-2.5 text-sm font-bold text-slate-400 dark:text-white/30 text-center">الفواتير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {[...daily_stats].reverse().map((row) => {
                    const isToday = row.day === daily_stats[daily_stats.length - 1]?.day;
                    const hasData = row.count > 0;
                    return (
                      <tr
                        key={row.date}
                        className={`transition-colors ${
                          isToday
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            {isToday && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black bg-primary text-white leading-none">اليوم</span>
                            )}
                            <span className={`font-black tabular-nums ${
                              isToday ? 'text-primary' : 'text-slate-700 dark:text-white/80'
                            }`}>
                              {row.day}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center tabular-nums font-bold text-slate-800 dark:text-white">
                          {hasData ? fmt(row.sales) : <span className="text-slate-300 dark:text-white/20">—</span>}
                        </td>
                        <td className="py-2.5 text-center tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          {hasData ? fmt(row.received) : <span className="text-slate-300 dark:text-white/20">—</span>}
                        </td>
                        <td className="py-2.5 text-center tabular-nums font-bold text-amber-600 dark:text-amber-400">
                          {hasData ? fmt(row.due) : <span className="text-slate-300 dark:text-white/20">—</span>}
                        </td>
                        <td className="py-2.5 text-center tabular-nums font-bold text-red-500 dark:text-red-400">
                          {row.returns > 0 ? fmt(row.returns) : <span className="text-slate-300 dark:text-white/20">—</span>}
                        </td>
                        <td className="py-2.5 text-center">
                          {hasData ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-black">
                              {row.count}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-white/20">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* صف الإجماليات */}
                <tfoot>
                  <tr className="border-t-2 border-black/10 dark:border-white/10">
                    <td className="pt-3 pb-1 pr-2 text-xs font-black text-slate-500 dark:text-white/50">الإجمالي</td>
                    <td className="pt-3 pb-1 text-center tabular-nums text-[16px] font-black text-slate-800 dark:text-white">
                      {fmt(daily_stats.reduce((s, r) => s + r.sales, 0))}
                    </td>
                    <td className="pt-3 pb-1 text-center tabular-nums text-[16px] font-black text-emerald-600 dark:text-emerald-400">
                      {fmt(daily_stats.reduce((s, r) => s + r.received, 0))}
                    </td>
                    <td className="pt-3 pb-1 text-center tabular-nums text-[16px] font-black text-amber-600 dark:text-amber-400">
                      {fmt(daily_stats.reduce((s, r) => s + r.due, 0))}
                    </td>
                    <td className="pt-3 pb-1 text-center tabular-nums text-[16px] font-black text-red-500 dark:text-red-400">
                      {fmt(daily_stats.reduce((s, r) => s + r.returns, 0))}
                    </td>
                    <td className="pt-3 pb-1 text-center tabular-nums text-[16px] font-black text-slate-800 dark:text-white">
                      {daily_stats.reduce((s, r) => s + r.count, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
