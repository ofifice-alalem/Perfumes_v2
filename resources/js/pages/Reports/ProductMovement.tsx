import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { ArrowUp, ArrowDown, Package, SlidersHorizontal, ChevronDown, Search, TrendingUp, TrendingDown } from 'lucide-react';

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
    product:  Product | null;
    filters:  { productId: number; dateFrom: string; dateTo: string; type: string };
    data:     ReportData | null;
}

const typeOptions = [
    { value: '',           label: 'جميع الحركات' },
    { value: 'purchase',   label: 'مشتريات' },
    { value: 'sale',       label: 'مبيعات' },
    { value: 'return_in',  label: 'مرتجعات عملاء' },
    { value: 'return_out', label: 'مرتجعات موردين' },
    { value: 'waste',      label: 'تالف' },
];

const typeConfig: Record<string, { label: string; color: string }> = {
    purchase:   { label: 'شراء',          color: 'text-emerald-600 dark:text-emerald-400' },
    sale:       { label: 'بيع',           color: 'text-red-500 dark:text-red-400' },
    return_in:  { label: 'مرتجع عميل',   color: 'text-blue-500 dark:text-blue-400' },
    return_out: { label: 'مرتجع مورد',   color: 'text-orange-500 dark:text-orange-400' },
    waste:      { label: 'تالف',          color: 'text-slate-500 dark:text-white/40' },
};

function fmt(n: number | null, unit?: string): string {
    if (n === null || n === undefined) return '—';
    const isWhole = Number.isInteger(n) || n % 1 === 0;
    const formatted = isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return unit ? `${formatted} ${unit}` : formatted;
}

function fmtDate(v: string) {
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
}

export default function ProductMovement({ products, product, filters, data }: Props) {
    const [filterOpen, setFilterOpen] = useState(false);

    const [productId, setProductId] = useState(filters.productId ? String(filters.productId) : '');
    const [dateFrom,  setDateFrom]  = useState(filters.dateFrom ?? '');
    const [dateTo,    setDateTo]    = useState(filters.dateTo ?? '');
    const [type,      setType]      = useState(filters.type ?? '');

    const hasFilter = productId || dateFrom || dateTo || type;

    function search() {
        if (!productId) return;
        router.get('/reports/product-movement', {
            product_id: productId,
            date_from:  dateFrom  || undefined,
            date_to:    dateTo    || undefined,
            type:       type      || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setProductId(''); setDateFrom(''); setDateTo(''); setType('');
        router.get('/reports/product-movement', {}, { preserveScroll: true });
    }

    const selectedProductLabel = products.find(p => p.id === +productId)
        ? `${products.find(p => p.id === +productId)!.name} (${products.find(p => p.id === +productId)!.stock} ${products.find(p => p.id === +productId)!.category.unit})`
        : '';

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
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
            <ModernSelect
                label="نوع الحركة"
                placeholder="جميع الحركات"
                options={typeOptions.map(t => ({ label: t.label }))}
                defaultValue={typeOptions.find(t => t.value === type)?.label ?? 'جميع الحركات'}
                onSelect={val => setType(typeOptions.find(t => t.label === val)?.value ?? '')}
            />
            <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={dateTo}   onChange={setDateTo} />
            <button onClick={search} disabled={!productId}
                className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
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

    return (
        <AppShell pageTitle="حركة المنتج">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">تقرير حركة المنتج</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تتبع دخول وخروج المخزون لمنتج معين</p>
                </div>

                {/* Mobile Filter */}
                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)}
                        className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" /> فلترة
                            {hasFilter && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && (
                        <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <FilterPanel />
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-6">

                        {/* Summary Cards */}
                        {data && product && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="spatial-card p-5 flex flex-col gap-1">
                                    <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">رصيد أول الفترة</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                                        {fmt(data.opening_stock)} <span className="text-sm font-bold text-slate-400">{product.category.unit}</span>
                                    </p>
                                </div>
                                <div className="spatial-card p-5 flex flex-col gap-1">
                                    <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">عدد الحركات</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{data.movements.length}</p>
                                </div>
                                <div className="spatial-card p-5 flex flex-col gap-1">
                                    <p className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">رصيد آخر الفترة</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                                        {fmt(data.closing_stock)} <span className="text-sm font-bold text-slate-400">{product.category.unit}</span>
                                    </p>
                                    {data.closing_stock !== data.opening_stock && (
                                        <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${data.closing_stock > data.opening_stock ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {data.closing_stock > data.opening_stock
                                                ? <TrendingUp className="w-3.5 h-3.5" />
                                                : <TrendingDown className="w-3.5 h-3.5" />}
                                            {fmt(Math.abs(data.closing_stock - data.opening_stock))} {product.category.unit}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Movements Table */}
                        <SpatialCard
                            title={data && product ? `حركات ${product.name} (${data.movements.length})` : 'الحركات'}
                            icon={<Package className="w-4 h-4" />}
                        >
                            {!data ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <Package className="w-12 h-12 opacity-30" />
                                    <p className="font-bold">اختر منتجاً لعرض التقرير</p>
                                </div>
                            ) : data.movements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                    <span className="text-3xl">📦</span>
                                    <span className="font-bold text-sm">لا توجد حركات في هذه الفترة</span>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['التاريخ', 'النوع', 'الكمية', 'السعر', 'المرجع', 'الرصيد'].map(h => (
                                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {data.movements.map((m, i) => (
                                                    <tr key={i} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/60 whitespace-nowrap text-xs">{fmtDate(m.date)}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`font-black text-xs ${typeConfig[m.type]?.color}`}>
                                                                {typeConfig[m.type]?.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className={`flex items-center gap-1 font-black whitespace-nowrap ${m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                                {m.quantity > 0
                                                                    ? <ArrowUp className="w-3.5 h-3.5" />
                                                                    : <ArrowDown className="w-3.5 h-3.5" />}
                                                                {fmt(Math.abs(m.quantity))} {product!.category.unit}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-white/80 whitespace-nowrap">
                                                            {m.unit_price !== null ? fmt(m.unit_price) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-primary text-xs">{m.reference}</td>
                                                        <td className="px-4 py-3 font-black text-slate-800 dark:text-white whitespace-nowrap">
                                                            {fmt(m.balance)} {product!.category.unit}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="flex flex-col gap-3 lg:hidden">
                                        {data.movements.map((m, i) => (
                                            <div key={i} className="rounded-[20px] border border-black/8 dark:border-white/12 overflow-hidden">
                                                <div className="px-4 py-3 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <span className={`font-black text-sm ${typeConfig[m.type]?.color}`}>
                                                        {typeConfig[m.type]?.label}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{fmtDate(m.date)}</span>
                                                </div>
                                                <div className="px-4 py-2 flex flex-col gap-1.5 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">الكمية</span>
                                                        <span className={`font-black flex items-center gap-1 ${m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                            {m.quantity > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                            {fmt(Math.abs(m.quantity))} {product!.category.unit}
                                                        </span>
                                                    </div>
                                                    {m.unit_price !== null && (
                                                        <div className="flex justify-between">
                                                            <span className="font-bold text-slate-400 dark:text-white/40">السعر</span>
                                                            <span className="font-bold text-slate-700 dark:text-white/80">{fmt(m.unit_price)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">المرجع</span>
                                                        <span className="font-bold text-primary text-xs">{m.reference}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">الرصيد</span>
                                                        <span className="font-black text-slate-800 dark:text-white">{fmt(m.balance)} {product!.category.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </SpatialCard>
                    </div>

                    {/* Desktop Filter */}
                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
