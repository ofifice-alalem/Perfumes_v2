import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import {
    ChevronRight,
    Users,
    Truck,
    Package,
    CreditCard,
    BarChart2,
    Calendar,
    Trash2,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    ChevronLeft,
    Sparkles,
    FileText,
    Clock
} from 'lucide-react';

interface SnapshotItem {
    id: number;
    type: string;
    entity_id: number | null;
    entity_name: string | null;
    balance: number | string;
}

interface DailyProfit {
    id: number;
    date: string;
    sales: number;
    returns: number;
    net_sales: number;
    profit: number;
}

interface ProductStock {
    id: number; name: string; category_name: string; unit: string; stock: number;
    product_name?: string;
    total_purchased: number | null; total_sold: number | null; total_wasted: number | null;
    total_return_in: number | null; avg_return_in_price: number | null;
    total_return_out: number | null; avg_return_out_price: number | null;
    net_sale_qty: number | null; avg_purchase_cost: number | null;
    avg_sale_price: number | null; profit: number | null;
}

interface Snapshot {
    id: number;
    snapshot_at: string;
    notes: string | null;
    created_by: { name: string };
    items: SnapshotItem[];
    daily_profits: DailyProfit[];
    stock_profits: ProductStock[];
}

interface Period {
    id: number;
    name: string;
    started_at: string;
    closed_at: string | null;
    status: string;
    snapshot: Snapshot;
}

interface Props { period: Period; }

