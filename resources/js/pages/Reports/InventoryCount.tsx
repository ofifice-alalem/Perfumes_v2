import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { BarChart2, SlidersHorizontal, ChevronDown, Search, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, PackageOpen, Check } from 'lucide-react';
import { NumberPadModal } from '@/components/ui/NumberPadModal';

interface Category { id: number; name: string; }

interface ProductStock {
    id: number;
    name: string;
    category: string;
    unit: string;
    stock: number;
}

interface Props {
    categories: Category[];
    filters: { categoryId: number | null; sellingType: string; lowStockOnly: boolean };
    data: ProductStock[];
}

const sellingTypeOptions = [
    { value: '',            label: 'الكل' },
    { value: 'tier_based',  label: 'عطور زيتية' },
    { value: 'unit_priced', label: 'أصلية / بخور / وشق' },
];

const reasonOptions = [
    { label: 'كسر', value: 'broken' },
    { label: 'انسكاب', value: 'spilled' },
    { label: 'منتهي الصلاحية', value: 'expired' },
    { label: 'مفقود', value: 'lost' },
    { label: 'أخرى', value: 'other' },
];

function fmt(n: number | null): string {
    if (n === null) return '—';
    const isWhole = n % 1 === 0;
    return isWhole
        ? n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InventoryCount({ categories, filters, data }: Props) {
    const [filterOpen,    setFilterOpen]    = useState(false);
    const [categoryId,    setCategoryId]    = useState(filters.categoryId ? String(filters.categoryId) : '');
    const [sellingType,   setSellingType]   = useState(filters.sellingType ?? '');
    const [lowStockOnly,  setLowStockOnly]  = useState(filters.lowStockOnly ?? false);

    const [activeTab, setActiveTab] = useState<'paper' | 'app'>('paper');
    const [items, setItems] = useState<Record<number, { actual_stock: string, reason: string }>>({});
    const [processing, setProcessing] = useState(false);

    const [showPad, setShowPad] = useState(false);
    const [padProductId, setPadProductId] = useState<number | null>(null);

    const [showConfirm, setShowConfirm] = useState(false);
    const [purchasedItems, setPurchasedItems] = useState<ProductStock[]>([]);

    useEffect(() => {
        const newItems: Record<number, { actual_stock: string, reason: string }> = {};
        data.forEach(p => {
            newItems[p.id] = { actual_stock: String(p.stock), reason: 'other' };
        });
        setItems(newItems);
    }, [data]);

    const hasFilter = categoryId || sellingType || lowStockOnly;

    function search() {
        router.get('/reports/inventory-count', {
            category_id:    categoryId    || undefined,
            selling_type:   sellingType   || undefined,
            low_stock_only: lowStockOnly  || undefined,
        }, { preserveScroll: true });
    }

    function reset() {
        setCategoryId(''); setSellingType(''); setLowStockOnly(false);
        router.get('/reports/inventory-count', {}, { preserveScroll: true });
    }

    function buildExportUrl(format: 'excel' | 'pdf') {
        const params = new URLSearchParams();
        if (categoryId)   params.set('category_id', categoryId);
        if (sellingType)  params.set('selling_type', sellingType);
        if (lowStockOnly) params.set('low_stock_only', '1');
        return `/reports/inventory-count/${format}?${params.toString()}`;
    }

    function handleActualStockChange(id: number, val: string) {
        setItems(prev => ({
            ...prev,
            [id]: { ...prev[id], actual_stock: val }
        }));
    }

    function handleReasonChange(id: number, val: string) {
        setItems(prev => ({
            ...prev,
            [id]: { ...prev[id], reason: val }
        }));
    }

    function handleSubmit() {
        const extraItems = data.filter(p => {
            const actual = parseFloat(items[p.id]?.actual_stock) || 0;
            return actual > p.stock;
        });

        if (extraItems.length > 0) {
            setPurchasedItems(extraItems);
            setShowConfirm(true);
        } else {
            submitData();
        }
    }

    function submitData() {
        setShowConfirm(false);
        setProcessing(true);

        const payload = data.map(p => ({
            product_id: p.id,
            system_stock: p.stock,
            actual_stock: parseFloat(items[p.id]?.actual_stock) || 0,
            reason: items[p.id]?.reason || 'other',
        }));

        if (payload.length === 0) {
            alert('لا يوجد أي تعديلات على المخزون');
            setProcessing(false);
            return;
        }

        router.post('/reports/inventory-count/apply', { items: payload }, {
            onFinish: () => setProcessing(false),
        });
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect
                label="التصنيف"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...categories.map(c => ({ label: c.name }))]}
                defaultValue={categoryId ? (categories.find(c => String(c.id) === categoryId)?.name ?? '') : 'الكل'}
                onSelect={val => setCategoryId(val === 'الكل' ? '' : String(categories.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect
                label="نوع المنتج"
                placeholder="الكل"
                options={sellingTypeOptions.map(o => ({ label: o.label }))}
                defaultValue={sellingTypeOptions.find(o => o.value === sellingType)?.label ?? 'الكل'}
                onSelect={val => setSellingType(sellingTypeOptions.find(o => o.label === val)?.value ?? '')}
            />
            <div className="flex items-center gap-3 px-1">
                <button onClick={() => setLowStockOnly(p => !p)}
                    className={`w-11 h-6 rounded-full transition-all relative ${lowStockOnly ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${lowStockOnly ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-bold text-slate-600 dark:text-white/70">تحت الحد الأدنى فقط</span>
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

    return (
        <AppShell pageTitle="الجرد">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">

                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">إقفال والجرد</h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">مطابقة المخزون الفعلي بالمخزون النظامي وتسجيل الفروقات</p>
                </div>

                <div className="flex bg-black/5 dark:bg-white/5 rounded-[16px] p-1.5 self-start">
                    <button onClick={() => setActiveTab('paper')}
                        className={`px-6 h-10 rounded-[12px] font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'paper' ? 'bg-white dark:bg-slate-800 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}>
                        <FileText className="w-4 h-4" /> النموذج الورقي
                    </button>
                    <button onClick={() => setActiveTab('app')}
                        className={`px-6 h-10 rounded-[12px] font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'app' ? 'bg-white dark:bg-slate-800 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}>
                        <PackageOpen className="w-4 h-4" /> إدخال الجرد الفعلي
                    </button>
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
                    <div className="flex-1 min-w-0 flex flex-col gap-6">

                        {activeTab === 'paper' && (
                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <a href={buildExportUrl('excel')} target="_blank"
                                        className="flex items-center justify-center gap-2 flex-1 h-12 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                        <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
                                    </a>
                                    <a href={buildExportUrl('pdf')} target="_blank"
                                        className="flex items-center justify-center gap-2 flex-1 h-12 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                        <FileText className="w-4 h-4" /> تصدير PDF
                                    </a>
                                </div>
                                
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
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                            {['المنتج', 'التصنيف', 'المخزون النظامي', 'المخزون الفعلي', 'ملاحظات'].map(h => (
                                                                <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                        {data.map(p => (
                                                            <tr key={p.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                                <td className="px-4 py-3 font-black text-slate-800 dark:text-white">{p.name}</td>
                                                                <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/60 text-xs">{p.category}</td>
                                                                <td className="px-4 py-3 font-black text-slate-800 dark:text-white whitespace-nowrap">{fmt(p.stock)} {p.unit}</td>
                                                                <td className="px-4 py-3"></td>
                                                                <td className="px-4 py-3"></td>
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
                                                            <span className="font-bold text-slate-500 dark:text-white/60 text-xs">{p.category}</span>
                                                        </div>
                                                        <div className="px-4 py-2 flex flex-col gap-1.5 text-sm">
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="font-bold text-slate-400 dark:text-white/40">المخزون النظامي</span>
                                                                <span className="font-black text-slate-800 dark:text-white">{fmt(p.stock)} {p.unit}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 border-t border-dashed border-black/10 dark:border-white/10">
                                                                <span className="font-bold text-slate-400 dark:text-white/40">المخزون الفعلي</span>
                                                                <div className="w-20 h-6 bg-black/5 dark:bg-white/5 rounded"></div>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 border-t border-dashed border-black/10 dark:border-white/10">
                                                                <span className="font-bold text-slate-400 dark:text-white/40">ملاحظات</span>
                                                                <div className="flex-1 h-6 bg-black/5 dark:bg-white/5 rounded ml-4"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </SpatialCard>
                            </div>
                        )}

                        {activeTab === 'app' && (
                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <SpatialCard title={`إدخال الجرد الفعلي (${data.length})`} icon={<PackageOpen className="w-4 h-4" />}>
                                    {data.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-2">
                                            <BarChart2 className="w-12 h-12 opacity-30" />
                                            <p className="font-bold">لا توجد منتجات</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="hidden lg:block overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                            {['المنتج', 'التصنيف', 'المخزون النظامي', 'المخزون الفعلي', 'الفارق', 'سبب التلف'].map(h => (
                                                                <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                        {data.map(p => {
                                                            const actual = parseFloat(items[p.id]?.actual_stock) || 0;
                                                            const diff = actual - p.stock;
                                                            const isWaste = diff < 0;
                                                            const isGain = diff > 0;
                                                            return (
                                                                <tr key={p.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                                    <td className="px-4 py-3 font-black text-slate-800 dark:text-white">{p.name}</td>
                                                                    <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/60 text-xs">{p.category}</td>
                                                                    <td className="px-4 py-3 font-black text-slate-800 dark:text-white whitespace-nowrap">{fmt(p.stock)} {p.unit}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <input type="number" 
                                                                                value={items[p.id]?.actual_stock ?? ''}
                                                                                onChange={(e) => handleActualStockChange(p.id, e.target.value)}
                                                                                className="w-24 h-10 rounded-lg spatial-input text-center font-black"
                                                                            />
                                                                            <button onClick={() => { setPadProductId(p.id); setShowPad(true); }}
                                                                                className="w-10 h-10 rounded-lg bg-black/5 hover:bg-primary/10 text-slate-500 hover:text-primary transition-all flex items-center justify-center font-bold">
                                                                                #
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        {diff === 0 ? <span className="font-bold text-slate-400 dark:text-white/40">مطابق</span> : 
                                                                         isGain ? <span className="font-bold text-emerald-500 flex items-center gap-1">+{fmt(diff)} {p.unit}</span> :
                                                                         <span className="font-bold text-red-500 flex items-center gap-1">{fmt(diff)} {p.unit}</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {isWaste && (
                                                                            <select 
                                                                                value={items[p.id]?.reason ?? 'other'}
                                                                                onChange={(e) => handleReasonChange(p.id, e.target.value)}
                                                                                className="h-10 rounded-lg spatial-input text-sm font-bold w-40">
                                                                                {reasonOptions.map(r => (
                                                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="flex flex-col gap-3 lg:hidden">
                                                {data.map(p => {
                                                    const actual = parseFloat(items[p.id]?.actual_stock) || 0;
                                                    const diff = actual - p.stock;
                                                    const isWaste = diff < 0;
                                                    const isGain = diff > 0;
                                                    return (
                                                        <div key={p.id} className="rounded-[20px] border border-black/8 dark:border-white/12 overflow-hidden p-4 flex flex-col gap-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-black text-slate-800 dark:text-white text-sm">{p.name}</span>
                                                                <span className="font-bold text-slate-500 dark:text-white/60 text-xs">{p.category}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-black/3 dark:bg-white/5 p-3 rounded-xl">
                                                                <span className="font-bold text-slate-600 dark:text-white/60 text-xs">المخزون النظامي</span>
                                                                <span className="font-black text-slate-800 dark:text-white">{fmt(p.stock)} {p.unit}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-slate-800 dark:text-white text-sm">الفعلي</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => { setPadProductId(p.id); setShowPad(true); }}
                                                                        className="w-10 h-10 rounded-lg bg-black/5 hover:bg-primary/10 text-slate-500 hover:text-primary transition-all flex items-center justify-center font-bold">
                                                                        #
                                                                    </button>
                                                                    <input type="number" 
                                                                        value={items[p.id]?.actual_stock ?? ''}
                                                                        onChange={(e) => handleActualStockChange(p.id, e.target.value)}
                                                                        className="w-24 h-10 rounded-lg spatial-input text-center font-black"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {diff !== 0 && (
                                                                <div className="flex justify-between items-center border-t border-black/5 dark:border-white/5 pt-3 mt-1">
                                                                    <span className="font-bold text-slate-600 dark:text-white/60 text-xs">الفارق</span>
                                                                    {isGain ? <span className="font-bold text-emerald-500 text-sm flex items-center gap-1">+{fmt(diff)} {p.unit}</span> :
                                                                             <span className="font-bold text-red-500 text-sm flex items-center gap-1">{fmt(diff)} {p.unit}</span>}
                                                                </div>
                                                            )}
                                                            {isWaste && (
                                                                <div className="flex justify-between items-center mt-1">
                                                                    <span className="font-bold text-slate-600 dark:text-white/60 text-xs">السبب</span>
                                                                    <select 
                                                                        value={items[p.id]?.reason ?? 'other'}
                                                                        onChange={(e) => handleReasonChange(p.id, e.target.value)}
                                                                        className="h-10 rounded-lg spatial-input text-sm font-bold w-32">
                                                                        {reasonOptions.map(r => (
                                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="mt-6">
                                                <button onClick={handleSubmit} disabled={processing}
                                                    className="w-full h-14 rounded-[16px] bg-primary text-white font-black hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50">
                                                    <CheckCircle2 className="w-6 h-6" /> {processing ? 'جاري الحفظ والتسوية...' : 'إقفال الجرد وتسوية المخزون'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </SpatialCard>
                            </div>
                        )}

                    </div>

                    {/* Desktop Filter */}
                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>

            </div>

            {showPad && padProductId && (
                <NumberPadModal
                    title="إدخال الكمية الفعلية"
                    initialValue={items[padProductId]?.actual_stock || ''}
                    onConfirm={val => { handleActualStockChange(padProductId, val); setShowPad(false); }}
                    onClose={() => setShowPad(false)}
                />
            )}

            {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[24px] shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-5 border border-amber-500/20">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">تنبيه: زيادة في المخزون!</h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-white/60 mb-5 leading-relaxed">
                            المنتجات التالية لها مخزون فعلي أكبر من المخزون النظامي. هل أنت متأكد من هذه الزيادة؟ 
                            <br/><br/>
                            <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                سيقوم النظام بإنشاء فاتورة مشتريات (بتكلفة 0) لهذه المنتجات لتصحيح الزيادة.
                            </span>
                        </p>

                        <div className="bg-black/3 dark:bg-white/5 rounded-[16px] p-4 flex flex-col gap-2 max-h-[200px] overflow-y-auto mb-6">
                            {purchasedItems.map(p => {
                                const actual = parseFloat(items[p.id]?.actual_stock) || 0;
                                const diff = actual - p.stock;
                                return (
                                    <div key={p.id} className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-700 dark:text-white/80">{p.name}</span>
                                        <span className="font-black text-emerald-500">+{diff}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={submitData} disabled={processing}
                                className="flex-1 h-12 rounded-[14px] bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                                <Check className="w-5 h-5" /> نعم، أوافق
                            </button>
                            <button onClick={() => setShowConfirm(false)} disabled={processing}
                                className="flex-1 h-12 rounded-[14px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                                إلغاء ومراجعة
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AppShell>
    );
}
