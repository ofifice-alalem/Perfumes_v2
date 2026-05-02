import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, CreditCard, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { DateInput } from '@/components/ui/DateInput';

interface Customer      { id: number; name: string; total_debt: string; }
interface PaymentMethod { id: number; name: string; }
interface Payment {
  id: number; amount: string; notes: string | null; created_at: string;
  customer: { id: number; name: string } | null;
  invoice: { id: number } | null;
  payment_method: { name: string };
}
interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number; links: { url: string | null; label: string; active: boolean }[]; }
interface Props {
  payments: Paginated<Payment>;
  customers: Customer[];
  paymentMethods: PaymentMethod[];
  filters: Record<string, string>;
  flash?: { success?: string; error?: string };
}

export default function PaymentsIndex({ payments, customers, paymentMethods, filters, flash }: Props) {
  const [deleteId, setDeleteId]       = useState<number | null>(null);
  const [filterOpen, setFilterOpen]   = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [showPad, setShowPad]         = useState(false);
  const [processing, setProcessing]   = useState(false);

  const [customerId,       setCustomerId]       = useState(filters.customer_id        ?? '');
  const [paymentMethodId,  setPaymentMethodId]  = useState(filters.payment_method_id  ?? '');
  const [dateFrom,         setDateFrom]         = useState(filters.date_from          ?? '');
  const [dateTo,           setDateTo]           = useState(filters.date_to            ?? '');
  const [amountMin,        setAmountMin]        = useState(filters.amount_min         ?? '');
  const [amountMax,        setAmountMax]        = useState(filters.amount_max         ?? '');

  const [form, setForm] = useState({ customer_id: '', payment_method_id: '', amount: '', notes: '' });
  const selectedCustomer = customers.find(c => String(c.id) === form.customer_id);
  const isCreditor = selectedCustomer ? +selectedCustomer.total_debt < 0 : false;

  function applyFilters() {
    const p: Record<string, string> = {};
    if (customerId)      p.customer_id       = customerId;
    if (paymentMethodId) p.payment_method_id = paymentMethodId;
    if (dateFrom)        p.date_from         = dateFrom;
    if (dateTo)          p.date_to           = dateTo;
    if (amountMin)       p.amount_min        = amountMin;
    if (amountMax)       p.amount_max        = amountMax;
    router.get('/payments', p, { preserveState: true, replace: true });
  }

  function resetFilters() {
    setCustomerId(''); setPaymentMethodId(''); setDateFrom(''); setDateTo('');
    setAmountMin(''); setAmountMax('');
    router.get('/payments', {}, { preserveState: true, replace: true });
  }

  function submitCreate() {
    if (!form.customer_id || !form.payment_method_id || !form.amount) return;
    setProcessing(true);
    router.post('/payments', form, {
      onSuccess: () => { setShowCreate(false); setForm({ customer_id: '', payment_method_id: '', amount: '', notes: '' }); },
      onFinish: () => setProcessing(false),
    });
  }

  function goToPage(url: string | null) {
    if (!url) return;
    router.visit(url, { preserveState: true });
  }

  const filterContent = (
    <div className="flex flex-col gap-4">
      <ModernSelect label="العميل" placeholder="الكل"
        defaultValue={customerId}
        options={[{ label: 'الكل', value: '' }, ...customers.map(c => ({ label: c.name, value: String(c.id) }))]}
        onSelect={v => setCustomerId(v)}
      />
      <ModernSelect label="وسيلة الدفع" placeholder="الكل"
        defaultValue={paymentMethodId}
        options={[{ label: 'الكل', value: '' }, ...paymentMethods.map(m => ({ label: m.name, value: String(m.id) }))]}
        onSelect={v => setPaymentMethodId(v)}
      />
      <DateInput label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
      <DateInput label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
      <div className="flex gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ من</label>
          <input type="number" min="0" value={amountMin} onChange={e => setAmountMin(e.target.value)}
            placeholder="0" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold w-full" />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ إلى</label>
          <input type="number" min="0" value={amountMax} onChange={e => setAmountMax(e.target.value)}
            placeholder="∞" className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold w-full" />
        </div>
      </div>
      <button onClick={applyFilters}
        className="w-full h-11 rounded-[14px] spatial-button flex items-center justify-center gap-2 font-bold text-sm">
        فلترة
      </button>
      <button onClick={resetFilters}
        className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
        إعادة تعيين
      </button>
    </div>
  );

  return (
    <AppShell pageTitle="المدفوعات">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">المدفوعات</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{payments.total} دفعة مسجلة</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> دفعة جديدة
          </button>
        </div>

        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {/* Create Form */}
        {showCreate && (
          <SpatialCard title="دفعة جديدة" icon={<Plus className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ModernSelect label="العميل" placeholder="اختر العميل..."
                defaultValue=""
                options={customers.filter(c => +c.total_debt > 0).map(c => ({ label: c.name, value: String(c.id) }))}
                onSelect={v => setForm(f => ({ ...f, customer_id: v, amount: '' }))}
              />
              <ModernSelect label="وسيلة الدفع" placeholder="اختر وسيلة الدفع..."
                defaultValue=""
                options={paymentMethods.map(m => ({ label: m.name, value: String(m.id) }))}
                onSelect={v => setForm(f => ({ ...f, payment_method_id: v }))}
              />
            </div>

            {/* حالة العميل بعد الاختيار */}
            {selectedCustomer && (
              isCreditor ? (
                <div className="mt-4 px-4 py-3 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  المتجر دائن لهذا العميل بـ {Math.abs(+selectedCustomer.total_debt)} د — لا يمكن تسجيل دفعة، استخدم التسوية
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {+selectedCustomer.total_debt > 0 && (
                    <div className="sm:col-span-2 px-4 py-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">
                      العميل مدين بـ {selectedCustomer.total_debt} د
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
                    <button onClick={() => setShowPad(true)}
                      className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold text-right cursor-pointer hover:border-primary/40 transition-all">
                      {form.amount || <span className="text-slate-400 dark:text-white/30">0.00</span>}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="اختياري" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  </div>
                </div>
              )
            )}

            <div className="flex items-center gap-2 mt-4">
              <button onClick={submitCreate}
                disabled={processing || !form.customer_id || !form.payment_method_id || !form.amount || isCreditor}
                className="spatial-button flex items-center gap-2 px-6 h-11 text-sm disabled:opacity-50">
                <Check className="w-4 h-4" /> حفظ
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                <X className="w-4 h-4" /> إلغاء
              </button>
            </div>
          </SpatialCard>
        )}

        {/* Mobile Filter */}
        <div className="lg:hidden">
          <button onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
            <div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> فلترة</div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {filterOpen && (
            <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200">
              {filterContent}
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {payments.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-3">
                <span className="text-4xl">💳</span>
                <span className="font-bold">لا توجد دفعات</span>
              </div>
            ) : (
              payments.data.map(payment => (
                <div key={payment.id} className="spatial-card overflow-hidden flex flex-col sm:flex-row sm:items-stretch">

                  {/* Color strip */}
                  <div className="flex sm:flex-col sm:w-28 shrink-0 items-center sm:justify-center justify-between px-4 py-3 sm:px-3 sm:py-0 border-b sm:border-b-0 sm:border-l border-black/5 dark:border-white/5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="text-[13px] font-black">{payment.amount} د</span>
                    <span className="sm:hidden text-[13px] font-black text-primary">#{payment.id}</span>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:flex flex-1 flex-row items-center min-w-0 px-4 py-3 gap-5">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-black text-primary">#{payment.id}</span>
                        <span className="text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px]">
                          {new Date(payment.created_at).toLocaleDateString('ar')}
                        </span>
                        <span className="text-[12px] font-bold text-slate-500 dark:text-white/60 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-[8px]">
                          {payment.payment_method.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-slate-600 dark:text-white/60">
                          {payment.customer?.name ?? 'زبون نقدي'}
                        </span>
                        {payment.invoice && (
                          <Link href={`/invoices/${payment.invoice.id}`}
                            className="text-xs font-bold text-primary/70 hover:text-primary transition-colors">
                            فاتورة #{payment.invoice.id}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-3">
                        <Link href={`/payments/${payment.id}`}
                          className="flex items-center gap-2 px-4 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                          تفاصيل
                        </Link>
                        <button onClick={() => setDeleteId(payment.id)}
                          className="w-10 h-10 rounded-[12px] bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 flex items-center justify-center transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          {payment.customer?.name?.charAt(0) ?? '—'}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 dark:text-white text-sm">{payment.customer?.name ?? 'زبون نقدي'}</div>
                          <div className="text-xs font-bold text-slate-400 dark:text-white/40">{payment.payment_method.name}</div>
                        </div>
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{payment.amount} د</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                      <span className="text-xs font-bold text-slate-400 dark:text-white/40">
                        {new Date(payment.created_at).toLocaleDateString('ar')}
                        {payment.invoice && <span className="mr-2 text-primary/70"> • فاتورة #{payment.invoice.id}</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link href={`/payments/${payment.id}`}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-[10px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 text-slate-600 dark:text-white/60 font-bold text-xs transition-all">
                          تفاصيل
                        </Link>
                        <button onClick={() => setDeleteId(payment.id)}
                          className="w-9 h-9 rounded-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {payments.last_page > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-400 dark:text-white/40">
                  صفحة {payments.current_page} من {payments.last_page}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(payments.links[0].url)} disabled={payments.current_page === 1}
                    className="w-9 h-9 rounded-[12px] spatial-input flex items-center justify-center text-slate-600 dark:text-white/60 disabled:opacity-30 hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {payments.links.slice(1, -1).map((link, i) => (
                    <button key={i} onClick={() => goToPage(link.url)} disabled={!link.url}
                      className={`w-9 h-9 rounded-[12px] font-bold text-[13px] transition-all border ${
                        link.active
                          ? 'bg-primary border-primary text-white'
                          : 'spatial-input border-black/10 dark:border-white/10 text-slate-600 dark:text-white/60 hover:text-primary hover:border-primary/30'
                      }`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                  <button onClick={() => goToPage(payments.links[payments.links.length - 1].url)} disabled={payments.current_page === payments.last_page}
                    className="w-9 h-9 rounded-[12px] spatial-input flex items-center justify-center text-slate-600 dark:text-white/60 disabled:opacity-30 hover:text-primary transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Filter */}
          <div className="hidden lg:block w-[360px] shrink-0">
            <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
              {filterContent}
            </SpatialCard>
          </div>
        </div>

        <ConfirmModal isOpen={deleteId !== null} title="حذف الدفعة"
          message="هل أنت متأكد من حذف هذه الدفعة؟ سيُعاد حساب دين العميل تلقائياً."
          onConfirm={() => deleteId && router.delete(`/payments/${deleteId}`, { onSuccess: () => setDeleteId(null) })}
          onCancel={() => setDeleteId(null)} />

        <NumberPadModal isOpen={showPad} onClose={() => setShowPad(false)} title="المبلغ"
          initialValue={form.amount}
          onConfirm={v => {
            const max = selectedCustomer ? +selectedCustomer.total_debt : 0;
            setForm(f => ({ ...f, amount: max > 0 && +v > max ? String(max) : v }));
          }} />
      </div>
    </AppShell>
  );
}
