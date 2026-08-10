import React, { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, DraggableOnScreenKeyboard } from '@/components/ui/SpatialComponents';
import {
    RefreshCw,
    ChevronRight,
    AlertTriangle,
    Users,
    Truck,
    CreditCard,
    BarChart2,
    CheckCircle,
    TrendingUp,
    ChevronLeft,
    Keyboard,
    FileText,
    Sparkles,
    Calendar,
    ArrowLeftRight
} from 'lucide-react';

interface Period { id: number; name: string; started_at: string; }

interface CustomerRow      { id: number; name: string; balance: number; }
interface SupplierRow      { id: number; name: string; balance: number; }
interface ProductRow       { id: number; name: string; stock: number; }
interface OpeningStockRow  { id: number; name: string; quantity: number; }
interface WasteProductRow  { id: number; name: string; quantity: number; }
interface PurchasedRow     { id: number; name: string; quantity: number; }
interface SoldRow          { id: number; name: string; quantity: number; }
interface ReturnRow        { id: number; name: string; quantity: number; }
interface PaymentMethodRow { id: number; name: string; balance: number; }

interface Stats {
    total_sales: number; total_purchases: number;
    total_returns_in: number; total_returns_out: number;
    total_waste: number; total_paid_in: number; total_paid_out: number;
    invoices_count: number; purchases_count: number; new_customers: number;
}

interface ProductStock {
    id: number; name: string; category: string; unit: string; stock: number;
    total_purchased: number | null; total_sold: number | null; total_wasted: number | null;
    total_return_in: number | null; avg_return_in_price: number | null;
    total_return_out: number | null; avg_return_out_price: number | null;
    net_sale_qty: number | null; avg_purchase_cost: number | null;
    avg_sale_price: number | null; profit: number | null;
}

interface Preview {
    customers: CustomerRow[];
    suppliers: SupplierRow[];
    products: ProductRow[];
    opening_stock: OpeningStockRow[];
    waste_products: WasteProductRow[];
    purchased_products: PurchasedRow[];
    sold_products: SoldRow[];
    customer_return_products: ReturnRow[];
    supplier_return_products: ReturnRow[];
    payment_methods: PaymentMethodRow[];
    stats: Stats;
    stock_profit_data: ProductStock[];
}

interface DailyProfit { date: string; sales: number; returns: number; net_sales: number; profit: number; }
interface MonthlyProfit { month: string; sales: number; returns: number; net_sales: number; profit: number; days: DailyProfit[]; }
interface ProfitSummary { total_profit: number; monthly: MonthlyProfit[]; daily: DailyProfit[]; }

interface Props {
    currentPeriod: Period;
    preview: Preview;
    profitSummary: ProfitSummary;
    periodDateFrom: string;
    periodDateTo: string;
    flash?: { success?: string; error?: string };
}

function fmt(v: number) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* =========================================================================
   STOCK EQUATION TABLE (FULL WIDTH & EXTRA LARGE FONTS FOR POS)
   ========================================================================= */
