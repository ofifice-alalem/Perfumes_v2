import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { Plus, Pencil, Trash2, X, Check, Truck, Phone, Mail, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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

interface Props {
  suppliers: Supplier[];
  flash?: { success?: string; error?: string };
}

const emptyForm = {
  name: '', phone: '', email: '', address: '', is_active: true,
};

export default function SuppliersIndex({ suppliers, flash }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createForm = useForm({ ...emptyForm });
  const editForm = useForm({ ...emptyForm });

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    editForm.setData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      is_active: supplier.is_active,
    });
  }

  function submitCreate() {
    createForm.post('/suppliers', {
      onSuccess: () => { createForm.reset(); setShowCreate(false); },
    });
  }

  function submitEdit(id: number) {
    editForm.put(`/suppliers/${id}`, {
      onSuccess: () => setEditingId(null),
    });
  }

  function deleteSupplier(id: number) {
    router.delete(`/suppliers/${id}`, { onSuccess: () => setDeleteId(null) });
  }

  return (
    <AppShell pageTitle="Step 6 — المشتريات والمخزون">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">الموردون</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{suppliers.length} مورد مسجل</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="spatial-button flex items-center gap-2 px-5 h-11 text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة مورد
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
          <SpatialCard title="مورد جديد" icon={<Plus className="w-4 h-4" />}>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم المورد</label>
                  <input
                    value={createForm.data.name}
                    onChange={e => createForm.setData('name', e.target.value)}
                    placeholder="مثال: شركة العطور الدولية"
                    className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                  />
                  {createForm.errors.name && <p className="text-xs text-red-500 font-bold">{createForm.errors.name}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">رقم الهاتف</label>
                  <input
                    value={createForm.data.phone}
                    onChange={e => createForm.setData('phone', e.target.value)}
                    placeholder="مثال: 0501234567"
                    className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                  />
                  {createForm.errors.phone && <p className="text-xs text-red-500 font-bold">{createForm.errors.phone}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={createForm.data.email}
                    onChange={e => createForm.setData('email', e.target.value)}
                    placeholder="مثال: info@supplier.com"
                    className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                  />
                  {createForm.errors.email && <p className="text-xs text-red-500 font-bold">{createForm.errors.email}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">العنوان</label>
                  <input
                    value={createForm.data.address}
                    onChange={e => createForm.setData('address', e.target.value)}
                    placeholder="مثال: الرياض"
                    className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={submitCreate} disabled={createForm.processing}
                  className="spatial-button flex items-center gap-2 px-5 h-12 text-sm">
                  <Check className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                  className="h-12 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </SpatialCard>
        )}

        {/* List */}
        <SpatialCard title={`الموردون (${suppliers.length})`} icon={<Truck className="w-4 h-4" />}>
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">🚚</span>
              <span className="font-bold">لا توجد موردين بعد</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {suppliers.map(supplier => (
                <div key={supplier.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">

                  {editingId === supplier.id ? (
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={editForm.data.name}
                          onChange={e => editForm.setData('name', e.target.value)}
                          className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold"
                        />
                        <input
                          value={editForm.data.phone}
                          onChange={e => editForm.setData('phone', e.target.value)}
                          className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold"
                        />
                        <input
                          type="email"
                          value={editForm.data.email}
                          onChange={e => editForm.setData('email', e.target.value)}
                          className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold"
                        />
                        <input
                          value={editForm.data.address}
                          onChange={e => editForm.setData('address', e.target.value)}
                          className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editForm.setData('is_active', !editForm.data.is_active)}
                          className={`flex items-center gap-2 px-3 h-8 rounded-[10px] font-bold text-xs transition-all ${
                            editForm.data.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}
                        >
                          {editForm.data.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {editForm.data.is_active ? 'نشط' : 'غير نشط'}
                        </button>
                        <button onClick={() => submitEdit(supplier.id)}
                          className="w-11 h-8 rounded-[10px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shrink-0">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="w-11 h-8 rounded-[10px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 flex items-center justify-center hover:bg-black/10 transition-all shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center shrink-0">
                          <Truck className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-white truncate">{supplier.name}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-[6px] ${
                              supplier.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {supplier.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-white/50">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{supplier.phone}</span>
                            </div>
                            {supplier.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{supplier.email}</span>
                              </div>
                            )}
                            {supplier.address && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{supplier.address}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-400 dark:text-white/40">إجمالي المشتريات</span>
                              <span className="font-black text-primary text-sm">{supplier.total_purchases} د</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-400 dark:text-white/40">الديون</span>
                              <span className={`font-black text-sm ${
                                +supplier.total_debt > 0 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'
                              }`}>
                                {supplier.total_debt} د
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <button onClick={() => startEdit(supplier)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button onClick={() => setDeleteId(supplier.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 font-bold text-sm">
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
        onConfirm={() => deleteId && deleteSupplier(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

    </AppShell>
  );
}