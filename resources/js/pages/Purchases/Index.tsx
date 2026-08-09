import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, Pagination } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import {
    Plus, Eye, Trash2, ShoppingCart, RotateCcw, AlertTriangle, X,
    SlidersHorizontal, Search, Hash
} from 'lucide-react';

interface Supplier { id: number; name: string; }
interface Product  { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface Purchase {
    id: number;
    supplier: Supplier;
    total: string;
    paid_amount: string;
    due_amount: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null;
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
    purchases:      Paginated<Purchase>;
    suppliers:      Supplier[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass  = {
    unpaid:  'bg-red-500/10 text-red-500 border border-red-500/20',
    partial: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

// ── Modal إلغاء الفاتورة ──────────────────────────────────────────────────────
function CancelPurchaseModal({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
    const [deletePayments,    setDeletePayments]    = useState(false);
    const [deleteSettlements, setDeleteSettlements] = useState(false);

    const isCash           = (purchase.supplier?.id ?? (purchase as any).supplier_id) === 1;
    const paidAmount       = parseFloat(purchase.paid_amount);
    const settlementsTotal = parseFloat(purchase.settlements_total ?? '0');
    const hasPayments      = !isCash && paidAmount > 0;
    const hasSettlements   = !isCash && settlementsTotal > 0;

    function confirm() {
        router.delete(`/purchases/${purchase.id}`, {
            data: {
                delete_payments:    isCash ? true : deletePayments,
                delete_settlements: isCash ? true : deleteSettlements,
            },
            onSuccess: onClose,
        });
    }

    function RadioGroup({ value, onChange, yesLabel, yesDesc, noLabel, noDesc }: {
        value: boolean; onChange: (v: boolean) => void;
        yesLabel: string; yesDesc: string; noLabel: string; noDesc: string;
    }) {
        return (
            <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3.5 cursor-pointer group p-3.5 rounded-[18px] border-2 border-black/5 dark:border-white/10 hover:border-red-500/40 transition-all" onClick={() => onChange(true)}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${value ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-white/30 group-hover:border-red-400'}`}>
                        {value && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-white text-base">{yesLabel}</span>
                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">{yesDesc}</span>
                    </div>
                </label>
                <label className="flex items-center gap-3.5 cursor-pointer group p-3.5 rounded-[18px] border-2 border-black/5 dark:border-white/10 hover:border-primary/40 transition-all" onClick={() => onChange(false)}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${!value ? 'border-primary bg-primary' : 'border-slate-300 dark:border-white/30 group-hover:border-primary/60'}`}>
                        {!value && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-white text-base">{noLabel}</span>
                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">{noDesc}</span>
                    </div>
                </label>
            </div>
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg rounded-[32px] p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-black/10 dark:border-white/15
                bg-white dark:bg-slate-900 shadow-2xl z-10">

                <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-[20px] bg-red-500/12 border border-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <button onClick={onClose}
                        className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-500 dark:text-white/70 flex items-center justify-center transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">إلغاء فاتورة الشراء #{purchase.id}</h3>
                    <p className="text-base font-bold text-slate-500 dark:text-white/60 leading-relaxed">
                        سيتم إلغاء الفاتورة وإرجاع كميات المواد إلى المخزون.
                    </p>
                </div>

                {hasPayments && (
                    <div className="flex flex-col gap-4 p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border-2 border-black/5 dark:border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-base font-black text-slate-700 dark:text-white/80">الدفعات المرتبطة</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-xl">{fmt(purchase.paid_amount)} د.ل</span>
                        </div>
                        <RadioGroup
                            value={deletePayments} onChange={setDeletePayments}
                            yesLabel="نعم، احذف الدفعات معها" yesDesc="الفاتورة كانت خطأ في الإدخال"
                            noLabel="لا، أبقِ الدفعات كدين على المورد" noDesc="المال دُفع فعلاً وسيبقى في سجل المورد"
                        />
                    </div>
                )}

                {hasSettlements && (
                    <div className="flex flex-col gap-4 p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border-2 border-black/5 dark:border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-base font-black text-slate-700 dark:text-white/80">التسويات المرتبطة</span>
                            <span className="font-black text-purple-500 text-xl">{fmt(String(settlementsTotal))} د.ل</span>
                        </div>
                        <RadioGroup
                            value={deleteSettlements} onChange={setDeleteSettlements}
                            yesLabel="نعم، احذف التسويات معها" yesDesc="التسوية لم تُنفَّذ فعلاً"
                            noLabel="لا، أبقِ التسويات كرصيد مستقل" noDesc="المبلغ استُرد فعلاً وسيبقى في سجل المورد"
                        />
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <button onClick={confirm}
                        className="flex-1 h-16 sm:h-18 rounded-[22px] bg-red-500 hover:bg-red-600 text-white font-black text-lg sm:text-xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95">
                        <Trash2 className="w-6 h-6" /> تأكيد الإلغاء
                    </button>
                    <button onClick={onClose}
                        className="h-16 sm:h-18 px-8 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── FilterDrawer Component (Identical to Invoices/Index.tsx) ────────────────
function FilterDrawer({ isOpen, onClose, children, applyFilter, resetFilter, hasFilter }: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    applyFilter: () => void;
    resetFilter: () => void;
    hasFilter: boolean;
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
            {/* Backdrop Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Slide-over Drawer from Right */}
            <div className="relative w-full sm:w-[720px] md:w-[840px] lg:w-[900px] max-w-[95vw] h-full
                bg-gradient-to-b from-white via-slate-50 to-slate-100
                dark:[background:linear-gradient(165deg,#13192e_0%,#0e1220_100%)]
                shadow-[-24px_0_60px_rgba(0,0,0,0.4)]
                border-l-2 border-black/10 dark:border-white/15 flex flex-col animate-in slide-in-from-right duration-300 z-10 cursor-default">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b-2 border-black/5 dark:border-white/8 shrink-0 bg-black/3 dark:bg-white/4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[22px] bg-primary/10 border-2 border-primary/25 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                            <SlidersHorizontal className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">تصفية فواتير الشراء المتقدمة</h3>
                            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تخصيص نتائج البحث والفلترة بكفاءة عالية</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-14 h-14 rounded-full bg-black/6 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-500 dark:text-white/60 flex items-center justify-center transition-all border border-black/5 dark:border-white/10 active:scale-95"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {children}
                </div>

                {/* Sticky Action Footer */}
                <div className="px-8 py-5 border-t-2 border-black/8 dark:border-white/10 bg-white/90 dark:bg-[#13192e]/90 backdrop-blur-2xl flex items-center gap-4 shrink-0 shadow-2xl">
                    <button onClick={applyFilter} className="flex-1 h-16 sm:h-20 rounded-[22px] bg-primary hover:bg-primary/90 text-white font-black text-xl sm:text-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/25 active:scale-95">
                        <Search className="w-6 h-6 sm:w-7 sm:h-7" /> تطبيق الفلتر
                    </button>
                    {hasFilter && (
                        <button onClick={resetFilter} className="h-16 sm:h-20 px-8 sm:px-10 rounded-[22px] bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-black text-lg sm:text-xl transition-all border-2 border-red-500/30 flex items-center justify-center gap-2.5 active:scale-95 shrink-0">
                            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /> إعادة تعيين
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────────
export default function PurchasesIndex({ purchases, suppliers = [], products = [], paymentMethods = [], flash }: Props) {
    const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [showIdPad, setShowIdPad] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

    const activePurchases  = (purchases?.data || []).filter(p => !p.deleted_at);
    const deletedPurchases = (purchases?.data || []).filter(p => p.deleted_at);
    const displayPurchases = activeTab === 'active' ? activePurchases : deletedPurchases;

    // Filter states
    const params = new URLSearchParams(window.location.search);
    const [fPurchaseId, setFPurchaseId] = useState(params.get('filter[id]') ?? '');
    const [fSupplier,   setFSupplier]   = useState(params.get('filter[supplier_id]') ?? '');
    const [fStatus,     setFStatus]     = useState(params.get('filter[payment_status]') ?? '');
    const [fProduct,    setFProduct]    = useState(params.get('filter[product_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');
    const [fPayMethod,  setFPayMethod]  = useState(params.get('filter[payment_method_id]') ?? '');

    const hasFilter = Boolean(fPurchaseId || fSupplier || fStatus || fProduct || fDateFrom || fDateTo || fAmountFrom || fAmountTo || fPayMethod);

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fPurchaseId) f['filter[id]']                = fPurchaseId;
        if (fSupplier)   f['filter[supplier_id]']       = fSupplier;
        if (fStatus)     f['filter[payment_status]']    = fStatus;
        if (fProduct)    f['filter[product_id]']        = fProduct;
        if (fDateFrom)   f['filter[date_from]']         = fDateFrom;
        if (fDateTo)     f['filter[date_to]']           = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']       = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']         = fAmountTo;
        if (fPayMethod)  f['filter[payment_method_id]'] = fPayMethod;
        router.get('/purchases', f, { preserveScroll: true });
        setFilterDrawerOpen(false);
    }

    function resetFilter() {
        setFPurchaseId(''); setFSupplier(''); setFStatus(''); setFProduct('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo(''); setFPayMethod('');
        router.get('/purchases', {}, { preserveScroll: true });
        setFilterDrawerOpen(false);
    }

    return (
        <AppShell pageTitle="المشتريات">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">فواتير الشراء</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">سجل وإدارة فواتير الشراء ومتابعة حسابات الموردين</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/purchases/create"
                            className="spatial-button flex items-center justify-center gap-3 px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] text-lg sm:text-2xl font-black shadow-xl">
                            <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> فاتورة شراء جديدة
                        </Link>
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

                {/* Tabs & Filter Bar Section */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveTab('active')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'active' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>الفواتير النشطة</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {activePurchases.length}
                                </span>
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'deleted' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>الفواتير الملغية</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'deleted' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {deletedPurchases.length}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {hasFilter && (
                                <button onClick={resetFilter} className="flex items-center gap-2.5 px-6 h-16 sm:h-20 rounded-[22px] font-black text-base sm:text-xl transition-all border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white active:scale-95 shadow-md">
                                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span>إعادة تعيين</span>
                                </button>
                            )}
                            <button onClick={() => setFilterDrawerOpen(true)}
                                className={`flex items-center gap-3 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl transition-all border-2 active:scale-95 shadow-md ${hasFilter ? 'bg-primary/15 border-primary text-primary shadow-primary/10' : 'spatial-input text-slate-800 dark:text-white hover:border-primary/40'}`}>
                                <SlidersHorizontal className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                <span>الفلترة</span>
                                {hasFilter && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Table / Cards Section */}
                    <SpatialCard title={`سجل الشراء (${displayPurchases.length})`} icon={<ShoppingCart className="w-6 h-6 text-primary" />}>
                        {displayPurchases.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                <span className="text-6xl">🛒</span>
                                <span className="font-black text-2xl">{activeTab === 'active' ? 'لا توجد فواتير شراء نشطة' : 'لا توجد فواتير شراء ملغية'}</span>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                                {['#', 'المورد', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ', 'الإجراءات'].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displayPurchases.map(p => (
                                                <tr key={p.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group ${p.deleted_at ? 'opacity-50' : ''}`}>
                                                    <td className="px-5 py-6 font-black text-slate-400 dark:text-white/40 text-xl">#{p.id}</td>
                                                    <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{p.supplier?.name ?? 'مورد غير معروف'}</td>
                                                    <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl whitespace-nowrap">{fmt(p.total)} <span className="text-sm font-bold text-slate-400">د.ل</span></td>
                                                    <td className="px-5 py-6 font-black text-emerald-600 dark:text-emerald-400 text-2xl whitespace-nowrap">{fmt(p.paid_amount)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                    <td className="px-5 py-6 font-black text-amber-500 text-2xl whitespace-nowrap">{fmt(p.due_amount)} <span className="text-sm font-bold opacity-75">د.ل</span></td>
                                                    <td className="px-5 py-6 whitespace-nowrap">
                                                        {p.deleted_at ? (
                                                            <span className="text-base font-black px-4 py-2 rounded-[14px] bg-red-500/10 text-red-500 border border-red-500/20">ملغي</span>
                                                        ) : (
                                                            <span className={`text-base font-black px-4 py-2 rounded-[14px] ${statusClass[p.payment_status]}`}>
                                                                {statusLabel[p.payment_status]}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-6 text-slate-500 dark:text-white/60 font-bold text-lg whitespace-nowrap">
                                                        {fmtDate(p.created_at)}
                                                    </td>
                                                    <td className="px-5 py-6 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Link href={`/purchases/${p.id}`}
                                                                className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                <Eye className="w-5 h-5 sm:w-6 sm:h-6" /> عرض
                                                            </Link>
                                                            {p.deleted_at ? (
                                                                <button onClick={() => router.post(`/purchases/${p.id}/restore`)}
                                                                    className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /> استعادة
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => setCancelTarget(p)}
                                                                    className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" /> إلغاء
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="flex flex-col gap-4 lg:hidden">
                                    {displayPurchases.map(p => (
                                        <div key={p.id} className={`p-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-4 ${p.deleted_at ? 'opacity-60' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-slate-800 dark:text-white text-2xl">{p.supplier?.name ?? 'مورد غير معروف'}</span>
                                                    <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-0.5">#{p.id} — {fmtDate(p.created_at)}</p>
                                                </div>
                                                {p.deleted_at ? (
                                                    <span className="text-base font-black px-4 py-2 rounded-[14px] bg-red-500/10 text-red-500 border border-red-500/20">ملغي</span>
                                                ) : (
                                                    <span className={`text-base font-black px-4 py-2 rounded-[14px] ${statusClass[p.payment_status]}`}>
                                                        {statusLabel[p.payment_status]}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/5">
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">الإجمالي</span>
                                                    <p className="font-black text-xl text-slate-800 dark:text-white">{fmt(p.total)} د.ل</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">المدفوع</span>
                                                    <p className="font-black text-emerald-600 dark:text-emerald-400">{fmt(p.paid_amount)} د.ل</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">المتبقي</span>
                                                    <p className="font-black text-xl text-amber-500">{fmt(p.due_amount)} د.ل</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <Link href={`/purchases/${p.id}`}
                                                    className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-18 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-lg sm:text-xl transition-all shadow-md active:scale-95">
                                                    <Eye className="w-6 h-6" /> عرض
                                                </Link>
                                                {p.deleted_at ? (
                                                    <button onClick={() => router.post(`/purchases/${p.id}/restore`)}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-18 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-lg sm:text-xl transition-all shadow-md active:scale-95">
                                                        <RotateCcw className="w-6 h-6" /> استعادة
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setCancelTarget(p)}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-18 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black text-lg sm:text-xl transition-all shadow-md active:scale-95">
                                                        <Trash2 className="w-6 h-6" /> إلغاء
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <Pagination links={purchases?.links || []} currentPage={purchases?.current_page} lastPage={purchases?.last_page} />
                            </>
                        )}
                    </SpatialCard>
                </div>

            </div>

            {cancelTarget && (
                <CancelPurchaseModal purchase={cancelTarget} onClose={() => setCancelTarget(null)} />
            )}

            {/* Portal Slide-Over Filter Drawer (Identical structure to Invoices/Index.tsx) */}
            <FilterDrawer
                isOpen={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                applyFilter={applyFilter}
                resetFilter={resetFilter}
                hasFilter={Boolean(hasFilter)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* العمود الأول (اليمين): البحث والمعلومات الأساسية + نطاق المبالغ */}
                    <div className="flex flex-col gap-6">
                        {/* قسم البحث والموردين */}
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <span className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/25 text-primary flex items-center justify-center text-xl shrink-0 border border-primary/20">🔍</span>
                                <span className="text-slate-900 dark:text-white tracking-wide">البحث والمعلومات الأساسية</span>
                            </h4>

                            {/* رقم الفاتورة */}
                            <div className="flex flex-col gap-2.5">
                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                                    رقم فاتورة الشراء
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowIdPad(true)}
                                    className={`spatial-input h-16 rounded-[20px] px-5 text-base sm:text-xl font-black cursor-pointer hover:border-primary/40 transition-all shadow-sm active:scale-95 flex items-center justify-between ${
                                        fPurchaseId ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-white/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Hash className="w-5 h-5 text-primary" />
                                        <span>{fPurchaseId ? `#${fPurchaseId}` : 'ادخل رقم الفاتورة...'}</span>
                                    </div>
                                    {fPurchaseId && (
                                        <span
                                            onClick={(e) => { e.stopPropagation(); setFPurchaseId(''); }}
                                            className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs text-slate-600 dark:text-white hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            ✕
                                        </span>
                                    )}
                                </button>
                            </div>

                            <ModernSelect label="المورد" placeholder="الكل"
                                options={[{ label: 'الكل' }, ...(suppliers || []).map(s => ({ label: s.name }))]}
                                defaultValue={fSupplier ? ((suppliers || []).find(s => String(s.id) === fSupplier)?.name ?? '') : 'الكل'}
                                onSelect={val => setFSupplier(val === 'الكل' ? '' : String((suppliers || []).find(s => s.name === val)?.id ?? ''))}
                            />

                            <ModernSelect label="حالة الدفع" placeholder="الكل"
                                options={[{ label: 'الكل' }, { label: 'غير مدفوع' }, { label: 'جزئي' }, { label: 'مدفوع' }]}
                                defaultValue={fStatus === 'unpaid' ? 'غير مدفوع' : fStatus === 'partial' ? 'جزئي' : fStatus === 'paid' ? 'مدفوع' : 'الكل'}
                                onSelect={val => setFStatus(val === 'غير مدفوع' ? 'unpaid' : val === 'جزئي' ? 'partial' : val === 'مدفوع' ? 'paid' : '')}
                            />
                        </div>

                        {/* قسم المبالغ */}
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0 border border-emerald-500/20">💵</span>
                                <span className="text-slate-900 dark:text-white tracking-wide">نطاق المبالغ</span>
                            </h4>
                            <AmountRangeInput label="الإجمالي (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                                onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
                        </div>
                    </div>

                    {/* العمود الثاني (اليسار): طريقة الدفع والمنتجات + نطاق التواريخ */}
                    <div className="flex flex-col gap-6">
                        {/* قسم الأصناف والدفع */}
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <span className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl shrink-0 border border-purple-500/20">💳</span>
                                <span className="text-slate-900 dark:text-white tracking-wide">طريقة الدفع والمنتجات</span>
                            </h4>

                            <ModernSelect label="المنتج" placeholder="الكل"
                                options={[{ label: 'الكل' }, ...(products || []).map(p => ({ label: p.name }))]}
                                defaultValue={fProduct ? ((products || []).find(p => String(p.id) === fProduct)?.name ?? '') : 'الكل'}
                                onSelect={val => setFProduct(val === 'الكل' ? '' : String((products || []).find(p => p.name === val)?.id ?? ''))}
                            />
                            <ModernSelect label="طريقة الدفع" placeholder="الكل"
                                options={[{ label: 'الكل' }, { label: 'هجين', badge: '🔀' }, ...(paymentMethods || []).map(m => ({ label: m.name }))]}
                                defaultValue={fPayMethod === 'hybrid' ? 'هجين' : fPayMethod ? ((paymentMethods || []).find(m => String(m.id) === fPayMethod)?.name ?? '') : 'الكل'}
                                onSelect={val => setFPayMethod(val === 'الكل' ? '' : val === 'هجين' ? 'hybrid' : String((paymentMethods || []).find(m => m.name === val)?.id ?? ''))}
                            />
                        </div>

                        {/* قسم التواريخ */}
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <span className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/25 text-amber-500 flex items-center justify-center text-xl shrink-0 border border-amber-500/20">📅</span>
                                <span className="text-slate-900 dark:text-white tracking-wide">نطاق التواريخ</span>
                            </h4>
                            <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
                            <DateFilterInput label="إلى تاريخ" value={fDateTo}   onChange={setFDateTo} />
                        </div>
                    </div>
                </div>
            </FilterDrawer>

            <NumberPadModal
                isOpen={showIdPad}
                title="البحث برقم فاتورة الشراء"
                initialValue={fPurchaseId}
                onClose={() => setShowIdPad(false)}
                onConfirm={v => { setFPurchaseId(v); setShowIdPad(false); }}
            />
        </AppShell>
    );
}
