import React, { useState, useRef, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import {
    ArrowRight, Plus, Trash2, Package, RefreshCw, RotateCcw,
    User, UserCheck, Clock, FileText, CheckCircle2, AlertTriangle,
    ChevronDown, Printer, AlertCircle
} from 'lucide-react';

interface PaymentMethod { id: number; name: string; }
interface Product       { id: number; name: string; }
interface Customer      { id: number; name: string; total_debt: string; }
interface ReturnItem    { id: number; product: Product; size: { label: string } | null; quantity: string; unit_price: string; line_total: string; }
interface Settlement    { id: number; payment_method: { name: string }; amount: string; notes: string | null; created_at: string; }
interface InvoiceReturn {
    id: number;
    customer: Customer;
    user: { name: string } | null;
    invoice: { id: number } | null;
    total: string;
    recovered_amount: string;
    due_recovery: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
    items: ReturnItem[];
    settlements: Settlement[];
}
interface Props {
    return:         InvoiceReturn;
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface SettlementRow { payment_method_id: string; amount: string; notes: string; }
const emptyRow = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

const recoveryLabel: Record<string, string> = {
    unpaid:  'لم يُسترد',
    partial: 'مسترد جزئياً',
    paid:    'مسترد بالكامل',
};

const recoveryClass: Record<string, string> = {
    unpaid:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
};

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
 * قائمة منسدلة مكتبية لوسائل التسوية مع مسافات مريحة وتنسيق حاد
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

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-11 px-3.5 rounded-[2px] border text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    isOpen
                        ? 'border-brand bg-sky-50 dark:bg-sky-950/20 text-slate-900 dark:text-white shadow-2xs'
                        : value
                            ? 'border-slate-300 dark:border-[#22354e] bg-slate-50/70 dark:bg-[#101a29] text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#101a29] text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-[#283e58]'
                }`}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 mr-1.5 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[200px]">
                    <ul className="max-h-64 overflow-y-auto p-2 flex flex-col gap-1.5">
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
                                        className={`px-4 py-3 rounded-[2px] text-xs sm:text-sm font-bold cursor-pointer flex items-center justify-between transition-all border ${
                                            isSelected
                                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 shadow-2xs'
                                                : 'bg-slate-50/60 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100 dark:hover:bg-[#131f32] hover:border-slate-300 dark:hover:border-[#253952]'
                                        }`}
                                    >
                                        <span>{opt.label}</span>
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
        setPadTitle(title);
        setPadInitial(initial);
        setPadMax(max);
        setPadCallback(() => cb);
        setShowPad(true);
    }

    const methodOptions = paymentMethods.map(m => ({ id: String(m.id), label: m.name }));
    const due           = parseFloat(ret.due_recovery);
    const rowsTotal     = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const isCancelled   = !!ret.deleted_at;
    const customerDebt  = parseFloat(ret.customer?.total_debt ?? '0');
    const customerIsCash = ret.customer?.id === 1;
    const maxSettlementLimit = Math.min(due, Math.abs(customerDebt < 0 ? customerDebt : 0));
    const canSettle     = !customerIsCash && !isCancelled && ret.recovery_status !== 'paid' && customerDebt < 0;

    const settlementMessage = (() => {
        if (isCancelled) return null;
        if (customerIsCash) return 'لا يمكن إنشاء تسوية للزبون النقدي';
        if (ret.recovery_status === 'paid') return 'تم استرداد المرتجع بالكامل';
        if (customerDebt >= 0) return `العميل لا يزال مديناً (${fmt(customerDebt)} د.ل)`;
        return null;
    })();

    function setRow(idx: number, field: keyof SettlementRow, val: string) {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function submitSettlements() {
        const valid = rows.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        if (valid.length === 0) return;
        setSubmitting(true);
        function postNext(i: number) {
            if (i >= valid.length) {
                setSubmitting(false);
                setRows([emptyRow()]);
                setShowForm(false);
                return;
            }
            const row = valid[i];
            router.post('/settlements', {
                customer_id:        String(ret.customer.id),
                invoice_id:         ret.invoice ? String(ret.invoice.id) : null,
                invoice_return_id:  String(ret.id),
                payment_method_id:  row.payment_method_id,
                amount:             row.amount,
                notes:              row.notes || null,
            }, {
                preserveScroll: true,
                onSuccess: () => postNext(i + 1),
                onError: () => setSubmitting(false)
            });
        }
        postNext(0);
    }

    const tabs = [
        { key: 'items',       label: `الأصناف المرتجعة (${ret.items.length})`, icon: <Package className="w-4 h-4" /> },
        { key: 'settlements', label: `التسويات المالية (${ret.settlements.length})`, icon: <RefreshCw className="w-4 h-4" /> },
    ] as const;

    return (
        <AppShell pageTitle={`مرتجع بيع #${ret.id}`}>
            <div className="flex flex-col gap-4 pb-20">

                {/* ══ 1. WORKSTATION HEADER BAR ══ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/invoice-returns"
                            className="h-9 w-9 rounded-[2px] border border-slate-200 dark:border-[#22354e] bg-slate-50 dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#18263b] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
                            title="العودة لسجل المرتجعات"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                                مرتجع بيع #{ret.id}
                            </span>
                            {isCancelled && (
                                <span className="px-2.5 py-0.5 rounded-[2px] text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                    ملغي
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {ret.invoice && (
                            <Link
                                href={`/invoices/${ret.invoice.id}`}
                                className="h-9 px-3.5 rounded-[2px] border border-sky-500/35 dark:border-sky-500/30 bg-sky-500/10 hover:bg-sky-600 hover:text-white! text-sky-700 dark:text-sky-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-2xs group"
                                title="عرض فاتورة البيع الأصلية"
                            >
                                <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:text-white transition-colors" />
                                <span className="group-hover:text-white transition-colors">الفاتورة الأصلية #{ret.invoice.id}</span>
                            </Link>
                        )}

                        {isCancelled && (
                            <RestoreModal
                                title="استعادة المرتجع"
                                description="هل أنت متأكد من استعادة هذا المرتجع الملغي؟ سيتم استعادة المخزون والتسويات المرتبطة."
                                onConfirm={() => router.post(`/invoice-returns/${ret.id}/restore`)}
                                trigger={
                                    <button
                                        type="button"
                                        className="h-9 px-3.5 rounded-[2px] border border-emerald-500/35 dark:border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white! text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer group"
                                    >
                                        <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                                        <span className="group-hover:text-white transition-colors">استعادة المرتجع</span>
                                    </button>
                                }
                            />
                        )}
                    </div>
                </div>

                {/* رسائل التنبيه والنجاح */}
                {flash?.success && (
                    <div className="px-4 py-3 rounded-[2px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="px-4 py-3 rounded-[2px] bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* ══ 2. WORKSTATION METADATA BAR ══ */}
                <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-brand shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">العميل:</span>
                        <Link
                            href={`/customers/${ret.customer.id}`}
                            className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-brand transition-colors"
                        >
                            {ret.customer.name}
                        </Link>
                    </div>

                    <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-[#283e58] hidden sm:block shrink-0" />

                    <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 text-brand shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الموظف المسؤول:</span>
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {ret.user?.name ?? '—'}
                        </span>
                    </div>

                    <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-[#283e58] hidden sm:block shrink-0" />

                    <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تاريخ وساعة الإرجاع:</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 dir-ltr">
                            {formatDate(ret.created_at)}
                        </span>
                    </div>

                    <div className="h-6 w-[1.5px] bg-slate-300 dark:bg-[#283e58] hidden sm:block shrink-0" />

                    <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الفاتورة المرجعية:</span>
                        {ret.invoice ? (
                            <Link
                                href={`/invoices/${ret.invoice.id}`}
                                className="font-mono font-bold text-sm sm:text-base text-sky-600 dark:text-sky-400 hover:underline"
                            >
                                #{ret.invoice.id}
                            </Link>
                        ) : (
                            <span className="font-bold text-sm sm:text-base text-slate-600 dark:text-slate-300">مرتجع حر (مستقل)</span>
                        )}
                    </div>
                </div>

                {/* ══ 3. KPI FINANCIAL SUMMARY ══ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">إجمالي المرتجع</span>
                        <div className="font-number font-black text-xl sm:text-2xl text-rose-600 dark:text-rose-400">
                            {fmt(ret.total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">المسترد (التسوية المالية)</span>
                        <div className="font-number font-black text-xl sm:text-2xl text-purple-600 dark:text-purple-400">
                            {fmt(ret.recovered_amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">المتبقي للاسترداد</span>
                        <div className={`font-number font-black text-xl sm:text-2xl ${due > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {fmt(ret.due_recovery)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs flex flex-col gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">رصيد حساب العميل الحالي</span>
                        <div className={`font-number font-black text-xl sm:text-2xl ${
                            customerDebt > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : customerDebt < 0
                                    ? 'text-purple-600 dark:text-purple-400'
                                    : 'text-slate-400 dark:text-slate-500'
                        }`}>
                            {fmt(customerDebt)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                        </div>
                    </div>
                </div>

                {/* ══ 4. TABS CONTROLS ══ */}
                <div className="flex items-center gap-1.5 p-1 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-slate-100 dark:bg-[#0c1421]">
                    {tabs.map(t => {
                        const isActive = activeTab === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setActiveTab(t.key)}
                                className={`flex-1 h-10 px-4 rounded-[2px] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-white dark:bg-[#121c2c] text-slate-900 dark:text-white border border-slate-200 dark:border-[#22354e] shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {t.icon}
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ══ 5. TAB 1: RETURNED ITEMS TABLE ══ */}
                {activeTab === 'items' && (
                    <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421]">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-brand" />
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    قائمة الأصناف المرتجعة ({ret.items.length})
                                </span>
                            </div>
                        </div>

                        {ret.items.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs sm:text-sm font-bold">
                                لا توجد أصناف مسجلة في هذا المرتجع
                            </div>
                        ) : (
                            <>
                                {/* جدول سطح المكتب */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full text-sm sm:text-base text-right">
                                        <thead>
                                            <tr className="bg-slate-100/60 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-300 font-bold">
                                                <th className="px-4 py-3 font-mono text-center w-16 text-xs sm:text-sm">#</th>
                                                <th className="px-4 py-3 text-xs sm:text-sm">اسم الصنف / المنتج</th>
                                                <th className="px-4 py-3 text-center text-xs sm:text-sm">الحجم</th>
                                                <th className="px-4 py-3 text-center font-mono text-xs sm:text-sm">الكمية</th>
                                                <th className="px-4 py-3 text-left font-mono text-xs sm:text-sm">سعر الوحدة</th>
                                                <th className="px-4 py-3 text-left font-mono text-xs sm:text-sm">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/70 dark:divide-[#162335]">
                                            {ret.items.map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#0e1828] transition-colors">
                                                    <td className="px-4 py-3.5 font-mono font-bold text-slate-400 dark:text-slate-500 text-center text-xs sm:text-sm">
                                                        #{idx + 1}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                            {item.product.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        {item.size ? (
                                                            <span className="px-2.5 py-1 rounded-[2px] bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-500/20 dark:border-sky-500/30">
                                                                {item.size.label}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 font-bold">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-left font-number font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap text-sm sm:text-base">
                                                        {fmt(item.unit_price)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-left font-number font-black text-rose-600 dark:text-rose-400 whitespace-nowrap text-sm sm:text-base">
                                                        {fmt(item.line_total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* بطاقات الموبايل */}
                                <div className="sm:hidden flex flex-col divide-y divide-slate-200/70 dark:divide-[#162335]">
                                    {ret.items.map(item => (
                                        <div key={item.id} className="p-3.5 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white">{item.product.name}</span>
                                                <span className="font-number font-black text-rose-600 text-sm">{fmt(item.line_total)} د.ل</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                {item.size && <span className="px-2 py-0.5 rounded-[2px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20">{item.size.label}</span>}
                                                <span>الكمية: {item.quantity}</span>
                                                <span>× {fmt(item.unit_price)} د.ل</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ══ 6. TAB 2: SETTLEMENTS & SETTLEMENT FORM ══ */}
                {activeTab === 'settlements' && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xs overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421]">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                                        سجل التسويات المالية للمرتجع ({ret.settlements.length})
                                    </span>
                                </div>

                                {canSettle && (
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(p => !p); setRows([emptyRow()]); }}
                                        className="h-9 px-3.5 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{showForm ? 'إخفاء نموذج التسوية' : 'تسجيل تسوية للمرتجع'}</span>
                                    </button>
                                )}
                            </div>

                            {/* تنبيه عدم إمكانية إنشاء تسوية */}
                            {settlementMessage && (
                                <div className="p-3.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{settlementMessage}</span>
                                </div>
                            )}

                            {/* نموذج تسجيل التسوية المباشر */}
                            {showForm && (
                                <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/70 dark:bg-[#0e1624] flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                            تسجيل تسوية استرداد مالي جديدة
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setRows(p => [...p, emptyRow()])}
                                            className="h-8 px-3 rounded-[2px] border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>إضافة طريقة دفع أخرى</span>
                                        </button>
                                    </div>

                                    {rows.map((row, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1.5fr_auto] gap-3 p-3.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] items-end"
                                        >
                                            <WorkstationSelect
                                                label="وسيلة التسوية / الرد"
                                                options={methodOptions}
                                                value={row.payment_method_id}
                                                placeholder="اختر وسيلة الدفع..."
                                                onSelect={val => setRow(idx, 'payment_method_id', val)}
                                            />

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">المبلغ المسترد</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const max = maxSettlementLimit - rows.reduce((sum, r, i) => i === idx ? sum : sum + (parseFloat(r.amount) || 0), 0);
                                                        openPad('المبلغ المسترد', row.amount || fmt(maxSettlementLimit), v => {
                                                            const val = parseFloat(v) || 0;
                                                            setRow(idx, 'amount', val > max ? String(max) : v);
                                                        }, max);
                                                    }}
                                                    className="h-11 px-3.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#070d18] font-number font-bold text-sm text-center cursor-pointer hover:border-brand transition-colors text-slate-900 dark:text-white flex items-center justify-between"
                                                >
                                                    <span className="text-slate-400 text-xs">القيمة:</span>
                                                    <span>{row.amount ? `${fmt(row.amount)} د.ل` : `${fmt(maxSettlementLimit)} د.ل`}</span>
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ملاحظات (اختياري)</label>
                                                <input
                                                    type="text"
                                                    value={row.notes}
                                                    onChange={e => setRow(idx, 'notes', e.target.value)}
                                                    placeholder="أدخل أي ملاحظة..."
                                                    className="h-11 px-3.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#070d18] text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden focus:border-brand"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => rows.length > 1 ? setRows(p => p.filter((_, i) => i !== idx)) : null}
                                                disabled={rows.length === 1}
                                                className="h-11 w-11 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                                                title="حذف هذا السطر"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                                            إجمالي مبالغ التسوية: <span className="font-number font-black text-purple-600 dark:text-purple-400 text-base">{fmt(rowsTotal)} د.ل</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowForm(false)}
                                                className="h-9 px-4 rounded-[2px] border border-slate-300 dark:border-[#22354e] bg-slate-100 hover:bg-slate-200 dark:bg-[#121c2c] dark:hover:bg-[#18263b] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                                            >
                                                إلغاء
                                            </button>
                                            <button
                                                type="button"
                                                onClick={submitSettlements}
                                                disabled={submitting || rowsTotal <= 0}
                                                className="h-9 px-5 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs"
                                            >
                                                {submitting ? 'جارٍ الحفظ...' : 'تأكيد وحفظ التسوية'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* جدول التسويات السابقة */}
                            {ret.settlements.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs sm:text-sm font-bold">
                                    لا توجد تسويات مالية مسجلة لهذا المرتجع بعد
                                </div>
                            ) : (
                                <>
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full text-sm sm:text-base text-right">
                                            <thead>
                                                <tr className="bg-slate-100/60 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-300 font-bold">
                                                    <th className="px-4 py-3 font-mono text-center w-16 text-xs sm:text-sm">#</th>
                                                    <th className="px-4 py-3 text-xs sm:text-sm">وسيلة التسوية</th>
                                                    <th className="px-4 py-3 text-left font-mono text-xs sm:text-sm">المبلغ</th>
                                                    <th className="px-4 py-3 text-xs sm:text-sm">ملاحظات</th>
                                                    <th className="px-4 py-3 text-center font-mono text-xs sm:text-sm">التاريخ والوقت</th>
                                                    <th className="px-4 py-3 text-center w-28 text-xs sm:text-sm">الإجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/70 dark:divide-[#162335]">
                                                {ret.settlements.map((s, idx) => (
                                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#0e1828] transition-colors">
                                                        <td className="px-4 py-3.5 font-mono font-bold text-slate-400 dark:text-slate-500 text-center text-xs sm:text-sm">
                                                            #{idx + 1}
                                                        </td>
                                                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                            {s.payment_method?.name ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-left font-number font-black text-purple-600 dark:text-purple-400 whitespace-nowrap text-sm sm:text-base">
                                                            {fmt(s.amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                                                            {s.notes ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                            {formatDate(s.created_at)}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center">
                                                            <DeleteModal
                                                                title="حذف التسوية المالية"
                                                                description="هل أنت متأكد من حذف هذه التسوية المالية من المرتجع؟ سيتم تعديل رصيد العميل فوراً."
                                                                onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                                trigger={
                                                                    <button
                                                                        type="button"
                                                                        className="h-8 px-2.5 rounded-[2px] border border-rose-500/35 dark:border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white! font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs group"
                                                                        title="حذف التسوية"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:text-white transition-colors" />
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

                                    {/* بطاقات الموبايل */}
                                    <div className="sm:hidden flex flex-col divide-y divide-slate-200/70 dark:divide-[#162335]">
                                        {ret.settlements.map(s => (
                                            <div key={s.id} className="p-3.5 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white">{s.payment_method?.name}</span>
                                                    <span className="font-number font-black text-purple-600 text-sm">{fmt(s.amount)} د.ل</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <span>{s.notes ?? 'بدون ملاحظات'}</span>
                                                    <span className="font-mono">{formatDate(s.created_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ 7. NOTES CALLOUT ══ */}
                {ret.notes && (
                    <div className="p-4 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/60 dark:bg-[#0c1421] shadow-2xs flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ملاحظات مسجلة على المرتجع:</span>
                        <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                            {ret.notes}
                        </p>
                    </div>
                )}
            </div>

            {/* مودال لوحة الأرقام المنبثق */}
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
