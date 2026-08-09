import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check, Tag, AlertTriangle, Layers } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Category {
  id: number;
  name: string;
  unit: 'ml' | 'pcs' | 'g';
  is_operational: boolean;
}

interface Props {
  categories: Category[];
  flash?: { success?: string; error?: string };
}

const unitLabels = { ml: 'مليلتر', pcs: 'قطعة', g: 'غرام' };
const unitColors = {
  ml:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-2 border-blue-500/20',
  pcs: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-2 border-purple-500/20',
  g:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-2 border-amber-500/20',
};

const unitIconColors = {
  ml:  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-2 border-blue-500/20',
  pcs: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-2 border-purple-500/20',
  g:   'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-2 border-amber-500/20',
};

function DeleteCategoryModal({ category, onClose }: { category: Category; onClose: () => void }) {
  function confirm() {
    router.delete(`/categories/${category.id}`, {
      onSuccess: onClose,
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 select-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-[28px] p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
        border-2 border-red-500/30
        bg-white dark:bg-slate-900
        shadow-2xl shadow-black/40">

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
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">حذف التصنيف "{category.name}"</h3>
          <p className="text-base font-bold text-slate-500 dark:text-white/60 leading-relaxed">
            هل أنت تأكد من رغبتك في حذف هذا التصنيف؟ لا يمكن التراجع عن هذا الإجراء.
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

export default function CategoriesIndex({ categories, flash }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const form = useForm({
    name: '',
    unit: 'ml' as 'ml' | 'pcs' | 'g',
    is_operational: false,
  });

  function openCreate() {
    setEditingCategory(null);
    form.setData({ name: '', unit: 'ml', is_operational: false });
    form.clearErrors();
    setDrawerOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    form.setData({ name: cat.name, unit: cat.unit, is_operational: cat.is_operational });
    form.clearErrors();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingCategory(null);
    form.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingCategory) {
      form.put(`/categories/${editingCategory.id}`, {
        onSuccess: () => closeDrawer(),
      });
    } else {
      form.post('/categories', {
        onSuccess: () => closeDrawer(),
      });
    }
  }

  return (
    <AppShell pageTitle="التصنيفات والبنية التحتية">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0 select-none">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">إدارة التصنيفات</h1>
            <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-1">تحديد تصنيفات المنتجات ووحدات القياس والنواحي التشغيلية</p>
          </div>
          <button
            onClick={openCreate}
            className="spatial-button h-16 px-8 rounded-[22px] font-black text-lg sm:text-xl flex items-center justify-center gap-3 bg-primary text-white shadow-xl shadow-primary/25 active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" />
            إضافة تصنيف جديد
          </button>
        </div>

        {/* Flash Notifications */}
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

        {/* Main Category List */}
        <SpatialCard title={`قائمة التصنيفات المعتمدة (${categories.length})`} icon={<Layers className="w-6 h-6 text-primary" />}>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
              <span className="text-6xl">📂</span>
              <span className="font-black text-xl">لا توجد تصنيفات معرفة حتى الآن</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[24px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/8 hover:border-primary/30 transition-all shadow-sm">
                  
                  {/* Category Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 shadow-sm ${unitIconColors[cat.unit]}`}>
                      <span className="font-black text-lg uppercase">{cat.unit}</span>
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-black text-2xl sm:text-3xl text-slate-800 dark:text-white truncate">{cat.name}</span>
                        {cat.is_operational && (
                          <span className="text-sm font-black px-3.5 py-1 rounded-[14px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/20 shrink-0">
                            تشغيلي
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">وحدة القياس:</span>
                        <span className={`text-xs sm:text-sm font-black px-3 py-0.5 rounded-[12px] ${unitColors[cat.unit]}`}>
                          {unitLabels[cat.unit]} ({cat.unit})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 sm:shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => openEdit(cat)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 sm:px-9 h-16 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg sm:text-xl active:scale-95 shadow-md"
                    >
                      <Pencil className="w-6 h-6" />
                      تعديل
                    </button>

                    <button
                      onClick={() => setDeleteTarget(cat)}
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

      {/* Category Create / Edit Drawer Portal (Opens from the right) */}
      {drawerOpen && createPortal(
        <div className="fixed inset-0 z-[1000] select-none">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={closeDrawer} />
          
          {/* Right Drawer Panel */}
          <div className="absolute top-0 right-0 w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-300 border-l-2 border-black/10 dark:border-white/10 z-10" dir="rtl">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-[20px] bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <Tag className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                  {editingCategory ? `تعديل تصنيف "${editingCategory.name}"` : 'إضافة تصنيف جديد'}
                </h2>
              </div>
              <button onClick={closeDrawer}
                className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all active:scale-90 border border-black/5 dark:border-white/10">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
              
              {/* Category Name */}
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2.5">اسم التصنيف *</label>
                <input
                  type="text"
                  value={form.data.name}
                  onChange={e => form.setData('name', e.target.value)}
                  placeholder="مثال: عطور زيتية، زجاجات..."
                  className="spatial-input w-full h-18 sm:h-20 rounded-[22px] px-6 text-2xl font-black text-slate-800 dark:text-white border-2"
                  autoFocus
                />
                {form.errors.name && <p className="text-xs text-red-500 font-bold mt-1.5">{form.errors.name}</p>}
              </div>

              {/* Unit Select */}
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2.5">وحدة القياس *</label>
                <ModernSelect
                  label=""
                  options={[
                    { label: 'مليلتر (ml)', badge: 'ml' },
                    { label: 'قطعة (pcs)',  badge: 'pcs' },
                    { label: 'غرام (g)',    badge: 'g' },
                  ]}
                  defaultValue={form.data.unit === 'ml' ? 'مليلتر (ml)' : form.data.unit === 'pcs' ? 'قطعة (pcs)' : 'غرام (g)'}
                  onSelect={val => {
                    const map: Record<string, 'ml'|'pcs'|'g'> = { 'مليلتر (ml)': 'ml', 'قطعة (pcs)': 'pcs', 'غرام (g)': 'g' };
                    form.setData('unit', map[val]);
                  }}
                />
                {form.errors.unit && <p className="text-xs text-red-500 font-bold mt-1.5">{form.errors.unit}</p>}
              </div>

              {/* Large Operational Toggle Component */}
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2.5">الحالة التشغيلية</label>
                <div
                  onClick={() => form.setData('is_operational', !form.data.is_operational)}
                  className="flex items-center justify-between cursor-pointer select-none p-6 rounded-[24px] bg-black/3 dark:bg-white/3 border-2 border-black/8 dark:border-white/10 hover:border-primary/30 transition-all shadow-sm"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-slate-800 dark:text-white text-xl sm:text-2xl">تصنيف تشغيلي</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-white/40">تحديد ما إذا كان التصنيف يدخل في العمليات التشغيلية</span>
                  </div>
                  {/* Extra Large Ergonomic Toggle */}
                  <div
                    className={`w-20 h-11 rounded-full transition-colors duration-300 flex items-center px-1.5 shrink-0 shadow-inner ${
                      form.data.is_operational ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      form.data.is_operational ? '-translate-x-9' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Large Touch Action Buttons */}
              <div className="flex flex-col gap-3.5 mt-auto pt-6 border-t border-black/5 dark:border-white/5">
                <button
                  type="submit"
                  disabled={form.processing}
                  className="w-full h-18 sm:h-20 rounded-[24px] bg-primary text-white font-black text-xl sm:text-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/25 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-7 h-7" />
                  {form.processing ? 'جاري الحفظ...' : editingCategory ? 'تعديل التصنيف' : 'حفظ التصنيف جديد'}
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

      {/* Delete Confirmation Modal Portal */}
      {deleteTarget && (
        <DeleteCategoryModal category={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}

    </AppShell>
  );
}
