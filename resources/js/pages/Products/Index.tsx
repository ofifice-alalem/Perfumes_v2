import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check, Package } from 'lucide-react';
import { DeleteModal } from '@/components/ui/DeleteModal';

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

const emptyForm = {
    name: '', category_id: '', selling_type: 'tier_based' as 'tier_based' | 'unit_priced',
    price_tier_id: '', min_stock: '',
    price_per_unit_regular: '', price_per_unit_vip: '',
    full_bottle_regular: '', full_bottle_vip: '', bottle_volume: '',
};

function resolveSellingType(cat: Category): 'tier_based' | 'unit_priced' {
    if (cat.is_operational) return 'unit_priced';
    return cat.unit === 'ml' && cat.name.includes('زيت') ? 'tier_based' : 'unit_priced';
}

function saleTypeLabel(p: Product) {
    if (p.selling_type === 'tier_based') return `تير ${p.price_tier?.name}`;
    if (p.category.unit === 'ml') return 'عطر أصلي';
    return 'وحدة';
}

export default function ProductsIndex({ products, categories, tiers, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId]   = useState<number | null>(null);
    const [filterCat, setFilterCat]   = useState<number | null>(null);

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

    function startEdit(p: Product) {
        setEditingId(p.id);
        editForm.setData({
            name:                   p.name,
            category_id:            String(p.category.id),
            selling_type:           p.selling_type,
            price_tier_id:          p.price_tier ? String(p.price_tier.id) : '',
            min_stock:              p.min_stock,
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
            onSuccess: () => setEditingId(null),
        });
    }

    function deleteProduct(id: number) {
        router.delete(`/products/${id}`);
    }

    const filtered = filterCat ? products.filter(p => p.category.id === filterCat) : products;

    const tierDefaultValue = (form: typeof createForm) => {
        const t = tiers.find(t => String(t.id) === form.data.price_tier_id);
        return t ? `تير ${t.name}` : '';
    };

    return (
        <AppShell pageTitle="المنتجات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">المنتجات</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إدارة جميع المنتجات وأسعارها</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> إضافة منتج
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                {/* Create Form */}
                {showCreate && (
                    <SpatialCard title="منتج جديد" icon={<Plus className="w-4 h-4" />}>
                        <div className="flex flex-col gap-4">

                            {/* الحقول الأساسية */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم</label>
                                    <input value={createForm.data.name}
                                        onChange={e => createForm.setData('name', e.target.value)}
                                        placeholder="مثال: Dior Sauvage"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                                    />
                                    {createForm.errors.name && <p className="text-xs text-red-500 font-bold">{createForm.errors.name}</p>}
                                </div>

                                <div className="w-full sm:w-52">
                                    <ModernSelect label="التصنيف"
                                        options={categories.map(c => ({ label: c.name, badge: c.unit }))}
                                        defaultValue={createCat?.name ?? ''}
                                        onSelect={val => onSelectCategory(createForm, val)}
                                    />
                                    {createForm.errors.category_id && <p className="text-xs text-red-500 font-bold mt-1">{createForm.errors.category_id}</p>}
                                </div>

                                {createForm.data.selling_type === 'tier_based' && (
                                    <div className="w-full sm:w-40">
                                        <ModernSelect label="التير"
                                            options={tiers.map(t => ({ label: `تير ${t.name}`, badge: t.name }))}
                                            defaultValue={tierDefaultValue(createForm)}
                                            onSelect={val => onSelectTier(createForm, val)}
                                        />
                                        {createForm.errors.price_tier_id && <p className="text-xs text-red-500 font-bold mt-1">{createForm.errors.price_tier_id}</p>}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 w-full sm:w-36">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">حد التنبيه</label>
                                    <input type="number" min="0" step="0.01"
                                        value={createForm.data.min_stock}
                                        onChange={e => createForm.setData('min_stock', e.target.value)}
                                        placeholder="0"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                                    />
                                </div>
                            </div>

                            {/* حقول الأسعار — فقط للمنتجات غير التشغيلية */}
                            {createCat && createForm.data.selling_type === 'unit_priced' && !createCat.is_operational && (
                                <div className="flex flex-col gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر {unitLabels[createCat.unit]} — عادي</label>
                                            <input type="number" min="0" step="0.01"
                                                value={createForm.data.price_per_unit_regular}
                                                onChange={e => createForm.setData('price_per_unit_regular', e.target.value)}
                                                className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                            />
                                            {createForm.errors.price_per_unit_regular && <p className="text-xs text-red-500 font-bold">{createForm.errors.price_per_unit_regular}</p>}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر {unitLabels[createCat.unit]} — VIP</label>
                                            <input type="number" min="0" step="0.01"
                                                value={createForm.data.price_per_unit_vip}
                                                onChange={e => createForm.setData('price_per_unit_vip', e.target.value)}
                                                className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                            />
                                        </div>
                                    </div>

                                    {createIsOriginal && (
                                        <>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">حجم العبوة (ml)</label>
                                                <input type="number" min="0.01" step="0.01"
                                                    value={createForm.data.bottle_volume}
                                                    onChange={e => createForm.setData('bottle_volume', e.target.value)}
                                                    placeholder="مثال: 200"
                                                    className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر العبوة كاملة — عادي</label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={createForm.data.full_bottle_regular}
                                                        onChange={e => createForm.setData('full_bottle_regular', e.target.value)}
                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر العبوة كاملة — VIP</label>
                                                    <input type="number" min="0" step="0.01"
                                                        value={createForm.data.full_bottle_vip}
                                                        onChange={e => createForm.setData('full_bottle_vip', e.target.value)}
                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <button onClick={submitCreate} disabled={createForm.processing}
                                    className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
                                    <Check className="w-4 h-4" /> حفظ
                                </button>
                                <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                                    className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* فلتر التصنيف */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button onClick={() => setFilterCat(null)}
                        className={`flex items-center gap-1.5 px-4 h-9 rounded-full font-bold text-sm transition-all whitespace-nowrap shrink-0 ${
                            !filterCat
                                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                : 'bg-black/5 dark:bg-white/8 text-slate-500 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/12 border border-black/5 dark:border-white/8'
                        }`}>
                        الكل
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                            !filterCat ? 'bg-white/20 text-white' : 'bg-black/8 dark:bg-white/10 text-slate-500 dark:text-white/50'
                        }`}>{products.length}</span>
                    </button>
                    {categories.map(cat => {
                        const count = products.filter(p => p.category.id === cat.id).length;
                        const active = filterCat === cat.id;
                        return (
                            <button key={cat.id} onClick={() => setFilterCat(cat.id)}
                                className={`flex items-center gap-1.5 px-4 h-9 rounded-full font-bold text-sm transition-all whitespace-nowrap shrink-0 ${
                                    active
                                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                        : 'bg-black/5 dark:bg-white/8 text-slate-500 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/12 border border-black/5 dark:border-white/8'
                                }`}>
                                {cat.name}
                                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                                    active ? 'bg-white/20 text-white' : 'bg-black/8 dark:bg-white/10 text-slate-500 dark:text-white/50'
                                }`}>{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* القائمة */}
                <SpatialCard title={`المنتجات (${filtered.length})`} icon={<Package className="w-4 h-4" />}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">📦</span>
                            <span className="font-bold">لا توجد منتجات بعد</span>
                        </div>
                    ) : (
                        <>
                            {/* جدول — PC */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['الاسم', 'التصنيف', 'مدى السعر', 'سعر العبوة', 'المخزون', 'الحد الأدنى', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap first:rounded-r-[14px] last:rounded-l-[14px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {filtered.map((product, idx) => (
                                            editingId === product.id ? (
                                                <tr key={product.id}>
                                                    <td colSpan={7} className="px-4 py-4">
                                                        <div className="flex flex-col gap-4 p-4 rounded-[16px] bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/25">
                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                <div className="flex flex-col gap-1.5 flex-1">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم</label>
                                                                    <input value={editForm.data.name}
                                                                        onChange={e => editForm.setData('name', e.target.value)}
                                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold"
                                                                    />
                                                                    {editForm.errors.name && <p className="text-xs text-red-500 font-bold">{editForm.errors.name}</p>}
                                                                </div>
                                                                <div className="w-full sm:w-48">
                                                                    <ModernSelect label="التصنيف"
                                                                        options={categories.map(c => ({ label: c.name, badge: c.unit }))}
                                                                        defaultValue={editCat?.name ?? ''}
                                                                        onSelect={val => onSelectCategory(editForm, val)}
                                                                    />
                                                                </div>
                                                                {editForm.data.selling_type === 'tier_based' && (
                                                                    <div className="w-full sm:w-36">
                                                                        <ModernSelect label="التير"
                                                                            options={tiers.map(t => ({ label: `تير ${t.name}`, badge: t.name }))}
                                                                            defaultValue={tierDefaultValue(editForm)}
                                                                            onSelect={val => onSelectTier(editForm, val)}
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col gap-1.5 w-full sm:w-32">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">حد التنبيه</label>
                                                                    <input type="number" min="0" step="0.01"
                                                                        value={editForm.data.min_stock}
                                                                        onChange={e => editForm.setData('min_stock', e.target.value)}
                                                                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {editCat && editForm.data.selling_type === 'unit_priced' && !editCat.is_operational && (
                                                                <div className="flex flex-col gap-3 pt-3 border-t border-black/5 dark:border-white/8">
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر {unitLabels[editCat.unit]} — عادي</label>
                                                                            <input type="number" min="0" step="0.01" value={editForm.data.price_per_unit_regular} onChange={e => editForm.setData('price_per_unit_regular', e.target.value)} className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                        </div>
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر {unitLabels[editCat.unit]} — VIP</label>
                                                                            <input type="number" min="0" step="0.01" value={editForm.data.price_per_unit_vip} onChange={e => editForm.setData('price_per_unit_vip', e.target.value)} className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                        </div>
                                                                    </div>
                                                                    {editIsOriginal && (
                                                                        <div className="flex flex-col gap-3">
                                                                            <div className="flex flex-col gap-1.5">
                                                                                <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">حجم العبوة (ml)</label>
                                                                                <input type="number" min="0.01" step="0.01" value={editForm.data.bottle_volume} onChange={e => editForm.setData('bottle_volume', e.target.value)} placeholder="200" className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <div className="flex flex-col gap-1.5">
                                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر العبوة — عادي</label>
                                                                                    <input type="number" min="0" step="0.01" value={editForm.data.full_bottle_regular} onChange={e => editForm.setData('full_bottle_regular', e.target.value)} className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                                </div>
                                                                                <div className="flex flex-col gap-1.5">
                                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر العبوة — VIP</label>
                                                                                    <input type="number" min="0" step="0.01" value={editForm.data.full_bottle_vip} onChange={e => editForm.setData('full_bottle_vip', e.target.value)} className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => submitEdit(product.id)} className="spatial-button flex items-center gap-2 px-5 h-10 text-sm">
                                                                    <Check className="w-4 h-4" /> حفظ
                                                                </button>
                                                                <button onClick={() => setEditingId(null)} className="h-10 px-4 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                                                    إلغاء
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                            <tr key={product.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors group">
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 dark:text-white">{product.name}</span>
                                                        {product.category.is_operational && (
                                                            <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-black/5 dark:bg-white/8 border border-black/10 dark:border-white/12 text-slate-500 dark:text-white/50">تشغيلي</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 font-bold text-slate-600 dark:text-white/70 whitespace-nowrap">{product.category.name}</td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {product.selling_type === 'tier_based' ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-[8px] bg-primary/10 dark:bg-primary/25 text-primary dark:text-blue-300 font-black text-sm">تير {product.price_tier?.name}</span>
                                                    ) : product.product_price ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2.5 py-1 rounded-[8px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-black text-sm">{product.product_price.price_per_unit_vip}</span>
                                                            <span className="text-slate-300 dark:text-white/30 font-bold">—</span>
                                                            <span className="px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/10 text-slate-700 dark:text-white/80 font-black text-sm">{product.product_price.price_per_unit_regular}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-white/25 font-bold">--</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {product.product_price?.full_bottle_regular ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2.5 py-1 rounded-[8px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-black text-sm">{product.product_price.full_bottle_vip}</span>
                                                            <span className="text-slate-300 dark:text-white/30 font-bold">—</span>
                                                            <span className="px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/10 text-slate-700 dark:text-white/80 font-black text-sm">{product.product_price.full_bottle_regular}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-white/25 font-bold">--</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className={`font-bold ${Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                                        {product.stock} {unitLabels[product.category.unit]}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className="font-bold text-slate-500 dark:text-white/50">{product.min_stock} {unitLabels[product.category.unit]}</span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => startEdit(product)}
                                                            className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                            <Pencil className="w-3 h-3" /> تعديل
                                                        </button>
                                                        <DeleteModal
                                                            onConfirm={() => deleteProduct(product.id)}
                                                            trigger={
                                                                <button className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                    <Trash2 className="w-3 h-3" /> حذف
                                                                </button>
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* كاردات — Mobile */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {filtered.map(product => {
                                    const hasPrice = product.selling_type === 'unit_priced' && product.product_price;
                                    const hasBottle = !!product.product_price?.full_bottle_regular;
                                    const lowStock = Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0;

                                    return (
                                        editingId === product.id ? (
                                        <div key={product.id} className="rounded-[24px] border border-primary/25 dark:border-primary/30 overflow-hidden">
                                            <div className="px-5 py-3 bg-primary/5 dark:bg-primary/10 flex items-center justify-between">
                                                <span className="font-black text-slate-700 dark:text-white/80 text-sm">تعديل: {product.name}</span>
                                                <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/8 flex items-center justify-center text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white transition-all">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-4 p-5">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم</label>
                                                        <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)} className="spatial-input h-11 rounded-[14px] px-4 text-[15px] font-bold" />
                                                        {editForm.errors.name && <p className="text-xs text-red-500 font-bold">{editForm.errors.name}</p>}
                                                    </div>
                                                    <ModernSelect label="التصنيف"
                                                        options={categories.map(c => ({ label: c.name, badge: c.unit }))}
                                                        defaultValue={editCat?.name ?? ''}
                                                        onSelect={val => onSelectCategory(editForm, val)}
                                                    />
                                                    {editForm.data.selling_type === 'tier_based' && (
                                                        <ModernSelect label="التير"
                                                            options={tiers.map(t => ({ label: `تير ${t.name}`, badge: t.name }))}
                                                            defaultValue={tierDefaultValue(editForm)}
                                                            onSelect={val => onSelectTier(editForm, val)}
                                                        />
                                                    )}
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">حد التنبيه</label>
                                                        <input type="number" min="0" step="0.01" value={editForm.data.min_stock} onChange={e => editForm.setData('min_stock', e.target.value)} className="spatial-input h-11 rounded-[14px] px-4 text-[15px] font-bold" />
                                                    </div>
                                                </div>
                                                {editCat && editForm.data.selling_type === 'unit_priced' && !editCat.is_operational && (
                                                    <div className="flex flex-col gap-3 pt-3 border-t border-black/5 dark:border-white/8">
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر {unitLabels[editCat.unit]} — عادي</label>
                                                            <input type="number" min="0" step="0.01" value={editForm.data.price_per_unit_regular} onChange={e => editForm.setData('price_per_unit_regular', e.target.value)} className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر {unitLabels[editCat.unit]} — VIP</label>
                                                            <input type="number" min="0" step="0.01" value={editForm.data.price_per_unit_vip} onChange={e => editForm.setData('price_per_unit_vip', e.target.value)} className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
                                                        </div>
                                                        {editIsOriginal && (
                                                            <>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">حجم العبوة (ml)</label>
                                                                    <input type="number" min="0.01" step="0.01" value={editForm.data.bottle_volume} onChange={e => editForm.setData('bottle_volume', e.target.value)} placeholder="200" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر العبوة — عادي</label>
                                                                    <input type="number" min="0" step="0.01" value={editForm.data.full_bottle_regular} onChange={e => editForm.setData('full_bottle_regular', e.target.value)} className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر العبوة — VIP</label>
                                                                    <input type="number" min="0" step="0.01" value={editForm.data.full_bottle_vip} onChange={e => editForm.setData('full_bottle_vip', e.target.value)} className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex gap-3 pt-2">
                                                    <button onClick={() => submitEdit(product.id)} className="flex-1 spatial-button flex items-center justify-center gap-2 h-11 text-sm">
                                                        <Check className="w-4 h-4" /> حفظ
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="flex-1 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                                        إلغاء
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        ) : (
                                        <div key={product.id} className="rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden">

                                            {/* رأس */}
                                            <div className="px-5 py-4 bg-black/3 dark:bg-white/6">
                                                <span className="font-black text-slate-800 dark:text-white text-lg leading-tight">{product.name}</span>
                                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/50">{product.category.name}</span>
                                                    {product.selling_type === 'tier_based' && (
                                                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-primary/10 dark:bg-primary/25 text-primary dark:text-blue-300">تير {product.price_tier?.name}</span>
                                                    )}
                                                    {product.category.is_operational && (
                                                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-black/8 dark:bg-white/12 text-slate-500 dark:text-white/60">تشغيلي</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* بيانات */}
                                            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">

                                                {hasPrice && (
                                                    <div className="flex items-center justify-between py-3.5">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">مدى السعر</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 rounded-[10px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-black text-base">{product.product_price!.price_per_unit_vip}</span>
                                                            <span className="text-slate-300 dark:text-white/25 font-bold">—</span>
                                                            <span className="px-3 py-1 rounded-[10px] bg-black/5 dark:bg-white/10 text-slate-700 dark:text-white/80 font-black text-base">{product.product_price!.price_per_unit_regular}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {hasBottle && (
                                                    <div className="flex items-center justify-between py-3.5">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">سعر العبوة</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 rounded-[10px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-black text-base">{product.product_price!.full_bottle_vip}</span>
                                                            <span className="text-slate-300 dark:text-white/25 font-bold">—</span>
                                                            <span className="px-3 py-1 rounded-[10px] bg-black/5 dark:bg-white/10 text-slate-700 dark:text-white/80 font-black text-base">{product.product_price!.full_bottle_regular}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between py-3.5">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">المخزون</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className={`font-black text-lg ${lowStock ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>{product.stock}</span>
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">{unitLabels[product.category.unit]}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-3.5">
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">الحد الأدنى</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="font-black text-lg text-slate-600 dark:text-white/70">{product.min_stock}</span>
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">{unitLabels[product.category.unit]}</span>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* الإجراءات */}
                                            <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                                <button onClick={() => startEdit(product)}
                                                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                    <Pencil className="w-4 h-4" /> تعديل
                                                </button>
                                                <DeleteModal
                                                    onConfirm={() => deleteProduct(product.id)}
                                                    wrapperClassName="flex-1"
                                                    trigger={
                                                        <button className="w-full flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-4 h-4" /> حذف
                                                        </button>
                                                    }
                                                />
                                            </div>

                                        </div>
                                        )
                                    );
                                })}
                            </div>
                        </>
                    )}
                </SpatialCard>


            </div>
        </AppShell>
    );
}
