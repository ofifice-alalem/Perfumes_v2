import { useState, useRef, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { Pagination, DraggableOnScreenKeyboard } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { createPortal } from 'react-dom';
import {
    Plus, Eye, Trash2, RotateCcw, AlertTriangle, X,
    SlidersHorizontal, Search, FileText, CheckCircle2,
    AlertCircle, Hash, ShoppingCart, User as UserIcon,
    Calendar, DollarSign, Keyboard, ChevronDown
} from 'lucide-react';

interface Customer { id: number; name: string; }
interface User     { id: number; name: string; }
interface Product  { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface Invoice {
    id: number;
    invoice_number: string | null;
    customer: Customer | null;
    user: { name: string } | null;
    total: string;
    paid_amount: string;
    due_amount: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
    settlements_total: string | null;
    customer_id: number | null;
}
interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    invoices:       Paginated<Invoice>;
    customers:      Customer[];
    users:          User[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass = {
    unpaid:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtDate(v: string | null) {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
}

/**
 * قائمة منسدلة ذكية تدعم البحث النصي المباشر ولوحة المفاتيح الافتراضية للمس
 */
function WorkstationSearchableSelect({
    label,
    options,
    value,
    placeholder = 'الكل',
    onSelect,
}: {
    label: string;
    options: { id: string; label: string; badge?: string }[];
    value: string;
    placeholder?: string;
    onSelect: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [showKeyboard, setShowKeyboard] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowKeyboard(false);
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
            setShowKeyboard(false);
        }
    }, [isOpen]);

    const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase().trim())
    );

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {label}
            </label>

            {/* الحقل التفاعلي */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-10 px-3 rounded-[2px] border text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                    isOpen
                        ? 'border-brand bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs'
                        : value
                            ? 'border-brand/50 dark:border-brand/40 bg-white dark:bg-[#111a29] text-slate-900 dark:text-white shadow-2xs'
                            : 'border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-[#2f486b]'
                }`}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 mr-1.5 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
            </button>

            {/* القائمة المنسدلة الذكية */}
            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] flex flex-col overflow-hidden animate-in fade-in duration-100">
                    {/* شريط البحث + زر لوحة المفاتيح للشاشات اللمسية */}
                    <div className="p-2 border-b border-slate-100 dark:border-[#172437] bg-slate-50 dark:bg-[#0a121e] flex items-center gap-1.5">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="بحث بالاسم أو الكلمة..."
                                className="w-full h-8 pr-8 pl-2.5 text-xs rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#070d18] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-brand"
                            />
                        </div>

                        {/* زر فتح لوحة المفاتيح اللمسية */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowKeyboard(!showKeyboard);
                            }}
                            className={`h-8 px-2.5 rounded-[2px] border text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${
                                showKeyboard
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/25'
                            }`}
                            title="لوحة مفاتيح الشاشة"
                        >
                            <Keyboard className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">لوحة لمس</span>
                        </button>
                    </div>

                    {/* خيارات القائمة */}
                    <ul className="max-h-56 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-[#172437]">
                        <li
                            onClick={() => {
                                onSelect('');
                                setIsOpen(false);
                            }}
                            className={`px-3 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                                !value
                                    ? 'bg-brand/10 text-brand font-bold'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#121e30]'
                            }`}
                        >
                            <span>{placeholder}</span>
                            {!value && <span className="text-brand text-xs font-bold">✓</span>}
                        </li>

                        {filtered.length === 0 ? (
                            <li className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                                لا توجد نتائج مطابقة
                            </li>
                        ) : (
                            filtered.map(opt => {
                                const isSelected = opt.id === value;
                                return (
                                    <li
                                        key={opt.id}
                                        onClick={() => {
                                            onSelect(opt.id);
                                            setIsOpen(false);
                                        }}
                                        className={`px-3 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                                            isSelected
                                                ? 'bg-brand/10 text-brand font-bold'
                                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#121e30]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {opt.badge && <span className="text-xs">{opt.badge}</span>}
                                            <span className="truncate">{opt.label}</span>
                                        </div>
                                        {isSelected && <span className="text-brand text-xs font-bold">✓</span>}
                                    </li>
                                );
                            })
                        )}
                    </ul>

                    {/* لوحة المفاتيح الافتراضية للشاشات اللمسية */}
                    {showKeyboard && (
                        <div className="border-t border-slate-100 dark:border-[#172437]">
                            <DraggableOnScreenKeyboard
                                value={search}
                                onKeyPress={char => setSearch(prev => prev + char)}
                                onBackspace={() => setSearch(prev => prev.slice(0, -1))}
                                onClear={() => setSearch('')}
                                onSpace={() => setSearch(prev => prev + ' ')}
                                onClose={() => setShowKeyboard(false)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * مودال إلغاء الفاتورة المصقول
 */
function CancelInvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
    const [deletePayments,    setDeletePayments]    = useState(false);
    const [deleteSettlements, setDeleteSettlements] = useState(false);

    const isCash           = invoice.customer_id === 1;
    const paidAmount       = parseFloat(invoice.paid_amount);
    const settlementsTotal = parseFloat(invoice.settlements_total ?? '0');
    const hasPayments      = !isCash && paidAmount > 0;
    const hasSettlements   = !isCash && settlementsTotal > 0;

    function confirm() {
        router.delete(`/invoices/${invoice.id}`, {
            data: {
                delete_payments:    isCash ? true : deletePayments,
                delete_settlements: isCash ? true : deleteSettlements,
            },
            onSuccess: onClose,
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-[2px] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150
                border border-slate-200 dark:border-[#1d2d42]
                bg-white dark:bg-[#0a121e]
                shadow-2xl">

                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#19273b] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[2px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">إلغاء فاتورة البيع #{invoice.invoice_number || invoice.id}</h3>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">سيتم إلغاء الفاتورة واسترداد المخزون تلقائياً</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-[2px] border border-slate-200 dark:border-[#223348] text-slate-500 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {hasPayments && (
                    <div className="flex flex-col gap-2 p-3 rounded-[2px] bg-slate-50 dark:bg-[#0e1726] border border-slate-200/80 dark:border-[#1d2d42]">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الدفعات المرتبطة بالفاتورة</span>
                            <span className="font-number font-black text-emerald-600 dark:text-emerald-400 text-xs">{fmt(invoice.paid_amount)} د.ل</span>
                        </div>
                        <div className="h-px bg-slate-200/80 dark:bg-[#19273b]" />
                        <div className="flex flex-col gap-2 pt-1 text-xs">
                            <label className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-[2px] hover:bg-slate-100 dark:hover:bg-[#142032]" onClick={() => setDeletePayments(true)}>
                                <div className={`w-4 h-4 rounded-none border flex items-center justify-center shrink-0 ${deletePayments ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 dark:border-[#33465e]'}`}>
                                    {deletePayments && <span className="text-[10px] font-black leading-none">✓</span>}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white text-xs">نعم، احذف الدفعات معها</span>
                                    <span className="text-[11px] text-slate-400 dark:text-[#8fa1b5]">الفاتورة كانت خطأ في الإدخال</span>
                                </div>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-[2px] hover:bg-slate-100 dark:hover:bg-[#142032]" onClick={() => setDeletePayments(false)}>
                                <div className={`w-4 h-4 rounded-none border flex items-center justify-center shrink-0 ${!deletePayments ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-[#33465e]'}`}>
                                    {!deletePayments && <span className="text-[10px] font-black leading-none">✓</span>}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white text-xs">لا، أبقِ الدفعات كرصيد للعميل</span>
                                    <span className="text-[11px] text-slate-400 dark:text-[#8fa1b5]">المال دُفع فعلاً وسيبقى في رصيده</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {hasSettlements && (
                    <div className="flex flex-col gap-2 p-3 rounded-[2px] bg-slate-50 dark:bg-[#0e1726] border border-slate-200/80 dark:border-[#1d2d42]">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">التسويات المرتبطة</span>
                            <span className="font-number font-black text-purple-600 dark:text-purple-400 text-xs">{fmt(String(settlementsTotal))} د.ل</span>
                        </div>
                        <div className="h-px bg-slate-200/80 dark:bg-[#19273b]" />
                        <div className="flex flex-col gap-2 pt-1 text-xs">
                            <label className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-[2px] hover:bg-slate-100 dark:hover:bg-[#142032]" onClick={() => setDeleteSettlements(true)}>
                                <div className={`w-4 h-4 rounded-none border flex items-center justify-center shrink-0 ${deleteSettlements ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 dark:border-[#33465e]'}`}>
                                    {deleteSettlements && <span className="text-[10px] font-black leading-none">✓</span>}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white text-xs">نعم، احذف التسويات معها</span>
                                    <span className="text-[11px] text-slate-400 dark:text-[#8fa1b5]">التسوية لم تُنفَّذ فعلاً</span>
                                </div>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-[2px] hover:bg-slate-100 dark:hover:bg-[#142032]" onClick={() => setDeleteSettlements(false)}>
                                <div className={`w-4 h-4 rounded-none border flex items-center justify-center shrink-0 ${!deleteSettlements ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-[#33465e]'}`}>
                                    {!deleteSettlements && <span className="text-[10px] font-black leading-none">✓</span>}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white text-xs">لا، أبقِ التسويات كرصيد مستقل</span>
                                    <span className="text-[11px] text-slate-400 dark:text-[#8fa1b5]">المبلغ استُرد فعلاً وسيبقى في سجله</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200/80 dark:border-[#19273b]">
                    <button onClick={onClose} className="flex-1 h-9 rounded-[2px] border border-slate-200 dark:border-[#223348] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273a] text-slate-700 dark:text-[#8fa1b5] font-bold text-xs transition-colors cursor-pointer">
                        تراجع
                    </button>
                    <button onClick={confirm} className="flex-1 h-9 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> تأكيد الإلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * درج الفلترة المكتبي الجانبي (Slide-over Drawer)
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
            {/* الخلفية المعتمة */}
            <div
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                onClick={onClose}
            />

            {/* الحاوية الجانبية الانزلاقية */}
            <div className="relative w-full sm:w-[460px] md:w-[480px] max-w-[95vw] h-full
                bg-white dark:bg-[#0a121e]
                shadow-2xl border-l border-slate-200 dark:border-[#1d2d42] flex flex-col animate-in slide-in-from-right duration-200 z-10 cursor-default">

                {/* الترويسة */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#19273b] shrink-0 bg-slate-50 dark:bg-[#0c1421]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[2px] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">تصفية الفواتير المتقدمة</h3>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">تخصيص معايير البحث والفلترة بدقة</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-[2px] border border-slate-200 dark:border-[#223348] text-slate-500 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* محتوى الحقول القابل للتمرير */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scroll">
                    {children}
                </div>

                {/* شريط الإجراءات السفلي */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421] flex items-center gap-2.5 shrink-0 shadow-lg">
                    <button
                        onClick={applyFilter}
                        className="flex-1 h-10 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs transition-opacity flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                        <Search className="w-3.5 h-3.5" /> تطبيق الفلتر
                    </button>
                    {hasFilter && (
                        <button
                            onClick={resetFilter}
                            className="h-10 px-4 rounded-[2px] border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> إعادة تعيين
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function InvoicesIndex({ invoices, customers, users, products, paymentMethods, flash }: Props) {
    const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

    const params = new URLSearchParams(window.location.search);
    const [fInvoiceId,  setFInvoiceId]  = useState(params.get('filter[id]') ?? '');
    const [showIdPad,   setShowIdPad]   = useState(false);
    const [fCustomer,   setFCustomer]   = useState(params.get('filter[customer_id]') ?? '');
    const [fUser,       setFUser]       = useState(params.get('filter[user_id]') ?? '');
    const [fProduct,    setFProduct]    = useState(params.get('filter[product_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');
    const [fPayMethod,  setFPayMethod]  = useState(params.get('filter[payment_method_id]') ?? '');

    const hasFilter = Boolean(fInvoiceId || fCustomer || fUser || fProduct || fDateFrom || fDateTo || fAmountFrom || fAmountTo || fPayMethod);

    const activeInvoices = invoices.data.filter(inv => !inv.deleted_at);
    const deletedInvoices = invoices.data.filter(inv => inv.deleted_at);
    const displayInvoices = activeTab === 'active' ? activeInvoices : deletedInvoices;

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fInvoiceId)  f['filter[id]']                 = fInvoiceId;
        if (fCustomer)   f['filter[customer_id]']        = fCustomer;
        if (fUser)       f['filter[user_id]']            = fUser;
        if (fProduct)    f['filter[product_id]']         = fProduct;
        if (fDateFrom)   f['filter[date_from]']          = fDateFrom;
        if (fDateTo)     f['filter[date_to]']            = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']        = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']          = fAmountTo;
        if (fPayMethod)  f['filter[payment_method_id]']  = fPayMethod;
        setDrawerOpen(false);
        router.get('/invoices', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFInvoiceId(''); setFCustomer(''); setFUser(''); setFProduct('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo(''); setFPayMethod('');
        setDrawerOpen(false);
        router.get('/invoices', {}, { preserveScroll: true });
    }

    return (
        <AppShell pageTitle="فواتير البيع">
            <div className="flex flex-col gap-3.5 pb-24 sm:pb-36 mb-8 sm:mb-12">

                {/* ── الترويسة الرئيسية مع زر الإجراء السريع ── */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/90 dark:border-[#1d2d42] pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">فواتير البيع</h1>
                            <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/30 dark:border-sky-500/25 px-2 py-0.5 rounded-[2px]">
                                {invoices.total} فاتورة
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">إدارة وتتبع فواتير المبيعات، المدفوعات والديون الآجلة</p>
                    </div>

                    <Link 
                        href="/invoices/create" 
                        className="h-9 px-4 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-opacity cursor-pointer shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>فاتورة بيع جديدة</span>
                    </Link>
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

                {/* ── شريط التحكم الموحد: التبويبات + زر فتح الدرج ── */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] p-1.5 rounded-[2px]">
                    {/* التبويبات (Active / Deleted) */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('active')}
                            className={`px-3 py-1.5 rounded-[2px] font-bold text-xs transition-all cursor-pointer ${
                                activeTab === 'active'
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-slate-600 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            الفواتير النشطة ({activeInvoices.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('deleted')}
                            className={`px-3 py-1.5 rounded-[2px] font-bold text-xs transition-all cursor-pointer ${
                                activeTab === 'deleted'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-[#8fa1b5] hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            الفواتير الملغية ({deletedInvoices.length})
                        </button>
                    </div>

                    {/* زر فتح درج التصفية المتقدمة */}
                    <div className="flex items-center gap-2">
                        {hasFilter && (
                            <button
                                type="button"
                                onClick={resetFilter}
                                className="h-8 px-2.5 rounded-[2px] border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="إلغاء التصفية"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>إعادة تعيين</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                            className={`h-8 px-3 rounded-[2px] border font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                                hasFilter
                                    ? 'bg-brand/10 border-brand text-brand font-black'
                                    : 'bg-white dark:bg-[#0a121e] border-slate-200/90 dark:border-[#1d2d42] text-slate-700 dark:text-[#8fa1b5] hover:bg-slate-100 dark:hover:bg-[#121c2c]'
                            }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
                            <span>تصفية الفواتير</span>
                            {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />}
                        </button>
                    </div>
                </div>

                {/* ── جدول البيانات المكتبي (Workstation Data Grid) ── */}
                <div className="spatial-card p-0 overflow-hidden border border-slate-200/90 dark:border-[#1d2d42]">
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0c1421]">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-brand" />
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                                سجل الفواتير ({displayInvoices.length})
                            </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            صفحة {invoices.current_page} من {invoices.last_page || 1}
                        </div>
                    </div>

                    {displayInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
                            <FileText className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                            <span className="font-bold text-xs">{activeTab === 'active' ? 'لا توجد فواتير بيع مسجلة' : 'لا توجد فواتير ملغية'}</span>
                        </div>
                    ) : (
                        <>
                            {/* عرض الجدول المكتبي للشاشات الكبيرة */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-xs text-right">
                                    <thead>
                                        <tr className="bg-slate-100/60 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-500 dark:text-slate-400 font-bold">
                                            <th className="px-3 py-2.5 font-mono text-center w-16">#</th>
                                            <th className="px-3 py-2.5">العميل</th>
                                            <th className="px-3 py-2.5">البائع</th>
                                            <th className="px-3 py-2.5 text-left font-mono">الإجمالي</th>
                                            <th className="px-3 py-2.5 text-left font-mono">المدفوع</th>
                                            <th className="px-3 py-2.5 text-left font-mono">المتبقي</th>
                                            <th className="px-3 py-2.5 text-center font-mono">التاريخ</th>
                                            <th className="px-3 py-2.5 text-center w-28">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/70 dark:divide-[#162335]">
                                        {displayInvoices.map(inv => {
                                            return (
                                                <tr 
                                                    key={inv.id} 
                                                    className={`hover:bg-slate-50 dark:hover:bg-[#0e1828] transition-colors ${inv.deleted_at ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''}`}
                                                >
                                                    <td className="px-3 py-2.5 font-mono font-bold text-slate-400 dark:text-slate-500 text-center">
                                                        #{inv.invoice_number || inv.id}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <span className="font-bold text-slate-800 dark:text-white">
                                                            {inv.customer?.name ?? 'زبون نقدي'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-600 dark:text-[#8fa1b5]">
                                                        {inv.user?.name ?? '—'}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-left font-number font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                        {fmt(inv.total)} <span className="text-[10px] font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-left font-number font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                        {fmt(inv.paid_amount)} <span className="text-[10px] font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-left font-number font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                        {fmt(inv.due_amount)} <span className="text-[10px] font-bold text-slate-400">د.ل</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                        {fmtDate(inv.created_at)}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Link 
                                                                href={`/invoices/${inv.id}`} 
                                                                className="h-7 px-2.5 rounded-[2px] border border-sky-500/30 dark:border-sky-500/25 bg-sky-500/10 hover:bg-brand hover:text-white text-brand font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                                title="عرض الفاتورة"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                <span>عرض</span>
                                                            </Link>
                                                            {inv.deleted_at ? (
                                                                <RestoreModal
                                                                    title="استعادة الفاتورة"
                                                                    description="هل أنت متأكد من استعادة هذه الفاتورة؟ سيتم استعادة الدفعات والتسويات المرتبطة بها."
                                                                    onConfirm={() => router.post(`/invoices/${inv.id}/restore`)}
                                                                    trigger={
                                                                        <button 
                                                                            type="button"
                                                                            className="h-7 px-2 rounded-[2px] border border-emerald-500/30 dark:border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                                            title="استعادة الفاتورة"
                                                                        >
                                                                            <RotateCcw className="w-3 h-3" />
                                                                            <span>استعادة</span>
                                                                        </button>
                                                                    }
                                                                />
                                                            ) : (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setCancelTarget(inv)} 
                                                                    className="h-7 px-2 rounded-[2px] border border-rose-500/30 dark:border-rose-500/25 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                                    title="إلغاء الفاتورة"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                    <span>إلغاء</span>
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
                                {displayInvoices.map(inv => {
                                    const status = inv.payment_status || (parseFloat(inv.due_amount) === 0 ? 'paid' : parseFloat(inv.paid_amount) > 0 ? 'partial' : 'unpaid');
                                    return (
                                        <div key={inv.id} className={`p-3 flex flex-col gap-2 ${inv.deleted_at ? 'opacity-60 bg-rose-50/20' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-slate-800 dark:text-white">
                                                        {inv.customer?.name ?? 'زبون نقدي'}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-slate-400">
                                                        #{inv.invoice_number || inv.id}
                                                    </span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${statusClass[status] || statusClass.unpaid}`}>
                                                    {statusLabel[status] || '—'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded-[2px] bg-slate-50 dark:bg-[#0e1726] border border-slate-200/70 dark:border-[#1d2d42] text-[11px]">
                                                <div>
                                                    <div className="text-slate-400 text-[10px]">الإجمالي</div>
                                                    <div className="font-number font-black text-slate-900 dark:text-white">{fmt(inv.total)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 text-[10px]">المدفوع</div>
                                                    <div className="font-number font-bold text-emerald-600">{fmt(inv.paid_amount)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 text-[10px]">المتبقي</div>
                                                    <div className="font-number font-bold text-amber-600">{fmt(inv.due_amount)}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <span className="font-mono text-[11px] text-slate-400">{fmtDate(inv.created_at)}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Link 
                                                        href={`/invoices/${inv.id}`} 
                                                        className="h-7 px-3 rounded-[2px] border border-sky-500/30 dark:border-sky-500/25 bg-sky-500/10 text-brand font-bold text-[11px] flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3 h-3" /> عرض
                                                    </Link>
                                                    {inv.deleted_at ? (
                                                        <RestoreModal
                                                            title="استعادة الفاتورة"
                                                            description="هل أنت متأكد من استعادة هذه الفاتورة؟"
                                                            onConfirm={() => router.post(`/invoices/${inv.id}/restore`)}
                                                            trigger={
                                                                <button className="h-7 px-2.5 rounded-[2px] border border-emerald-500/30 dark:border-emerald-500/25 bg-emerald-500/10 text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                                                    <RotateCcw className="w-3 h-3" /> استعادة
                                                                </button>
                                                            }
                                                        />
                                                    ) : (
                                                        <button 
                                                            onClick={() => setCancelTarget(inv)} 
                                                            className="h-7 px-2.5 rounded-[2px] border border-rose-500/30 dark:border-rose-500/25 bg-rose-500/10 text-rose-500 font-bold text-[11px] flex items-center gap-1"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> إلغاء
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
                                <Pagination links={invoices.links} currentPage={invoices.current_page} lastPage={invoices.last_page} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {cancelTarget && <CancelInvoiceModal invoice={cancelTarget} onClose={() => setCancelTarget(null)} />}

            {/* ── درج الفلترة المتقدمة (Filter Drawer) مع دعم البحث ولوحة المفاتيح والنمبر باد ── */}
            <FilterDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                applyFilter={applyFilter}
                resetFilter={resetFilter}
                hasFilter={hasFilter}
            >
                <div className="flex flex-col gap-3.5">
                    {/* المجموعة 1: بيانات الفاتورة والعميل */}
                    <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-[#172437] pb-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                            <Search className="w-3.5 h-3.5 text-brand" />
                            <span>معلومات الفاتورة والعميل</span>
                        </div>

                        {/* رقم الفاتورة مع خيار النمبر باد المطور */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم الفاتورة</label>
                            <button
                                type="button"
                                onClick={() => setShowIdPad(true)}
                                className={`h-10 px-3 rounded-[2px] border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                                    fInvoiceId 
                                        ? 'border-brand/50 dark:border-brand/40 bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs' 
                                        : 'border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-[#2f486b]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Hash className="w-3.5 h-3.5 text-brand" />
                                    <span className="font-number font-bold text-xs sm:text-sm">{fInvoiceId ? `#${fInvoiceId}` : 'ادخل رقم الفاتورة (لوحة أرقام)...'}</span>
                                </div>
                                {fInvoiceId ? (
                                    <span
                                        onClick={(e) => { e.stopPropagation(); setFInvoiceId(''); }}
                                        className="px-1.5 py-0.5 rounded-[2px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold border border-rose-500/20 transition-colors"
                                    >
                                        مسح
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded-[2px]">
                                        لوحة اللمس
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* العميل: قائمة منسدلة ذكية تبحث بالنص وتدعم لوحة اللمس */}
                        <WorkstationSearchableSelect
                            label="العميل"
                            placeholder="كل العملاء"
                            value={fCustomer}
                            options={customers.map(c => ({ id: String(c.id), label: c.name }))}
                            onSelect={setFCustomer}
                        />

                        {/* البائع: قائمة منسدلة ذكية */}
                        <WorkstationSearchableSelect
                            label="البائع / الكاشير"
                            placeholder="كل البائعين"
                            value={fUser}
                            options={users.map(u => ({ id: String(u.id), label: u.name }))}
                            onSelect={setFUser}
                        />
                    </div>

                    {/* المجموعة 2: الأصناف وطريقة الدفع */}
                    <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-[#172437] pb-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                            <ShoppingCart className="w-3.5 h-3.5 text-brand" />
                            <span>الأصناف وطرق الدفع</span>
                        </div>

                        {/* طريقة الدفع */}
                        <WorkstationSearchableSelect
                            label="طريقة الدفع"
                            placeholder="كل طرق الدفع"
                            value={fPayMethod}
                            options={[
                                { id: 'hybrid', label: 'هجين (أكثر من وسيلة)', badge: '🔀' },
                                ...paymentMethods.map(m => ({ id: String(m.id), label: m.name }))
                            ]}
                            onSelect={setFPayMethod}
                        />

                        {/* المنتج */}
                        <WorkstationSearchableSelect
                            label="المنتج المُباع"
                            placeholder="كل المنتجات"
                            value={fProduct}
                            options={products.map(p => ({ id: String(p.id), label: p.name }))}
                            onSelect={setFProduct}
                        />
                    </div>

                    {/* المجموعة 3: المبالغ والتواريخ */}
                    <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-3.5">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-[#172437] pb-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                            <Calendar className="w-3.5 h-3.5 text-brand" />
                            <span>المبالغ والتواريخ</span>
                        </div>

                        {/* نطاق المبالغ مع أزرار النمبر باد للمس */}
                        <AmountRangeInput
                            label="نطاق المبلغ الإجمالي"
                            valueFrom={fAmountFrom}
                            valueTo={fAmountTo}
                            onChange={(from, to) => {
                                setFAmountFrom(from);
                                setFAmountTo(to);
                            }}
                        />

                        {/* نطاق التواريخ مع أزرار لمس منفصلة (يوم، شهر، سنة) ونمبر باد مخصص لكل خانة */}
                        <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/80 dark:border-[#172437]">
                            <DateFilterInput
                                label="من تاريخ"
                                value={fDateFrom}
                                onChange={setFDateFrom}
                            />
                            <DateFilterInput
                                label="إلى تاريخ"
                                value={fDateTo}
                                onChange={setFDateTo}
                            />
                        </div>
                    </div>
                </div>
            </FilterDrawer>

            {/* لوحة الأرقام المنبثقة لرقم الفاتورة */}
            <NumberPadModal
                isOpen={showIdPad}
                title="البحث برقم الفاتورة"
                initialValue={fInvoiceId}
                onClose={() => setShowIdPad(false)}
                onConfirm={v => { setFInvoiceId(v); setShowIdPad(false); }}
            />
        </AppShell>
    );
}
