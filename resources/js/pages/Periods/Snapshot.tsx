import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ChevronLeft, Users, Truck, Package, CreditCard, BarChart2, Calendar, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface SnapshotItem {
    id: number;
    type: string;
    entity_id: number | null;
    entity_name: string | null;
    balance: number | string; // API may return string for decimals
}

interface Snapshot {
    id: number;
    snapshot_at: string;
    notes: string | null;
    created_by: { name: string };
    items: SnapshotItem[];
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

const statLabels: Record<string, string> = {
    total_sales: 'إجمالي المبيعات', total_purchases: 'إجمالي المشتريات',
    total_returns_in: 'مرتجعات العملاء', total_returns_out: 'مرتجعات الموردين',
    total_waste: 'قيمة التالف', total_paid_in: 'مقبوضات العملاء',
    total_paid_out: 'مدفوعات الموردين', invoices_count: 'عدد الفواتير',
    purchases_count: 'عدد المشتريات', new_customers: 'عملاء جدد',
};

const countTypes = ['invoices_count', 'purchases_count', 'new_customers'];

// ─── Stock Equation Table ────────────────────────────────────────────────────
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
                    <AlertTriangle className="w-4 h-4 shrink-0" /> يوجد فرق في بعض المنتجات — يُنصح بمراجعة الحركات
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

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PeriodsSnapshot({ period }: Props) {
    const { snapshot } = period;
    const items = snapshot.items;

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
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                <div className="flex items-center gap-3">
                    <Link href="/periods"
                        className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 flex items-center justify-center transition-all">
                        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-white/60" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Snapshot — {period.name}</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">الأرصدة النهائية والملخص الإحصائي</p>
                    </div>
                </div>

                {/* Meta */}
                <SpatialCard title="معلومات الـ Snapshot" icon={<Calendar className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">الفترة</span>
                            <span className="font-black text-slate-800 dark:text-white">{period.name}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">تاريخ الإغلاق</span>
                            <span className="font-bold text-slate-700 dark:text-white/80">{fmtDate(period.closed_at)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">وقت الـ Snapshot</span>
                            <span className="font-bold text-slate-700 dark:text-white/80">{fmtDate(snapshot.snapshot_at)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">أجراه</span>
                            <span className="font-bold text-slate-700 dark:text-white/80">{snapshot.created_by?.name ?? '—'}</span>
                        </div>
                    </div>
                    {snapshot.notes && (
                        <div className="mt-4 px-4 py-3 rounded-[14px] bg-black/3 dark:bg-white/3 text-sm font-bold text-slate-600 dark:text-white/60">
                            {snapshot.notes}
                        </div>
                    )}
                </SpatialCard>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Customers */}
                    <SpatialCard title={`ديون العملاء (${customers.length})`} icon={<Users className="w-4 h-4" />}>
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-[16px]">
                                <thead className="sticky top-0">
                                    <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                        <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">العميل</th>
                                        <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {customers.map(c => (
                                        <tr key={c.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                            <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{c.entity_name}</td>
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
                    <SpatialCard title={`ديون الموردين (${suppliers.length})`} icon={<Truck className="w-4 h-4" />}>
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-[16px]">
                                <thead className="sticky top-0">
                                    <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                        <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">المورد</th>
                                        <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {suppliers.map(s => (
                                        <tr key={s.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                            <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{s.entity_name}</td>
                                            <td className={`px-4 py-2 font-black ${s.balance > 0 ? 'text-red-500' : s.balance < 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40'}`}>
                                                {fmt(s.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SpatialCard>

                    {/* Products */}
                    <SpatialCard title={`المخزون النهائي (${products.length})`} icon={<Package className="w-4 h-4" />}>
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-[16px]">
                                <thead className="sticky top-0">
                                    <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                        <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">المنتج</th>
                                        <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">الكمية</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {products.map(p => (
                                        <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                            <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{p.entity_name}</td>
                                            <td className="px-4 py-2 font-black text-slate-700 dark:text-white/80">{p.balance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SpatialCard>

                    {/* Waste */}
                    <SpatialCard title={`التالف (${wasteProducts.length} منتج)`} icon={<Trash2 className="w-4 h-4 text-red-500" />}>
                        {wasteProducts.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-slate-400 dark:text-white/30 font-bold text-sm">لا يوجد تالف في هذه الفترة</div>
                        ) : (
                            <div className="overflow-x-auto max-h-72 overflow-y-auto">
                                <table className="w-full text-[16px]">
                                    <thead className="sticky top-0">
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">المنتج</th>
                                            <th className="text-right px-4 py-2 text-sm font-black text-slate-500 dark:text-white/40">الكمية التالفة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {wasteProducts.map(p => (
                                            <tr key={p.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group">
                                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-white/80">{p.entity_name}</td>
                                                <td className="px-4 py-2 font-black text-red-500">{p.balance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SpatialCard>

                    {/* Payment Methods */}
                    <SpatialCard title="الخزينة" icon={<CreditCard className="w-4 h-4" />}>
                        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                            {paymentMethods.map(pm => (
                                <div key={pm.id} className="flex items-center justify-between px-4 py-3">
                                    <span className="font-bold text-slate-700 dark:text-white/80">{pm.entity_name}</span>
                                    <span className={`font-black ${pm.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                        {fmt(pm.balance)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SpatialCard>
                </div>

                {/* Stock Equation */}
                <StockEquationTable
                    products={products}
                    opening={openingStock}
                    purchased={purchasedProducts}
                    sold={soldProducts}
                    waste={wasteProducts}
                    customerReturns={customerReturnProducts}
                    supplierReturns={supplierReturnProducts}
                />

                {/* Stats */}
                <SpatialCard title="الملخص الإحصائي" icon={<BarChart2 className="w-4 h-4" />}>
                    <div className="flex flex-col gap-4 p-1">

                        {/* المبيعات */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1">المبيعات</span>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {[
                                    { type: 'total_sales',      label: 'إجمالي المبيعات',   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/10' },
                                    { type: 'invoices_count',   label: 'عدد الفواتير',       color: 'text-slate-800 dark:text-white',         bg: 'bg-emerald-500/5 border-emerald-500/10' },
                                    { type: 'total_returns_in', label: 'مرتجعات العملاء',   color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-emerald-500/5 border-emerald-500/10' },
                                    { type: 'total_paid_in',    label: 'مقبوضات العملاء',   color: 'text-primary',                           bg: 'bg-emerald-500/5 border-emerald-500/10' },
                                    { type: 'new_customers',    label: 'عملاء جدد',          color: 'text-slate-800 dark:text-white',         bg: 'bg-emerald-500/5 border-emerald-500/10' },
                                ].map(({ type, label, color, bg }) => {
                                    const item = stats.find(s => s.type === type);
                                    return (
                                        <div key={type} className={`flex flex-col gap-1 px-4 py-3 rounded-[14px] border ${bg}`}>
                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                                            <span className={`font-black text-lg ${color}`}>
                                                {countTypes.includes(type)
                                                    ? (item?.balance ?? 0)
                                                    : fmt(item?.balance ?? 0)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px bg-black/5 dark:bg-white/8" />

                        {/* المشتريات */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1">المشتريات</span>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {[
                                    { type: 'total_purchases',   label: 'إجمالي المشتريات',  color: 'text-primary',                       bg: 'bg-primary/5 border-primary/10' },
                                    { type: 'purchases_count',   label: 'عدد المشتريات',     color: 'text-slate-800 dark:text-white',     bg: 'bg-primary/5 border-primary/10' },
                                    { type: 'total_returns_out', label: 'مرتجعات الموردين',  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-primary/5 border-primary/10' },
                                    { type: 'total_paid_out',    label: 'مدفوعات الموردين',  color: 'text-red-500',                       bg: 'bg-primary/5 border-primary/10' },
                                ].map(({ type, label, color, bg }) => {
                                    const item = stats.find(s => s.type === type);
                                    return (
                                        <div key={type} className={`flex flex-col gap-1 px-4 py-3 rounded-[14px] border ${bg}`}>
                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                                            <span className={`font-black text-lg ${color}`}>
                                                {countTypes.includes(type)
                                                    ? (item?.balance ?? 0)
                                                    : fmt(item?.balance ?? 0)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px bg-black/5 dark:bg-white/8" />

                        {/* المخزون */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1">المخزون</span>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                <div className="flex flex-col gap-1 px-4 py-3 rounded-[14px] bg-red-500/5 border border-red-500/10">
                                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">قيمة التالف</span>
                                    <span className="font-black text-lg text-red-500">{fmt(stats.find(s => s.type === 'total_waste')?.balance ?? 0)}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </SpatialCard>
            </div>
        </AppShell>
    );
}
