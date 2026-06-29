import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { RefreshCw, ChevronLeft, AlertTriangle, Users, Truck, CreditCard, BarChart2, CheckCircle } from 'lucide-react';

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
}

interface Props {
    currentPeriod: Period;
    preview: Preview;
    flash?: { success?: string; error?: string };
}

function fmt(v: number) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statLabels: Record<string, string> = {
    total_sales: 'إجمالي المبيعات', total_purchases: 'إجمالي المشتريات',
    total_returns_in: 'مرتجعات العملاء', total_returns_out: 'مرتجعات الموردين',
    total_waste: 'قيمة التالف', total_paid_in: 'مقبوضات العملاء',
    total_paid_out: 'مدفوعات الموردين', invoices_count: 'عدد الفواتير',
    purchases_count: 'عدد المشتريات', new_customers: 'عملاء جدد',
};

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
        // opening + purchased + customer_returns = sold + waste + supplier_returns + closing
        const left  = openingQty + purchasedQty + custRetQty;
        const right = soldQty + wasteQty + suppRetQty + stockQty;
        const diff  = right - left;
        return { id, name: getName(id), openingQty, purchasedQty, custRetQty, soldQty, wasteQty, suppRetQty, stockQty, diff };
    });

    const allBalanced = rows.every(r => r.diff === 0);

    return (
        <SpatialCard
            title="معادلة التحقق من المخزون"
            icon={allBalanced
                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                : <AlertTriangle className="w-4 h-4 text-amber-500" />
            }
        >
            <div className="px-4 py-3 mb-2 rounded-[14px] bg-black/3 dark:bg-white/3 text-xs font-bold text-slate-500 dark:text-white/40 leading-relaxed">
                <span className="text-slate-600 dark:text-white/60">مخزون البداية</span>
                {' + '}
                <span className="text-primary">المشتري</span>
                {' + '}
                <span className="text-blue-500">مرتجع عملاء</span>
                {' = '}
                <span className="text-emerald-600 dark:text-emerald-400">المباع</span>
                {' + '}
                <span className="text-red-500">التالف</span>
                {' + '}
                <span className="text-orange-500">مرتجع موردين</span>
                {' + '}
                <span className="text-slate-700 dark:text-white/80">المخزون النهائي</span>
            </div>

            {allBalanced ? (
                <div className="px-4 py-3 mb-3 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" /> جميع الأرقام متطابقة ✅
                </div>
            ) : (
                <div className="px-4 py-3 mb-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> يوجد فرق في بعض المنتجات — يُنصح بمراجعة الحركات قبل التدوير
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-[16px]">
                    <thead>
                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                            <th className="text-right px-3 py-4 text-sm font-black text-slate-500 dark:text-white/40 whitespace-nowrap">المنتج</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-slate-600 dark:text-white/60 whitespace-nowrap">مخزون البداية</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-primary whitespace-nowrap">المشتري</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-blue-500 whitespace-nowrap">مرتجع عملاء</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">المباع</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-red-500 whitespace-nowrap">التالف</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-orange-500 whitespace-nowrap">مرتجع موردين</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-slate-500 dark:text-white/40 whitespace-nowrap">المخزون النهائي</th>
                            <th className="text-right px-3 py-4 text-sm font-black text-slate-500 dark:text-white/40 whitespace-nowrap">الفرق</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {rows.map(row => (
                            <tr key={row.id} className={`transition-colors ${row.diff !== 0 ? 'bg-amber-500/5' : 'hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group'}`}>
                                <td className="px-3 py-4 font-bold text-slate-800 dark:text-white">{row.name}</td>
                                <td className="px-3 py-4 font-black text-slate-600 dark:text-white/60">{row.openingQty}</td>
                                <td className="px-3 py-4 font-black text-primary">{row.purchasedQty}</td>
                                <td className="px-3 py-4 font-black text-blue-500">{row.custRetQty}</td>
                                <td className="px-3 py-4 font-black text-emerald-600 dark:text-emerald-400">{row.soldQty}</td>
                                <td className="px-3 py-4 font-black text-red-500">{row.wasteQty}</td>
                                <td className="px-3 py-4 font-black text-orange-500">{row.suppRetQty}</td>
                                <td className="px-3 py-4 font-black text-slate-700 dark:text-white/80">{row.stockQty}</td>
                                <td className="px-3 py-4">
                                    {row.diff === 0 ? (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">✓</span>
                                    ) : (
                                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
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

export default function PeriodsRollover({ currentPeriod, preview, flash }: Props) {
    const [newName, setNewName]       = useState('');
    const [notes, setNotes]           = useState('');
    const [confirmed, setConfirmed]   = useState(false);
    const [processing, setProcessing] = useState(false);

    function submit() {
        if (!newName.trim()) { alert('اسم الفترة الجديدة مطلوب'); return; }
        if (!confirmed) { alert('يجب تأكيد التدوير أولاً'); return; }
        setProcessing(true);
        router.post('/periods/execute', { new_period_name: newName, notes }, {
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <AppShell pageTitle="تنفيذ التدوير">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                <div className="flex items-center gap-3">
                    <Link href="/periods"
                        className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 flex items-center justify-center transition-all">
                        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-white/60" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تنفيذ التدوير</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">
                            إغلاق فترة <strong>{currentPeriod.name}</strong> وفتح فترة جديدة
                        </p>
                    </div>
                </div>

                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                <div className="px-5 py-4 rounded-[18px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                        سيتم إغلاق الفترة الحالية وفتح فترة جديدة.<br />
                        البيانات القديمة ستبقى محفوظة ويمكن الرجوع إليها في التقارير.
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_400px] gap-6">
                    <div className="flex flex-col gap-6">

                        {/* Customers */}
                        <SpatialCard title={`ديون العملاء (${preview.customers.length})`} icon={<Users className="w-4 h-4" />}>
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="w-full text-[16px]">
                                    <thead className="sticky top-0">
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">العميل</th>
                                            <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {preview.customers.map(c => (
                                            <tr key={c.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{c.name}</td>
                                                <td className={`px-4 py-2 font-black ${c.balance > 0 ? 'text-red-500' : c.balance < 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                    {fmt(c.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SpatialCard>

                        {/* Suppliers */}
                        <SpatialCard title={`ديون الموردين (${preview.suppliers.length})`} icon={<Truck className="w-4 h-4" />}>
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="w-full text-[16px]">
                                    <thead className="sticky top-0">
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">المورد</th>
                                            <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {preview.suppliers.map(s => (
                                            <tr key={s.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{s.name}</td>
                                                <td className={`px-4 py-2 font-black ${s.balance > 0 ? 'text-red-500' : s.balance < 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                    {fmt(s.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SpatialCard>

                        {/* Stock Equation */}
                        <StockEquationTable
                            products={preview.products}
                            opening={preview.opening_stock}
                            purchased={preview.purchased_products}
                            sold={preview.sold_products}
                            waste={preview.waste_products}
                            customerReturns={preview.customer_return_products}
                            supplierReturns={preview.supplier_return_products}
                        />

                        {/* Payment Methods */}
                        <SpatialCard title="الخزينة" icon={<CreditCard className="w-4 h-4" />}>
                            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                                {preview.payment_methods.map(pm => (
                                    <div key={pm.id} className="flex items-center justify-between px-4 py-3">
                                        <span className="font-bold text-slate-700 dark:text-white/80">{pm.name}</span>
                                        <span className={`font-black ${pm.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                            {fmt(pm.balance)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </SpatialCard>

                        {/* Stats */}
                        <SpatialCard title="ملخص الفترة" icon={<BarChart2 className="w-4 h-4" />}>
                            <div className="flex flex-col gap-4 p-1">

                                {/* المبيعات */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1">المبيعات</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'total_sales',     label: 'إجمالي المبيعات',   color: 'text-emerald-600 dark:text-emerald-400' },
                                            { key: 'invoices_count',  label: 'عدد الفواتير',       color: 'text-slate-800 dark:text-white' },
                                            { key: 'total_returns_in',label: 'مرتجعات العملاء',   color: 'text-amber-600 dark:text-amber-400' },
                                            { key: 'total_paid_in',   label: 'مقبوضات العملاء',   color: 'text-primary' },
                                            { key: 'new_customers',   label: 'عملاء جدد',          color: 'text-slate-800 dark:text-white' },
                                        ].map(({ key, label, color }) => (
                                            <div key={key} className="flex flex-col gap-1 px-4 py-3 rounded-[14px] bg-emerald-500/5 border border-emerald-500/10">
                                                <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                                                <span className={`font-black text-lg ${color}`}>
                                                    {['invoices_count','new_customers'].includes(key)
                                                        ? preview.stats[key as keyof Stats]
                                                        : fmt(preview.stats[key as keyof Stats] as number)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px bg-black/5 dark:bg-white/8" />

                                {/* المشتريات */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1">المشتريات</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'total_purchases',  label: 'إجمالي المشتريات',  color: 'text-primary' },
                                            { key: 'purchases_count',  label: 'عدد المشتريات',     color: 'text-slate-800 dark:text-white' },
                                            { key: 'total_returns_out',label: 'مرتجعات الموردين',  color: 'text-amber-600 dark:text-amber-400' },
                                            { key: 'total_paid_out',   label: 'مدفوعات الموردين',  color: 'text-red-500' },
                                        ].map(({ key, label, color }) => (
                                            <div key={key} className="flex flex-col gap-1 px-4 py-3 rounded-[14px] bg-primary/5 border border-primary/10">
                                                <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                                                <span className={`font-black text-lg ${color}`}>
                                                    {key === 'purchases_count'
                                                        ? preview.stats[key as keyof Stats]
                                                        : fmt(preview.stats[key as keyof Stats] as number)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px bg-black/5 dark:bg-white/8" />

                                {/* المخزون */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1">المخزون</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1 px-4 py-3 rounded-[14px] bg-red-500/5 border border-red-500/10">
                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">قيمة التالف</span>
                                            <span className="font-black text-lg text-red-500">{fmt(preview.stats.total_waste)}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </SpatialCard>
                    </div>

                    {/* Confirm */}
                    <div className="flex flex-col gap-5">
                        <SpatialCard title="تأكيد التدوير" icon={<RefreshCw className="w-4 h-4" />}>
                            <div className="flex flex-col gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 dark:text-white/60 mb-2">
                                        اسم الفترة الجديدة <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                        className="w-full h-12 rounded-[14px] spatial-input text-right font-bold text-slate-800 dark:text-white px-4"
                                        placeholder="مثال: 2027" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 dark:text-white/60 mb-2">ملاحظات (اختياري)</label>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                        className="w-full h-24 rounded-[14px] spatial-input text-right font-bold text-slate-800 dark:text-white resize-none p-4"
                                        placeholder="ملاحظات عن التدوير..." />
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded accent-primary" />
                                    <span className="text-sm font-bold text-slate-600 dark:text-white/60 leading-relaxed">
                                        أؤكد أنني أريد إغلاق الفترة الحالية وفتح فترة جديدة. هذا الإجراء لا يمكن التراجع عنه.
                                    </span>
                                </label>
                                <button onClick={submit} disabled={!newName.trim() || !confirmed || processing}
                                    className="w-full h-12 rounded-[14px] bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    <RefreshCw className={`w-5 h-5 ${processing ? 'animate-spin' : ''}`} />
                                    {processing ? 'جاري التدوير...' : 'تنفيذ التدوير'}
                                </button>
                            </div>
                        </SpatialCard>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
