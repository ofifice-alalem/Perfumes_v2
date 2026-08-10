import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import {
    TrendingUp,
    ChevronRight,
    Search,
    FileText,
    FileSpreadsheet,
    Download,
    Filter,
    X,
    RotateCcw,
    ChevronLeft,
    Sparkles,
    CheckCircle2,
    Layers,
    SlidersHorizontal,
    Maximize2,
    Check
} from 'lucide-react';

interface Category { id: number; name: string; }
interface Product { id: number; name: string; }

interface DailyProfit {
    date: string;
    sales: number;
    returns: number;
    net_sales: number;
    profit: number;
}

interface MonthlyProfit {
    month: string;
    sales: number;
    returns: number;
    net_sales: number;
    profit: number;
    days: DailyProfit[];
}

interface ProfitSummary {
    total_profit: number;
    monthly: MonthlyProfit[];
    daily: DailyProfit[];
    included_products: Product[];
}

interface ProductStock {
    id: number;
    name: string;
    category: string;
    unit: string;
    stock: number;
    total_purchased: number | null;
    total_sold: number | null;
    total_wasted: number | null;
    total_return_in: number | null;
    avg_return_in_price: number | null;
    total_return_out: number | null;
    avg_return_out_price: number | null;
    net_sale_qty: number | null;
    avg_purchase_cost: number | null;
    avg_sale_price: number | null;
    profit: number | null;
}

