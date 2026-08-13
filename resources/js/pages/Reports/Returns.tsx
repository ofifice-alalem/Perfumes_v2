import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import {
    RotateCcw,
    SlidersHorizontal,
    ChevronRight,
    Search,
    FileSpreadsheet,
    FileText,
    List,
    Package,
    X,
    Filter,
    ArrowUpRight,
    Calendar,
    User as UserIcon,
    Users,
    Truck,
    FolderTree,
    TrendingDown,
    Percent
} from 'lucide-react';

interface User     { id: number; name: string; }
interface Customer { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface DailyBreakdown   { date: string; total: number; count: number; }
interface MonthlyBreakdown { month: string; total: number; count: number; days: DailyBreakdown[]; }

interface ReturnsData {
    customerReturnsTotal: number; customerReturnsCount: number;
    supplierReturnsTotal: number; supplierReturnsCount: number;
    totalSales: number; returnRate: number | null;
    customerMonthly: MonthlyBreakdown[];
    supplierMonthly: MonthlyBreakdown[];
}

interface Props {
    users: User[]; customers: Customer[]; suppliers: Supplier[]; categories: Category[]; products: { id: number; name: string; }[];
    filters: { dateFrom: string | null; dateTo: string | null; userId: number | null; customerId: number | null; supplierId: number | null; categoryId: number | null; productIds?: number[]; searchName?: string; };
    data: ReturnsData;
    includedProducts?: { id: number; name: string; }[];
}

function fmt(n: number): string {
    return n % 1 === 0
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MonthlyTable({ monthly, label, color }: { monthly: MonthlyBreakdown[]; label: string; color: 'red' | 'amber' }) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    function toggle(m: string) {
        setExpanded(prev => {
            const n = new Set(prev);
            n.has(m) ? n.delete(m) : n.add(m);
            return n;
        });
    }

    const headerCls = color === 'red'
        ? 'bg-red-500/10 border-b-2 border-red-500/20 text-red-700 dark:text-red-400'
        : 'bg-amber-500/10 border-b-2 border-amber-500/20 text-amber-700 dark:text-amber-400';

    return (
        <SpatialCard
            title={`${label} (${monthly.length} شهر)`}
            icon={<RotateCcw className={`w-5 h-5 ${color === 'red' ? 'text-red-500' : 'text-amber-500'}`} />}
        >
            {monthly.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30 gap-2">
                    <RotateCcw className="w-12 h-12 opacity-30" />
                    <p className="font-black text-base">لا توجد بيانات مرتجعات</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-[16px] border border-slate-200/80 dark:border-slate-800">
                    <table className="w-full text-right text-base sm:text-lg">
                        <thead>
                            <tr className={headerCls}>
                                <th className="px-5 py-4 font-black uppercase tracking-wider">الشهر</th>
                                <th className="px-5 py-4 font-black uppercase tracking-wider">العدد</th>
                                <th className="px-5 py-4 font-black uppercase tracking-wider">الإجمالي</th>
                                <th className="px-5 py-4 w-28 text-center">التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                            {monthly.map(m => {
                                const isExp = expanded.has(m.month);
                                return (
                                    <tr key={m.month} className="contents group">
                                        <td colSpan={4} className="p-0">
                                            <div
                                                onClick={() => toggle(m.month)}
                                                className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${
                                                    isExp
                                                        ? color === 'red' ? 'bg-red-500/5 dark:bg-red-500/10' : 'bg-amber-500/5 dark:bg-amber-500/10'
                                                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                                                }`}
                                            >
                                                <div className="flex-1 font-black text-slate-900 dark:text-white text-lg">
                                                    {m.month}
                                                </div>
                                                <div className="w-24 font-bold text-slate-600 dark:text-slate-300">
                                                    {m.count} مرتجع
                                                </div>
                                                <div className={`w-36 font-black text-lg ${color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {fmt(m.total)}
                                                </div>
                                                <div className="w-24 flex justify-center">
                                                    <button
                                                        type="button"
                                                        className="w-10 h-10 rounded-[14px] bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white transition-all active:scale-95"
                                                    >
                                                        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExp ? 'rotate-90' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            {isExp && (
                                                <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                                                    <table className="w-full text-right text-sm sm:text-base">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black">
                                                                <th className="py-2.5 px-4">التاريخ</th>
                                                                <th className="py-2.5 px-4">عدد العمليات</th>
                                                                <th className="py-2.5 px-4">الإجمالي</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                                            {m.days.map((d, i) => (
                                                                <tr key={i} className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                                                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{d.date}</td>
                                                                    <td className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400">{d.count}</td>
                                                                    <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{fmt(d.total)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 font-black">
                                <td className="px-5 py-4 text-slate-700 dark:text-slate-200">الإجمالي الشامل</td>
                                <td className="px-5 py-4 text-slate-900 dark:text-white">{monthly.reduce((s, m) => s + m.count, 0)}</td>
                                <td className={`px-5 py-4 text-xl ${color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {fmt(monthly.reduce((s, m) => s + m.total, 0))}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </SpatialCard>
    );
}

export default function Returns({ users, customers, suppliers, categories, products, filters, data, includedProducts }: Props) {
    const [drawerOpen, setDrawerOpen]   = useState(false);
    const [mounted, setMounted]         = useState(false);
    const [dateFrom, setDateFrom]       = useState(filters.dateFrom ?? '');
    const [dateTo, setDateTo]           = useState(filters.dateTo ?? '');
    const [userId, setUserId]           = useState(filters.userId ? String(filters.userId) : '');
    const [customerId, setCustomerId]   = useState(filters.customerId ? String(filters.customerId) : '');
    const [supplierId, setSupplierId]   = useState(filters.supplierId ? String(filters.supplierId) : '');
    const [categoryId, setCategoryId]   = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [multiSearch, setMultiSearch] = useState<string[]>([
        ...(filters.productIds?.map(String) || []),
        ...(filters.searchName ? filters.searchName.split(',') : [])
    ]);

    useEffect(() => { setMounted(true); }, []);

    const activeFilterCount = [
        dateFrom,
        dateTo,
        userId,
        customerId,
        supplierId,
        categoryId,
        multiSearch.length > 0
    ].filter(Boolean).length;

    function buildParams() {
        const p: Record<string, string> = {};
        if (dateFrom)   p.date_from   = dateFrom;
        if (dateTo)     p.date_to     = dateTo;
        if (userId)     p.user_id     = userId;
        if (customerId) p.customer_id = customerId;
        if (supplierId) p.supplier_id = supplierId;
        if (categoryId) p.category_id = categoryId;
        const prodIds = multiSearch.filter(s => !isNaN(Number(s)));
        const sName   = multiSearch.filter(s => isNaN(Number(s))).join(',');
        if (prodIds.length > 0) p.product_ids = prodIds.join(',');
        if (sName) p.search_name = sName;
        return p;
    }

    function handleSearch() {
        setDrawerOpen(false);
        router.get('/reports/returns', buildParams(), { preserveScroll: true });
    }

    function handleReset() {
        setDateFrom('');
        setDateTo('');
        setUserId('');
        setCustomerId('');
        setSupplierId('');
        setCategoryId('');
        setMultiSearch([]);
        setDrawerOpen(false);
        router.get('/reports/returns', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        return `/reports/returns/${format}?${new URLSearchParams(buildParams()).toString()}`;
    }

    const FilterControls = () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
            </div>

            <ModernMultiSelect
                label="المنتجات"
                placeholder="الكل"
                options={products.map(p => ({ label: p.name, value: String(p.id), searchKey: p.name }))}
                defaultValues={multiSearch}
                onSelect={setMultiSearch}
                allowFreeText={true}
            />

            <div className="flex flex-col gap-4">
                <ModernSelect
                    label="المستخدم"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                    defaultValue={userId ? (users.find(u => String(u.id) === userId)?.name ?? '') : 'الكل'}
                    onSelect={val => setUserId(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
                />

                <ModernSelect
                    label="العميل"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                    defaultValue={customerId ? (customers.find(c => String(c.id) === customerId)?.name ?? '') : 'الكل'}
                    onSelect={val => setCustomerId(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
                />

                <ModernSelect
                    label="المورد"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...suppliers.map(s => ({ label: s.name }))]}
                    defaultValue={supplierId ? (suppliers.find(s => String(s.id) === supplierId)?.name ?? '') : 'الكل'}
                    onSelect={val => setSupplierId(val === 'الكل' ? '' : String(suppliers.find(s => s.name === val)?.id ?? ''))}
                />

                <ModernSelect
                    label="التصنيف"
                    placeholder="الكل"
                    options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                    defaultValue={categoryId ? (categories.find(c => String(c.id) === categoryId)?.name ?? '') : 'الكل'}
                    onSelect={val => setCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
                />
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t-2 border-slate-200/60 dark:border-slate-800/60">
                <button
                    onClick={handleSearch}
                    className="w-full h-14 rounded-[18px] bg-primary text-white font-black text-base shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                    <Search className="w-5 h-5" /> عرض التقرير
                </button>
                {activeFilterCount > 0 && (
                    <button
                        onClick={handleReset}
                        className="w-full h-12 rounded-[16px] bg-slate-200/70 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 font-black text-sm active:scale-98 transition-all cursor-pointer"
                    >
                        إعادة تعيين الفلاتر
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <AppShell pageTitle="تقرير المرتجعات">
            <div className="flex flex-col gap-6 pb-24">

                {/* Top Header Banner */}
                <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="flex items-center gap-5 z-10">
                        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-red-500/20 to-amber-500/20 border-2 border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
                            <RotateCcw className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    تقرير المرتجعات
                                </h1>
                                {activeFilterCount > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs border border-primary/20">
                                        {activeFilterCount} فلتر نشط
                                    </span>
                                )}
                            </div>
                            <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                                تحليل مرتجعات العملاء والموردين ومقارنتها بالمبيعات الإجمالية
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto z-10">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="flex-1 md:flex-none h-14 px-7 rounded-[20px] bg-primary text-white font-black text-base shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                            <span>تصفية المرتجعات</span>
                            {activeFilterCount > 0 && (
                                <span className="w-6 h-6 rounded-full bg-white text-primary text-xs font-black flex items-center justify-center shadow">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Returns Card */}
                    <div className="spatial-card p-6 border-r-4 border-r-red-500 flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                                مرتجعات العملاء
                            </span>
                            <RotateCcw className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <div className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-400 tracking-tight">
                                {fmt(data.customerReturnsTotal)}
                            </div>
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                                {data.customerReturnsCount} حالة مرتجع عميل
                            </div>
                        </div>
                    </div>

                    {/* Supplier Returns Card */}
                    <div className="spatial-card p-6 border-r-4 border-r-amber-500 flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
                                مرتجعات الموردين
                            </span>
                            <Truck className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                {fmt(data.supplierReturnsTotal)}
                            </div>
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                                {data.supplierReturnsCount} حالة مرتجع مورد
                            </div>
                        </div>
                    </div>

                    {/* Total Sales & Return Rate Card */}
                    <div className="spatial-card p-6 border-r-4 border-r-primary flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                                إجمالي المبيعات والنسبة
                            </span>
                            <Percent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {fmt(data.totalSales)}
                            </div>
                            {data.returnRate !== null && (
                                <div className="mt-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                                        data.returnRate > 10
                                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                            : data.returnRate > 5
                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    }`}>
                                        <TrendingDown className="w-3.5 h-3.5" />
                                        نسبة المرتجعات: {data.returnRate}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Export & Details Bar */}
                <div className="spatial-card p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <a
                            href={buildExportUrl('excel')}
                            target="_blank"
                            rel="noreferrer"
                            className="h-12 px-6 rounded-[16px] bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-sm flex items-center gap-2.5 active:scale-95"
                        >
                            <FileSpreadsheet className="w-5 h-5" /> تصدير Excel
                        </a>
                        <a
                            href={buildExportUrl('pdf')}
                            target="_blank"
                            rel="noreferrer"
                            className="h-12 px-6 rounded-[16px] bg-red-500/10 border-2 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-sm flex items-center gap-2.5 active:scale-95"
                        >
                            <FileText className="w-5 h-5" /> تصدير PDF
                        </a>
                    </div>

                    <a
                        href={`/reports/returns/details?${new URLSearchParams(buildParams()).toString()}`}
                        className="h-12 px-6 rounded-[16px] bg-primary/10 border-2 border-primary/30 text-primary hover:bg-primary hover:text-white transition-all font-black text-sm flex items-center gap-2.5 active:scale-95"
                    >
                        <List className="w-5 h-5" />
                        <span>التقرير التفصيلي للمرتجعات</span>
                        <ArrowUpRight className="w-4 h-4" />
                    </a>
                </div>

                {/* Included Products Tags (if any) */}
                {includedProducts && includedProducts.length > 0 && (
                    <SpatialCard title={`المنتجات المشمولة في التقرير (${includedProducts.length})`} icon={<Package className="w-5 h-5 text-primary" />}>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                            {includedProducts.map(p => (
                                <span
                                    key={p.id}
                                    className="px-4 py-2 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-slate-700"
                                >
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </SpatialCard>
                )}

                {/* Tables Breakdown */}
                <div className="grid grid-cols-1 gap-6">
                    <MonthlyTable monthly={data.customerMonthly} label="مرتجعات العملاء الشهرية" color="red" />
                    <MonthlyTable monthly={data.supplierMonthly} label="مرتجعات الموردين الشهرية" color="amber" />
                </div>
            </div>

            {/* Filter Drawer Portal */}
            {mounted && drawerOpen && createPortal(
                <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col">
                            {/* Drawer Header */}
                            <div className="px-6 sm:px-8 py-6 border-b-2 border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[22px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-md">
                                        <RotateCcw className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">تصفية المرتجعات</h3>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                            تحديد الفترات والمنتجات والأشخاص
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="w-14 h-14 rounded-[20px] bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer border-2 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                                >
                                    <X className="w-7 h-7" />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                                <FilterControls />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AppShell>
    );
}
