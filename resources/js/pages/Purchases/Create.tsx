import { useForm, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, ChevronLeft, Truck } from 'lucide-react';

interface Supplier { id: number; name: string; }

interface Props {
  suppliers: Supplier[];
  flash?: { success?: string; error?: string };
}

export default function PurchasesCreate({ suppliers, flash }: Props) {
  const form = useForm({
    supplier_id: '',
    notes: '',
  });

  function submit() {
    form.post('/purchases');
  }

  const supplierOptions = suppliers.map(s => ({ label: s.name, badge: '' }));

  return (
    <AppShell pageTitle="Step 6 — المشتريات والمخزون">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/purchases" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
              <ChevronLeft className="w-4 h-4" /> المشتريات
            </Link>
            <span className="text-slate-300 dark:text-white/10">/</span>
            <span className="font-black text-slate-800 dark:text-white text-sm">فاتورة جديدة</span>
          </div>
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
        <SpatialCard title="فاتورة شراء جديدة" icon={<Plus className="w-4 h-4" />}>
          <div className="flex flex-col gap-6">
            
            {/* Supplier Selection */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">اختيار المورد</span>
              </div>
              
              <div className="w-full sm:w-80">
                <ModernSelect 
                  label="المورد" 
                  options={supplierOptions}
                  defaultValue=""
                  placeholder="اختر المورد..."
                  onSelect={val => {
                    const supplier = suppliers.find(s => s.name === val);
                    form.setData('supplier_id', supplier ? String(supplier.id) : '');
                  }}
                />
                {form.errors.supplier_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.supplier_id}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
              <textarea
                value={form.data.notes}
                onChange={e => form.setData('notes', e.target.value)}
                placeholder="ملاحظات الفاتورة... (اختياري)"
                rows={4}
                className="spatial-input rounded-[16px] px-4 py-3 text-[15px] font-bold resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={submit} 
                disabled={form.processing || !form.data.supplier_id}
                className="spatial-button flex items-center gap-2 px-6 h-12 text-sm disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                إنشاء الفاتورة
              </button>
              
              <Link href="/purchases"
                className="flex items-center gap-2 px-4 h-12 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                إلغاء
              </Link>
            </div>

            {/* Info */}
            <div className="p-4 rounded-[16px] bg-blue-500/5 border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <p className="text-sm font-bold">
                💡 بعد إنشاء الفاتورة، ستتمكن من إضافة المنتجات وتسجيل المدفوعات
              </p>
            </div>

          </div>
        </SpatialCard>

      </div>
    </AppShell>
  );
}