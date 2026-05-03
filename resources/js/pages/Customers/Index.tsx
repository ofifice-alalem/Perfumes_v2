import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Pencil, Trash2, X, Check, CreditCard, ArrowLeftRight, SlidersHorizontal, ChevronDown, Phone } from 'lucide-react';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';

interface Customer {
  id: number; name: string; phone: string | null;
  email: string | null; address: string | null;
  total_purchases: string; total_debt: string; is_active: boolean;
}
interface PaymentMethod { id: number; name: string; }

interface Props {
  customers: Customer[];
  paymentMethods: PaymentMethod[];
  flash?: { success?: string; error?: string };
}

const emptyForm = { name: '', phone: '', email: '', address: '', is_active: true as boolean };

export default function CustomersIndex({ customers, paymentMethods, flash }: Props) {
  const [search, setSearch]         = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [paymentCustomer, setPaymentCustomer]       = useState<Customer | null>(null);
  const [settlementCustomer, setSettlementCustomer] = useState<Customer | null>(null);
  const [paymentForm, setPaymentForm]       = useState({ payment_method_id: '', amount: '', notes: '' });
  const [settlementForm, setSettlementForm] = useState({ payment_method_id: '', amount: '', notes: '' });
  const [processing, setProcessing]         = useState(false);
  const [showPaymentPad, setShowPaymentPad]       = useState(false);
  const [showSettlementPad, setShowSettlementPad] = useState(false);

  const createForm = useForm({ ...emptyForm });
  const editForm   = useForm({ ...emptyForm });

  const filtered = customers.filter(c => c.id !== 1).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  function startEdit(c: Customer) {
    setEditId(c.id);
    editForm.setData({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', is_active: c.is_active });
  }

  function submitCreate() {
    createForm.post('/customers', { onSuccess: () => { createForm.reset(); setShowCreate(false); } });
  }

  function submitEdit() {
    editForm.put(`/customers/${editId}`, { onSuccess: () => setEditId(null) });
  }

  function deleteCustomer(id: number) {
    router.delete(`/customers/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  function submitPayment() {
    if (!paymentCustomer || !paymentForm.payment_method_id || !paymentForm.amount) return;
    const debt = +paymentCustomer.total_debt;
    if (debt > 0 && +paymentForm.amount > debt) return;
    setProcessing(true);
    router.post('/payments', { customer_id: paymentCustomer.id, ...paymentForm }, {
      onSuccess: () => { setPaymentCustomer(null); setPaymentForm({ payment_method_id: '', amount: '', notes: '' }); },
      onFinish: () => setProcessing(false),
    });
  }

  function submitSettlement() {
    if (!settlementCustomer || !settlementForm.payment_method_id || !settlementForm.amount) return;
    setProcessing(true);
    router.post('/settlements', { customer_id: settlementCustomer.id, ...settlementForm }, {
      onSuccess: () => { setSettlementCustomer(null); setSettlementForm({ payment_method_id: '', amount: '', notes: '' }); },
      onFinish: () => setProcessing(false),
    });
  }

  const FilterPanel = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">بحث</label>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="اسم أو هاتف..." className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
      </div>
      <button onClick={() => setSearch('')}
        className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
        إعادة تعيين
      </button>
    </div>
  );

  return (
    <AppShell pageTitle="العملاء">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">العملاء</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{customers.filter(c => c.id !== 1).length} عميل مسجل</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> إضافة عميل
          </button>
        </div>

        {/* Flash */}
        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {/* Add Form */}
        {showCreate && (
          <SpatialCard title="عميل جديد" icon={<Plus className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'name',    label: 'الاسم',    placeholder: 'اسم العميل' },
                { key: 'phone',   label: 'الهاتف',   placeholder: '05xxxxxxxx' },
                { key: 'email',   label: 'البريد',   placeholder: 'email@example.com' },
                { key: 'address', label: 'العنوان',  placeholder: 'اختياري' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">{label}</label>
                  <input value={(createForm.data as any)[key]} onChange={e => createForm.setData(key as any, e.target.value)}
                    placeholder={placeholder} className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  {(createForm.errors as any)[key] && <p className="text-xs text-red-500 font-bold">{(createForm.errors as any)[key]}</p>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={submitCreate} disabled={createForm.processing}
                className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
                <Check className="w-4 h-4" /> حفظ
              </button>
              <button onClick={() => { setShowCreate(false); createForm.reset(); }}
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
              <FilterPanel />
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-3">
                <span className="text-4xl">👥</span>
                <span className="font-bold">لا يوجد عملاء</span>
              </div>
            ) : (
              filtered.map(c => (
                <div key={c.id} className="spatial-card overflow-hidden">

                  {editId === c.id ? (
                    /* ── Edit Mode (both) ── */
                    <div className="p-5 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'name',    label: 'الاسم' },
                          { key: 'phone',   label: 'الهاتف' },
                          { key: 'email',   label: 'البريد' },
                          { key: 'address', label: 'العنوان' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-white/40">{label}</label>
                            <input value={(editForm.data as any)[key]} onChange={e => editForm.setData(key as any, e.target.value)}
                              className="spatial-input h-11 rounded-[12px] px-3 text-[14px] font-bold" />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={submitEdit} disabled={editForm.processing}
                          className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
                          <Check className="w-4 h-4" /> حفظ
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="flex items-center gap-2 px-4 h-11 rounded-[14px] bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                          <X className="w-4 h-4" /> إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ── Mobile View ── */}
                      <div className="flex flex-col sm:hidden">
                        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[17px] font-black text-slate-800 dark:text-white leading-tight">{c.name}</span>
                              {!c.is_active && <span className="text-[11px] font-bold text-slate-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">غير نشط</span>}
                            </div>
                            {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-[13px] font-bold text-slate-500 dark:text-white/50 hover:text-primary dark:hover:text-primary transition-colors">
                              <Phone className="w-3.5 h-3.5" />{c.phone}{c.email ? ` · ${c.email}` : ''}
                            </a>}
                          </div>
                          <div className={`shrink-0 flex flex-col items-center justify-center px-4 py-2 rounded-[16px] border ${
                            +c.total_debt > 0 ? 'bg-red-500/10 border-red-500/20 text-red-500'
                            : +c.total_debt < 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            <span className="text-[11px] font-bold">{+c.total_debt > 0 ? 'مدين' : +c.total_debt < 0 ? 'دائن' : 'مسدد'}</span>
                            <span className="text-[15px] font-black leading-tight">
                              {+c.total_debt !== 0 ? `${Math.abs(+c.total_debt).toFixed(2)} د` : '✓'}
                            </span>
                          </div>
                        </div>
                        <div className="mx-5 border-t border-black/5 dark:border-white/5" />
                        <div className="flex items-center justify-between px-5 py-4 gap-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">إجمالي المشتريات</span>
                            <span className="text-[15px] font-black text-slate-800 dark:text-white">{c.total_purchases} د</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => startEdit(c)}
                              className="w-11 h-11 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 flex items-center justify-center transition-all">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {+c.total_debt > 0 && (
                              <button onClick={() => setPaymentCustomer(c)}
                                className="w-11 h-11 rounded-[14px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all">
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            {+c.total_debt < 0 && (
                              <button onClick={() => setSettlementCustomer(c)}
                                className="w-11 h-11 rounded-[14px] bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 flex items-center justify-center transition-all">
                                <ArrowLeftRight className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setDeleteId(c.id)}
                              className="w-11 h-11 rounded-[14px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ── Desktop View (horizontal like Suppliers) ── */}
                      <div className="hidden sm:flex sm:items-stretch">
                        <div className={`flex flex-col sm:w-28 shrink-0 items-center justify-center px-3 border-l border-black/5 dark:border-white/5 ${
                          +c.total_debt > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : +c.total_debt < 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          <span className="text-[12px] font-bold">{+c.total_debt > 0 ? 'مدين' : +c.total_debt < 0 ? 'دائن' : 'مسدد'}</span>
                          <span className="text-[14px] font-black">{+c.total_debt < 0 ? Math.abs(+c.total_debt).toFixed(2) : c.total_debt} د</span>
                        </div>
                        <div className="flex-1 flex sm:items-center min-w-0 px-4 py-3 gap-5">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-black text-slate-800 dark:text-white">{c.name}</span>
                              {!c.is_active && <span className="text-xs font-bold text-slate-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-[6px]">غير نشط</span>}
                            </div>
                            <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-[13px] font-bold text-slate-500 dark:text-white/50 hover:text-primary dark:hover:text-primary transition-colors">
                              <Phone className="w-3.5 h-3.5" />{c.phone}{c.email ? ` · ${c.email}` : ''}
                            </a>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-slate-400 dark:text-white/40">إجمالي المشتريات</span>
                              <span className="font-black text-slate-800 dark:text-white text-sm">{c.total_purchases} د</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <button onClick={() => startEdit(c)}
                                className="w-14 h-14 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 flex items-center justify-center transition-all">
                                <Pencil className="w-5 h-5" />
                              </button>
                              {+c.total_debt > 0 && (
                                <button onClick={() => setPaymentCustomer(c)}
                                  className="w-14 h-14 rounded-[16px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all">
                                  <CreditCard className="w-5 h-5" />
                                </button>
                              )}
                              {+c.total_debt < 0 && (
                                <button onClick={() => setSettlementCustomer(c)}
                                  className="w-14 h-14 rounded-[16px] bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 flex items-center justify-center transition-all">
                                  <ArrowLeftRight className="w-5 h-5" />
                                </button>
                              )}
                              <button onClick={() => setDeleteId(c.id)}
                                className="w-14 h-14 rounded-[16px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-all">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Filter */}
          <div className="hidden lg:block w-[280px] shrink-0">
            <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
              <FilterPanel />
            </SpatialCard>
          </div>
        </div>

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deleteCustomer(deleteId)} onCancel={() => setDeleteId(null)} />

        {/* Payment Modal */}
        {paymentCustomer && createPortal(
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setPaymentCustomer(null)} />
            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-[30px] border border-black/10 dark:border-white/[0.12] shadow-2xl">
              <div className="absolute inset-0 rounded-[30px] dark:hidden pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(220,230,245,0.97) 100%)' }} />
              <div className="absolute inset-0 rounded-[30px] hidden dark:block pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(25,35,80,0.98) 0%, rgba(10,14,35,0.97) 100%)' }} />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">دفعة جديدة — {paymentCustomer.name}</h3>
                  <button onClick={() => setPaymentCustomer(null)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-black/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-4 px-4 py-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">
                  العميل مدين: {paymentCustomer.total_debt} د
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">وسيلة الدفع</label>
                    <ModernSelect
                      label=""
                      placeholder="اختر وسيلة الدفع..."
                      options={paymentMethods.map(m => ({ label: m.name }))}
                      defaultValue={paymentMethods.find(m => String(m.id) === paymentForm.payment_method_id)?.name ?? ''}
                      onSelect={val => setPaymentForm(f => ({ ...f, payment_method_id: String(paymentMethods.find(m => m.name === val)?.id ?? '') }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
                    <button onClick={() => setShowPaymentPad(true)}
                      className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold text-right cursor-pointer hover:border-primary/40 transition-all">
                      {paymentForm.amount || <span className="text-slate-400 dark:text-white/30">{paymentCustomer.total_debt}</span>}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
                    <input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="اختياري" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={submitPayment}
                      disabled={processing || !paymentForm.payment_method_id || !paymentForm.amount || +paymentForm.amount > +paymentCustomer.total_debt}
                      className="spatial-button flex items-center gap-2 px-6 h-11 text-sm disabled:opacity-50">
                      <Check className="w-4 h-4" /> تسجيل الدفعة
                    </button>
                    <button onClick={() => setPaymentCustomer(null)}
                      className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                      <X className="w-4 h-4" /> إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Settlement Modal */}
        {settlementCustomer && createPortal(
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setSettlementCustomer(null)} />
            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-[30px] border border-black/10 dark:border-white/[0.12] shadow-2xl">
              <div className="absolute inset-0 rounded-[30px] dark:hidden pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(220,230,245,0.97) 100%)' }} />
              <div className="absolute inset-0 rounded-[30px] hidden dark:block pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(25,35,80,0.98) 0%, rgba(10,14,35,0.97) 100%)' }} />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">تسوية — {settlementCustomer.name}</h3>
                  <button onClick={() => setSettlementCustomer(null)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-black/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-4 px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-sm">
                  المتجر دائن للعميل: {Math.abs(+settlementCustomer.total_debt)} د
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">وسيلة الرد</label>
                    <ModernSelect
                      label=""
                      placeholder="اختر وسيلة الدفع..."
                      options={paymentMethods.map(m => ({ label: m.name }))}
                      defaultValue={paymentMethods.find(m => String(m.id) === settlementForm.payment_method_id)?.name ?? ''}
                      onSelect={val => setSettlementForm(f => ({ ...f, payment_method_id: String(paymentMethods.find(m => m.name === val)?.id ?? '') }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ المُرجَع</label>
                    <button onClick={() => setShowSettlementPad(true)}
                      className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold text-right cursor-pointer hover:border-primary/40 transition-all">
                      {settlementForm.amount || <span className="text-slate-400 dark:text-white/30">0.00</span>}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">السبب / ملاحظات</label>
                    <input value={settlementForm.notes} onChange={e => setSettlementForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="سبب التسوية..." className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={submitSettlement} disabled={processing || !settlementForm.payment_method_id || !settlementForm.amount}
                      className="spatial-button flex items-center gap-2 px-6 h-11 text-sm disabled:opacity-50">
                      <Check className="w-4 h-4" /> تسجيل التسوية
                    </button>
                    <button onClick={() => setSettlementCustomer(null)}
                      className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                      <X className="w-4 h-4" /> إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        <NumberPadModal
          isOpen={showPaymentPad}
          onClose={() => setShowPaymentPad(false)}
          title="مبلغ الدفعة"
          initialValue={paymentForm.amount || (paymentCustomer?.total_debt ?? '')}
          onConfirm={val => {
            if (!paymentCustomer) return;
            const max = +paymentCustomer.total_debt;
            setPaymentForm(f => ({ ...f, amount: max > 0 && +val > max ? paymentCustomer.total_debt : val }));
          }}
        />

        <NumberPadModal
          isOpen={showSettlementPad}
          onClose={() => setShowSettlementPad(false)}
          title="مبلغ التسوية"
          initialValue={settlementForm.amount}
          onConfirm={val => {
            const max = settlementCustomer ? Math.abs(+settlementCustomer.total_debt) : 0;
            setSettlementForm(f => ({ ...f, amount: max > 0 && +val > max ? String(max) : val }));
          }}
        />

      </div>
    </AppShell>
  );
}
