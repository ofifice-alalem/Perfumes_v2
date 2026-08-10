import { useState, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check, Package, QrCode, RefreshCw, Printer, SlidersHorizontal, Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

interface Category  { id: number; name: string; unit: 'ml' | 'pcs' | 'g'; is_operational: boolean; }
interface PriceTier { id: number; name: string; description: string | null; }
interface ProductPrice {
    price_per_unit_regular: string; price_per_unit_vip: string;
    full_bottle_regular: string | null; full_bottle_vip: string | null;
}
interface OriginalPerfumeDetail { bottle_volume: string; }
interface Product {
    id: number; name: string; selling_type: 'tier_based' | 'unit_priced';
    stock: string; min_stock: string;
    qrcode: string | null;
    category: Category; price_tier: PriceTier | null;
    product_price: ProductPrice | null;
    original_perfume_detail: OriginalPerfumeDetail | null;
}

interface Props {
    products: Product[];
    categories: Category[];
    tiers: PriceTier[];
    flash?: { success?: string; error?: string };
}

const unitLabels = { ml: 'مليلتر', pcs: 'قطعة', g: 'غرام' };

function fmt(val: string | null | undefined): string {
    if (!val) return '';
    const n = parseFloat(val);
    return Number.isInteger(n) ? String(n) : n.toString();
}

const emptyForm = {
    name: '', category_id: '', selling_type: 'tier_based' as 'tier_based' | 'unit_priced',
    price_tier_id: '', min_stock: '', qrcode: '',
    price_per_unit_regular: '', price_per_unit_vip: '',
    full_bottle_regular: '', full_bottle_vip: '', bottle_volume: '',
};

function resolveSellingType(cat: Category): 'tier_based' | 'unit_priced' {
    if (cat.is_operational) return 'unit_priced';
    return cat.unit === 'ml' && cat.name.includes('زيت') ? 'tier_based' : 'unit_priced';
}

/** توليد كود QR عشوائي فريد */
function generateQrCode(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}



// ─── Modal عرض QR ──────────────────────────────────────────────
interface QrModalProps { product: Product; onClose: () => void; }

const PERFUME_SVG_B64 = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="22" y="18" width="20" height="32" rx="6" fill="#1e293b"/><rect x="26" y="10" width="12" height="10" rx="3" fill="#1e293b"/><rect x="29" y="6" width="6" height="6" rx="2" fill="#475569"/><ellipse cx="32" cy="34" rx="6" ry="8" fill="white" opacity="0.15"/><rect x="28" y="8" width="2" height="4" rx="1" fill="white" opacity="0.4"/></svg>`);

function QrModal({ product, onClose }: QrModalProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [tab, setTab] = useState<'classic' | 'serial'>('classic');

    function handlePrint() {
        const content = printRef.current;
        if (!content) return;
        const isSerial = tab === 'serial';
        const win = window.open('', '_blank', isSerial ? 'width=420,height=220' : 'width=400,height=400');
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="utf-8" />
                <title>QR - ${product.name}</title>
                <style>
                    ${isSerial
                        ? `@page { size: landscape; margin: 8mm; }
                           * { margin:0; padding:0; box-sizing:border-box; }
                           body { font-family:'Segoe UI',Arial,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#fff; }
                           .wrap { display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; max-width:240mm; }
                           .code { font-size:${(product.qrcode || '').length > 15 ? '12pt' : '20pt'}; color:#1e293b; font-family:monospace; font-weight:700; text-align:center; letter-spacing:${(product.qrcode || '').length > 15 ? '2px' : '6px'}; white-space:nowrap; }
                           svg { width:100% !important; max-width:65mm; height:40mm !important; display:block; margin:0 auto; }`
                        : `@page { size: portrait; margin: 0; }
                           * { margin:0; padding:0; box-sizing:border-box; }
                           body { font-family:'Segoe UI',Arial,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#fff; }
                           .wrap { display:flex; flex-direction:column; align-items:center; gap:16px; padding:28px; border:2px solid #e5e7eb; border-radius:16px; width:280px; }
                           svg { display:block; }`
                    }
                </style>
            </head>
            <body>
                <div class="wrap">${content.innerHTML}</div>
                <script>window.onload = () => { window.print(); window.close(); }<\/script>
            </body>
            </html>
        `);
        win.document.close();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/8">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        <span className="font-black text-slate-800 dark:text-white text-sm">QR Code المنتج</span>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mx-6 mt-4 p-1 rounded-[14px] bg-black/5 dark:bg-white/8">
                    {(['classic', 'serial'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 h-8 rounded-[10px] text-xs font-bold transition-all ${
                                tab === t
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                    : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60'
                            }`}
                        >
                            {t === 'classic' ? 'مربع' : 'Serial No.'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex flex-col items-center gap-5 p-6">

                    {/* Classic */}
                    {tab === 'classic' && (
                        <div
                            ref={printRef}
                            className="flex flex-col items-center gap-4 p-6 rounded-[20px] border-2 border-black/8 bg-white w-full"
                        >
                            <div className="rounded-[16px] overflow-hidden p-2 bg-white border border-black/8">
                                <QRCodeSVG
                                    value={product.qrcode!}
                                    size={180}
                                    level="H"
                                    fgColor="#1e293b"
                                    imageSettings={{
                                        src: PERFUME_SVG_B64,
                                        width: 56,
                                        height: 56,
                                        excavate: true,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Serial */}
                    {tab === 'serial' && (() => {
                        const isLong = (product.qrcode || '').length > 12;
                        return (
                            <div
                                ref={printRef}
                                className="flex flex-col items-center bg-white border-2 border-black/10 rounded-[16px] px-4 py-5 gap-3 w-full"
                            >
                                <Barcode
                                    value={product.qrcode!}
                                    width={isLong ? 1 : 1.8}
                                    height={90}
                                    margin={0}
                                    background="#ffffff"
                                    lineColor="#1e293b"
                                    displayValue={false}
                                />
                                <p className={`code font-mono font-bold text-center break-all text-slate-700 ${isLong ? 'text-xs tracking-normal' : 'text-sm tracking-widest'}`}>{product.qrcode}</p>
                            </div>
                        );
                    })()}

                    <button
                        onClick={handlePrint}
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        طباعة QR Code
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── الصفحة الرئيسية ───────────────────────────────────────────
export default function ProductsIndex({ products, categories, tiers, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId]   = useState<number | null>(null);
    const [filterCat, setFilterCat]   = useState<number | null>(null);
    const [searchProdId, setSearchProdId] = useState<number | null>(null);
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [qrProduct, setQrProduct]   = useState<Product | null>(null);
    const [generatingAll, setGeneratingAll] = useState(false);

    const hasActiveFilter = !!searchProdId || !!filterCat || lowStockOnly;

    // توليد QR لمنتج واحد
    function handleGenerate(p: Product) {
        const newQr = generateQrCode();
        router.patch(`/products/${p.id}/qrcode`, { qrcode: newQr }, { preserveScroll: true });
    }

    // توليد جماعي لكل المنتجات التي لا تحتوي على QR
    function handleGenerateAll() {
        const missing = products.filter(p => !p.qrcode);
        if (missing.length === 0) return;
        setGeneratingAll(true);
        let remaining = missing.length;
        missing.forEach(p => {
            const newQr = generateQrCode();
            router.patch(`/products/${p.id}/qrcode`, { qrcode: newQr }, {
                preserveScroll: true,
                onFinish: () => {
                    remaining--;
                    if (remaining === 0) setGeneratingAll(false);
                },
            });
        });
    }

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ ...emptyForm });

    const createCat = categories.find(c => c.id === Number(createForm.data.category_id));
    const editCat   = categories.find(c => c.id === Number(editForm.data.category_id));

    const createIsOriginal = createCat?.unit === 'ml' && createForm.data.selling_type === 'unit_priced' && !createCat?.is_operational;
    const editIsOriginal   = editCat?.unit === 'ml' && editForm.data.selling_type === 'unit_priced' && !editCat?.is_operational;

    function onSelectCategory(form: typeof createForm, val: string) {
        const cat = categories.find(c => c.name === val);
        if (!cat) return;
        form.setData('category_id', String(cat.id));
        form.setData('selling_type', resolveSellingType(cat));
        form.setData('price_tier_id', '');
    }

    function onSelectTier(form: typeof createForm, val: string) {
        const tier = tiers.find(t => `تير ${t.name}` === val);
        form.setData('price_tier_id', tier ? String(tier.id) : '');
    }

    function cancelEdit() {
        setEditingId(null);
        editForm.clearErrors();
    }

    function startEdit(p: Product) {
        editForm.clearErrors();
        setEditingId(p.id);
        editForm.setData({
            name:                   p.name,
            category_id:            String(p.category.id),
            selling_type:           p.selling_type,
            price_tier_id:          p.price_tier ? String(p.price_tier.id) : '',
            min_stock:              p.min_stock,
            qrcode:                 p.qrcode ?? '',
            price_per_unit_regular: p.product_price?.price_per_unit_regular ?? '',
            price_per_unit_vip:     p.product_price?.price_per_unit_vip ?? '',
            full_bottle_regular:    p.product_price?.full_bottle_regular ?? '',
            full_bottle_vip:        p.product_price?.full_bottle_vip ?? '',
            bottle_volume:          p.original_perfume_detail?.bottle_volume ?? '',
        });
    }

    function submitCreate() {
        createForm.post('/products', {
            onSuccess: () => { createForm.reset(); setShowCreate(false); },
        });
    }

    function submitEdit(id: number) {
        editForm.put(`/products/${id}`, {
            onSuccess: () => cancelEdit(),
        });
    }

    function deleteProduct(id: number) {
        router.delete(`/products/${id}`);
    }

    const filtered = products.filter(p => {
        if (searchProdId && p.id !== searchProdId) return false;
        if (filterCat && p.category.id !== filterCat) return false;
        if (lowStockOnly && !(Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0)) return false;
        return true;
    });

    const tierDefaultValue = (form: typeof createForm) => {
        const t = tiers.find(t => String(t.id) === form.data.price_tier_id);
        return t ? `تير ${t.name}` : '';
    };

    // ── حقل QR في نموذج التعديل أو الإنشاء ──────────────────────────
    const renderQrField = (form: typeof editForm | typeof createForm) => {
        const hasQr = !!form.data.qrcode;
        return (
            <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                    <span className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg shrink-0 border border-violet-500/30">📱</span>
                    <span className="text-slate-900 dark:text-white tracking-wide">رمز QR Code والتتبع</span>
                </h4>

                <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-violet-500" />
                        رمز QR Code
                    </label>
                    <button
                        type="button"
                        onClick={() => form.setData('qrcode', generateQrCode())}
                        className="flex items-center gap-2 px-4 h-11 rounded-[14px] bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all text-sm font-black border-2 border-violet-500/30"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {hasQr ? 'تجديد الرمز' : 'توليد تلقائي'}
                    </button>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <input
                        value={form.data.qrcode}
                        onChange={e => form.setData('qrcode', e.target.value)}
                        placeholder="أدخل كود QR أو اضغط توليد..."
                        className="spatial-input h-14 rounded-[18px] px-5 text-lg font-mono flex-1 font-bold border-2"
                    />
                    {hasQr && (
                        <div className="rounded-[16px] overflow-hidden border-2 border-slate-300 dark:border-slate-600 bg-white p-2 shrink-0 shadow-md">
                            <QRCodeSVG value={form.data.qrcode} size={54} level="M" />
                        </div>
                    )}
                </div>
                {form.errors.qrcode && <p className="text-sm text-red-500 font-black">{form.errors.qrcode}</p>}
            </div>
        );
    };

    const activeForm = editingId !== null ? editForm : createForm;
    const activeCat  = editingId !== null ? editCat : createCat;
    const activeIsOriginal = editingId !== null ? editIsOriginal : createIsOriginal;

    return (
        <AppShell pageTitle="المنتجات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">إدارة المنتجات</h1>
                        <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">إدارة منتجات العطور والتسعير والتصنيفات بأحدث واجهة باللمس</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setFilterDrawerOpen(true)}
                            className={`flex items-center justify-center gap-3 px-6 h-14 rounded-[20px] font-black text-base transition-all active:scale-95 border-2 cursor-pointer shrink-0 shadow-md ${
                                hasActiveFilter
                                    ? 'bg-primary text-white border-primary shadow-primary/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                            <span>تصفية المنتجات</span>
                            {hasActiveFilter && (
                                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                            )}
                        </button>
                        {products.some(p => !p.qrcode) && (
                            <button
                                onClick={handleGenerateAll}
                                disabled={generatingAll}
                                className="flex items-center justify-center gap-2.5 px-6 h-14 rounded-[20px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base disabled:opacity-50 shrink-0"
                            >
                                <QrCode className="w-5 h-5" />
                                {generatingAll ? 'جاري التوليد...' : `توليد QR للكل (${products.filter(p => !p.qrcode).length})`}
                            </button>
                        )}
                        <button onClick={() => { setShowCreate(true); setEditingId(null); createForm.reset(); }}
                            className="spatial-button flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 h-14 text-lg font-black rounded-[20px] active:scale-95 shadow-xl shadow-primary/30 shrink-0">
                            <Plus className="w-6 h-6" /> إضافة منتج
                        </button>
                    </div>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="px-5 py-4 rounded-[20px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-4 rounded-[20px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-sm">{flash.error}</div>
                )}

                {/* Spatial Touch Drawer — إنشاء وتعديل المنتجات */}
                <div
                    className={`fixed inset-0 z-[9999] flex justify-start bg-black/65 backdrop-blur-md transition-all duration-300 ease-out cursor-pointer ${
                        (showCreate || editingId !== null) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowCreate(false);
                            cancelEdit();
                        }
                    }}
                >
                    <div
                        className={`relative w-full sm:w-[840px] md:w-[1000px] lg:w-[1140px] max-w-[95vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l-2 border-slate-200 dark:border-slate-700 transition-all duration-300 ease-out cursor-default ${
                            (showCreate || editingId !== null) ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    >
                            
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90">
                                <div className="flex items-center gap-4">
                                    <div className="w-13 h-13 rounded-[18px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-3">
                                        {editingId !== null ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h2 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">
                                            {editingId !== null ? `تعديل: ${editForm.data.name}` : 'إضافة منتج جديد'}
                                        </h2>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                            {editingId !== null ? 'تعديل التفاصيل، الأسعار، والحد الأدنى للمخزون' : 'أدخل بيانات المنتج الجديد وحد التنبيه والتسعير'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowCreate(false); cancelEdit(); }}
                                    className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all border border-slate-300 dark:border-slate-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Drawer Body — شبكة من عمودين للحاويات المخصصة */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-none">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    
                                    {/* العمود الأول (اليمين): المعلومات الأساسية + QR Code */}
                                    <div className="flex flex-col gap-6">
                                        {/* حاوية 1: المعلومات الأساسية والتصنيف */}
                                        <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-5 shadow-sm">
                                            <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                                <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg shrink-0 border border-primary/30">📦</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">المعلومات الأساسية والتصنيف</span>
                                            </h4>

                                            {/* الاسم */}
                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">اسم المنتج</label>
                                                <input
                                                    value={activeForm.data.name}
                                                    onChange={e => activeForm.setData('name', e.target.value)}
                                                    placeholder="مثال: Sauvage Elixir..."
                                                    className="spatial-input h-14 rounded-[18px] px-5 text-lg font-bold border-2"
                                                />
                                                {activeForm.errors.name && <p className="text-sm text-red-500 font-black">{activeForm.errors.name}</p>}
                                            </div>

                                            {/* اختيار التصنيف باللمس */}
                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">التصنيف</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {categories.map(c => {
                                                        const selected = activeCat?.id === c.id;
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => onSelectCategory(activeForm, c.name)}
                                                                className={`flex flex-col items-start gap-1 p-4 rounded-[20px] border-2 transition-all active:scale-95 text-right ${
                                                                    selected
                                                                        ? 'bg-primary/15 border-primary text-primary font-black shadow-md scale-[1.02]'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 font-bold'
                                                                }`}
                                                            >
                                                                <span className="text-base sm:text-lg font-black">{c.name}</span>
                                                                <span className="text-xs sm:text-sm font-bold opacity-75">الوحدة: {unitLabels[c.unit]}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {activeForm.errors.category_id && <p className="text-sm text-red-500 font-black">{activeForm.errors.category_id}</p>}
                                            </div>
                                        </div>

                                        {/* حاوية 4: QR Code Section */}
                                        {renderQrField(activeForm)}
                                    </div>

                                    {/* العمود الثاني (اليسار): الأسعار والتسعين + المخزون */}
                                    <div className="flex flex-col gap-6">
                                        {/* حاوية 2: تفاصيل التسعير والأسعار */}
                                        <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-5 shadow-sm">
                                            <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                                <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 border border-emerald-500/30">💰</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">تفاصيل التسعير والأسعار</span>
                                            </h4>

                                            {/* تير إذا كان tier_based */}
                                            {activeForm.data.selling_type === 'tier_based' && (
                                                <div className="flex flex-col gap-2.5">
                                                    <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">الفئة السعرية (التير)</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {tiers.map(t => {
                                                            const selected = activeForm.data.price_tier_id === String(t.id);
                                                            return (
                                                                <button
                                                                    key={t.id}
                                                                    type="button"
                                                                    onClick={() => activeForm.setData('price_tier_id', String(t.id))}
                                                                    className={`h-14 px-4 rounded-[16px] border-2 text-base font-black transition-all active:scale-95 ${
                                                                        selected
                                                                            ? 'bg-primary text-white border-primary shadow-md'
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold'
                                                                    }`}
                                                                >
                                                                    تير {t.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {activeForm.errors.price_tier_id && <p className="text-sm text-red-500 font-black">{activeForm.errors.price_tier_id}</p>}
                                                </div>
                                            )}

                                            {/* الأسعار إن كانت unit_priced وغير تشغيلية */}
                                            {activeCat && activeForm.data.selling_type === 'unit_priced' && !activeCat.is_operational && (
                                                <div className="flex flex-col gap-5">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر {unitLabels[activeCat.unit]} — عادي</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={activeForm.data.price_per_unit_regular}
                                                                onChange={e => activeForm.setData('price_per_unit_regular', e.target.value)}
                                                                className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر {unitLabels[activeCat.unit]} — VIP</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={activeForm.data.price_per_unit_vip}
                                                                onChange={e => activeForm.setData('price_per_unit_vip', e.target.value)}
                                                                className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2"
                                                            />
                                                        </div>
                                                    </div>

                                                    {activeIsOriginal && (
                                                        <div className="flex flex-col gap-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">حجم العبوة الأصلية (مليلتر)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    value={activeForm.data.bottle_volume}
                                                                    onChange={e => activeForm.setData('bottle_volume', e.target.value)}
                                                                    placeholder="200"
                                                                    className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر العبوة كاملة — عادي</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={activeForm.data.full_bottle_regular}
                                                                        onChange={e => activeForm.setData('full_bottle_regular', e.target.value)}
                                                                        className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر العبوة كاملة — VIP</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={activeForm.data.full_bottle_vip}
                                                                        onChange={e => activeForm.setData('full_bottle_vip', e.target.value)}
                                                                        className="spatial-input h-14 rounded-[16px] px-4 text-lg font-bold border-2"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* حاوية 3: حد تنبيه المخزون */}
                                        <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                            <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                                <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-500/30">⚠️</span>
                                                <span className="text-slate-900 dark:text-white tracking-wide">إدارة المخزون والتنبيهات</span>
                                            </h4>

                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">حد تنبيه نقصان المخزون</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={activeForm.data.min_stock}
                                                    onChange={e => activeForm.setData('min_stock', e.target.value)}
                                                    placeholder="0"
                                                    className="spatial-input h-14 rounded-[18px] px-5 text-lg font-bold border-2"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 flex items-center gap-4">
                                <button
                                    onClick={editingId !== null ? () => submitEdit(editingId) : submitCreate}
                                    disabled={editingId !== null ? editForm.processing : createForm.processing}
                                    className="flex-1 spatial-button h-16 rounded-[22px] text-lg font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/30"
                                >
                                    <Check className="w-6 h-6" />
                                    {editingId !== null ? 'تحديث بيانات المنتج' : 'إضافة المنتج إلى النظام'}
                                </button>
                                <button
                                    onClick={() => { setShowCreate(false); cancelEdit(); }}
                                    className="h-16 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-lg active:scale-95 transition-all border-2 border-slate-300 dark:border-slate-600"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>

                {/* Spatial Filter Drawer — تصفية المنتجات المتقدمة */}
                <div
                    className={`fixed inset-0 z-[9999] flex justify-start bg-black/65 backdrop-blur-md transition-all duration-300 ease-out cursor-pointer ${
                        filterDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setFilterDrawerOpen(false);
                        }
                    }}
                >
                    <div
                        className={`relative w-full max-w-2xl sm:w-[620px] lg:w-[680px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l-2 border-slate-200 dark:border-slate-700 transition-all duration-300 ease-out cursor-default ${
                            filterDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    >
                            
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[20px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-3 shadow-md">
                                        <SlidersHorizontal className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">تصفية المنتجات المتقدمة</h2>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">تحديد خيارات البحث والفرز والتصنيف بكفاءة عالية</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFilterDrawerOpen(false)}
                                    className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all border border-slate-300 dark:border-slate-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Drawer Content — الحاويات المقسمة */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-6 scrollbar-none">
                                
                                {/* حاوية 1: البحث والمعلومات الأساسية */}
                                <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                    <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                        <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg shrink-0 border border-primary/30">🔍</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">البحث والمعلومات الأساسية</span>
                                    </h4>
                                    
                                    <div className="flex flex-col gap-3">
                                        <label className="text-sm font-black text-slate-700 dark:text-slate-300">بحث بالاسم أو كود QR</label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <ModernSelect
                                                    label=""
                                                    placeholder="ابحث بالاسم أو كود QR..."
                                                    options={products.map(p => ({
                                                        label: p.name,
                                                        badge: p.category.name,
                                                        meta: fmt(p.stock),
                                                        searchKey: p.qrcode ?? undefined
                                                    }))}
                                                    onSelect={val => {
                                                        const prod = products.find(p => p.name === val);
                                                        if (prod) setSearchProdId(prod.id);
                                                    }}
                                                />
                                            </div>
                                            {searchProdId && (
                                                <button onClick={() => setSearchProdId(null)}
                                                    className="flex items-center gap-2 px-4 h-14 rounded-[18px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-sm shrink-0 border-2 border-red-500/30">
                                                    <X className="w-4 h-4" /> إلغاء البحث
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* حاوية 2: تصنيف المنتجات والفرز */}
                                <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                    <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                        <span className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shrink-0 border border-purple-500/30">🏷️</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">تصنيف المنتجات</span>
                                    </h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setFilterCat(null)}
                                            className={`flex items-center justify-between px-5 h-14 rounded-[18px] font-black text-base transition-all active:scale-95 border-2 cursor-pointer ${
                                                !filterCat
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}>
                                            <span>جميع التصنيفات</span>
                                            <span className={`text-xs font-black px-3 py-1 rounded-full ${
                                                !filterCat ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                                            }`}>{products.length}</span>
                                        </button>
                                        {categories.map(cat => {
                                            const count = products.filter(p => p.category.id === cat.id).length;
                                            const active = filterCat === cat.id;
                                            return (
                                                <button key={cat.id} onClick={() => setFilterCat(cat.id)}
                                                    className={`flex items-center justify-between px-5 h-14 rounded-[18px] font-black text-base transition-all active:scale-95 border-2 cursor-pointer ${
                                                        active
                                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}>
                                                    <span className="truncate">{cat.name}</span>
                                                    <span className={`text-xs font-black px-3 py-1 rounded-full ${
                                                        active ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                                                    }`}>{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* حاوية 3: حالة المخزون والتنبيهات */}
                                <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                    <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                        <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-500/30">⚠️</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">حالة المخزون والتنبيهات</span>
                                    </h4>

                                    <button
                                        onClick={() => setLowStockOnly(!lowStockOnly)}
                                        className={`flex items-center justify-between px-5 h-16 rounded-[18px] font-black text-base transition-all active:scale-95 border-2 cursor-pointer ${
                                            lowStockOnly
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-xl shadow-amber-500/30'
                                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className={`w-6 h-6 ${lowStockOnly ? 'text-white' : 'text-amber-500'}`} />
                                            <span>المنتجات التي أوشكت على النفاد</span>
                                        </div>
                                        <span className={`text-xs font-black px-3 py-1.5 rounded-full ${
                                            lowStockOnly ? 'bg-white/30 text-white' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                        }`}>
                                            {products.filter(p => Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0).length} منتج
                                        </span>
                                    </button>
                                </div>

                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 flex items-center gap-4">
                                <button
                                    onClick={() => setFilterDrawerOpen(false)}
                                    className="flex-1 spatial-button h-16 rounded-[22px] text-lg font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/30"
                                >
                                    <Check className="w-6 h-6" />
                                    عرض النتائج ({filtered.length})
                                </button>
                                {hasActiveFilter && (
                                    <button
                                        onClick={() => {
                                            setSearchProdId(null);
                                            setFilterCat(null);
                                            setLowStockOnly(false);
                                        }}
                                        className="h-16 px-6 rounded-[22px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white font-black text-lg active:scale-95 transition-all border-2 border-red-500/30 flex items-center gap-2 shrink-0"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        إعادة تعيين
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>

                {/* الشريط السريع للفلاتر النشطة إن وجدت */}
                {hasActiveFilter && (
                    <div className="p-4 rounded-[22px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2.5 text-sm font-black">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-primary" /> الفلاتر المفعلة:
                            </span>
                            {searchProdId && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                                    بحث: {products.find(p => p.id === searchProdId)?.name}
                                    <button onClick={() => setSearchProdId(null)}><X className="w-3.5 h-3.5 hover:text-red-500" /></button>
                                </span>
                            )}
                            {filterCat && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                    التصنيف: {categories.find(c => c.id === filterCat)?.name}
                                    <button onClick={() => setFilterCat(null)}><X className="w-3.5 h-3.5 hover:text-red-500" /></button>
                                </span>
                            )}
                            {lowStockOnly && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                    أوشكت على النفاد
                                    <button onClick={() => setLowStockOnly(false)}><X className="w-3.5 h-3.5 hover:text-red-500" /></button>
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => { setSearchProdId(null); setFilterCat(null); setLowStockOnly(false); }}
                            className="text-xs font-black text-red-500 hover:underline shrink-0"
                        >
                            إلغاء الكل
                        </button>
                    </div>
                )}

                {/* القائمة */}
                <SpatialCard title={`المنتجات (${filtered.length})`} icon={<Package className="w-5 h-5" />}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
                            <span className="text-4xl">📦</span>
                            <span className="font-black text-base">لا توجد منتجات مطابقة</span>
                        </div>
                    ) : (
                        <>
                            {/* جدول — PC */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-base">
                                    <thead>
                                        <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700">
                                            {['الاسم', 'التصنيف', 'مدى السعر', 'سعر العبوة', 'المخزون', 'الحد الأدنى', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-5 py-4 text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide whitespace-nowrap first:rounded-r-[16px] last:rounded-l-[16px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-200/80 dark:divide-slate-700/60">
                                        {filtered.map((product) => (
                                            <tr key={product.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group">
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">{product.name}</span>
                                                        {product.category.is_operational && (
                                                            <span className="text-xs font-black px-2.5 py-1 rounded-[8px] bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">تشغيلي</span>
                                                        )}
                                                        {product.qrcode && (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-[8px] bg-violet-500/15 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                                                <QrCode className="w-3.5 h-3.5" /> QR
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5 font-black text-slate-800 dark:text-slate-200 text-base whitespace-nowrap">{product.category.name}</td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {product.selling_type === 'tier_based' ? (
                                                        <span className="inline-flex items-center px-4 py-1.5 rounded-[12px] bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-300 font-black text-base border border-primary/25">تير {product.price_tier?.name}</span>
                                                    ) : product.product_price ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-base sm:text-lg">{fmt(product.product_price.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black text-base">—</span>
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-base sm:text-lg">{fmt(product.product_price.price_per_unit_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-black text-base">--</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {product.product_price?.full_bottle_regular ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-base sm:text-lg">{fmt(product.product_price.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black text-base">—</span>
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-base sm:text-lg">{fmt(product.product_price.full_bottle_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-black text-base">--</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 font-black px-3 py-1.5 rounded-[10px] bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-lg">
                                                            ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                        </span>
                                                    ) : (
                                                        <span className="font-black text-xl text-slate-900 dark:text-white">
                                                            {fmt(product.stock)} <span className="text-sm font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    <span className="font-black text-lg text-slate-800 dark:text-slate-200">{fmt(product.min_stock)} <span className="text-sm font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        {!product.qrcode && (
                                                            <button
                                                                onClick={() => handleGenerate(product)}
                                                                title="إنشاء QR Code"
                                                                className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm"
                                                            >
                                                                <QrCode className="w-5 h-5" /> إنشاء
                                                            </button>
                                                        )}
                                                        {product.qrcode && (
                                                            <button
                                                                onClick={() => setQrProduct(product)}
                                                                title="عرض QR Code"
                                                                className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm"
                                                            >
                                                                <QrCode className="w-5 h-5" /> QR
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setShowCreate(false); startEdit(product); }}
                                                            className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                            <Pencil className="w-5 h-5" /> تعديل
                                                        </button>
                                                        <DeleteModal
                                                            onConfirm={() => deleteProduct(product.id)}
                                                            trigger={
                                                                <button className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                                    <Trash2 className="w-5 h-5" /> حذف
                                                                </button>
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* كاردات — Mobile Touch */}
                            <div className="flex flex-col gap-5 lg:hidden">
                                {filtered.map(product => {
                                    const hasPrice = product.selling_type === 'unit_priced' && product.product_price;
                                    const hasBottle = !!product.product_price?.full_bottle_regular;
                                    const lowStock = Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0;

                                    return (
                                        <div key={product.id} className="rounded-[26px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 overflow-hidden shadow-sm">

                                            {/* رأس الكارت */}
                                            <div className="px-6 py-5 bg-slate-100/90 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl leading-tight">{product.name}</span>
                                                    {product.qrcode && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-[8px] bg-violet-500/15 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                                            <QrCode className="w-4 h-4" /> QR
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap mt-2">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-200">{product.category.name}</span>
                                                    {product.selling_type === 'tier_based' && (
                                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-300 border border-primary/25">تير {product.price_tier?.name}</span>
                                                    )}
                                                    {product.category.is_operational && (
                                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">تشغيلي</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* بيانات */}
                                            <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700/60 px-6">

                                                {hasPrice && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-black text-slate-700 dark:text-slate-300">مدى السعر</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-lg">{fmt(product.product_price!.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black">—</span>
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-lg">{fmt(product.product_price!.price_per_unit_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {hasBottle && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-black text-slate-700 dark:text-slate-300">سعر العبوة</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-lg">{fmt(product.product_price!.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black">—</span>
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-lg">{fmt(product.product_price!.full_bottle_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-300">المخزون</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        {lowStock ? (
                                                            <span className="inline-flex items-center gap-1.5 font-black px-3 py-1 rounded-[10px] bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-lg">
                                                                ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                            </span>
                                                        ) : (
                                                            <span className="font-black text-xl text-slate-900 dark:text-white">{fmt(product.stock)} <span className="text-base font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-300">الحد الأدنى</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="font-black text-lg text-slate-800 dark:text-slate-200">{fmt(product.min_stock)}</span>
                                                        <span className="text-base font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* الإجراءات باللمس */}
                                            <div className="flex items-center gap-3 px-6 py-4 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                                {!product.qrcode && (
                                                    <button
                                                        onClick={() => handleGenerate(product)}
                                                        className="flex items-center justify-center gap-2 h-13 px-5 rounded-[18px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm"
                                                    >
                                                        <QrCode className="w-5 h-5" /> إنشاء
                                                    </button>
                                                )}
                                                {product.qrcode && (
                                                    <button
                                                        onClick={() => setQrProduct(product)}
                                                        className="flex items-center justify-center gap-2 h-13 px-5 rounded-[18px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm"
                                                    >
                                                        <QrCode className="w-5 h-5" /> QR
                                                    </button>
                                                )}
                                                <button onClick={() => { setShowCreate(false); startEdit(product); }}
                                                    className="flex-1 flex items-center justify-center gap-2 h-13 rounded-[18px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                    <Pencil className="w-5 h-5" /> تعديل
                                                </button>
                                                <DeleteModal
                                                    onConfirm={() => deleteProduct(product.id)}
                                                    wrapperClassName="flex-1"
                                                    trigger={
                                                        <button className="w-full flex items-center justify-center gap-2 h-13 rounded-[18px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm">
                                                            <Trash2 className="w-5 h-5" /> حذف
                                                        </button>
                                                    }
                                                />
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </SpatialCard>


            </div>

            {/* QR Modal */}
            {qrProduct && (
                <QrModal product={qrProduct} onClose={() => setQrProduct(null)} />
            )}
        </AppShell>
    );
}
