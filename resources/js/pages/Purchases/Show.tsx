import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { ArrowRight, Plus, Trash2, Package, CreditCard, RotateCcw, User, UserCheck, Clock, FileText } from 'lucide-react';

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
    id: number; supplier: Supplier; user: { name: string } | null;
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

function formatDate(dStr: string) {
    if (!dStr) return '—';
    try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${yyyy}-${mm}-${dd} | ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
        return dStr;
    }
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
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/purchases" className="flex items-center justify-center p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-all active:scale-95 border border-slate-200 dark:border-white/10 shadow-sm shrink-0" title="رجوع للمشتريات">
                            <ArrowRight className="w-6 h-6" />
                        </Link>

                        <div className="flex items-center gap-2.5">
                            <span className="px-4 py-2 rounded-2xl bg-slate-950 text-white dark:bg-blue-600/30 dark:text-blue-200 border border-slate-700/30 dark:border-blue-500/40 font-black text-xl shadow-md">
                                #{purchase.id}
                            </span>
                            <span className={`text-sm sm:text-base font-black px-3.5 py-1.5 rounded-xl border ${statusClass[purchase.payment_status]}`}>
                                {statusLabel[purchase.payment_status]}
                            </span>
                            {isCancelled && <span className="text-sm sm:text-base font-black px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">ملغية</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isCancelled ? (
                            <button onClick={() => router.post(`/purchases/${purchase.id}/restore`)}
                                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-sm sm:text-base shadow-sm active:scale-95">
                                <RotateCcw className="w-5 h-5" /> استعادة الفاتورة
                            </button>
                        ) : (
                            <Link href={`/purchase-returns/create?purchase_id=${purchase.id}&supplier_id=${purchase.supplier.id}`}
                                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-orange-500/30 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all font-black text-sm sm:text-base shadow-sm active:scale-95">
                                <RotateCcw className="w-5 h-5" /> إنشاء مرتجع
                            </Link>
                        )}
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-xl">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-base sm:text-xl">
                        {flash.error}
                    </div>
                )}

                {/* Native Spatial Metadata Bar: Supplier, Cashier, Date */}
                <div className="spatial-card p-4 sm:p-6 flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                        <User className="w-6 h-6 text-primary shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">المورد:</span>
                        <Link href={`/suppliers/${purchase.supplier.id}`} className="text-lg sm:text-xl font-black text-slate-900 dark:text-white hover:text-primary transition-colors">
                            {purchase.supplier.name}
                        </Link>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700/80 hidden sm:block" />

                    <div className="flex items-center gap-3">
                        <UserCheck className="w-6 h-6 text-primary shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">الموظف / الكاشير:</span>
                        <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                            {purchase.user?.name ?? '—'}
                        </span>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700/80 hidden sm:block" />

                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-slate-400 shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">تاريخ الإنشاء:</span>
                        <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr">
                            {formatDate(purchase.created_at)}
                        </span>
                    </div>
                </div>

                {/* Native Spatial Totals Summary Strip */}
                <div className="spatial-card p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60">إجمالي الفاتورة</span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {fmt(purchase.total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60">إجمالي المدفوع</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {fmt(purchase.paid_amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60">المبلغ المتبقي</span>
                        <span className={`text-xl sm:text-2xl font-black ${due > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40'}`}>
                            {fmt(purchase.due_amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60">دين المورد الكلي</span>
                        <span className={`text-xl sm:text-2xl font-black ${supplierDebt > 0 ? 'text-purple-500' : 'text-slate-400 dark:text-white/40'}`}>
                            {fmt(supplierDebt)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`flex-1 min-w-max px-6 py-2.5 rounded-xl font-black text-sm sm:text-base transition-all whitespace-nowrap border ${activeTab === t.key ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-md scale-[1.01]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab 1: Products */}
                {activeTab === 'items' && (
                    <SpatialCard title={`المنتجات المسجلة (${purchase.items.length})`} icon={<Package className="w-5 h-5 text-primary" />}>
                        <div className="flex flex-col gap-3">
                            {/* Table Header Row */}
                            <div className="hidden sm:grid grid-cols-[2fr_130px_140px_140px] gap-3 px-6 py-4 text-sm sm:text-base font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <span>المنتج</span>
                                <span className="text-center">الكمية</span>
                                <span className="text-center">سعر الوحدة</span>
                                <span className="text-center">الإجمالي</span>
                            </div>
                            {purchase.items.map(item => (
                                <div key={item.id}>
                                    {/* Desktop Row */}
                                    <div className="hidden sm:grid grid-cols-[2fr_130px_140px_140px] gap-3 px-6 py-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 transition-all shadow-sm items-center">
                                        <div className="min-w-0 flex items-center">
                                            <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl truncate">{item.product.name}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="px-3.5 py-1.5 rounded-xl flex items-center justify-center font-black text-base sm:text-lg bg-slate-950 text-white dark:bg-blue-600/30 dark:text-blue-200 border border-slate-700/30 dark:border-blue-500/40 shadow-sm">{parseFloat(item.quantity).toLocaleString('en-US')}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="font-black text-slate-800 dark:text-slate-200 text-base sm:text-lg">{fmt(item.unit_cost)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="font-black text-slate-950 dark:text-white text-xl sm:text-2xl">{fmt(item.line_total)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                        </div>
                                    </div>
                                    {/* Mobile Card */}
                                    <div className="sm:hidden flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-black text-slate-900 dark:text-white text-lg truncate">{item.product.name}</span>
                                            <span className="font-black text-slate-900 dark:text-white text-xl">{fmt(item.line_total)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                            <span className="px-3 py-1 rounded-lg font-black text-xs bg-slate-950 text-white dark:bg-blue-600/30 dark:text-blue-200">الكمية: {parseFloat(item.quantity).toLocaleString('en-US')}</span>
                                            <span className="font-bold">سعر الوحدة: {fmt(item.unit_cost)} د.ل</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                            <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-slate-500 py-8 text-center">لا توجد دفعات مسجلة لهذه الفاتورة</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {/* Desktop Table Header */}
                                <div className="hidden sm:grid grid-cols-[1.5fr_130px_2fr_180px_100px] gap-3 px-6 py-4 text-sm sm:text-base font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <span>وسيلة الدفع</span>
                                    <span className="text-center">المبلغ</span>
                                    <span>ملاحظة</span>
                                    <span className="text-center">التاريخ والوقت</span>
                                    <span className="text-center">إجراء</span>
                                </div>
                                {purchase.payments.map(pay => (
                                    <div key={pay.id}>
                                        {/* Desktop Row */}
                                        <div className="hidden sm:grid grid-cols-[1.5fr_130px_2fr_180px_100px] gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 transition-all shadow-sm items-center">
                                            <span className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{pay.payment_method.name}</span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg sm:text-xl text-center">{fmt(pay.amount)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                            <span className="text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base truncate">{pay.notes ?? '—'}</span>
                                            <span className="font-black text-slate-700 dark:text-slate-300 text-sm text-center dir-ltr">{formatDate(pay.created_at)}</span>
                                            <div className="flex items-center justify-center">
                                                <DeleteModal onConfirm={() => router.delete(`/supplier-payments/${pay.id}`, { preserveScroll: true })}
                                                    trigger={
                                                        <button className="px-3.5 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs sm:text-sm active:scale-95 flex items-center gap-1.5">
                                                            <Trash2 className="w-4 h-4" />
                                                            <span>حذف</span>
                                                        </button>
                                                    } />
                                            </div>
                                        </div>
                                        {/* Mobile Card */}
                                        <div className="sm:hidden flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-black text-slate-900 dark:text-white text-base">{pay.payment_method.name}</span>
                                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{fmt(pay.amount)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span>{pay.notes ?? 'لا يوجد ملاحظات'}</span>
                                                <span className="dir-ltr">{formatDate(pay.created_at)}</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                                <DeleteModal onConfirm={() => router.delete(`/supplier-payments/${pay.id}`, { preserveScroll: true })}
                                                    trigger={
                                                        <button className="px-3.5 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs active:scale-95 flex items-center gap-1.5">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span>حذف الدفعة</span>
                                                        </button>
                                                    } />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SpatialCard>
                )}

                {/* Tab 3: Returns */}
                {activeTab === 'returns' && (
                    <SpatialCard title={`المرتجعات المرتبطة (${purchase.returns.length})`} icon={<RotateCcw className="w-5 h-5 text-orange-500" />}>
                        {purchase.returns.length === 0 ? (
                            <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-slate-500 py-8 text-center">لا توجد مرتجعات مرتبطة بهذه الفاتورة</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {purchase.returns.map(ret => (
                                    <div key={ret.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <Link href={`/purchase-returns/${ret.id}`}
                                                className="font-black text-lg text-slate-900 dark:text-white hover:text-primary transition-colors">
                                                مرتجع شراء #{ret.id}
                                            </Link>
                                            <span className="font-black text-xl text-orange-500">{fmt(ret.total)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {ret.items.map(i => (
                                                <span key={i.id} className="text-xs sm:text-sm font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                                    {i.product.name} × {parseFloat(i.quantity).toLocaleString('en-US')}
                                                </span>
                                            ))}
                                        </div>
                                        {ret.settlement && (
                                            <p className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400 mt-1">✓ تسوية مرتبطة: {fmt(ret.settlement.amount)} د.ل</p>
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
