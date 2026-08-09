import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Pencil, Trash2, X, Check, Ruler, AlertTriangle, Hash } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Size {
  id: number;
  label: string;
  value: string;
  unit: 'ml';
}

interface Props {
  sizes: Size[];
  flash?: { success?: string; error?: string };
}

function DeleteSizeModal({ size, onClose }: { size: Size; onClose: () => void }) {
  function confirm() {
    router.delete(`/sizes/${size.id}`, { onSuccess: onClose });
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
          <button onClick={onClose}
            className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">حذف الحجم "{size.label}"</h3>
          <p className="text-base font-bold text-slate-500 dark:text-white/60 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف هذا الحجم؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 h-16 rounded-[20px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 font-black text-lg transition-all hover:bg-black/10 active:scale-95">
            إلغاء
          </button>
          <button onClick={confirm}
            className="flex-1 h-16 rounded-[20px] bg-red-500 hover:bg-red-600 text-white font-black text-lg transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-95">
            <Trash2 className="w-6 h-6" /> تأكيد الحذف
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SizesIndex({ sizes, flash }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Size | null>(null);
  const [showPad, setShowPad] = useState(false);

  const form = useForm({ label: '', value: '' });

  function openCreate() {
    setEditingSize(null);
    form.setData({ label: '', value: '' });
    form.clearErrors();
    setDrawerOpen(true);
  }

  function openEdit(size: Size) {
    setEditingSize(size);
    form.setData({ label: size.label, value: size.value });
    form.clearErrors();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingSize(null);
    form.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingSize) {
      form.put(`/sizes/${editingSize.id}`, { onSuccess: closeDrawer });
    } else {
      form.post('/sizes', { onSuccess: closeDrawer });
    }
  }

  return (
    <AppShell pageTitle="أحجام التقسيم">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0 select-none">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">أحجام التقسيم</h1>
            <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-1">أحجام البيع بالمليلتر للعطور الزيتية والأصلية</p>
          </div>
          <button
            onClick={openCreate}
            className="spatial-button h-16 px-8 rounded-[22px] font-black text-lg sm:text-xl flex items-center justify-center gap-3 bg-primary text-white shadow-xl shadow-primary/25 active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" />
            إضافة حجم جديد
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

        {/* List */}
        <SpatialCard title={`قائمة الأحجام المعتمدة (${sizes.length})`} icon={<Ruler className="w-6 h-6 text-primary" />}>
          {sizes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
              <span className="text-6xl">📏</span>
              <span className="font-black text-xl">لا توجد أحجام معرفة حتى الآن</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sizes.map(size => (
                <div key={size.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[24px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/8 hover:border-primary/30 transition-all shadow-sm">

                  {/* Size Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-[22px] bg-blue-500/15 text-blue-600 dark:text-blue-400 border-2 border-blue-500/20 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="font-black text-lg uppercase">ml</span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-black text-2xl sm:text-3xl text-slate-800 dark:text-white truncate">{size.label}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">القيمة:</span>
                        <span className="text-xs sm:text-sm font-black px-3 py-0.5 rounded-[12px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-2 border-blue-500/20">
                          {size.value} مليلتر
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 sm:shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => openEdit(size)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 sm:px-9 h-16 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg sm:text-xl active:scale-95 shadow-md"
                    >
                      <Pencil className="w-6 h-6" />
                      تعديل
                    </button>
                    <button
                      onClick={() => setDeleteTarget(size)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 sm:px-9 h-16 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-lg sm:text-xl active:scale-95 shadow-md"
                    >
                      <Trash2 className="w-6 h-6" />
                      حذف
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </SpatialCard>

      </div>

      {/* Create / Edit Drawer Portal */}
      {drawerOpen && createPortal(
        <div className="fixed inset-0 z-[1000] select-none">  
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={closeDrawer} />

          <div className="absolute top-0 right-0 w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-300 border-l-2 border-black/10 dark:border-white/10 z-10" dir="rtl">

            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-[20px] bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <Ruler className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                  {editingSize ? `تعديل حجم "${editingSize.label}"` : 'إضافة حجم جديد'}
                </h2>
              </div>
              <button onClick={closeDrawer}
                className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all active:scale-90 border border-black/5 dark:border-white/10">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">

              {/* Label */}
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2.5">التسمية *</label>
                <input
                  type="text"
                  value={form.data.label}
                  onChange={e => form.setData('label', e.target.value)}
                  placeholder="مثال: 5ml، 10ml..."
                  className="spatial-input w-full h-18 sm:h-20 rounded-[22px] px-6 text-2xl font-black text-slate-800 dark:text-white border-2"
                  autoFocus
                />
                {form.errors.label && <p className="text-xs text-red-500 font-bold mt-1.5">{form.errors.label}</p>}
              </div>

              {/* Value Input with Touch NumberPad Trigger */}
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2.5">القيمة (ml) *</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.data.value}
                      onChange={e => form.setData('value', e.target.value)}
                      placeholder="0"
                      min="0.01"
                      step="0.01"
                      className="spatial-input w-full h-20 rounded-[22px] px-6 text-3xl font-black text-slate-800 dark:text-white border-2 text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPad(true)}
                    className="h-20 px-8 rounded-[22px] bg-primary text-white font-black text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all shrink-0"
                    title="فتح لوحة الأرقام اللمسية"
                  >
                    <Hash className="w-8 h-8" /> لوحة الأرقام
                  </button>
                </div>
                {form.errors.value && <p className="text-xs text-red-500 font-bold mt-1.5">{form.errors.value}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3.5 mt-auto pt-6 border-t border-black/5 dark:border-white/5">
                <button
                  type="submit"
                  disabled={form.processing}
                  className="w-full h-18 sm:h-20 rounded-[24px] bg-primary text-white font-black text-xl sm:text-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/25 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-7 h-7" />
                  {form.processing ? 'جاري الحفظ...' : editingSize ? 'تعديل الحجم' : 'حفظ الحجم الجديد'}
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

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteSizeModal size={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}

      {/* NumberPad Modal */}
      {showPad && (
        <NumberPadModal
          isOpen={showPad}
          title="قيمة الحجم (مليلتر)"
          initialValue={form.data.value}
          onConfirm={val => {
            form.setData('value', val);
            setShowPad(false);
          }}
          onClose={() => setShowPad(false)}
        />
      )}

    </AppShell>
  );
}
