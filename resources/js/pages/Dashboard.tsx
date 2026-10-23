import React from 'react';
import { usePage, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import {
  MetricKpiCard,
  OverviewMetricCard,
  StatusBadge,
  SectionHeader,
  SpatialButton,
  SpatialCard,
} from '@/components/ui/SpatialComponents';
import {
  LayoutDashboard,
  TrendingUp,
  Truck,
  Users,
  AlertTriangle,
  Package,
  ArrowLeft,
  CalendarDays,
  ShoppingCart,
  FileText,
  PlusCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
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
    sales: number;
    received: number;
    due: number;
    purchases_total: number;
    purchases_paid: number;
    purchases_due: number;
    losses: number;
  };
  debts: { customers: number; suppliers: number };
  recent_invoices: Array<{
    id: number;
    customer: string;
    total: number;
    paid: number;
    status: 'paid' | 'partial' | 'unpaid' | string;
    created_at: string;
  }>;
  low_stock: Array<{
    id: number;
    name: string;
    stock: number;
    min_stock: number;
    ratio: number;
  }>;
  daily_stats: DailyStatRow[];
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const isWhole = n % 1 === 0;
  return isWhole
    ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const { today, month, debts, recent_invoices, low_stock, daily_stats } =
    usePage().props as unknown as DashboardProps;

  const collectPct = today.sales > 0 ? Math.min((today.received / today.sales) * 100, 100) : 0;

  // Monthly percentages for interactive circular gauges
  const salesReceivedPct = month.sales > 0 ? (month.received / month.sales) * 100 : 0;
  const salesDuePct = month.sales > 0 ? (month.due / month.sales) * 100 : 0;

  const purchasesPaidPct = month.purchases_total > 0 ? (month.purchases_paid / month.purchases_total) * 100 : 0;
  const purchasesDuePct = month.purchases_total > 0 ? (month.purchases_due / month.purchases_total) * 100 : 0;

  const customerCollectedPct = month.sales > 0 ? (month.received / month.sales) * 100 : 0;
  const customerTodayPct = debts.customers > 0 ? Math.min((today.due / debts.customers) * 100, 100) : 0;

  const supplierPaidPct = month.purchases_total > 0 ? (month.purchases_paid / month.purchases_total) * 100 : 0;
  const supplierDuePct = debts.suppliers > 0 ? Math.min((month.purchases_due / debts.suppliers) * 100, 100) : 0;

  return (
    <AppShell pageTitle="لوحة التحكم">
      <div className="flex flex-col gap-6 pb-28">

        {/* ── 1. Page Section Header (Standard SSoT Design System) ── */}
        <div className="spatial-card p-6 sm:p-8 relative overflow-hidden">
          <SectionHeader
            title="لوحة التحكم والعمليات"
            subtitle="نظرة حية ولحظية على حركة المبيعات، التدفقات النقدية، المشتريات ومؤشرات الأداء"
            badge="تحديث مباشر"
            icon={<LayoutDashboard className="w-6 h-6" />}
            actions={
              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <SpatialButton
                  variant="primary"
                  href="/invoices/create"
                  icon={<PlusCircle className="w-5 h-5" />}
                  className="flex-1 sm:flex-initial"
                >
                  فاتورة بيع جديدة
                </SpatialButton>
                <SpatialButton
                  variant="secondary"
                  href="/reports/sales"
                  icon={<FileText className="w-5 h-5" />}
                  className="flex-1 sm:flex-initial"
                >
                  تقرير المبيعات
                </SpatialButton>
              </div>
            }
          />
        </div>

        {/* ── 2. Today KPI Metric Cards (1:1 with Reference Image 1) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. إجمالي المبيعات اليوم (Gold) */}
          <MetricKpiCard
            title="إجمالي المبيعات اليوم"
            value={fmt(today.sales)}
            unit="د.ل"
            subtitle={today.sales > 0 ? `نسبة التحصيل ${collectPct.toFixed(0)}% من القيمة` : 'لا توجد مبيعات حتى الآن'}
            icon={<TrendingUp className="w-4 h-4" />}
            tone="gold"
            bars={[25, 45, 60, 80, 100]}
          />

          {/* 2. المستلم والمحصّل اليوم (Mint / Green) */}
          <MetricKpiCard
            title="المستلم والمحصّل اليوم"
            value={fmt(today.received)}
            unit="د.ل"
            subtitle="نقداً ومصرفياً بالخزينة"
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="mint"
            bars={[30, 48, 65, 82, 100]}
          />

          {/* 3. عدد فواتير اليوم (Cyan / Blue) */}
          <MetricKpiCard
            title="فواتير البيع اليوم"
            value={today.count}
            unit="فاتورة"
            subtitle="نشاط الصندوق المباشر"
            icon={<ShoppingCart className="w-4 h-4" />}
            tone="cyan"
            bars={[35, 55, 70, 60, 95]}
          />

          {/* 4. دين المبيعات الآجل اليوم (Coral / Amber) */}
          <MetricKpiCard
            title="دين المبيعات الآجل اليوم"
            value={fmt(today.due)}
            unit="د.ل"
            subtitle="مستحقات آجلة على العملاء"
            icon={<Users className="w-4 h-4" />}
            tone="coral"
            bars={[70, 55, 42, 30, 18]}
          />
        </div>

        {/* ── 3. Monthly Financial Overview & Debts (Dynamic Circular Gauges) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* مبيعات الشهر الحالي (Dynamic Circular Gauges) */}
          <OverviewMetricCard
            title="مبيعات الشهر الحالي"
            icon={<TrendingUp className="w-5 h-5" />}
            value={fmt(month.sales)}
            unit="د.ل"
            valueLabel="إجمالي المبيعات المحققة هذا الشهر"
            gauges={[
              {
                percentage: salesReceivedPct,
                value: fmt(month.received),
                unit: 'د.ل',
                label: 'المستلم والمحصّل',
                tone: 'mint',
              },
              {
                percentage: salesDuePct,
                value: fmt(month.due),
                unit: 'د.ل',
                label: 'الآجل المتبقي (ديون)',
                tone: 'gold',
              },
            ]}
            footerLink={{
              href: '/reports/sales',
              label: 'عرض كشف المبيعات والتقرير الكامل',
            }}
          />

          {/* مشتريات الشهر الحالي (Dynamic Circular Gauges) */}
          <OverviewMetricCard
            title="مشتريات الشهر الحالي"
            icon={<Truck className="w-5 h-5" />}
            value={fmt(month.purchases_total)}
            unit="د.ل"
            valueLabel="إجمالي فواتير الشراء والطلبيات"
            gauges={[
              {
                percentage: purchasesPaidPct,
                value: fmt(month.purchases_paid),
                unit: 'د.ل',
                label: 'المدفوع للموردين',
                tone: 'mint',
              },
              {
                percentage: purchasesDuePct,
                value: fmt(month.purchases_due),
                unit: 'د.ل',
                label: 'المتبقي التزامات للموردين',
                tone: 'coral',
              },
            ]}
            footerLink={{
              href: '/reports/supplier-aging',
              label: 'عرض كشف حساب المشتريات والموردين',
            }}
          />

          {/* ديون العملاء الإجمالية (Dynamic Circular Gauges) */}
          <OverviewMetricCard
            title="ديون العملاء الإجمالية"
            icon={<Users className="w-5 h-5" />}
            value={fmt(debts.customers)}
            unit="د.ل"
            valueLabel="إجمالي المبالغ المستحقة طرف العملاء"
            gauges={[
              {
                percentage: customerCollectedPct,
                value: fmt(month.received),
                unit: 'د.ل',
                label: 'المحصّل هذا الشهر',
                tone: 'mint',
              },
              {
                percentage: customerTodayPct,
                value: fmt(today.due),
                unit: 'د.ل',
                label: 'دين اليوم الآجل الجديد',
                tone: 'gold',
              },
            ]}
            footerLink={{
              href: '/reports/customer-aging',
              label: 'عرض تقرير أعمار وتفاصيل ديون العملاء',
            }}
          />

          {/* ديون الموردين الإجمالية (Dynamic Circular Gauges) */}
          <OverviewMetricCard
            title="ديون الموردين الإجمالية"
            icon={<Truck className="w-5 h-5" />}
            value={fmt(debts.suppliers)}
            unit="د.ل"
            valueLabel="إجمالي الالتزامات المستحقة للموردين"
            gauges={[
              {
                percentage: supplierPaidPct,
                value: fmt(month.purchases_paid),
                unit: 'د.ل',
                label: 'المسدد للموردين هذا الشهر',
                tone: 'mint',
              },
              {
                percentage: supplierDuePct,
                value: fmt(month.purchases_due),
                unit: 'د.ل',
                label: 'متبقي شراء هذا الشهر',
                tone: 'coral',
              },
            ]}
            footerLink={{
              href: '/reports/supplier-aging',
              label: 'عرض تقرير أعمار وتفاصيل ديون الموردين',
            }}
          />

          {/* عناصر تالفة هذا الشهر */}
          <SpatialCard
            headerDot={false}
            title="عناصر تالفة هذا الشهر"
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
            className="md:col-span-2"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-rose-600 dark:text-rose-400">
                  {month.losses}
                </span>
                <span className="text-base font-bold text-slate-600 dark:text-[#8ea2b8]">
                  عنصر مُسجَّل بسجل الهالك والفاقد للشهر الجاري
                </span>
              </div>
              <SpatialButton
                variant="secondary"
                href="/waste-logs"
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                سجل الهالك
              </SpatialButton>
            </div>
          </SpatialCard>
        </div>

        {/* ── 4. Bottom Grid: Recent Invoices & Low Stock Alert ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Invoices Table (Span 2) */}
          <SpatialCard
            headerDot={false}
            title="آخر فواتير اليوم"
            icon={<ShoppingCart className="w-6 h-6 text-amber-500" />}
            className="lg:col-span-2"
            action={
              <SpatialButton
                variant="outline"
                href="/invoices"
                icon={<ArrowLeft className="w-4 h-4" />}
                className="h-10 px-4 text-xs sm:text-sm"
              >
                جميع الفواتير
              </SpatialButton>
            }
          >
            {recent_invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
                <ShoppingCart className="w-12 h-12 opacity-30" />
                <p className="font-bold text-lg">لا توجد فواتير صادرة اليوم حتى الآن</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[20px] border border-black/10 dark:border-[rgba(65,96,128,0.35)] bg-white/50 dark:bg-[#111c28]/60 backdrop-blur-md">
                <table className="w-full text-right border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-[rgba(65,96,128,0.35)] bg-black/[0.02] dark:bg-white/[0.02] text-slate-700 dark:text-[#8ea2b8] text-sm font-black uppercase">
                      <th className="p-4">العميل</th>
                      <th className="p-4 text-center">المبلغ</th>
                      <th className="p-4 text-center">الحالة</th>
                      <th className="p-4 text-center">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 font-black text-base">
                    {recent_invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-amber-500/5 dark:hover:bg-amber-400/5 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-black text-slate-900 dark:text-white text-base">
                            {inv.customer}
                          </div>
                          <div className="text-xs font-bold text-slate-400 dark:text-[#6a7f96] mt-0.5">
                            #{inv.id} · {inv.created_at}
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-slate-900 dark:text-white text-lg whitespace-nowrap">
                          {fmt(inv.total)}{' '}
                          <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <StatusBadge
                            status={
                              inv.status === 'paid'
                                ? 'paid'
                                : inv.status === 'partial'
                                ? 'partial'
                                : 'unpaid'
                            }
                          />
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="h-9 px-3.5 rounded-[12px] bg-slate-200/80 dark:bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-slate-800 dark:text-slate-200 font-black text-xs inline-flex items-center gap-1 transition-all active:scale-95"
                          >
                            <span>عرض</span>
                            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SpatialCard>

          {/* Low Stock Alert */}
          <SpatialCard
            headerDot={false}
            title="تنبيه المخزون المنخفض"
            icon={<ShieldAlert className="w-6 h-6 text-amber-500" />}
            action={
              <SpatialButton
                variant="outline"
                href="/reports/stock-status"
                icon={<ArrowLeft className="w-4 h-4" />}
                className="h-10 px-4 text-xs sm:text-sm"
              >
                تقرير المخزون
              </SpatialButton>
            }
          >
            {low_stock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-emerald-500 gap-2">
                <Package className="w-12 h-12 opacity-80" />
                <p className="font-black text-lg">جميع المنتجات بمستويات آمنة وممتازة</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                {low_stock.map((item) => (
                  <div key={item.id} className="py-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900 dark:text-white truncate flex-1 ml-2">
                        {item.name}
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        {item.stock}{' '}
                        <span className="font-bold text-slate-400">/ الأدنى {item.min_stock}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.ratio <= 25
                            ? 'bg-rose-500'
                            : item.ratio <= 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(item.ratio, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SpatialCard>
        </div>

        {/* ── 5. Monthly Daily Stats Activity Table ── */}
        {daily_stats.length > 0 && (
          <SpatialCard
            headerDot={false}
            title="إحصائيات وحركة أيام الشهر الحالي"
            icon={<CalendarDays className="w-6 h-6 text-amber-500" />}
          >
            <div className="overflow-x-auto rounded-[20px] border border-black/10 dark:border-[rgba(65,96,128,0.35)] bg-white/50 dark:bg-[#111c28]/60 backdrop-blur-md">
              <table className="w-full text-right border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-[rgba(65,96,128,0.35)] bg-black/[0.03] dark:bg-white/[0.03] text-slate-700 dark:text-[#8ea2b8] text-sm font-black uppercase">
                    <th className="p-4">اليوم والتاريخ</th>
                    <th className="p-4 text-center">إجمالي البيع</th>
                    <th className="p-4 text-center">المستلم المحصل</th>
                    <th className="p-4 text-center">الدين الأجل</th>
                    <th className="p-4 text-center">المرتجع</th>
                    <th className="p-4 text-center">عدد الفواتير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 font-black text-base">
                  {[...daily_stats].reverse().map((row) => {
                    const isToday = row.day === daily_stats[daily_stats.length - 1]?.day;
                    const hasData = row.count > 0;
                    return (
                      <tr
                        key={row.date}
                        className={`transition-colors hover:bg-amber-500/5 dark:hover:bg-amber-400/5 ${
                          isToday
                            ? 'bg-amber-500/10 dark:bg-amber-400/10 border-r-4 border-amber-500'
                            : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-9 h-9 rounded-[12px] flex items-center justify-center font-black text-sm ${
                                isToday
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                  : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {row.day}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-white text-base">
                                {row.date}
                              </span>
                              {isToday && (
                                <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                                  اليوم الحالي
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {hasData ? (
                            `${fmt(row.sales)} د.ل`
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {hasData ? (
                            `${fmt(row.received)} د.ل`
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {hasData ? (
                            `${fmt(row.due)} د.ل`
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {row.returns > 0 ? (
                            `${fmt(row.returns)} د.ل`
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {hasData ? (
                            <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-black text-xs border border-amber-500/30">
                              {row.count}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer Totals */}
                <tfoot>
                  <tr className="border-t-2 border-black/10 dark:border-[rgba(65,96,128,0.35)] bg-black/[0.04] dark:bg-white/[0.04] text-base font-black">
                    <td className="p-5 text-slate-900 dark:text-white">الإجمالي الكلي للشهر</td>
                    <td className="p-5 text-center text-slate-900 dark:text-white whitespace-nowrap">
                      {fmt(daily_stats.reduce((s, r) => s + r.sales, 0))} د.ل
                    </td>
                    <td className="p-5 text-center text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {fmt(daily_stats.reduce((s, r) => s + r.received, 0))} د.ل
                    </td>
                    <td className="p-5 text-center text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {fmt(daily_stats.reduce((s, r) => s + r.due, 0))} د.ل
                    </td>
                    <td className="p-5 text-center text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {fmt(daily_stats.reduce((s, r) => s + r.returns, 0))} د.ل
                    </td>
                    <td className="p-5 text-center text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {daily_stats.reduce((s, r) => s + r.count, 0)} فاتورة
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SpatialCard>
        )}

      </div>
    </AppShell>
  );
}
