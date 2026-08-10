import { router } from '@inertiajs/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import {
    BarChart2,
    SlidersHorizontal,
    Search,
    FileSpreadsheet,
    FileText,
    AlertTriangle,
    CheckCircle,
    XCircle,
    X,
    RotateCcw,
    Download
} from 'lucide-react';

interface Category { id: number; name: string; }
interface Product { id: number; name: string; stock: string; category: { id: number; name: string; unit: string; }; }

interface ProductStock {
    id: number;
    name: string;
    category: string;
    unit: string;
    selling_type: string;
    tier: string | null;
    stock: number;
    min_stock: number;
    status: 'ok' | 'warning' | 'critical';
    last_purchase_cost: number | null;
    avg_purchase_cost: number | null;
    last_sale_price: number | null;
    avg_sale_price: number | null;
    total_sold: number | null;
    total_wasted: number | null;
    total_return_in: number | null;
    avg_return_in_price: number | null;
    total_return_out: number | null;
    avg_return_out_price: number | null;
    total_purchased: number | null;
    net_sale_qty: number | null;
    profit: number | null;
}

interface Props {
    categories: Category[];
    products: Product[];
    filters: { categoryId: number | null; sellingType: string; lowStockOnly: boolean; showSold: boolean; showWasted: boolean; showPurchased?: boolean; dateFrom: string; dateTo: string; productIds?: number[]; searchName?: string };
    data: ProductStock[];
}

