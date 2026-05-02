import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Pencil, Trash2, X, Check, Users, AlertCircle, CreditCard, ArrowLeftRight } from 'lucide-react';
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

function CustomerForm({ form, isEdit, onSubmit, onCancel }: {
  form: ReturnType<typeof useForm<typeof emptyForm>>;
  isEdit?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم</label>
          <input value={form.data.name} onChange={e => form.setData('name', e.target.value)}
            placeholder="مثال: خالد إبراهيم" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.name && <p className="text-xs text-red-500 font-bold">{form.errors.name}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">رقم الهاتف</label>
          <input value={form.data.phone} onChange={e => form.setData('phone', e.target.value)}
            placeholder="مثال: 0501234567" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.phone && <p className="text-xs text-red-500 font-bold">{form.errors.phone}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">البريد الإلكتروني</label>
          <input type="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)}
            placeholder="اختياري" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          {form.errors.email && <p className="text-xs text-red-500 font-bold">{form.errors.email}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">العنوان</label>
          <input value={form.data.address} onChange={e => form.setData('address', e.target.value)}
            placeholder="اختياري" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
        </div>
      </div>
      {isEdit && (
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-11 h-6 rounded-full transition-all duration-200 relative ${form.data.is_active ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}
            onClick={() => form.setData('is_active', !form.data.is_active)}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${form.data.is_active ? 'right-1' : 'left-1'}`} />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-white/70">نشط</span>
        </label>
      )}
      <div className="flex items-center gap-2">
        <button onClick={onSubmit} disabled={form.processing}
          className="spatial-button flex items-center gap-2 px-6 h-11 text-sm">
          <Check className="w-4 h-4" /> حفظ
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
          <X className="w-4 h-4" /> إلغاء
        </button>
      </div>
    </div>
  );
}

export default function CustomersIndex({ customers, paymentMethods, flash }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [settlementCustomer, setSettlementCustomer] = useState<Customer | null>(null);
  const [paymentForm, setPaymentForm] = useState({ payment_method_id: '', amount: '', notes: '' });
  const [settlementForm, setSettlementForm] = useState({ payment_method_id: '', amount: '', notes: '' });
  const [processing, setProcessing] = useState(false);
  const [showPaymentPad, setShowPaymentPad] = useState(false);
  const [showSettlementPad, setShowSettlementPad] = useState(false);

  const createForm = useForm({ ...emptyForm });
  const editForm   = useForm({ ...emptyForm });

  // استثناء زبون نقدي من العرض
  const displayCustomers = customers.filter(c => c.id !== 1);

  function startEdit(c: Customer) {
    setEditingCustomer(c);
    editForm.setData({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', is_active: c.is_active });
  }

  function submitCreate() {
    createForm.post('/customers', { onSuccess: () => { createForm.reset(); setShowCreate(false); } });
  }

  function submitEdit(id: number) {
    editForm.put(`/customers/${id}`, { onSuccess: () => setEditingCustomer(null) });
  }

  function deleteCustomer(id: number) {
    router.delete(`/customers/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  function submitPayment() {
    if (!paymentCustomer || !paymentForm.payment_method_id || !paymentForm.amount) return;
    const debt = +paymentCustomer.total_debt;
    if (debt > 0 && +paymentForm.amount > debt) return;
    setProcessing(true);
    router.post('/payments', {
      customer_id: paymentCustomer.id,
      ...paymentForm,
    }, {
      onSuccess: () => { setPaymentCustomer(null); setPaymentForm({ payment_method_id: '', amount: '', notes: '' }); },
      onFinish: () => setProcessing(false),
    });
  }

  function submitSettlement() {
    if (!settlementCustomer || !settlementForm.payment_method_id || !settlementForm.amount) return;
    setProcessing(true);
    router.post('/settlements', {
      customer_id: settlementCustomer.id,
      ...settlementForm,
    }, {
      onSuccess: () => { setSettlementCustomer(null); setSettlementForm({ payment_method_id: '', amount: '', notes: '' }); },
      onFinish: () => setProcessing(false),
    });
  }

  return (
    <AppShell pageTitle="Step 4 — المستخدمون والعملاء">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">العملاء</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{displayCustomers.length} عميل مسجل</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" /> إضافة عميل
          </button>
        </div>

        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {showCreate && (
          <SpatialCard title="عميل جديد" icon={<Plus className="w-4 h-4" />}>
            <CustomerForm form={createForm} onSubmit={submitCreate} onCancel={() => { setShowCreate(false); createForm.reset(); }} />
          </SpatialCard>
        )}

        <SpatialCard title={`العملاء (${displayCustomers.length})`} icon={<Users className="w-4 h-4" />} headerDot={false}>
          {displayCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">👥</span>
              <span className="font-bold">لا يوجد عملاء بعد</span>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5">
                      <th className="text-right py-3 px-4 text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">العميل</th>
                      <th className="text-right py-3 px-4 text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">الهاتف</th>
                      <th className="text-right py-3 px-4 text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إجمالي المشتريات</th>
                      <th className="text-right py-3 px-4 text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">دائن / مدين</th>
                      <th className="text-right py-3 px-4 text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">الحالة</th>
                      <th className="text-center py-3 px-4 text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayCustomers.map(customer => (
                      <tr key={customer.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${
                              customer.is_active ? 'bg-primary/10 text-primary' : 'bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/30'
                            }`}>
                              {customer.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">{customer.name}</div>
                              {customer.email && (
                                <div className="text-xs text-slate-400 dark:text-white/40">{customer.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-bold text-slate-600 dark:text-white/70">
                            {customer.phone || '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-bold text-slate-800 dark:text-white">
                            {+customer.total_purchases > 0 ? `${customer.total_purchases} د` : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {+customer.total_debt > 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm font-black text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                              <AlertCircle className="w-3.5 h-3.5" />
                              مدين {customer.total_debt} د
                            </span>
                          ) : +customer.total_debt < 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                              دائن {Math.abs(+customer.total_debt)} د
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-slate-400 dark:text-white/30">مسدد</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            customer.is_active 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          }`}>
                            {customer.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => startEdit(customer)}
                              className="flex items-center gap-2 px-5 h-12 rounded-[20px] font-black text-sm transition-all duration-200
                                bg-primary/10 text-primary border border-primary/20
                                hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/25
                                dark:bg-primary/20 dark:text-primary dark:border-primary/30
                                dark:hover:bg-primary dark:hover:text-white dark:hover:border-primary dark:hover:shadow-primary/30">
                              <Pencil className="w-4 h-4" /> تعديل
                            </button>
                            {+customer.total_debt > 0 && (
                              <button onClick={() => setPaymentCustomer(customer)}
                                className="flex items-center gap-2 px-5 h-12 rounded-[20px] font-black text-sm transition-all duration-200
                                  bg-emerald-500/10 text-emerald-600 border border-emerald-500/20
                                  hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25
                                  dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30
                                  dark:hover:bg-emerald-500 dark:hover:text-white dark:hover:border-emerald-500 dark:hover:shadow-emerald-500/30">
                                <CreditCard className="w-4 h-4" /> دفعة
                              </button>
                            )}
                            {+customer.total_debt < 0 && (
                              <button onClick={() => setSettlementCustomer(customer)}
                                className="flex items-center gap-2 px-5 h-12 rounded-[20px] font-black text-sm transition-all duration-200
                                  bg-amber-500/10 text-amber-600 border border-amber-500/20
                                  hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/25
                                  dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30
                                  dark:hover:bg-amber-500 dark:hover:text-white dark:hover:border-amber-500 dark:hover:shadow-amber-500/30">
                                <ArrowLeftRight className="w-4 h-4" /> تسوية
                              </button>
                            )}
                            <button onClick={() => setDeleteId(customer.id)}
                              className="flex items-center gap-2 px-5 h-12 rounded-[20px] font-black text-sm transition-all duration-200
                                bg-red-500/10 text-red-500 border border-red-500/20
                                hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-lg hover:shadow-red-500/25
                                dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30
                                dark:hover:bg-red-500 dark:hover:text-white dark:hover:border-red-500 dark:hover:shadow-red-500/30">
                              <Trash2 className="w-4 h-4" /> حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden flex flex-col gap-4">
                {displayCustomers.map(customer => (
                  <div key={customer.id} className="p-5 rounded-[24px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 font-black text-lg shadow-sm ${
                        customer.is_active ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}>
                        {customer.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-lg text-gray-900 dark:text-white truncate">{customer.name}</h3>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            customer.is_active 
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                          }`}>
                            {customer.is_active ? '✓ نشط' : '⏸ غير نشط'}
                          </span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="text-gray-400">📞</span>
                            <span className="font-medium">{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="text-gray-400">✉️</span>
                            <span className="font-medium truncate">{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Stats */}
                    <div className="mb-4">
                      <h4 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">الملف المالي</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">إجمالي المشتريات</div>
                          <div className="font-black text-xl text-blue-700 dark:text-blue-300">
                            {+customer.total_purchases > 0 ? (
                              <>
                                {customer.total_purchases}
                                <span className="text-sm font-bold text-blue-500 dark:text-blue-400 mr-1">د.ك</span>
                              </>
                            ) : (
                              <span className="text-blue-400 dark:text-blue-500">لا توجد مشتريات</span>
                            )}
                          </div>
                        </div>
                        
                        <div className={`p-4 rounded-xl border ${
                          +customer.total_debt > 0 
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                        }`}>
                          <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                            +customer.total_debt > 0 
                              ? 'text-red-600 dark:text-red-400'
                              : +customer.total_debt < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {+customer.total_debt > 0 ? 'مدين' : +customer.total_debt < 0 ? 'دائن' : 'الحالة المالية'}
                          </div>
                          <div className={`font-black text-xl ${
                            +customer.total_debt > 0 
                              ? 'text-red-700 dark:text-red-300'
                              : +customer.total_debt < 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {+customer.total_debt > 0 ? (
                              <>
                                {customer.total_debt}
                                <span className="text-sm font-bold text-red-500 dark:text-red-400 mr-1">د.ك</span>
                              </>
                            ) : +customer.total_debt < 0 ? (
                              <>
                                {Math.abs(+customer.total_debt)}
                                <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400 mr-1">د.ك</span>
                              </>
                            ) : (
                              'مسدد بالكامل'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Summary */}
                    {(customer.address || (+customer.total_purchases > 0 && +customer.total_debt === 0)) && (
                      <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        {customer.address && (
                          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="text-gray-400 mt-0.5">📍</span>
                            <span className="font-medium">{customer.address}</span>
                          </div>
                        )}
                        {(+customer.total_purchases > 0 && +customer.total_debt === 0) && (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                            <span>🌟</span>
                            <span className="font-bold">عميل مميز - جميع المدفوعات مسددة</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(customer)}
                        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all duration-200 font-bold text-sm shadow-sm">
                        <Pencil className="w-4 h-4" /> تعديل البيانات
                      </button>
                      <button onClick={() => setDeleteId(customer.id)}
                        className="flex items-center justify-center gap-2 px-4 h-12 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200 font-bold text-sm">
                        <Trash2 className="w-4 h-4" /> حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SpatialCard>

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
                {+paymentCustomer.total_debt !== 0 && (
                  <div className={`mb-4 px-4 py-3 rounded-[14px] font-bold text-sm ${
                    +paymentCustomer.total_debt > 0
                      ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {+paymentCustomer.total_debt > 0
                      ? `العميل مدين: ${paymentCustomer.total_debt} د`
                      : `المتجر دائن: ${Math.abs(+paymentCustomer.total_debt)} د`}
                  </div>
                )}
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
                    <button
                      onClick={() => setShowPaymentPad(true)}
                      className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold text-right cursor-pointer hover:border-primary/40 transition-all">
                      {paymentForm.amount || <span className="text-slate-400 dark:text-white/30">{paymentCustomer.total_debt || '0.00'}</span>}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
                    <input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="اختياري" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={submitPayment}
                      disabled={processing || !paymentForm.payment_method_id || !paymentForm.amount || (+paymentCustomer.total_debt > 0 && +paymentForm.amount > +paymentCustomer.total_debt)}
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
                    <button
                      onClick={() => setShowSettlementPad(true)}
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
            const clamped = max > 0 && +val > max ? paymentCustomer.total_debt : val;
            setPaymentForm(f => ({ ...f, amount: clamped }));
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

        {editingCustomer && createPortal(
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={() => setEditingCustomer(null)} />
            <div className="relative w-full max-w-xl animate-in fade-in zoom-in-95 duration-200 rounded-[30px] border border-black/10 dark:border-white/[0.12] shadow-2xl">
              <div className="absolute inset-0 rounded-[30px] dark:hidden pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(220,230,245,0.97) 100%)' }} />
              <div className="absolute inset-0 rounded-[30px] hidden dark:block pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(25,35,80,0.98) 0%, rgba(10,14,35,0.97) 100%)' }} />
              <div className="relative p-6 overflow-y-auto max-h-[90dvh] custom-scroll">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">تعديل: {editingCustomer.name}</h3>
                  <button onClick={() => setEditingCustomer(null)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:bg-black/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <CustomerForm form={editForm} isEdit onSubmit={() => submitEdit(editingCustomer.id)} onCancel={() => setEditingCustomer(null)} />
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </AppShell>
  );
}
