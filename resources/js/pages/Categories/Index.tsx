import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Category {
  id: number;
  name: string;
  unit: 'ml' | 'pcs' | 'g';
  is_operational: boolean;
  products_count: number;
}

interface Props {
  categories: Category[];
  flash?: { success?: string; error?: string };
}

const unitLabels = { ml: 'مليلتر', pcs: 'قطعة', g: 'غرام' };
const unitColors = {
  ml:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  pcs: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  g:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
};

const unitIconColors = {
  ml:  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  pcs: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  g:   'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

export default function CategoriesIndex({ categories, flash }: Props) {
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);

  const createForm = useForm({ name: '', unit: 'ml' as 'ml' | 'pcs' | 'g', is_operational: false });
  const editForm   = useForm({ name: '', unit: 'ml' as 'ml' | 'pcs' | 'g', is_operational: false });

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    editForm.setData({ name: cat.name, unit: cat.unit, is_operational: cat.is_operational });
  }

  function submitCreate() {
    createForm.post('/categories', {
      onSuccess: () => { createForm.reset(); setShowCreate(false); },
    });
  }

  function submitEdit(id: number) {
    editForm.put(`/categories/${id}`, {
      onSuccess: () => setEditingId(null),
    });
  }

  function deleteCategory(id: number) {
    router.delete(`/categories/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  return (
    <AppShell pageTitle="Step 2 — البنية التحتية">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">التصنيفات</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="spatial-button flex items-center gap-2 px-5 h-11 text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة تصنيف
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
          <SpatialCard title="تصنيف جديد" icon={<Plus className="w-4 h-4" />}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم</label>
                <input
                  value={createForm.data.name}
                  onChange={e => createForm.setData('name', e.target.value)}
                  placeholder="مثال: عطور زيتية"
                  className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                />
                {createForm.errors.name && <p className="text-xs text-red-500 font-bold">{createForm.errors.name}</p>}
              </div>

              <div className="w-full sm:w-56">
                <ModernSelect
                  label="وحدة القياس"
                  options={[
                    { label: 'مليلتر (ml)', badge: 'ml' },
                    { label: 'قطعة (pcs)',  badge: 'pcs' },
                    { label: 'غرام (g)',    badge: 'g' },
                  ]}
                  defaultValue={createForm.data.unit === 'ml' ? 'مليلتر (ml)' : createForm.data.unit === 'pcs' ? 'قطعة (pcs)' : 'غرام (g)'}
                  onSelect={val => {
                    const map: Record<string, 'ml'|'pcs'|'g'> = { 'مليلتر (ml)': 'ml', 'قطعة (pcs)': 'pcs', 'غرام (g)': 'g' };
                    createForm.setData('unit', map[val]);
                  }}
                />
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => createForm.setData('is_operational', !createForm.data.is_operational)}
                    className={`w-11 h-6 rounded-full transition-all duration-200 relative cursor-pointer ${
                      createForm.data.is_operational ? 'bg-amber-500' : 'bg-black/10 dark:bg-white/10'
                    }`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                      createForm.data.is_operational ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-white/60">تشغيلي</span>
                </label>
              </div>

              <div className="flex items-end gap-2">
                <button onClick={submitCreate} disabled={createForm.processing}
                  className="spatial-button flex items-center gap-2 px-5 h-12 text-sm"
                >
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                  className="h-12 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </SpatialCard>
        )}

        {/* List */}
        <SpatialCard title={`التصنيفات (${categories.length})`}>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">📂</span>
              <span className="font-bold">لا توجد تصنيفات بعد</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">

                  {editingId === cat.id ? (
                    <div className="flex flex-col gap-3 flex-1">
                      <input
                        value={editForm.data.name}
                        onChange={e => editForm.setData('name', e.target.value)}
                        className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold w-full"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ModernSelect
                            label=""
                            options={[
                              { label: 'مليلتر (ml)', badge: 'ml' },
                              { label: 'قطعة (pcs)',  badge: 'pcs' },
                              { label: 'غرام (g)',    badge: 'g' },
                            ]}
                            defaultValue={editForm.data.unit === 'ml' ? 'مليلتر (ml)' : editForm.data.unit === 'pcs' ? 'قطعة (pcs)' : 'غرام (g)'}
                            onSelect={val => {
                              const map: Record<string, 'ml'|'pcs'|'g'> = { 'مليلتر (ml)': 'ml', 'قطعة (pcs)': 'pcs', 'غرام (g)': 'g' };
                              editForm.setData('unit', map[val]);
                            }}
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                          <div onClick={() => editForm.setData('is_operational', !editForm.data.is_operational)}
                            className={`w-11 h-6 rounded-full transition-all duration-200 relative cursor-pointer ${
                              editForm.data.is_operational ? 'bg-amber-500' : 'bg-black/10 dark:bg-white/10'
                            }`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                              editForm.data.is_operational ? 'right-0.5' : 'left-0.5'
                            }`} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-white/60">تشغيلي</span>
                        </label>
                        <button onClick={() => submitEdit(cat.id)}
                          className="w-11 h-11 rounded-[12px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="w-11 h-11 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 flex items-center justify-center hover:bg-black/10 transition-all shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${unitIconColors[cat.unit]}`}>
                          <span className="font-black text-xs">{cat.unit}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-white truncate">{cat.name}</span>
                            {cat.is_operational && (
                              <span className="text-xs font-black px-2 py-0.5 rounded-[6px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">تشغيلي</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-[6px] self-start ${unitColors[cat.unit]}`}>{unitLabels[cat.unit]}</span>
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">{cat.products_count} منتج</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <button onClick={() => startEdit(cat)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button onClick={() => setDeleteId(cat.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 font-bold text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف
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

      <ConfirmModal
        isOpen={deleteId !== null}
        onConfirm={() => deleteId && deleteCategory(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

    </AppShell>
  );
}
