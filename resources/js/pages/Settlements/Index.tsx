import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Trash2, ArrowLeftRight, X, Check } from 'lucide-react';

interface Customer      { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface Settlement {
  id: number; amount: string; notes: string | null; created_at: string;
  customer: { id: number; name: string } | null;
  invoice: { id: number } | null;
  payment_method: { name: string };
}
interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number; }
interface Props {
  settlements: Paginated<Settlement>;
  customers: Customer[];
  paymentMethods: PaymentMethod[];
  filters: Record<string, string>;
  flash?: { success?: string; error?: string };
}

function NewSettlementForm({ customers, paymentMethods, onClose }: {
  customers: Customer[]; paymentMethods: PaymentMethod[]; onClose: () => void;
}) {
  const [form, setForm] = useState({ customer_id: '', payment_method_id: '', amount: '', notes: '' });
  const [processing, setProcessing] = useState(false);

  function submit() {
    if (!form.customer_id || !form.payment_method_id || !form.amount) return;
    setProcessing(true);
    router.post('/settlements', form, { onSuccess: onClose, onFinish: () => setProcessing(false) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-bold">
        ⚠️ التسوية تعني أن المتجر يُعيد مبلغاً للعميل — ستزيد الدين الكلي للعميل
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">العميل</label>
          <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
            className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold">
            <option value="">اختر العميل...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">وسيلة الرد</label>
          <select value={form.payment_method_id} onChange={e => setForm(f => ({ ...f, payment_method_id: e.target.value }))}
            className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold">
            <option value="">اختر وسيلة الدفع...</option>
            {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ المُرجَع</label>
          <input type="number" min="0.01" step="0.01" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات / السبب</label>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="سبب التسوية..." className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={processing || !form.customer_id || !form.payment_method_id || !form.amount}
          className="spatial-button flex items-center gap-2 px-6 h-11 text-sm disabled:opacity-50">
          <Check className="w-4 h-4" /> حفظ
        </button>
        <button onClick={onClose}
          className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
          <X className="w-4 h-4" /> إلغاء
        </button>
      </div>
    </div>
  );
}

export default function SettlementsIndex({ settlements, customers, paymentMethods, filters, flash }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [localFilters, setLocalFilters] = useState(filters);

  function applyFilters() {
    router.get('/settlements', localFilters, { preserveState: true });
  }

  function clearFilters() {
    setLocalFilters({});
    router.get('/settlements', {});
  }

  function deleteSettlement(id: number) {
    router.delete(`/settlements/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  return (
    <AppShell pageTitle="التسويات">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">التسويات</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{settlements.total} تسوية مسجلة</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> تسوية جديدة
          </button>
        </div>

        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {showCreate && (
          <SpatialCard title="تسوية جديدة" icon={<Plus className="w-4 h-4" />}>
            <NewSettlementForm customers={customers} paymentMethods={paymentMethods} onClose={() => setShowCreate(false)} />
          </SpatialCard>
        )}

        {/* Filters */}
        <SpatialCard title="فلاتر البحث">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <select value={localFilters.customer_id ?? ''} onChange={e => setLocalFilters(f => ({ ...f, customer_id: e.target.value }))}
              className="spatial-input h-10 rounded-[12px] px-3 text-sm font-bold">
              <option value="">كل العملاء</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={localFilters.payment_method_id ?? ''} onChange={e => setLocalFilters(f => ({ ...f, payment_method_id: e.target.value }))}
              className="spatial-input h-10 rounded-[12px] px-3 text-sm font-bold">
              <option value="">كل الوسائل</option>
              {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={localFilters.date_from ?? ''} onChange={e => setLocalFilters(f => ({ ...f, date_from: e.target.value }))}
              className="spatial-input h-10 rounded-[12px] px-3 text-sm font-bold" />
            <input type="date" value={localFilters.date_to ?? ''} onChange={e => setLocalFilters(f => ({ ...f, date_to: e.target.value }))}
              className="spatial-input h-10 rounded-[12px] px-3 text-sm font-bold" />
            <button onClick={applyFilters} className="spatial-button h-10 text-sm font-bold">بحث</button>
            <button onClick={clearFilters}
              className="h-10 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
              مسح
            </button>
          </div>
        </SpatialCard>

        {/* List */}
        <SpatialCard title={`التسويات (${settlements.total})`} icon={<ArrowLeftRight className="w-4 h-4" />}>
          {settlements.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">🔄</span>
              <span className="font-bold">لا توجد تسويات</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-black/3 dark:bg-white/3 rounded-[12px]">
                <span>العميل</span>
                <span>المبلغ</span>
                <span>وسيلة الرد</span>
                <span>التاريخ</span>
                <span></span>
              </div>
              {settlements.data.map(settlement => (
                <div key={settlement.id}>
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-3 px-4 py-3 rounded-[16px] bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-all items-center">
                    <div className="flex flex-col">
                      <Link href={`/settlements/${settlement.id}`}
                        className="font-bold text-slate-800 dark:text-white text-sm hover:text-primary transition-colors">
                        {settlement.customer?.name ?? '—'}
                      </Link>
                      {settlement.invoice && (
                        <Link href={`/invoices/${settlement.invoice.id}`}
                          className="text-xs font-bold text-primary/70 hover:text-primary transition-colors">
                          فاتورة #{settlement.invoice.id}
                        </Link>
                      )}
                    </div>
                    <span className="font-black text-amber-600 dark:text-amber-400">{settlement.amount} د</span>
                    <span className="text-sm font-bold text-slate-600 dark:text-white/70">{settlement.payment_method.name}</span>
                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">
                      {new Date(settlement.created_at).toLocaleDateString('ar')}
                    </span>
                    <div className="flex justify-center">
                      <button onClick={() => setDeleteId(settlement.id)}
                        className="w-9 h-9 rounded-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden p-4 rounded-[16px] bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center justify-between mb-2">
                      <Link href={`/settlements/${settlement.id}`} className="font-bold text-slate-800 dark:text-white hover:text-primary">
                        {settlement.customer?.name ?? '—'}
                      </Link>
                      <span className="font-black text-amber-600 dark:text-amber-400">{settlement.amount} د</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 dark:text-white/40">{settlement.payment_method.name}</span>
                      <button onClick={() => setDeleteId(settlement.id)}
                        className="w-8 h-8 rounded-[8px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {settlements.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
              {Array.from({ length: settlements.last_page }, (_, i) => i + 1).map(page => (
                <button key={page}
                  onClick={() => router.get('/settlements', { ...filters, page: String(page) })}
                  className={`w-9 h-9 rounded-[10px] font-bold text-sm transition-all ${
                    page === settlements.current_page
                      ? 'bg-primary text-white'
                      : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}>
                  {page}
                </button>
              ))}
            </div>
          )}
        </SpatialCard>

        <ConfirmModal isOpen={deleteId !== null} title="حذف التسوية"
          message="هل أنت متأكد من حذف هذه التسوية؟ سيُعاد حساب دين العميل تلقائياً."
          onConfirm={() => deleteId && deleteSettlement(deleteId)}
          onCancel={() => setDeleteId(null)} />
      </div>
    </AppShell>
  );
}
