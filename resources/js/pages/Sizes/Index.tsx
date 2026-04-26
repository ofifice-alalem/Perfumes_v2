import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check, Ruler } from 'lucide-react';

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

export default function SizesIndex({ sizes, flash }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const createForm = useForm({ label: '', value: '' });
  const editForm   = useForm({ label: '', value: '' });

  function startEdit(size: Size) {
    setEditingId(size.id);
    editForm.setData({ label: size.label, value: size.value });
  }

  function submitCreate() {
    createForm.post('/sizes', {
      onSuccess: () => { createForm.reset(); setShowCreate(false); },
    });
  }

  function submitEdit(id: number) {
    editForm.put(`/sizes/${id}`, {
      onSuccess: () => setEditingId(null),
    });
  }

  function deleteSize(id: number) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    router.delete(`/sizes/${id}`);
  }

  return (
    <AppShell pageTitle="Step 2 — البنية التحتية">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">أحجام التقسيم</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">أحجام البيع بالمليلتر للعطور الزيتية والأصلية</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> إضافة حجم
          </button>
        </div>

        {/* Flash */}
        {flash?.success && (
          <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            {flash.success}
          </div>
        )}
        {flash?.error && (
          <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">
            {flash.error}
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <SpatialCard title="حجم جديد" icon={<Plus className="w-4 h-4" />}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">التسمية</label>
                <input
                  value={createForm.data.label}
                  onChange={e => createForm.setData('label', e.target.value)}
                  placeholder="مثال: 5ml"
                  className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                />
                {createForm.errors.label && <p className="text-xs text-red-500 font-bold">{createForm.errors.label}</p>}
              </div>

              <div className="flex flex-col gap-2 w-full sm:w-44">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">القيمة (ml)</label>
                <input
                  type="number"
                  value={createForm.data.value}
                  onChange={e => createForm.setData('value', e.target.value)}
                  placeholder="5"
                  min="0.01"
                  step="0.01"
                  className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                />
                {createForm.errors.value && <p className="text-xs text-red-500 font-bold">{createForm.errors.value}</p>}
              </div>

              <div className="flex items-end gap-2">
                <button onClick={submitCreate} disabled={createForm.processing} className="spatial-button flex items-center gap-2 px-5 h-12 text-sm">
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                  className="h-12 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </SpatialCard>
        )}

        {/* List */}
        <SpatialCard
          title={`أحجام التقسيم (${sizes.length})`}
          icon={<Ruler className="w-4 h-4" />}
          headerDot={false}
        >
          {sizes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">📏</span>
              <span className="font-bold">لا توجد أحجام بعد</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sizes.map(size => (
                <div key={size.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">

                  {editingId === size.id ? (
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex gap-3">
                        <input
                          value={editForm.data.label}
                          onChange={e => editForm.setData('label', e.target.value)}
                          placeholder="التسمية"
                          className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold flex-1"
                        />
                        <input
                          type="number"
                          value={editForm.data.value}
                          onChange={e => editForm.setData('value', e.target.value)}
                          placeholder="القيمة"
                          className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold w-28"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => submitEdit(size.id)}
                          className="flex items-center gap-1.5 px-4 h-10 rounded-[12px] bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-bold text-sm"
                        >
                          <Check className="w-4 h-4" /> حفظ
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex items-center gap-1.5 px-4 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all font-bold text-sm"
                        >
                          <X className="w-4 h-4" /> إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <span className="font-black text-xs">ml</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-800 dark:text-white">{size.label}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">{size.value} مليلتر</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <button onClick={() => startEdit(size)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" /> تعديل
                        </button>
                        <button onClick={() => deleteSize(size.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 font-bold text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> حذف
                        </button>
                      </div>
                    </>
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
