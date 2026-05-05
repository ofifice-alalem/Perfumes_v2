import { router } from '@inertiajs/react';
import { useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Plus, RefreshCw, X, Check } from 'lucide-react';

interface Supplier      { id: number; name: string; total_debt: string; }
interface PaymentMethod { id: number; name: string; }
interface SupplierSettlement {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    purchase_return: { id: number } | null;
    payment_method: PaymentMethod;
    amount: string;
    notes: string | null;
    created_at: string;
}
interface Paginated<T> {
    data: T[];
    total: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    settlements:    Paginated<SupplierSettlement>;
    suppliers:      Supplier[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

function fmt(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SupplierSettlementsIndex({ settlements, suppliers, paymentMethods, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);

    const form = useForm({
        supplier_id: '', purchase_id: '', payment_method_id: '', amount: '', notes: '',
    });

    const supplierOptions      = suppliers.map(s => ({ label: s.name, meta: fmt(s.total_debt) }));
    const paymentMethodOptions = paymentMethods.map(m => ({ label: m.name }));

    function resolveSupplierIdFromLabel(label: string): string {
        return String(suppliers.find(s => s.name === label)?.id ?? '');
    }
    function resolveMethodIdFromLabel(label: string): string {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    const selectedSupplier = suppliers.find(s => String(s.id) === form.data.supplier_id);
    const canSettle = selectedSupplier ? parseFloat(selectedSupplier.total_debt) < 0 : false;

    function submit() {
        form.post('/supplier-settlements', {
            onSuccess: () => { form.reset(); setShowCreate(false); },
        });
    }

    return (
        <AppShell pageTitle="تسويات الموردين">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تسويات الموردين</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تسجيل التسويات عندما يكون المورد دائناً</p>
                    </div>
                    <button onClick={() => setShowCreate(p => !p)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> تسوية جديدة
                    </button>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {showCreate && (
                    <SpatialCard title="تسوية جديدة" icon={<Plus className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <ModernSelect
                                    label="المورد"
                                    options={supplierOptions}
                                    defaultValue={selectedSupplier?.name ?? ''}
                                    onSelect={val => form.setData('supplier_id', resolveSupplierIdFromLabel(val))}
                                />
                                {form.errors.supplier_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.supplier_id}</p>}
                            </div>

                            {selectedSupplier && !canSettle && (
                                <div className="sm:col-span-2 lg:col-span-2 px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-center">
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                        ⚠️ لا يمكن إنشاء تسوية — المورد لا يزال مديناً ({fmt(selectedSupplier.total_debt)})
                                    </p>
                                </div>
                            )}

                            {canSettle && (
                                <>
                                    <div>
                                        <ModernSelect
                                            label="وسيلة الدفع"
                                            options={paymentMethodOptions}
                                            defaultValue={paymentMethods.find(m => String(m.id) === form.data.payment_method_id)?.name ?? ''}
                                            onSelect={val => form.setData('payment_method_id', resolveMethodIdFromLabel(val))}
                                        />
                                        {form.errors.payment_method_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.payment_method_id}</p>}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
                                        <input type="number" min="0.01" step="0.01" value={form.data.amount}
                                            onChange={e => form.setData('amount', e.target.value)}
                                            className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                        {form.errors.amount && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.amount}</p>}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                                        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظة</label>
                                        <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                            className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            {canSettle && (
                                <button onClick={submit} disabled={form.processing}
                                    className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
                                    <Check className="w-4 h-4" /> حفظ
                                </button>
                            )}
                            <button onClick={() => { setShowCreate(false); form.reset(); }}
                                className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </SpatialCard>
                )}

                <SpatialCard title={`التسويات (${settlements.total})`} icon={<RefreshCw className="w-4 h-4" />}>
                    {settlements.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">🔄</span>
                            <span className="font-bold">لا توجد تسويات بعد</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                        {['المورد', 'المرجع', 'وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                            <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {settlements.data.map(s => (
                                        <tr key={s.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{s.supplier.name}</td>
                                            <td className="px-4 py-3">
                                                {s.purchase_return ? (
                                                    <Link href={`/purchase-returns/${s.purchase_return.id}`} className="text-orange-500 font-bold hover:underline">مرتجع #{s.purchase_return.id}</Link>
                                                ) : s.purchase ? (
                                                    <Link href={`/purchases/${s.purchase.id}`} className="text-primary font-bold hover:underline">فاتورة #{s.purchase.id}</Link>
                                                ) : <span className="text-slate-400 dark:text-white/30 font-bold">مستقلة</span>}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{s.payment_method.name}</td>
                                            <td className="px-4 py-3 font-black text-purple-500">{fmt(s.amount)}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{s.notes ?? '—'}</td>
                                            <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">
                                                {new Date(s.created_at).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <DeleteModal
                                                    onConfirm={() => router.delete(`/supplier-settlements/${s.id}`)}
                                                    trigger={
                                                        <button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                            حذف
                                                        </button>
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SpatialCard>
            </div>
        </AppShell>
    );
}
