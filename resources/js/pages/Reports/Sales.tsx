import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { TrendingUp, SlidersHorizontal, ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, ArrowUp, ArrowDown, Users } from 'lucide-react';

interface User           { id: number; name: string; }
interface Customer       { id: number; name: string; }
interface PaymentMethod  { id: number; name: string; }
interface Category       { id: number; name: string; }

interface DailyBreakdown  { date: string; total: number; count: number; }
interface MonthlyBreakdown { month: string; total: number; count: number; days: DailyBreakdown[]; }

interface Comparison {
    total_sales: number;
    invoices_count: number;
    diff_pct: number | null;
}

interface SalesData {
    totalSales: number;
    invoicesCount: number;
    avgInvoice: number;
    totalPaid: number;
    totalDue: number;
    daily: DailyBreakdown[];
    monthly: MonthlyBreakdown[];
    comparison: Comparison | null;
}

interface Props {
    users: User[];
    customers: Customer[];
    paymentMethods: PaymentMethod[];
    categories: Category[];
    filters: {
        dateFrom: string | null; dateTo: string | null;
        userId: number | null; customerId: number | null;
        paymentMethodId: number | null; categoryId: number | null;
        compare: boolean;
    };
    data: SalesData;
}

function fmt(n: number): string {
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Sales({ users, customers, paymentMethods, categories, filters, data }: Props) {
    const [filterOpen,       setFilterOpen]       = useState(false);
    const [dateFrom,         setDateFrom]         = useState(filters.dateFrom ?? '');
    const [dateTo,           setDateTo]           = useState(filters.dateTo ?? '');
    const [userId,           setUserId]           = useState(filters.userId ? String(filters.userId) : '');
    const [customerId,       setCustomerId]       = useState(filters.customerId ? String(filters.customerId) : '');
    const [paymentMethodId,  setPaymentMethodId]  = useState(filters.paymentMethodId ? String(filters.paymentMethodId) : '');
    const [categoryId,       setCategoryId]       = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [compare,          setCompare]          = useState(filters.compare ?? false);
    const [expanded,         setExpanded]         = useState<Set<string>>(new Set());

    function toggleExpand(month: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(month) ? next.delete(month) : next.add(month);
            return next;
        });
    }

    const hasFilter = dateFrom || dateTo || userId || customerId || paymentMethodId || categoryId || compare;

    function search() {
        router.get('/reports/sales', {
            date_from:          dateFrom          || undefined,
            date_to:            dateTo            || undefined,
            user_id:            userId            || undefined,
            customer_id:        customerId        || undefined,
            payment_method_id:  paymentMethodId   || undefined,
            category_id:        categoryId        || undefined,
            compare:            compare           || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setDateFrom(''); setDateTo(''); setUserId(''); setCustomerId('');
        setPaymentMethodId(''); setCategoryId(''); setCompare(false);
        router.get('/reports/sales', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        const params = new URLSearchParams();
        if (dateFrom)        params.set('date_from', dateFrom);
        if (dateTo)          params.set('date_to', dateTo);
        if (userId)          params.set('user_id', userId);
        if (customerId)      params.set('customer_id', customerId);
        if (paymentMethodId) params.set('payment_method_id', paymentMethodId);
        if (categoryId)      params.set('category_id', categoryId);
        return `/reports/sales/${format}?${params.toString()}`;
    }

    function buildCustomerInvoicesUrl(format?: 'excel' | 'pdf') {
        const params = new URLSearchParams();
        if (dateFrom)        params.set('date_from', dateFrom);
        if (dateTo)          params.set('date_to', dateTo);
        if (userId)          params.set('user_id', userId);
        if (customerId)      params.set('customer_id', customerId);
        if (paymentMethodId) params.set('payment_method_id', paymentMethodId);
        if (categoryId)      params.set('category_id', categoryId);
        if (format) return `/reports/sales/customer-invoices/${format}?${params.toString()}`;
        return `/reports/sales/customer-invoices?${params.toString()}`;
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo}   onChange={setDateTo} />
            <ModernSelect label="البائع" placeholder="الكل"
                options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                defaultValue={userId ? (users.find(u => String(u.id) === userId)?.name ?? '') : 'الكل'}
                onSelect={val => setUserId(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
            />
            <ModernSelect label="العميل" placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={customerId ? (customers.find(c => String(c.id) === customerId)?.name ?? '') : 'الكل'}
                onSelect={val => setCustomerId(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect label="وسيلة الدفع" placeholder="الكل"
                options={[{ label: 'الكل' }, ...paymentMethods.map(p => ({ label: p.name }))]}
                defaultValue={paymentMethodId ? (paymentMethods.find(p => String(p.id) === paymentMethodId)?.name ?? '') : 'الكل'}
                onSelect={val => setPaymentMethodId(val === 'الكل' ? '' : String(paymentMethods.find(p => p.name === val)?.id ?? ''))}
            />
            <ModernSelect label="التصنيف" placeholder="الكل"
                options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                defaultValue={categoryId ? (categories.find(c => String(c.id) === categoryId)?.name ?? '') : 'الكل'}
                onSelect={val => setCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
            />
            <div className="flex items-center gap-3 px-1">
                <button onClick={() => setCompare(p => !p)}
                    className={`w-11 h-6 rounded-full transition-all relative ${compare ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${compare ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-bold text-slate-600 dark:text-white/70">مقارنة مع الفترة السابقة</span>
            </div>
            <button onClick={search}
                className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> عرض التقرير
            </button>
            {hasFilter && (
                <button onClick={reset}
                    className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="تقرير المبيعات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تقرير المبيعات</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تحليل المبيعات اليومي والشهري والسنوي</p>
                </div>

                {/* Mobile Filter */}
                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)}
                        className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" /> فلترة
                            {hasFilter && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && (
                        <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <FilterPanel />
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    <div className="flex-1 min-w-0 flex flex-col gap-6">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">إجمالي المبيعات</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{fmt(data.totalSales)}</p>
                                {data.comparison && (
                                    <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${(data.comparison.diff_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {(data.comparison.diff_pct ?? 0) >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                        {data.comparison.diff_pct !== null ? `${Math.abs(data.comparison.diff_pct)}%` : '—'}
                                    </div>
                                )}
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد الفواتير</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{data.invoicesCount}</p>
                                {data.comparison && (
                                    <p className="text-xs font-bold text-slate-400 dark:text-white/30 mt-1">سابق: {data.comparison.invoices_count}</p>
                                )}
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">متوسط الفاتورة</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{fmt(data.avgInvoice)}</p>
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">المدفوع</p>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(data.totalPaid)}</p>
                            </div>
                            <div className="spatial-card p-4 flex flex-col gap-1">
                                <p className="text-xs font-black text-red-500 uppercase tracking-widest">المتبقي</p>
                                <p className="text-2xl font-black text-red-500">{fmt(data.totalDue)}</p>
                            </div>
                        </div>

                        {/* Export */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <a href={buildExportUrl('excel')} target="_blank"
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                <FileSpreadsheet className="w-4 h-4" /> Excel
                            </a>
                            <a href={buildExportUrl('pdf')} target="_blank"
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                <FileText className="w-4 h-4" /> PDF
                            </a>
                            <a href={buildCustomerInvoicesUrl()}
                                className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all font-bold text-sm">
                                <Users className="w-4 h-4" /> فواتير العملاء
                            </a>
                        </div>

                        {/* Daily Table */}
                        <SpatialCard title={`التفصيل الشهري (${data.monthly.length} شهر)`} icon={<TrendingUp className="w-4 h-4" />}>
                            {data.monthly.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <TrendingUp className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد بيانات</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[16px]">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                {['الشهر', 'عدد الفواتير', 'إجمالي المبيعات', ''].map(h => (
                                                    <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {data.monthly.map(m => (
                                                <>
                                                    <tr key={m.month} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{m.month}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-600 dark:text-white/60">{m.count}</td>
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{fmt(m.total)}</td>
                                                        <td className="px-4 py-4">
                                                            <button onClick={() => toggleExpand(m.month)}
                                                                className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors">
                                                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(m.month) ? 'rotate-90' : ''}`} />
                                                                تفاصيل
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {expanded.has(m.month) && (
                                                        <tr key={`${m.month}-detail`}>
                                                            <td colSpan={4} className="px-6 py-4 bg-black/2 dark:bg-white/2 rounded-[16px] my-2">
                                                                <table className="w-full text-[15px]">
                                                                    <thead>
                                                                        <tr className="border-b border-black/5 dark:border-white/5">
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">التاريخ</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">عدد الفواتير</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">إجمالي المبيعات</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                                        {m.days.map((d, i) => (
                                                                            <tr key={i} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                                                <td className="py-3 px-4 font-bold text-slate-600 dark:text-white/60">{d.date}</td>
                                                                                <td className="py-3 px-4 font-bold text-slate-500 dark:text-white/50">{d.count}</td>
                                                                                <td className="py-3 px-4 font-black text-slate-800 dark:text-white">{fmt(d.total)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-black/10 dark:border-white/10">
                                                <td className="px-4 py-4 font-black text-slate-500 dark:text-white/40 text-xs uppercase">الإجمالي</td>
                                                <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{data.invoicesCount}</td>
                                                <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{fmt(data.totalSales)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </SpatialCard>
                    </div>

                    {/* Desktop Filter */}
                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
