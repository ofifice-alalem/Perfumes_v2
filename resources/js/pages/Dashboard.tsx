import { usePage, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
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
    Wallet,
    FileText,
    Sparkles,
    ChevronRight,
    Play,
    RotateCcw,
    CheckCircle2,
    BarChart2,
    Activity,
    Layers,
    Server,
    Clock
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
    paid:    { label: 'مدفوعة', cls: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30' },
    partial: { label: 'جزئي',   cls: 'text-amber-500 bg-amber-500/10 border border-amber-500/30' },
    unpaid:  { label: 'آجل',    cls: 'text-rose-500 bg-rose-500/10 border border-rose-500/30' },
};

export default function Dashboard() {
    const { today, month, debts, recent_invoices, low_stock, daily_stats } = usePage().props as unknown as DashboardProps;
    const storeBranding = (usePage().props as any)?.storeBranding;

    const collectPct = today.sales > 0 ? Math.min((today.received / today.sales) * 100, 100) : 0;

    return (
        <AppShell pageTitle="لوحة التحكم المركزية">
            <div className="flex flex-col gap-4 pb-16 font-['Tajawal'] select-none">

                {/* ── محطة الإدارة والرقابة المركزية ── */}
                <div className="spatial-card p-5 md:p-6 rounded-[6px] relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-5 transition-all">
                    
                    {/* الجانب الأيمن: بيانات المنظومة والوسوم التقنية */}
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-[6px] bg-slate-50 dark:bg-[#0c1422] border border-slate-200 dark:border-[#1f3047] flex items-center justify-center p-2 shadow-2xs shrink-0 text-brand overflow-hidden">
                            {storeBranding?.logo ? (
                                <img 
                                    src={storeBranding.logo} 
                                    alt="Logo" 
                                    className="w-full h-full max-w-full max-h-full object-contain filter drop-shadow-xs"
                                />
                            ) : (
                                <Server className="w-6 h-6" />
                            )}
                        </div>
                        <div className="text-right flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>النظام متصل ونشط</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                                    بيانات متزامنة مركزياً
                                </span>
                                <span className="hidden sm:inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                    127.0.0.1
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                {storeBranding?.name ? `منظومة ${storeBranding.name} — لوحة التحكم المركزية` : 'لوحة التحكم المركزية — محطة الإدارة والرقابة'}
                            </h2>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                مراقبة لحظية لحركة المبيعات، التدفقات النقدية، المشتريات والديون وفق واجهة مكتبية عالية الدقة.
                            </p>
                        </div>
                    </div>

                    {/* الجانب الأيسر: أزرار التشغيل المكتبي */}
                    <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0 flex-wrap sm:flex-nowrap">
                        <Link
                            href="/invoices/create"
                            className="btn-theme-primary h-9 px-4 rounded-[5px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 flex-1 sm:flex-none text-xs font-bold shadow-xs"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>فاتورة بيع جديدة</span>
                        </Link>
                        <Link
                            href="/reports/sales"
                            className="btn-theme-secondary h-9 px-3.5 rounded-[5px] flex items-center justify-center gap-1.5 cursor-pointer transition-all flex-1 sm:flex-none text-xs font-bold"
                        >
                            <FileText className="w-3.5 h-3.5 text-brand" />
                            <span>تقرير المبيعات</span>
                        </Link>
                        <Link
                            href="/reports/profit-analysis"
                            className="h-9 px-3.5 rounded-[5px] bg-slate-50 hover:bg-slate-100 dark:bg-[#142032] dark:hover:bg-[#1a2b42] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#22354c] font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all flex-1 sm:flex-none"
                        >
                            <BarChart2 className="w-3.5 h-3.5 text-brand" />
                            <span>تحليل الأرباح</span>
                        </Link>
                    </div>

                </div>

                {/* ── صناديق القياس والمراقبة الآنية (Today Telemetry Metrics) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

                    {/* 1. إجمالي البيع اليوم */}
                    <div className="spatial-card p-4 flex flex-col justify-between relative overflow-hidden group hover:border-brand/40 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                إجمالي البيع اليوم
                            </span>
                            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                        </div>

                        <div className="flex items-baseline gap-1 mb-2.5">
                            <span className="text-2xl lg:text-3xl font-black font-number text-slate-900 dark:text-white tracking-tight tabular-nums">
                                {fmt(today.sales)}
                            </span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">د.ل</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#0c1421] border border-slate-200/70 dark:border-[#1d2d42] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-l from-brand via-sky-400 to-brand transition-all duration-700"
                                style={{ width: `${today.sales > 0 ? Math.max(collectPct, 12) : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* 2. المستلم نقداً ومصرفياً */}
                    <div className="spatial-card p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                تم استلامه اليوم
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>

                        <div className="flex items-baseline gap-1 mb-2.5">
                            <span className="text-2xl lg:text-3xl font-black font-number text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                                {fmt(today.received)}
                            </span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">د.ل</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#0c1421] border border-slate-200/70 dark:border-[#1d2d42] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-700"
                                style={{ width: `${today.received > 0 ? 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* 3. دين اليوم الآجل */}
                    <div className="spatial-card p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                دين اليوم الآجل
                            </span>
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                        </div>

                        <div className="flex items-baseline gap-1 mb-2.5">
                            <span className="text-2xl lg:text-3xl font-black font-number text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
                                {fmt(today.due)}
                            </span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">د.ل</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#0c1421] border border-slate-200/70 dark:border-[#1d2d42] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-l from-amber-500 to-yellow-400 transition-all duration-700"
                                style={{
                                    width: `${today.sales > 0 && today.due > 0
                                        ? Math.min((today.due / today.sales) * 100, 100)
                                        : (today.due > 0 ? 100 : 0)}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* 4. عدد الفواتير اليوم */}
                    <div className="spatial-card p-4 flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/40 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                فواتير اليوم
                            </span>
                            <ShoppingCart className="w-3.5 h-3.5 text-sky-500" />
                        </div>

                        <div className="flex items-baseline gap-1 mb-2.5">
                            <span className="text-2xl lg:text-3xl font-black font-number text-sky-600 dark:text-sky-400 tracking-tight tabular-nums">
                                {today.count}
                            </span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 select-none">فاتورة</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#0c1421] border border-slate-200/70 dark:border-[#1d2d42] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-l from-sky-500 to-blue-600 transition-all duration-700"
                                style={{ width: `${today.count > 0 ? 100 : 0}%` }}
                            />
                        </div>
                    </div>

                </div>

                {/* ── ملخص الشهر المالي — أرفف التشخيص (Server Telemetry Racks) ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* رف 1: مبيعات الشهر الحالي */}
                    <div className="spatial-card rounded-[6px] overflow-hidden flex flex-col justify-between">
                        <div className="p-3 border-b border-slate-100 dark:border-[#1c2c40] bg-slate-50/70 dark:bg-[#131d2b] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-[4px] bg-brand/10 text-brand border border-brand/20 flex items-center justify-center">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white">مبيعات الشهر الحالي</h4>
                                    <span className="text-[10px] text-slate-500 dark:text-[#8ba0b5] block font-bold">مؤشر الإيراد الشهري</span>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-brand/10 text-brand border border-brand/20">
                                نشط
                            </span>
                        </div>

                        <div className="p-3.5">
                            <div className="p-3 rounded-[5px] border border-slate-200/80 dark:border-[#1b2b3f] bg-slate-50/70 dark:bg-[#0c1422] text-slate-800 dark:text-white text-xs space-y-2.5">
                                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-200/50 dark:border-[#172436]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">الإجمالي الكلي للشهر:</span>
                                    <span className="text-slate-900 dark:text-white font-black font-number text-sm tabular-nums">{fmt(month.sales)} <span className="text-[11px] font-normal text-slate-400 mr-0.5">د.ل</span></span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-200/50 dark:border-[#172436]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">المستلم والمحصّل:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black font-number text-sm tabular-nums">{fmt(month.received)} <span className="text-[11px] font-normal text-slate-400 mr-0.5">د.ل</span></span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">المتبقي (ديون جديدة):</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-black font-number text-sm tabular-nums">{fmt(month.due)} <span className="text-[11px] font-normal text-slate-400 mr-0.5">د.ل</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="px-3.5 py-2.5 border-t border-slate-100 dark:border-[#1c2c40] bg-white dark:bg-[#0f1827] flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <span>التحصيل المالي</span>
                            <span className="font-number font-bold text-brand">{month.sales > 0 ? ((month.received / month.sales) * 100).toFixed(1) : 0}% محصّل</span>
                        </div>
                    </div>

                    {/* رف 2: مشتريات الشهر الحالي */}
                    <div className="spatial-card rounded-[6px] overflow-hidden flex flex-col justify-between">
                        <div className="p-3 border-b border-slate-100 dark:border-[#1c2c40] bg-slate-50/70 dark:bg-[#131d2b] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-[4px] bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
                                    <Truck className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white">مشتريات الشهر الحالي</h4>
                                    <span className="text-[10px] text-slate-500 dark:text-[#8ba0b5] block font-bold">توريدات ومشتريات الموردين</span>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                مسجل
                            </span>
                        </div>

                        <div className="p-3.5">
                            <div className="p-3 rounded-[5px] border border-slate-200/80 dark:border-[#1b2b3f] bg-slate-50/70 dark:bg-[#0c1422] text-slate-800 dark:text-white text-xs space-y-2.5">
                                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-200/50 dark:border-[#172436]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">إجمالي المشتريات:</span>
                                    <span className="text-slate-900 dark:text-white font-black font-number text-sm tabular-nums">{fmt(month.purchases_total)} <span className="text-[11px] font-normal text-slate-400 mr-0.5">د.ل</span></span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-200/50 dark:border-[#172436]">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">المدفوع للموردين:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black font-number text-sm tabular-nums">{fmt(month.purchases_paid)} <span className="text-[11px] font-normal text-slate-400 mr-0.5">د.ل</span></span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold">المتبقي للموردين:</span>
                                    <span className="text-rose-600 dark:text-rose-400 font-black font-number text-sm tabular-nums">{fmt(month.purchases_due)} <span className="text-[11px] font-normal text-slate-400 mr-0.5">د.ل</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="px-3.5 py-2.5 border-t border-slate-100 dark:border-[#1c2c40] bg-white dark:bg-[#0f1827] flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <span>حالة السداد للموردين</span>
                            <span className="font-number font-bold text-purple-400">{month.purchases_total > 0 ? ((month.purchases_paid / month.purchases_total) * 100).toFixed(1) : 0}% مسدّد</span>
                        </div>
                    </div>

                </div>

                {/* ── ديون العملاء والموردين والتالف ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* ديون العملاء الإجمالية */}
                    <div className="spatial-card p-4 rounded-[6px] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-slate-700 dark:text-white">ديون العملاء الإجمالية</span>
                                <Users className="w-4 h-4 text-brand" />
                            </div>
                            <div className="text-2xl font-black font-number text-slate-900 dark:text-white tabular-nums mb-3">
                                {fmt(debts.customers)} <span className="text-xs font-bold text-slate-400 mr-1 select-none">د.ل</span>
                            </div>
                        </div>
                        <Link
                            href="/reports/customer-aging"
                            className="h-8 px-3 rounded-[5px] bg-slate-50 dark:bg-[#142032] hover:bg-slate-100 dark:hover:bg-[#1a2b42] text-slate-700 dark:text-[#c6d4df] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#22354c] font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                        >
                            <span>تفاصيل أعمار الديون</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* ديون الموردين الإجمالية */}
                    <div className="spatial-card p-4 rounded-[6px] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-slate-700 dark:text-white">ديون الموردين الإجمالية</span>
                                <Truck className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-2xl font-black font-number text-slate-900 dark:text-white tabular-nums mb-3">
                                {fmt(debts.suppliers)} <span className="text-xs font-bold text-slate-400 mr-1 select-none">د.ل</span>
                            </div>
                        </div>
                        <Link
                            href="/reports/supplier-aging"
                            className="h-8 px-3 rounded-[5px] bg-slate-50 dark:bg-[#142032] hover:bg-slate-100 dark:hover:bg-[#1a2b42] text-slate-700 dark:text-[#c6d4df] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#22354c] font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                        >
                            <span>تفاصيل ديون الموردين</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* التالف والخسائر */}
                    <div className="spatial-card p-4 rounded-[6px] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-slate-700 dark:text-white">الهالك والفاقد هذا الشهر</span>
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-black font-number text-rose-600 dark:text-rose-400 tabular-nums mb-3">
                                {month.losses} <span className="text-xs font-bold text-slate-400 mr-1 select-none">عنصر مسجل</span>
                            </div>
                        </div>
                        <Link
                            href="/waste-logs"
                            className="h-8 px-3 rounded-[5px] bg-slate-50 dark:bg-[#142032] hover:bg-slate-100 dark:hover:bg-[#1a2b42] text-slate-700 dark:text-[#c6d4df] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#22354c] font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                        >
                            <span>سجل الهالك والفاقد</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                </div>

                {/* ── جداول البيانات المكتبية: فواتير اليوم الأخيرة + تنبيه المخزون ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* فواتير اليوم الأخيرة */}
                    <div className="lg:col-span-2 spatial-card rounded-[6px] overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-slate-100 dark:border-[#1c2c40] bg-slate-50/70 dark:bg-[#131d2b] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-brand" />
                                <h3 className="text-xs font-black text-slate-800 dark:text-white">آخر فواتير المبيعات الصادرة اليوم</h3>
                            </div>
                            <Link 
                                href="/invoices" 
                                className="h-7 px-2.5 rounded-[4px] bg-slate-100 dark:bg-[#1c2a3d] hover:bg-slate-200 dark:hover:bg-[#253852] text-slate-700 dark:text-[#c6d4df] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2b3e56] font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                                <span>سجل الفواتير الكامل</span>
                                <ArrowLeft className="w-3 h-3" />
                            </Link>
                        </div>

                        {recent_invoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-[#56718d] gap-2">
                                <ShoppingCart className="w-10 h-10 opacity-30" />
                                <p className="font-bold text-xs">لا توجد فواتير مبيعات مسجلة اليوم حتى الآن</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-[#1c2c40] bg-slate-50/50 dark:bg-[#0c1422] text-slate-500 dark:text-slate-400 font-bold">
                                            <th className="p-2.5">العميل / التوقيت</th>
                                            <th className="p-2.5 text-center">المبلغ</th>
                                            <th className="p-2.5 text-center">الحالة</th>
                                            <th className="p-2.5 text-center">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#172436] font-bold">
                                        {recent_invoices.map((inv) => {
                                            const s = statusConfig[inv.status] ?? { label: inv.status, cls: 'text-slate-500 bg-slate-100' };
                                            return (
                                                <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-[#142032] transition-colors">
                                                    <td className="p-2.5">
                                                        <div className="font-black text-slate-800 dark:text-white text-xs">{inv.customer}</div>
                                                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">#{inv.id} · {inv.created_at}</div>
                                                    </td>
                                                    <td className="p-2.5 text-center font-black font-number text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                                        {fmt(inv.total)} <span className="text-[10px] font-normal text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="p-2.5 text-center whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold inline-block ${s.cls}`}>{s.label}</span>
                                                    </td>
                                                    <td className="p-2.5 text-center whitespace-nowrap">
                                                        <Link
                                                            href={`/invoices/${inv.id}`}
                                                            className="h-6 px-2 rounded-[3px] bg-slate-50 dark:bg-[#1a293d] hover:bg-brand hover:text-white text-slate-700 dark:text-[#c6d4df] font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer border border-slate-200 dark:border-[#263b56]"
                                                        >
                                                            <span>عرض</span>
                                                            <ChevronRight className="w-3 h-3 rotate-180" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* تنبيه المخزون المنخفض */}
                    <div className="spatial-card rounded-[6px] overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-slate-100 dark:border-[#1c2c40] bg-slate-50/70 dark:bg-[#131d2b] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <h3 className="text-xs font-black text-slate-800 dark:text-white">المخزون المنخفض</h3>
                            </div>
                            <Link 
                                href="/reports/stock-status" 
                                className="h-7 px-2.5 rounded-[4px] bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/25 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                            >
                                <span>تقرير الجرد</span>
                                <ArrowLeft className="w-3 h-3" />
                            </Link>
                        </div>

                        {low_stock.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-emerald-500 gap-2">
                                <Package className="w-10 h-10 opacity-70" />
                                <p className="font-black text-xs">كافة المنتجات بمستويات آمنة</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-2.5 overflow-y-auto max-h-[300px] custom-scroll">
                                {low_stock.map((item) => (
                                    <div key={item.id} className="p-2.5 rounded-[5px] border border-slate-200/80 dark:border-[#1b2b3f] bg-slate-50/60 dark:bg-[#0c1422] flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-800 dark:text-white truncate flex-1 ml-2">{item.name}</span>
                                            <span className="text-[11px] font-number font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-[3px] border border-amber-500/20 shrink-0 tabular-nums">
                                                {item.stock} / {item.min_stock}
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[#182332] overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${item.ratio <= 25 ? 'bg-rose-500' : item.ratio <= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(item.ratio, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* ── مصفوفة إحصائيات أيام الشهر (Telemetry Daily Stats Grid) ── */}
                {daily_stats.length > 0 && (
                    <div className="spatial-card rounded-[6px] overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-slate-100 dark:border-[#1c2c40] bg-slate-50/70 dark:bg-[#131d2b] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-brand" />
                                <h3 className="text-xs font-black text-slate-800 dark:text-white">سجل حركة وإحصائيات أيام الشهر الحالي</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-[#8ba0b5]">
                                تم تسجيل {daily_stats.length} يوماً
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse text-xs min-w-[650px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-[#1c2c40] bg-slate-50/50 dark:bg-[#0c1422] text-slate-500 dark:text-slate-400 font-bold">
                                        <th className="p-2.5">اليوم والتاريخ</th>
                                        <th className="p-2.5 text-center">إجمالي البيع</th>
                                        <th className="p-2.5 text-center">المستلم الفعلي</th>
                                        <th className="p-2.5 text-center">الآجل غير المحصل</th>
                                        <th className="p-2.5 text-center">المرتجع</th>
                                        <th className="p-2.5 text-center">عدد العمليات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-[#172436] font-bold">
                                    {[...daily_stats].reverse().map((row) => {
                                        const isToday = row.day === daily_stats[daily_stats.length - 1]?.day;
                                        const hasData = row.count > 0;
                                        return (
                                            <tr
                                                key={row.date}
                                                className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-[#142032] ${
                                                    isToday ? 'bg-brand/10 dark:bg-brand/10 border-r-[3px] border-brand' : ''
                                                }`}
                                            >
                                                <td className="p-2.5 font-sans">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-6 h-6 rounded-[3px] flex items-center justify-center font-number font-black text-xs ${
                                                            isToday ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-[#1b2533] text-slate-700 dark:text-[#8fa1b5]'
                                                        }`}>
                                                            {row.day}
                                                        </span>
                                                        <span className="text-slate-800 dark:text-white font-bold text-xs">{row.date}</span>
                                                        {isToday && (
                                                            <span className="text-[10px] font-bold text-brand mr-1">[اليوم]</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-center font-number font-black text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                                    {hasData ? `${fmt(row.sales)} د.ل` : <span className="text-slate-300 dark:text-[#3d4f65]">—</span>}
                                                </td>
                                                <td className="p-2.5 text-center font-number font-black text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                                                    {hasData ? `${fmt(row.received)} د.ل` : <span className="text-slate-300 dark:text-[#3d4f65]">—</span>}
                                                </td>
                                                <td className="p-2.5 text-center font-number font-black text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                                                    {hasData ? `${fmt(row.due)} د.ل` : <span className="text-slate-300 dark:text-[#3d4f65]">—</span>}
                                                </td>
                                                <td className="p-2.5 text-center font-number font-black text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                                                    {row.returns > 0 ? `${fmt(row.returns)} د.ل` : <span className="text-slate-300 dark:text-[#3d4f65]">—</span>}
                                                </td>
                                                <td className="p-2.5 text-center whitespace-nowrap">
                                                    {hasData ? (
                                                        <span className="px-2 py-0.5 rounded-[3px] bg-brand/10 text-brand font-number font-bold text-xs border border-brand/20">
                                                            {row.count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-[#3d4f65]">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200 dark:border-[#1c2c40] bg-slate-50/70 dark:bg-[#0c1422] font-black text-xs">
                                        <td className="p-3 font-sans text-slate-800 dark:text-white">الإجمالي الكلي للشهر</td>
                                        <td className="p-3 text-center font-number text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                            {fmt(daily_stats.reduce((s, r) => s + r.sales, 0))} د.ل
                                        </td>
                                        <td className="p-3 text-center font-number text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                                            {fmt(daily_stats.reduce((s, r) => s + r.received, 0))} د.ل
                                        </td>
                                        <td className="p-3 text-center font-number text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                                            {fmt(daily_stats.reduce((s, r) => s + r.due, 0))} د.ل
                                        </td>
                                        <td className="p-3 text-center font-number text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                                            {fmt(daily_stats.reduce((s, r) => s + r.returns, 0))} د.ل
                                        </td>
                                        <td className="p-3 text-center font-number text-brand whitespace-nowrap">
                                            {daily_stats.reduce((s, r) => s + r.count, 0)} عملية
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
