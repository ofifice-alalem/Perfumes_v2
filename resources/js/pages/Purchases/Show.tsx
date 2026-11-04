import { useState, useRef, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { 
    ArrowRight, Plus, Trash2, Package, CreditCard, 
    RotateCcw, User, UserCheck, Clock, FileText, 
    CheckCircle2, AlertCircle, ChevronDown, ShoppingCart
} from 'lucide-react';

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
 * قائمة منسدلة مكتبية مباشرة لوسائل الدفع بدون لوحة مفاتيح مع مسافات مريحة للمس
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

            {/* القائمة المنسدلة المباشرة */}
            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[200px]">
                    <ul className="max-h-56 overflow-y-auto custom-scroll p-1.5 space-y-1">
                        <li
                            onClick={() => {
                                onSelect('');
                                setIsOpen(false);
                            }}
                            className={`px-3 py-2 text-xs font-bold cursor-pointer flex items-center justify-between rounded-[2px] transition-colors ${
                                !value
                                    ? 'bg-brand/10 text-brand font-black'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142033]'
                            }`}
                        >
                            <span>{placeholder}</span>
                            {!value && <span className="text-brand text-xs font-bold">✓</span>}
                        </li>

                        {options.map(opt => {
                            const isSelected = opt.id === value;
                            return (
                                <li
                                    key={opt.id}
                                    onClick={() => {
                                        onSelect(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className={`px-3 py-2 text-xs font-bold cursor-pointer flex items-center justify-between rounded-[2px] transition-colors ${
                                        isSelected
                                            ? 'bg-brand/10 text-brand font-black'
                                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142033]'
                                    }`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {isSelected && <span className="text-brand text-xs font-bold">✓</span>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
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

    function setRow(idx: number, field: keyof PaymentRow, val: string) {
        setPaymentRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    const due          = parseFloat(purchase.due_amount);
    const supplierDebt = parseFloat(purchase.supplier?.total_debt ?? '0');
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

    const isCash      = purchase.supplier?.id === 1;
    const isCancelled = !!purchase.deleted_at;

    const tabs = [
        { key: 'items',    label: `الأصناف والمواد (${purchase.items.length})` },
        { key: 'payments', label: `سجل الدفعات (${purchase.payments.length})` },
        { key: 'returns',  label: `المرتجعات المرتبطة (${purchase.returns.length})` },
    ] as const;

    return (
        <AppShell pageTitle={`فاتورة شراء #${purchase.id}`}>
            <div className="flex flex-col gap-3.5 pb-24 sm:pb-36 mb-8 sm:mb-12">

                {/* ── الترويسة الرئيسية مع أزرار الإجراءات السريعة ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 dark:border-[#1d2d42] pb-3">
                    <div className="flex items-center gap-2.5">
                        <Link 
                            href="/purchases" 
                            className="w-9 h-9 rounded-[2px] border border-slate-200 dark:border-[#223348] bg-white dark:bg-[#101a29] hover:bg-slate-50 dark:hover:bg-[#152338] text-slate-600 dark:text-[#8fa1b5] flex items-center justify-center transition-colors shadow-2xs shrink-0" 
                            title="رجوع للمشتريات"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white">
                                فاتورة شراء #{purchase.id}
                            </span>
                            {isCancelled && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-[2px] bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400">
                                    ملغية
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isCancelled ? (
                            <RestoreModal
                                title="استعادة فاتورة الشراء"
                                description="هل أنت متأكد من رغبتك في استعادة هذه الفاتورة؟ سيتم استعادة الكميات وحسابات المورد المرتبطة بها."
                                onConfirm={() => router.post(`/purchases/${purchase.id}/restore`)}
                                trigger={
                                    <button 
                                        type="button"
                                        className="h-9 px-3.5 rounded-[2px] border border-emerald-500/35 dark:border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white! font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                                        <span className="group-hover:text-white transition-colors">استعادة الفاتورة</span>
                                    </button>
                                }
                            />
                        ) : (
                            <Link 
                                href={`/purchase-returns/create?purchase_id=${purchase.id}&supplier_id=${purchase.supplier.id}`}
                                className="h-9 px-3.5 rounded-[2px] border border-amber-500/35 dark:border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white! font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:text-white transition-colors" />
                                <span className="group-hover:text-white transition-colors">إنشاء مرتجع</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* رسائل التنبيه والنجاح */}
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

                {/* ── شريط البيانات الوصفية (Metadata Bar) ── */}
                <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-brand shrink-0" />
                        <span className="font-bold text-slate-500 dark:text-slate-400">المورد:</span>
                        <Link href={`/suppliers/${purchase.supplier.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brand transition-colors text-sm">
                            {purchase.supplier.name}
                        </Link>
                    </div>

                    <div className="h-4 w-px bg-slate-200 dark:bg-[#1d2d42] hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-brand shrink-0" />
                        <span className="font-bold text-slate-500 dark:text-slate-400">الموظف المسؤول:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                            {purchase.user?.name ?? '—'}
                        </span>
                    </div>

                    <div className="h-4 w-px bg-slate-200 dark:bg-[#1d2d42] hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-500 dark:text-slate-400">تاريخ الإنشاء:</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300 dir-ltr">
                            {formatDate(purchase.created_at)}
                        </span>
                    </div>
                </div>

                {/* ── شريط الملخص المالي المدمج (Financial Totals Strip) ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-1 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي الفاتورة</span>
                        <div className="font-number font-black text-base sm:text-lg text-slate-900 dark:text-white">
                            {fmt(purchase.total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-1 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي المدفوع</span>
                        <div className="font-number font-black text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                            {fmt(purchase.paid_amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-1 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">المبلغ المتبقي</span>
                        <div className={`font-number font-black text-base sm:text-lg ${due > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {fmt(purchase.due_amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-1 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">دين المورد الكلي</span>
                        <div className={`font-number font-black text-base sm:text-lg ${supplierDebt > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {fmt(supplierDebt)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>
                </div>

                {/* ── شريط التبويبات الموحد ── */}
                <div className="flex items-center gap-1.5 p-1 rounded-[2px] bg-slate-50 dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                    {tabs.map(t => (
                        <button 
                            key={t.key} 
                            type="button"
                            onClick={() => setActiveTab(t.key)}
                            className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                                activeTab === t.key 
                                    ? 'bg-brand text-white shadow-xs' 
                                    : 'text-slate-600 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── تبويب 1: الأصناف والمواد المسجلة ── */}
                {activeTab === 'items' && (
                    <div className="spatial-card p-0 overflow-hidden border border-slate-200/90 dark:border-[#1d2d42]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421]">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-brand" />
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    قائمة الأصناف والمواد ({purchase.items.length})
                                </span>
                            </div>
                        </div>

                        {purchase.items.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <Package className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-bold">لا توجد مواد مسجلة في الفاتورة</p>
                            </div>
                        ) : (
                            <>
                                {/* عرض الجدول المكتبي للشاشات الكبيرة */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-sm sm:text-base text-right">
                                        <thead>
                                            <tr className="bg-slate-100/60 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-300 font-bold">
                                                <th className="px-4 py-3 font-mono text-center w-14 text-xs sm:text-sm">#</th>
                                                <th className="px-4 py-3 text-xs sm:text-sm">اسم المادة / الصنف</th>
                                                <th className="px-4 py-3 text-center font-mono text-xs sm:text-sm w-32">الكمية</th>
                                                <th className="px-4 py-3 text-left font-mono text-xs sm:text-sm w-36">سعر الوحدة</th>
                                                <th className="px-4 py-3 text-left font-mono text-xs sm:text-sm w-40">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/70 dark:divide-[#162335]">
                                            {purchase.items.map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#0e1828] transition-colors">
                                                    <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                            {item.product.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="font-number font-bold px-2.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-[#121c2c] text-slate-800 dark:text-slate-200 text-xs sm:text-sm border border-slate-200 dark:border-[#1d2d42]">
                                                            {parseFloat(item.quantity).toLocaleString('en-US')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-left font-number font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm whitespace-nowrap">
                                                        {fmt(item.unit_cost)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-left font-number font-black text-slate-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                                                        {fmt(item.line_total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* بطاقات الجوال للشاشات الصغيرة */}
                                <div className="flex flex-col divide-y divide-slate-200/80 dark:divide-[#19273b] lg:hidden">
                                    {purchase.items.map((item, idx) => (
                                        <div key={item.id} className="p-3.5 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-slate-400">#{idx + 1}</span>
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {item.product.name}
                                                    </span>
                                                </div>
                                                <span className="font-number font-black text-sm text-slate-900 dark:text-white">
                                                    {fmt(item.line_total)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0e1726] p-2 rounded-[2px] border border-slate-200/70 dark:border-[#1d2d42]">
                                                <span>الكمية: <strong className="text-slate-800 dark:text-slate-200 font-number">{parseFloat(item.quantity).toLocaleString('en-US')}</strong></span>
                                                <span>سعر الوحدة: <strong className="text-slate-800 dark:text-slate-200 font-number">{fmt(item.unit_cost)} د.ل</strong></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── تبويب 2: سجل الدفعات المسجلة ── */}
                {activeTab === 'payments' && (
                    <div className="spatial-card p-0 overflow-hidden border border-slate-200/90 dark:border-[#1d2d42]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421]">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-brand" />
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    الدفعات المسجلة ({purchase.payments.length})
                                </span>
                            </div>

                            {!isCash && !isCancelled && purchase.payment_status !== 'paid' && maxPayment > 0 && (
                                <button 
                                    type="button"
                                    onClick={() => { setShowPaymentForm(p => !p); setPaymentRows([emptyRow()]); }}
                                    className="h-8 px-3 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 transition-opacity cursor-pointer shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>تسجيل دفع</span>
                                </button>
                            )}
                        </div>

                        {/* نموذج إضافة دفعة جديد منسدل */}
                        {showPaymentForm && (
                            <div className="p-4 bg-slate-50/80 dark:bg-[#0a121e] border-b border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-xs text-slate-900 dark:text-white">إضافة دفعة للمورد</span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            الحد الأقصى المتاح: <strong className="text-brand font-number">{fmt(maxPayment)} د.ل</strong>
                                        </span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentRows(p => [...p, emptyRow()])}
                                        className="h-7 px-2.5 rounded-[2px] border border-slate-300 dark:border-[#22354e] bg-white dark:bg-[#101a29] hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> إضافة وسيلة
                                    </button>
                                </div>

                                {paymentRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_160px_1.5fr_auto] gap-2.5 items-end p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42]">
                                        <WorkstationSelect
                                            label="وسيلة الدفع"
                                            options={paymentMethods.map(m => ({ id: String(m.id), label: m.name }))}
                                            value={row.payment_method_id}
                                            placeholder="اختر وسيلة الدفع..."
                                            onSelect={val => setRow(idx, 'payment_method_id', val)}
                                        />

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">المبلغ</label>
                                            <button
                                                type="button"
                                                onClick={() => openPad('المبلغ', row.amount || fmt(maxPayment), v => setRow(idx, 'amount', v), maxPayment)}
                                                className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#101a29] hover:border-brand text-xs font-number font-bold text-slate-900 dark:text-white text-center flex items-center justify-center cursor-pointer transition-colors"
                                            >
                                                {row.amount ? `${row.amount} د.ل` : <span className="text-slate-400 font-normal">{fmt(maxPayment)}</span>}
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ملاحظة</label>
                                            <input 
                                                value={row.notes}
                                                onChange={e => setRow(idx, 'notes', e.target.value)}
                                                placeholder="اختياري..."
                                                className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#101a29] text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-brand"
                                            />
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={() => paymentRows.length > 1 ? setPaymentRows(p => p.filter((_, i) => i !== idx)) : null}
                                            disabled={paymentRows.length === 1}
                                            className="h-10 w-10 rounded-[2px] border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                            title="حذف السطر"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                {paymentRows.length > 1 && (
                                    <div className="flex items-center justify-between px-1 text-xs font-bold">
                                        <span className="text-slate-500">إجمالي المبالغ المُدخلة:</span>
                                        <span className={`font-number ${rowsTotal > maxPayment ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {fmt(rowsTotal)} د.ل {rowsTotal > maxPayment && '(يتجاوز الحد الأقصى)'}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-1">
                                    <button 
                                        type="button"
                                        onClick={submitPayments}
                                        disabled={submitting || rowsTotal > maxPayment || rowsTotal <= 0}
                                        className="h-9 px-4 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs transition-opacity flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
                                    >
                                        {submitting ? 'جارٍ الحفظ...' : 'حفظ الدفعات'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowPaymentForm(false)}
                                        className="h-9 px-3 rounded-[2px] border border-slate-200 dark:border-[#223348] text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}

                        {purchase.payments.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <CreditCard className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-bold">لا توجد دفعات مسجلة لهذه الفاتورة</p>
                            </div>
                        ) : (
                            <>
                                {/* عرض الجدول للشاشات الكبيرة */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-sm sm:text-base text-right">
                                        <thead>
                                            <tr className="bg-slate-100/60 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-300 font-bold">
                                                <th className="px-4 py-3 text-xs sm:text-sm">وسيلة الدفع</th>
                                                <th className="px-4 py-3 text-left font-mono text-xs sm:text-sm w-36">المبلغ</th>
                                                <th className="px-4 py-3 text-xs sm:text-sm">ملاحظة</th>
                                                <th className="px-4 py-3 text-center font-mono text-xs sm:text-sm w-44">التاريخ والوقت</th>
                                                <th className="px-4 py-3 text-center w-24 text-xs sm:text-sm">إجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/70 dark:divide-[#162335]">
                                            {purchase.payments.map(pay => (
                                                <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-[#0e1828] transition-colors">
                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                                        {pay.payment_method?.name ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-left font-number font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm whitespace-nowrap">
                                                        {fmt(pay.amount)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium truncate max-w-xs">
                                                        {pay.notes ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap dir-ltr">
                                                        {formatDate(pay.created_at)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <DeleteModal 
                                                            onConfirm={() => router.delete(`/supplier-payments/${pay.id}`, { preserveScroll: true })}
                                                            trigger={
                                                                <button 
                                                                    type="button"
                                                                    className="h-7 px-2.5 rounded-[2px] border border-rose-500/35 dark:border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white! font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs group"
                                                                    title="حذف الدفعة"
                                                                >
                                                                    <Trash2 className="w-3 h-3 text-rose-500 group-hover:text-white transition-colors" />
                                                                    <span className="group-hover:text-white transition-colors">حذف</span>
                                                                </button>
                                                            } 
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* بطاقات الجوال للشاشات الصغيرة */}
                                <div className="flex flex-col divide-y divide-slate-200/80 dark:divide-[#19273b] lg:hidden">
                                    {purchase.payments.map(pay => (
                                        <div key={pay.id} className="p-3.5 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                    {pay.payment_method?.name ?? '—'}
                                                </span>
                                                <span className="font-number font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                                    {fmt(pay.amount)} <span className="text-[10px] text-slate-400">د.ل</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span className="truncate max-w-[200px]">{pay.notes ?? 'لا توجد ملاحظات'}</span>
                                                <span className="font-mono text-[11px] dir-ltr">{formatDate(pay.created_at)}</span>
                                            </div>
                                            <div className="pt-1.5 flex justify-end">
                                                <DeleteModal 
                                                    onConfirm={() => router.delete(`/supplier-payments/${pay.id}`, { preserveScroll: true })}
                                                    trigger={
                                                        <button 
                                                            type="button"
                                                            className="h-7 px-2.5 rounded-[2px] border border-rose-500/35 dark:border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white! font-bold text-[11px] flex items-center gap-1 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            <span>حذف الدفعة</span>
                                                        </button>
                                                    } 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── تبويب 3: المرتجعات المرتبطة ── */}
                {activeTab === 'returns' && (
                    <div className="spatial-card p-0 overflow-hidden border border-slate-200/90 dark:border-[#1d2d42]">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421]">
                            <div className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    المرتجعات المرتبطة ({purchase.returns.length})
                                </span>
                            </div>
                        </div>

                        {purchase.returns.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                <RotateCcw className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-bold">لا توجد مرتجعات مسجلة لهذه الفاتورة</p>
                            </div>
                        ) : (
                            <div className="p-4 flex flex-col gap-3">
                                {purchase.returns.map(ret => (
                                    <div key={ret.id} className="p-3.5 rounded-[2px] bg-slate-50/70 dark:bg-[#0a121e] border border-amber-500/30 flex flex-col gap-2.5 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <Link href={`/purchase-returns/${ret.id}`} className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-brand transition-colors">
                                                مرتجع شراء #{ret.id}
                                            </Link>
                                            <span className="font-number font-black text-sm sm:text-base text-amber-600 dark:text-amber-400">
                                                {fmt(ret.total)} <span className="text-[10px] text-slate-400">د.ل</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {ret.items.map(i => (
                                                <span key={i.id} className="text-xs font-bold px-2 py-0.5 rounded-[2px] bg-white dark:bg-[#121c2c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1d2d42]">
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

                {/* ── قسم الملاحظات ── */}
                {purchase.notes && (
                    <div className="p-3.5 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ملاحظات الفاتورة</span>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{purchase.notes}</p>
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
