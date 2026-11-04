import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Pagination } from '@/components/ui/SpatialComponents';
import {
    Plus, Eye, Trash2, RotateCcw, SlidersHorizontal, Search,
    AlertTriangle, X, CheckCircle2, AlertCircle, ChevronDown,
    FileText, Calendar, DollarSign, User as UserIcon, Package, Hash,
    Keyboard
} from 'lucide-react';

interface Customer { id: number; name: string; }
interface Product  { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface InvoiceReturn {
    id: number;
    customer: Customer | null;
    invoice: { id: number } | null;
    total: string;
    recovered_amount: string;
    due_recovery: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    created_at: string;
    deleted_at: string | null;
    settlements_total: string | null;
}
interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    returns:        Paginated<InvoiceReturn>;
    customers:      Customer[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const recoveryLabel: Record<string, string> = {
    unpaid:  'لم يُسترد',
    partial: 'مسترد جزئياً',
    paid:    'مسترد بالكامل',
};

const recoveryClass: Record<string, string> = {
    unpaid:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null) {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

/**
 * قائمة منسدلة ذكية تدعم البحث النصي السريع مع تصميم هندسي حاد متوافق مع محطة العمل
 */
function WorkstationSearchableSelect({
    label,
    options,
    value,
    placeholder = 'الكل',
    onSelect,
}: {
    label: string;
    options: { id: string; label: string }[];
    value: string;
    placeholder?: string;
    onSelect: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setSearch('');
        }
    }, [isOpen]);

    const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase().trim())
    );

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {label}
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-11 sm:h-12 px-3.5 rounded-[2px] border text-sm sm:text-base font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    isOpen
                        ? 'border-brand bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs'
                        : value
                            ? 'border-brand/50 dark:border-brand/40 bg-white dark:bg-[#111a29] text-slate-900 dark:text-white shadow-2xs'
                            : 'border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-[#2f486b]'
                }`}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 mr-1.5 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] flex flex-col overflow-hidden animate-in fade-in duration-100 min-w-[260px]">
                    <div className="p-2.5 border-b border-slate-100 dark:border-[#172437] bg-slate-50 dark:bg-[#0a121e]">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="بحث بالاسم..."
                                className="w-full h-10 pr-9 pl-3 text-sm rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#070d18] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-brand font-medium"
                            />
                        </div>
                    </div>

                    {/* خيارات القائمة بمربعات محددة وفاصل واضح ومريح للمس */}
                    <ul className="max-h-72 sm:max-h-80 overflow-y-auto custom-scroll p-2 space-y-1.5">
                        <li>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect('');
                                    setIsOpen(false);
                                }}
                                className={`w-full text-right px-4 py-3 sm:py-3.5 text-sm sm:text-base font-bold flex items-center justify-between cursor-pointer rounded-[2px] transition-all min-h-[48px] sm:min-h-[52px] ${
                                    !value
                                        ? 'bg-brand/10 border-2 border-brand text-brand font-black shadow-2xs'
                                        : 'bg-slate-50 hover:bg-slate-100/90 dark:bg-[#0e1624] dark:hover:bg-[#142033] border border-slate-200 dark:border-[#1c2a3f] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-[#2b3e5a]'
                                }`}
                            >
                                <span>الكل (إلغاء التحديد)</span>
                                {!value && <span className="text-brand text-sm sm:text-base font-bold">✓</span>}
                            </button>
                        </li>

                        {filtered.length === 0 ? (
                            <li className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 text-sm font-medium rounded-[2px] bg-slate-50/50 dark:bg-[#0a121e] border border-dashed border-slate-200 dark:border-[#1c2a3f]">
                                لا توجد نتائج مطابقة
                            </li>
                        ) : (
                            filtered.map(opt => {
                                const isSelected = opt.id === value;
                                return (
                                    <li key={opt.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelect(opt.id);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full text-right px-4 py-3 sm:py-3.5 text-sm sm:text-base font-bold flex items-center justify-between cursor-pointer rounded-[2px] transition-all min-h-[48px] sm:min-h-[52px] ${
                                                isSelected
                                                    ? 'bg-brand/10 border-2 border-brand text-brand font-black shadow-2xs'
                                                    : 'bg-slate-50 hover:bg-slate-100/90 dark:bg-[#0e1624] dark:hover:bg-[#142033] border border-slate-200 dark:border-[#1c2a3f] text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-[#2b3e5a]'
                                            }`}
                                        >
                                            <span className="truncate">{opt.label}</span>
                                            {isSelected && <span className="text-brand text-sm sm:text-base font-bold">✓</span>}
                                        </button>
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