const statusConfig = {
    ok:       { label: 'جيد',    bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30', icon: <CheckCircle className="w-4 h-4" /> },
    warning:  { label: 'تحذير',  bg: 'bg-amber-500/15',   text: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-500/30',   icon: <AlertTriangle className="w-4 h-4" /> },
    critical: { label: 'حرج',    bg: 'bg-rose-500/15',    text: 'text-rose-700 dark:text-rose-300',       border: 'border-rose-500/30',    icon: <XCircle className="w-4 h-4" /> },
};

function fmt(n: number | null): string {
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
    categories,
    products,
    categoryId,
    setCategoryId,
    lowStockOnly,
    setLowStockOnly,
    showSold,
    setShowSold,
    showWasted,
    setShowWasted,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    multiSearch,
    setMultiSearch,
    onSearch,
    onReset
}: {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    products: Product[];
    categoryId: string;
    setCategoryId: (v: string) => void;
    lowStockOnly: boolean;
    setLowStockOnly: (fn: (p: boolean) => boolean) => void;
    showSold: boolean;
    setShowSold: (fn: (p: boolean) => boolean) => void;
    showWasted: boolean;
    setShowWasted: (fn: (p: boolean) => boolean) => void;
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    multiSearch: string[];
    setMultiSearch: (v: string[]) => void;
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
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">خيارات الفلترة والتصنيف</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                تصفية حالة المخزون والمنتجات
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
                    {/* Row 1: Product MultiSelect + Category side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <ModernMultiSelect
                            label="الفلترة بالمنتج (متعدد / كلمات)"
                            placeholder="اختر منتجات أو اكتب للبحث..."
                            options={products.map(p => ({
                                value: String(p.id),
                                label: p.name,
                                searchKey: p.name
                            }))}
                            defaultValues={multiSearch}
                            onSelect={setMultiSearch}
                            allowFreeText={true}
                        />

                        <ModernSelect
                            label="التصنيف"
                            placeholder="الكل"
                            options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                            defaultValue={categoryId ? (categories.find(c => String(c.id) === categoryId)?.name ?? '') : 'الكل'}
                            onSelect={val => setCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
                        />
                    </div>

                    {/* Stacked Dates */}
                    <div className="flex flex-col gap-5 pt-2 border-t-2 border-slate-200/60 dark:border-slate-800/60">
                        <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                        <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                    </div>

                    {/* Dedicated Section: Additional Options & Alerts */}
                    <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-slate-100/70 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700/60 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">الخيارات الإضافية والتنبيهات</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                            <div
                                onClick={() => setLowStockOnly(p => !p)}
                                className="flex items-center justify-between p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 cursor-pointer active:scale-98 transition-all select-none shadow-sm"
                            >
                                <span className="text-base font-black text-slate-800 dark:text-slate-200">تحت الحد الأدنى فقط</span>
                                <div className={`w-14 h-8 rounded-full transition-all relative p-1 ${lowStockOnly ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${lowStockOnly ? 'translate-x-0' : '-translate-x-6'}`} />
                                </div>
                            </div>

                            <div
                                onClick={() => setShowSold(p => !p)}
                                className="flex items-center justify-between p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 cursor-pointer active:scale-98 transition-all select-none shadow-sm"
                            >
                                <span className="text-base font-black text-slate-800 dark:text-slate-200">إظهار إجمالي المبيع</span>
                                <div className={`w-14 h-8 rounded-full transition-all relative p-1 ${showSold ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${showSold ? 'translate-x-0' : '-translate-x-6'}`} />
                                </div>
                            </div>

                            <div
                                onClick={() => setShowWasted(p => !p)}
                                className="flex items-center justify-between p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 cursor-pointer active:scale-98 transition-all select-none shadow-sm"
                            >
                                <span className="text-base font-black text-slate-800 dark:text-slate-200">إظهار إجمالي التالف</span>
                                <div className={`w-14 h-8 rounded-full transition-all relative p-1 ${showWasted ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${showWasted ? 'translate-x-0' : '-translate-x-6'}`} />
                                </div>
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
   MAIN STOCK STATUS PAGE
   ========================================================================= */
export default function StockStatus({ categories, products, filters, data }: Props) {
    const [isFilterOpen,  setIsFilterOpen]  = useState(false);
    const [categoryId,    setCategoryId]    = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [sellingType,   setSellingType]   = useState(filters.sellingType ?? '');
    const [lowStockOnly,  setLowStockOnly]  = useState(filters.lowStockOnly ?? false);
    const [showSold,      setShowSold]      = useState(filters.showSold ?? false);
    const [showWasted,    setShowWasted]    = useState(filters.showWasted ?? false);
    const [dateFrom,      setDateFrom]      = useState(filters.dateFrom ?? '');
    const [dateTo,        setDateTo]        = useState(filters.dateTo ?? '');
    const [multiSearch,   setMultiSearch]   = useState<string[]>(() => {
        let arr: string[] = [];
        if (filters.productIds) arr.push(...filters.productIds.map(String));
        if (filters.searchName) {
            const splitted = filters.searchName.split(',').filter(Boolean);
            arr.push(...splitted);
        }
        return Array.from(new Set(arr));
    });

    const activeFilterCount = (categoryId ? 1 : 0) + (lowStockOnly ? 1 : 0) + (showSold ? 1 : 0) + (showWasted ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (multiSearch.length > 0 ? 1 : 0);

    function search() {
        router.get('/reports/stock-status', {
            category_id:    categoryId    || undefined,
            selling_type:   sellingType   || undefined,
            low_stock_only: lowStockOnly  || undefined,
            show_sold:      showSold      || undefined,
            show_wasted:    showWasted    || undefined,
            date_from:      dateFrom      || undefined,
            date_to:        dateTo        || undefined,
            product_ids:    multiSearch.filter(s => !isNaN(Number(s))) || undefined,
            search_name:    multiSearch.filter(s => isNaN(Number(s))).join(',') || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setCategoryId(''); setSellingType(''); setLowStockOnly(false); setShowSold(false); setShowWasted(false); setDateFrom(''); setDateTo(''); setMultiSearch([]);
        router.get('/reports/stock-status', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        const p = new URLSearchParams();
        if (categoryId)   p.set('category_id', categoryId);
        if (sellingType)  p.set('selling_type', sellingType);
        if (lowStockOnly) p.set('low_stock_only', '1');
        if (showSold)     p.set('show_sold', '1');
        if (showWasted)   p.set('show_wasted', '1');
        if (dateFrom)     p.set('date_from', dateFrom);
        if (dateTo)       p.set('date_to', dateTo);
        const prodIds = multiSearch.filter(s => !isNaN(Number(s)));
        const sName   = multiSearch.filter(s => isNaN(Number(s))).join(',');
        if (prodIds.length > 0) prodIds.forEach(id => p.append('product_ids[]', id));
        if (sName) p.set('search_name', sName);
        return `/reports/stock-status/${format}?${p.toString()}`;
    }

    const okCount       = data.filter(p => p.status === 'ok').length;
    const warningCount  = data.filter(p => p.status === 'warning').length;
    const criticalCount = data.filter(p => p.status === 'critical').length;
    
    const storeCapital = data.reduce((sum, p) => {
        const qty = Math.max(0, Number(p.stock) || 0);
        const cost = p.avg_purchase_cost ?? p.last_purchase_cost ?? 0;
        return sum + (qty * Number(cost));
    }, 0);

    return (
        <AppShell pageTitle="المخزون الحالي">
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <BarChart2 className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                تقرير المخزون الحالي
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                متابعة حالات الأصناف وتنبيهات النواقص ورأس مال المتجر
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
                    categories={categories}
                    products={products}
                    categoryId={categoryId}
                    setCategoryId={setCategoryId}
                    lowStockOnly={lowStockOnly}
                    setLowStockOnly={setLowStockOnly}
                    showSold={showSold}
                    setShowSold={setShowSold}
                    showWasted={showWasted}
                    setShowWasted={setShowWasted}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    multiSearch={multiSearch}
                    setMultiSearch={setMultiSearch}
                    onSearch={search}
                    onReset={reset}
                />

                {/* Included MultiSearch Products */}
                {multiSearch.length > 0 && data && data.length > 0 && (
                    <SpatialCard headerDot={false} title={`المنتجات المشمولة في الحساب (${data.length})`} icon={<FileText className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-wrap gap-2.5">
                            {data.map(p => (
                                <span key={p.id} className="px-4 py-2 rounded-[14px] bg-primary/15 border border-primary/30 text-primary font-black text-base">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </SpatialCard>
                )}

                {/* Main Content View: Stock Status */}
                <div className="flex flex-col gap-6">

                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجمالي المنتجات</span>
                            <span className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">{data.length}</span>
                        </SpatialCard>

                        <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-emerald-500/30 bg-emerald-500/5">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">حالة جيد</span>
                            <span className="text-3xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400">{okCount}</span>
                        </SpatialCard>

                        <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-amber-500/30 bg-amber-500/5">
                            <span className="text-sm font-black text-amber-500 uppercase tracking-wider">تحذير (قريب)</span>
                            <span className="text-3xl sm:text-5xl font-black text-amber-500">{warningCount}</span>
                        </SpatialCard>

                        <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 border-2 border-rose-500/30 bg-rose-500/5">
                            <span className="text-sm font-black text-rose-500 uppercase tracking-wider">حرج (منتهي)</span>
                            <span className="text-3xl sm:text-5xl font-black text-rose-500">{criticalCount}</span>
                        </SpatialCard>

                        <SpatialCard headerDot={false} className="p-6 flex flex-col justify-between gap-2 col-span-2 md:col-span-1 border-2 border-primary/40 bg-primary/5">
                            <span className="text-sm font-black text-primary uppercase tracking-wider">رأس مال المتجر</span>
                            <span className="text-3xl sm:text-4xl font-black text-primary">{fmt(storeCapital)} <span className="text-base">د.ل</span></span>
                        </SpatialCard>
                    </div>

                    {/* Table Card */}
                    <SpatialCard
                        headerDot={false}
                        title={`جدول حالة المخزون (${data.length} منتج)`}
                        icon={<BarChart2 className="w-7 h-7 text-primary" />}
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
                                <BarChart2 className="w-14 h-14 opacity-30" />
                                <p className="font-bold text-xl">لا توجد منتجات مطابقة لخيارات البحث</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse min-w-[1100px]">
                                    <thead>
                                        <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                            <th className="p-5 rounded-r-[18px]">المنتج</th>
                                            <th className="p-5">التصنيف</th>
                                            <th className="p-5">المخزون</th>
                                            <th className="p-5">الحد الأدنى</th>
                                            <th className="p-5">الحالة</th>
                                            <th className="p-5">آخر شراء</th>
                                            <th className="p-5">متوسط شراء</th>
                                            <th className="p-5">آخر بيع</th>
                                            <th className="p-5">متوسط بيع</th>
                                            {showSold && <th className="p-5">إجمالي المبيع</th>}
                                            {showWasted && <th className="p-5 rounded-l-[18px]">إجمالي التالف</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                        {data.map(p => {
                                            const st = statusConfig[p.status] || statusConfig.ok;
                                            return (
                                                <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                    <td className="p-5 text-slate-900 dark:text-white font-black">{p.name}</td>
                                                    <td className="p-5 text-slate-600 dark:text-slate-400 font-bold text-base">{p.category}</td>
                                                    <td className="p-5 text-slate-900 dark:text-white font-black whitespace-nowrap">{fmt(p.stock)} {p.unit}</td>
                                                    <td className="p-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(p.min_stock)} {p.unit}</td>
                                                    <td className="p-5 whitespace-nowrap">
                                                        <span className={`px-4 py-2 rounded-xl font-black text-base flex items-center gap-2 w-fit border ${st.bg} ${st.text} ${st.border}`}>
                                                            {st.icon}
                                                            <span>{st.label}</span>
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-slate-800 dark:text-slate-200 whitespace-nowrap">{fmt(p.last_purchase_cost)}</td>
                                                    <td className="p-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_purchase_cost)}</td>
                                                    <td className="p-5 text-slate-800 dark:text-slate-200 whitespace-nowrap">{fmt(p.last_sale_price)}</td>
                                                    <td className="p-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_sale_price)}</td>
                                                    {showSold && <td className="p-5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(p.total_sold)} {p.unit}</td>}
                                                    {showWasted && <td className="p-5 text-rose-500 whitespace-nowrap">{fmt(p.total_wasted)} {p.unit}</td>}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SpatialCard>
                </div>

            </div>
        </AppShell>
    );
}
