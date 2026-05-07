import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { ArrowRight, Plus, Trash2, Package, CreditCard, RotateCcw, RefreshCw, Edit } from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product       { id: number; name: string; }
interface Customer      { id: number; name: string; total_debt: string; }
interface Size          { id: number; label: string; }

interface InvoiceItem {
    id: number; product: Product; size: Size | null;
    sale_type: string; quantity: string; unit_price: string; line_total: string;
}
interface Payment {
    id: number; payment_method: { name: string };
    amount: string; notes: string | null; created_at: string;
}
interface Settlement {
    id: number; payment_method: { name: string };
    amount: string; notes: string | null; created_at: string;
}
interface ReturnItem { id: number; product: Product; quantity: string; line_total: string; }
interface InvoiceReturn {
    id: number; total: string; notes: string | null; created_at: string;
    items: ReturnItem[];
    settlement: Settlement | null;
}
interface Invoice {
    id: number; customer: Customer | null; user: { name: string } | null;
    total: string; paid_amount: string; due_amount: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null; created_at: string; deleted_at: string | null;
    items: InvoiceItem[];
    payments: Payment[];
    settlements: Settlement[];
    returns: InvoiceReturn[];
}
interface Props {
    invoice:        Invoice;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface PaymentRow    { payment_method_id: string; amount: string; notes: string; }
interface SettlementRow { payment_method_id: string; amount: string; notes: string; }
const emptyPayRow = (): PaymentRow       => ({ payment_method_id: '', amount: '', notes: '' });
const emptySetRow = (): SettlementRow    => ({ payment_method_id: '', amount: '', notes: '' });

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};
const saleTypeLabel: Record<string, string> = {
    tier_decant: 'زيتي/حجم', unit_decant: 'أصلي/تقسيم',
    full_bottle: 'عبوة كاملة', unit_based: 'وحدة',
};

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicesShow({ invoice, paymentMethods, flash }: Props) {
    const [activeTab,       setActiveTab]       = useState<'items'|'payments'|'settlements'|'returns'>('items');
    const [showPayForm,     setShowPayForm]      = useState(false);
    const [showSetForm,     setShowSetForm]      = useState(false);
    const [payRows,         setPayRows]          = useState<PaymentRow[]>([emptyPayRow()]);
    const [setRows,         setSetRows]          = useState<SettlementRow[]>([emptySetRow()]);
    const [submitting,      setSubmitting]       = useState(false);

    // NumberPad
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max); setPadCallback(() => cb); setShowPad(true);
    }

    const methodOptions = paymentMethods.map(m => ({ label: m.name }));
    function resolveMethodId(label: string) {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    const due          = parseFloat(invoice.due_amount);
    const customerDebt = parseFloat(invoice.customer?.total_debt ?? '0');
    const maxPayment   = Math.min(due, Math.max(0, customerDebt));
    const isCash       = invoice.customer?.id === 1 || !invoice.customer;
    const isCancelled  = !!invoice.deleted_at;

    // Payment rows helpers
    function setPayRow(idx: number, field: keyof PaymentRow, val: string) {
        setPayRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }
    const payRowsTotal = payRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    function submitPayments() {
        const valid = payRows.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        if (valid.length === 0) return;
        setSubmitting(true);
        function postNext(i: number) {
            if (i >= valid.length) { setSubmitting(false); setPayRows([emptyPayRow()]); setShowPayForm(false); return; }
            const row = valid[i];
            router.post('/payments', {
                customer_id:       String(invoice.customer?.id ?? 1),
                invoice_id:        String(invoice.id),
                payment_method_id: row.payment_method_id,
                amount:            row.amount,
                notes:             row.notes || null,
            }, { preserveScroll: true, onSuccess: () => postNext(i + 1), onError: () => setSubmitting(false) });
        }
        postNext(0);
    }

    // Settlement rows helpers
    function setSetRow(idx: number, field: keyof SettlementRow, val: string) {
        setSetRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }
    const setRowsTotal = setRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    function submitSettlements() {
        const valid = setRows.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        if (valid.length === 0) return;
        setSubmitting(true);
        function postNext(i: number) {
            if (i >= valid.length) { setSubmitting(false); setSetRows([emptySetRow()]); setShowSetForm(false); return; }
            const row = valid[i];
            router.post('/settlements', {
                customer_id:       String(invoice.customer?.id ?? 1),
                invoice_id:        String(invoice.id),
                payment_method_id: row.payment_method_id,
                amount:            row.amount,
                notes:             row.notes || null,
            }, { preserveScroll: true, onSuccess: () => postNext(i + 1), onError: () => setSubmitting(false) });
        }
        postNext(0);
    }

    const tabs = [
        { key: 'items',       label: `الأصناف (${invoice.items.length})` },
        { key: 'payments',    label: `الدفعات (${invoice.payments.length})` },
        { key: 'settlements', label: `التسويات (${invoice.settlements?.length ?? 0})` },
        { key: 'returns',     label: `المرتجعات (${invoice.returns.length})` },
    ] as const;

    return (
        <>
        <AppShell pageTitle={`فاتورة #${invoice.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/invoices" className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة #{invoice.id}</h1>
                            <span className={`text-sm font-bold px-3 py-1 rounded-[10px] ${statusClass[invoice.payment_status]}`}>
                                {statusLabel[invoice.payment_status]}
                            </span>
                            {isCancelled && <span className="text-sm font-bold px-3 py-1 rounded-[10px] bg-red-500/10 text-red-500">ملغية</span>}
                        </div>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">
                            {invoice.customer?.name ?? 'زبون نقدي'} — {invoice.user?.name ?? '—'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isCancelled && (
                            <Link href={`/invoices/${invoice.id}/edit`} className="flex items-center gap-2 px-4 h-10 rounded-[14px] border border-slate-300/50 dark:border-white/15 bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-black/10 transition-all font-bold text-sm">
                                <Edit className="w-4 h-4" /> تعديل
                            </Link>
                        )}
                        {isCancelled ? (
                            <button onClick={() => router.post(`/invoices/${invoice.id}/restore`)} className="flex items-center gap-2 px-4 h-10 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                <RotateCcw className="w-4 h-4" /> استعادة
                            </button>
                        ) : (
                            <Link href={`/invoice-returns/create?customer_id=${invoice.customer?.id ?? 1}&invoice_id=${invoice.id}`} className="flex items-center gap-2 px-4 h-10 rounded-[14px] border border-orange-500/30 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all font-bold text-sm">
                                <RotateCcw className="w-4 h-4" /> مرتجع
                            </Link>
                        )}
                    </div>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'الإجمالي',    value: fmt(invoice.total),              color: 'text-slate-800 dark:text-white' },
                        { label: 'المدفوع',     value: fmt(invoice.paid_amount),         color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'المتبقي',     value: fmt(invoice.due_amount),          color: due > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40' },
                        { label: 'دين العميل',  value: fmt(invoice.customer?.total_debt ?? '0'), color: customerDebt > 0 ? 'text-amber-500' : customerDebt < 0 ? 'text-purple-500' : 'text-slate-400 dark:text-white/40' },
                    ].map(s => (
                        <div key={s.label} className="spatial-card p-4 flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{s.label}</span>
                            <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-[16px] bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`flex-1 min-w-max px-4 h-10 rounded-[12px] font-bold text-sm transition-all whitespace-nowrap ${activeTab === t.key ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Items */}
                {activeTab === 'items' && (
                    <SpatialCard title={`الأصناف (${invoice.items.length})`} icon={<Package className="w-4 h-4" />}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                        {['المنتج', 'النوع', 'الحجم', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map(h => (
                                            <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {invoice.items.map(item => (
                                        <tr key={item.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{item.product.name}</td>
                                            <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/50 text-xs">{saleTypeLabel[item.sale_type] ?? item.sale_type}</td>
                                            <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/50">{item.size?.label ?? '—'}</td>
                                            <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{parseFloat(item.quantity).toLocaleString('en-US')}</td>
                                            <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{fmt(item.unit_price)}</td>
                                            <td className="px-4 py-3 font-black text-slate-800 dark:text-white">{fmt(item.line_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SpatialCard>
                )}

                {/* Tab: Payments */}
                {activeTab === 'payments' && (
                    <SpatialCard title={`الدفعات (${invoice.payments.length})`} icon={<CreditCard className="w-4 h-4" />}
                        action={
                            !isCash && !isCancelled && invoice.payment_status !== 'paid' && maxPayment > 0 && (
                                <button onClick={() => { setShowPayForm(p => !p); setPayRows([emptyPayRow()]); }}
                                    className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm border border-primary/20">
                                    <Plus className="w-3.5 h-3.5" /> تسجيل دفع
                                </button>
                            )
                        }
                    >
                        {showPayForm && (
                            <div className="mb-5 p-4 rounded-[20px] bg-primary/5 border border-primary/20 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-black text-slate-700 dark:text-white/80 text-sm">تسجيل دفعات جديدة</span>
                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">الحد الأقصى: {fmt(maxPayment)}</span>
                                    </div>
                                    <button onClick={() => setPayRows(p => [...p, emptyPayRow()])}
                                        className="flex items-center gap-1.5 px-3 h-8 rounded-[12px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs border border-primary/20">
                                        <Plus className="w-3 h-3" /> إضافة وسيلة
                                    </button>
                                </div>
                                {payRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                        <ModernSelect label="وسيلة الدفع" options={methodOptions}
                                            defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                            onSelect={val => setPayRow(idx, 'payment_method_id', resolveMethodId(val))} />
                                        <div className="flex flex-col gap-1.5 w-36">
                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                            <button onClick={() => openPad('المبلغ', row.amount || fmt(maxPayment), v => setPayRow(idx, 'amount', v), maxPayment)}
                                                className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                                                {row.amount || <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(maxPayment)}</span>}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                            <input value={row.notes} onChange={e => setPayRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..." className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                        </div>
                                        <button onClick={() => payRows.length > 1 ? setPayRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={payRows.length === 1}
                                            className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {payRows.length > 1 && (
                                    <div className="flex items-center justify-between px-2">
                                        <span className="font-bold text-slate-500 dark:text-white/50 text-sm">إجمالي هذه الدفعات</span>
                                        <span className={`font-black ${payRowsTotal > maxPayment ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {fmt(payRowsTotal)}{payRowsTotal > maxPayment && <span className="text-xs mr-1">(يتجاوز الحد)</span>}
                                        </span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={submitPayments} disabled={submitting || payRowsTotal > maxPayment || payRowsTotal <= 0}
                                        className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
                                        {submitting ? 'جارٍ الحفظ...' : 'حفظ الدفعات'}
                                    </button>
                                    <button onClick={() => setShowPayForm(false)} className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">إلغاء</button>
                                </div>
                            </div>
                        )}
                        {invoice.payments.length === 0 ? (
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
                                        {invoice.payments.map(pay => (
                                            <tr key={pay.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-700 dark:text-white/80">{pay.payment_method.name}</td>
                                                <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400">{fmt(pay.amount)}</td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{pay.notes ?? '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">{new Date(pay.created_at).toLocaleDateString('en-GB')}</td>
                                                <td className="px-4 py-3">
                                                    {!isCancelled && (
                                                        <DeleteModal onConfirm={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                            trigger={<button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs"><Trash2 className="w-3 h-3" /></button>} />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SpatialCard>
                )}

                {/* Tab: Settlements */}
                {activeTab === 'settlements' && (
                    <SpatialCard title={`التسويات (${invoice.settlements?.length ?? 0})`} icon={<RefreshCw className="w-4 h-4" />}
                        action={
                            !isCash && !isCancelled && customerDebt < 0 && (
                                <button onClick={() => { setShowSetForm(p => !p); setSetRows([emptySetRow()]); }}
                                    className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-bold text-sm border border-purple-500/20">
                                    <Plus className="w-3.5 h-3.5" /> إضافة تسوية
                                </button>
                            )
                        }
                    >
                        {showSetForm && (
                            <div className="mb-5 p-4 rounded-[20px] bg-purple-500/5 border border-purple-500/20 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-slate-700 dark:text-white/80 text-sm">تسجيل تسوية جديدة</span>
                                    <button onClick={() => setSetRows(p => [...p, emptySetRow()])}
                                        className="flex items-center gap-1.5 px-3 h-8 rounded-[12px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-bold text-xs border border-purple-500/20">
                                        <Plus className="w-3 h-3" /> إضافة وسيلة
                                    </button>
                                </div>
                                {setRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                        <ModernSelect label="وسيلة التسوية" options={methodOptions}
                                            defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                            onSelect={val => setSetRow(idx, 'payment_method_id', resolveMethodId(val))} />
                                        <div className="flex flex-col gap-1.5 w-36">
                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                            <button onClick={() => openPad('المبلغ', row.amount, v => setSetRow(idx, 'amount', v))}
                                                className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                                                {row.amount || '0.00'}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                            <input value={row.notes} onChange={e => setSetRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..." className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                        </div>
                                        <button onClick={() => setRows.length > 1 ? setSetRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={setRows.length === 1}
                                            className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <button onClick={submitSettlements} disabled={submitting || setRowsTotal <= 0}
                                        className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
                                        {submitting ? 'جارٍ الحفظ...' : 'حفظ التسوية'}
                                    </button>
                                    <button onClick={() => setShowSetForm(false)} className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">إلغاء</button>
                                </div>
                            </div>
                        )}
                        {!invoice.settlements || invoice.settlements.length === 0 ? (
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
                                        {invoice.settlements?.map(s => (
                                            <tr key={s.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-700 dark:text-white/80">{s.payment_method.name}</td>
                                                <td className="px-4 py-3 font-black text-purple-500">{fmt(s.amount)}</td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{s.notes ?? '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                                                <td className="px-4 py-3">
                                                    {!isCancelled && (
                                                        <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                            trigger={<button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs"><Trash2 className="w-3 h-3" /></button>} />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SpatialCard>
                )}

                {/* Tab: Returns */}
                {activeTab === 'returns' && (
                    <SpatialCard title={`المرتجعات (${invoice.returns.length})`} icon={<RotateCcw className="w-4 h-4" />}
                        action={
                            !isCancelled && (
                                <Link href={`/invoice-returns/create?customer_id=${invoice.customer?.id ?? 1}&invoice_id=${invoice.id}`}
                                    className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all font-bold text-sm border border-orange-500/20">
                                    <Plus className="w-3.5 h-3.5" /> مرتجع جديد
                                </Link>
                            )
                        }
                    >
                        {invoice.returns.length === 0 ? (
                            <p className="text-sm font-bold text-slate-400 dark:text-white/30 py-4 text-center">لا توجد مرتجعات</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {invoice.returns.map(ret => (
                                    <div key={ret.id} className="p-4 rounded-[16px] bg-orange-500/5 border border-orange-500/15">
                                        <div className="flex items-center justify-between mb-3">
                                            <Link href={`/invoice-returns/${ret.id}`} className="font-black text-slate-800 dark:text-white hover:text-primary transition-colors">
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
                        )}
                    </SpatialCard>
                )}

                {invoice.notes && (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ملاحظات</p>
                        <p className="font-bold text-slate-700 dark:text-white/80">{invoice.notes}</p>
                    </div>
                )}
            </div>
        </AppShell>

        <NumberPadModal isOpen={showPad} title={padTitle} initialValue={padInitial} maxValue={padMax}
            onClose={() => setShowPad(false)} onConfirm={v => { padCallback?.(v); setShowPad(false); }} />
        </>
    );
}
