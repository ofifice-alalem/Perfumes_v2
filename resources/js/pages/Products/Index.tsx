import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check, Package } from 'lucide-react';

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
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
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
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setFilterCat(null)}
                        className={`px-4 h-9 rounded-[14px] font-bold text-sm transition-all ${!filterCat ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>
                        الكل ({products.length})
                    </button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setFilterCat(cat.id)}
                            className={`px-4 h-9 rounded-[14px] font-bold text-sm transition-all ${filterCat === cat.id ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            {cat.name} ({products.filter(p => p.category.id === cat.id).length})
                        </button>
                    ))}
                </div>

                {/* القائمة */}
                <SpatialCard title={`المنتجات (${filtered.length})`} icon={<Package className="w-4 h-4" />}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">📦</span>
                            <span className="font-bold">لا توجد منتجات بعد</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {filtered.map(product => (
                                <div key={product.id} className="flex flex-col gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">

                                    {editingId === product.id ? (
                                        <div className="flex flex-col gap-4">

                                            {/* الحقول الأساسية - تعديل */}
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <input value={editForm.data.name}
                                                    onChange={e => editForm.setData('name', e.target.value)}
                                                    className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold flex-1"
                                                />
                                                <div className="w-full sm:w-48">
                                                    <ModernSelect label=""
                                                        options={categories.map(c => ({ label: c.name, badge: c.unit }))}
                                                        defaultValue={editCat?.name ?? ''}
                                                        onSelect={val => onSelectCategory(editForm, val)}
                                                    />
                                                </div>
                                                {editForm.data.selling_type === 'tier_based' && (
                                                    <div className="w-full sm:w-36">
                                                        <ModernSelect label=""
                                                            options={tiers.map(t => ({ label: `تير ${t.name}`, badge: t.name }))}
                                                            defaultValue={tierDefaultValue(editForm)}
                                                            onSelect={val => onSelectTier(editForm, val)}
                                                        />
                                                    </div>
                                                )}
                                                <input type="number" min="0" step="0.01"
                                                    value={editForm.data.min_stock}
                                                    onChange={e => editForm.setData('min_stock', e.target.value)}
                                                    placeholder="حد التنبيه"
                                                    className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold w-full sm:w-32"
                                                />
                                            </div>

                                            {/* حقول الأسعار — فقط للمنتجات غير التشغيلية */}
                                            {editCat && editForm.data.selling_type === 'unit_priced' && !editCat.is_operational && (
                                                <div className="flex flex-col gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر {unitLabels[editCat.unit]} — عادي</label>
                                                            <input type="number" min="0" step="0.01"
                                                                value={editForm.data.price_per_unit_regular}
                                                                onChange={e => editForm.setData('price_per_unit_regular', e.target.value)}
                                                                className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر {unitLabels[editCat.unit]} — VIP</label>
                                                            <input type="number" min="0" step="0.01"
                                                                value={editForm.data.price_per_unit_vip}
                                                                onChange={e => editForm.setData('price_per_unit_vip', e.target.value)}
                                                                className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                            />
                                                        </div>
                                                    </div>

                                                    {editIsOriginal && (
                                                        <>
                                                            <div className="flex flex-col gap-2">
                                                                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">حجم العبوة (ml)</label>
                                                                <input type="number" min="0.01" step="0.01"
                                                                    value={editForm.data.bottle_volume}
                                                                    onChange={e => editForm.setData('bottle_volume', e.target.value)}
                                                                    placeholder="مثال: 200"
                                                                    className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر العبوة كاملة — عادي</label>
                                                                    <input type="number" min="0" step="0.01"
                                                                        value={editForm.data.full_bottle_regular}
                                                                        onChange={e => editForm.setData('full_bottle_regular', e.target.value)}
                                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر العبوة كاملة — VIP</label>
                                                                    <input type="number" min="0" step="0.01"
                                                                        value={editForm.data.full_bottle_vip}
                                                                        onChange={e => editForm.setData('full_bottle_vip', e.target.value)}
                                                                        className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <button onClick={() => submitEdit(product.id)}
                                                    className="flex items-center gap-1.5 px-4 h-10 rounded-[12px] bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-bold text-sm">
                                                    <Check className="w-4 h-4" /> حفظ
                                                </button>
                                                <button onClick={() => setEditingId(null)}
                                                    className="flex items-center gap-1.5 px-4 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all font-bold text-sm">
                                                    <X className="w-4 h-4" /> إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-[14px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-800 dark:text-white truncate">{product.name}</span>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-black/5 dark:bg-white/8 border border-black/10 dark:border-white/12 text-slate-500 dark:text-white/50 shrink-0">
                                                            {saleTypeLabel(product)}
                                                        </span>
                                                        {product.category.is_operational && (
                                                            <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-black/5 dark:bg-white/8 border border-black/10 dark:border-white/12 text-slate-500 dark:text-white/50 shrink-0">تشغيلي</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">{product.category.name}</span>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">
                                                            مخزون: {product.stock} {unitLabels[product.category.unit]}
                                                        </span>
                                                        {product.product_price && (
                                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">
                                                                {product.product_price.price_per_unit_regular} / {product.product_price.price_per_unit_vip}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => startEdit(product)}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                                                    <Pencil className="w-3.5 h-3.5" /> تعديل
                                                </button>
                                                <button onClick={() => deleteProduct(product.id)}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 font-bold text-sm">
                                                    <Trash2 className="w-3.5 h-3.5" /> حذف
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </SpatialCard>

            </div>
        </AppShell>
    );
}
