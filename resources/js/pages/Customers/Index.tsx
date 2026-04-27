import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Pencil, Trash2, X, Check, Users, AlertCircle } from 'lucide-react';

interface Customer {
  id: number; name: string; phone: string | null;
  email: string | null; address: string | null;
  total_purchases: string; total_debt: string; is_active: boolean;
}

interface Props {
  customers: Customer[];
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

export default function CustomersIndex({ customers, flash }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
            <div className="flex flex-col gap-2">
              {displayCustomers.map(customer => (
                <div key={customer.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${customer.is_active ? 'bg-primary/10 text-primary' : 'bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/30'}`}>
                      {customer.name.charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white truncate">{customer.name}</span>
                        {!customer.is_active && <span className="text-xs font-bold text-slate-400 dark:text-white/30">(غير نشط)</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {customer.phone && <span className="text-xs font-bold text-slate-400 dark:text-white/40">{customer.phone}</span>}
                        {+customer.total_debt > 0 && (
                          <span className="flex items-center gap-1 text-xs font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-[6px]">
                            <AlertCircle className="w-3 h-3" />
                            دين: {customer.total_debt}
                          </span>
                        )}
                        {+customer.total_purchases > 0 && (
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">
                            مشتريات: {customer.total_purchases}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <button onClick={() => startEdit(customer)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                      <Pencil className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <button onClick={() => setDeleteId(customer.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 font-bold text-sm">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpatialCard>

        <ConfirmModal isOpen={deleteId !== null} onConfirm={() => deleteId && deleteCustomer(deleteId)} onCancel={() => setDeleteId(null)} />

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