function fmt(v: number | string) {
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

/* =========================================================================
   STOCK EQUATION TABLE (FULL WIDTH & EXTRA LARGE FONTS FOR POS)
   ========================================================================= */
function StockEquationTable({ products, opening, purchased, sold, waste, customerReturns, supplierReturns }: {
    products: SnapshotItem[];
    opening: SnapshotItem[];
    purchased: SnapshotItem[];
    sold: SnapshotItem[];
    waste: SnapshotItem[];
    customerReturns: SnapshotItem[];
    supplierReturns: SnapshotItem[];
}) {
    const allIds = Array.from(new Set([
        ...products.map(p => p.entity_id),
        ...opening.map(p => p.entity_id),
        ...purchased.map(p => p.entity_id),
        ...sold.map(p => p.entity_id),
        ...waste.map(p => p.entity_id),
        ...customerReturns.map(p => p.entity_id),
        ...supplierReturns.map(p => p.entity_id),
    ])).filter(Boolean) as number[];

    const getName = (id: number) =>
        [...products, ...opening, ...purchased, ...sold, ...waste, ...customerReturns, ...supplierReturns]
            .find(i => i.entity_id === id)?.entity_name ?? '—';

    const getVal = (arr: SnapshotItem[], id: number) =>
        Number(arr.find(i => i.entity_id === id)?.balance ?? 0);

    const rows = allIds.map(id => {
        const openingQty   = getVal(opening, id);
        const purchasedQty = getVal(purchased, id);
        const custRetQty   = getVal(customerReturns, id);
        const soldQty      = getVal(sold, id);
        const wasteQty     = getVal(waste, id);
        const suppRetQty   = getVal(supplierReturns, id);
        const stockQty     = getVal(products, id);
        const left  = openingQty + purchasedQty + custRetQty;
        const right = soldQty + wasteQty + suppRetQty + stockQty;
        const diff  = right - left;
        return { id, name: getName(id), openingQty, purchasedQty, custRetQty, soldQty, wasteQty, suppRetQty, stockQty, diff };
    });

    const allBalanced = rows.every(r => r.diff === 0);

    return (
        <SpatialCard
            title="معادلة التحقق من متوازنات المخزون"
            icon={allBalanced
                ? <CheckCircle className="w-7 h-7 text-emerald-500" />
                : <AlertTriangle className="w-7 h-7 text-amber-500" />
            }
        >
            <div className="p-5 mb-5 rounded-[22px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 leading-relaxed flex items-center flex-wrap gap-3">
                <span className="text-slate-700 dark:text-slate-300">مخزون البداية</span>
                <span className="text-primary font-black">+ المشتريات</span>
                <span className="text-blue-500 font-black">+ مرتجع العملاء</span>
                <span className="font-black text-xl text-slate-900 dark:text-white">=</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">المباع</span>
                <span className="text-red-500 font-black">+ التالف</span>
                <span className="text-amber-500 font-black">+ مرتجع الموردين</span>
                <span className="text-slate-900 dark:text-white font-black">+ المخزون النهائي</span>
            </div>

            {allBalanced ? (
                <div className="p-5 mb-5 rounded-[22px] bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center gap-3 text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="w-7 h-7 shrink-0 text-emerald-500" />
                    <span>جميع كميات المخزون متوازنة ومطابقة بتمام ✅</span>
                </div>
            ) : (
                <div className="p-5 mb-5 rounded-[22px] bg-amber-500/15 border-2 border-amber-500/40 flex items-center gap-3 text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-7 h-7 shrink-0 text-amber-500" />
                    <span>تنبيه: تم تسجيل فرق في كميات بعض المنتجات أثناء الإقفال</span>
                </div>
            )}

            <div className="overflow-x-auto w-full">
                <table className="w-full text-right border-collapse min-w-[900px]">
                    <thead>
                        <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                            <th className="p-5 rounded-r-[18px]">المنتج</th>
                            <th className="p-5 whitespace-nowrap">مخزون البداية</th>
                            <th className="p-5 text-primary whitespace-nowrap">المشتريات</th>
                            <th className="p-5 text-blue-500 whitespace-nowrap">مرتجع عملاء</th>
                            <th className="p-5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">المباع</th>
                            <th className="p-5 text-red-500 whitespace-nowrap">التالف</th>
                            <th className="p-5 text-amber-500 whitespace-nowrap">مرتجع موردين</th>
                            <th className="p-5 whitespace-nowrap">المخزون النهائي</th>
                            <th className="p-5 rounded-l-[18px] whitespace-nowrap">الفرق</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/80 font-black text-base sm:text-xl">
                        {rows.map(row => (
                            <tr key={row.id} className={`transition-colors ${row.diff !== 0 ? 'bg-amber-500/15' : 'hover:bg-primary/5 dark:hover:bg-primary/10'}`}>
                                <td className="p-5 text-slate-900 dark:text-white">{row.name}</td>
                                <td className="p-5 text-slate-600 dark:text-slate-400">{row.openingQty}</td>
                                <td className="p-5 text-primary">{row.purchasedQty}</td>
                                <td className="p-5 text-blue-500">{row.custRetQty}</td>
                                <td className="p-5 text-emerald-600 dark:text-emerald-400">{row.soldQty}</td>
                                <td className="p-5 text-red-500">{row.wasteQty}</td>
                                <td className="p-5 text-amber-500">{row.suppRetQty}</td>
                                <td className="p-5 text-slate-800 dark:text-slate-200">{row.stockQty}</td>
                                <td className="p-5">
                                    {row.diff === 0 ? (
                                        <span className="px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-sm sm:text-base font-black">✓ مطابق</span>
                                    ) : (
                                        <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border-2 border-amber-500/40 text-sm sm:text-base font-black">
                                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SpatialCard>
    );
}

/* =========================================================================
   MAIN PERIODS SNAPSHOT PAGE
   ========================================================================= */
export default function PeriodsSnapshot({ period }: Props) {
    const { snapshot } = period;
    const items = snapshot.items;
    const [activeTab, setActiveTab] = useState<'summary' | 'daily' | 'stock_profit'>('summary');
    const [expanded, setExpanded]   = useState<Set<string>>(new Set());

    function toggleExpand(month: string) {
        setExpanded(prev => { const n = new Set(prev); n.has(month) ? n.delete(month) : n.add(month); return n; });
    }

    const dailyProfits = snapshot.daily_profits ?? [];
    const totalProfit  = dailyProfits.reduce((s, d) => s + Number(d.profit), 0);
    const monthlyMap   = dailyProfits.reduce<Record<string, { net_sales: number; profit: number; days: DailyProfit[] }>>((acc, d) => {
        const month = String(d.date).slice(0, 7);
        if (!acc[month]) acc[month] = { net_sales: 0, profit: 0, days: [] };
        acc[month].net_sales += Number(d.net_sales);
        acc[month].profit    += Number(d.profit);
        acc[month].days.push(d);
        return acc;
    }, {});
    const monthly = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

    const customers             = items.filter(i => i.type === 'customer');
    const suppliers             = items.filter(i => i.type === 'supplier');
    const products              = items.filter(i => i.type === 'product_stock');
    const openingStock          = items.filter(i => i.type === 'opening_stock');
    const wasteProducts         = items.filter(i => i.type === 'waste_product');
    const purchasedProducts     = items.filter(i => i.type === 'purchased_product');
    const soldProducts          = items.filter(i => i.type === 'sold_product');
    const customerReturnProducts = items.filter(i => i.type === 'customer_return_product');
    const supplierReturnProducts = items.filter(i => i.type === 'supplier_return_product');
    const paymentMethods        = items.filter(i => i.type === 'payment_method');
    const stats                 = items.filter(i => !['customer','supplier','product_stock','opening_stock','waste_product','purchased_product','sold_product','customer_return_product','supplier_return_product','payment_method'].includes(i.type));

    return (
        <AppShell pageTitle={`Snapshot — ${period.name}`}>
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <Link
                            href="/periods"
                            className="w-16 h-16 rounded-[22px] bg-slate-200 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer border-2 border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Snapshot — {period.name}
                                </h1>
                                <span className="px-4 py-1.5 rounded-full bg-primary/15 text-primary border-2 border-primary/30 font-black text-sm">
                                    سجل دائم (Snapshot)
                                </span>
                            </div>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                الأرصدة والملخص الإحصائي الموثّق لحظة الإقفال
                            </p>
                        </div>
                    </div>
                </div>

                {/* Spatial Tabs */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`h-16 sm:h-18 px-8 rounded-[22px] font-black text-lg sm:text-xl transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
                            activeTab === 'summary'
                                ? 'bg-primary text-white shadow-xl shadow-primary/25 border-2 border-primary'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                        }`}
                    >
                        <BarChart2 className="w-6 h-6" />
                        <span>ملخص Snapshot الأرصدة</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`h-16 sm:h-18 px-8 rounded-[22px] font-black text-lg sm:text-xl transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
                            activeTab === 'daily'
                                ? 'bg-primary text-white shadow-xl shadow-primary/25 border-2 border-primary'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                        }`}
                    >
                        <TrendingUp className="w-6 h-6" />
                        <span>التحليل اليومي المحفوظ</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('stock_profit')}
                        className={`h-16 sm:h-18 px-8 rounded-[22px] font-black text-lg sm:text-xl transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
                            activeTab === 'stock_profit'
                                ? 'bg-primary text-white shadow-xl shadow-primary/25 border-2 border-primary'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                        }`}
                    >
                        <BarChart2 className="w-6 h-6" />
                        <span>تقرير الأرباح المحفوظ للمنتجات</span>
                    </button>
                </div>

                {/* Tab 1: Daily Profit */}
                {activeTab === 'daily' && (
                    <div className="flex flex-col gap-6">
                        <SpatialCard className="p-8 border-2 border-primary/30 bg-primary/5">
                            <div className="flex flex-col gap-2">
                                <span className="text-base font-black text-primary uppercase tracking-widest">
                                    صافي الربح الإجمالي المحفوظ للفترة
                                </span>
                                <span className="text-4xl sm:text-6xl font-black text-primary">
                                    {fmt(totalProfit)} <span className="text-2xl font-bold">د.ل</span>
                                </span>
                            </div>
                        </SpatialCard>

                        <SpatialCard title={`التفصيل الشهري (${monthly.length} شهر)`} icon={<TrendingUp className="w-7 h-7 text-primary" />}>
                            {monthly.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                                    <TrendingUp className="w-12 h-12 opacity-30" />
                                    <p className="font-bold text-xl">لا توجد بيانات أرباح أُرجعت في هذا الـ Snapshot</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                                <th className="p-5 rounded-r-[18px]">الشهر</th>
                                                <th className="p-5">صافي المبيعات</th>
                                                <th className="p-5">الربح المحفوظ</th>
                                                <th className="p-5 rounded-l-[18px]">التفاصيل</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                            {monthly.map(m => (
                                                <React.Fragment key={m.month}>
                                                    <tr className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                        <td className="p-5 text-slate-900 dark:text-white">{m.month}</td>
                                                        <td className="p-5 text-slate-900 dark:text-white">{fmt(m.net_sales)} د.ل</td>
                                                        <td className="p-5 text-emerald-600 dark:text-emerald-400">{fmt(m.profit)} د.ل</td>
                                                        <td className="p-5">
                                                            <button
                                                                onClick={() => toggleExpand(m.month)}
                                                                className="h-12 px-5 rounded-[14px] bg-primary/10 hover:bg-primary hover:text-white text-primary font-black text-base transition-all flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <ChevronLeft className={`w-5 h-5 transition-transform ${expanded.has(m.month) ? '-rotate-90' : ''}`} />
                                                                <span>تفاصيل الأيام</span>
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {expanded.has(m.month) && (
                                                        <tr>
                                                            <td colSpan={4} className="p-6 bg-slate-100/60 dark:bg-slate-800/60 rounded-[24px]">
                                                                <table className="w-full text-right">
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
                                                                        {m.days.map(d => (
                                                                            <tr key={d.id} className="hover:bg-primary/5">
                                                                                <td className="py-4 px-5 text-slate-800 dark:text-slate-200">{String(d.date).slice(0, 10)}</td>
                                                                                <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{fmt(d.sales)}</td>
                                                                                <td className="py-4 px-5 text-amber-500">{fmt(d.returns)}</td>
                                                                                <td className="py-4 px-5 text-slate-900 dark:text-white font-black">{fmt(d.net_sales)}</td>
                                                                                <td className={`py-4 px-5 font-black ${Number(d.profit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(d.profit)}</td>
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
                                    </table>
                                </div>
                            )}
                        </SpatialCard>
                    </div>
                )}

                {/* Tab 2: Stock Profit */}
                {activeTab === 'stock_profit' && (
                    <div className="flex flex-col gap-6">
                        <SpatialCard title={`تقرير ربحية المنتجات في الـ Snapshot (${(snapshot.stock_profits ?? []).length})`} icon={<BarChart2 className="w-7 h-7 text-primary" />}>
                            {(snapshot.stock_profits ?? []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                                    <BarChart2 className="w-12 h-12 opacity-30" />
                                    <p className="font-bold text-xl">لا توجد بيانات ربح منتجات محفوظة في هذا الـ Snapshot</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                                <th className="p-5 rounded-r-[18px]">المنتج</th>
                                                <th className="p-5">متوسط كلفة الشراء</th>
                                                <th className="p-5">متوسط سعر البيع</th>
                                                <th className="p-5">صافي الكمية المباعة</th>
                                                <th className="p-5 rounded-l-[18px]">إجمالي الربح</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                            {snapshot.stock_profits.map(p => (
                                                <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                    <td className="p-5 text-slate-900 dark:text-white">{p.product_name ?? p.name}</td>
                                                    <td className="p-5 text-slate-600 dark:text-slate-400">{fmt(p.avg_purchase_cost || 0)} د.ل</td>
                                                    <td className="p-5 text-slate-600 dark:text-slate-400">{fmt(p.avg_sale_price || 0)} د.ل</td>
                                                    <td className="p-5 text-blue-600 dark:text-blue-400">{fmt(p.net_sale_qty || 0)} {p.unit}</td>
                                                    <td className="p-5">
                                                        <span className={p.profit !== null ? (Number(p.profit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}>
                                                            {p.profit !== null ? `${fmt(p.profit)} د.ل` : '—'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </SpatialCard>
                    </div>
                )}

                {/* Tab 3: Summary & Balances */}
                {activeTab === 'summary' && (
                    <div className="flex flex-col gap-8">
                        {/* Meta Metadata Card */}
                        <SpatialCard title="بيانات توثيق الـ Snapshot" icon={<Calendar className="w-7 h-7 text-primary" />}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">اسم الفترة</span>
                                    <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">{period.name}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">تاريخ الإغلاق</span>
                                    <span className="font-black text-slate-800 dark:text-slate-200 text-lg sm:text-xl">{fmtDate(period.closed_at)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">تاريخ توثيق Snapshot</span>
                                    <span className="font-black text-slate-800 dark:text-slate-200 text-lg sm:text-xl">{fmtDate(snapshot.snapshot_at)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">المستخدم المنفذ</span>
                                    <span className="font-black text-primary text-lg sm:text-xl">{snapshot.created_by?.name ?? '—'}</span>
                                </div>
                            </div>
                            {snapshot.notes && (
                                <div className="mt-5 p-5 rounded-[22px] bg-slate-100 dark:bg-slate-800/80 text-lg font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">الملاحظات المسجلة</span>
                                    {snapshot.notes}
                                </div>
                            )}
                        </SpatialCard>

                        {/* 1. Grids for Entities */}
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Customers */}
                            <SpatialCard title={`ديون العملاء الإجمالية (${customers.length})`} icon={<Users className="w-7 h-7 text-primary" />}>
                                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur-md">
                                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                                                <th className="p-5">العميل</th>
                                                <th className="p-5">الرصيد النهائي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-black text-lg sm:text-xl">
                                            {customers.map(c => (
                                                <tr key={c.id} className="hover:bg-primary/5">
                                                    <td className="p-5 text-slate-900 dark:text-white">{c.entity_name}</td>
                                                    <td className={`p-5 ${Number(c.balance) > 0 ? 'text-red-500' : Number(c.balance) < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                        {fmt(c.balance)} د.ل
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SpatialCard>

                            {/* Suppliers */}
                            <SpatialCard title={`ديون الموردين الإجمالية (${suppliers.length})`} icon={<Truck className="w-7 h-7 text-primary" />}>
                                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur-md">
                                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                                                <th className="p-5">المورد</th>
                                                <th className="p-5">الرصيد النهائي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-black text-lg sm:text-xl">
                                            {suppliers.map(s => (
                                                <tr key={s.id} className="hover:bg-primary/5">
                                                    <td className="p-5 text-slate-900 dark:text-white">{s.entity_name}</td>
                                                    <td className={`p-5 ${Number(s.balance) > 0 ? 'text-red-500' : Number(s.balance) < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                        {fmt(s.balance)} د.ل
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SpatialCard>

                            {/* Final Products Stock */}
                            <SpatialCard title={`كميات المخزون النهائي (${products.length})`} icon={<Package className="w-7 h-7 text-primary" />}>
                                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur-md">
                                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                                                <th className="p-5">المنتج</th>
                                                <th className="p-5">الكمية المسجلة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-black text-lg sm:text-xl">
                                            {products.map(p => (
                                                <tr key={p.id} className="hover:bg-primary/5">
                                                    <td className="p-5 text-slate-900 dark:text-white">{p.entity_name}</td>
                                                    <td className="p-5 text-slate-800 dark:text-slate-200">{p.balance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SpatialCard>

                            {/* Payment Methods */}
                            <SpatialCard title="أرصدة وسائل الدفع الخزينة" icon={<CreditCard className="w-7 h-7 text-primary" />}>
                                <div className="flex flex-col divide-y-2 divide-slate-100 dark:divide-slate-800">
                                    {paymentMethods.map(pm => (
                                        <div key={pm.id} className="flex items-center justify-between p-5">
                                            <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">{pm.entity_name}</span>
                                            <span className={`font-black text-xl sm:text-2xl ${Number(pm.balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                {fmt(pm.balance)} د.ل
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </SpatialCard>
                        </div>

                        {/* 2. Full-Width Stock Equation Table placed at the BOTTOM */}
                        <StockEquationTable
                            products={products}
                            opening={openingStock}
                            purchased={purchasedProducts}
                            sold={soldProducts}
                            waste={wasteProducts}
                            customerReturns={customerReturnProducts}
                            supplierReturns={supplierReturnProducts}
                        />
                    </div>
                )}
            </div>
        </AppShell>
    );
}