interface Props {
    profitSummary: ProfitSummary;
    stockProfitData: ProductStock[];
    categories: Category[];
    products: Product[];
    filters: {
        dateFrom: string;
        dateTo: string;
        stockDateFrom: string;
        stockDateTo: string;
        stockCategoryId: number | null;
        productIds: number[];
        stockProductIds: number[];
        searchName?: string;
        stockSearchName?: string;
        activeTab?: 'daily' | 'stock_profit';
    };
    hasSearched: boolean;
}

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
    activeTab,
    products,
    categories,
    // Tab 1 state
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    multiSearch, setMultiSearch,
    onSearchDaily,
    onResetDaily,
    // Tab 2 state
    stockDateFrom, setStockDateFrom,
    stockDateTo, setStockDateTo,
    stockCategoryId, setStockCategoryId,
    stockMultiSearch, setStockMultiSearch,
    compactView, setCompactView,
    onSearchStock,
    onResetStock
}: {
    isOpen: boolean;
    onClose: () => void;
    activeTab: 'daily' | 'stock_profit';
    products: Product[];
    categories: Category[];
    dateFrom: string; setDateFrom: (v: string) => void;
    dateTo: string; setDateTo: (v: string) => void;
    multiSearch: string[]; setMultiSearch: (v: string[]) => void;
    onSearchDaily: () => void;
    onResetDaily: () => void;
    stockDateFrom: string; setStockDateFrom: (v: string) => void;
    stockDateTo: string; setStockDateTo: (v: string) => void;
    stockCategoryId: string; setStockCategoryId: (v: string) => void;
    stockMultiSearch: string[]; setStockMultiSearch: (v: string[]) => void;
    compactView: boolean; setCompactView: React.Dispatch<React.SetStateAction<boolean>>;
    onSearchStock: () => void;
    onResetStock: () => void;
}) {
    if (!isOpen) return null;    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-start select-none dir-rtl">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Right Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-l-2 border-slate-200 dark:border-slate-800 shadow-[10px_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300 z-[10000]">
                
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 sm:p-8 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[22px] bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary shadow-md">
                            <SlidersHorizontal className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">خيارات الفلترة والتصفية</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                {activeTab === 'daily' ? 'فلاتر التحليل اليومي للمبيعات والربح' : 'فلاتر تقرير أرباح المنتجات'}
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
                    {activeTab === 'daily' ? (
                        <>
                            <ModernMultiSelect
                                label="البحث أو تحديد المنتجات"
                                placeholder="الكل (اختر أو اكتب للبحث...)"
                                options={products.map(p => ({ value: String(p.id), label: p.name }))}
                                defaultValues={multiSearch}
                                onSelect={setMultiSearch}
                                allowFreeText={true}
                            />
                            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                            <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                        </>
                    ) : (
                        <>
                            <ModernSelect
                                label="التصنيف المحاسبي"
                                placeholder="جميع التصنيفات"
                                options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                                defaultValue={stockCategoryId ? (categories.find(c => String(c.id) === stockCategoryId)?.name ?? '') : 'الكل'}
                                onSelect={val => setStockCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
                            />

                            <ModernMultiSelect
                                label="البحث أو تحديد المنتجات"
                                placeholder="الكل (اختر أو اكتب للبحث...)"
                                options={products.map(p => ({ value: String(p.id), label: p.name }))}
                                defaultValues={stockMultiSearch}
                                onSelect={setStockMultiSearch}
                                allowFreeText={true}
                            />

                            <DateFilterInput label="من تاريخ" value={stockDateFrom} onChange={setStockDateFrom} />
                            <DateFilterInput label="إلى تاريخ" value={stockDateTo} onChange={setStockDateTo} />

                            <div
                                onClick={() => setCompactView(p => !p)}
                                className="p-5 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-lg font-black text-slate-900 dark:text-white">عرض مختصر للربح</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إظهار المنتجات المباعة فقط</span>
                                </div>
                                <div
                                    className={`w-16 h-9 rounded-full transition-all relative border-2 shadow-inner shrink-0 ${
                                        compactView ? 'bg-primary border-primary' : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                                    }`}
                                >
                                    <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${compactView ? 'right-8' : 'right-1'}`} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'daily') onSearchDaily();
                            else onSearchStock();
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
                            if (activeTab === 'daily') onResetDaily();
                            else onResetStock();
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
   MAIN PROFIT ANALYSIS PAGE
   ========================================================================= */
export default function ProfitAnalysis({ profitSummary, stockProfitData, categories, products, filters, hasSearched }: Props) {
    const [activeTab, setActiveTab] = useState<'daily' | 'stock_profit'>(filters.activeTab ?? 'daily');
    const [expanded, setExpanded]   = useState<Set<string>>(new Set());
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Tab 1 filters
    const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? '');
    const [dateTo,   setDateTo]   = useState(filters.dateTo ?? '');
    const initMultiSearch = [
        ...(filters.productIds?.map(String) || []),
        ...(filters.searchName ? filters.searchName.split(',') : [])
    ].filter(Boolean);
    const [multiSearch, setMultiSearch] = useState<string[]>(initMultiSearch);

    // Tab 2 filters
    const [stockDateFrom,   setStockDateFrom]   = useState(filters.stockDateFrom ?? '');
    const [stockDateTo,     setStockDateTo]     = useState(filters.stockDateTo ?? '');
    const [stockCategoryId, setStockCategoryId] = useState(filters.stockCategoryId ? String(filters.stockCategoryId) : '');

    const initStockMultiSearch = [
        ...(filters.stockProductIds?.map(String) || []),
        ...(filters.stockSearchName ? filters.stockSearchName.split(',') : [])
    ].filter(Boolean);
    const [stockMultiSearch, setStockMultiSearch] = useState<string[]>(initStockMultiSearch);
    const [compactView,     setCompactView]     = useState(false);
    const [stockPage,       setStockPage]       = useState(1);
    const stockPerPage = 50;

    const displayData = compactView ? stockProfitData.filter(p => p.avg_sale_price !== null) : stockProfitData;
    const totalStockPages = Math.ceil(displayData.length / stockPerPage);
    const paginatedStockData = displayData.slice((stockPage - 1) * stockPerPage, stockPage * stockPerPage);

    const activeFilterCount = activeTab === 'daily'
        ? (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (multiSearch.length ? 1 : 0)
        : (stockDateFrom ? 1 : 0) + (stockDateTo ? 1 : 0) + (stockCategoryId ? 1 : 0) + (stockMultiSearch.length ? 1 : 0) + (compactView ? 1 : 0);

    function toggleExpand(month: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(month) ? next.delete(month) : next.add(month);
            return next;
        });
    }

    function searchDaily() {
        const pIds = multiSearch.filter(v => !isNaN(Number(v)));
        const sNames = multiSearch.filter(v => isNaN(Number(v)));
        const stockPIds = stockMultiSearch.filter(v => !isNaN(Number(v)));
        const stockSNames = stockMultiSearch.filter(v => isNaN(Number(v)));

        router.get('/reports/profit-analysis', {
            date_from:         dateFrom         || undefined,
            date_to:           dateTo           || undefined,
            product_ids:       pIds.length ? pIds.join(',') : undefined,
            search_name:       sNames.length ? sNames.join(',') : undefined,
            stock_date_from:   stockDateFrom    || undefined,
            stock_date_to:     stockDateTo      || undefined,
            stock_category_id: stockCategoryId  || undefined,
            stock_product_ids: stockPIds.length ? stockPIds.join(',') : undefined,
            stock_search_name: stockSNames.length ? stockSNames.join(',') : undefined,
            active_tab:        'daily',
        }, { preserveScroll: true });
    }

    function resetDaily() {
        setDateFrom('');
        setDateTo('');
        setMultiSearch([]);
        router.get('/reports/profit-analysis', {
            stock_date_from:   stockDateFrom    || undefined,
            stock_date_to:     stockDateTo      || undefined,
            stock_category_id: stockCategoryId  || undefined,
            stock_product_ids: stockMultiSearch.filter(v => !isNaN(Number(v))).join(',') || undefined,
            stock_search_name: stockMultiSearch.filter(v => isNaN(Number(v))).join(',') || undefined,
            active_tab:        'daily',
        });
    }

    function searchStock() {
        setStockPage(1);
        const pIds = multiSearch.filter(v => !isNaN(Number(v)));
        const sNames = multiSearch.filter(v => isNaN(Number(v)));
        const stockPIds = stockMultiSearch.filter(v => !isNaN(Number(v)));
        const stockSNames = stockMultiSearch.filter(v => isNaN(Number(v)));

        router.get('/reports/profit-analysis', {
            date_from:         dateFrom         || undefined,
            date_to:           dateTo           || undefined,
            product_ids:       pIds.length ? pIds.join(',') : undefined,
            search_name:       sNames.length ? sNames.join(',') : undefined,
            stock_date_from:   stockDateFrom    || undefined,
            stock_date_to:     stockDateTo      || undefined,
            stock_category_id: stockCategoryId  || undefined,
            stock_product_ids: stockPIds.length ? stockPIds.join(',') : undefined,
            stock_search_name: stockSNames.length ? stockSNames.join(',') : undefined,
            active_tab:        'stock_profit',
        }, { preserveScroll: true });
    }

    function resetStock() {
        setStockDateFrom('');
        setStockDateTo('');
        setStockCategoryId('');
        setStockMultiSearch([]);
        setCompactView(false);
        router.get('/reports/profit-analysis', {
            date_from:   dateFrom || undefined,
            date_to:     dateTo || undefined,
            product_ids: multiSearch.filter(v => !isNaN(Number(v))).join(',') || undefined,
            search_name: multiSearch.filter(v => isNaN(Number(v))).join(',') || undefined,
            active_tab:  'stock_profit',
        });
    }

    function buildDailyExportUrl(format: 'excel' | 'pdf') {
        const pIds = multiSearch.filter(v => !isNaN(Number(v)));
        const sNames = multiSearch.filter(v => isNaN(Number(v)));

        const p = new URLSearchParams();
        if (dateFrom) p.set('date_from', dateFrom);
        if (dateTo) p.set('date_to', dateTo);
        if (pIds.length) p.set('product_ids', pIds.join(','));
        if (sNames.length) p.set('search_name', sNames.join(','));
        return `/reports/profit-analysis/${format}?${p.toString()}`;
    }

    function buildStockExportUrl(format: 'excel' | 'pdf') {
        const stockPIds = stockMultiSearch.filter(v => !isNaN(Number(v)));
        const stockSNames = stockMultiSearch.filter(v => isNaN(Number(v)));

        const p = new URLSearchParams();
        if (stockCategoryId) p.set('category_id', stockCategoryId);
        if (stockDateFrom) p.set('date_from', stockDateFrom);
        if (stockDateTo) p.set('date_to', stockDateTo);
        if (stockPIds.length) p.set('product_ids', stockPIds.join(','));
        if (stockSNames.length) p.set('search_name', stockSNames.join(','));
        p.set('show_purchased', '1');
        p.set('show_sold', '1');
        p.set('show_wasted', '1');
        if (compactView) p.set('compact_view', '1');
        return `/reports/stock-status/${format}?${p.toString()}`;
    }

    return (
        <AppShell pageTitle="تحليل الأرباح الشامل">
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                تحليل الأرباح الشامل
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                تحليل تفصيلي لصافي الأرباح الشهري واليومي وأرباح المنتجات
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        {/* Filter Drawer Trigger Button */}
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="h-16 sm:h-18 px-8 sm:px-10 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 font-black text-base sm:text-xl flex items-center justify-center gap-3 active:scale-95 shadow-xl border-2 border-slate-300 dark:border-slate-700 touch-manipulation cursor-pointer transition-all relative"
                        >
                            <Filter className="w-6 h-6" />
                            <span>تصفية وفلترة</span>
                            {activeFilterCount > 0 && (
                                <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Spatial Tabs */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`h-16 sm:h-18 px-8 rounded-[22px] font-black text-lg sm:text-xl transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
                            activeTab === 'daily'
                                ? 'bg-primary text-white shadow-xl shadow-primary/25 border-2 border-primary'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                        }`}
                    >
                        <TrendingUp className="w-6 h-6" />
                        <span>التحليل اليومي للمبيعات والربح</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('stock_profit')}
                        className={`h-16 sm:h-18 px-8 rounded-[22px] font-black text-lg sm:text-xl transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
                            activeTab === 'stock_profit'
                                ? 'bg-primary text-white shadow-xl shadow-primary/25 border-2 border-primary'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                        }`}
                    >
                        <FileText className="w-6 h-6" />
                        <span>تقرير أرباح المنتجات (بالتاريخ)</span>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'daily' && (
                    <div className="flex flex-col gap-6">
                        {!hasSearched ? (
                            <SpatialCard className="p-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-4 text-center">
                                <div className="w-24 h-24 rounded-[32px] bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary shadow-inner">
                                    <Search className="w-12 h-12 opacity-60" />
                                </div>
                                <span className="font-black text-2xl text-slate-700 dark:text-slate-300">الرجاء إدخال الفلاتر وتطبيق البحث</span>
                                <p className="text-lg font-bold text-slate-500 dark:text-slate-400 max-w-md">
                                    اضغط على زر "تصفية وفلترة" لتحديد التواريخ أو المنتجات المراد تحليلها.
                                </p>
                                <button
                                    onClick={() => setIsFilterOpen(true)}
                                    className="h-16 px-8 rounded-[20px] bg-primary text-white font-black text-lg flex items-center gap-3 shadow-xl active:scale-95 cursor-pointer mt-2"
                                >
                                    <Filter className="w-6 h-6" />
                                    <span>فتح فلاتر البحث</span>
                                </button>
                            </SpatialCard>
                        ) : (
                            <>
                                {/* Profit Summary Card */}
                                <SpatialCard className="p-8 border-2 border-primary/30 bg-primary/5">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-base font-black text-primary uppercase tracking-widest">
                                            صافي الربح للفترة المحددة
                                        </span>
                                        <span className="text-4xl sm:text-6xl font-black text-primary">
                                            {fmt(profitSummary.total_profit)} <span className="text-2xl font-bold">د.ل</span>
                                        </span>
                                    </div>
                                </SpatialCard>

                                {/* Included Products */}
                                {profitSummary.included_products && profitSummary.included_products.length > 0 && (
                                    <SpatialCard title={`المنتجات المشمولة في الحساب (${profitSummary.included_products.length})`} icon={<FileText className="w-7 h-7 text-primary" />}>
                                        <div className="flex flex-wrap gap-2.5">
                                            {profitSummary.included_products.map(p => (
                                                <span key={p.id} className="px-4 py-2 rounded-[14px] bg-primary/15 border border-primary/30 text-primary font-black text-base">
                                                    {p.name}
                                                </span>
                                            ))}
                                        </div>
                                    </SpatialCard>
                                )}

                                {/* Daily Profit Table */}
                                <SpatialCard
                                    title={`التفصيل الشهري للأرباح (${profitSummary.monthly.length} شهر)`}
                                    icon={<TrendingUp className="w-7 h-7 text-primary" />}
                                    action={
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={buildDailyExportUrl('excel')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="h-12 px-5 rounded-[16px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white border-2 border-emerald-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                                                title="تصدير إكسيل"
                                            >
                                                <FileSpreadsheet className="w-5 h-5" />
                                                <span className="hidden sm:inline">تصدير إكسيل</span>
                                            </a>
                                            <a
                                                href={buildDailyExportUrl('pdf')}
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
                                    {profitSummary.monthly.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                                            <TrendingUp className="w-12 h-12 opacity-30" />
                                            <p className="font-bold text-xl">لا توجد مبيعات في هذه الفترة</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-right border-collapse min-w-[700px]">
                                                <thead>
                                                    <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                                        <th className="p-5 rounded-r-[18px]">الشهر</th>
                                                        <th className="p-5">صافي المبيعات</th>
                                                        <th className="p-5">الربح</th>
                                                        <th className="p-5 rounded-l-[18px] text-center">التفاصيل</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                                    {profitSummary.monthly.map(m => (
                                                        <React.Fragment key={m.month}>
                                                            <tr className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                                <td className="p-5 text-slate-900 dark:text-white">{m.month}</td>
                                                                <td className="p-5 text-slate-900 dark:text-white">{fmt(m.net_sales)} د.ل</td>
                                                                <td className="p-5 text-emerald-600 dark:text-emerald-400">{fmt(m.profit)} د.ل</td>
                                                                <td className="p-5 text-center">
                                                                    <button
                                                                        onClick={() => toggleExpand(m.month)}
                                                                        className="h-12 px-5 rounded-[14px] bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-base transition-all flex items-center justify-center gap-2 cursor-pointer mx-auto"
                                                                    >
                                                                        <ChevronLeft className={`w-5 h-5 transition-transform ${expanded.has(m.month) ? '-rotate-90' : ''}`} />
                                                                        <span>عرض الأيام</span>
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {expanded.has(m.month) && (
                                                                <tr>
                                                                    <td colSpan={4} className="p-6 bg-slate-100/60 dark:bg-slate-800/60 rounded-[24px]">
                                                                        <table className="w-full text-right border-collapse">
                                                                            <thead>
                                                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-sm sm:text-base font-black text-slate-600 dark:text-slate-400">
                                                                                    <th className="py-4 px-5">التاريخ</th>
                                                                                    <th className="py-4 px-5">المبيعات</th>
                                                                                    <th className="py-4 px-5">المرتجعات</th>
                                                                                    <th className="py-4 px-5">صافي البيع</th>
                                                                                    <th className="py-4 px-5">الربح</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-black text-base sm:text-lg">
                                                                                {m.days.map((d, i) => (
                                                                                    <tr key={i} className="hover:bg-primary/5">
                                                                                        <td className="py-4 px-5 text-slate-800 dark:text-slate-200">{d.date}</td>
                                                                                        <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{fmt(d.sales)}</td>
                                                                                        <td className="py-4 px-5 text-amber-500">{fmt(d.returns)}</td>
                                                                                        <td className="py-4 px-5 text-slate-900 dark:text-white font-black">{fmt(d.net_sales)}</td>
                                                                                        <td className={`py-4 px-5 font-black ${d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(d.profit)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t-4 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 text-lg font-black">
                                                        <td className="p-5 text-slate-600 dark:text-slate-400">الإجمالي العام</td>
                                                        <td className="p-5 text-slate-900 dark:text-white">
                                                            {fmt(profitSummary.monthly.reduce((a, b) => a + b.net_sales, 0))} د.ل
                                                        </td>
                                                        <td className="p-5 text-emerald-600 dark:text-emerald-400">
                                                            {fmt(profitSummary.total_profit)} د.ل
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </SpatialCard>
                            </>
                        )}
                    </div>
                )}

                {/* Tab 2: Stock Profit */}
                {activeTab === 'stock_profit' && (
                    <div className="flex flex-col gap-6">
                        {!hasSearched ? (
                            <SpatialCard className="p-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-4 text-center">
                                <div className="w-24 h-24 rounded-[32px] bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary shadow-inner">
                                    <Search className="w-12 h-12 opacity-60" />
                                </div>
                                <span className="font-black text-2xl text-slate-700 dark:text-slate-300">الرجاء إدخال الفلاتر وتطبيق البحث</span>
                                <p className="text-lg font-bold text-slate-500 dark:text-slate-400 max-w-md">
                                    اضغط على زر "تصفية وفلترة" لتحديد التواريخ أو التصنيف أو المنتجات المراد تحليلها.
                                </p>
                                <button
                                    onClick={() => setIsFilterOpen(true)}
                                    className="h-16 px-8 rounded-[20px] bg-primary text-white font-black text-lg flex items-center gap-3 shadow-xl active:scale-95 cursor-pointer mt-2"
                                >
                                    <Filter className="w-6 h-6" />
                                    <span>فتح فلاتر البحث</span>
                                </button>
                            </SpatialCard>
                        ) : (
                            <>
                                {/* Profit Summary Card */}
                                <SpatialCard className="p-8 border-2 border-primary/30 bg-primary/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-black text-primary uppercase tracking-widest">
                                            إجمالي ربح المنتجات المحددة
                                        </span>
                                        <span className="text-3xl sm:text-5xl font-black text-primary">
                                            {fmt(stockProfitData.reduce((sum, p) => sum + (p.profit ?? 0), 0))} <span className="text-xl font-bold">د.ل</span>
                                        </span>
                                    </div>
                                </SpatialCard>

                                {/* Product Profit Table */}
                                <SpatialCard
                                    title={`تقرير أرباح المنتجات (${displayData.length})`}
                                    icon={<FileText className="w-7 h-7 text-primary" />}
                                    action={
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={buildStockExportUrl('excel')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="h-12 px-5 rounded-[16px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white border-2 border-emerald-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                                                title="تصدير إكسيل"
                                            >
                                                <FileSpreadsheet className="w-5 h-5" />
                                                <span className="hidden sm:inline">تصدير إكسيل</span>
                                            </a>
                                            <a
                                                href={buildStockExportUrl('pdf')}
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
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full text-right border-collapse min-w-[900px]">
                                            <thead>
                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                                    {(compactView
                                                        ? ['المنتج','متوسط شراء','متوسط بيع','صافي كمية المبيعات','الربح']
                                                        : ['المنتج','إجمالي المشتراه','إجمالي المخزون','إجمالي المبيعات','إجمالي التالف','مرتجع مورد','متوسط ارجاع المورد','مرتجع زبائن','متوسط ارجاع الزبائن','متوسط شراء','متوسط بيع','الربح']
                                                    ).map(h => (
                                                        <th key={h} className="p-5 whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                                {paginatedStockData.map(p => (
                                                    <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                        <td className="p-5 text-slate-900 dark:text-white">{p.name}</td>
                                                        {compactView ? (
                                                            <>
                                                                <td className="p-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_purchase_cost)}</td>
                                                                <td className="p-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_sale_price)}</td>
                                                                <td className="p-5 text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmt(p.net_sale_qty)} {p.unit}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="p-5 text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmt(p.total_purchased)} {p.unit}</td>
                                                                <td className="p-5 text-slate-800 dark:text-slate-200 whitespace-nowrap">{fmt(p.stock)} {p.unit}</td>
                                                                <td className="p-5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(p.total_sold)} {p.unit}</td>
                                                                <td className="p-5 text-red-500 whitespace-nowrap">{fmt(p.total_wasted)} {p.unit}</td>
                                                                <td className="p-5 text-amber-500 whitespace-nowrap">{fmt(p.total_return_out)} {p.unit}</td>
                                                                <td className="p-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_return_out_price)}</td>
                                                                <td className="p-5 text-orange-500 whitespace-nowrap">{fmt(p.total_return_in)} {p.unit}</td>
                                                                <td className="p-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_return_in_price)}</td>
                                                                <td className="p-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_purchase_cost)}</td>
                                                                <td className="p-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt(p.avg_sale_price)}</td>
                                                            </>
                                                        )}
                                                        <td className="p-5 whitespace-nowrap">
                                                            <span className={p.profit !== null ? (p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}>
                                                                {p.profit !== null ? `${fmt(p.profit)} د.ل` : '—'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalStockPages > 1 && (
                                        <div className="flex items-center justify-between px-6 py-5 border-t-2 border-slate-200 dark:border-slate-800">
                                            <div className="text-base font-bold text-slate-500 dark:text-slate-400">
                                                عرض {((stockPage - 1) * stockPerPage) + 1} إلى {Math.min(stockPage * stockPerPage, displayData.length)} من أصل {displayData.length} منتج
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setStockPage(p => Math.max(1, p - 1))}
                                                    disabled={stockPage === 1}
                                                    className="h-12 px-5 rounded-[14px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-base hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                                >
                                                    السابق
                                                </button>
                                                <span className="text-lg font-black text-primary px-2">{stockPage} / {totalStockPages}</span>
                                                <button
                                                    onClick={() => setStockPage(p => Math.min(totalStockPages, p + 1))}
                                                    disabled={stockPage === totalStockPages}
                                                    className="h-12 px-5 rounded-[14px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-base hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                                >
                                                    التالي
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </SpatialCard>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Filter Drawer Portal */}
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                activeTab={activeTab}
                products={products}
                categories={categories}
                dateFrom={dateFrom} setDateFrom={setDateFrom}
                dateTo={dateTo} setDateTo={setDateTo}
                multiSearch={multiSearch} setMultiSearch={setMultiSearch}
                onSearchDaily={searchDaily}
                onResetDaily={resetDaily}
                stockDateFrom={stockDateFrom} setStockDateFrom={setStockDateFrom}
                stockDateTo={stockDateTo} setStockDateTo={setStockDateTo}
                stockCategoryId={stockCategoryId} setStockCategoryId={setStockCategoryId}
                stockMultiSearch={stockMultiSearch} setStockMultiSearch={setStockMultiSearch}
                compactView={compactView} setCompactView={setCompactView}
                onSearchStock={searchStock}
                onResetStock={resetStock}
            />
        </AppShell>
    );
}
