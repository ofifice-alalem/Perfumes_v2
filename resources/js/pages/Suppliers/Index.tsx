import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Pencil, Trash2, SlidersHorizontal, ChevronDown, Check, X, CreditCard, ArrowLeftRight } from 'lucide-react';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';

interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  total_purchases: string;
  total_debt: string;
  is_active: boolean;
}

interface PaymentMethod { id: number; name: string; }

interface Props {
  suppliers: Supplier[];
  paymentMethods: PaymentMethod[];
  flash?: { success?: string; error?: string };
}

export default function SuppliersIndex({ suppliers, paymentMethods, flash }: Props) {
  const [search, setSearch]         = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [paymentSupplier, setPaymentSupplier]       = useState<Supplier | null>(null);
  const [settlementSupplier, setSettlementSupplier] = useState<Supplier | null>(null);
  const [paymentForm, setPaymentForm]       = useState({ payment_method_id: '', amount: '', notes: '' });
  const [settlementForm, setSettlementForm] = useState({ payment_method_id: '', amount: '', notes: '' });
  const [processing, setProcessing]         = useState(false);
  const [showPaymentPad, setShowPaymentPad]       = useState(false);
  const [showSettlementPad, setShowSettlementPad] = useState(false);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  const addForm = useForm({ name: '', phone: '', email: '', address: '' });
  const editForm = useForm({ name: '', phone: '', email: '', address: '', is_active: true as boolean });

  function startEdit(s: Supplier) {
    setEditId(s.id);
    editForm.setData({ name: s.name, phone: s.phone, email: s.email ?? '', address: s.address ?? '', is_active: s.is_active });
  }

  function submitAdd() {
    addForm.post('/suppliers', { onSuccess: () => { setShowAdd(false); addForm.reset(); } });
  }

  function submitEdit() {
    editForm.put(`/suppliers/${editId}`, { onSuccess: () => setEditId(null) });
  }

  function deleteSupplier(id: number) {
    useForm({}).delete(`/suppliers/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  function submitPayment() {
    if (!paymentSupplier || !paymentForm.payment_method_id || !paymentForm.amount) return;
    const debt = +paymentSupplier.total_debt;
    if (debt > 0 && +paymentForm.amount > debt) return;
    setProcessing(true);
    router.post('/supplier-payments', { supplier_id: paymentSupplier.id, ...paymentForm }, {
      onSuccess: () => { setPaymentSupplier(null); setPaymentForm({ payment_method_id: '', amount: '', notes: '' }); },
      onFinish: () => setProcessing(false),
    });
  }

  function submitSettlement() {
    if (!settlementSupplier || !settlementForm.payment_method_id || !settlementForm.amount) return;
    setProcessing(true);
    router.post('/supplier-settlements', { supplier_id: settlementSupplier.id, ...settlementForm }, {
      onSuccess: () => { setSettlementSupplier(null); setSettlementForm({ payment_method_id: '', amount: '', notes: '' }); },
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
    <AppShell pageTitle="الموردون">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">الموردون</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{suppliers.length} مورد</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> مورد جديد
          </button>
        </div>

        {/* Flash */}
        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {/* Add Form */}
        {showAdd && (
          <SpatialCard title="إضافة مورد جديد">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'name',    label: 'الاسم',    placeholder: 'اسم المورد', required: true },
                { key: 'phone',   label: 'الهاتف',   placeholder: '05xxxxxxxx', required: true },
                { key: 'email',   label: 'البريد',   placeholder: 'email@example.com' },
                { key: 'address', label: 'العنوان',  placeholder: 'المدينة، الحي...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">{label}</label>
                  <input value={(addForm.data as any)[key]} onChange={e => addForm.setData(key as any, e.target.value)}
                    placeholder={placeholder} className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  {(addForm.errors as any)[key] && <p className="text-xs text-red-500 font-bold">{(addForm.errors as any)[key]}</p>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={submitAdd} disabled={addForm.processing}
                className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
                <Check className="w-4 h-4" /> حفظ
              </button>
              <button onClick={() => { setShowAdd(false); addForm.reset(); }}
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
                <span className="text-4xl">🚚</span>
                <span className="font-bold">لا يوجد موردون</span>
              </div>
            ) : (
              filtered.map(s => (
                <div key={s.id} className="spatial-card overflow-hidden flex flex-col sm:flex-row sm:items-stretch">

                  {/* Debt Strip */}
                  <div className={`flex sm:flex-col sm:w-28 shrink-0 items-center sm:justify-center justify-between px-4 py-3 sm:px-3 sm:py-0 border-b sm:border-b-0 sm:border-l border-black/5 dark:border-white/5 ${+s.total_debt > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                    <span className="text-[12px] font-bold">{+s.total_debt > 0 ? 'دين' : 'مسدد'}</span>
                    <span className="text-[14px] font-black">{s.total_debt} د</span>
                  </div>

                  {/* Info */}
                  {editId === s.id ? (
                    <div className="flex-1 p-4 flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: 'name',    label: 'الاسم' },
                          { key: 'phone',   label: 'الهاتف' },
                          { key: 'email',   label: 'البريد' },
                          { key: 'address', label: 'العنوان' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-white/40">{label}</label>
                            <input value={(editForm.data as any)[key]} onChange={e => editForm.setData(key as any, e.target.value)}
                              className="spatial-input h-10 rounded-[12px] px-3 text-[14px] font-bold" />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={submitEdit} disabled={editForm.processing}
                          className="spatial-button flex items-center gap-1.5 px-4 h-9 text-sm disabled:opacity-50">
                          <Check className="w-3.5 h-3.5" /> حفظ
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                          <X className="w-3.5 h-3.5" /> إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center min-w-0 px-4 py-3 gap-2 sm:gap-5">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-black text-slate-800 dark:text-white">{s.name}</span>
                          {!s.is_active && <span className="text-xs font-bold text-slate-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-[6px]">غير نشط</span>}
                        </div>
                        <span className="text-[13px] font-bold text-slate-500 dark:text-white/50">{s.phone}{s.email ? ` · ${s.email}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">إجمالي المشتريات</span>
                          <span className="font-black text-slate-800 dark:text-white text-sm">{s.total_purchases} د</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(s)}
                            className="w-9 h-9 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 flex items-center justify-center transition-all">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {+s.total_debt > 0 && (
                            <button onClick={() => setPaymentSupplier(s)}
                              className="w-9 h-9 rounded-[12px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all">
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {+s.total_debt < 0 && (
                            <button onClick={() => setSettlementSupplier(s)}
                              className="w-9 h-9 rounded-[12px] bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 flex items-center justify-center transition-all">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => setDeleteId(s.id)}
                            className="w-9 h-9 rounded-[12px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
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

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deleteSupplier(deleteId)} onCancel={() => setDeleteId(null)} />

        {/* Payment Modal */}
        {paymentSupplier && createPortal(
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setPaymentSupplier(null)} />
            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-[30px] border border-black/10 dark:border-white/[0.12] shadow-2xl">
              <div className="absolute inset-0 rounded-[30px] dark:hidden pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(220,230,245,0.97) 100%)' }} />
              <div className="absolute inset-0 rounded-[30px] hidden dark:block pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(25,35,80,0.98) 0%, rgba(10,14,35,0.97) 100%)' }} />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">دفعة جديدة — {paymentSupplier.name}</h3>
                  <button onClick={() => setPaymentSupplier(null)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-black/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-4 px-4 py-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">
                  المتجر مدين للمورد: {paymentSupplier.total_debt} د
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
                      {paymentForm.amount || <span className="text-slate-400 dark:text-white/30">{paymentSupplier.total_debt}</span>}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
                    <input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="اختياري" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={submitPayment}
                      disabled={processing || !paymentForm.payment_method_id || !paymentForm.amount || +paymentForm.amount > +paymentSupplier.total_debt}
                      className="spatial-button flex items-center gap-2 px-6 h-11 text-sm disabled:opacity-50">
                      <Check className="w-4 h-4" /> تسجيل الدفعة
                    </button>
                    <button onClick={() => setPaymentSupplier(null)}
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
        {settlementSupplier && createPortal(
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setSettlementSupplier(null)} />
            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-[30px] border border-black/10 dark:border-white/[0.12] shadow-2xl">
              <div className="absolute inset-0 rounded-[30px] dark:hidden pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(220,230,245,0.97) 100%)' }} />
              <div className="absolute inset-0 rounded-[30px] hidden dark:block pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(25,35,80,0.98) 0%, rgba(10,14,35,0.97) 100%)' }} />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">تسوية — {settlementSupplier.name}</h3>
                  <button onClick={() => setSettlementSupplier(null)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-black/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-4 px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-sm">
                  المورد دائن للمتجر: {Math.abs(+settlementSupplier.total_debt)} د
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
                    <button onClick={() => setSettlementSupplier(null)}
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
          initialValue={paymentForm.amount || (paymentSupplier?.total_debt ?? '')}
          onConfirm={val => {
            if (!paymentSupplier) return;
            const max = +paymentSupplier.total_debt;
            setPaymentForm(f => ({ ...f, amount: max > 0 && +val > max ? paymentSupplier.total_debt : val }));
          }}
        />

        <NumberPadModal
          isOpen={showSettlementPad}
          onClose={() => setShowSettlementPad(false)}
          title="مبلغ التسوية"
          initialValue={settlementForm.amount}
          onConfirm={val => {
            const max = settlementSupplier ? Math.abs(+settlementSupplier.total_debt) : 0;
            setSettlementForm(f => ({ ...f, amount: max > 0 && +val > max ? String(max) : val }));
          }}
        />

      </div>
    </AppShell>
  );
}
