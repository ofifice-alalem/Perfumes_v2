import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { TrendingUp, ChevronRight, Search, FileText, FileSpreadsheet, Download } from 'lucide-react';

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
    }
}

function fmt(n: number | null): string {
    if (n === null || n === undefined) return '—';
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProfitAnalysis({ profitSummary, stockProfitData, categories, products, filters }: Props) {
    const [activeTab, setActiveTab] = useState<'daily' | 'stock_profit'>('daily');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // فلاتر التاب الأول
    const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? '');
    const [dateTo,   setDateTo]   = useState(filters.dateTo ?? '');
    const [productIds, setProductIds] = useState<number[]>(filters.productIds ?? []);

    // فلاتر التاب الثاني
    const [stockDateFrom,   setStockDateFrom]   = useState(filters.stockDateFrom ?? '');
    const [stockDateTo,     setStockDateTo]     = useState(filters.stockDateTo ?? '');
    const [stockCategoryId, setStockCategoryId] = useState(filters.stockCategoryId ? String(filters.stockCategoryId) : '');
    const [stockProductIds, setStockProductIds] = useState<number[]>(filters.stockProductIds ?? []);
    const [compactView,     setCompactView]     = useState(false);

    const displayData = compactView ? stockProfitData.filter(p => p.avg_sale_price !== null) : stockProfitData;

    function toggleExpand(month: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(month) ? next.delete(month) : next.add(month);
            return next;
        });
    }

    function searchDaily() {
        router.get('/reports/profit-analysis', {
            date_from:         dateFrom         || undefined,
            date_to:           dateTo           || undefined,
            product_ids:       productIds.length ? productIds.join(',') : undefined,
            stock_date_from:   stockDateFrom    || undefined,
            stock_date_to:     stockDateTo      || undefined,
            stock_category_id: stockCategoryId  || undefined,
            stock_product_ids: stockProductIds.length ? stockProductIds.join(',') : undefined,
        }, { preserveScroll: true });
    }

    function searchStock() {
        router.get('/reports/profit-analysis', {
            date_from:         dateFrom         || undefined,
            date_to:           dateTo           || undefined,
            product_ids:       productIds.length ? productIds.join(',') : undefined,
            stock_date_from:   stockDateFrom    || undefined,
            stock_date_to:     stockDateTo      || undefined,
            stock_category_id: stockCategoryId  || undefined,
            stock_product_ids: stockProductIds.length ? stockProductIds.join(',') : undefined,
        }, { preserveScroll: true });
    }

    function buildDailyExportUrl(format: 'excel' | 'pdf') {
        const p = new URLSearchParams();
        if (dateFrom) p.set('date_from', dateFrom);
        if (dateTo) p.set('date_to', dateTo);
        if (productIds.length) p.set('product_ids', productIds.join(','));
        return `/reports/profit-analysis/${format}?${p.toString()}`;
    }

    function buildStockExportUrl(format: 'excel' | 'pdf') {
        const p = new URLSearchParams();
        if (stockCategoryId) p.set('category_id', stockCategoryId);
        if (stockDateFrom) p.set('date_from', stockDateFrom);
        if (stockDateTo) p.set('date_to', stockDateTo);
        if (stockProductIds.length) p.set('product_ids', stockProductIds.join(','));
        p.set('show_purchased', '1');
        p.set('show_sold', '1');
        p.set('show_wasted', '1');
        if (compactView) p.set('compact_view', '1');
        return `/reports/stock-status/${format}?${p.toString()}`;
    }

    return (
        <AppShell pageTitle="تحليل الأرباح الشامل">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تحليل الأرباح الشامل</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تحليل مفصل لصافي الأرباح الشهري واليومي</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('daily')}
                        className={`flex items-center gap-2 px-5 h-11 rounded-[16px] font-bold text-sm transition-all ${
                            activeTab === 'daily' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'spatial-input text-slate-600 dark:text-white/60 hover:border-primary/30'
                        }`}>
                        <TrendingUp className="w-4 h-4" /> تحليل يومي
                    </button>
                    <button onClick={() => setActiveTab('stock_profit')}
                        className={`flex items-center gap-2 px-5 h-11 rounded-[16px] font-bold text-sm transition-all ${
                            activeTab === 'stock_profit' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'spatial-input text-slate-600 dark:text-white/60 hover:border-primary/30'
                        }`}>
                        <FileText className="w-4 h-4" /> تقرير الأرباح (بالتاريخ)
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 min-w-0 flex flex-col gap-6">

                    {activeTab === 'daily' && (<>
                        <div className="spatial-card p-6 flex flex-col gap-2 border border-primary/20 bg-primary/5">
                            <p className="text-sm font-black text-primary uppercase tracking-widest">صافي الربح للفترة المحددة</p>
                            <p className="text-4xl font-black text-primary">{fmt(profitSummary.total_profit)} <span className="text-lg">د.ل</span></p>
                        </div>

                        {/* Daily Table */}
                        <SpatialCard 
                            title={`التفصيل الشهري للأرباح (${profitSummary.monthly.length} شهر)`} 
                            icon={<TrendingUp className="w-4 h-4" />}
                            action={
                                <div className="flex items-center gap-2">
                                    <a href={buildDailyExportUrl('excel')} target="_blank"
                                        className="w-10 h-10 rounded-[14px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                        title="تصدير إكسيل"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                    </a>
                                    <a href={buildDailyExportUrl('pdf')} target="_blank"
                                        className="w-10 h-10 rounded-[14px] bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                                        title="تصدير PDF"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                            }
                        >
                            {profitSummary.monthly.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <TrendingUp className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">لا توجد مبيعات في هذه الفترة</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[16px]">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                {['الشهر', 'صافي المبيعات', 'الربح', ''].map(h => (
                                                    <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {profitSummary.monthly.map(m => (
                                                <React.Fragment key={m.month}>
                                                    <tr className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{m.month}</td>
                                                        <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{fmt(m.net_sales)}</td>
                                                        <td className="px-4 py-4 font-black text-emerald-600 dark:text-emerald-400">{fmt(m.profit)}</td>
                                                        <td className="px-4 py-4">
                                                            <button onClick={() => toggleExpand(m.month)}
                                                                className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors">
                                                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(m.month) ? 'rotate-90' : ''}`} />
                                                                تفاصيل
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {expanded.has(m.month) && (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-4 bg-black/2 dark:bg-white/2 rounded-[16px] my-2">
                                                                <table className="w-full text-[15px]">
                                                                    <thead>
                                                                        <tr className="border-b border-black/5 dark:border-white/5">
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">التاريخ</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">المبيعات</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">المرتجعات</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">صافي البيع</th>
                                                                            <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/40 text-sm uppercase tracking-widest">الربح</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                                        {m.days.map((d, i) => (
                                                                            <tr key={i} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                                                <td className="py-3 px-4 font-bold text-slate-600 dark:text-white/60">{d.date}</td>
                                                                                <td className="py-3 px-4 font-bold text-slate-500 dark:text-white/50">{fmt(d.sales)}</td>
                                                                                <td className="py-3 px-4 font-bold text-slate-500 dark:text-white/50">{fmt(d.returns)}</td>
                                                                                <td className="py-3 px-4 font-black text-slate-800 dark:text-white">{fmt(d.net_sales)}</td>
                                                                                <td className={`py-3 px-4 font-black ${d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(d.profit)}</td>
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
                                            <tr className="border-t-2 border-black/10 dark:border-white/10">
                                                <td className="px-4 py-4 font-black text-slate-500 dark:text-white/40 text-xs uppercase">الإجمالي</td>
                                                <td className="px-4 py-4 font-black text-slate-800 dark:text-white">
                                                    {fmt(profitSummary.monthly.reduce((a, b) => a + b.net_sales, 0))}
                                                </td>
                                                <td className="px-4 py-4 font-black text-emerald-600 dark:text-emerald-400">
                                                    {fmt(profitSummary.total_profit)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </SpatialCard>
                    </>)}

                    {activeTab === 'stock_profit' && (<>
                        <div className="spatial-card px-5 h-12 flex items-center justify-between gap-4 border border-primary/20 bg-primary/5 rounded-[16px]">
                            <p className="text-sm font-black text-primary uppercase tracking-widest">إجمالي الربح:</p>
                            <p className="text-xl font-black text-primary">
                                {fmt(stockProfitData.reduce((sum, p) => sum + (p.profit ?? 0), 0))} <span className="text-xs">د.ل</span>
                            </p>
                        </div>

                        <SpatialCard 
                            title={`تقرير الأرباح (${displayData.length})`} 
                            icon={<FileText className="w-4 h-4" />}
                            action={
                                <div className="flex items-center gap-2">
                                    <a href={buildStockExportUrl('excel')} target="_blank"
                                        className="w-10 h-10 rounded-[14px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                        title="تصدير إكسيل"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                    </a>
                                    <a href={buildStockExportUrl('pdf')} target="_blank"
                                        className="w-10 h-10 rounded-[14px] bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                                        title="تصدير PDF"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                            }
                        >
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-[16px]">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {(compactView
                                                ? ['المنتج','متوسط شراء','متوسط بيع','صافي كمية المبيعات','الربح']
                                                : ['المنتج','اجمالي المشتراه','اجمالي المخزون','اجمالي المبيعات','اجمالي التالف','مرتجع مورد','متوسط ارجاع المورد','مرتجع زبائن','متوسط ارجاع الزبائن','متوسط شراء','متوسط بيع','الربح']
                                            ).map(h => (
                                                <th key={h} className="text-right px-4 py-4 text-sm font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {displayData.map(p => (
                                            <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                                <td className="px-4 py-4 font-black text-slate-800 dark:text-white">{p.name}</td>
                                                {compactView ? (<>
                                                    <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_purchase_cost)}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-500 dark:text-white/50 whitespace-nowrap">{fmt(p.avg_sale_price)}</td>
                                                    <td className="px-4 py-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{fmt(p.net_sale_qty)} {p.unit}</td>
                                                </>) : (<>
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
                                                </>)}
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
                                {displayData.map(p => (
                                    <div key={p.id} className="rounded-[20px] border border-black/8 dark:border-white/12 overflow-hidden">
                                        <div className="px-4 py-3 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                            <span className="font-black text-slate-800 dark:text-white text-sm">{p.name}</span>
                                            <span className={`font-black text-sm ${p.profit !== null ? (p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}`}>
                                                {p.profit !== null ? fmt(p.profit) : '—'}
                                            </span>
                                        </div>
                                        <div className="px-4 py-2 flex flex-col gap-1.5 text-sm">
                                            {[
                                                ['اجمالي المشتراه', `${fmt(p.total_purchased)} ${p.unit}`, 'text-blue-600 dark:text-blue-400'],
                                                ['اجمالي المخزون', `${fmt(p.stock)} ${p.unit}`, 'text-slate-800 dark:text-white'],
                                                ['اجمالي المبيعات', `${fmt(p.total_sold)} ${p.unit}`, 'text-emerald-600 dark:text-emerald-400'],
                                                ['متوسط شراء', fmt(p.avg_purchase_cost), 'text-slate-500 dark:text-white/50'],
                                                ['متوسط بيع', fmt(p.avg_sale_price), 'text-slate-500 dark:text-white/50'],
                                            ].map(([label, value, cls]) => (
                                                <div key={label as string} className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">{label}</span>
                                                    <span className={`font-bold ${cls}`}>{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SpatialCard>
                    </>)}

                    </div>

                    {/* Filter Sidebar */}
                    <div className="w-full lg:w-[320px] shrink-0">
                        {activeTab === 'daily' ? (
                            <SpatialCard title="فلترة" icon={<FileText className="w-4 h-4" />}>
                                <div className="flex flex-col gap-4">
                                    <ModernMultiSelect
                                        label="المنتجات"
                                        placeholder="الكل"
                                        options={products.map(p => ({ value: String(p.id), label: p.name }))}
                                        defaultValues={productIds.map(String)}
                                        onSelect={(vals) => setProductIds(vals.map(Number))}
                                    />
                                    <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                                    <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                                    <button onClick={searchDaily}
                                        className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                                        <Search className="w-4 h-4" /> عرض التقرير
                                    </button>
                                    {(dateFrom || dateTo || productIds.length > 0) && (
                                        <button onClick={() => { setDateFrom(''); setDateTo(''); setProductIds([]); router.get('/reports/profit-analysis', { stock_date_from: stockDateFrom || undefined, stock_date_to: stockDateTo || undefined, stock_category_id: stockCategoryId || undefined, stock_product_ids: stockProductIds.length ? stockProductIds.join(',') : undefined }); }}
                                            className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                            إعادة تعيين
                                        </button>
                                    )}
                                </div>
                            </SpatialCard>
                        ) : (
                            <SpatialCard title="فلترة" icon={<FileText className="w-4 h-4" />}>
                                <div className="flex flex-col gap-4">
                                    <ModernSelect
                                        label="التصنيف"
                                        placeholder="الكل"
                                        options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                                        defaultValue={stockCategoryId ? (categories.find(c => String(c.id) === stockCategoryId)?.name ?? '') : 'الكل'}
                                        onSelect={val => setStockCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
                                    />
                                    <ModernMultiSelect
                                        label="المنتجات"
                                        placeholder="الكل"
                                        options={products.map(p => ({ value: String(p.id), label: p.name }))}
                                        defaultValues={stockProductIds.map(String)}
                                        onSelect={(vals) => setStockProductIds(vals.map(Number))}
                                    />
                                    <DateFilterInput label="من تاريخ" value={stockDateFrom} onChange={setStockDateFrom} />
                                    <DateFilterInput label="إلى تاريخ" value={stockDateTo} onChange={setStockDateTo} />
                                    <div className="flex items-center gap-3 px-1">
                                        <button onClick={() => setCompactView(p => !p)}
                                            className={`w-11 h-6 rounded-full transition-all relative ${compactView ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${compactView ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
                                        </button>
                                        <span className="text-sm font-bold text-slate-600 dark:text-white/70">عرض مختصر للربح</span>
                                    </div>
                                    <button onClick={searchStock}
                                        className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                                        <Search className="w-4 h-4" /> عرض التقرير
                                    </button>
                                    {(stockDateFrom || stockDateTo || stockCategoryId || stockProductIds.length > 0) && (
                                        <button onClick={() => { setStockDateFrom(''); setStockDateTo(''); setStockCategoryId(''); setStockProductIds([]); router.get('/reports/profit-analysis', { date_from: dateFrom || undefined, date_to: dateTo || undefined, product_ids: productIds.length ? productIds.join(',') : undefined }); }}
                                            className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                            إعادة تعيين
                                        </button>
                                    )}
                                </div>
                            </SpatialCard>
                        )}
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
