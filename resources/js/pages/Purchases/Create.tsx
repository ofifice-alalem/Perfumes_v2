import { useForm, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Check } from 'lucide-react';

interface Supplier { id: number; name: string; phone: string; }

interface Props {
  suppliers: Supplier[];
  flash?: { success?: string; error?: string };
}

export default function PurchaseCreate({ suppliers, flash }: Props) {
  const form = useForm({ supplier_id: '', notes: '' });

  function submit() {
    form.post('/purchases');
  }

  return (
    <AppShell pageTitle="فاتورة شراء جديدة">
      <div className="flex flex-col gap-6 max-w-xl">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← المشتريات</Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة شراء جديدة</h1>
        </div>

        {/* Flash */}
        {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        <SpatialCard title="بيانات الفاتورة">
          <div className="flex flex-col gap-4">
            <ModernSelect label="المورد"
              options={suppliers.map(s => ({ label: s.name, meta: s.phone }))}
              defaultValue=""
              onSelect={val => {
                const s = suppliers.find(s => s.name === val);
                form.setData('supplier_id', s ? String(s.id) : '');
              }}
            />
            {form.errors.supplier_id && <p className="text-xs text-red-500 font-bold -mt-2">{form.errors.supplier_id}</p>}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات (اختياري)</label>
              <textarea value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                rows={3} placeholder="أي ملاحظات على الفاتورة..."
                className="spatial-input rounded-[16px] px-4 py-3 text-[15px] font-bold resize-none" />
            </div>

            <button onClick={submit} disabled={form.processing || !form.data.supplier_id}
              className="spatial-button flex items-center justify-center gap-2 h-12 text-sm disabled:opacity-50">
              <Check className="w-4 h-4" /> إنشاء الفاتورة وإضافة المنتجات
            </button>
          </div>
        </SpatialCard>

      </div>
    </AppShell>
  );
}
