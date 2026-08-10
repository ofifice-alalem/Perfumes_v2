import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import {
    ArrowUp,
    ArrowDown,
    Package,
    SlidersHorizontal,
    Search,
    TrendingUp,
    TrendingDown,
    FileSpreadsheet,
    FileText,
    RotateCcw,
    X,
    Calendar,
    Hash,
    Layers,
    Download
} from 'lucide-react';

interface Category { id: number; name: string; unit: string; }
interface Product   { id: number; name: string; stock: string; category: Category; qrcode?: string | null; }

interface Movement {
    date: string;
    type: 'purchase' | 'sale' | 'return_in' | 'return_out' | 'waste' | 'opening_balance';
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

const typeConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    purchase:        { label: 'شراء',          bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30' },
    sale:            { label: 'بيع',           bg: 'bg-rose-500/15',    text: 'text-rose-700 dark:text-rose-300',       border: 'border-rose-500/30' },
    return_in:       { label: 'مرتجع عميل',   bg: 'bg-blue-500/15',    text: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-500/30' },
    return_out:      { label: 'مرتجع مورد',   bg: 'bg-amber-500/15',   text: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-500/30' },
    waste:           { label: 'تالف',          bg: 'bg-slate-500/15',   text: 'text-slate-700 dark:text-slate-300',     border: 'border-slate-500/30' },
    opening_balance: { label: 'رصيد افتتاحي', bg: 'bg-purple-500/15',  text: 'text-purple-700 dark:text-purple-300',   border: 'border-purple-500/30' },
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
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

/* =========================================================================
   RIGHT FILTER DRAWER
   ========================================================================= */
function FilterDrawer({
    isOpen,
    onClose,
    products,
    productId,
    setProductId,
    type,
    setType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    onSearch,
    onReset
}: {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    productId: string;
    setProductId: (v: string) => void;
    type: string;
    setType: (v: string) => void;
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    onSearch: () => void;
    onReset: () => void;
}) {
    if (!isOpen) return null;

    const selectedProductLabel = products.find(p => p.id === +productId)
        ? `${products.find(p => p.id === +productId)!.name} (${products.find(p => p.id === +productId)!.stock} ${products.find(p => p.id === +productId)!.category.unit})`
        : '';

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
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">خيارات تصفية الحركة</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                حدد المنتج والفترة الزمنية لنشاط المخزون
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
                    {/* Row 1: Product Select + Movement Type side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <ModernSelect
                            label="المنتج *"
                            placeholder="اختر المنتج..."
                            options={products.map(p => ({ label: `${p.name} (${p.stock} ${p.category.unit})`, searchKey: p.qrcode ?? undefined }))}
                            defaultValue={selectedProductLabel}
                            onSelect={val => {
                                const p = products.find(pr => `${pr.name} (${pr.stock} ${pr.category.unit})` === val);
                                setProductId(p ? String(p.id) : '');
                            }}
                        />

                        {/* Movement Type Options (Extra Large POS Chips) */}
                        <div className="flex flex-col gap-3">
                            <label className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">نوع الحركة</label>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {typeOptions.map(t => {
                                    const isSelected = type === t.value;
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setType(t.value)}
                                            className={`h-16 sm:h-20 px-5 rounded-[22px] font-black text-lg sm:text-xl border-2 sm:border-3 transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center text-center touch-manipulation shadow-md ${
                                                isSelected
                                                    ? 'bg-primary text-white border-primary shadow-xl shadow-primary/30 ring-4 ring-primary/20 scale-[1.02]'
                                                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Date From + Date To Stacked Vertically */}
                    <div className="flex flex-col gap-5 pt-2 border-t-2 border-slate-200/60 dark:border-slate-800/60">
                        <DateFilterInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
                        <DateFilterInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
                    </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 flex items-center gap-4">
                    <button
                        type="button"
                        disabled={!productId}
                        onClick={() => {
                            onSearch();
                            onClose();
                        }}
                        className="h-16 sm:h-18 px-8 rounded-[18px] bg-primary hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl flex-1 flex items-center justify-center gap-3 shadow-xl shadow-primary/30 border-2 border-primary/40 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
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
   MAIN PRODUCT MOVEMENT PAGE
   ========================================================================= */
export default function ProductMovement({ products, product, filters, data }: Props) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [productId, setProductId] = useState(filters.productId ? String(filters.productId) : '');
    const [dateFrom,  setDateFrom]  = useState(filters.dateFrom ?? '');
    const [dateTo,    setDateTo]    = useState(filters.dateTo ?? '');
    const [type,      setType]      = useState(filters.type ?? '');

    // ── Barcode Scanner Listener ─────────────────────────────────────────────
    useEffect(() => {
        let buffer = '';
        let lastTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            
            const now = Date.now();
            if (now - lastTime > 100) {
                buffer = '';
            }
            lastTime = now;

            if (e.key === 'Enter') {
                if (buffer.length > 3) {
                    const scanned = products.find(p => p.qrcode && p.qrcode.toLowerCase() === buffer.toLowerCase());
                    if (scanned) {
                        e.preventDefault();
                        setProductId(String(scanned.id));
                        router.get('/reports/product-movement', {
                            product_id: scanned.id,
                            date_from:  dateFrom  || undefined,
                            date_to:    dateTo    || undefined,
                            type:       type      || undefined,
                        }, { preserveScroll: true });
                    }
                }
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [products, dateFrom, dateTo, type]);

    const activeFilterCount = (productId ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (type ? 1 : 0);

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

    function buildExportUrl(format: 'excel' | 'pdf') {
        const params = new URLSearchParams();
        if (productId) params.set('product_id', productId);
        if (dateFrom)  params.set('date_from', dateFrom);
        if (dateTo)    params.set('date_to', dateTo);
        if (type)      params.set('type', type);
        return `/reports/product-movement/${format}?${params.toString()}`;
    }

    return (
        <AppShell pageTitle="حركة المنتج">
            <div className="flex flex-col gap-8 pb-32 lg:pb-8 dir-rtl">

                {/* Top Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-100/80 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[30px] border-2 border-slate-200/80 dark:border-slate-700/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[26px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black shrink-0 shadow-md">
                            <Package className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                تقرير حركة المنتج
                            </h1>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">
                                تتبع حركة وتغيرات مخزون الصنف بكل تفاصيل الوارد والمنصرف
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
                    products={products}
                    productId={productId}
                    setProductId={setProductId}
                    type={type}
                    setType={setType}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    onSearch={search}
                    onReset={reset}
                />

                {/* Main Content Area */}
                {!data || !product ? (
                    <SpatialCard headerDot={false} className="p-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-4 text-center">
                        <div className="w-24 h-24 rounded-[32px] bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary shadow-inner">
                            <Package className="w-12 h-12 opacity-60" />
                        </div>
                        <span className="font-black text-2xl text-slate-700 dark:text-slate-300">الرجاء اختيار صنف لعرض حركة المخزون</span>
                        <p className="text-lg font-bold text-slate-500 dark:text-slate-400 max-w-md">
                            اضغط على زر "تصفية وفلترة" لاختيار المنتج أو امسح الباركود مباشرة من الشاشة.
                        </p>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="h-16 px-8 rounded-[20px] bg-primary text-white font-black text-lg flex items-center gap-3 shadow-xl active:scale-95 cursor-pointer mt-2"
                        >
                            <Search className="w-6 h-6" />
                            <span>اختر المنتج من الفلاتر</span>
                        </button>
                    </SpatialCard>
                ) : (
                    <div className="flex flex-col gap-6">

                        {/* Summary Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <SpatialCard headerDot={false} className="p-6 sm:p-8 flex flex-col justify-between gap-4 border-2 border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm sm:text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">رصيد أول الفترة</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                                        {fmt(data.opening_stock)}
                                    </span>
                                    <span className="text-lg font-bold text-slate-500 dark:text-slate-400">
                                        {product.category.unit}
                                    </span>
                                </div>
                            </SpatialCard>

                            <SpatialCard headerDot={false} className="p-6 sm:p-8 flex flex-col justify-between gap-4 border-2 border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm sm:text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">عدد الحركات</span>
                                </div>
                                <div>
                                    <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                                        {data.movements.length}
                                    </span>
                                    <span className="text-lg font-bold text-slate-500 dark:text-slate-400 mr-2">حركة</span>
                                </div>
                            </SpatialCard>

                            <SpatialCard headerDot={false} className="p-6 sm:p-8 flex flex-col justify-between gap-4 border-2 border-primary/40 bg-primary/5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm sm:text-base font-black text-primary uppercase tracking-wider">رصيد آخر الفترة</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl sm:text-5xl font-black text-primary">
                                            {fmt(data.closing_stock)}
                                        </span>
                                        <span className="text-lg font-bold text-primary/80">
                                            {product.category.unit}
                                        </span>
                                    </div>
                                    {data.closing_stock !== data.opening_stock && (
                                        <div className={`flex items-center gap-1.5 text-base font-black mt-2 ${data.closing_stock > data.opening_stock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {data.closing_stock > data.opening_stock ? (
                                                <TrendingUp className="w-5 h-5" />
                                            ) : (
                                                <TrendingDown className="w-5 h-5" />
                                            )}
                                            <span>
                                                {data.closing_stock > data.opening_stock ? '+' : ''}
                                                {fmt(data.closing_stock - data.opening_stock)} {product.category.unit} (تغير الصافي)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </SpatialCard>
                        </div>

                        {/* Movements Table Card */}
                        <SpatialCard
                            headerDot={false}
                            title={`سجل حركات المنتج: ${product.name} (${data.movements.length} حركة)`}
                            icon={<Package className="w-7 h-7 text-primary" />}
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
                            {data.movements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                                    <Package className="w-14 h-14 opacity-30" />
                                    <p className="font-bold text-xl">لا توجد حركات مسجلة لهذا المنتج في الفترة المحددة</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse min-w-[850px]">
                                        <thead>
                                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg font-black uppercase">
                                                <th className="p-5 rounded-r-[18px]">التاريخ</th>
                                                <th className="p-5">نوع الحركة</th>
                                                <th className="p-5">الكمية</th>
                                                <th className="p-5">سعر الوحدة</th>
                                                <th className="p-5">رقم المرجع / الفاتورة</th>
                                                <th className="p-5 rounded-l-[18px]">الرصيد المتبقي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/60 font-black text-lg sm:text-xl">
                                            {data.movements.map((m, i) => {
                                                const cfg = typeConfig[m.type] || { label: m.type, bg: 'bg-slate-500/15', text: 'text-slate-700', border: 'border-slate-500/30' };
                                                return (
                                                    <tr key={i} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                                        <td className="p-5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-base">
                                                                {fmtDate(m.date)}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 whitespace-nowrap">
                                                            <span className={`px-4 py-2 rounded-xl font-black text-base border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                                                {cfg.label}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 whitespace-nowrap">
                                                            <div className={`flex items-center gap-1.5 font-black ${
                                                                m.quantity > 0
                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                    : m.quantity === 0
                                                                    ? 'text-slate-500'
                                                                    : 'text-rose-600 dark:text-rose-400'
                                                            }`}>
                                                                {m.quantity > 0 ? (
                                                                    <ArrowUp className="w-5 h-5 shrink-0" />
                                                                ) : m.quantity < 0 ? (
                                                                    <ArrowDown className="w-5 h-5 shrink-0" />
                                                                ) : null}
                                                                <span>{fmt(Math.abs(m.quantity))} {product.category.unit}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {m.unit_price !== null ? `${fmt(m.unit_price)} د.ل` : '—'}
                                                        </td>
                                                        <td className="p-5 text-primary font-black text-base whitespace-nowrap">
                                                            {m.reference}
                                                        </td>
                                                        <td className="p-5 text-slate-900 dark:text-white font-black whitespace-nowrap">
                                                            {fmt(m.balance)} {product.category.unit}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </SpatialCard>

                    </div>
                )}

            </div>
        </AppShell>
    );
}
