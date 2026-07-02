import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { BarChart2, SlidersHorizontal, ChevronDown, Search, FileSpreadsheet, FileText, AlertTriangle, CheckCircle, XCircle, TrendingUp, X } from 'lucide-react';

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
    profit: number | null;
}

interface ProfitItem {
    id: number;
    name: string;
    category: string;
    unit: string;
    opening_stock: number;
    total_purchase_cost: number;
    total_purchase_qty: number;
    total_sale_value: number;
    total_sold_qty: number;
    profit: number | null;
}

interface Props {
    categories: Category[];
    products: Product[];
    filters: { categoryId: number | null; sellingType: string; lowStockOnly: boolean; showSold: boolean; showWasted: boolean; showPurchased?: boolean; dateFrom: string; dateTo: string };
    profitFilters: { productIds: string[]; dateFrom: string; dateTo: string; categoryId: number | null; search: boolean };
    data: ProductStock[];
    profitData: ProfitItem[] | null;
}

const sellingTypeOptions = [
    { value: '',            label: 'الكل' },
    { value: 'tier_based',  label: 'عطور زيتية' },
    { value: 'unit_priced', label: 'أصلية / بخور / وشق' },
];

const statusConfig = {
    ok:       { label: 'جيد',    class: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    warning:  { label: 'تحذير',  class: 'text-amber-500',                         icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    critical: { label: 'حرج',    class: 'text-red-500',                           icon: <XCircle className="w-3.5 h-3.5" /> },
};

function fmt(n: number | null): string {
    if (n === null) return '—';
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockStatus({ categories, products, filters, profitFilters, data, profitData }: Props) {
    const [filterOpen,    setFilterOpen]    = useState(false);
    const [activeTab,     setActiveTab]     = useState<'stock' | 'profit' | 'stock_profit'>(profitData ? 'profit' : (filters.showPurchased ? 'stock_profit' : 'stock'));
    const [categoryId,    setCategoryId]    = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [sellingType,   setSellingType]   = useState(filters.sellingType ?? '');
    const [lowStockOnly,  setLowStockOnly]  = useState(filters.lowStockOnly ?? false);
    const [showSold,      setShowSold]      = useState(filters.showSold ?? false);
    const [showWasted,    setShowWasted]    = useState(filters.showWasted ?? false);
    const [dateFrom,      setDateFrom]      = useState(filters.dateFrom ?? '');
    const [dateTo,        setDateTo]        = useState(filters.dateTo ?? '');

    // Profit tab state
    const [profitProductIds, setProfitProductIds] = useState<string[]>(profitFilters.productIds ?? []);
    const [profitCategoryId, setProfitCategoryId] = useState(profitFilters.categoryId ? String(profitFilters.categoryId) : '');
    const [profitDateFrom,   setProfitDateFrom]   = useState(profitFilters.dateFrom ?? '');
    const [profitDateTo,     setProfitDateTo]     = useState(profitFilters.dateTo ?? '');

    const hasFilter = categoryId || sellingType || lowStockOnly || showSold || showWasted || dateFrom || dateTo;
    const hasProfitFilter = profitProductIds.length > 0 || profitDateFrom || profitDateTo || profitCategoryId;

    function search() {
        router.get('/reports/stock-status', {
            category_id:    categoryId    || undefined,
            selling_type:   sellingType   || undefined,
            low_stock_only: lowStockOnly  || undefined,
            show_sold:      showSold      || undefined,
            show_wasted:    showWasted    || undefined,
            show_purchased: (activeTab === 'stock_profit') ? 1 : undefined,
            date_from:      dateFrom      || undefined,
            date_to:        dateTo        || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setCategoryId(''); setSellingType(''); setLowStockOnly(false); setShowSold(false); setShowWasted(false); setDateFrom(''); setDateTo('');
        router.get('/reports/stock-status', {}, { preserveScroll: true });
    }

    function searchProfit() {
        router.get('/reports/stock-status', {
            profit_product_ids: profitProductIds.join(',') || undefined,
            profit_category_id: profitCategoryId || undefined,
            profit_date_from:   profitDateFrom || undefined,
            profit_date_to:     profitDateTo   || undefined,
            profit_search:      1,
        }, { preserveScroll: true });
    }

    function resetProfit() {
        setProfitProductIds([]); setProfitCategoryId(''); setProfitDateFrom(''); setProfitDateTo('');
        router.get('/reports/stock-status', {}, { preserveScroll: true });
    }

    function addProfitProduct(productName: string) {
        const p = products.find(pr => `${pr.name} (${pr.stock} ${pr.category.unit})` === productName);
        if (p && !profitProductIds.includes(String(p.id))) {
            setProfitProductIds(prev => [...prev, String(p.id)]);
        }
    }

    function removeProfitProduct(id: string) {
        setProfitProductIds(prev => prev.filter(pid => pid !== id));
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        const params = new URLSearchParams();
        if (categoryId)   params.set('category_id', categoryId);
        if (sellingType)  params.set('selling_type', sellingType);
        if (lowStockOnly) params.set('low_stock_only', '1');
        if (showSold)     params.set('show_sold', '1');
        if (showWasted)   params.set('show_wasted', '1');
        if (dateFrom)     params.set('date_from', dateFrom);
        if (dateTo)       params.set('date_to', dateTo);
        return `/reports/stock-status/${format}?${params.toString()}`;
    }

    const okCount       = data.filter(p => p.status === 'ok').length;
    const warningCount  = data.filter(p => p.status === 'warning').length;
    const criticalCount = data.filter(p => p.status === 'critical').length;

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect
                label="التصنيف"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                defaultValue={categoryId ? (categories.find(c => String(c.id) === categoryId)?.name ?? '') : 'الكل'}
                onSelect={val => setCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
            />
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
            <div className="flex items-center gap-3 px-1">
                <button onClick={() => setLowStockOnly(p => !p)}
                    className={`w-11 h-6 rounded-full transition-all relative ${lowStockOnly ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${lowStockOnly ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-bold text-slate-600 dark:text-white/70">تحت الحد الأدنى فقط</span>
            </div>
            <div className="flex items-center gap-3 px-1">
                <button onClick={() => setShowSold(p => !p)}
                    className={`w-11 h-6 rounded-full transition-all relative ${showSold ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${showSold ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-bold text-slate-600 dark:text-white/70">إظهار إجمالي المبيع</span>
            </div>
            <div className="flex items-center gap-3 px-1">
                <button onClick={() => setShowWasted(p => !p)}
                    className={`w-11 h-6 rounded-full transition-all relative ${showWasted ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${showWasted ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-bold text-slate-600 dark:text-white/70">إظهار إجمالي التالف</span>
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

    const ProfitFilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect
                label="التصنيف"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                defaultValue={profitCategoryId ? (categories.find(c => String(c.id) === profitCategoryId)?.name ?? '') : 'الكل'}
                onSelect={val => setProfitCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect
                label="المنتج"
                placeholder="كل المنتجات"
                options={products.map(p => ({ label: `${p.name} (${p.stock} ${p.category.unit})` }))}
                defaultValue=""
                onSelect={addProfitProduct}
            />
            {profitProductIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {profitProductIds.map(id => {
                        const p = products.find(pr => String(pr.id) === id);
                        return p ? (
                            <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                                {p.name}
                                <button onClick={() => removeProfitProduct(id)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ) : null;
                    })}
                </div>
            )}
            <DateFilterInput label="من تاريخ" value={profitDateFrom} onChange={setProfitDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={profitDateTo} onChange={setProfitDateTo} />
            <button onClick={searchProfit}
                className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> عرض التقرير
            </button>
            {hasProfitFilter && (
                <button onClick={resetProfit}
                    className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="المخزون الحالي">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تقرير المخزون الحالي</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">حالة مخزون جميع المنتجات مع تنبيهات الحد الأدنى</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('stock')}
                        className={`flex items-center gap-2 px-5 h-11 rounded-[16px] font-bold text-sm transition-all ${activeTab === 'stock' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'spatial-input text-slate-600 dark:text-white/60 hover:border-primary/30'}`}>
                        <BarChart2 className="w-4 h-4" /> المخزون الحالي
                    </button>
                    <button onClick={() => setActiveTab('profit')}
                        className={`flex items-center gap-2 px-5 h-11 rounded-[16px] font-bold text-sm transition-all ${activeTab === 'profit' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'spatial-input text-slate-600 dark:text-white/60 hover:border-primary/30'}`}>
                        <TrendingUp className="w-4 h-4" /> تحليل الأرباح
                    </button>
                    <button onClick={() => { setActiveTab('stock_profit'); setShowSold(true); setShowWasted(true); }}
                        className={`flex items-center gap-2 px-5 h-11 rounded-[16px] font-bold text-sm transition-all ${activeTab === 'stock_profit' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'spatial-input text-slate-600 dark:text-white/60 hover:border-primary/30'}`}>
                        <FileText className="w-4 h-4" /> تقرير الأرباح (بالتاريخ)
                    </button>
                </div>

                {/* Mobile Filter */}
                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)}
                        className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" /> فلترة
                            {((activeTab === 'stock' || activeTab === 'stock_profit') ? hasFilter : hasProfitFilter) && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && (
                        <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            {(activeTab === 'stock' || activeTab === 'stock_profit') ? <FilterPanel /> : <ProfitFilterPanel />}
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    <div className="flex-1 min-w-0 flex flex-col gap-6">

                    {activeTab === 'stock' && (<>
                        {/* Summary + Export */}
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">إجمالي</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{data.length}</p>
                                </div>
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">جيد</p>
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{okCount}</p>
                                </div>
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest">تحذير</p>
                                    <p className="text-2xl font-black text-amber-500">{warningCount}</p>
                                </div>
                                <div className="spatial-card p-4 flex flex-col gap-1">
                                    <p className="text-xs font-black text-red-500 uppercase tracking-widest">حرج</p>
                                    <p className="text-2xl font-black text-red-500">{criticalCount}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={buildExportUrl('excel')} target="_blank"
                                    className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                    <FileSpreadsheet className="w-4 h-4" /> Excel
                                </a>
                                <a href={buildExportUrl('pdf')} target="_blank"
                                    className="flex items-center gap-2 px-4 h-10 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                    <FileText className="w-4 h-4" /> PDF
                                </a>
                            </div>
                        </div>

                        {/* Stock Table */}
                        <SpatialCard title={`المنتجات (${data.length})`} icon={<BarChart2 className="w-4 h-4" />}>
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <BarChart2 className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد منتجات</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-[16px]">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['المنتج', 'التصنيف', 'المخزون', 'الحد الأدنى', 'الحالة', 'آخر شراء', 'متوسط شراء', 'آخر بيع', 'متوسط بيع', ...(showSold ? ['إجمالي المبيع'] : []), ...(showWasted ? ['إجمالي التالف'] : [])].map(h => (
                                                        <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {data.map(p => (
                                                    <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{p.name}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/60 text-xs">{p.category}</td>
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white whitespace-nowrap">{fmt(p.stock)} {p.unit}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/60 whitespace-nowrap">{fmt(p.min_stock)} {p.unit}</td>
                                                        <td className="px-4 py-4">
                                                            <div className={`flex items-center gap-1 font-black text-xs ${statusConfig[p.status].class}`}>
                                                                {statusConfig[p.status].icon}
                                                                {statusConfig[p.status].label}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 font-bold text-slate-700 dark:text-white/80 whitespace-nowrap">{fmt(p.last_purchase_cost)}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_purchase_cost)}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-700 dark:text-white/80 whitespace-nowrap">{fmt(p.last_sale_price)}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_sale_price)}</td>
                                                        {showSold   && <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(p.total_sold)} {p.unit}</td>}
                                                        {showWasted && <td className="px-4 py-4 font-bold text-red-500 whitespace-nowrap">{fmt(p.total_wasted)} {p.unit}</td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile */}
                                    <div className="flex flex-col gap-3 lg:hidden">
                                        {data.map(p => (
                                            <div key={p.id} className="rounded-[20px] border border-black/8 dark:border-white/12 overflow-hidden">
                                                <div className="px-4 py-3 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <span className="font-black text-slate-800 dark:text-white text-sm">{p.name}</span>
                                                    <div className={`flex items-center gap-1 font-black text-xs ${statusConfig[p.status].class}`}>
                                                        {statusConfig[p.status].icon}
                                                        {statusConfig[p.status].label}
                                                    </div>
                                                </div>
                                                <div className="px-4 py-2 flex flex-col gap-1.5 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">المخزون</span>
                                                        <span className="font-black text-slate-800 dark:text-white">{fmt(p.stock)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">الحد الأدنى</span>
                                                        <span className="font-bold text-slate-600 dark:text-white/70">{fmt(p.min_stock)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">آخر شراء</span>
                                                        <span className="font-bold text-slate-600 dark:text-white/70">{fmt(p.last_purchase_cost)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">متوسط شراء</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.avg_purchase_cost)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">آخر بيع</span>
                                                        <span className="font-bold text-slate-600 dark:text-white/70">{fmt(p.last_sale_price)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">متوسط بيع</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.avg_sale_price)}</span>
                                                    </div>
                                                    {showSold && (
                                                        <div className="flex justify-between">
                                                            <span className="font-bold text-slate-400 dark:text-white/40">إجمالي المبيع</span>
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(p.total_sold)} {p.unit}</span>
                                                        </div>
                                                    )}
                                                    {showWasted && (
                                                        <div className="flex justify-between">
                                                            <span className="font-bold text-slate-400 dark:text-white/40">إجمالي التالف</span>
                                                            <span className="font-bold text-red-500">{fmt(p.total_wasted)} {p.unit}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </SpatialCard>
                    </>)}

                    {activeTab === 'profit' && (
                        <SpatialCard title={`تحليل الأرباح${profitData ? ` (${profitData.length})` : ''}`} icon={<TrendingUp className="w-4 h-4" />}>
                            {!profitData ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <TrendingUp className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">حدد الفلاتر المطلوبة واضغط عرض التقرير</p>
                                </div>
                            ) : profitData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <TrendingUp className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد بيانات</p>
                                </div>
                            ) : (<>
                                {/* Desktop */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-[16px]">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                {['المنتج', 'المخزون قبل الفترة', 'إجمالي الشراء', 'الكمية المشتراه', 'إجمالي البيع', 'الكمية المباعة', 'الربح'].map(h => (
                                                    <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {profitData.map(p => (
                                                <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                    <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{p.name}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-700 dark:text-white/80 whitespace-nowrap">{fmt(p.opening_stock)} {p.unit}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.total_purchase_cost)}</td>
                                                    <td className="px-4 py-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmt(p.total_purchase_qty)} {p.unit}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.total_sale_value)}</td>
                                                    <td className="px-4 py-4 font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">{fmt(p.total_sold_qty)} {p.unit}</td>
                                                    <td className="px-4 py-4 font-black whitespace-nowrap">
                                                        <span className={p.profit !== null ? (p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}>
                                                            {p.profit !== null ? fmt(p.profit) : '—'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile */}
                                <div className="flex flex-col gap-3 lg:hidden">
                                    {profitData.map(p => (
                                        <div key={p.id} className="rounded-[20px] border border-black/8 dark:border-white/12 overflow-hidden">
                                            <div className="px-4 py-3 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                <span className="font-black text-slate-800 dark:text-white text-sm">{p.name}</span>
                                                <span className={`font-black text-sm ${p.profit !== null ? (p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}`}>
                                                    {p.profit !== null ? fmt(p.profit) : '—'}
                                                </span>
                                            </div>
                                            <div className="px-4 py-2 flex flex-col gap-1.5 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">المخزون قبل الفترة</span>
                                                    <span className="font-bold text-slate-700 dark:text-white/80">{fmt(p.opening_stock)} {p.unit}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">إجمالي الشراء</span>
                                                    <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.total_purchase_cost)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">الكمية المشتراه</span>
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">{fmt(p.total_purchase_qty)} {p.unit}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">إجمالي البيع</span>
                                                    <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.total_sale_value)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">الكمية المباعة</span>
                                                    <span className="font-bold text-orange-600 dark:text-orange-400">{fmt(p.total_sold_qty)} {p.unit}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>)}
                        </SpatialCard>
                    )}

                    {activeTab === 'stock_profit' && (
                        <SpatialCard title={`تقرير الأرباح (${data.length})`} icon={<FileText className="w-4 h-4" />}>
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <FileText className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد بيانات</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-[16px]">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['المنتج', 'اجمالي المشتراه', 'اجمالي المخزون', 'اجمالي المبيعات', 'اجمالي التالف', 'مرتجع مورد', 'متوسط ارجاع المورد', 'مرتجع زبائن', 'متوسط ارجاع الزبائن', 'متوسط شراء', 'متوسط بيع', 'الربح'].map(h => (
                                                        <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {data.map(p => (
                                                    <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{p.name}</td>
                                                        <td className="px-4 py-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmt(p.total_purchased)} {p.unit}</td>
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white whitespace-nowrap">{fmt(p.stock)} {p.unit}</td>
                                                        <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(p.total_sold)} {p.unit}</td>
                                                        <td className="px-4 py-4 font-bold text-red-500 whitespace-nowrap">{fmt(p.total_wasted)} {p.unit}</td>
                                                        <td className="px-4 py-4 font-bold text-amber-500 whitespace-nowrap">{fmt(p.total_return_out)} {p.unit}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_return_out_price)}</td>
                                                        <td className="px-4 py-4 font-bold text-orange-500 whitespace-nowrap">{fmt(p.total_return_in)} {p.unit}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_return_in_price)}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_purchase_cost)}</td>
                                                        <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_sale_price)}</td>
                                                        <td className="px-4 py-4 font-black whitespace-nowrap">
                                                            <span className={p.profit !== null ? (p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}>
                                                                {p.profit !== null ? fmt(p.profit) : '—'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile */}
                                    <div className="flex flex-col gap-3 lg:hidden">
                                        {data.map(p => (
                                            <div key={p.id} className="rounded-[20px] border border-black/8 dark:border-white/12 overflow-hidden">
                                                <div className="px-4 py-3 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <span className="font-black text-slate-800 dark:text-white text-sm">{p.name}</span>
                                                    <span className={`font-black text-sm ${p.profit !== null ? (p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}`}>
                                                        {p.profit !== null ? fmt(p.profit) : '—'}
                                                    </span>
                                                </div>
                                                <div className="px-4 py-2 flex flex-col gap-1.5 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">إجمالي المشتراه</span>
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{fmt(p.total_purchased)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">إجمالي المخزون</span>
                                                        <span className="font-black text-slate-800 dark:text-white">{fmt(p.stock)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">إجمالي المبيعات</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(p.total_sold)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">إجمالي التالف</span>
                                                        <span className="font-bold text-red-500">{fmt(p.total_wasted)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">مرتجع مورد</span>
                                                        <span className="font-bold text-amber-500">{fmt(p.total_return_out)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">متوسط ارجاع المورد</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.avg_return_out_price)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">مرتجع زبائن</span>
                                                        <span className="font-bold text-orange-500">{fmt(p.total_return_in)} {p.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">متوسط ارجاع الزبائن</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.avg_return_in_price)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">متوسط شراء</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.avg_purchase_cost)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">متوسط بيع</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/50">{fmt(p.avg_sale_price)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </SpatialCard>
                    )}

                    </div>

                    {/* Desktop Filter */}
                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            {(activeTab === 'stock' || activeTab === 'stock_profit') ? <FilterPanel /> : <ProfitFilterPanel />}
                        </SpatialCard>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
