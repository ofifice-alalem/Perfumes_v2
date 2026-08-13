import { router } from '@inertiajs/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import {
    ShoppingBag,
    SlidersHorizontal,
    ChevronRight,
    Search,
    FileSpreadsheet,
    FileText,
    ArrowUp,
    ArrowDown,
    Truck,
    Package,
    X,
    RotateCcw,
    Download,
    Calendar,
    Receipt,
    Wallet
} from 'lucide-react';

interface User     { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface DailyBreakdown   { date: string; total: number; count: number; }
interface MonthlyBreakdown { month: string; total: number; count: number; days: DailyBreakdown[]; }
interface Comparison { total_purchases: number; purchases_count: number; diff_pct: number | null; }

interface PurchasesData {
    totalPurchases: number; purchasesCount: number; avgPurchase: number;
    totalPaid: number; totalDue: number;
    monthly: MonthlyBreakdown[]; comparison: Comparison | null;
}

interface Props {
    users: User[]; suppliers: Supplier[]; categories: Category[]; products: { id: number; name: string; }[];
    filters: { dateFrom: string | null; dateTo: string | null; userId: number | null; supplierId: number | null; categoryId: number | null; compare: boolean; productIds?: number[]; searchName?: string; };
    data: PurchasesData;
    includedProducts?: { id: number; name: string; }[];
}

function fmt(n: number | null | undefined): string {
    if (n === null || n === undefined) return '—';
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* =========================================================================
   RIGHT FILTER DRAWER
   ========================================================================= */
function FilterDrawer({
    isOpen,
    onClose,
    users,
    suppliers,
    categories,
    products,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    userId,
    setUserId,
    supplierId,
    setSupplierId,
    categoryId,
    setCategoryId,
    multiSearch,
    setMultiSearch,
    compare,
    setCompare,
    onSearch,
    onReset
}: {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    suppliers: Supplier[];
    categories: Category[];
    products: { id: number; name: string; }[];
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    userId: string;
    setUserId: (v: string) => void;
    supplierId: string;
    setSupplierId: (v: string) => void;
    categoryId: string;
    setCategoryId: (v: string) => void;
    multiSearch: string[];
    setMultiSearch: (v: string[]) => void;
    compare: boolean;
    setCompare: (fn: (p: boolean) => boolean) => void;
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
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">خيارات تصفية المشتريات</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                تحديد الفترات، الموردين، المستخدمين، والمنتجات
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

                    {/* Date Filters */}
                    <div className="flex flex-col gap-5">
                        <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                        <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                    </div>

                    {/* Product Search */}
                    <ModernMultiSelect
                        label="المنتجات"
                        placeholder="الكل"
                        options={products.map(p => ({ label: p.name, value: String(p.id), searchKey: p.name }))}
                        defaultValues={multiSearch}
                        onSelect={setMultiSearch}
                        allowFreeText={true}
                    />

                    {/* Select Dropdowns Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t-2 border-slate-200/60 dark:border-slate-800/60">
                        <ModernSelect
                            label="المستخدم"
                            placeholder="الكل"
                            options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                            defaultValue={userId ? (users.find(u => String(u.id) === userId)?.name ?? '') : 'الكل'}
                            onSelect={val => setUserId(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
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

                    {/* Compare Section */}
                    <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-slate-100/70 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700/60 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">خيارات المقارنة والتحليل</h4>
                        </div>

                        <div
                            onClick={() => setCompare(p => !p)}
                            className="flex items-center justify-between p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 cursor-pointer active:scale-98 transition-all select-none shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="w-5 h-5 text-primary" />
                                <span className="text-base font-black text-slate-800 dark:text-slate-200">مقارنة مع الفترة السابقة</span>
                            </div>
                            <div className={`w-14 h-8 rounded-full transition-all relative p-1 ${compare ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${compare ? 'translate-x-0' : '-translate-x-6'}`} />
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
   MAIN PURCHASES REPORT PAGE
   ========================================================================= */
export default function Purchases({ users, suppliers, categories, products, filters, data, includedProducts }: Props) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [dateFrom,    setDateFrom]    = useState(filters.dateFrom ?? '');
    const [dateTo,      setDateTo]      = useState(filters.dateTo ?? '');
    const [userId,      setUserId]      = useState(filters.userId ? String(filters.userId) : '');
    const [supplierId,  setSupplierId]  = useState(filters.supplierId ? String(filters.supplierId) : '');
    const [categoryId,  setCategoryId]  = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [multiSearch, setMultiSearch] = useState<string[]>([
        ...(filters.productIds?.map(String) || []),
        ...(filters.searchName ? filters.searchName.split(',') : [])
    ]);
    const [compare,     setCompare]     = useState(filters.compare ?? false);
    const [expanded,    setExpanded]    = useState<Set<string>>(new Set());

    const activeFilterCount =
        (dateFrom ? 1 : 0) +
        (dateTo ? 1 : 0) +
        (userId ? 1 : 0) +
        (supplierId ? 1 : 0) +
        (categoryId ? 1 : 0) +
        (multiSearch.length > 0 ? 1 : 0) +
        (compare ? 1 : 0);

    function toggleExpand(month: string) {
        setExpanded(prev => { const n = new Set(prev); n.has(month) ? n.delete(month) : n.add(month); return n; });
    }

    function search() {
        const prodIds = multiSearch.filter(s => !isNaN(Number(s)));
        const sName   = multiSearch.filter(s => isNaN(Number(s))).join(',');
        router.get('/reports/purchases', {
            date_from:   dateFrom    || undefined,
            date_to:     dateTo      || undefined,
            user_id:     userId      || undefined,
            supplier_id: supplierId  || undefined,
            category_id: categoryId  || undefined,
            product_ids: prodIds.length > 0 ? prodIds.join(',') : undefined,
            search_name: sName       || undefined,
            compare:     compare     || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setDateFrom(''); setDateTo(''); setUserId(''); setSupplierId(''); setCategoryId(''); setMultiSearch([]); setCompare(false);
        router.get('/reports/purchases', {}, { preserveScroll: true });
    }

    function buildParams() {
        const p: Record<string, string> = {};
        if (dateFrom)   p.date_from   = dateFrom;
        if (dateTo)     p.date_to     = dateTo;
        if (userId)     p.user_id     = userId;
        if (supplierId) p.supplier_id = supplierId;
        if (categoryId) p.category_id = categoryId;
        const prodIds = multiSearch.filter(s => !isNaN(Number(s)));
        const sName   = multiSearch.filter(s => isNaN(Number(s))).join(',');
        if (prodIds.length > 0) p.product_ids = prodIds.join(',');
        if (sName) p.search_name = sName;
        return p;
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        return `/reports/purchases/${format}?${new URLSearchParams(buildParams()).toString()}`;
    }

    function buildSupplierInvoicesUrl() {
        return `/reports/purchases/supplier-invoices?${new URLSearchParams(buildParams()).toString()}`;
    }

    return (
        <AppShell pageTitle="تقرير المشتريات">
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                تقرير المشتريات
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                تحليل حركة المشتريات اليومي والشهري ومتابعة الأداء مع الموردين
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
                    users={users}
                    suppliers={suppliers}
                    categories={categories}
                    products={products}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    userId={userId}
                    setUserId={setUserId}
                    supplierId={supplierId}
                    setSupplierId={setSupplierId}
                    categoryId={categoryId}
                    setCategoryId={setCategoryId}
                    multiSearch={multiSearch}
                    setMultiSearch={setMultiSearch}
                    compare={compare}
                    setCompare={setCompare}
                    onSearch={search}
                    onReset={reset}
                />

                {/* Included Products Tag Card */}
                {includedProducts && includedProducts.length > 0 && (
                    <SpatialCard
                        headerDot={false}
                        title={`المنتجات المشمولة في الحساب (${includedProducts.length})`}
                        icon={<Package className="w-6 h-6 text-primary" />}
                    >
                        <div className="flex flex-wrap gap-3 p-2">
                            {includedProducts.map(p => (
                                <span key={p.id} className="px-5 py-2.5 rounded-[16px] bg-primary/15 text-primary dark:text-primary-light text-base font-black border-2 border-primary/30 shadow-sm">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </SpatialCard>
                )}

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {/* Total Purchases */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-slate-200 dark:border-slate-700 col-span-2 md:col-span-1">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجمالي المشتريات</span>
                            {data.comparison && (
                                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${(data.comparison.diff_pct ?? 0) >= 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}>
                                    {(data.comparison.diff_pct ?? 0) >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                                    {data.comparison.diff_pct !== null ? `${Math.abs(data.comparison.diff_pct)}%` : '—'}
                                </div>
                            )}
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                            {fmt(data.totalPurchases)} <span className="text-base font-bold">د.ل</span>
                        </span>
                    </SpatialCard>

                    {/* Purchases Count */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-blue-500/30 bg-blue-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">عدد الفواتير</span>
                            <Receipt className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">{data.purchasesCount}</span>
                            {data.comparison && (
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">سابق: {data.comparison.purchases_count}</p>
                            )}
                        </div>
                    </SpatialCard>

                    {/* Average Purchase */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-purple-500/30 bg-purple-500/5">
                        <span className="text-sm font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">متوسط الفاتورة</span>
                        <span className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400">{fmt(data.avgPurchase)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>

                    {/* Total Paid */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">المدفوع</span>
                            <Wallet className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">{fmt(data.totalPaid)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>

                    {/* Total Due */}
                    <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-rose-500/30 bg-rose-500/5">
                        <span className="text-sm font-black text-rose-500 uppercase tracking-wider">المتبقي للموردين</span>
                        <span className="text-3xl sm:text-4xl font-black text-rose-500">{fmt(data.totalDue)} <span className="text-base font-bold">د.ل</span></span>
                    </SpatialCard>
                </div>

                {/* Table Card */}
                <SpatialCard
                    headerDot={false}
                    title={`جدول حركة المشتريات الشهرية (${data.monthly.length} شهر)`}
                    icon={<ShoppingBag className="w-7 h-7 text-primary" />}
                    action={
                        <div className="flex items-center gap-3 flex-wrap">
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
                            <a
                                href={buildSupplierInvoicesUrl()}
                                className="h-12 px-5 rounded-[16px] bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500 hover:text-white border-2 border-blue-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                                title="فواتير الموردين"
                            >
                                <Truck className="w-5 h-5" />
                                <span className="hidden sm:inline">فواتير الموردين</span>
                            </a>
                        </div>
                    }
                >
                    {data.monthly.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                            <ShoppingBag className="w-14 h-14 opacity-30" />
                            <p className="font-bold text-xl">لا توجد مشتريات مطابقة لخيارات البحث</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg sm:text-xl font-black uppercase">
                                        <th className="p-6 rounded-r-[18px]">الشهر</th>
                                        <th className="p-6">عدد الفواتير</th>
                                        <th className="p-6">إجمالي المشتريات</th>
                                        <th className="p-6 rounded-l-[18px] text-center">التفاصيل اليومية</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-xl sm:text-2xl">
                                    {data.monthly.map(m => {
                                        const isExpanded = expanded.has(m.month);
                                        return (
                                            <>
                                                <tr
                                                    key={m.month}
                                                    onClick={() => toggleExpand(m.month)}
                                                    className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer"
                                                >
                                                    <td className="p-6 text-slate-900 dark:text-white font-black">{m.month}</td>
                                                    <td className="p-6 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">{m.count} فاتورة</td>
                                                    <td className="p-6 text-slate-900 dark:text-white font-black whitespace-nowrap">{fmt(m.total)} د.ل</td>
                                                    <td className="p-6 text-center whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpand(m.month);
                                                            }}
                                                            className={`px-6 py-3 rounded-[18px] border-2 font-black text-lg inline-flex items-center gap-3 shadow-md active:scale-95 transition-all cursor-pointer ${
                                                                isExpanded
                                                                    ? 'bg-primary text-white border-primary shadow-primary/20'
                                                                    : 'bg-primary/10 dark:bg-primary/20 text-primary border-primary/30 hover:bg-primary hover:text-white'
                                                            }`}
                                                        >
                                                            <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                            <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
                                                            <span className={`px-3 py-0.5 rounded-full text-sm font-black ${
                                                                isExpanded ? 'bg-white text-primary' : 'bg-primary text-white'
                                                            }`}>
                                                                {m.days?.length || 0}
                                                            </span>
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Daily Breakdown Sub-Table */}
                                                {isExpanded && (
                                                    <tr key={`${m.month}-details`}>
                                                        <td colSpan={4} className="p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-900/60 border-y-2 border-slate-300 dark:border-slate-700">
                                                            <div className="p-6 sm:p-8 bg-white/90 dark:bg-slate-800/90 rounded-[28px] border-2 border-primary/30 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">

                                                                {/* Summary Strip */}
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b-2 border-slate-200/80 dark:border-slate-700/80">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-16 h-16 rounded-[22px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-sm">
                                                                            <Calendar className="w-8 h-8" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                                                                تفاصيل حركة المشتريات لشهر: <span className="text-primary">{m.month}</span>
                                                                            </h4>
                                                                            <p className="text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                                                                                التوزيع اليومي للمشتريات وعدد الفواتير المنفذة
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-4">
                                                                        <div className="px-6 py-3.5 rounded-[18px] bg-slate-100 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 flex flex-col">
                                                                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">إجمالي الفواتير</span>
                                                                            <span className="text-2xl font-black text-slate-900 dark:text-white">{m.count} فاتورة</span>
                                                                        </div>
                                                                        <div className="px-6 py-3.5 rounded-[18px] bg-primary/10 border-2 border-primary/30 flex flex-col">
                                                                            <span className="text-xs font-black text-primary uppercase">إجمالي المشتريات</span>
                                                                            <span className="text-2xl font-black text-primary">{fmt(m.total)} د.ل</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Daily Table */}
                                                                {(!m.days || m.days.length === 0) ? (
                                                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
                                                                        <Calendar className="w-12 h-12 opacity-30" />
                                                                        <p className="font-bold text-xl">لا توجد بيانات تفصيلية لهذا الشهر</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="overflow-x-auto rounded-[22px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
                                                                        <table className="w-full text-right border-collapse min-w-[700px]">
                                                                            <thead>
                                                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-lg sm:text-xl font-black uppercase">
                                                                                    <th className="p-5 rounded-r-[18px]">التاريخ</th>
                                                                                    <th className="p-5">عدد الفواتير</th>
                                                                                    <th className="p-5 rounded-l-[18px]">إجمالي مشتريات اليوم</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 font-black text-xl sm:text-2xl">
                                                                                {m.days.map((d, idx) => (
                                                                                    <tr key={idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                                                        <td className="p-5 text-slate-900 dark:text-white font-black whitespace-nowrap">{d.date}</td>
                                                                                        <td className="p-5 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">{d.count} فاتورة</td>
                                                                                        <td className="p-5 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(d.total)} <span className="text-base font-bold text-slate-400">د.ل</span></td>
                                                                                    </tr>
                                                                                ))}
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
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-black text-xl sm:text-2xl">
                                        <td className="p-6 text-slate-900 dark:text-white">الإجمالي الكلي</td>
                                        <td className="p-6 text-slate-900 dark:text-white">{data.purchasesCount} فاتورة</td>
                                        <td className="p-6 text-primary">{fmt(data.totalPurchases)} د.ل</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </SpatialCard>

            </div>
        </AppShell>
    );
}
