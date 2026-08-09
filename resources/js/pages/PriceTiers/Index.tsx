import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Pencil, Trash2, X, Check, Tags, Save, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Size { id: number; label: string; value: string; }
interface TierPrice { id: number; size_id: number; price_regular: string; price_vip: string; size: Size; }
interface Tier { id: number; name: string; description: string | null; tier_prices: TierPrice[]; }

interface Props {
  tiers: Tier[];
  sizes: Size[];
  flash?: { success?: string; error?: string };
}

const tierColors: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30',
  B: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-2 border-blue-500/30',
  C: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-2 border-purple-500/30',
};
const defaultColor = 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-2 border-slate-500/30';

function fmt(val: string | null | undefined): string {
  if (!val) return '—';
  const n = parseFloat(val);
  return Number.isInteger(n) ? String(n) : n.toString();
}

function DeleteTierModal({ tier, onClose }: { tier: Tier; onClose: () => void }) {
  function confirm() {
    router.delete(`/price-tiers/${tier.id}`, { onSuccess: onClose });
  }
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 select-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-[28px] p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
        border-2 border-red-500/30 bg-white dark:bg-slate-900 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <div className="w-16 h-16 rounded-[22px] bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">حذف تير "{tier.name}"</h3>
          <p className="text-base font-bold text-slate-500 dark:text-white/60 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف هذا التير وجميع أسعاره؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={onClose} className="flex-1 h-16 rounded-[20px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 font-black text-lg transition-all hover:bg-black/10 active:scale-95">
            إلغاء
          </button>
          <button onClick={confirm} className="flex-1 h-16 rounded-[20px] bg-red-500 hover:bg-red-600 text-white font-black text-lg transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-95">
            <Trash2 className="w-6 h-6" /> تأكيد الحذف
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PriceTiersIndex({ tiers, sizes, flash }: Props) {
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [editingTier, setEditingTier]     = useState<Tier | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Tier | null>(null);

  // Prices drawer
  const [pricesDrawerOpen, setPricesDrawerOpen] = useState(false);
  const [pricingTier, setPricingTier]           = useState<Tier | null>(null);
  const [pricesData, setPricesData]             = useState<Record<number, { price_regular: string; price_vip: string }>>({});

  // NumberPad
  const [padField, setPadField] = useState<{ sizeId: number; field: 'price_regular' | 'price_vip' } | null>(null);

  const form = useForm({ name: '', description: '' });

  function openCreate() {
    setEditingTier(null);
    form.setData({ name: '', description: '' });
    form.clearErrors();
    setDrawerOpen(true);
  }

  function openEdit(tier: Tier) {
    setEditingTier(tier);
    form.setData({ name: tier.name, description: tier.description ?? '' });
    form.clearErrors();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingTier(null);
    form.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingTier) {
      form.put(`/price-tiers/${editingTier.id}`, { onSuccess: closeDrawer });
    } else {
      form.post('/price-tiers', { onSuccess: closeDrawer });
    }
  }

  function openPricesDrawer(tier: Tier) {
    setPricingTier(tier);
    const init: Record<number, { price_regular: string; price_vip: string }> = {};
    sizes.forEach(size => {
      const existing = tier.tier_prices.find(p => p.size_id === size.id);
      init[size.id] = {
        price_regular: existing?.price_regular ?? '',
        price_vip:     existing?.price_vip ?? '',
      };
    });
    setPricesData(init);
    setPricesDrawerOpen(true);
  }

  function closePricesDrawer() {
    setPricesDrawerOpen(false);
    setPricingTier(null);
  }

  function submitPrices() {
    if (!pricingTier) return;
    const prices = sizes.map(size => ({
      size_id:       size.id,
      price_regular: pricesData[size.id]?.price_regular || null,
      price_vip:     pricesData[size.id]?.price_vip || null,
    }));
    router.put(`/price-tiers/${pricingTier.id}/prices`, { prices }, {
      onSuccess: closePricesDrawer,
    });
  }

  return (
    <AppShell pageTitle="التيرات والأسعار">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0 select-none">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">التيرات والأسعار</h1>
            <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-1">مستويات جودة العطور الزيتية مع أسعارها بالدينار</p>
          </div>
          <button
            onClick={openCreate}
            className="spatial-button h-20 sm:h-22 px-10 sm:px-12 rounded-[24px] font-black text-2xl sm:text-3xl flex items-center justify-center gap-3.5 bg-primary text-white shadow-2xl shadow-primary/30 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-9 h-9" />
            إضافة تير جديد
          </button>
        </div>

        {/* Flash */}
        {flash?.success && (
          <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg">
            {flash.success}
          </div>
        )}
        {flash?.error && (
          <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg">
            {flash.error}
          </div>
        )}

        {/* Tiers List */}
        {tiers.length === 0 ? (
          <SpatialCard title="التيرات (0)" icon={<Tags className="w-6 h-6 text-primary" />}>
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
              <span className="text-6xl">🏷️</span>
              <span className="font-black text-xl">لا توجد تيرات معرفة حتى الآن</span>
            </div>
          </SpatialCard>
        ) : (
          tiers.map(tier => (
            <SpatialCard key={tier.id} title="" hideHeader className="overflow-hidden">

              {/* Tier Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center shrink-0 shadow-md ${tierColors[tier.name] ?? defaultColor}`}>
                  <span className="font-black text-3xl sm:text-4xl">{tier.name}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-black text-3xl sm:text-4xl text-slate-800 dark:text-white">تير {tier.name}</span>
                  {tier.description && <p className="text-base font-bold text-slate-400 dark:text-white/50 mt-1">{tier.description}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => openEdit(tier)}
                    className="flex items-center justify-center gap-2.5 px-6 h-16 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg active:scale-95 shadow-sm"
                  >
                    <Pencil className="w-6 h-6" />
                    <span className="hidden sm:inline">تعديل</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(tier)}
                    className="flex items-center justify-center gap-2.5 px-6 h-16 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-lg active:scale-95 shadow-sm"
                  >
                    <Trash2 className="w-6 h-6" />
                    <span className="hidden sm:inline">حذف</span>
                  </button>
                </div>
              </div>

              {/* High-Contrast Large Numbers Table with Dinar */}
              <div className="rounded-[24px] overflow-hidden border-2 border-black/8 dark:border-white/10 shadow-sm">
                <div className="grid grid-cols-3 bg-black/5 dark:bg-white/5 px-6 py-4 border-b-2 border-black/5 dark:border-white/5">
                  <span className="text-sm sm:text-base font-black text-slate-600 dark:text-white/50 uppercase tracking-wider">الحجم</span>
                  <span className="text-sm sm:text-base font-black text-slate-600 dark:text-white/50 uppercase tracking-wider text-center">السعر العادي</span>
                  <span className="text-sm sm:text-base font-black text-primary uppercase tracking-wider text-center">سعر VIP</span>
                </div>
                {sizes.length === 0 ? (
                  <div className="px-6 py-10 text-center font-black text-slate-400 dark:text-white/30 text-lg">
                    أضف أحجاماً أولاً من صفحة الأحجام
                  </div>
                ) : (
                  <div className="divide-y-2 divide-black/5 dark:divide-white/5">
                    {sizes.map(size => {
                      const existing = tier.tier_prices.find(p => p.size_id === size.id);
                      return (
                        <div key={size.id} className="grid grid-cols-3 items-center px-6 py-5 hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                          <span className="font-black text-slate-800 dark:text-white text-xl sm:text-2xl">{size.label}</span>
                          <span className="text-center font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">
                            {existing?.price_regular ? (
                              <span className="flex items-center justify-center gap-1.5">
                                {fmt(existing.price_regular)} <span className="text-sm text-slate-400 dark:text-white/40 font-bold">دينار</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-white/20">—</span>
                            )}
                          </span>
                          <span className="text-center font-black text-primary text-2xl sm:text-3xl">
                            {existing?.price_vip ? (
                              <span className="flex items-center justify-center gap-1.5">
                                {fmt(existing.price_vip)} <span className="text-sm text-primary/70 font-bold">دينار</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-white/20">—</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Large Ergonomic Edit Prices Action Button */}
              <div className="mt-6">
                <button
                  onClick={() => openPricesDrawer(tier)}
                  className="w-full h-20 rounded-[24px] border-2 border-primary/30 bg-primary text-white hover:bg-primary/90 transition-all font-black text-2xl sm:text-3xl flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/25"
                >
                  <Pencil className="w-8 h-8" /> تعديل الأسعار بالأرقام
                </button>
              </div>

            </SpatialCard>
          ))
        )}

      </div>

      {/* Tier Create / Edit Drawer */}
      {drawerOpen && createPortal(
        <div className="fixed inset-0 z-[1000] select-none">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={closeDrawer} />
          <div className="absolute top-0 right-0 w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-300 border-l-2 border-black/10 dark:border-white/10 z-10" dir="rtl">

            <div className="flex items-center justify-between pb-5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-[20px] bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <Tags className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                  {editingTier ? `تعديل تير "${editingTier.name}"` : 'إضافة تير جديد'}
                </h2>
              </div>
              <button onClick={closeDrawer} className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all active:scale-90 border border-black/5 dark:border-white/10">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2.5">اسم التير *</label>
                <input
                  type="text"
                  value={form.data.name}
                  onChange={e => form.setData('name', e.target.value)}
                  placeholder="مثال: A، B، C..."
                  className="spatial-input w-full h-18 sm:h-20 rounded-[22px] px-6 text-2xl font-black text-slate-800 dark:text-white border-2"
                  autoFocus
                />
                {form.errors.name && <p className="text-xs text-red-500 font-bold mt-1.5">{form.errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2.5">الوصف</label>
                <input
                  type="text"
                  value={form.data.description}
                  onChange={e => form.setData('description', e.target.value)}
                  placeholder="مثال: اقتصادي، فاخر..."
                  className="spatial-input w-full h-18 sm:h-20 rounded-[22px] px-6 text-2xl font-black text-slate-800 dark:text-white border-2"
                />
                {form.errors.description && <p className="text-xs text-red-500 font-bold mt-1.5">{form.errors.description}</p>}
              </div>

              <div className="flex flex-col gap-3.5 mt-auto pt-6 border-t border-black/5 dark:border-white/5">
                <button
                  type="submit"
                  disabled={form.processing}
                  className="w-full h-18 sm:h-20 rounded-[24px] bg-primary text-white font-black text-xl sm:text-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/25 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-7 h-7" />
                  {form.processing ? 'جاري الحفظ...' : editingTier ? 'تعديل التير' : 'حفظ التير الجديد'}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="w-full h-16 sm:h-18 rounded-[22px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 font-black text-lg sm:text-xl hover:bg-black/10 transition-all flex items-center justify-center active:scale-95 border border-black/5 dark:border-white/5"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Prices Edit Drawer - Ultra-wide Layout displaying 3 sizes per row */}
      {pricesDrawerOpen && pricingTier && createPortal(
        <div className="fixed inset-0 z-[1000] select-none">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={closePricesDrawer} />
          <div className="absolute top-0 right-0 w-full md:w-[92vw] max-w-7xl h-full bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-300 border-l-2 border-black/10 dark:border-white/10 z-10" dir="rtl">

            <div className="flex items-center justify-between pb-5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className={`w-16 h-16 rounded-[22px] border-2 flex items-center justify-center shrink-0 shadow-sm ${tierColors[pricingTier.name] ?? defaultColor}`}>
                  <span className="font-black text-2xl">{pricingTier.name}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                  أسعار تير {pricingTier.name} (بالدينار)
                </h2>
              </div>
              <button onClick={closePricesDrawer} className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all active:scale-90 border border-black/5 dark:border-white/10">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 3 Sizes per row Grid */}
            <div className="flex-1">
              {sizes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                  <span className="text-4xl">📏</span>
                  <span className="font-black text-lg">أضف أحجاماً أولاً من صفحة الأحجام</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sizes.map(size => (
                    <div key={size.id} className="flex flex-col gap-3.5 p-5 rounded-[26px] bg-slate-50 dark:bg-slate-800/60 border-2 border-black/10 dark:border-white/20 hover:border-primary/40 transition-all shadow-md">
                      <div className="flex items-center gap-3 pb-2 border-b border-black/5 dark:border-white/10">
                        <div className="w-14 h-14 rounded-[18px] bg-blue-500/15 text-blue-600 dark:text-blue-400 border-2 border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="font-black text-base uppercase">ml</span>
                        </div>
                        <span className="font-black text-2xl text-slate-800 dark:text-white">{size.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Regular Price */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-black text-slate-500 dark:text-white/60 uppercase tracking-widest">السعر العادي</label>
                          <button
                            type="button"
                            onClick={() => setPadField({ sizeId: size.id, field: 'price_regular' })}
                            className="h-20 rounded-[22px] bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 hover:border-primary/60 flex items-center justify-between px-4 transition-all active:scale-[0.98] shadow-sm"
                          >
                            <span className={`font-black text-2xl sm:text-3xl ${pricesData[size.id]?.price_regular ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/30'}`}>
                              {pricesData[size.id]?.price_regular || '—'}
                            </span>
                            <span className="text-xs font-black text-slate-400 dark:text-white/50">دينار</span>
                          </button>
                        </div>
                        {/* VIP Price */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-black text-primary uppercase tracking-widest">سعر VIP</label>
                          <button
                            type="button"
                            onClick={() => setPadField({ sizeId: size.id, field: 'price_vip' })}
                            className="h-20 rounded-[22px] bg-white dark:bg-slate-900 border-2 border-primary/40 dark:border-primary/60 hover:border-primary flex items-center justify-between px-4 transition-all active:scale-[0.98] shadow-sm"
                          >
                            <span className={`font-black text-2xl sm:text-3xl ${pricesData[size.id]?.price_vip ? 'text-primary' : 'text-slate-300 dark:text-white/30'}`}>
                              {pricesData[size.id]?.price_vip || '—'}
                            </span>
                            <span className="text-xs font-black text-primary/80">دينار</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-6 border-t border-black/5 dark:border-white/5">
              <button
                onClick={submitPrices}
                className="flex-1 h-18 sm:h-20 rounded-[24px] bg-emerald-600 text-white font-black text-xl sm:text-2xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/25 active:scale-95"
              >
                <Save className="w-7 h-7" /> حفظ الأسعار
              </button>
              <button
                onClick={closePricesDrawer}
                className="sm:w-48 h-18 sm:h-20 rounded-[22px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 font-black text-lg sm:text-xl hover:bg-black/10 transition-all flex items-center justify-center active:scale-95 border border-black/5 dark:border-white/5"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteTierModal tier={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}

      {/* NumberPad for prices */}
      {padField && (
        <NumberPadModal
          isOpen={!!padField}
          title={padField.field === 'price_regular' ? `سعر عادي — ${sizes.find(s => s.id === padField.sizeId)?.label}` : `سعر VIP — ${sizes.find(s => s.id === padField.sizeId)?.label}`}
          initialValue={pricesData[padField.sizeId]?.[padField.field] ?? ''}
          onConfirm={val => {
            setPricesData(prev => ({
              ...prev,
              [padField.sizeId]: { ...prev[padField.sizeId], [padField.field]: val },
            }));
            setPadField(null);
          }}
          onClose={() => setPadField(null)}
        />
      )}

    </AppShell>
  );
}
