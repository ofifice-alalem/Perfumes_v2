import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { ArrowRight, Plus, Trash2, Package, CreditCard, RotateCcw } from 'lucide-react';

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
    deleted_at: string | null;
    items: PurchaseItem[];
    payments: SupplierPayment[];
    returns: PurchaseReturn[];
}
interface Props {
    purchase:       Purchase;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface PaymentRow { payment_method_id: string; amount: string; notes: string; }
const emptyRow = (): PaymentRow => ({ payment_method_id: '', amount: '', notes: '' });

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass  = {
    unpaid:  'bg-red-500/10 text-red-500 border border-red-500/20',
    partial: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchasesShow({ purchase, paymentMethods, flash }: Props) {
    const [activeTab,        setActiveTab]       = useState<'items' | 'payments' | 'returns'>('items');
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentRows,     setPaymentRows]     = useState<PaymentRow[]>([emptyRow()]);
    const [submitting,      setSubmitting]      = useState(false);

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

    function setRow(idx: number, field: keyof PaymentRow, val: string) {
        setPaymentRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    const due          = parseFloat(purchase.due_amount);
    const supplierDebt = parseFloat(purchase.supplier.total_debt);
    // الحد الأقصى للدفعة = أصغر قيمة بين متبقي الفاتورة ودين المورد
    const maxPayment   = Math.min(due, supplierDebt);
    const rowsTotal    = paymentRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    function submitPayments() {
        const valid = paymentRows.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        if (valid.length === 0) return;
        setSubmitting(true);

        function postNext(i: number) {
            if (i >= valid.length) {
                setSubmitting(false);
                setPaymentRows([emptyRow()]);
                setShowPaymentForm(false);
                return;
            }
            const row = valid[i];
            router.post('/supplier-payments', {
                supplier_id:       String(purchase.supplier.id),
                purchase_id:       String(purchase.id),
                payment_method_id: row.payment_method_id,
                amount:            row.amount,
                notes:             row.notes || null,
            }, {
                preserveScroll: true,
                onSuccess: () => postNext(i + 1),
                onError:   () => setSubmitting(false),
            });
        }
        postNext(0);
    }

    const isCash      = purchase.supplier.id === 1;
    const isCancelled = !!purchase.deleted_at;

    const tabs = [
        { key: 'items',    label: `المنتجات (${purchase.items.length})` },
        { key: 'payments', label: `الدفعات (${purchase.payments.length})` },
        { key: 'returns',  label: `المرتجعات (${purchase.returns.length})` },
    ] as const;

    return (
        <>
        <AppShell pageTitle={`فاتورة شراء #${purchase.id}`}>
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/purchases" className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-black/5 dark:bg-white/8 border-2 border-black/5 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-black/10 transition-all shrink-0 active:scale-95 shadow-sm">
                            <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">فاتورة شراء #{purchase.id}</h1>
                                <span className={`text-base font-black px-4 py-2 rounded-[14px] ${statusClass[purchase.payment_status]}`}>
                                    {statusLabel[purchase.payment_status]}
                                </span>
                                {isCancelled && (
                                    <span className="text-base font-black px-4 py-2 rounded-[14px] bg-red-500/10 text-red-500 border border-red-500/20">ملغية</span>
                                )}
                            </div>
                            <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">المورد: {purchase.supplier.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isCancelled ? (
                            <button onClick={() => router.post(`/purchases/${purchase.id}/restore`)}
                                className="px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-2xl border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3">
                                <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة الفاتورة
                            </button>
                        ) : (
                            <Link href={`/purchase-returns/create?purchase_id=${purchase.id}&supplier_id=${purchase.supplier.id}`}
                                className="px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-2xl border-2 border-orange-500/30 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3">
                                <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> إنشاء مرتجع
                            </Link>
                        )}
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="px-6 py-4 rounded-[22px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg sm:text-xl shadow-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="px-6 py-4 rounded-[22px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg sm:text-xl shadow-sm">
                        {flash.error}
                    </div>
                )}

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[
                        { label: 'إجمالي الفاتورة', value: `${fmt(purchase.total)} د.ل`, color: 'text-slate-800 dark:text-white' },
                        { label: 'إجمالي المدفوع',  value: `${fmt(purchase.paid_amount)} د.ل`, color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'المبلغ المتبقي',  value: `${fmt(purchase.due_amount)} د.ل`, color: due > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40' },
                        { label: 'دين المورد الكلي', value: `${fmt(purchase.supplier.total_debt)} د.ل`, color: supplierDebt > 0 ? 'text-purple-500' : 'text-slate-400 dark:text-white/40' },
                    ].map((s, idx) => (
                        <div key={idx} className="p-6 sm:p-7 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-black/5 dark:border-white/10 shadow-lg flex flex-col gap-2">
                            <span className="text-xs sm:text-sm font-black text-slate-400 dark:text-white/50 uppercase tracking-widest">{s.label}</span>
                            <span className={`text-2xl sm:text-4xl font-black ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* Tabs Bar */}
                <div className="flex gap-2.5 p-2 rounded-[24px] bg-black/5 dark:bg-white/5 border-2 border-black/8 dark:border-white/10 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`flex-1 min-w-max px-8 h-16 sm:h-20 rounded-[20px] font-black text-lg sm:text-2xl transition-all whitespace-nowrap border-2 ${activeTab === t.key ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white border-primary shadow-lg scale-[1.01]' : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab 1: Products */}
                {activeTab === 'items' && (
                    <SpatialCard title={`المنتجات المسجلة (${purchase.items.length})`} icon={<Package className="w-6 h-6 text-primary" />}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                        {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map(h => (
                                            <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {purchase.items.map(item => (
                                        <tr key={item.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                            <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{item.product.name}</td>
                                            <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/80 text-xl">{parseFloat(item.quantity).toLocaleString('en-US')}</td>
                                            <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/80 text-xl">{fmt(item.unit_cost)} د.ل</td>
                                            <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{fmt(item.line_total)} د.ل</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SpatialCard>
                )}

                {/* Tab 2: Payments */}
                {activeTab === 'payments' && (
                    <SpatialCard title={`الدفعات المسجلة (${purchase.payments.length})`} icon={<CreditCard className="w-6 h-6 text-primary" />}
                        action={
                            !isCash && !isCancelled && purchase.payment_status !== 'paid' && maxPayment > 0 && (
                                <button onClick={() => { setShowPaymentForm(p => !p); setPaymentRows([emptyRow()]); }}
                                    className="flex items-center gap-2.5 px-6 h-14 sm:h-16 rounded-[20px] bg-primary text-white hover:bg-primary/90 transition-all font-black text-base sm:text-xl shadow-lg active:scale-95">
                                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> تسجيل دفع
                                </button>
                            )
                        }
                    >
                        {showPaymentForm && (
                            <div className="mb-6 p-6 sm:p-8 rounded-[28px] bg-primary/5 border-2 border-primary/20 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-black text-slate-800 dark:text-white text-xl">تسجيل دفعات جديدة</span>
                                        <span className="text-sm font-bold text-slate-500 dark:text-white/60">
                                            الحد الأقصى: {fmt(maxPayment)} د.ل (أصغر قيمة بين المتبقي ودين المورد)
                                        </span>
                                    </div>
                                    <button onClick={() => setPaymentRows(p => [...p, emptyRow()])}
                                        className="flex items-center gap-2 px-5 h-12 rounded-[16px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base border-2 border-primary/20">
                                        <Plus className="w-5 h-5" /> إضافة وسيلة
                                    </button>
                                </div>

                                {paymentRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-end p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border-2 border-black/5 dark:border-white/10">
                                        <ModernSelect
                                            label="وسيلة الدفع"
                                            options={methodOptions}
                                            defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                            onSelect={val => setRow(idx, 'payment_method_id', resolveMethodId(val))}
                                        />
                                        <div className="flex flex-col gap-2 w-full md:w-44">
                                            <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                            <button
                                                onClick={() => openPad('المبلغ', row.amount || fmt(maxPayment), v => setRow(idx, 'amount', v), maxPayment)}
                                                className="spatial-input h-16 rounded-[20px] px-5 text-xl font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                                                {row.amount || <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(maxPayment)}</span>}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                            <input value={row.notes}
                                                onChange={e => setRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..."
                                                className="spatial-input h-16 rounded-[20px] px-5 text-lg font-bold" />
                                        </div>
                                        <button onClick={() => paymentRows.length > 1 ? setPaymentRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={paymentRows.length === 1}
                                            className="w-16 h-16 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                                            <Trash2 className="w-6 h-6" />
                                        </button>
                                    </div>
                                ))}

                                {paymentRows.length > 1 && (
                                    <div className="flex items-center justify-between px-2">
                                        <span className="font-black text-slate-600 dark:text-white/70 text-base">إجمالي الدفعات</span>
                                        <span className={`font-black text-2xl ${rowsTotal > maxPayment ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {fmt(rowsTotal)} د.ل
                                            {rowsTotal > maxPayment && <span className="text-sm mr-2">(يتجاوز الحد الأقصى)</span>}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 pt-2">
                                    <button onClick={submitPayments}
                                        disabled={submitting || rowsTotal > maxPayment || rowsTotal <= 0}
                                        className="spatial-button flex items-center gap-3 px-8 h-16 sm:h-18 rounded-[22px] text-lg sm:text-xl font-black disabled:opacity-50 shadow-xl">
                                        {submitting ? 'جارٍ الحفظ...' : 'حفظ الدفعات'}
                                    </button>
                                    <button onClick={() => setShowPaymentForm(false)}
                                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}

                        {purchase.payments.length === 0 ? (
                            <p className="text-lg font-black text-slate-400 dark:text-white/30 py-8 text-center">لا توجد دفعات مسجلة لهذه الفاتورة</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                            {['وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', 'الإجراءات'].map(h => (
                                                <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {purchase.payments.map(pay => (
                                            <tr key={pay.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors">
                                                <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{pay.payment_method.name}</td>
                                                <td className="px-5 py-6 font-black text-emerald-600 dark:text-emerald-400 text-2xl whitespace-nowrap">{fmt(pay.amount)} د.ل</td>
                                                <td className="px-5 py-6 text-slate-600 dark:text-white/70 font-bold text-xl">{pay.notes ?? '—'}</td>
                                                <td className="px-5 py-6 text-slate-500 dark:text-white/60 font-bold text-lg whitespace-nowrap">
                                                    {new Date(pay.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                                                </td>
                                                <td className="px-5 py-6 text-center whitespace-nowrap">
                                                    <DeleteModal
                                                        onConfirm={() => router.delete(`/supplier-payments/${pay.id}`, { preserveScroll: true })}
                                                        trigger={
                                                            <button className="flex items-center justify-center gap-2 h-14 sm:h-16 px-5 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-lg active:scale-95 shadow-md">
                                                                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
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
                )}

                {/* Tab 3: Returns */}
                {activeTab === 'returns' && (
                    <SpatialCard title={`المرتجعات المرتبطة (${purchase.returns.length})`} icon={<RotateCcw className="w-6 h-6 text-orange-500" />}>
                        {purchase.returns.length === 0 ? (
                            <p className="text-lg font-black text-slate-400 dark:text-white/30 py-8 text-center">لا توجد مرتجعات مرتبطة بهذه الفاتورة</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {purchase.returns.map(ret => (
                                    <div key={ret.id} className="p-6 rounded-[24px] bg-orange-500/5 border-2 border-orange-500/20 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <Link href={`/purchase-returns/${ret.id}`}
                                                className="font-black text-2xl text-slate-800 dark:text-white hover:text-primary transition-colors">
                                                مرتجع شراء #{ret.id}
                                            </Link>
                                            <span className="font-black text-2xl text-orange-500">{fmt(ret.total)} د.ل</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {ret.items.map(i => (
                                                <span key={i.id} className="text-base font-bold px-3 py-1.5 rounded-[12px] bg-black/5 dark:bg-white/8 text-slate-700 dark:text-white/80">
                                                    {i.product.name} × {parseFloat(i.quantity).toLocaleString('en-US')}
                                                </span>
                                            ))}
                                        </div>
                                        {ret.settlement && (
                                            <p className="text-base font-black text-purple-500 mt-1">✓ تسوية مرتبطة: {fmt(ret.settlement.amount)} د.ل</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </SpatialCard>
                )}
            </div>
        </AppShell>

        <NumberPadModal
            isOpen={showPad}
            title={padTitle}
            initialValue={padInitial}
            maxValue={padMax}
            onClose={() => setShowPad(false)}
            onConfirm={v => { padCallback?.(v); setShowPad(false); }}
        />
        </>
    );
}
