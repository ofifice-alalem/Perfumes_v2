import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Plus, Pencil, Trash2, X, Check, Tags, Save } from 'lucide-react';

interface Size { id: number; label: string; value: string; }
interface TierPrice { id: number; size_id: number; price_regular: string; price_vip: string; size: Size; }
interface Tier { id: number; name: string; description: string | null; tier_prices: TierPrice[]; }

interface Props {
  tiers: Tier[];
  sizes: Size[];
  flash?: { success?: string; error?: string };
}

const tierColors: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  B: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
  C: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
};
const defaultColor = 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20';

export default function PriceTiersIndex({ tiers, sizes, flash }: Props) {
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [editingPricesId, setEditingPricesId] = useState<number | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [pricesData, setPricesData]     = useState<Record<number, { price_regular: string; price_vip: string }>>({});

  const createForm = useForm({ name: '', description: '' });
  const editForm   = useForm({ name: '', description: '' });

  function startEdit(tier: Tier) {
    setEditingId(tier.id);
    editForm.setData({ name: tier.name, description: tier.description ?? '' });
  }

  function startEditPrices(tier: Tier) {
    setEditingPricesId(tier.id);
    const init: Record<number, { price_regular: string; price_vip: string }> = {};
    sizes.forEach(size => {
      const existing = tier.tier_prices.find(p => p.size_id === size.id);
      init[size.id] = {
        price_regular: existing?.price_regular ?? '',
        price_vip:     existing?.price_vip ?? '',
      };
    });
    setPricesData(init);
  }

  function submitCreate() {
    createForm.post('/price-tiers', {
      onSuccess: () => { createForm.reset(); setShowCreate(false); },
    });
  }

  function submitEdit(id: number) {
    editForm.put(`/price-tiers/${id}`, {
      onSuccess: () => setEditingId(null),
    });
  }

  function submitPrices(id: number) {
    const prices = sizes.map(size => ({
      size_id:       size.id,
      price_regular: pricesData[size.id]?.price_regular ?? '0',
      price_vip:     pricesData[size.id]?.price_vip ?? '0',
    }));
    router.put(`/price-tiers/${id}/prices`, { prices }, {
      onSuccess: () => setEditingPricesId(null),
    });
  }

  function deleteTier(id: number) {
    router.delete(`/price-tiers/${id}`);
  }

  return (
    <AppShell pageTitle="Step 2 — البنية التحتية">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">التيرات والأسعار</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">مستويات جودة العطور الزيتية مع أسعارها</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> إضافة تير
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
          <SpatialCard title="تير جديد" icon={<Plus className="w-4 h-4" />}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2 w-full sm:w-32">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم</label>
                <input value={createForm.data.name} onChange={e => createForm.setData('name', e.target.value)}
                  placeholder="A" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                {createForm.errors.name && <p className="text-xs text-red-500 font-bold">{createForm.errors.name}</p>}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الوصف</label>
                <input value={createForm.data.description} onChange={e => createForm.setData('description', e.target.value)}
                  placeholder="مثال: اقتصادي" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={submitCreate} disabled={createForm.processing} className="spatial-button flex items-center gap-2 px-5 h-12 text-sm">
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                  className="h-12 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </SpatialCard>
        )}

        {/* Tiers */}
        {tiers.length === 0 ? (
          <SpatialCard title="التيرات (0)" icon={<Tags className="w-4 h-4" />} headerDot={false}>
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">🏷️</span>
              <span className="font-bold">لا توجد تيرات بعد</span>
            </div>
          </SpatialCard>
        ) : (
          tiers.map(tier => (
            <SpatialCard key={tier.id}
              title=""
              hideHeader
              className="overflow-hidden"
            >
              {/* Tier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-12 h-12 rounded-[16px] border flex items-center justify-center shrink-0 ${tierColors[tier.name] ?? defaultColor}`}>
                    <span className="font-black text-lg">{tier.name}</span>
                  </div>
                  {editingId === tier.id ? (
                    <div className="flex gap-2 flex-1">
                      <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)}
                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold w-20" />
                      <input value={editForm.data.description} onChange={e => editForm.setData('description', e.target.value)}
                        placeholder="الوصف" className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold flex-1" />
                      <button onClick={() => submitEdit(tier.id)}
                        className="w-10 h-10 rounded-[12px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shrink-0">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="w-10 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-500 flex items-center justify-center hover:bg-black/10 transition-all shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="font-black text-slate-800 dark:text-white text-lg">تير {tier.name}</span>
                      {tier.description && <p className="text-sm font-bold text-slate-400 dark:text-white/40">{tier.description}</p>}
                    </div>
                  )}
                </div>

                {editingId !== tier.id && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(tier)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                      <Pencil className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <DeleteModal
                      onConfirm={() => deleteTier(tier.id)}
                      trigger={
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 font-bold text-sm">
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </button>
                      }
                    />
                  </div>
                )}
              </div>

              {/* Prices Table */}
              <div className="border border-black/5 dark:border-white/5 rounded-[20px] overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-3 bg-black/3 dark:bg-white/3 px-4 py-2.5">
                  <span className="text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">الحجم</span>
                  <span className="text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest text-center">عادي</span>
                  <span className="text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest text-center">VIP</span>
                </div>

                {sizes.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm font-bold text-slate-400 dark:text-white/30">
                    أضف أحجاماً أولاً من صفحة الأحجام
                  </div>
                ) : (
                  sizes.map((size, idx) => {
                    const existing = tier.tier_prices.find(p => p.size_id === size.id);
                    return (
                      <div key={size.id} className={`grid grid-cols-3 items-center px-4 py-3 ${idx < sizes.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{size.label}</span>

                        {editingPricesId === tier.id ? (
                          <>
                            <div className="px-2">
                              <input type="number" min="0" step="0.01"
                                value={pricesData[size.id]?.price_regular ?? ''}
                                onChange={e => setPricesData(prev => ({ ...prev, [size.id]: { ...prev[size.id], price_regular: e.target.value } }))}
                                className="spatial-input h-9 rounded-[10px] px-3 text-[13px] font-bold w-full text-center"
                              />
                            </div>
                            <div className="px-2">
                              <input type="number" min="0" step="0.01"
                                value={pricesData[size.id]?.price_vip ?? ''}
                                onChange={e => setPricesData(prev => ({ ...prev, [size.id]: { ...prev[size.id], price_vip: e.target.value } }))}
                                className="spatial-input h-9 rounded-[10px] px-3 text-[13px] font-bold w-full text-center"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-center font-black text-slate-800 dark:text-white text-sm">
                              {existing ? existing.price_regular : <span className="text-slate-300 dark:text-white/20">—</span>}
                            </span>
                            <span className="text-center font-black text-primary text-sm">
                              {existing ? existing.price_vip : <span className="text-slate-300 dark:text-white/20">—</span>}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Prices Actions */}
              <div className="mt-4 flex items-center gap-2">
                {editingPricesId === tier.id ? (
                  <>
                    <button onClick={() => submitPrices(tier.id)}
                      className="flex items-center gap-1.5 px-5 h-10 rounded-[14px] bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-bold text-sm">
                      <Save className="w-4 h-4" /> حفظ الأسعار
                    </button>
                    <button onClick={() => setEditingPricesId(null)}
                      className="flex items-center gap-1.5 px-4 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all font-bold text-sm">
                      <X className="w-4 h-4" /> إلغاء
                    </button>
                  </>
                ) : (
                  <button onClick={() => startEditPrices(tier)}
                    className="flex items-center gap-1.5 px-5 h-10 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                    <Pencil className="w-3.5 h-3.5" /> تعديل الأسعار
                  </button>
                )}
              </div>

            </SpatialCard>
          ))
        )}

      </div>
    </AppShell>
  );
}
