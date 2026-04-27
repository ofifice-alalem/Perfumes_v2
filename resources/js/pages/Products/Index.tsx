import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check, Package } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Category { id: number; name: string; unit: string; }
interface Tier      { id: number; name: string; description: string | null; }
interface ProductPrice { price_per_unit_regular: string; price_per_unit_vip: string; full_bottle_regular: string | null; full_bottle_vip: string | null; }
interface OriginalDetail { bottle_volume: string; }
interface Product {
  id: number; name: string; selling_type: 'tier_based' | 'unit_priced';
  stock: string; min_stock: string;
  category: Category; price_tier: Tier | null;
  product_price: ProductPrice | null;
  original_perfume_detail: OriginalDetail | null;
}

interface Props {
  products: Product[];
  categories: Category[];
  tiers: Tier[];
  flash?: { success?: string; error?: string };
}

const sellingTypeColors = {
  tier_based:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  unit_priced: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
};

const emptyForm = {
  name: '', category_id: '', selling_type: 'tier_based' as 'tier_based'|'unit_priced',
  price_tier_id: '', min_stock: '0',
  price_per_unit_regular: '', price_per_unit_vip: '',
  full_bottle_regular: '', full_bottle_vip: '', bottle_volume: '',
};

// ✅ خارج الـ component الرئيسي — لا يُعاد إنشاؤه عند كل render
function ProductForm({ form, categories, tiers, onSubmit, onCancel }: {
  form: ReturnType<typeof useForm<typeof emptyForm>>;
  categories: Category[];
  tiers: Tier[];
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const catOptions  = categories.map(c => ({ label: c.name, badge: c.unit }));
  const tierOptions = tiers.map(t => ({ label: `تير ${t.name}`, badge: t.name, meta: t.description ?? '' }));

  const selectedCat = categories.find(c => c.id === +form.data.category_id);
  const isML        = selectedCat?.unit === 'ml';
  const isOriginal  = form.data.selling_type === 'unit_priced' && isML;
  const isBottle    = isOriginal; // حجم العبوة فقط للعطور الأصلية

  // عند تغيير التصنيف — نعيد ضبط selling_type
  function handleCategoryChange(val: string) {
    const cat = categories.find(c => c.name === val);
    if (!cat) return;
    form.setData(prev => ({
      ...prev,
      category_id:   String(cat.id),
      selling_type:  cat.unit === 'ml' ? prev.selling_type : 'unit_priced',
      price_tier_id: cat.unit === 'ml' ? prev.price_tier_id : '',
    }));
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Row 1 — التصنيف */}
      <div className="w-full sm:w-64">
        <ModernSelect label="التصنيف" options={catOptions}
          defaultValue={selectedCat?.name ?? ''}
          onSelect={handleCategoryChange}
        />
        {form.errors.category_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.category_id}</p>}
      </div>

      {/* Row 2 — نوع البيع (ml فقط) */}
      {isML && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-3">
            {[
              { value: 'tier_based',  label: 'عطر زيتي', desc: 'سعر من التير' },
              { value: 'unit_priced', label: 'عطر أصلي', desc: 'سعر خاص + عبوة' },
            ].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => form.setData('selling_type', opt.value as any)}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-[16px] border-2 transition-all font-bold text-sm ${
                  form.data.selling_type === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-primary/40'
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-xs font-bold opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* التير — عطر زيتي فقط */}
      {form.data.selling_type === 'tier_based' && isML && (
        <div className="w-full sm:w-56">
          <ModernSelect label="التير" options={tierOptions}
            defaultValue={tiers.find(t => t.id === +form.data.price_tier_id) ? `تير ${tiers.find(t => t.id === +form.data.price_tier_id)!.name}` : ''}
            onSelect={val => form.setData('price_tier_id', String(tiers.find(t => `تير ${t.name}` === val)?.id ?? ''))}
          />
          {form.errors.price_tier_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.price_tier_id}</p>}
        </div>
      )}

      {/* اسم المنتج + حد المخزون */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم المنتج</label>
          <input value={form.data.name} onChange={e => form.setData('name', e.target.value)}
            placeholder="مثال: Lacoste White" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.name && <p className="text-xs text-red-500 font-bold">{form.errors.name}</p>}
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-40">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">حد المخزون</label>
          <input type="number" value={form.data.min_stock} onChange={e => form.setData('min_stock', e.target.value)}
            placeholder="0" min="0" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
        </div>
      </div>

      {/* الأسعار — unit_priced فقط */}
      {form.data.selling_type === 'unit_priced' && selectedCat && (
        <div className="flex flex-col gap-4 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
          <p className="text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">الأسعار</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-white/75">سعر الوحدة (عادي)</label>
              <input type="number" min="0" step="0.01" value={form.data.price_per_unit_regular}
                onChange={e => form.setData('price_per_unit_regular', e.target.value)}
                placeholder="0" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-white/75">سعر الوحدة (VIP)</label>
              <input type="number" min="0" step="0.01" value={form.data.price_per_unit_vip}
                onChange={e => form.setData('price_per_unit_vip', e.target.value)}
                placeholder="0" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
            </div>

            {/* سعر العبوة — عطور أصلية فقط */}
            {isBottle && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75">سعر العبوة كاملة (عادي)</label>
                  <input type="number" min="0" step="0.01" value={form.data.full_bottle_regular}
                    onChange={e => form.setData('full_bottle_regular', e.target.value)}
                    placeholder="0" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75">سعر العبوة كاملة (VIP)</label>
                  <input type="number" min="0" step="0.01" value={form.data.full_bottle_vip}
                    onChange={e => form.setData('full_bottle_vip', e.target.value)}
                    placeholder="0" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
                </div>
              </>
            )}
          </div>

          {/* حجم العبوة — عطور أصلية فقط */}
          {isBottle && (
            <div className="flex flex-col gap-2 w-full sm:w-48">
              <label className="text-xs font-bold text-slate-700 dark:text-white/75">حجم العبوة (ml)</label>
              <input type="number" min="0" step="0.01" value={form.data.bottle_volume}
                onChange={e => form.setData('bottle_volume', e.target.value)}
                placeholder="مثال: 200" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={onSubmit} disabled={form.processing}
          className="spatial-button flex items-center gap-2 px-6 h-11 text-sm">
          <Check className="w-4 h-4" /> حفظ
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
          <X className="w-4 h-4" /> إلغاء
        </button>
      </div>
    </div>
  );
}

export default function ProductsIndex({ products, categories, tiers, flash }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);

  const createForm = useForm({ ...emptyForm });
  const editForm   = useForm({ ...emptyForm });

  function startEdit(p: Product) {
    setEditingId(p.id);
    editForm.setData({
      name: p.name, category_id: String(p.category.id),
      selling_type: p.selling_type,
      price_tier_id: p.price_tier ? String(p.price_tier.id) : '',
      min_stock: p.min_stock,
      price_per_unit_regular: p.product_price?.price_per_unit_regular ?? '',
      price_per_unit_vip:     p.product_price?.price_per_unit_vip ?? '',
      full_bottle_regular:    p.product_price?.full_bottle_regular ?? '',
      full_bottle_vip:        p.product_price?.full_bottle_vip ?? '',
      bottle_volume:          p.original_perfume_detail?.bottle_volume ?? '',
    });
  }

  function submitCreate() {
    createForm.post('/products', { onSuccess: () => { createForm.reset(); setShowCreate(false); } });
  }

  function submitEdit(id: number) {
    editForm.put(`/products/${id}`, { onSuccess: () => setEditingId(null) });
  }

  function deleteProduct(id: number) {
    router.delete(`/products/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  return (
    <AppShell pageTitle="Step 3 — المنتجات">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">المنتجات</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{products.length} منتج مسجل</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> إضافة منتج
          </button>
        </div>

        {/* Flash */}
        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {/* Create Form */}
        {showCreate && (
          <SpatialCard title="منتج جديد" icon={<Plus className="w-4 h-4" />}>
            <ProductForm form={createForm} categories={categories} tiers={tiers}
              onSubmit={submitCreate} onCancel={() => { setShowCreate(false); createForm.reset(); }} />
          </SpatialCard>
        )}

        {/* List */}
        <SpatialCard title={`المنتجات (${products.length})`} icon={<Package className="w-4 h-4" />} headerDot={false}>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">📦</span>
              <span className="font-bold">لا توجد منتجات بعد</span>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5">
                      {['المنتج', 'التصنيف', 'سعر الوحدة', 'سعر الوحدة VIP', 'سعر العبوة', 'حجم العبوة', 'المخزون', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-right text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => {
                      const pp = product.product_price;
                      const isTier = product.selling_type === 'tier_based';
                      return (
                        <tr key={product.id} className={`transition-colors hover:bg-black/2 dark:hover:bg-white/2 ${idx < products.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-white text-sm whitespace-nowrap">{product.name}</p>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-[6px] ${sellingTypeColors[product.selling_type]}`}>
                                  {isTier ? `تير ${product.price_tier?.name}` : 'سعر خاص'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-slate-600 dark:text-white/60 whitespace-nowrap">{product.category.name}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isTier ? <span className="text-slate-300 dark:text-white/20 font-bold text-sm">--</span>
                              : <span className="font-black text-slate-800 dark:text-white text-sm">{pp?.price_per_unit_regular ?? '--'}</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isTier ? <span className="text-slate-300 dark:text-white/20 font-bold text-sm">--</span>
                              : <span className="font-black text-primary text-sm">{pp?.price_per_unit_vip ?? '--'}</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!pp?.full_bottle_regular
                              ? <span className="text-slate-300 dark:text-white/20 font-bold text-sm">--</span>
                              : <div className="flex flex-col items-center gap-0.5">
                                  <span className="font-black text-slate-800 dark:text-white text-sm">{pp.full_bottle_regular}</span>
                                  <span className="font-black text-primary text-xs">{pp.full_bottle_vip}</span>
                                </div>
                            }
                          </td>
                          <td className="px-4 py-3 text-center">
                            {product.original_perfume_detail
                              ? <span className="font-black text-slate-800 dark:text-white text-sm">{product.original_perfume_detail.bottle_volume} ml</span>
                              : <span className="text-slate-300 dark:text-white/20 font-bold text-sm">--</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-[6px] whitespace-nowrap ${
                              +product.stock <= +product.min_stock
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}>{product.stock}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => startEdit(product)}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-xs whitespace-nowrap">
                                <Pencil className="w-3 h-3" /> تعديل
                              </button>
                              <button onClick={() => setDeleteId(product.id)}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 font-bold text-xs whitespace-nowrap">
                                <Trash2 className="w-3 h-3" /> حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden flex flex-col gap-3">
                {products.map(product => {
                  const pp = product.product_price;
                  const isTier = product.selling_type === 'tier_based';
                  return (
                    <div key={product.id} className="flex flex-col gap-3 p-4 rounded-[20px] bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8">

                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-white truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">{product.category.name}</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-[6px] ${sellingTypeColors[product.selling_type]}`}>
                              {isTier ? `تير ${product.price_tier?.name}` : 'سعر خاص'}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-[6px] shrink-0 ${
                          +product.stock <= +product.min_stock
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>{product.stock}</span>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'سعر الوحدة',     value: isTier ? null : (pp?.price_per_unit_regular ?? null), vip: false },
                          { label: 'سعر الوحدة VIP', value: isTier ? null : (pp?.price_per_unit_vip ?? null),     vip: true  },
                          { label: 'سعر العبوة',     value: pp?.full_bottle_regular ?? null,                      vip: false },
                          { label: 'سعر العبوة VIP', value: pp?.full_bottle_vip ?? null,                          vip: true  },
                          { label: 'حجم العبوة',     value: product.original_perfume_detail ? `${product.original_perfume_detail.bottle_volume} ml` : null, vip: false },
                        ].filter(item => item.value !== null).map(({ label, value, vip }) => (
                          <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                            <span className={`font-black text-sm ${vip ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                          <Pencil className="w-3.5 h-3.5" /> تعديل
                        </button>
                        <button onClick={() => setDeleteId(product.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 font-bold text-sm">
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SpatialCard>

      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        onConfirm={() => deleteId && deleteProduct(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Edit Modal */}
      {editingId !== null && (() => {
        const product = products.find(p => p.id === editingId);
        if (!product) return null;
        return createPortal(
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setEditingId(null)} />
            <div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 rounded-[30px] border border-black/10 dark:border-white/[0.12] shadow-2xl shadow-black/10 dark:shadow-black/40"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(220,230,245,0.95) 100%)' }}
            >
              <div className="dark:hidden absolute inset-0 rounded-[30px] pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(220,230,245,0.97) 100%)' }} />
              <div className="hidden dark:block absolute inset-0 rounded-[30px] pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(25,35,80,0.98) 0%, rgba(10,14,35,0.97) 100%)' }} />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">تعديل: {product.name}</h3>
                  <button onClick={() => setEditingId(null)}
                    className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-black/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ProductForm form={editForm} categories={categories} tiers={tiers}
                  onSubmit={() => submitEdit(product.id)} onCancel={() => setEditingId(null)} />
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

    </AppShell>
  );
}
