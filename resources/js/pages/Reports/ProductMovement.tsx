import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { ArrowUp, ArrowDown, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface Category { id: number; name: string; unit: string; }
interface Product   { id: number; name: string; stock: string; category: Category; }

interface Movement {
    date: string;
    type: 'purchase' | 'sale' | 'return_in' | 'return_out' | 'waste';
    quantity: number;
    unit_price: number | null;
    reference: string;
    balance: number;
}

interface ReportData {
    opening_stock: number;
    movements: Movement[];
    closing_stock: number;
}

interface Props {
    products: Product[];
    product: Product | null;
    filters: { productId: number; dateFrom: string; dateTo: string; type: string };
    data: ReportData | null;
}

const typeOptions = [
    { value: '',           label: 'جميع الحركات' },
    { value: 'purchase',   label: 'مشتريات' },
    { value: 'sale',       label: 'مبيعات' },
    { value: 'return_in',  label: 'مرتجعات عملاء' },
    { value: 'return_out', label: 'مرتجعات موردين' },
    { value: 'waste',      label: 'تالف' },
];

const typeLabels: Record<string, { label: string; color: string }> = {
    purchase:   { label: 'شراء',            color: 'text-emerald-600 dark:text-emerald-400' },
    sale:       { label: 'بيع',             color: 'text-red-500 dark:text-red-400' },
    return_in:  { label: 'مرتجع عميل',     color: 'text-blue-500 dark:text-blue-400' },
    return_out: { label: 'مرتجع مورد',     color: 'text-orange-500 dark:text-orange-400' },
    waste:      { label: 'تالف',            color: 'text-slate-500 dark:text-white/40' },
};

function fmt(n: number | null) {
    if (n === null) return '—';
    return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductMovement({ products, product, filters, data }: Props) {
    const [productId, setProductId] = useState(filters.productId ? String(filters.productId) : '');
    const [dateFrom,  setDateFrom]  = useState(filters.dateFrom ?? '');
    const [dateTo,    setDateTo]    = useState(filters.dateTo ?? '');
    const [type,      setType]      = useState(filters.type ?? '');

    function search() {
        if (!productId) return;
        router.get('/reports/product-movement', {
            product_id: productId,
            date_from:  dateFrom  || undefined,
            date_to:    dateTo    || undefined,
            type:       type      || undefined,
        }, { preserveScroll: true });
    }

    const selectedProductLabel = products.find(p => p.id === +productId)
        ? `${products.find(p => p.id === +productId)!.name} (${products.find(p => p.id === +productId)!.stock} ${products.find(p => p.id === +productId)!.category.unit})`
        : '';

    const selectedTypeLabel = typeOptions.find(t => t.value === type)?.label ?? 'جميع الحركات';

    return (
        <AppShell pageTitle="حركة المنتج">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تقرير حركة المنتج</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تتبع دخول وخروج المخزون لمنتج معين</p>
                </div>

                {/* Filters */}
                <SpatialCard title="الفلاتر" icon={<Package className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ModernSelect
                            label="المنتج *"
                            placeholder="اختر المنتج"
                            options={products.map(p => ({ label: `${p.name} (${p.stock} ${p.category.unit})` }))}
                            defaultValue={selectedProductLabel}
                            onSelect={val => {
                                const p = products.find(pr => `${pr.name} (${pr.stock} ${pr.category.unit})` === val);
                                setProductId(p ? String(p.id) : '');
                            }}
                        />
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">من تاريخ</label>
                            <DateFilterInput value={dateFrom} onChange={setDateFrom} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">إلى تاريخ</label>
                            <DateFilterInput value={dateTo} onChange={setDateTo} />
                        </div>
                        <ModernSelect
                            label="نوع الحركة"
                            placeholder="جميع الحركات"
                            options={typeOptions.map(t => ({ label: t.label }))}
                            defaultValue={selectedTypeLabel}
                            onSelect={val => setType(typeOptions.find(t => t.label === val)?.value ?? '')}
                        />
                    </div>
                    <div className="mt-4">
                        <button onClick={search} disabled={!productId}
                            className="spatial-button px-6 h-11 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            عرض التقرير
                        </button>
                    </div>
                </SpatialCard>

                {/* Results */}
                {data && product && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="spatial-card p-5 flex flex-col gap-2">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">رصيد أول الفترة</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">
                                    {fmt(data.opening_stock)} <span className="text-sm font-bold text-slate-400">{product.category.unit}</span>
                                </p>
                            </div>
                            <div className="spatial-card p-5 flex flex-col gap-2">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد الحركات</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{data.movements.length}</p>
                            </div>
                            <div className="spatial-card p-5 flex flex-col gap-2">
                                <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">رصيد آخر الفترة</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">
                                    {fmt(data.closing_stock)} <span className="text-sm font-bold text-slate-400">{product.category.unit}</span>
                                </p>
                                {data.closing_stock !== data.opening_stock && (
                                    <div className={`flex items-center gap-1 text-xs font-bold ${data.closing_stock > data.opening_stock ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {data.closing_stock > data.opening_stock
                                            ? <TrendingUp className="w-3.5 h-3.5" />
                                            : <TrendingDown className="w-3.5 h-3.5" />}
                                        {fmt(Math.abs(data.closing_stock - data.opening_stock))} {product.category.unit}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Movements Table */}
                        <SpatialCard title={`حركات ${product.name}`} icon={<Package className="w-4 h-4" />}>
                            {data.movements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <span className="text-3xl">📦</span>
                                    <span className="font-bold text-sm">لا توجد حركات في هذه الفترة</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-black/8 dark:border-white/8">
                                                <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/50 text-xs uppercase tracking-widest">التاريخ</th>
                                                <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/50 text-xs uppercase tracking-widest">النوع</th>
                                                <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/50 text-xs uppercase tracking-widest">الكمية</th>
                                                <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/50 text-xs uppercase tracking-widest">السعر</th>
                                                <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/50 text-xs uppercase tracking-widest">المرجع</th>
                                                <th className="text-right py-3 px-4 font-black text-slate-500 dark:text-white/50 text-xs uppercase tracking-widest">الرصيد</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.movements.map((m, i) => (
                                                <tr key={i} className="border-b border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                                                    <td className="py-3 px-4 font-bold text-slate-600 dark:text-white/70">
                                                        {new Date(m.date).toLocaleDateString('ar-SA')}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`font-black text-xs ${typeLabels[m.type]?.color}`}>
                                                            {typeLabels[m.type]?.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className={`flex items-center gap-1 font-black ${m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                            {m.quantity > 0
                                                                ? <ArrowUp className="w-3.5 h-3.5" />
                                                                : <ArrowDown className="w-3.5 h-3.5" />}
                                                            {fmt(Math.abs(m.quantity))} {product.category.unit}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-white/80">
                                                        {m.unit_price !== null ? fmt(m.unit_price) : '—'}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-primary text-xs">{m.reference}</td>
                                                    <td className="py-3 px-4 font-black text-slate-800 dark:text-white">
                                                        {fmt(m.balance)} {product.category.unit}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </SpatialCard>
                    </>
                )}

                {!data && (
                    <div className="spatial-card p-12 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-white/30">
                        <Package className="w-12 h-12 opacity-30" />
                        <p className="font-bold">اختر منتجاً لعرض التقرير</p>
                    </div>
                )}

            </div>
        </AppShell>
    );
}
