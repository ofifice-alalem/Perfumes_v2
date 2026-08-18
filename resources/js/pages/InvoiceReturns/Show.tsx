import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { ArrowRight, Plus, Trash2, Package, RefreshCw, RotateCcw, User, UserCheck, Clock, FileText } from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product       { id: number; name: string; }
interface Customer      { id: number; name: string; total_debt: string; }
interface ReturnItem    { id: number; product: Product; size: { label: string } | null; quantity: string; unit_price: string; line_total: string; }
interface Settlement    { id: number; payment_method: { name: string }; amount: string; notes: string | null; created_at: string; }
interface InvoiceReturn {
    id: number; customer: Customer; user: { name: string } | null; invoice: { id: number } | null;
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

export default function InvoiceReturnsShow({ return: ret, paymentMethods, flash }: Props) {
    const [activeTab,  setActiveTab]  = useState<'items' | 'settlements'>('items');
    const [showForm,   setShowForm]   = useState(false);
    const [rows,       setRows]       = useState<SettlementRow[]>([emptyRow()]);
    const [submitting, setSubmitting] = useState(false);

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
    const due           = parseFloat(ret.due_recovery);
    const rowsTotal     = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const isCancelled   = !!ret.deleted_at;
    const customerDebt  = parseFloat(ret.customer.total_debt ?? '0');
    const customerIsCash = ret.customer.id === 1;
    const maxSettlementLimit = Math.min(due, Math.abs(customerDebt < 0 ? customerDebt : 0));
    // التسوية مسموحة فقط إذا كان العميل دائناً (رصيد سالب) وغير نقدي وغير ملغي
    const canSettle     = !customerIsCash && !isCancelled && ret.recovery_status !== 'paid' && customerDebt < 0;

    // رسالة توضيحية لحالة عدم السماح بالتسوية
    const settlementMessage = (() => {
        if (isCancelled) return null;
        if (customerIsCash) return 'لا يمكن إنشاء تسوية للزبون النقدي';
        if (ret.recovery_status === 'paid') return 'تم استرداد المرتجع بالكامل';
        if (customerDebt >= 0) return `العميل لا يزال مديناً (${fmt(customerDebt)} د.ل)`;
        return null;
    })();

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

    const tabs = [
        { key: 'items',       label: `المنتجات المرتجعة (${ret.items.length})` },
        { key: 'settlements', label: `التسويات (${ret.settlements.length})` },
    ] as const;

    return (
        <>
        <AppShell pageTitle={`مرتجع #${ret.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/invoice-returns" className="flex items-center justify-center p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-all active:scale-95 border border-slate-200 dark:border-white/10 shadow-sm shrink-0" title="رجوع للمرتجعات">
                            <ArrowRight className="w-6 h-6" />
                        </Link>

                        <div className="flex items-center gap-2.5">
                            <span className="px-4 py-2 rounded-2xl bg-slate-950 text-white dark:bg-blue-600/30 dark:text-blue-200 border border-slate-700/30 dark:border-blue-500/40 font-black text-xl shadow-md">
                                #{ret.id}
                            </span>
                            {!isCancelled && (
                                <span className={`text-sm sm:text-base font-black px-3.5 py-1.5 rounded-xl border ${recoveryClass[ret.recovery_status]}`}>
                                    {recoveryLabel[ret.recovery_status]}
                                </span>
                            )}
                            {isCancelled && <span className="text-sm sm:text-base font-black px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">ملغي</span>}
                        </div>
                    </div>

                    {isCancelled && (
                        <button onClick={() => router.post(`/invoice-returns/${ret.id}/restore`)}
                            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-sm sm:text-base shadow-sm active:scale-95">
                            <RotateCcw className="w-5 h-5" /> استعادة
                        </button>
                    )}
                </div>

                {flash?.success && <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-xl">{flash.success}</div>}
                {flash?.error   && <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-base sm:text-xl">{flash.error}</div>}

                {/* Native Spatial Metadata Bar: Customer, Cashier, Date, Reference Invoice */}
                <div className="spatial-card p-4 sm:p-6 flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                        <User className="w-6 h-6 text-primary shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">العميل:</span>
                        <Link href={`/customers/${ret.customer.id}`} className="text-lg sm:text-xl font-black text-slate-900 dark:text-white hover:text-primary transition-colors">
                            {ret.customer.name}
                        </Link>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700/80 hidden sm:block" />

                    <div className="flex items-center gap-3">
                        <UserCheck className="w-6 h-6 text-primary shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">الموظف / الكاشير:</span>
                        <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                            {ret.user?.name ?? '—'}
                        </span>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700/80 hidden sm:block" />

                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-slate-400 shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">تاريخ الإنشاء:</span>
                        <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr">
                            {formatDate(ret.created_at)}
                        </span>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700/80 hidden sm:block" />

                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-primary shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">الفاتورة المرجعية:</span>
                        {ret.invoice ? (
                            <Link href={`/invoices/${ret.invoice.id}`} className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 hover:underline">
                                #{ret.invoice.id}
                            </Link>
                        ) : (
                            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">مستقل</span>
                        )}
                    </div>
                </div>

                {/* Native Spatial Totals Summary Strip */}
                <div className="spatial-card p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60">إجمالي المرتجع</span>
                        <span className="text-xl sm:text-2xl font-black text-orange-500">
                            {fmt(ret.total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60 font-black">المسترد</span>
                        <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                            {fmt(ret.recovered_amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60">المتبقي للاسترداد</span>
                        <span className={`text-xl sm:text-2xl font-black ${due > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40'}`}>
                            {fmt(ret.due_recovery)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/60">دين العميل الحالي</span>
                        <span className={`text-xl sm:text-2xl font-black ${customerDebt > 0 ? 'text-amber-500' : customerDebt < 0 ? 'text-purple-400' : 'text-slate-400 dark:text-white/40'}`}>
                            {fmt(customerDebt)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`flex-1 min-w-max px-6 py-2.5 rounded-xl font-black text-sm sm:text-base transition-all whitespace-nowrap border ${activeTab === t.key ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-md scale-[1.01]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Items */}
                {activeTab === 'items' && (
                    <SpatialCard title={`المنتجات المرتجعة (${ret.items.length})`} icon={<Package className="w-5 h-5 text-primary" />}>
                        {(() => {
                            const groups = ret.items.reduce((acc, item) => {
                                const key = `${item.product.id}-${item.size?.label ?? 'null'}-${item.unit_price}`;
                                if (!acc[key]) {
                                    acc[key] = { name: item.product.name, size_label: item.size?.label ?? null, unit_price: item.unit_price, count: 1, quantity: parseFloat(item.quantity), total: parseFloat(item.line_total) };
                                } else {
                                    acc[key].count++;
                                    acc[key].quantity += parseFloat(item.quantity);
                                    acc[key].total += parseFloat(item.line_total);
                                }
                                return acc;
                            }, {} as Record<string, any>);

                            return (
                                <div className="flex flex-col gap-3">
                                    {/* Table Header Row (المنتج -> حجم -> عدد -> سعر -> الإجمالي) */}
                                    <div className="hidden sm:grid grid-cols-[2fr_130px_90px_130px_140px] gap-3 px-6 py-4 text-sm sm:text-base font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                                        <span>المنتج</span>
                                        <span className="text-center">حجم</span>
                                        <span className="text-center">عدد</span>
                                        <span className="text-center">سعر</span>
                                        <span className="text-center">الإجمالي</span>
                                    </div>
                                    {Object.values(groups).map((g: any, idx: number) => {
                                        const displayCount = g.count === 1 ? g.quantity : g.count;
                                        return (
                                            <div key={idx}>
                                                {/* Desktop Table Row */}
                                                <div className="hidden sm:grid grid-cols-[2fr_130px_90px_130px_140px] gap-3 px-6 py-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 transition-all shadow-sm items-center">
                                                    {/* 1. المنتج */}
                                                    <div className="min-w-0 flex items-center">
                                                        <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl truncate">{g.name}</span>
                                                    </div>
                                                    {/* 2. حجم */}
                                                    <div className="flex items-center justify-center">
                                                        {g.size_label
                                                            ? <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-300 bg-blue-500/10 px-3.5 py-1.5 rounded-xl border border-blue-500/20">{g.size_label}</span>
                                                            : <span className="text-slate-400 text-base font-bold">—</span>}
                                                    </div>
                                                    {/* 3. عدد */}
                                                    <div className="flex items-center justify-center">
                                                        <span className="px-3.5 py-1.5 rounded-xl flex items-center justify-center font-black text-base sm:text-lg bg-slate-950 text-white dark:bg-blue-600/30 dark:text-blue-200 border border-slate-700/30 dark:border-blue-500/40 shadow-sm">{displayCount}</span>
                                                    </div>
                                                    {/* 4. سعر */}
                                                    <div className="flex items-center justify-center">
                                                        <span className="font-black text-slate-800 dark:text-slate-200 text-base sm:text-lg">{fmt(g.unit_price)}</span>
                                                    </div>
                                                    {/* 5. الإجمالي */}
                                                    <div className="flex items-center justify-center">
                                                        <span className="font-black text-slate-950 dark:text-white text-xl sm:text-2xl">{fmt(g.total)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                                    </div>
                                                </div>
                                                {/* Mobile Card */}
                                                <div className="sm:hidden flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="font-black text-slate-900 dark:text-white text-lg truncate">{g.name}</span>
                                                        <span className="font-black text-slate-900 dark:text-white text-xl">{fmt(g.total)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap text-sm">
                                                        {g.size_label && <span className="text-xs font-black text-blue-600 dark:text-blue-300 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{g.size_label}</span>}
                                                        <span className="px-3 py-1 rounded-lg font-black text-xs bg-slate-950 text-white dark:bg-blue-600/30 dark:text-blue-200">العدد: {displayCount}</span>
                                                        <span className="font-bold text-slate-600 dark:text-slate-300">سعر: {fmt(g.unit_price)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </SpatialCard>
                )}

                {/* Tab: Settlements */}
                {activeTab === 'settlements' && (
                    <SpatialCard title={`التسويات المسجلة (${ret.settlements.length})`} icon={<RefreshCw className="w-6 h-6 text-primary" />}
                        action={
                            canSettle && (
                                <button onClick={() => { setShowForm(p => !p); setRows([emptyRow()]); }}
                                    className="spatial-button flex items-center gap-3 px-6 h-14 rounded-[20px] text-lg font-black shadow-lg">
                                    <Plus className="w-6 h-6" /> تسجيل تسوية
                                </button>
                            )
                        }
                    >
                        {settlementMessage && (
                            <div className="mb-6 px-6 py-4 rounded-[22px] bg-amber-500/10 border-2 border-amber-500/20 flex items-center gap-3">
                                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                    ⚠️ {settlementMessage}
                                </span>
                            </div>
                        )}
                        {showForm && (
                            <div className="mb-6 p-6 rounded-[28px] bg-purple-500/5 border-2 border-purple-500/20 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-slate-800 dark:text-white text-xl">تسجيل تسوية جديدة للمرتجع</span>
                                    <button onClick={() => setRows(p => [...p, emptyRow()])}
                                        className="flex items-center gap-2 px-5 h-12 rounded-[16px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-black text-base border-2 border-purple-500/20">
                                        <Plus className="w-5 h-5" /> إضافة وسيلة دفع
                                    </button>
                                </div>
                                {rows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-end p-4 rounded-[22px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/5">
                                        <ModernSelect label="وسيلة التسوية" options={methodOptions}
                                            defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                            onSelect={val => setRow(idx, 'payment_method_id', resolveMethodId(val))} />
                                        <div className="flex flex-col gap-2 w-48">
                                            <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                            <button onClick={() => {
                                                const max = maxSettlementLimit - rows.reduce((sum, r, i) => i === idx ? sum : sum + (parseFloat(r.amount) || 0), 0);
                                                openPad('المبلغ', row.amount || fmt(maxSettlementLimit), v => {
                                                    const val = parseFloat(v) || 0;
                                                    setRow(idx, 'amount', val > max ? String(max) : v);
                                                }, max);
                                            }}
                                                className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl font-black text-center cursor-pointer hover:border-primary/40 transition-all border-2">
                                                {row.amount ? (
                                                    <span>{fmt(row.amount)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(maxSettlementLimit)} د.ل</span>
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة</label>
                                            <input value={row.notes} onChange={e => setRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..." className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-lg font-bold border-2" />
                                        </div>
                                        <button onClick={() => rows.length > 1 ? setRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={rows.length === 1}
                                            className="w-16 h-16 sm:h-20 rounded-[22px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border-2 border-red-500/20">
                                            <Trash2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
                                        </button>
                                    </div>
                                ))}
                                {rows.length > 1 && (
                                    <div className="flex items-center justify-between px-4 py-2 bg-black/3 dark:bg-white/3 rounded-[16px]">
                                        <span className="font-black text-slate-700 dark:text-white/80 text-lg">إجمالي هذه التسوية</span>
                                        <span className="font-black text-purple-500 text-2xl">{fmt(rowsTotal)} د.ل</span>
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button onClick={submitSettlements} disabled={submitting}
                                        className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] text-lg font-black disabled:opacity-50 shadow-lg">
                                        {submitting ? 'جارٍ الحفظ...' : 'حفظ التسوية'}
                                    </button>
                                    <button onClick={() => setShowForm(false)} className="h-16 px-8 rounded-[22px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-white/60 font-black text-lg transition-all">إلغاء</button>
                                </div>
                            </div>
                        )}

                        {ret.settlements.length === 0 ? (
                            <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-slate-500 py-8 text-center">لا توجد تسويات مسجلة لهذا المرتجع</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {/* Desktop Table Header */}
                                <div className="hidden sm:grid grid-cols-[1.5fr_130px_2fr_180px_130px] gap-3 px-6 py-4 text-sm sm:text-base font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <span>وسيلة التسوية</span>
                                    <span className="text-center">المبلغ</span>
                                    <span>ملاحظة</span>
                                    <span className="text-center">التاريخ والوقت</span>
                                    <span className="text-center">إجراء</span>
                                </div>
                                {ret.settlements.map(s => (
                                    <div key={s.id}>
                                        {/* Desktop Row */}
                                        <div className="hidden sm:grid grid-cols-[1.5fr_130px_2fr_180px_130px] gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 hover:border-purple-500/40 transition-all shadow-sm items-center">
                                            <span className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{s.payment_method.name}</span>
                                            <span className="font-black text-purple-600 dark:text-purple-400 text-lg sm:text-xl text-center">{fmt(s.amount)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                            <span className="text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base truncate">{s.notes ?? '—'}</span>
                                            <span className="font-black text-slate-700 dark:text-slate-300 text-sm text-center dir-ltr">{formatDate(s.created_at)}</span>
                                            <div className="flex items-center justify-center">
                                                <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
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
                                                <span className="font-black text-slate-900 dark:text-white text-base">{s.payment_method.name}</span>
                                                <span className="font-black text-purple-600 dark:text-purple-400 text-lg">{fmt(s.amount)} <span className="text-xs font-bold text-slate-400">د.ل</span></span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span>{s.notes ?? 'لا يوجد ملاحظات'}</span>
                                                <span className="dir-ltr">{formatDate(s.created_at)}</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                                <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                    trigger={
                                                        <button className="px-3.5 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs active:scale-95 flex items-center gap-1.5">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span>حذف التسوية</span>
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

                {/* Notes */}
                {ret.notes && (
                    <div className="px-8 py-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/5">
                        <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">ملاحظات المرتجع</p>
                        <p className="font-black text-xl sm:text-2xl text-slate-800 dark:text-white/90">{ret.notes}</p>
                    </div>
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
