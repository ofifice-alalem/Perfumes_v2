import { usePage, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
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
    Receipt,
    Wallet,
    FileText,
    Sparkles,
    ChevronRight,
    PlusCircle,
    RotateCcw
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

function fmt(n: number | null | undefined): string {
    if (n === null || n === undefined) return '—';
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusConfig: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'مدفوعة',     cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-2 border-emerald-500/30' },
    partial: { label: 'جزئي',       cls: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-2 border-amber-500/30' },
    unpaid:  { label: 'غير مدفوع', cls: 'text-red-700 dark:text-red-300 bg-red-500/15 border-2 border-red-500/30' },
};

export default function Dashboard() {
    const { today, month, debts, recent_invoices, low_stock, daily_stats } = usePage().props as unknown as DashboardProps;

    const collectPct = today.sales > 0 ? Math.min((today.received / today.sales) * 100, 100) : 0;

    return (
        <AppShell pageTitle="لوحة التحكم">
            <div className="flex flex-col gap-6 pb-28">

                {/* Top Header Banner */}
                <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="flex items-center gap-5 z-10">
                        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-primary/20 to-blue-500/20 border-2 border-primary/30 flex items-center justify-center text-primary shadow-inner">
                            <LayoutDashboard className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    لوحة التحكم الرئيسية
                                </h1>
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs border border-primary/20 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    تحديث مباشر
                                </span>
                            </div>
                            <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                                ملخص حركة المبيعات، التدفقات النقدية، المشتريات والديون اليوم والشهر الحالي
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto z-10 flex-wrap">
                        <Link
                            href="/invoices/create"
                            className="h-14 px-6 rounded-[20px] bg-primary text-white font-black text-base shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer flex-1 sm:flex-none"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span>فاتورة بيع جديدة</span>
                        </Link>
                        <Link
                            href="/reports/sales"
                            className="h-14 px-6 rounded-[20px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-2 border-slate-300 dark:border-slate-700"
                        >
                            <FileText className="w-5 h-5" />
                            <span>تقرير المبيعات</span>
                        </Link>
                    </div>
                </div>

                {/* ── اليوم: Metric Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* إجمالي البيع اليوم */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-4 border-2 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجمالي البيع اليوم</span>
                            <div className="w-12 h-12 rounded-[18px] bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                        <div>
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{fmt(today.sales)}</span>
                            <span className="text-base font-bold text-slate-400 mr-2">د.ل</span>
                        </div>
                        {today.sales > 0 && (
                            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                                    <span>نسبة التحصيل</span>
                                    <span>{collectPct.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${collectPct}%` }} />
                                </div>
                            </div>
                        )}
                    </SpatialCard>

                    {/* المستلم اليوم */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-4 border-2 border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">تم استلامه اليوم</span>
                            <div className="w-12 h-12 rounded-[18px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                                <Wallet className="w-6 h-6" />
                            </div>
                        </div>
                        <div>
                            <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">{fmt(today.received)}</span>
                            <span className="text-base font-bold text-slate-400 mr-2">د.ل</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">مبالغ مسددة نقداً ومصرفياً</span>
                    </SpatialCard>

                    {/* الدين اليوم */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-4 border-2 border-amber-500/30 bg-amber-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">دين اليوم</span>
                            <div className="w-12 h-12 rounded-[18px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                        <div>
                            <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">{fmt(today.due)}</span>
                            <span className="text-base font-bold text-slate-400 mr-2">د.ل</span>
                        </div>
                        <span className="text-xs font-bold text-amber-600/80 dark:text-amber-400/80">مبالغ آجلة على العملاء اليوم</span>
                    </SpatialCard>

                    {/* عدد الفواتير اليوم */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-4 border-2 border-blue-500/30 bg-blue-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">فواتير اليوم</span>
                            <div className="w-12 h-12 rounded-[18px] bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                        </div>
                        <div>
                            <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">{today.count}</span>
                            <span className="text-base font-bold text-slate-400 mr-2">فاتورة</span>
                        </div>
                        <span className="text-xs font-bold text-blue-600/80 dark:text-blue-400/80">إجمالي العمليات المنفذة اليوم</span>
                    </SpatialCard>
                </div>

                {/* ── ملخص الشهر ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* مبيعات الشهر */}
                    <SpatialCard
                        headerDot={false}
                        title="مبيعات الشهر الحالي"
                        icon={<TrendingUp className="w-6 h-6 text-primary" />}
                    >
                        <div className="flex flex-col divide-y-2 divide-slate-100 dark:divide-slate-800/80">
                            <div className="py-4 flex items-center justify-between">
                                <span className="text-base font-black text-slate-600 dark:text-slate-300">الإجمالي الكلي</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{fmt(month.sales)} <span className="text-sm font-bold text-slate-400">د.ل</span></span>
                            </div>
                            <div className="py-4 flex items-center justify-between">
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">المستلم والمحصّل</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(month.received)} <span className="text-sm font-bold">د.ل</span></span>
                            </div>
                            <div className="py-4 flex items-center justify-between">
                                <span className="text-base font-black text-amber-600 dark:text-amber-400">المتبقي (ديون جديدة)</span>
                                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{fmt(month.due)} <span className="text-sm font-bold">د.ل</span></span>
                            </div>
                        </div>
                    </SpatialCard>

                    {/* مشتريات الشهر */}
                    <SpatialCard
                        headerDot={false}
                        title="مشتريات الشهر الحالي"
                        icon={<Truck className="w-6 h-6 text-primary" />}
                    >
                        <div className="flex flex-col divide-y-2 divide-slate-100 dark:divide-slate-800/80">
                            <div className="py-4 flex items-center justify-between">
                                <span className="text-base font-black text-slate-600 dark:text-slate-300">إجمالي المشتريات</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{fmt(month.purchases_total)} <span className="text-sm font-bold text-slate-400">د.ل</span></span>
                            </div>
                            <div className="py-4 flex items-center justify-between">
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">المدفوع للموردين</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(month.purchases_paid)} <span className="text-sm font-bold">د.ل</span></span>
                            </div>
                            <div className="py-4 flex items-center justify-between">
                                <span className="text-base font-black text-red-600 dark:text-red-400">المتبقي للموردين</span>
                                <span className="text-2xl font-black text-red-600 dark:text-red-400">{fmt(month.purchases_due)} <span className="text-sm font-bold">د.ل</span></span>
                            </div>
                        </div>
                    </SpatialCard>

                    {/* ديون العملاء */}
                    <SpatialCard
                        headerDot={false}
                        title="ديون العملاء الإجمالية"
                        icon={<Users className="w-6 h-6 text-primary" />}
                    >
                        <div className="flex flex-col gap-4">
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{fmt(debts.customers)} <span className="text-lg font-bold text-slate-400">د.ل</span></span>
                            <Link
                                href="/reports/customer-aging"
                                className="h-12 px-5 rounded-[16px] bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-base flex items-center justify-between transition-all active:scale-95 border-2 border-primary/20 cursor-pointer"
                            >
                                <span>عرض أعمار وتفاصيل ديون العملاء</span>
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </div>
                    </SpatialCard>

                    {/* ديون الموردين */}
                    <SpatialCard
                        headerDot={false}
                        title="ديون الموردين الإجمالية"
                        icon={<Truck className="w-6 h-6 text-primary" />}
                    >
                        <div className="flex flex-col gap-4">
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{fmt(debts.suppliers)} <span className="text-lg font-bold text-slate-400">د.ل</span></span>
                            <Link
                                href="/reports/supplier-aging"
                                className="h-12 px-5 rounded-[16px] bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-base flex items-center justify-between transition-all active:scale-95 border-2 border-primary/20 cursor-pointer"
                            >
                                <span>عرض أعمار وتفاصيل ديون الموردين</span>
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </div>
                    </SpatialCard>

                    {/* التالف الخاسر */}
                    <SpatialCard
                        headerDot={false}
                        title="عناصر تالفة هذا الشهر"
                        icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
                        className="md:col-span-2"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl font-black text-red-600 dark:text-red-400">{month.losses}</span>
                                <span className="text-lg font-bold text-slate-500 dark:text-slate-400">عنصر مُسجَّل بسجل الهالك والفاقد</span>
                            </div>
                            <Link
                                href="/waste-logs"
                                className="h-12 px-6 rounded-[16px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 font-black text-base flex items-center gap-2 transition-all active:scale-95 border-2 border-slate-300 dark:border-slate-700"
                            >
                                <span>سجل الهالك</span>
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </div>
                    </SpatialCard>
                </div>

                {/* ── أسفل: فواتير اليوم + مخزون منخفض ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* فواتير اليوم */}
                    <SpatialCard
                        headerDot={false}
                        title="آخر فواتير اليوم"
                        icon={<ShoppingCart className="w-6 h-6 text-primary" />}
                        className="lg:col-span-2"
                        action={
                            <Link href="/invoices" className="h-11 px-4 rounded-[14px] bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-sm flex items-center gap-1.5 transition-all active:scale-95 border border-primary/20">
                                <span>جميع الفواتير</span>
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        }
                    >
                        {recent_invoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
                                <ShoppingCart className="w-12 h-12 opacity-30" />
                                <p className="font-bold text-lg">لا توجد فواتير صادرة اليوم حتى الآن</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-[20px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                <table className="w-full text-right border-collapse min-w-[500px]">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base font-black uppercase">
                                            <th className="p-4">العميل</th>
                                            <th className="p-4 text-center">المبلغ</th>
                                            <th className="p-4 text-center">الحالة</th>
                                            <th className="p-4 text-center">التفاصيل</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 font-black text-lg">
                                        {recent_invoices.map((inv) => {
                                            const s = statusConfig[inv.status] ?? { label: inv.status, cls: 'text-slate-500 bg-slate-100' };
                                            return (
                                                <tr key={inv.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-black text-slate-900 dark:text-white text-lg">{inv.customer}</div>
                                                        <div className="text-xs font-bold text-slate-400 mt-0.5">#{inv.id} · {inv.created_at}</div>
                                                    </td>
                                                    <td className="p-4 text-center font-black text-slate-900 dark:text-white text-xl whitespace-nowrap">
                                                        {fmt(inv.total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="p-4 text-center whitespace-nowrap">
                                                        <span className={`px-4 py-1.5 rounded-full font-black text-sm inline-block ${s.cls}`}>{s.label}</span>
                                                    </td>
                                                    <td className="p-4 text-center whitespace-nowrap">
                                                        <Link
                                                            href={`/invoices/${inv.id}`}
                                                            className="h-10 px-4 rounded-[12px] bg-slate-200 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 font-black text-sm inline-flex items-center gap-1.5 transition-all active:scale-95"
                                                        >
                                                            <span>عرض</span>
                                                            <ChevronRight className="w-4 h-4 rotate-180" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SpatialCard>

                    {/* مخزون منخفض */}
                    <SpatialCard
                        headerDot={false}
                        title="تنبيه المخزون المنخفض"
                        icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
                        action={
                            <Link href="/reports/stock-status" className="h-11 px-4 rounded-[14px] bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white font-black text-sm flex items-center gap-1.5 transition-all active:scale-95 border border-amber-500/30">
                                <span>تقرير المخزون</span>
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        }
                    >
                        {low_stock.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-emerald-500 gap-2">
                                <Package className="w-12 h-12 opacity-80" />
                                <p className="font-black text-lg">جميع المنتجات بمستويات آمنة</p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y-2 divide-slate-100 dark:divide-slate-800/80">
                                {low_stock.map((item) => (
                                    <div key={item.id} className="py-4 flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-base font-black text-slate-900 dark:text-white truncate flex-1 ml-2">{item.name}</span>
                                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 shrink-0 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                                {item.stock} <span className="font-bold text-slate-400">/ الأدنى {item.min_stock}</span>
                                            </span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${item.ratio <= 25 ? 'bg-red-500' : item.ratio <= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(item.ratio, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SpatialCard>
                </div>

                {/* ── إحصائيات أيام الشهر ── */}
                {daily_stats.length > 0 && (
                    <SpatialCard
                        headerDot={false}
                        title="إحصائيات وحركة أيام الشهر الحالي"
                        icon={<CalendarDays className="w-7 h-7 text-primary" />}
                    >
                        <div className="overflow-x-auto rounded-[22px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
                            <table className="w-full text-right border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg font-black uppercase">
                                        <th className="p-4">اليوم والتاريخ</th>
                                        <th className="p-4 text-center">إجمالي البيع</th>
                                        <th className="p-4 text-center">المستلم المحصل</th>
                                        <th className="p-4 text-center">الدين الأجل</th>
                                        <th className="p-4 text-center">المرتجع</th>
                                        <th className="p-4 text-center">عدد الفواتير</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 font-black text-xl sm:text-2xl">
                                    {[...daily_stats].reverse().map((row) => {
                                        const isToday = row.day === daily_stats[daily_stats.length - 1]?.day;
                                        const hasData = row.count > 0;
                                        return (
                                            <tr
                                                key={row.date}
                                                className={`transition-colors hover:bg-primary/5 dark:hover:bg-primary/10 ${
                                                    isToday ? 'bg-primary/10 dark:bg-primary/20 border-r-8 border-primary' : ''
                                                }`}
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-lg ${
                                                            isToday ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {row.day}
                                                        </span>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-900 dark:text-white text-lg">
                                                                {row.date}
                                                            </span>
                                                            {isToday && (
                                                                <span className="text-xs font-black text-primary">اليوم الحالي</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                    {hasData ? `${fmt(row.sales)} د.ل` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                </td>
                                                <td className="p-4 text-center font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                    {hasData ? `${fmt(row.received)} د.ل` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                </td>
                                                <td className="p-4 text-center font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                    {hasData ? `${fmt(row.due)} د.ل` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                </td>
                                                <td className="p-4 text-center font-black text-red-600 dark:text-red-400 whitespace-nowrap">
                                                    {row.returns > 0 ? `${fmt(row.returns)} د.ل` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                </td>
                                                <td className="p-4 text-center whitespace-nowrap">
                                                    {hasData ? (
                                                        <span className="px-4 py-1.5 rounded-full bg-primary/15 text-primary font-black text-base border border-primary/30">
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
                                    <tr className="border-t-4 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xl font-black">
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
                                        <td className="p-5 text-center text-red-600 dark:text-red-400 whitespace-nowrap">
                                            {fmt(daily_stats.reduce((s, r) => s + r.returns, 0))} د.ل
                                        </td>
                                        <td className="p-5 text-center text-primary whitespace-nowrap">
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
