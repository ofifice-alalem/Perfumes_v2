import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Plus, Pencil, Trash2, X, Check, CreditCard } from 'lucide-react';

interface PaymentMethod {
    id: number;
    name: string;
    is_active: boolean;
}

interface Props {
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const emptyForm = { name: '', is_active: true };

export default function PaymentMethodsIndex({ paymentMethods, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ name: '', is_active: true });

    function startEdit(pm: PaymentMethod) {
        setEditingId(pm.id);
        editForm.setData({ name: pm.name, is_active: pm.is_active });
    }

    function submitCreate() {
        createForm.post('/payment-methods', {
            onSuccess: () => { createForm.reset(); setShowCreate(false); },
        });
    }

    function submitEdit(id: number) {
        editForm.put(`/payment-methods/${id}`, {
            onSuccess: () => setEditingId(null),
        });
    }

    return (
        <AppShell pageTitle="وسائل الدفع">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">وسائل الدفع</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إدارة وسائل الدفع المتاحة في النظام</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> إضافة وسيلة دفع
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                {/* Create Form */}
                {showCreate && (
                    <SpatialCard title="وسيلة دفع جديدة" icon={<Plus className="w-4 h-4" />}>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الاسم</label>
                                    <input value={createForm.data.name} onChange={e => createForm.setData('name', e.target.value)}
                                        placeholder="مثال: شبكة"
                                        className="spatial-input h-12 rounded-[16px] px-4 text-[16px] font-bold" />
                                    {createForm.errors.name && <p className="text-xs text-red-500 font-bold">{createForm.errors.name}</p>}
                                </div>
                                <div className="flex items-end gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none h-12 px-3 rounded-[16px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                        <span className="text-xs font-bold text-slate-600 dark:text-white/60">نشط</span>
                                        <div onClick={() => createForm.setData('is_active', !createForm.data.is_active)}
                                            className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-1 shrink-0 ${createForm.data.is_active ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${createForm.data.is_active ? '-translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </label>
                                    <button onClick={submitCreate} disabled={createForm.processing}
                                        className="spatial-button flex items-center gap-2 px-5 h-12 text-sm">
                                        <Check className="w-4 h-4" /> حفظ
                                    </button>
                                    <button onClick={() => { setShowCreate(false); createForm.reset(); }}
                                        className="h-12 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* List */}
                <SpatialCard title={`وسائل الدفع (${paymentMethods.length})`} icon={<CreditCard className="w-4 h-4" />}>
                    {paymentMethods.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">💳</span>
                            <span className="font-bold">لا توجد وسائل دفع بعد</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {paymentMethods.map(method => (
                                <div key={method.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                    {editingId === method.id ? (
                                        <div className="flex flex-col gap-3 flex-1">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الاسم</label>
                                                <input value={editForm.data.name} onChange={e => editForm.setData('name', e.target.value)}
                                                    className="spatial-input h-10 rounded-[12px] px-4 text-[14px] font-bold" />
                                                {editForm.errors.name && <p className="text-xs text-red-500 font-bold">{editForm.errors.name}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-2 cursor-pointer select-none h-10 px-3 rounded-[12px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-white/60">نشط</span>
                                                    <div onClick={() => editForm.setData('is_active', !editForm.data.is_active)}
                                                        className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 shrink-0 ${editForm.data.is_active ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${editForm.data.is_active ? '-translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </label>
                                                <button onClick={() => submitEdit(method.id)}
                                                    className="w-10 h-10 rounded-[12px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)}
                                                    className="w-10 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 flex items-center justify-center hover:bg-black/10 transition-all">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-[14px] bg-primary/10 flex items-center justify-center shrink-0">
                                                    <CreditCard className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 dark:text-white truncate">{method.name}</span>
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] ${method.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/8 text-slate-400 dark:text-white/40'}`}>
                                                            {method.is_active ? 'نشط' : 'موقوف'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:shrink-0">
                                                <button onClick={() => startEdit(method)}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                    <Pencil className="w-3.5 h-3.5" /> تعديل
                                                </button>
                                                <DeleteModal
                                                    onConfirm={() => router.delete(`/payment-methods/${method.id}`)}
                                                    trigger={
                                                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-9 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-3.5 h-3.5" /> حذف
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </SpatialCard>

            </div>
        </AppShell>
    );
}
