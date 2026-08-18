import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { ArrowRight, Plus, Trash2, Package, CreditCard, RotateCcw, RefreshCw, Edit, Printer, Zap } from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product { id: number; name: string; }
interface Customer { id: number; name: string; total_debt: string; }
interface Size { id: number; label: string; value: string; }

interface InvoiceItem {
    id: number; product: Product; size: Size | null;
    sale_type: string; quantity: string; unit_price: string; line_total: string;
}
interface Payment {
    id: number; payment_method: { name: string };
    amount: string; notes: string | null; created_at: string;
    user: { name: string } | null;
}
interface Settlement {
    id: number; payment_method: { name: string };
    amount: string; notes: string | null; created_at: string;
    user: { name: string } | null;
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
    invoice: Invoice;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface PaymentRow { payment_method_id: string; amount: string; notes: string; }
interface SettlementRow { payment_method_id: string; amount: string; notes: string; }
const emptyPayRow = (): PaymentRow => ({ payment_method_id: '', amount: '', notes: '' });
const emptySetRow = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass = {
    unpaid: 'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
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
    const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'settlements' | 'returns'>('items');
    const [showPayForm, setShowPayForm] = useState(false);
    const [showSetForm, setShowSetForm] = useState(false);
    const [payRows, setPayRows] = useState<PaymentRow[]>([emptyPayRow()]);
    const [setRows, setSetRows] = useState<SettlementRow[]>([emptySetRow()]);
    const [submitting, setSubmitting] = useState(false);

    // NumberPad
    const [showPad, setShowPad] = useState(false);
    const [padTitle, setPadTitle] = useState('');
    const [padInitial, setPadInitial] = useState('');
    const [padMax, setPadMax] = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max); setPadCallback(() => cb); setShowPad(true);
    }

    const methodOptions = paymentMethods.map(m => ({ label: m.name }));
    function resolveMethodId(label: string) {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    const due = parseFloat(invoice.due_amount);
    const customerDebt = parseFloat(invoice.customer?.total_debt ?? '0');
    const maxPayment = Math.min(due, Math.max(0, customerDebt));
    const isCash = invoice.customer?.id === 1 || !invoice.customer;
    const isCancelled = !!invoice.deleted_at;

    const maxSettlementLimit = Math.abs(customerDebt < 0 ? customerDebt : 0);

    // التسوية مسموحة فقط إذا كان العميل دائناً (رصيد سالب) وغير نقدي وغير ملغي
    const canSetSettle = !isCash && !isCancelled && customerDebt < 0;

    // رسالة توضيحية لحالة عدم السماح بالتسوية
    const settlementMessage = (() => {
        if (isCancelled) return null;
        if (isCash) return 'لا يمكن إنشاء تسوية للزبون النقدي';
        if (customerDebt >= 0) return `العميل لا يزال مديناً (${fmt(customerDebt)})`;
        return null;
    })();

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
                customer_id: String(invoice.customer?.id ?? 1),
                invoice_id: String(invoice.id),
                payment_method_id: row.payment_method_id,
                amount: row.amount,
                notes: row.notes || null,
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
                customer_id: String(invoice.customer?.id ?? 1),
                invoice_id: String(invoice.id),
                payment_method_id: row.payment_method_id,
                amount: row.amount,
                notes: row.notes || null,
            }, { preserveScroll: true, onSuccess: () => postNext(i + 1), onError: () => setSubmitting(false) });
        }
        postNext(0);
    }

    const tabs = [
        { key: 'items', label: `الأصناف (${invoice.items.length})` },
        { key: 'payments', label: `الدفعات (${invoice.payments.length})` },
        { key: 'settlements', label: `التسويات (${invoice.settlements?.length ?? 0})` },
        { key: 'returns', label: `المرتجعات (${invoice.returns.length})` },
    ] as const;

    const handleDirectPrint = () => {
        const iframeId = 'thermal-print-iframe';
        let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = iframeId;
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.visibility = 'hidden';
            document.body.appendChild(iframe);
        }
        iframe.src = `/thermal-receipt/${invoice.id}?autoplay=1`;
    };

    const [printingNode, setPrintingNode] = useState(false);

    const handleNodeDirectPrint = async () => {
        setPrintingNode(true);
        try {
            const res = await fetch('/settings/node-printer/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ invoice_id: invoice.id, multi: true }),
            });
            const resData = await res.json();
            if (!resData.success) {
                alert('خطأ في الطباعة الفورية: ' + (resData.message || 'تعذر الاتصال بالمحرك'));
            }
        } catch (e) {
            console.error('Error printing node direct:', e);
        } finally {
            setPrintingNode(false);
        }
    };

    return (
        <>
            <AppShell pageTitle={`فاتورة #${invoice.id}`}>
                <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <Link href="/invoices" className="flex items-center gap-3 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] bg-black/6 dark:bg-white/8 text-slate-700 dark:text-white/80 hover:bg-black/12 dark:hover:bg-white/15 transition-all shrink-0 border-2 border-black/5 dark:border-white/10 font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                            <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
                            <span>رجوع للفواتير</span>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white">فاتورة #{invoice.id}</h1>
                                <span className={`text-base sm:text-xl font-black px-4 py-1.5 rounded-[14px] ${statusClass[invoice.payment_status]}`}>
                                    {statusLabel[invoice.payment_status]}
                                </span>
                                {isCancelled && <span className="text-base sm:text-xl font-black px-4 py-1.5 rounded-[14px] bg-red-500/10 text-red-500">ملغية</span>}
                            </div>
                            <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-white/60 mt-1 truncate">
                                {invoice.customer?.name ?? 'زبون نقدي'} — {invoice.user?.name ?? '—'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                            <button
                                type="button"
                                onClick={handleNodeDirectPrint}
                                disabled={printingNode}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 h-16 sm:h-20 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-600 text-white hover:bg-emerald-500 transition-all font-black text-lg sm:text-2xl shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                <Zap className="w-6 h-6 sm:w-7 sm:h-7" /> {printingNode ? 'جاري الطباعة...' : '⚡ طباعة فورية (Node)'}
                            </button>
                            <button
                                type="button"
                                onClick={handleDirectPrint}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 h-16 sm:h-20 rounded-[22px] border-2 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all font-black text-lg sm:text-2xl shadow-md active:scale-95 cursor-pointer"
                            >
                                <Printer className="w-6 h-6 sm:w-7 sm:h-7" /> طباعة المتصفح
                            </button>
                            {!isCancelled && (
                                <Link href={`/invoices/${invoice.id}/edit`} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 h-16 sm:h-20 rounded-[22px] border-2 border-slate-300 dark:border-white/20 bg-black/5 dark:bg-white/8 text-slate-800 dark:text-white hover:bg-black/10 transition-all font-black text-lg sm:text-2xl shadow-md active:scale-95">
                                    <Edit className="w-6 h-6 sm:w-7 sm:h-7" /> تعديل
                                </Link>
                            )}
                            {isCancelled && (
                                <RestoreModal
                                    title="استعادة الفاتورة"
                                    description="هل أنت متأكد من استعادة هذه الفاتورة؟ سيتم استعادة الدفعات والتسويات المرتبطة بها."
                                    onConfirm={() => router.post(`/invoices/${invoice.id}/restore`)}
                                    trigger={
                                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 h-16 sm:h-20 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-lg sm:text-2xl shadow-md active:scale-95">
                                            <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة
                                        </button>
                                    }
                                />
                            )}
                        </div>
                    </div>

                    {flash?.success && <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-xl">{flash.success}</div>}
                    {flash?.error && <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-base sm:text-xl">{flash.error}</div>}

                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                        {[
                            { label: 'الإجمالي', value: fmt(invoice.total), color: 'text-slate-800 dark:text-white' },
                            { label: 'المدفوع', value: fmt(invoice.paid_amount), color: 'text-emerald-600 dark:text-emerald-400' },
                            { label: 'المتبقي', value: fmt(invoice.due_amount), color: due > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-white/40' },
                            { label: 'دين العميل', value: fmt(invoice.customer?.total_debt ?? '0'), color: customerDebt > 0 ? 'text-amber-500' : customerDebt < 0 ? 'text-purple-500' : 'text-slate-400 dark:text-white/40' },
                        ].map(s => (
                            <div key={s.label} className="spatial-card p-5 sm:p-6 flex flex-col gap-2 border-2">
                                <span className="text-sm sm:text-base font-black text-slate-500 dark:text-white/50 uppercase tracking-wider">{s.label}</span>
                                <span className={`text-2xl sm:text-4xl font-black ${s.color}`}>{s.value} <span className="text-sm font-bold">د.ل</span></span>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2.5 p-2 rounded-[24px] bg-black/5 dark:bg-white/5 border-2 border-black/8 dark:border-white/10 overflow-x-auto">
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`flex-1 min-w-max px-8 h-16 sm:h-20 rounded-[20px] font-black text-lg sm:text-2xl transition-all whitespace-nowrap border-2 ${activeTab === t.key ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white border-primary shadow-lg scale-[1.01]' : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab: Items */}
                    {activeTab === 'items' && (
                        <SpatialCard title={`الأصناف (${invoice.items.length})`} icon={<Package className="w-4 h-4" />}>
                            {(() => {
                                const groups = invoice.items.reduce((acc, item) => {
                                    // استخدم label فقط من العلاقة — لا تستخدم item.quantity كاحتياطي للحجم
                                    const sizeLabel = item.size?.label ?? null;
                                    // قيمة الحجم الفردي (مل) لحساب عدد التعبئات لاحقاً
                                    const sizeValue = item.size?.value ? parseFloat(item.size.value) : null;
                                    const key = `${item.product.id}-${item.size?.id ?? 'null'}-${item.sale_type}-${item.unit_price}`;
                                    if (!acc[key]) {
                                        acc[key] = { name: item.product.name, sale_type: item.sale_type, size_label: sizeLabel, size_value: sizeValue, unit_price: item.unit_price, count: 1, quantity: parseFloat(item.quantity), total: parseFloat(item.line_total) };
                                    } else {
                                        acc[key].count++;
                                        acc[key].quantity += parseFloat(item.quantity);
                                        acc[key].total += parseFloat(item.line_total);
                                    }
                                    return acc;
                                }, {} as Record<string, any>);

                                return (
                                    <div className="flex flex-col gap-3">
                                        <div className="hidden sm:grid grid-cols-[80px_2fr_120px_100px_120px_130px] gap-3 px-5 py-4 text-base sm:text-lg font-black text-slate-600 dark:text-white/60 bg-black/4 dark:bg-white/5 rounded-[16px] border border-black/5 dark:border-white/8">
                                            <span className="text-center">عدد</span>
                                            <span>المنتج</span>
                                            <span className="text-center">النوع</span>
                                            <span className="text-center">حجم</span>
                                            <span className="text-center">سعر</span>
                                            <span className="text-center">الإجمالي</span>
                                        </div>
                                        {Object.values(groups).map((g: any, idx: number) => {
                                            // للوحدات: الكمية مباشرة. لبقية الأنواع: عدد التعبئات = الكمية ÷ حجم الوحدة
                                            const displayCount = g.sale_type === 'unit_based'
                                                ? g.quantity
                                                : (g.size_value && g.size_value > 0 ? Math.round(g.quantity / g.size_value) : g.count);
                                            return (
                                                <div key={idx}>
                                                    {/* Desktop */}
                                                    <div className="hidden sm:grid grid-cols-[80px_2fr_120px_100px_120px_130px] gap-3 px-5 py-5 rounded-[22px] bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 hover:border-primary/50 transition-all shadow-md items-center">
                                                        <div className="flex items-center justify-center">
                                                            <span className="w-14 h-12 rounded-[14px] flex items-center justify-center font-black text-lg sm:text-xl bg-primary/15 text-primary border border-primary/20">{displayCount}</span>
                                                        </div>
                                                        <div className="min-w-0 flex items-center">
                                                            <span className="font-black text-slate-800 dark:text-white text-lg sm:text-2xl truncate">{g.name}</span>
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            <span className="text-base font-bold text-slate-600 dark:text-white/60">{saleTypeLabel[g.sale_type] ?? g.sale_type}</span>
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            {g.size_label
                                                                ? <span className="text-sm sm:text-base font-black text-white bg-primary px-3 py-1.5 rounded-full">{g.size_label}</span>
                                                                : <span className="text-slate-400 text-lg font-bold">—</span>}
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            <span className="font-black text-slate-700 dark:text-slate-200 text-lg sm:text-xl">{fmt(g.unit_price)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            <span className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">{fmt(g.total)}</span>
                                                        </div>
                                                    </div>
                                                    {/* Mobile */}
                                                    <div className="sm:hidden flex flex-col gap-3 p-5 rounded-[20px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="font-black text-slate-800 dark:text-white text-xl truncate">{g.name}</span>
                                                            <span className="font-black text-slate-800 dark:text-white text-2xl">{fmt(g.total)} <span className="text-xs font-normal">د.ل</span></span>
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <span className="flex items-center gap-1.5 px-3.5 h-9 rounded-[12px] bg-primary/15 text-primary text-base font-black border border-primary/20">× {displayCount}</span>
                                                            <span className="text-sm font-bold text-slate-500 dark:text-white/60">{saleTypeLabel[g.sale_type] ?? g.sale_type}</span>
                                                            {g.size_label && <span className="text-sm font-black text-white bg-primary px-3 py-1 rounded-full">{g.size_label}</span>}
                                                            <span className="text-sm font-bold text-slate-500 dark:text-white/60">سعر: {fmt(g.unit_price)}</span>
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

                    {/* Tab: Payments */}
                    {activeTab === 'payments' && (
                        <SpatialCard title={`الدفعات (${invoice.payments.length})`} icon={<CreditCard className="w-5 h-5" />}
                            action={
                                !isCash && !isCancelled && invoice.payment_status !== 'paid' && maxPayment > 0 && (
                                    <button onClick={() => { setShowPayForm(p => !p); setPayRows([emptyPayRow()]); }}
                                        className="flex items-center gap-2.5 px-6 h-14 sm:h-16 rounded-[18px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl border-2 border-primary/30 shadow-md active:scale-95">
                                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> تسجيل دفع
                                    </button>
                                )
                            }
                        >
                            {showPayForm && (
                                <div className="mb-6 p-6 rounded-[24px] bg-primary/5 border-2 border-primary/20 flex flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-slate-800 dark:text-white text-lg sm:text-xl">تسجيل دفعات جديدة</span>
                                            <span className="text-sm font-bold text-slate-500 dark:text-white/60">الحد الأقصى: {fmt(maxPayment)} د.ل</span>
                                        </div>
                                        <button onClick={() => setPayRows(p => [...p, emptyPayRow()])}
                                            className="flex items-center gap-2 px-5 h-12 rounded-[16px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-sm sm:text-base border-2 border-primary/20">
                                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> إضافة وسيلة
                                        </button>
                                    </div>
                                    {payRows.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-end p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/8">
                                            <ModernSelect label="وسيلة الدفع" options={methodOptions}
                                                defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                                onSelect={val => setPayRow(idx, 'payment_method_id', resolveMethodId(val))} />
                                            <div className="flex flex-col gap-1.5 w-44">
                                                <label className="text-sm font-black text-slate-600 dark:text-white/60 uppercase tracking-wider">المبلغ</label>
                                                <button onClick={() => openPad('المبلغ', row.amount || fmt(maxPayment), v => setPayRow(idx, 'amount', v), maxPayment)}
                                                    className="spatial-input h-16 rounded-[22px] px-4 text-xl font-black text-center cursor-pointer hover:border-primary/50 transition-all border-2">
                                                    {row.amount || <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(maxPayment)}</span>}
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-black text-slate-600 dark:text-white/60 uppercase tracking-wider">ملاحظة</label>
                                                <input value={row.notes} onChange={e => setPayRow(idx, 'notes', e.target.value)}
                                                    placeholder="اختياري..." className="spatial-input h-16 rounded-[22px] px-4 text-lg font-bold border-2" />
                                            </div>
                                            <button onClick={() => payRows.length > 1 ? setPayRows(p => p.filter((_, i) => i !== idx)) : null}
                                                disabled={payRows.length === 1}
                                                className="h-16 rounded-[22px] px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 font-black text-base disabled:opacity-30 disabled:cursor-not-allowed border-2 border-red-500/20 active:scale-95 shrink-0 whitespace-nowrap">
                                                <Trash2 className="w-6 h-6" />
                                                <span>حذف السطر</span>
                                            </button>
                                        </div>
                                    ))}
                                    {payRows.length > 1 && (
                                        <div className="flex items-center justify-between px-3">
                                            <span className="font-bold text-slate-600 dark:text-white/60 text-base">إجمالي هذه الدفعات</span>
                                            <span className={`font-black text-xl ${payRowsTotal > maxPayment ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {fmt(payRowsTotal)} د.ل {payRowsTotal > maxPayment && <span className="text-xs mr-1">(يتجاوز الحد)</span>}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button onClick={submitPayments} disabled={submitting || payRowsTotal > maxPayment || payRowsTotal <= 0}
                                            className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] text-lg sm:text-xl font-black disabled:opacity-50 shadow-md">
                                            {submitting ? 'جارٍ الحفظ...' : 'حفظ الدفعات'}
                                        </button>
                                        <button onClick={() => setShowPayForm(false)} className="h-16 px-6 rounded-[22px] bg-black/6 dark:bg-white/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">إلغاء</button>
                                    </div>
                                </div>
                            )}
                            {invoice.payments.length === 0 ? (
                                <p className="text-lg font-bold text-slate-400 dark:text-white/30 py-6 text-center">لا توجد دفعات مسجلة</p>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-lg sm:text-xl">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['وسيلة الدفع', 'المبلغ', 'ملاحظة', 'الموظف', 'التاريخ', 'الإجراءات'].map(h => (
                                                        <th key={h} className={`px-5 py-5 text-base sm:text-xl font-black text-slate-600 dark:text-white/60 uppercase tracking-wider ${h === 'الإجراءات' ? 'text-center' : 'text-right'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {invoice.payments.map(pay => (
                                                    <tr key={pay.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                        <td className="px-5 py-5 font-black text-slate-800 dark:text-white text-xl sm:text-2xl">{pay.payment_method.name}</td>
                                                        <td className="px-5 py-5 font-black text-emerald-600 dark:text-emerald-400 text-2xl sm:text-3xl">{fmt(pay.amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                        <td className="px-5 py-5 text-slate-600 dark:text-white/60 font-bold text-lg">{pay.notes ?? '—'}</td>
                                                        <td className="px-5 py-5 text-slate-700 dark:text-white/70 font-bold text-lg sm:text-xl">{pay.user?.name ?? '—'}</td>
                                                        <td className="px-5 py-5 font-bold whitespace-nowrap">
                                                            <span className="px-4 sm:px-6 py-2.5 rounded-[16px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{new Date(pay.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span>
                                                        </td>
                                                        <td className="px-5 py-5 text-center">
                                                            {!isCancelled && (
                                                                <DeleteModal onConfirm={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button className="inline-flex items-center justify-center gap-2 px-5 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl shadow-md active:scale-95 whitespace-nowrap">
                                                                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                                                            <span>حذف الدفعة</span>
                                                                        </button>
                                                                    }
                                                                />
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="flex flex-col gap-4 lg:hidden">
                                        {invoice.payments.map(pay => (
                                            <div key={pay.id} className="p-5 rounded-[22px] bg-black/3 dark:bg-white/3 border-2 border-black/8 dark:border-white/10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-black text-slate-800 dark:text-white text-xl">{pay.payment_method.name}</span>
                                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-2xl">{fmt(pay.amount)} <span className="text-xs font-normal">د.ل</span></span>
                                                </div>
                                                <div className="space-y-3 text-base">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                        <div className="font-bold text-slate-700 dark:text-white/70 text-lg">{pay.notes ?? '—'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">الموظف</span>
                                                        <div className="font-bold text-slate-700 dark:text-white/70 text-lg">{pay.user?.name ?? '—'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                        <div className="mt-1"><span className="px-4 py-2 rounded-[14px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl font-black text-slate-800 dark:text-white inline-block">{new Date(pay.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span></div>
                                                    </div>
                                                </div>
                                                {!isCancelled && (
                                                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                                                        <DeleteModal onConfirm={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                            trigger={<button className="w-full flex items-center justify-center gap-3 h-18 sm:h-20 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-xl sm:text-2xl shadow-md active:scale-95"><Trash2 className="w-8 h-8 sm:w-9 sm:h-9" /> حذف</button>} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </SpatialCard>
                    )}

                    {/* Tab: Settlements */}
                    {activeTab === 'settlements' && (
                        <SpatialCard title={`التسويات (${invoice.settlements?.length ?? 0})`} icon={<RefreshCw className="w-5 h-5" />}
                            action={
                                canSetSettle && (
                                    <button onClick={() => { setShowSetForm(p => !p); setSetRows([emptySetRow()]); }}
                                        className="flex items-center gap-2.5 px-6 h-14 sm:h-16 rounded-[18px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-black text-base sm:text-xl border-2 border-purple-500/30 shadow-md active:scale-95">
                                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> إضافة تسوية
                                    </button>
                                )
                            }
                        >
                            {settlementMessage && (
                                <div className="mb-5 px-5 py-4 rounded-[18px] bg-amber-500/10 border-2 border-amber-500/20 flex items-center gap-3">
                                    <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                                        ⚠️ {settlementMessage}
                                    </span>
                                </div>
                            )}
                            {showSetForm && (
                                <div className="mb-6 p-6 rounded-[24px] bg-purple-500/5 border-2 border-purple-500/20 flex flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-slate-800 dark:text-white text-lg sm:text-xl">تسجيل تسوية جديدة</span>
                                        <button onClick={() => setSetRows(p => [...p, emptySetRow()])}
                                            className="flex items-center gap-2 px-5 h-12 rounded-[16px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-black text-sm sm:text-base border-2 border-purple-500/20">
                                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> إضافة وسيلة
                                        </button>
                                    </div>
                                    {setRows.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-4 items-end p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/8">
                                            <ModernSelect label="وسيلة التسوية" options={methodOptions}
                                                defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                                onSelect={val => setSetRow(idx, 'payment_method_id', resolveMethodId(val))} />
                                            <div className="flex flex-col gap-1.5 w-44">
                                                <label className="text-sm font-black text-slate-600 dark:text-white/60 uppercase tracking-wider">المبلغ</label>
                                                <button onClick={() => {
                                                    const max = maxSettlementLimit - setRows.reduce((sum, r, i) => i === idx ? sum : sum + (parseFloat(r.amount) || 0), 0);
                                                    openPad('المبلغ', row.amount || fmt(maxSettlementLimit), v => {
                                                        const val = parseFloat(v) || 0;
                                                        setSetRow(idx, 'amount', val > max ? String(max) : v);
                                                    }, max);
                                                }}
                                                    className="spatial-input h-16 rounded-[22px] px-4 text-xl font-black text-center cursor-pointer hover:border-primary/50 transition-all border-2">
                                                    {row.amount || <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(maxSettlementLimit)}</span>}
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-black text-slate-600 dark:text-white/60 uppercase tracking-wider">ملاحظة</label>
                                                <input value={row.notes} onChange={e => setSetRow(idx, 'notes', e.target.value)}
                                                    placeholder="اختياري..." className="spatial-input h-16 rounded-[22px] px-4 text-lg font-bold border-2" />
                                            </div>
                                            <button onClick={() => setRows.length > 1 ? setSetRows(p => p.filter((_, i) => i !== idx)) : null}
                                                disabled={setRows.length === 1}
                                                className="h-16 rounded-[22px] px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 font-black text-base disabled:opacity-30 disabled:cursor-not-allowed border-2 border-red-500/20 active:scale-95 shrink-0 whitespace-nowrap">
                                                <Trash2 className="w-6 h-6" />
                                                <span>حذف السطر</span>
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex gap-3">
                                        <button onClick={submitSettlements} disabled={submitting || setRowsTotal <= 0}
                                            className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] text-lg sm:text-xl font-black disabled:opacity-50 shadow-md">
                                            {submitting ? 'جارٍ الحفظ...' : 'حفظ التسوية'}
                                        </button>
                                        <button onClick={() => setShowSetForm(false)} className="h-16 px-6 rounded-[22px] bg-black/6 dark:bg-white/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">إلغاء</button>
                                    </div>
                                </div>
                            )}
                            {!invoice.settlements || invoice.settlements.length === 0 ? (
                                <p className="text-lg font-bold text-slate-400 dark:text-white/30 py-6 text-center">لا توجد تسويات مسجلة</p>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-lg sm:text-xl">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['وسيلة التسوية', 'المبلغ', 'ملاحظة', 'الموظف', 'التاريخ', 'الإجراءات'].map(h => (
                                                        <th key={h} className={`px-5 py-5 text-base sm:text-xl font-black text-slate-600 dark:text-white/60 uppercase tracking-wider ${h === 'الإجراءات' ? 'text-center' : 'text-right'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {invoice.settlements?.map(s => (
                                                    <tr key={s.id} className="hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors">
                                                        <td className="px-5 py-5 font-black text-slate-800 dark:text-white text-xl sm:text-2xl">{s.payment_method.name}</td>
                                                        <td className="px-5 py-5 font-black text-purple-500 text-2xl sm:text-3xl">{fmt(s.amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                        <td className="px-5 py-5 text-slate-600 dark:text-white/60 font-bold text-lg">{s.notes ?? '—'}</td>
                                                        <td className="px-5 py-5 text-slate-700 dark:text-white/70 font-bold text-lg sm:text-xl">{s.user?.name ?? '—'}</td>
                                                        <td className="px-5 py-5 font-bold whitespace-nowrap">
                                                            <span className="px-4 sm:px-6 py-2.5 rounded-[16px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span>
                                                        </td>
                                                        <td className="px-5 py-5 text-center">
                                                            {!isCancelled && (
                                                                <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button className="inline-flex items-center justify-center gap-2 px-5 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl shadow-md active:scale-95 whitespace-nowrap">
                                                                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                                                            <span>حذف التسوية</span>
                                                                        </button>
                                                                    }
                                                                />
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="flex flex-col gap-4 lg:hidden">
                                        {invoice.settlements?.map(s => (
                                            <div key={s.id} className="p-5 rounded-[22px] bg-black/3 dark:bg-white/3 border-2 border-black/8 dark:border-white/10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-black text-slate-800 dark:text-white text-xl">{s.payment_method.name}</span>
                                                    <span className="font-black text-purple-500 text-2xl">{fmt(s.amount)} <span className="text-xs font-normal">د.ل</span></span>
                                                </div>
                                                <div className="space-y-3 text-base">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                        <div className="font-bold text-slate-700 dark:text-white/70 text-lg">{s.notes ?? '—'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">الموظف</span>
                                                        <div className="font-bold text-slate-700 dark:text-white/70 text-lg">{s.user?.name ?? '—'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                        <div className="mt-1"><span className="px-4 py-2 rounded-[14px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl font-black text-slate-800 dark:text-white inline-block">{new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span></div>
                                                    </div>
                                                </div>
                                                {!isCancelled && (
                                                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                                                        <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                            trigger={<button className="w-full flex items-center justify-center gap-3 h-18 sm:h-20 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-xl sm:text-2xl shadow-md active:scale-95"><Trash2 className="w-8 h-8 sm:w-9 sm:h-9" /> حذف</button>} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </SpatialCard>
                    )}

                    {/* Tab: Returns */}
                    {activeTab === 'returns' && (
                        <SpatialCard title={`المرتجعات (${invoice.returns.length})`} icon={<RotateCcw className="w-5 h-5" />}
                            action={
                                !isCancelled && (
                                    <Link href={`/invoice-returns/create?customer_id=${invoice.customer?.id ?? 1}&invoice_id=${invoice.id}`}
                                        className="flex items-center gap-2.5 px-6 h-14 sm:h-16 rounded-[18px] bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all font-black text-base sm:text-xl border-2 border-orange-500/30 shadow-md active:scale-95">
                                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> مرتجع جديد
                                    </Link>
                                )
                            }
                        >
                            {invoice.returns.length === 0 ? (
                                <p className="text-lg font-bold text-slate-400 dark:text-white/30 py-6 text-center">لا توجد مرتجعات</p>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {invoice.returns.map(ret => (
                                        <div key={ret.id} className="p-5 rounded-[22px] bg-orange-500/5 border-2 border-orange-500/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <Link href={`/invoice-returns/${ret.id}`} className="font-black text-xl sm:text-2xl text-slate-800 dark:text-white hover:text-primary transition-colors">
                                                    مرتجع #{ret.id}
                                                </Link>
                                                <span className="font-black text-2xl sm:text-3xl text-orange-500">{fmt(ret.total)} <span className="text-sm font-bold">د.ل</span></span>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {ret.items.map(i => (
                                                    <span key={i.id} className="text-base font-bold px-3.5 py-1.5 rounded-[12px] bg-black/5 dark:bg-white/10 text-slate-700 dark:text-white/80 border border-black/5 dark:border-white/5">
                                                        {i.product.name} × {parseFloat(i.quantity).toLocaleString('en-US')}
                                                    </span>
                                                ))}
                                            </div>
                                            {ret.settlement && (
                                                <p className="text-base font-black text-purple-500 mt-3">✓ تسوية مرتبطة: {fmt(ret.settlement.amount)} د.ل</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SpatialCard>
                    )}

                    {invoice.notes && (
                        <div className="px-6 py-5 rounded-[22px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/8">
                            <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-1">ملاحظات</p>
                            <p className="font-bold text-slate-800 dark:text-white/90 text-lg sm:text-xl">{invoice.notes}</p>
                        </div>
                    )}
                </div>
            </AppShell>

            <NumberPadModal isOpen={showPad} title={padTitle} initialValue={padInitial} maxValue={padMax}
                onClose={() => setShowPad(false)} onConfirm={v => { padCallback?.(v); setShowPad(false); }} />
        </>
    );
}