/**
 * درج التصفية المتقدمة بتصميم محطة العمل
 */
function FilterDrawer({
    isOpen,
    onClose,
    children,
    applyFilter,
    resetFilter,
    hasFilter
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    applyFilter: () => void;
    resetFilter: () => void;
    hasFilter: boolean;
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-start dir-rtl">
            <div
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                onClick={onClose}
            />

            <div className="relative w-full sm:w-[500px] md:w-[540px] max-w-[95vw] h-full bg-white dark:bg-[#0a121e] shadow-2xl border-l border-slate-200 dark:border-[#1d2d42] flex flex-col animate-in slide-in-from-right duration-200 z-10 cursor-default">
                {/* الترويسة */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#19273b] shrink-0 bg-slate-50 dark:bg-[#0c1421]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[2px] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                            <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">تصفية المرتجعات المتقدمة</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">تخصيص نتائج البحث والفلترة بكفاءة عالية</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-[2px] border border-slate-200 dark:border-[#223348] text-slate-500 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* محتوى الحقول */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll">
                    {children}
                </div>

                {/* شريط الإجراءات */}
                <div className="px-6 py-3.5 border-t border-slate-200 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421] flex items-center gap-3 shrink-0 shadow-lg">
                    <button
                        onClick={applyFilter}
                        className="flex-1 h-12 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-sm sm:text-base transition-opacity flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                        <Search className="w-4 h-4" /> تطبيق الفلتر
                    </button>
                    {hasFilter && (
                        <button
                            onClick={resetFilter}
                            className="h-12 px-5 rounded-[2px] border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" /> إعادة تعيين
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * نافذة تأكيد إلغاء المرتجع بتصميم محطة العمل
 */
function CancelReturnModal({ ret, onClose }: { ret: InvoiceReturn; onClose: () => void }) {
    const [deleteSettlements, setDeleteSettlements] = useState(false);

    const isCash           = ret.customer?.id === 1;
    const settlementsTotal = parseFloat(ret.settlements_total ?? '0');
    const hasSettlements   = !isCash && settlementsTotal > 0;

    function confirm() {
        router.delete(`/invoice-returns/${ret.id}`, {
            data: { delete_settlements: isCash ? true : deleteSettlements },
            onSuccess: onClose,
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 dir-rtl">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in cursor-pointer" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-[2px] p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shadow-2xl z-10 text-right">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#19273b] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[2px] bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">إلغاء المرتجع #{ret.id}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273b] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                    هل أنت متأكد من إلغاء هذا المرتجع؟ سيتم استرجاع كميات الأصناف المرتجعة من المخزون إلى حالتها الأصلية.
                </p>

                {hasSettlements && (
                    <div className="flex flex-col gap-3 p-3.5 rounded-[2px] bg-slate-50 dark:bg-[#09111c] border border-slate-200 dark:border-[#1d2d42]">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">التسويات المرتبطة بهذا المرتجع:</span>
                            <span className="font-number font-black text-purple-600 dark:text-purple-400 text-sm">{fmt(String(settlementsTotal))} د.ل</span>
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-[#18263a]" />
                        <div className="flex flex-col gap-2 text-xs">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="delete_settlements"
                                    checked={deleteSettlements}
                                    onChange={() => setDeleteSettlements(true)}
                                    className="mt-0.5"
                                />
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-white">نعم، احذف التسويات معه</span>
                                    <span className="text-[11px] text-slate-500">المبلغ لم يُسترد فعلياً</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="delete_settlements"
                                    checked={!deleteSettlements}
                                    onChange={() => setDeleteSettlements(false)}
                                    className="mt-0.5"
                                />
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-white">لا، أبقِ التسويات كرصيد مستقل</span>
                                    <span className="text-[11px] text-slate-500">المبلغ استُرد فعلياً وسيبقى في حساب العميل</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-[#19273b]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-10 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-[#121c2c] dark:hover:bg-[#18263b] text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors border border-slate-200 dark:border-[#1d2d42] cursor-pointer"
                    >
                        تراجع
                    </button>
                    <button
                        type="button"
                        onClick={confirm}
                        className="flex-1 h-10 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>تأكيد الإلغاء</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function InvoiceReturnsIndex({ returns: data, customers, products, paymentMethods, flash }: Props) {
    const [cancelTarget, setCancelTarget] = useState<InvoiceReturn | null>(null);
    const [filterOpen, setFilterOpen]     = useState(false);
    const [showIdPad, setShowIdPad]       = useState(false);
    const [activeTab,  setActiveTab]      = useState<'active' | 'deleted'>('active');

    const activeReturns  = data.data.filter(r => !r.deleted_at);
    const deletedReturns = data.data.filter(r => r.deleted_at);
    const displayReturns = activeTab === 'active' ? activeReturns : deletedReturns;

    const params = new URLSearchParams(window.location.search);
    const [fCustomer,   setFCustomer]   = useState(params.get('filter[customer_id]') ?? '');
    const [fInvoiceId,  setFInvoiceId]  = useState(params.get('filter[invoice_id]') ?? '');
    const [fStatus,     setFStatus]     = useState(params.get('filter[recovery_status]') ?? '');
    const [fProduct,    setFProduct]    = useState(params.get('filter[product_id]') ?? '');
    const [fPayMethod,  setFPayMethod]  = useState(params.get('filter[payment_method_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');

    const hasFilter = Boolean(fCustomer || fInvoiceId || fStatus || fProduct || fPayMethod || fDateFrom || fDateTo || fAmountFrom || fAmountTo);

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fCustomer)   f['filter[customer_id]']       = fCustomer;
        if (fInvoiceId)  f['filter[invoice_id]']        = fInvoiceId;
        if (fStatus)     f['filter[recovery_status]']   = fStatus;
        if (fProduct)    f['filter[product_id]']        = fProduct;
        if (fPayMethod)  f['filter[payment_method_id]']  = fPayMethod;
        if (fDateFrom)   f['filter[date_from]']         = fDateFrom;
        if (fDateTo)     f['filter[date_to]']           = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']       = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']         = fAmountTo;
        setFilterOpen(false);
        router.get('/invoice-returns', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFCustomer(''); setFInvoiceId(''); setFStatus(''); setFProduct(''); setFPayMethod('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        setFilterOpen(false);
        router.get('/invoice-returns', {}, { preserveScroll: true });
    }

    return (
        <AppShell pageTitle="مرتجعات العملاء">
            <div className="flex flex-col gap-3.5 pb-24 sm:pb-36 mb-8 sm:mb-12">
                {/* ── الترويسة الرئيسية مع زر الإجراء السريع ── */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/90 dark:border-[#1d2d42] pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">مرتجعات العملاء</h1>
                            <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/30 dark:border-sky-500/25 px-2.5 py-0.5 rounded-[2px]">
                                {data.total} مرتجع
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">إدارة وتتبع مرتجعات فواتير المبيعات، استرداد المخزون والديون</p>
                    </div>

                    <Link 
                        href="/invoice-returns/create" 
                        className="h-9 px-4 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-opacity cursor-pointer shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>مرتجع بيع جديد</span>
                    </Link>
                </div>

                {/* التنبيهات السريعة */}
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

                {/* ── شريط التحكم الموحد: التبويبات + زر فتح الدرج ── */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] p-1.5 rounded-[2px]">
                    {/* التبويبات (Active / Deleted) */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('active')}
                            className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                                activeTab === 'active'
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-slate-600 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            المرتجعات النشطة ({activeReturns.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('deleted')}
                            className={`px-3.5 py-1.5 rounded-[2px] font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                                activeTab === 'deleted'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            المرتجعات الملغية ({deletedReturns.length})
                        </button>
                    </div>

                    {/* زر فتح درج التصفية المتقدمة */}
                    <div className="flex items-center gap-2">
                        {hasFilter && (
                            <button
                                type="button"
                                onClick={resetFilter}
                                className="h-9 px-3 rounded-[2px] border border-rose-300 dark:border-rose-900/50 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="إلغاء التصفية"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>إعادة تعيين</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setFilterOpen(true)}
                            className={`h-9 px-3.5 rounded-[2px] border font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                                hasFilter
                                    ? 'bg-brand/10 border-brand text-brand font-black'
                                    : 'bg-white dark:bg-[#0c1421] border-slate-300 dark:border-[#22354e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142032]'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4 text-brand" />
                            <span>تصفية المرتجعات</span>
                            {hasFilter && <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />}
                        </button>
                    </div>
                </div>

                {/* ── جدول البيانات المكتبي (Workstation Data Grid) ── */}
                <div className="spatial-card p-0 overflow-hidden border border-slate-200/90 dark:border-[#1d2d42]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421]">
                        <div className="flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 text-brand" />
                            <span className="text-sm font-bold text-slate-800 dark:text-white">
                                سجل المرتجعات ({displayReturns.length})
                            </span>
                        </div>
                        <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
                            صفحة {data.current_page} من {data.last_page || 1}
                        </div>
                    </div>

                    {displayReturns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                            <RotateCcw className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                            <span className="font-bold text-xs sm:text-sm">{activeTab === 'active' ? 'لا توجد مرتجعات بيع مسجلة' : 'لا توجد مرتجعات ملغية'}</span>
                        </div>
                    ) : (
                        <>
                            {/* عرض الجدول المكتبي للشاشات الكبيرة */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm sm:text-base text-right">
                                    <thead>
                                        <tr className="bg-slate-100/60 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-300 font-bold">
                                            <th className="px-4 py-3.5 font-mono text-center w-16 text-xs sm:text-sm">#</th>
                                            <th className="px-4 py-3.5 text-xs sm:text-sm">العميل</th>
                                            <th className="px-4 py-3.5 text-xs sm:text-sm">الفاتورة الأصلية</th>
                                            <th className="px-4 py-3.5 text-left font-mono text-xs sm:text-sm">إجمالي المرتجع</th>
                                            <th className="px-4 py-3.5 text-left font-mono text-xs sm:text-sm">المسترد (التسوية)</th>
                                            <th className="px-4 py-3.5 text-left font-mono text-xs sm:text-sm">المتبقي</th>
                                            <th className="px-4 py-3.5 text-center font-mono text-xs sm:text-sm">التاريخ</th>
                                            <th className="px-4 py-3.5 text-center w-36 text-xs sm:text-sm">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/70 dark:divide-[#162335]">
                                        {displayReturns.map(ret => {
                                            return (
                                                <tr 
                                                    key={ret.id} 
                                                    className={`hover:bg-slate-50 dark:hover:bg-[#0e1828] transition-colors ${ret.deleted_at ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''}`}
                                                >
                                                    <td className="px-4 py-3.5 font-mono font-bold text-slate-400 dark:text-slate-500 text-center text-xs sm:text-sm">
                                                        #{ret.id}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                            {ret.customer?.name ?? 'زبون نقدي'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {ret.invoice ? (
                                                            <Link
                                                                href={`/invoices/${ret.invoice.id}`}
                                                                className="text-sky-600 dark:text-sky-400 hover:underline font-mono font-bold text-xs sm:text-sm inline-flex items-center gap-1"
                                                                title="عرض فاتورة البيع الأصلية"
                                                            >
                                                                #{ret.invoice.id}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs sm:text-sm">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-left font-number font-black text-rose-600 dark:text-rose-400 whitespace-nowrap text-sm sm:text-base">
                                                        {fmt(ret.total)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-left font-number font-black text-purple-600 dark:text-purple-400 whitespace-nowrap text-sm sm:text-base">
                                                        {fmt(ret.recovered_amount)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-left font-number font-black text-amber-600 dark:text-amber-400 whitespace-nowrap text-sm sm:text-base">
                                                        {fmt(ret.due_recovery)} <span className="text-xs font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                        {fmtDate(ret.created_at)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Link 
                                                                href={`/invoice-returns/${ret.id}`} 
                                                                className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-[2px] border border-sky-500/35 dark:border-sky-500/30 bg-sky-500/10 hover:bg-sky-600 hover:text-white! text-sky-700 dark:text-sky-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                                                                title="عرض تفاصيل المرتجع"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 group-hover:text-white transition-colors" />
                                                                <span className="group-hover:text-white transition-colors">عرض</span>
                                                            </Link>
                                                            {ret.deleted_at ? (
                                                                <RestoreModal
                                                                    title="استعادة المرتجع"
                                                                    description="هل أنت متأكد من استعادة هذا المرتجع؟ سيتم استعادة سجلات التسوية المرتبطة والمخزون."
                                                                    onConfirm={() => router.post(`/invoice-returns/${ret.id}/restore`, {}, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button 
                                                                            type="button"
                                                                            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-[2px] border border-emerald-500/35 dark:border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white! font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                                                                            title="استعادة المرتجع"
                                                                        >
                                                                            <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                                                                            <span className="group-hover:text-white transition-colors">استعادة</span>
                                                                        </button>
                                                                    }
                                                                />
                                                            ) : (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setCancelTarget(ret)} 
                                                                    className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-[2px] border border-rose-500/35 dark:border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white! font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                                                                    title="إلغاء المرتجع"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:text-white transition-colors" />
                                                                    <span className="group-hover:text-white transition-colors">إلغاء</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* بطاقات الجوال للشاشات الصغيرة */}
                            <div className="flex flex-col divide-y divide-slate-200/80 dark:divide-[#19273b] lg:hidden">
                                {displayReturns.map(ret => {
                                    return (
                                        <div key={ret.id} className={`p-3.5 flex flex-col gap-2.5 ${ret.deleted_at ? 'opacity-60 bg-rose-50/20' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
                                                        {ret.customer?.name ?? 'زبون نقدي'}
                                                    </span>
                                                    <span className="font-mono text-xs sm:text-sm text-slate-400">
                                                        #{ret.id}
                                                    </span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-[2px] text-xs font-bold ${ret.deleted_at ? 'bg-rose-500/10 text-rose-600' : (recoveryClass[ret.recovery_status] || 'bg-slate-100 text-slate-600')}`}>
                                                    {ret.deleted_at ? 'ملغي' : (recoveryLabel[ret.recovery_status] || '—')}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-[2px] bg-slate-50 dark:bg-[#0e1726] border border-slate-200/70 dark:border-[#1d2d42] text-xs sm:text-sm">
                                                <div>
                                                    <div className="text-slate-400 text-xs">المرتجع</div>
                                                    <div className="font-number font-black text-rose-600 text-sm sm:text-base">{fmt(ret.total)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 text-xs">التسوية</div>
                                                    <div className="font-number font-black text-purple-600 text-sm sm:text-base">{fmt(ret.recovered_amount)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 text-xs">المتبقي</div>
                                                    <div className="font-number font-black text-amber-600 text-sm sm:text-base">{fmt(ret.due_recovery)}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <span className="font-mono text-xs sm:text-sm text-slate-400">{fmtDate(ret.created_at)}</span>
                                                <div className="flex items-center gap-2">
                                                    <Link 
                                                        href={`/invoice-returns/${ret.id}`} 
                                                        className="h-8 sm:h-9 px-3.5 rounded-[2px] border border-sky-500/35 dark:border-sky-500/30 bg-sky-500/10 hover:bg-sky-600 hover:text-white! text-sky-700 dark:text-sky-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all group"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 group-hover:text-white transition-colors" />
                                                        <span className="group-hover:text-white transition-colors">عرض</span>
                                                    </Link>
                                                    {ret.deleted_at ? (
                                                        <RestoreModal
                                                            title="استعادة المرتجع"
                                                            description="هل أنت متأكد من استعادة هذا المرتجع؟"
                                                            onConfirm={() => router.post(`/invoice-returns/${ret.id}/restore`, {}, { preserveScroll: true })}
                                                            trigger={
                                                                <button className="h-8 sm:h-9 px-3.5 rounded-[2px] border border-emerald-500/35 dark:border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all">
                                                                    <RotateCcw className="w-3.5 h-3.5" /> استعادة
                                                                </button>
                                                            }
                                                        />
                                                    ) : (
                                                        <button 
                                                            onClick={() => setCancelTarget(ret)} 
                                                            className="h-8 sm:h-9 px-3.5 rounded-[2px] border border-rose-500/35 dark:border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> إلغاء
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* الترقيم والتنقل بين الصفحات */}
                            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421] w-full">
                                <Pagination links={data.links} currentPage={data.current_page} lastPage={data.last_page} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* درج التصفية المتقدمة */}
            <FilterDrawer
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                applyFilter={applyFilter}
                resetFilter={resetFilter}
                hasFilter={hasFilter}
            >
                <div className="flex flex-col gap-3.5">
                    {/* تصفية برقم الفاتورة الأصلية مع لوحة الأرقام */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                            رقم الفاتورة الأصلية
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowIdPad(true)}
                            className={`h-11 sm:h-12 px-3.5 rounded-[2px] border text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                                fInvoiceId 
                                    ? 'border-brand/50 dark:border-brand/40 bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs' 
                                    : 'border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-[#2f486b]'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-brand" />
                                <span className="font-number font-bold text-sm sm:text-base">{fInvoiceId ? `#${fInvoiceId}` : 'ادخل رقم الفاتورة (لوحة أرقام)...'}</span>
                            </div>
                            {fInvoiceId ? (
                                <span
                                    onClick={(e) => { e.stopPropagation(); setFInvoiceId(''); }}
                                    className="px-2 py-1 rounded-[2px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold border border-rose-500/20 transition-colors"
                                >
                                    مسح
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded-[2px]">
                                    لوحة الأرقام
                                </span>
                            )}
                        </button>
                    </div>

                    {/* تصفية بالعميل */}
                    <WorkstationSearchableSelect
                        label="العميل"
                        placeholder="كل العملاء"
                        options={customers.map(c => ({ id: String(c.id), label: c.name }))}
                        value={fCustomer}
                        onSelect={setFCustomer}
                    />

                    {/* تصفية بالمنتج */}
                    <WorkstationSearchableSelect
                        label="المنتج المرتجع"
                        placeholder="كل المنتجات"
                        options={products.map(p => ({ id: String(p.id), label: p.name }))}
                        value={fProduct}
                        onSelect={setFProduct}
                    />

                    {/* تصفية بوسيلة الدفع / التسوية */}
                    <WorkstationSearchableSelect
                        label="وسيلة التسوية"
                        placeholder="كل الوسائل"
                        options={paymentMethods.map(m => ({ id: String(m.id), label: m.name }))}
                        value={fPayMethod}
                        onSelect={setFPayMethod}
                    />

                    {/* تصفية بحالة الاسترداد */}
                    <WorkstationSearchableSelect
                        label="حالة الاسترداد"
                        placeholder="كل الحالات"
                        options={[
                            { id: 'unpaid',  label: 'لم يُسترد' },
                            { id: 'partial', label: 'مسترد جزئياً' },
                            { id: 'paid',    label: 'مسترد بالكامل' },
                        ]}
                        value={fStatus}
                        onSelect={setFStatus}
                    />

                    {/* تصفية بنطاق المبالغ */}
                    <AmountRangeInput
                        label="إجمالي المرتجع (من — إلى)"
                        valueFrom={fAmountFrom}
                        valueTo={fAmountTo}
                        onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }}
                    />

                    {/* تصفية بالتواريخ */}
                    <div className="grid grid-cols-2 gap-2">
                        <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
                        <DateFilterInput label="إلى تاريخ" value={fDateTo} onChange={setFDateTo} />
                    </div>
                </div>
            </FilterDrawer>

            {/* لوحة الأرقام المنبثقة لرقم الفاتورة الأصلية */}
            <NumberPadModal
                isOpen={showIdPad}
                title="البحث برقم الفاتورة الأصلية"
                initialValue={fInvoiceId}
                onClose={() => setShowIdPad(false)}
                onConfirm={v => { setFInvoiceId(v); setShowIdPad(false); }}
            />

            {/* نافذة تأكيد إلغاء المرتجع */}
            {cancelTarget && (
                <CancelReturnModal ret={cancelTarget} onClose={() => setCancelTarget(null)} />
            )}
        </AppShell>
    );
}