function StockEquationTable({ products, opening, purchased, sold, waste, customerReturns, supplierReturns }: {
    products: ProductRow[];
    opening: OpeningStockRow[];
    purchased: PurchasedRow[];
    sold: SoldRow[];
    waste: WasteProductRow[];
    customerReturns: ReturnRow[];
    supplierReturns: ReturnRow[];
}) {
    const allIds = Array.from(new Set([
        ...products.map(p => p.id),
        ...opening.map(p => p.id),
        ...purchased.map(p => p.id),
        ...sold.map(p => p.id),
        ...waste.map(p => p.id),
        ...customerReturns.map(p => p.id),
        ...supplierReturns.map(p => p.id),
    ]));

    const getName = (id: number) =>
        [...products, ...opening, ...purchased, ...sold, ...waste, ...customerReturns, ...supplierReturns]
            .find(p => p.id === id)?.name ?? '—';

    const rows = allIds.map(id => {
        const openingQty    = opening.find(p => p.id === id)?.quantity ?? 0;
        const purchasedQty  = purchased.find(p => p.id === id)?.quantity ?? 0;
        const custRetQty    = customerReturns.find(p => p.id === id)?.quantity ?? 0;
        const soldQty       = sold.find(p => p.id === id)?.quantity ?? 0;
        const wasteQty      = waste.find(p => p.id === id)?.quantity ?? 0;
        const suppRetQty    = supplierReturns.find(p => p.id === id)?.quantity ?? 0;
        const stockQty      = products.find(p => p.id === id)?.stock ?? 0;

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
                    <span>جميع معادلات المخزون متطابقة بنجاح (لا توجد فروقات) ✅</span>
                </div>
            ) : (
                <div className="p-5 mb-5 rounded-[22px] bg-amber-500/15 border-2 border-amber-500/40 flex items-center gap-3 text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-7 h-7 shrink-0 text-amber-500" />
                    <span>تنبيه: يوجد فروقات في كميات بعض المنتجات — يُرجى المراجعة قبل التدوير</span>
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
   MAIN PERIODS ROLLOVER PAGE
   ========================================================================= */
export default function PeriodsRollover({ currentPeriod, preview, profitSummary, periodDateFrom, periodDateTo, flash }: Props) {
    const [activeTab, setActiveTab]   = useState<'summary' | 'daily' | 'stock_profit'>('summary');
    const [expanded, setExpanded]     = useState<Set<string>>(new Set());
    const [newName, setNewName]       = useState('');
    const [notes, setNotes]           = useState('');
    const [confirmed, setConfirmed]   = useState(false);
    const [processing, setProcessing] = useState(false);

    // Keyboard state
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeField, setActiveField]   = useState<'newName' | 'notes'>('newName');

    function toggleExpand(month: string) {
        setExpanded(prev => { const n = new Set(prev); n.has(month) ? n.delete(month) : n.add(month); return n; });
    }

    function submit() {
        if (!newName.trim()) { alert('اسم الفترة الجديدة مطلوب'); return; }
        if (!confirmed) { alert('يجب تأكيد التدوير أولاً'); return; }
        setProcessing(true);
        router.post('/periods/execute', { new_period_name: newName, notes }, {
            onFinish: () => setProcessing(false),
        });
    }

    const handleKeyPress = (char: string) => {
        if (activeField === 'newName') setNewName(prev => prev + char);
        else setNotes(prev => prev + char);
    };

    const handleBackspace = () => {
        if (activeField === 'newName') setNewName(prev => prev.slice(0, -1));
        else setNotes(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        if (activeField === 'newName') setNewName('');
        else setNotes('');
    };

    const handleSpace = () => {
        if (activeField === 'newName') setNewName(prev => prev + ' ');
        else setNotes(prev => prev + ' ');
    };

    return (
        <AppShell pageTitle="تنفيذ التدوير">
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
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                تنفيذ التدوير المحاسبي
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                إغلاق فترة <strong className="text-primary text-xl sm:text-2xl font-black">{currentPeriod.name}</strong> وتدوير الأرصدة لفترة جديدة
                            </p>
                        </div>
                    </div>
                </div>

                {flash?.error && (
                    <div className="p-6 rounded-[24px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-xl flex items-center gap-4 shadow-md">
                        <AlertTriangle className="w-7 h-7 text-red-500 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                <div className="p-6 sm:p-8 rounded-[30px] bg-amber-500/15 border-2 border-amber-500/40 flex items-start gap-5 shadow-md">
                    <AlertTriangle className="w-9 h-9 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-lg sm:text-xl font-black text-amber-900 dark:text-amber-200 leading-relaxed">
                        تنبيه هام: سيتم إغلاق الفترة المالية الحالية وتأمين بياناتها في Snapshot، وسيتم ترحيل أرصدة العملاء والموردين والمخزون للفترة المحاسبية الجديدة.
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
                        <span>ملخص الفترة</span>
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
                        <BarChart2 className="w-6 h-6" />
                        <span>تقرير أرباح المنتجات</span>
                    </button>
                </div>

                {/* Tab 1: Daily Analysis */}
                {activeTab === 'daily' && (
                    <div className="flex flex-col gap-6">
                        <SpatialCard className="p-8 border-2 border-primary/30 bg-primary/5">
                            <div className="flex flex-col gap-2">
                                <span className="text-base font-black text-primary uppercase tracking-widest">
                                    صافي الربح الإجمالي للفترة ({periodDateFrom} → {periodDateTo})
                                </span>
                                <span className="text-4xl sm:text-6xl font-black text-primary">
                                    {fmt(profitSummary.total_profit)} <span className="text-2xl font-bold">د.ل</span>
                                </span>
                            </div>
                        </SpatialCard>

                        <SpatialCard title={`التفصيل الشهري (${profitSummary.monthly.length} شهر)`} icon={<TrendingUp className="w-7 h-7 text-primary" />}>
                            {profitSummary.monthly.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                                    <TrendingUp className="w-12 h-12 opacity-30" />
                                    <p className="font-bold text-xl">لا توجد مبيعات في هذه الفترة</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                                <th className="p-5 rounded-r-[18px]">الشهر</th>
                                                <th className="p-5">صافي المبيعات</th>
                                                <th className="p-5">الربح</th>
                                                <th className="p-5 rounded-l-[18px]">التفاصيل</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                            {profitSummary.monthly.map(m => (
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
                                                                <span>عرض الأيام</span>
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
                                    </table>
                                </div>
                            )}
                        </SpatialCard>
                    </div>
                )}

                {/* Tab 2: Product Profit Report */}
                {activeTab === 'stock_profit' && (
                    <div className="flex flex-col gap-6">
                        <SpatialCard title={`تقرير ربحية المنتجات (${preview.stock_profit_data.length})`} icon={<BarChart2 className="w-7 h-7 text-primary" />}>
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
                                        {preview.stock_profit_data.map(p => (
                                            <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                <td className="p-5 text-slate-900 dark:text-white">{p.name}</td>
                                                <td className="p-5 text-slate-600 dark:text-slate-400">{p.avg_purchase_cost !== null ? `${fmt(p.avg_purchase_cost)} د.ل` : '—'}</td>
                                                <td className="p-5 text-slate-600 dark:text-slate-400">{p.avg_sale_price !== null ? `${fmt(p.avg_sale_price)} د.ل` : '—'}</td>
                                                <td className="p-5 text-blue-600 dark:text-blue-400">{fmt(p.net_sale_qty || 0)} {p.unit}</td>
                                                <td className="p-5">
                                                    <span className={p.profit !== null ? (p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-slate-400'}>
                                                        {p.profit !== null ? `${fmt(p.profit)} د.ل` : '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SpatialCard>
                    </div>
                )}

                {/* Tab 3: Main Summary & Confirmation */}
                {activeTab === 'summary' && (
                    <div className="flex flex-col gap-8">
                        {/* 1. Grid for Balances and Settings Confirmation */}
                        <div className="grid lg:grid-cols-[1fr_450px] gap-8">
                            <div className="flex flex-col gap-8">
                                {/* Customers */}
                                <SpatialCard title={`ديون العملاء المرحّلة (${preview.customers.length})`} icon={<Users className="w-7 h-7 text-primary" />}>
                                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                        <table className="w-full text-right border-collapse">
                                            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur-md">
                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                                                    <th className="p-5">العميل</th>
                                                    <th className="p-5">الرصيد المالي</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-black text-lg sm:text-xl">
                                                {preview.customers.map(c => (
                                                    <tr key={c.id} className="hover:bg-primary/5">
                                                        <td className="p-5 text-slate-900 dark:text-white">{c.name}</td>
                                                        <td className={`p-5 ${c.balance > 0 ? 'text-red-500' : c.balance < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {fmt(c.balance)} د.ل
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </SpatialCard>

                                {/* Suppliers */}
                                <SpatialCard title={`ديون الموردين المرحّلة (${preview.suppliers.length})`} icon={<Truck className="w-7 h-7 text-primary" />}>
                                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                        <table className="w-full text-right border-collapse">
                                            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur-md">
                                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                                                    <th className="p-5">المورد</th>
                                                    <th className="p-5">الرصيد المالي</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-black text-lg sm:text-xl">
                                                {preview.suppliers.map(s => (
                                                    <tr key={s.id} className="hover:bg-primary/5">
                                                        <td className="p-5 text-slate-900 dark:text-white">{s.name}</td>
                                                        <td className={`p-5 ${s.balance > 0 ? 'text-red-500' : s.balance < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {fmt(s.balance)} د.ل
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </SpatialCard>

                                {/* Payment Methods */}
                                <SpatialCard title="أرصدة وسائل الدفع والخزينة" icon={<CreditCard className="w-7 h-7 text-primary" />}>
                                    <div className="flex flex-col divide-y-2 divide-slate-100 dark:divide-slate-800">
                                        {preview.payment_methods.map(pm => (
                                            <div key={pm.id} className="flex items-center justify-between p-5">
                                                <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">{pm.name}</span>
                                                <span className={`font-black text-xl sm:text-2xl ${pm.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                    {fmt(pm.balance)} د.ل
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </SpatialCard>
                            </div>

                            {/* Confirmation Sidebar Panel */}
                            <div className="flex flex-col gap-6">
                                <SpatialCard title="إعدادات وتأكيد التدوير" icon={<RefreshCw className="w-7 h-7 text-primary" />}>
                                    <div className="flex flex-col gap-6">
                                        {/* New Period Name */}
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-base font-black text-slate-800 dark:text-slate-200">
                                                    اسم الفترة المحاسبية الجديدة <span className="text-red-500">*</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveField('newName');
                                                        setShowKeyboard(true);
                                                    }}
                                                    className="h-12 px-4 rounded-[14px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center gap-2 border-2 border-amber-500/30 cursor-pointer"
                                                >
                                                    <Keyboard className="w-5 h-5" />
                                                    <span>كيبورد</span>
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                placeholder="مثال: الفترة المالية 2027"
                                                className="spatial-input rounded-[20px] h-16 px-5 font-black text-xl w-full"
                                            />
                                        </div>

                                        {/* Notes */}
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-base font-black text-slate-800 dark:text-slate-200">
                                                    ملاحظات إضافية (اختياري)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveField('notes');
                                                        setShowKeyboard(true);
                                                    }}
                                                    className="h-12 px-4 rounded-[14px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center gap-2 border-2 border-amber-500/30 cursor-pointer"
                                                >
                                                    <Keyboard className="w-5 h-5" />
                                                    <span>كيبورد</span>
                                                </button>
                                            </div>
                                            <textarea
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                placeholder="أضف أي ملاحظات تود حفظها في الـ Snapshot..."
                                                rows={3}
                                                className="spatial-input rounded-[20px] p-5 font-black text-lg resize-none w-full"
                                            />
                                        </div>

                                        {/* Confirmation Checkbox */}
                                        <label className="flex items-start gap-4 p-5 rounded-[22px] bg-amber-500/15 border-2 border-amber-500/40 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={confirmed}
                                                onChange={e => setConfirmed(e.target.checked)}
                                                className="mt-1 w-7 h-7 rounded-[8px] accent-primary cursor-pointer shrink-0"
                                            />
                                            <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-relaxed">
                                                أقر وأؤكد رغبتي بتنفيذ عملية الإقفال وتدوير الأرصدة للفترة الجديدة.
                                            </span>
                                        </label>

                                        {/* Execute Button */}
                                        <button
                                            onClick={submit}
                                            disabled={!newName.trim() || !confirmed || processing}
                                            className="h-20 rounded-[24px] text-xl sm:text-2xl font-black flex items-center justify-center gap-3.5 w-full transition-all duration-300 active:scale-95 cursor-pointer border-2 touch-manipulation select-none bg-primary hover:bg-blue-600 text-white border-primary/40 shadow-2xl shadow-primary/30 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
                                        >
                                            <RefreshCw className={`w-8 h-8 ${processing ? 'animate-spin' : ''}`} />
                                            <span>{processing ? 'جارٍ تنفيذ التدوير...' : 'تنفيذ التدوير الآن'}</span>
                                        </button>
                                    </div>
                                </SpatialCard>
                            </div>
                        </div>

                        {/* 2. Full-Width Stock Equation Table placed at the BOTTOM */}
                        <StockEquationTable
                            products={preview.products}
                            opening={preview.opening_stock}
                            purchased={preview.purchased_products}
                            sold={preview.sold_products}
                            waste={preview.waste_products}
                            customerReturns={preview.customer_return_products}
                            supplierReturns={preview.supplier_return_products}
                        />
                    </div>
                )}
            </div>

            {/* Virtual Keyboard Portal */}
            {showKeyboard && (
                <DraggableOnScreenKeyboard
                    value={activeField === 'newName' ? newName : notes}
                    onKeyPress={handleKeyPress}
                    onBackspace={handleBackspace}
                    onClear={handleClear}
                    onSpace={handleSpace}
                    onClose={() => setShowKeyboard(false)}
                />
            )}
        </AppShell>
    );
}
