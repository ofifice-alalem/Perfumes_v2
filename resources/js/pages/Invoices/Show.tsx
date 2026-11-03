import { useState, Fragment, useRef, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { 
    ArrowRight, Plus, Trash2, Package, CreditCard, 
    RotateCcw, RefreshCw, Edit, Printer, Zap, 
    User, UserCheck, Clock, FileText, CheckCircle2, 
    AlertCircle, AlertTriangle, ChevronDown 
} from 'lucide-react';

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
    id: number; invoice_number: string | null; customer: Customer | null; user: { name: string } | null;
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
    unpaid:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
};
const saleTypeLabel: Record<string, string> = {
    tier_decant: 'زيتي/حجم', unit_decant: 'أصلي/تقسيم',
    full_bottle: 'عبوة كاملة', unit_based: 'وحدة',
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

/**
 * قائمة منسدلة مكتبية مباشرة لوسائل الدفع والتسوية بدون لوحة مفاتيح مع مسافات واسعة ومريحة للمس
 */
function WorkstationSelect({
    label,
    options,
    value,
    placeholder = 'اختر...',
    onSelect,
}: {
    label: string;
    options: { id: string; label: string }[];
    value: string;
    placeholder?: string;
    onSelect: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className="flex flex-col gap-1 relative" ref={containerRef}>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {label}
            </label>

            {/* الحقل التفاعلي */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-10 px-3 rounded-[2px] border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    isOpen
                        ? 'border-brand bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs'
                        : value
                            ? 'border-slate-300 dark:border-[#22354e] bg-slate-50/70 dark:bg-[#101a29] text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#101a29] text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-[#283e58]'
                }`}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 mr-1.5 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
            </button>

            {/* القائمة المنسدلة المباشرة مع مسافات مريحة وتنسيق بطاقات واضحة */}
            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[200px]">
                    <ul className="max-h-64 overflow-y-auto p-2 flex flex-col gap-2">
                        {options.length === 0 ? (
                            <li className="px-4 py-3 text-center text-xs font-semibold text-slate-400">
                                لا توجد خيارات متاحة
                            </li>
                        ) : (
                            options.map(opt => {
                                const isSelected = opt.id === value;
                                return (
                                    <li
                                        key={opt.id}
                                        onClick={() => {
                                            onSelect(opt.id);
                                            setIsOpen(false);
                                        }}
                                        className={`px-4 py-3.5 rounded-[2px] text-xs font-bold cursor-pointer flex items-center justify-between transition-all border ${
                                            isSelected
                                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 dark:border-sky-500/25 shadow-2xs'
                                                : 'bg-slate-50/60 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100 dark:hover:bg-[#131f32] hover:border-slate-300 dark:hover:border-[#253952]'
                                        }`}
                                    >
                                        <span className="text-xs sm:text-sm">{opt.label}</span>
                                        {isSelected && <span className="text-brand text-xs font-black">✓</span>}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
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

    const methodOptions = paymentMethods.map(m => ({ id: String(m.id), label: m.name }));
    function resolveMethodId(label: string) {
        return String(paymentMethods.find(m => m.name === label || String(m.id) === label)?.id ?? '');
    }

    const due = parseFloat(invoice.due_amount);
    const customerDebt = parseFloat(invoice.customer?.total_debt ?? '0');
    const maxPayment = Math.min(due, Math.max(0, customerDebt));
    const isCash = invoice.customer?.id === 1 || !invoice.customer;
    const isCancelled = !!invoice.deleted_at;

    const maxSettlementLimit = Math.abs(customerDebt < 0 ? customerDebt : 0);
    const canSetSettle = !isCash && !isCancelled && customerDebt < 0;

    const settlementMessage = (() => {
        if (isCancelled) return null;
        if (isCash) return 'لا يمكن إنشاء تسوية للزبون النقدي';
        if (customerDebt >= 0) return `العميل لا يزال مديناً (${fmt(customerDebt)} د.ل)`;
        return null;
    })();

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
        { key: 'items', label: `الأصناف (${invoice.items.length})`, icon: <Package className="w-4 h-4" /> },
        { key: 'payments', label: `الدفعات (${invoice.payments.length})`, icon: <CreditCard className="w-4 h-4" /> },
        { key: 'settlements', label: `التسويات (${invoice.settlements?.length ?? 0})`, icon: <RefreshCw className="w-4 h-4" /> },
        { key: 'returns', label: `المرتجعات (${invoice.returns.length})`, icon: <RotateCcw className="w-4 h-4" /> },
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
            alert('تعذر الاتصال بمحرك الطباعة الحرارية');
        } finally {
            setPrintingNode(false);
        }
    };

    return (
        <AppShell pageTitle={`فاتورة #${invoice.invoice_number || invoice.id}`}>
            <div className="flex flex-col gap-4 pb-24 sm:pb-36 mb-8 sm:mb-12">

                {/* ── الترويسة الرئيسية وأزرار الإجراءات السريعة (Workstation Header) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 dark:border-[#1d2d42] pb-3">
                    <div className="flex items-center gap-2.5">
                        <Link 
                            href="/invoices" 
                            className="h-9 w-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-slate-700 dark:text-slate-200 hover:border-brand hover:text-brand flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer" 
                            title="رجوع للفواتير"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="h-9 px-3 rounded-[2px] bg-slate-900 text-white dark:bg-sky-500/15 dark:text-sky-400 border border-slate-800 dark:border-sky-500/25 font-number font-black text-sm flex items-center shadow-2xs">
                                #{invoice.invoice_number || invoice.id}
                            </span>
                            <span className={`h-9 px-3 rounded-[2px] text-xs font-bold flex items-center ${statusClass[invoice.payment_status]}`}>
                                {statusLabel[invoice.payment_status]}
                            </span>
                            {isCancelled && (
                                <span className="h-9 px-3 rounded-[2px] bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center">
                                    ملغية
                                </span>
                            )}
                        </div>
                    </div>

                    {/* أزرار الإجراءات العلوية */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                            type="button"
                            onClick={handleNodeDirectPrint}
                            disabled={printingNode}
                            className="h-9 px-3.5 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{printingNode ? 'جاري الطباعة...' : 'طباعة فورية (Node)'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDirectPrint}
                            className="h-9 px-3.5 rounded-[2px] border border-sky-500/30 dark:border-sky-500/25 bg-sky-500/10 hover:bg-brand hover:text-white text-brand dark:text-sky-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة المتصفح</span>
                        </button>

                        {!isCancelled && (
                            <Link 
                                href={`/invoices/${invoice.id}/edit`} 
                                className="h-9 px-3.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] hover:bg-slate-50 dark:hover:bg-[#152338] text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                            >
                                <Edit className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                            </Link>
                        )}

                        {isCancelled && (
                            <RestoreModal
                                title="استعادة الفاتورة"
                                description="هل أنت متأكد من استعادة هذه الفاتورة؟ سيتم استعادة الدفعات والتسويات المرتبطة بها."
                                onConfirm={() => router.post(`/invoices/${invoice.id}/restore`)}
                                trigger={
                                    <button className="h-9 px-3.5 rounded-[2px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>استعادة الفاتورة</span>
                                    </button>
                                }
                            />
                        )}
                    </div>
                </div>

                {/* ── شريط بيانات الفاتورة المكتبي (Metadata Bar) ── */}
                <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] px-4 py-3 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-brand shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">العميل:</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {invoice.customer?.name ?? 'زبون نقدي'}
                        </span>
                    </div>

                    <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-[#283e58] hidden sm:block shrink-0" />

                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-brand shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">البائع / الكاشير:</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {invoice.user?.name ?? '—'}
                        </span>
                    </div>

                    <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-[#283e58] hidden sm:block shrink-0" />

                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تاريخ الإنشاء:</span>
                        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 dir-ltr">
                            {formatDate(invoice.created_at)}
                        </span>
                    </div>
                </div>

                {flash?.success && (
                    <div className="px-3.5 py-2 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="px-3.5 py-2 rounded-[2px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* ── شريط الملخص المالي المكتبي (Financial Summary Strip) ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">الإجمالي الكلي</span>
                        <div className="text-lg sm:text-xl font-black font-number text-slate-900 dark:text-white tabular-nums">
                            {fmt(invoice.total)} <span className="text-[11px] font-normal text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">المدفوع الفعلي</span>
                        <div className="text-lg sm:text-xl font-black font-number text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {fmt(invoice.paid_amount)} <span className="text-[11px] font-normal text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">المتبقي الآجل</span>
                        <div className={`text-lg sm:text-xl font-black font-number tabular-nums ${due > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {fmt(invoice.due_amount)} <span className="text-[11px] font-normal text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">دين العميل الإجمالي</span>
                        <div className={`text-lg sm:text-xl font-black font-number tabular-nums ${customerDebt > 0 ? 'text-rose-600 dark:text-rose-400' : customerDebt < 0 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {fmt(invoice.customer?.total_debt ?? '0')} <span className="text-[11px] font-normal text-slate-400">د.ل</span>
                        </div>
                    </div>
                </div>

                {/* ── شريط التبويبات المكتبي (Workstation Tabs) ── */}
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
                    {tabs.map((t, idx) => {
                        const isActive = activeTab === t.key;
                        return (
                            <Fragment key={t.key}>
                                {idx > 0 && (
                                    <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-[#283e58] shrink-0" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(t.key)}
                                    className={`h-10 sm:h-11 px-4 sm:px-5 rounded-[2px] font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border shadow-2xs ${
                                        isActive
                                            ? 'bg-brand text-white border-brand shadow-xs'
                                            : 'bg-white dark:bg-[#0c1421] text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-[#1d2d42] hover:border-slate-300 dark:hover:border-[#283e58] hover:bg-slate-50 dark:hover:bg-[#121c2c]'
                                    }`}
                                >
                                    {t.icon}
                                    <span>{t.label}</span>
                                </button>
                            </Fragment>
                        );
                    })}
                </div>

                {/* ── تبويب: الأصناف (Items Tab) ── */}
                {activeTab === 'items' && (
                    <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-brand" />
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">قائمة أصناف الفاتورة</h3>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-400">
                                {invoice.items.length} صنف
                            </span>
                        </div>

                        {(() => {
                            const groups = invoice.items.reduce((acc, item) => {
                                const sizeLabel = item.size?.label ?? null;
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

                            const groupList = Object.values(groups);

                            return (
                                <>
                                    {/* عرض الجدول المكتبي */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-xs text-right">
                                            <thead>
                                                <tr className="bg-slate-100/75 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-400 font-bold">
                                                    <th className="px-5 py-3.5">المنتج</th>
                                                    <th className="px-5 py-3.5 text-center">نوع البيع</th>
                                                    <th className="px-5 py-3.5 text-center">الحجم</th>
                                                    <th className="px-5 py-3.5 text-center font-mono">العدد / الكمية</th>
                                                    <th className="px-5 py-3.5 text-left font-mono">سعر الوحدة</th>
                                                    <th className="px-5 py-3.5 text-left font-mono">الإجمالي</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/90 dark:divide-[#1d2d42]">
                                                {groupList.map((g: any, idx: number) => {
                                                    const displayCount = g.sale_type === 'unit_based'
                                                        ? g.quantity
                                                        : (g.size_value && g.size_value > 0 ? Math.round(g.quantity / g.size_value) : g.count);
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#0e1828] transition-colors">
                                                            <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                                                                {g.name}
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                <span className="px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-[#121c2c] text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-[#1d2d42]">
                                                                    {saleTypeLabel[g.sale_type] ?? g.sale_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                {g.size_label ? (
                                                                    <span className="px-2.5 py-1 rounded-[2px] bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-bold border border-sky-500/20">
                                                                        {g.size_label}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400 font-bold">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                <span className="font-mono font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-[#121c2c] border border-slate-200 dark:border-[#1d2d42]">
                                                                    {displayCount}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 text-left font-number font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                                {fmt(g.unit_price)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                            </td>
                                                            <td className="px-5 py-4 text-left font-number font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                                {fmt(g.total)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* بطاقات الجوال */}
                                    <div className="p-3.5 flex flex-col gap-3 lg:hidden">
                                        {groupList.map((g: any, idx: number) => {
                                            const displayCount = g.sale_type === 'unit_based'
                                                ? g.quantity
                                                : (g.size_value && g.size_value > 0 ? Math.round(g.quantity / g.size_value) : g.count);
                                            return (
                                                <div key={idx} className="p-3.5 rounded-[2px] bg-slate-50/70 dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-2.5 shadow-2xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{g.name}</span>
                                                        <span className="font-number font-black text-sm text-slate-900 dark:text-white">{fmt(g.total)} د.ل</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                                        <span className="px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#121c2c] text-slate-600 dark:text-slate-300 text-[11px]">
                                                             {saleTypeLabel[g.sale_type] ?? g.sale_type}
                                                        </span>
                                                        {g.size_label && (
                                                            <span className="px-2 py-0.5 rounded-[2px] bg-sky-500/10 text-sky-600 text-[11px] font-bold">
                                                                {g.size_label}
                                                            </span>
                                                        )}
                                                        <span className="font-mono text-slate-500 text-[11px]">الكمية: {displayCount}</span>
                                                        <span className="text-slate-400 font-mono text-[11px]">السعر: {fmt(g.unit_price)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* ── تبويب: الدفعات (Payments Tab) ── */}
                {activeTab === 'payments' && (
                    <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-brand" />
                                <h3 className="font-bold text-xs text-slate-900 dark:text-white">سجل الدفعات المسجلة</h3>
                            </div>

                            {!isCash && !isCancelled && invoice.payment_status !== 'paid' && maxPayment > 0 && (
                                <button
                                    type="button"
                                    onClick={() => { setShowPayForm(p => !p); setPayRows([emptyPayRow()]); }}
                                    className="h-8 px-3 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-opacity cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>تسجيل دفع</span>
                                </button>
                            )}
                        </div>

                        {/* نموذج تسجيل دفعة جديدة */}
                        {showPayForm && (
                            <div className="m-4 p-4 rounded-[2px] bg-slate-50/80 dark:bg-[#09111c] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-3.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#19273b] pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">تسجيل دفعات جديدة</span>
                                        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/30 dark:border-sky-500/25 px-2 py-0.5 rounded-[2px]">
                                            الحد الأقصى المتاح: {fmt(maxPayment)} د.ل
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPayRows(p => [...p, emptyPayRow()])}
                                        className="h-8 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:border-brand text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-brand" />
                                        <span>إضافة وسيلة أخرى</span>
                                    </button>
                                </div>

                                {payRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1.5fr_160px_1fr_auto] gap-3 items-end p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#19273b]">
                                        <WorkstationSelect
                                            label="وسيلة الدفع"
                                            placeholder="اختر وسيلة الدفع..."
                                            value={row.payment_method_id}
                                            options={methodOptions}
                                            onSelect={id => setPayRow(idx, 'payment_method_id', id)}
                                        />

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">المبلغ</label>
                                            <button
                                                type="button"
                                                onClick={() => openPad('مبلغ الدفعة', row.amount || fmt(maxPayment), v => setPayRow(idx, 'amount', v), maxPayment)}
                                                className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand text-xs font-number font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer transition-colors"
                                            >
                                                <span>{row.amount ? `${fmt(row.amount)} د.ل` : <span className="text-slate-400 font-sans font-normal">حدد المبلغ...</span>}</span>
                                                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold bg-sky-500/10 border border-sky-500/30 dark:border-sky-500/25 px-1.5 py-0.5 rounded-[2px]">لوحة الأرقام</span>
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ملاحظة</label>
                                            <input
                                                type="text"
                                                value={row.notes}
                                                onChange={e => setPayRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..."
                                                className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-brand"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => payRows.length > 1 ? setPayRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={payRows.length === 1}
                                            className="h-10 w-10 rounded-[2px] border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                                            title="حذف السطر"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                {payRows.length > 1 && (
                                    <div className="flex items-center justify-between px-2 text-xs font-bold">
                                        <span className="text-slate-500">إجمالي الدفعات في هذا النموذج:</span>
                                        <span className={`font-number font-black ${payRowsTotal > maxPayment ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {fmt(payRowsTotal)} د.ل {payRowsTotal > maxPayment && '(يتجاوز الحد المتاح)'}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-[#19273b]">
                                    <button
                                        type="button"
                                        onClick={submitPayments}
                                        disabled={submitting || payRowsTotal > maxPayment || payRowsTotal <= 0}
                                        className="h-10 px-5 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <span>{submitting ? 'جارٍ الحفظ...' : 'حفظ الدفعات'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPayForm(false)}
                                        className="h-10 px-4 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#162438] transition-colors cursor-pointer"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}

                        {invoice.payments.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <CreditCard className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-bold">لا توجد دفعات مسجلة لهذه الفاتورة</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-right">
                                    <thead>
                                        <tr className="bg-slate-100/75 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-400 font-bold">
                                            <th className="px-5 py-3.5">وسيلة الدفع</th>
                                            <th className="px-5 py-3.5 text-left font-mono">المبلغ</th>
                                            <th className="px-5 py-3.5">ملاحظة</th>
                                            <th className="px-5 py-3.5">الموظف</th>
                                            <th className="px-5 py-3.5 text-center font-mono">التاريخ</th>
                                            <th className="px-5 py-3.5 text-center w-28">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/90 dark:divide-[#1d2d42]">
                                        {invoice.payments.map(pay => (
                                            <tr key={pay.id} className="hover:bg-slate-50/80 dark:hover:bg-[#0e1828] transition-colors">
                                                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                                                    {pay.payment_method.name}
                                                </td>
                                                <td className="px-5 py-4 text-left font-number font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                    {fmt(pay.amount)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                </td>
                                                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                    {pay.notes ?? '—'}
                                                </td>
                                                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                    {pay.user?.name ?? '—'}
                                                </td>
                                                <td className="px-5 py-4 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                    {new Date(pay.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {!isCancelled && (
                                                        <DeleteModal 
                                                            onConfirm={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                            trigger={
                                                                <button className="h-7 px-2.5 rounded-[2px] border border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer mx-auto">
                                                                    <Trash2 className="w-3 h-3" />
                                                                    <span>حذف</span>
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
                        )}
                    </div>
                )}

                {/* ── تبويب: التسويات (Settlements Tab) ── */}
                {activeTab === 'settlements' && (
                    <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-purple-500" />
                                <h3 className="font-bold text-xs text-slate-900 dark:text-white">سجل التسويات المالية</h3>
                            </div>

                            {canSetSettle && (
                                <button
                                    type="button"
                                    onClick={() => { setShowSetForm(p => !p); setSetRows([emptySetRow()]); }}
                                    className="h-8 px-3 rounded-[2px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>إضافة تسوية</span>
                                </button>
                            )}
                        </div>

                        {settlementMessage && (
                            <div className="m-3 px-3.5 py-2 rounded-[2px] bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    {settlementMessage}
                                </span>
                            </div>
                        )}

                        {showSetForm && (
                            <div className="m-4 p-4 rounded-[2px] bg-purple-500/5 border border-purple-500/20 flex flex-col gap-3.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">تسجيل تسوية جديدة</span>
                                    <button
                                        type="button"
                                        onClick={() => setSetRows(p => [...p, emptySetRow()])}
                                        className="h-8 px-3 rounded-[2px] border border-purple-500/30 bg-white dark:bg-[#121c2c] text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-purple-500" />
                                        <span>إضافة وسيلة أخرى</span>
                                    </button>
                                </div>

                                {setRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1.5fr_160px_1fr_auto] gap-3 items-end p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-purple-500/20">
                                        <WorkstationSelect
                                            label="وسيلة التسوية"
                                            placeholder="اختر وسيلة التسوية..."
                                            value={row.payment_method_id}
                                            options={methodOptions}
                                            onSelect={id => setSetRow(idx, 'payment_method_id', id)}
                                        />

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">المبلغ</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const max = maxSettlementLimit - setRows.reduce((sum, r, i) => i === idx ? sum : sum + (parseFloat(r.amount) || 0), 0);
                                                    openPad('مبلغ التسوية', row.amount || fmt(maxSettlementLimit), v => {
                                                        const val = parseFloat(v) || 0;
                                                        setSetRow(idx, 'amount', val > max ? String(max) : v);
                                                    }, max);
                                                }}
                                                className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand text-xs font-number font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer transition-colors"
                                            >
                                                <span>{row.amount ? `${fmt(row.amount)} د.ل` : <span className="text-slate-400 font-sans font-normal">حدد المبلغ...</span>}</span>
                                                <span className="text-[10px] text-purple-500 font-bold bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-[2px]">لوحة الأرقام</span>
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ملاحظة</label>
                                            <input
                                                type="text"
                                                value={row.notes}
                                                onChange={e => setSetRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..."
                                                className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-brand"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setRows.length > 1 ? setSetRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={setRows.length === 1}
                                            className="h-10 w-10 rounded-[2px] border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                                            title="حذف السطر"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <div className="flex items-center gap-2 pt-2 border-t border-purple-500/20">
                                    <button
                                        type="button"
                                        onClick={submitSettlements}
                                        disabled={submitting || setRowsTotal <= 0}
                                        className="h-10 px-5 rounded-[2px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <span>{submitting ? 'جارٍ الحفظ...' : 'حفظ التسوية'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSetForm(false)}
                                        className="h-10 px-4 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#162438] transition-colors cursor-pointer"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}

                        {!invoice.settlements || invoice.settlements.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <RefreshCw className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-bold">لا توجد تسويات مسجلة لهذه الفاتورة</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-right">
                                    <thead>
                                        <tr className="bg-slate-100/75 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-400 font-bold">
                                            <th className="px-5 py-3.5">وسيلة التسوية</th>
                                            <th className="px-5 py-3.5 text-left font-mono">المبلغ</th>
                                            <th className="px-5 py-3.5">ملاحظة</th>
                                            <th className="px-5 py-3.5">الموظف</th>
                                            <th className="px-5 py-3.5 text-center font-mono">التاريخ</th>
                                            <th className="px-5 py-3.5 text-center w-28">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/90 dark:divide-[#1d2d42]">
                                        {invoice.settlements.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-[#0e1828] transition-colors">
                                                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                                                    {s.payment_method.name}
                                                </td>
                                                <td className="px-5 py-4 text-left font-number font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                                    {fmt(s.amount)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                </td>
                                                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                    {s.notes ?? '—'}
                                                </td>
                                                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                    {s.user?.name ?? '—'}
                                                </td>
                                                <td className="px-5 py-4 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {!isCancelled && (
                                                        <DeleteModal 
                                                            onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                            trigger={
                                                                <button className="h-7 px-2.5 rounded-[2px] border border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer mx-auto">
                                                                    <Trash2 className="w-3 h-3" />
                                                                    <span>حذف</span>
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
                        )}
                    </div>
                )}

                {/* ── تبويب: المرتجعات (Returns Tab) ── */}
                {activeTab === 'returns' && (
                    <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-amber-500" />
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">سجل المرتجعات التابعة للفاتورة</h3>
                            </div>

                            {!isCancelled && (
                                <Link 
                                    href={`/invoice-returns/create?customer_id=${invoice.customer?.id ?? 1}&invoice_id=${invoice.id}`}
                                    className="h-8 px-3 rounded-[2px] bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>مرتجع جديد</span>
                                </Link>
                            )}
                        </div>

                        {invoice.returns.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <RotateCcw className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-bold">لا توجد مرتجعات مسجلة لهذه الفاتورة</p>
                            </div>
                        ) : (
                            <div className="p-4 flex flex-col gap-3.5">
                                {invoice.returns.map(ret => (
                                    <div key={ret.id} className="p-4 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-amber-500/30 flex flex-col gap-3 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <Link href={`/invoice-returns/${ret.id}`} className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-brand transition-colors">
                                                مرتجع #{ret.id}
                                            </Link>
                                            <span className="font-number font-black text-sm sm:text-base text-amber-600 dark:text-amber-400">
                                                {fmt(ret.total)} <span className="text-[10px] text-slate-400">د.ل</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {ret.items.map(i => (
                                                <span key={i.id} className="text-xs font-bold px-2.5 py-1 rounded-[2px] bg-white dark:bg-[#121c2c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1d2d42]">
                                                    {i.product.name} × {parseFloat(i.quantity).toLocaleString('en-US')}
                                                </span>
                                            ))}
                                        </div>
                                        {ret.settlement && (
                                            <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                                ✓ تسوية مرتبطة: {fmt(ret.settlement.amount)} د.ل
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── قسم الملاحظات (Notes Section) ── */}
                {invoice.notes && (
                    <div className="p-3.5 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ملاحظات الفاتورة</span>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{invoice.notes}</p>
                    </div>
                )}
            </div>

            {/* لوحة الأرقام المنبثقة */}
            <NumberPadModal 
                isOpen={showPad} 
                title={padTitle} 
                initialValue={padInitial} 
                maxValue={padMax}
                onClose={() => setShowPad(false)} 
                onConfirm={v => { padCallback?.(v); setShowPad(false); }} 
            />
        </AppShell>
    );
}
