import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { ArrowRight, Plus, Trash2, Package, RefreshCw, RotateCcw } from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product       { id: number; name: string; }
interface Customer      { id: number; name: string; }
interface ReturnItem    { id: number; product: Product; quantity: string; unit_price: string; line_total: string; }
interface Settlement    { id: number; payment_method: { name: string }; amount: string; notes: string | null; created_at: string; }
interface InvoiceReturn {
    id: number; customer: Customer; invoice: { id: number } | null;
    total: string; recovered_amount: string; due_recovery: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null; created_at: string; deleted_at: string | null;
    items: ReturnItem[]; settlements: Settlement[];
}
interface Props {
    return:         InvoiceReturn;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface SettlementRow { payment_method_id: string; amount: string; notes: string; }
const emptyRow = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

const recoveryLabel = { unpaid: 'لم يُسترد', partial: 'مسترد جزئياً', paid: 'مسترد بالكامل' };
const recoveryClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceReturnsShow({ return: ret, paymentMethods, flash }: Props) {
    const [showForm,   setShowForm]   = useState(false);
    const [rows,       setRows]       = useState<SettlementRow[]>([emptyRow()]);
    const [submitting, setSubmitting] = useState(false);

    const methodOptions = paymentMethods.map(m => ({ label: m.name }));
    const due           = parseFloat(ret.due_recovery);
    const rowsTotal     = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const isCancelled   = !!ret.deleted_at;
    const isCash        = ret.customer.id === 1;

    function resolveMethodId(label: string) { return String(paymentMethods.find(m => m.name === label)?.id ?? ''); }
    function setRow(idx: number, field: keyof SettlementRow, val: string) {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function submitSettlements() {
        const valid = rows.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        if (valid.length === 0) return;
        setSubmitting(true);
        function postNext(i: number) {
            if (i >= valid.length) { setSubmitting(false); setRows([emptyRow()]); setShowForm(false); return; }
            const row = valid[i];
            router.post('/settlements', {
                customer_id:        String(ret.customer.id),
                invoice_id:         ret.invoice ? String(ret.invoice.id) : null,
                invoice_return_id:  String(ret.id),
                payment_method_id:  row.payment_method_id,
                amount:             row.amount,
                notes:              row.notes || null,
            }, { preserveScroll: true, onSuccess: () => postNext(i + 1), onError: () => setSubmitting(false) });
        }
        postNext(0);
    }

    return (
        <AppShell pageTitle={`مرتجع #${ret.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/invoice-returns" className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">مرتجع #{ret.id}</h1>
                            {!isCancelled && (
                                <span className={`text-sm font-bold px-3 py-1 rounded-[10px] ${recoveryClass[ret.recovery_status]}`}>
                                    {recoveryLabel[ret.recovery_status]}
                                </span>
                            )}
                            {isCancelled && <span className="text-sm font-bold px-3 py-1 rounded-[10px] bg-red-500/10 text-red-500">ملغي</span>}
                        </div>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">{ret.customer.name}</p>
                    </div>
                    {isCancelled && (
                        <button onClick={() => router.post(`/invoice-returns/${ret.id}/restore`)}
                            className="flex items-center gap-2 px-4 h-10 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                            <RotateCcw className="w-4 h-4" /> استعادة
                        </button>
                    )}
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'إجمالي المرتجع',   value: fmt(ret.total),            color: 'text-orange-500' },
                        { label: 'المسترد',           value: fmt(ret.recovered_amount), color: 'text-purple-500' },
                        { label: 'المتبقي',           value: fmt(ret.due_recovery),     color: due > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40' },
                        { label: 'الفاتورة المرجعية', value: ret.invoice ? `#${ret.invoice.id}` : 'مستقل', color: 'text-slate-800 dark:text-white' },
                    ].map(s => (
                        <div key={s.label} className="spatial-card p-4 flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{s.label}</span>
                            {s.label === 'الفاتورة المرجعية' && ret.invoice ? (
                                <Link href={`/invoices/${ret.invoice.id}`} className={`text-xl font-black ${s.color} hover:underline`}>{s.value}</Link>
                            ) : (
                                <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Items */}
                <SpatialCard title={`المنتجات المرتجعة (${ret.items.length})`} icon={<Package className="w-4 h-4" />}>
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
                                {ret.items.map(item => (
                                    <tr key={item.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{item.product.name}</td>
                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{parseFloat(item.quantity).toLocaleString('en-US')}</td>
                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{fmt(item.unit_price)}</td>
                                        <td className="px-4 py-3 font-black text-orange-500">{fmt(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SpatialCard>

                {/* Settlements */}
                <SpatialCard title={`التسويات (${ret.settlements.length})`} icon={<RefreshCw className="w-4 h-4" />}
                    action={
                        !isCancelled && !isCash && ret.recovery_status !== 'paid' && (
                            <button onClick={() => { setShowForm(p => !p); setRows([emptyRow()]); }}
                                className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-bold text-sm border border-purple-500/20">
                                <Plus className="w-3.5 h-3.5" /> تسجيل تسوية
                            </button>
                        )
                    }
                >
                    {showForm && (
                        <div className="mb-5 p-4 rounded-[20px] bg-purple-500/5 border border-purple-500/20 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="font-black text-slate-700 dark:text-white/80 text-sm">تسجيل تسوية جديدة</span>
                                <button onClick={() => setRows(p => [...p, emptyRow()])}
                                    className="flex items-center gap-1.5 px-3 h-8 rounded-[12px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-bold text-xs border border-purple-500/20">
                                    <Plus className="w-3 h-3" /> إضافة وسيلة
                                </button>
                            </div>
                            {rows.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                    <ModernSelect label="وسيلة التسوية" options={methodOptions}
                                        defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                        onSelect={val => setRow(idx, 'payment_method_id', resolveMethodId(val))} />
                                    <div className="flex flex-col gap-1.5 w-36">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                        <input type="number" min="0.01" step="0.01" value={row.amount}
                                            onChange={e => setRow(idx, 'amount', e.target.value)}
                                            placeholder={idx === 0 ? fmt(due) : '0.00'}
                                            className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                        <input value={row.notes} onChange={e => setRow(idx, 'notes', e.target.value)}
                                            placeholder="اختياري..." className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    <button onClick={() => rows.length > 1 ? setRows(p => p.filter((_, i) => i !== idx)) : null}
                                        disabled={rows.length === 1}
                                        className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {rows.length > 1 && (
                                <div className="flex items-center justify-between px-2">
                                    <span className="font-bold text-slate-500 dark:text-white/50 text-sm">إجمالي هذه التسوية</span>
                                    <span className="font-black text-purple-500">{fmt(rowsTotal)}</span>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={submitSettlements} disabled={submitting}
                                    className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
                                    {submitting ? 'جارٍ الحفظ...' : 'حفظ التسوية'}
                                </button>
                                <button onClick={() => setShowForm(false)} className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">إلغاء</button>
                            </div>
                        </div>
                    )}

                    {ret.settlements.length === 0 ? (
                        <p className="text-sm font-bold text-slate-400 dark:text-white/30 py-4 text-center">لا توجد تسويات مسجلة</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                        {['وسيلة التسوية', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                            <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {ret.settlements.map(s => (
                                        <tr key={s.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-white/80">{s.payment_method.name}</td>
                                            <td className="px-4 py-3 font-black text-purple-500">{fmt(s.amount)}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{s.notes ?? '—'}</td>
                                            <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                                            <td className="px-4 py-3">
                                                <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                    trigger={<button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs"><Trash2 className="w-3 h-3" /></button>} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SpatialCard>

                {ret.notes && (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ملاحظات</p>
                        <p className="font-bold text-slate-700 dark:text-white/80">{ret.notes}</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
