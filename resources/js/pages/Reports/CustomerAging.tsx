import { router } from '@inertiajs/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import {
    Users,
    SlidersHorizontal,
    Search,
    FileSpreadsheet,
    FileText,
    ChevronRight,
    X,
    RotateCcw,
    Download,
    Clock,
    AlertCircle,
    CalendarCheck,
    History
} from 'lucide-react';

interface Customer { id: number; name: string; }

interface Movement {
    type: 'invoice' | 'payment' | 'settlement' | 'return' | 'opening_balance';
    ref: string;
    ref_id: number;
    amount: number;
    date: string | null;
    days_old: number | null;
    balance: number;
}

interface CustomerAging {
    customer_id: number;
    customer_name: string;
    total_debt: number;
    total_invoiced: number;
    total_paid: number;
    total_settled: number;
    total_returned: number;
    current: number;
    days_30_60: number;
    days_60_90: number;
    over_90: number;
    movements: Movement[];
}

interface Props {
    customers: Customer[];
    filters: { customerId: number | null; dateFrom: string | null; dateTo: string | null; showAllHistory: boolean | null };
    data: CustomerAging[];
}

function fmt(n: number | null | undefined): string {
    if (n === null || n === undefined) return '—';
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const typeConfig = {
    invoice:          { label: 'فاتورة',     class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',          amountClass: 'text-rose-600 dark:text-rose-400 font-black' },
    payment:          { label: 'دفعة',       class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',  amountClass: 'text-emerald-600 dark:text-emerald-400 font-black' },
    settlement:       { label: 'تسوية',      class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',             amountClass: 'text-blue-600 dark:text-blue-400 font-black' },
    return:           { label: 'مرتجع',      class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',          amountClass: 'text-amber-600 dark:text-amber-400 font-black' },
    opening_balance: { label: 'رصيد سابق', class: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',    amountClass: 'text-purple-600 dark:text-purple-400 font-black' },
};

/* =========================================================================
   RIGHT FILTER DRAWER
   ========================================================================= */
function FilterDrawer({
    isOpen,
    onClose,
    customers,
    customerId,
    setCustomerId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    showAllHistory,
    setShowAllHistory,
    onSearch,
    onReset
}: {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    customerId: string;
    setCustomerId: (v: string) => void;
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    showAllHistory: boolean;
    setShowAllHistory: (fn: (p: boolean) => boolean) => void;
    onSearch: () => void;
    onReset: () => void;
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-start select-none dir-rtl">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Right Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-l-2 border-slate-200 dark:border-slate-800 shadow-[10px_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300 z-[10000]">
                
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 sm:p-8 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[22px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-md">
                            <SlidersHorizontal className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">خيارات تصفية الديون</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                تحديد العملاء، التواريخ، وخيارات العرض
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-14 h-14 rounded-[20px] bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer border-2 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-6">
                    
                    {/* Customer Selection */}
                    <ModernSelect
                        label="اختيار العميل"
                        placeholder="الكل"
                        options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                        defaultValue={customerId ? (customers.find(c => String(c.id) === customerId)?.name ?? '') : 'الكل'}
                        onSelect={val => setCustomerId(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
                    />

                    {/* Stacked Dates */}
                    <div className="flex flex-col gap-5 pt-2 border-t-2 border-slate-200/60 dark:border-slate-800/60">
                        <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                        <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                    </div>

                    {/* Dedicated Section: History Toggles */}
                    <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-slate-100/70 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700/60 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">خيارات التفاصيل والسجل</h4>
                        </div>
                        
                        <div
                            onClick={() => setShowAllHistory(p => !p)}
                            className="flex items-center justify-between p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 cursor-pointer active:scale-98 transition-all select-none shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-primary" />
                                <span className="text-base font-black text-slate-800 dark:text-slate-200">عرض جميع الحركات السابقة</span>
                            </div>
                            <div className={`w-14 h-8 rounded-full transition-all relative p-1 ${showAllHistory ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${showAllHistory ? 'translate-x-0' : '-translate-x-6'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            onSearch();
                            onClose();
                        }}
                        className="h-16 sm:h-18 px-8 rounded-[18px] bg-primary hover:bg-blue-600 active:bg-blue-700 text-white font-black text-xl flex-1 flex items-center justify-center gap-3 shadow-xl shadow-primary/30 border-2 border-primary/40 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
                    >
                        <Search className="w-6 h-6 shrink-0" />
                        <span>عرض التقرير</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            onReset();
                            onClose();
                        }}
                        className="h-16 sm:h-18 px-6 rounded-[18px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-black text-lg flex items-center justify-center gap-2 border-2 border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shrink-0 touch-manipulation shadow-md select-none"
                    >
                        <RotateCcw className="w-5 h-5 shrink-0 text-slate-700 dark:text-slate-300" />
                        <span>إعادة تعيين</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* =========================================================================
   MAIN CUSTOMER AGING REPORT PAGE
   ========================================================================= */
export default function CustomerAging({ customers, filters, data }: Props) {
    const [isFilterOpen,   setIsFilterOpen]   = useState(false);
    const [customerId,     setCustomerId]     = useState(filters.customerId ? String(filters.customerId) : '');
    const [dateFrom,       setDateFrom]       = useState(filters.dateFrom ?? '');
    const [dateTo,         setDateTo]         = useState(filters.dateTo ?? '');
    const [showAllHistory, setShowAllHistory] = useState(filters.showAllHistory ?? false);
    const [expanded,       setExpanded]       = useState<Set<number>>(new Set());

    const activeFilterCount = (customerId ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (showAllHistory ? 1 : 0);

    function search() {
        router.get('/reports/customer-aging', {
            customer_id:      customerId      || undefined,
            date_from:        dateFrom        || undefined,
            date_to:          dateTo          || undefined,
            show_all_history: showAllHistory  || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setCustomerId(''); setDateFrom(''); setDateTo(''); setShowAllHistory(false);
        router.get('/reports/customer-aging', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        const params = new URLSearchParams();
        if (customerId)     params.set('customer_id', customerId);
        if (dateFrom)       params.set('date_from', dateFrom);
        if (dateTo)         params.set('date_to', dateTo);
        if (showAllHistory) params.set('show_all_history', '1');
        return `/reports/customer-aging/${format}?${params.toString()}`;
    }

    function toggleExpand(id: number) {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    // Metric Calculations
    const totalDebt   = data.reduce((s, c) => s + (c.total_debt || 0), 0);
    const sumCurrent  = data.reduce((s, c) => s + (c.current || 0), 0);
    const sum3060     = data.reduce((s, c) => s + (c.days_30_60 || 0), 0);
    const sum6090     = data.reduce((s, c) => s + (c.days_60_90 || 0), 0);
    const sumOver90   = data.reduce((s, c) => s + (c.over_90 || 0), 0);

    return (
        <AppShell pageTitle="ديون العملاء">
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                تقرير ديون وأعمار ديون العملاء
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                تحليل الديون المستحقة وتصنيفها حسب فترات التأخير والتحصيل
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="h-16 sm:h-18 px-8 sm:px-10 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 font-black text-base sm:text-xl flex items-center justify-center gap-3 active:scale-95 shadow-xl border-2 border-slate-300 dark:border-slate-700 touch-manipulation cursor-pointer transition-all relative"
                        >
                            <SlidersHorizontal className="w-6 h-6" />
                            <span>تصفية وفلترة</span>
                            {activeFilterCount > 0 && (
                                <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filter Drawer Portal */}
                <FilterDrawer
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    customers={customers}
                    customerId={customerId}
                    setCustomerId={setCustomerId}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    showAllHistory={showAllHistory}
                    setShowAllHistory={setShowAllHistory}
                    onSearch={search}
                    onReset={reset}
                />

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-slate-200 dark:border-slate-700 col-span-2 md:col-span-1">
                        <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجمالي الديون</span>
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{fmt(totalDebt)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>

                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-emerald-500/30 bg-emerald-500/5">
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">جارية (0-30 يوم)</span>
                        <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">{fmt(sumCurrent)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>

                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-amber-500/30 bg-amber-500/5">
                        <span className="text-sm font-black text-amber-500 uppercase tracking-wider">تأخير (30-60 يوم)</span>
                        <span className="text-3xl sm:text-4xl font-black text-amber-500">{fmt(sum3060)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>

                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-orange-500/30 bg-orange-500/5">
                        <span className="text-sm font-black text-orange-500 uppercase tracking-wider">تأخير (60-90 يوم)</span>
                        <span className="text-3xl sm:text-4xl font-black text-orange-500">{fmt(sum6090)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>

                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-rose-500/30 bg-rose-500/5">
                        <span className="text-sm font-black text-rose-500 uppercase tracking-wider">متأخرة (&gt; 90 يوم)</span>
                        <span className="text-3xl sm:text-4xl font-black text-rose-500">{fmt(sumOver90)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>
                </div>

                {/* Table Card */}
                <SpatialCard
                    headerDot={false}
                    title={`جدول ديون العملاء (${data.length} عميل)`}
                    icon={<Users className="w-7 h-7 text-primary" />}
                    action={
                        <div className="flex items-center gap-3">
                            <a
                                href={buildExportUrl('excel')}
                                target="_blank"
                                rel="noreferrer"
                                className="h-12 px-5 rounded-[16px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white border-2 border-emerald-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                                title="تصدير إكسيل"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                <span className="hidden sm:inline">تصدير إكسيل</span>
                            </a>
                            <a
                                href={buildExportUrl('pdf')}
                                target="_blank"
                                rel="noreferrer"
                                className="h-12 px-5 rounded-[16px] bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500 hover:text-white border-2 border-rose-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                                title="تصدير PDF"
                            >
                                <Download className="w-5 h-5" />
                                <span className="hidden sm:inline">تصدير PDF</span>
                            </a>
                        </div>
                    }
                >
                    {data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                            <Users className="w-14 h-14 opacity-30" />
                            <p className="font-bold text-xl">لا توجد ديون مطابقة لخيارات البحث</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse min-w-[1100px]">
                                <thead>
                                    <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg sm:text-xl font-black uppercase">
                                        <th className="p-6 rounded-r-[18px]">اسم العميل</th>
                                        <th className="p-6">إجمالي الدين</th>
                                        <th className="p-6">جارية (0-30)</th>
                                        <th className="p-6">30-60 يوم</th>
                                        <th className="p-6">60-90 يوم</th>
                                        <th className="p-6">&gt; 90 يوم (حرج)</th>
                                        <th className="p-6 rounded-l-[18px] text-center">التفاصيل والحركات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-xl sm:text-2xl">
                                    {data.map(c => {
                                        const isExpanded = expanded.has(c.customer_id);
                                        return (
                                            <>
                                                <tr
                                                    key={c.customer_id}
                                                    onClick={() => toggleExpand(c.customer_id)}
                                                    className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer"
                                                >
                                                    <td className="p-6 text-slate-900 dark:text-white font-black">{c.customer_name}</td>
                                                    <td className="p-6 text-slate-900 dark:text-white font-black whitespace-nowrap">{fmt(c.total_debt)} د.ل</td>
                                                    <td className="p-6 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(c.current)}</td>
                                                    <td className="p-6 text-amber-500 whitespace-nowrap">{fmt(c.days_30_60)}</td>
                                                    <td className="p-6 text-orange-500 whitespace-nowrap">{fmt(c.days_60_90)}</td>
                                                    <td className="p-6 text-rose-500 whitespace-nowrap">{fmt(c.over_90)}</td>
                                                    <td className="p-6 text-center whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpand(c.customer_id);
                                                            }}
                                                            className={`px-6 py-3 rounded-[18px] border-2 font-black text-lg inline-flex items-center gap-3 shadow-md active:scale-95 transition-all cursor-pointer ${
                                                                isExpanded
                                                                    ? 'bg-primary text-white border-primary shadow-primary/20'
                                                                    : 'bg-primary/10 dark:bg-primary/20 text-primary border-primary/30 hover:bg-primary hover:text-white'
                                                            }`}
                                                        >
                                                            <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                            <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض الحركات'}</span>
                                                            <span className={`px-3 py-0.5 rounded-full text-sm font-black ${
                                                                isExpanded ? 'bg-white text-primary' : 'bg-primary text-white'
                                                            }`}>
                                                                {c.movements?.length || 0}
                                                            </span>
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Movements Table */}
                                                {isExpanded && (
                                                    <tr key={`${c.customer_id}-details`}>
                                                        <td colSpan={7} className="p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-900/60 border-y-2 border-slate-300 dark:border-slate-700">
                                                            <div className="p-6 sm:p-8 bg-white/90 dark:bg-slate-800/90 rounded-[28px] border-2 border-primary/30 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                                                                
                                                                {/* Summary Strip */}
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b-2 border-slate-200/80 dark:border-slate-700/80">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-16 h-16 rounded-[22px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-sm">
                                                                            <Users className="w-8 h-8" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                                                                كشف حساب العميل: <span className="text-primary">{c.customer_name}</span>
                                                                            </h4>
                                                                            <p className="text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                                                                                تفاصيل حركة الفواتير والتحصيلات والتسويات
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-4">
                                                                        <div className="px-6 py-3.5 rounded-[18px] bg-slate-100 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 flex flex-col">
                                                                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">إجمالي الفواتير</span>
                                                                            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{fmt(c.total_invoiced)} د.ل</span>
                                                                        </div>
                                                                        <div className="px-6 py-3.5 rounded-[18px] bg-slate-100 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 flex flex-col">
                                                                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">إجمالي المسدد</span>
                                                                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(c.total_paid)} د.ل</span>
                                                                        </div>
                                                                        <div className="px-6 py-3.5 rounded-[18px] bg-primary/10 border-2 border-primary/30 flex flex-col">
                                                                            <span className="text-xs font-black text-primary uppercase">الرصيد المتبقي</span>
                                                                            <span className="text-2xl font-black text-primary">{fmt(c.total_debt)} د.ل</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Movements Grid / Table */}
                                                                {(!c.movements || c.movements.length === 0) ? (
                                                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
                                                                        <History className="w-12 h-12 opacity-30" />
                                                                        <p className="font-bold text-xl">لا توجد حركات سابقة مسجلة لهذا العميل</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="overflow-x-auto rounded-[22px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
                                                                        <table className="w-full text-right border-collapse min-w-[850px]">
                                                                            <thead>
                                                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg sm:text-xl font-black uppercase">
                                                                                    <th className="p-5 rounded-r-[18px]">رقم المرجع</th>
                                                                                    <th className="p-5">نوع الحركة</th>
                                                                                    <th className="p-5">التاريخ</th>
                                                                                    <th className="p-5">المبلغ</th>
                                                                                    <th className="p-5">عمر الحركة</th>
                                                                                    <th className="p-5 rounded-l-[18px]">رصيد ما بعد الحركة</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 font-black text-xl sm:text-2xl">
                                                                                {c.movements.map((m, idx) => {
                                                                                    const cfg = typeConfig[m.type] || typeConfig.invoice;
                                                                                    return (
                                                                                        <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                                                            <td className="p-5 font-black text-primary flex items-center gap-2">
                                                                                                <FileText className="w-5 h-5 text-primary/70 shrink-0" />
                                                                                                <span>{m.ref}</span>
                                                                                            </td>
                                                                                            <td className="p-5 whitespace-nowrap">
                                                                                                <span className={`px-4 py-2 rounded-xl text-base font-black inline-flex items-center gap-2 ${cfg.class}`}>
                                                                                                    {cfg.label}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="p-5 text-slate-600 dark:text-slate-400 font-bold text-lg whitespace-nowrap">{m.date ? m.date.slice(0, 10) : '—'}</td>
                                                                                            <td className={`p-5 whitespace-nowrap ${cfg.amountClass}`}>
                                                                                                {m.amount > 0 ? '+' : ''}{fmt(m.amount)} <span className="text-base font-normal">د.ل</span>
                                                                                            </td>
                                                                                            <td className="p-5 text-slate-600 dark:text-slate-400 font-bold text-lg whitespace-nowrap">
                                                                                                {m.days_old !== null ? (
                                                                                                    <span className="inline-flex items-center gap-1.5">
                                                                                                        <Clock className="w-5 h-5 text-slate-400" />
                                                                                                        <span>{m.days_old} يوم</span>
                                                                                                    </span>
                                                                                                ) : '—'}
                                                                                            </td>
                                                                                            <td className="p-5 font-black text-slate-900 dark:text-white whitespace-nowrap">{fmt(m.balance)} <span className="text-base font-bold text-slate-400">د.ل</span></td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SpatialCard>

            </div>
        </AppShell>
    );
}
