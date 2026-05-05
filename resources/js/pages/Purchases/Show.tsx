import { useState } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { ArrowRight, Plus, Trash2, Package, CreditCard, RefreshCw, RotateCcw } from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product       { id: number; name: string; }
interface Supplier      { id: number; name: string; total_debt: string; }

interface PurchaseItem {
    id: number; product: Product;
    quantity: string; unit_cost: string; line_total: string;
}
interface SupplierPayment {
    id: number; payment_method: { name: string };
    amount: string; notes: string | null; created_at: string;
}
interface SupplierSettlement {
    id: number; payment_method: { name: string };
    amount: string; notes: string | null; created_at: string;
}
interface ReturnItem { id: number; product: Product; quantity: string; line_total: string; }
interface PurchaseReturn {
    id: number; total: string; notes: string | null; created_at: string;
    items: ReturnItem[];
    settlement: SupplierSettlement | null;
}
interface Purchase {
    id: number; supplier: Supplier;
    total: string; paid_amount: string; due_amount: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null; created_at: string;
    items: PurchaseItem[];
    payments: SupplierPayment[];
    returns: PurchaseReturn[];
}
interface Props {
    purchase:       Purchase;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchasesShow({ purchase, paymentMethods, flash }: Props) {
    const [showPaymentForm, setShowPaymentForm]       = useState(false);
    const [showSettlementForm, setShowSettlementForm] = useState(false);

    const paymentForm = useForm({
        supplier_id:       String(purchase.supplier.id),
        purchase_id:       String(purchase.id),
        payment_method_id: '',
        amount:            '',
        notes:             '',
    });

    const settlementForm = useForm({
        supplier_id:       String(purchase.supplier.id),
        purchase_id:       String(purchase.id),
        payment_method_id: '',
        amount:            '',
        notes:             '',
    });

    const paymentMethodOptions = paymentMethods.map(m => ({ label: m.name }));

    function resolveMethodId(label: string): string {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    function submitPayment() {
        paymentForm.post('/supplier-payments', {
            onSuccess: () => { paymentForm.reset('payment_method_id', 'amount', 'notes'); setShowPaymentForm(false); },
        });
    }

    function submitSettlement() {
        settlementForm.post('/supplier-settlements', {
            onSuccess: () => { settlementForm.reset('payment_method_id', 'amount', 'notes'); setShowSettlementForm(false); },
        });
    }

    const isCash = purchase.supplier.id === 1;
    const supplierDebt = parseFloat(purchase.supplier.total_debt);

    return (
        <AppShell pageTitle={`فاتورة #${purchase.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/purchases" className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة #{purchase.id}</h1>
                            <span className={`text-sm font-bold px-3 py-1 rounded-[10px] ${statusClass[purchase.payment_status]}`}>
                                {statusLabel[purchase.payment_status]}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">{purchase.supplier.name}</p>
                    </div>
                    <Link href={`/purchase-returns/create?purchase_id=${purchase.id}&supplier_id=${purchase.supplier.id}`}
                        className="flex items-center gap-2 px-4 h-10 rounded-[14px] border border-orange-500/30 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all font-bold text-sm">
                        <RotateCcw className="w-4 h-4" /> مرتجع
                    </Link>
                </div>

                {flash?.success && (
                    <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'الإجمالي',   value: fmt(purchase.total),       color: 'text-slate-800 dark:text-white' },
                        { label: 'المدفوع',    value: fmt(purchase.paid_amount),  color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'المتبقي',    value: fmt(purchase.due_amount),   color: 'text-amber-500' },
                        { label: 'دين المورد', value: fmt(purchase.supplier.total_debt), color: supplierDebt > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40' },
                    ].map(s => (
                        <div key={s.label} className="spatial-card p-4 flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{s.label}</span>
                            <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* Items */}
                <SpatialCard title={`المنتجات (${purchase.items.length})`} icon={<Package className="w-4 h-4" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                    {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map(h => (
                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {purchase.items.map(item => (
                                    <tr key={item.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{item.product.name}</td>
                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{parseFloat(item.quantity).toLocaleString('en-US')}</td>
                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{fmt(item.unit_cost)}</td>
                                        <td className="px-4 py-3 font-black text-slate-800 dark:text-white">{fmt(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SpatialCard>

                {/* Payments */}
                <SpatialCard title={`الدفعات (${purchase.payments.length})`} icon={<CreditCard className="w-4 h-4" />}
                    action={
                        !isCash && purchase.payment_status !== 'paid' && (
                            <button onClick={() => setShowPaymentForm(p => !p)}
                                className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm border border-primary/20">
                                <Plus className="w-3.5 h-3.5" /> دفعة جديدة
                            </button>
                        )
                    }
                >
                    {showPaymentForm && (
                        <div className="mb-4 p-4 rounded-[16px] bg-primary/5 border border-primary/20 flex flex-col gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <ModernSelect
                                    label="وسيلة الدفع"
                                    options={paymentMethodOptions}
                                    defaultValue={paymentMethods.find(m => String(m.id) === paymentForm.data.payment_method_id)?.name ?? ''}
                                    onSelect={val => paymentForm.setData('payment_method_id', resolveMethodId(val))}
                                />
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                    <input type="number" min="0.01" step="0.01" value={paymentForm.data.amount}
                                        onChange={e => paymentForm.setData('amount', e.target.value)}
                                        placeholder={`المتبقي: ${fmt(purchase.due_amount)}`}
                                        className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                    {paymentForm.errors.amount && <p className="text-xs text-red-500 font-bold">{paymentForm.errors.amount}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                    <input value={paymentForm.data.notes} onChange={e => paymentForm.setData('notes', e.target.value)}
                                        className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={submitPayment} disabled={paymentForm.processing}
                                    className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
                                    حفظ الدفعة
                                </button>
                                <button onClick={() => setShowPaymentForm(false)}
                                    className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    )}

                    {purchase.payments.length === 0 ? (
                        <p className="text-sm font-bold text-slate-400 dark:text-white/30 py-4 text-center">لا توجد دفعات مسجلة</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                        {['وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                            <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {purchase.payments.map(pay => (
                                        <tr key={pay.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-white/80">{pay.payment_method.name}</td>
                                            <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400">{fmt(pay.amount)}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{pay.notes ?? '—'}</td>
                                            <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">
                                                {new Date(pay.created_at).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <DeleteModal
                                                    onConfirm={() => router.delete(`/supplier-payments/${pay.id}`)}
                                                    trigger={
                                                        <button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                            <Trash2 className="w-3 h-3" />
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

                {/* Settlements */}
                {!isCash && (
                    <SpatialCard title="التسويات" icon={<RefreshCw className="w-4 h-4" />}
                        action={
                            supplierDebt < 0 && (
                                <button onClick={() => setShowSettlementForm(p => !p)}
                                    className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-bold text-sm border border-purple-500/20">
                                    <Plus className="w-3.5 h-3.5" /> تسوية جديدة
                                </button>
                            )
                        }
                    >
                        {showSettlementForm && (
                            <div className="mb-4 p-4 rounded-[16px] bg-purple-500/5 border border-purple-500/20 flex flex-col gap-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <ModernSelect
                                        label="وسيلة الدفع"
                                        options={paymentMethodOptions}
                                        defaultValue={paymentMethods.find(m => String(m.id) === settlementForm.data.payment_method_id)?.name ?? ''}
                                        onSelect={val => settlementForm.setData('payment_method_id', resolveMethodId(val))}
                                    />
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                        <input type="number" min="0.01" step="0.01" value={settlementForm.data.amount}
                                            onChange={e => settlementForm.setData('amount', e.target.value)}
                                            className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                        <input value={settlementForm.data.notes} onChange={e => settlementForm.setData('notes', e.target.value)}
                                            className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={submitSettlement} disabled={settlementForm.processing}
                                        className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
                                        حفظ التسوية
                                    </button>
                                    <button onClick={() => setShowSettlementForm(false)}
                                        className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}
                        <p className="text-sm font-bold text-slate-400 dark:text-white/30 py-4 text-center">
                            {supplierDebt >= 0 ? 'لا حاجة لتسوية — المورد لا يزال مديناً' : 'المورد دائن — يمكن إنشاء تسوية'}
                        </p>
                    </SpatialCard>
                )}

                {/* Returns */}
                {purchase.returns.length > 0 && (
                    <SpatialCard title={`المرتجعات (${purchase.returns.length})`} icon={<RotateCcw className="w-4 h-4" />}>
                        <div className="flex flex-col gap-3">
                            {purchase.returns.map(ret => (
                                <div key={ret.id} className="p-4 rounded-[16px] bg-orange-500/5 border border-orange-500/15">
                                    <div className="flex items-center justify-between mb-3">
                                        <Link href={`/purchase-returns/${ret.id}`}
                                            className="font-black text-slate-800 dark:text-white hover:text-primary transition-colors">
                                            مرتجع #{ret.id}
                                        </Link>
                                        <span className="font-black text-orange-500">{fmt(ret.total)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {ret.items.map(i => (
                                            <span key={i.id} className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60">
                                                {i.product.name} × {parseFloat(i.quantity).toLocaleString('en-US')}
                                            </span>
                                        ))}
                                    </div>
                                    {ret.settlement && (
                                        <p className="text-xs font-bold text-purple-500 mt-2">✓ تسوية مرتبطة: {fmt(ret.settlement.amount)}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </SpatialCard>
                )}
            </div>
        </AppShell>
    );
}
