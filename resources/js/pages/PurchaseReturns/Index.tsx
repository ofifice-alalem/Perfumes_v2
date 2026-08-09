import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, Pagination } from '@/components/ui/SpatialComponents';
import { Plus, RotateCcw, Eye, Trash2, AlertTriangle, X, SlidersHorizontal, Search, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';

interface Supplier       { id: number; name: string; }
interface Product        { id: number; name: string; }
interface PaymentMethod  { id: number; name: string; }
interface PurchaseReturn {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    total: string;
    recovered_amount: string;
    due_recovery: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
    settlements_total: string | null;
}
interface Paginated<T> {
    data: T[];
    total: number;
    current_page: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    returns:        Paginated<PurchaseReturn>;
    suppliers:      Supplier[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const recoveryLabel = { unpaid: 'لم يُسترد', partial: 'جزئي', paid: 'مسترد' };
const recoveryClass  = {
    unpaid:  'bg-red-500/10 text-red-500 border-red-500/20',
    partial: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

// ── درج الفلترة الجانبي الجانبي المصمم بنظام Spatial UI v3.0 ──────────────────────
function FilterDrawer({
    isOpen, onClose, applyFilter, resetFilter, hasFilter, children
}: {
    isOpen: boolean; onClose: () => void; applyFilter: () => void; resetFilter: () => void;
    hasFilter: boolean; children: React.ReactNode;
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            
            <div className="relative w-full sm:w-[600px] lg:w-[850px] h-full
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
                            <h3 className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">فلترة مرتجعات الموردين</h3>
                            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تخصيص نتائج البحث والفلترة بكفاءة عالية</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-14 h-14 rounded-full bg-black/6 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-500 dark:text-white/60 flex items-center justify-center transition-all border border-black/5 dark:border-white/10 active:scale-95">
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

function RadioGroup({ value, onChange, yesLabel, yesDesc, noLabel, noDesc }: {
    value: boolean; onChange: (v: boolean) => void;
    yesLabel: string; yesDesc: string; noLabel: string; noDesc: string;
}) {
    return (
        <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3.5 p-4 rounded-[18px] bg-black/3 dark:bg-white/5 border-2 border-black/5 dark:border-white/8 cursor-pointer group transition-all hover:border-red-500/40" onClick={() => onChange(true)}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${value ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-white/30 group-hover:border-red-400'}`}>
                    {value && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-slate-800 dark:text-white text-base">{yesLabel}</span>
                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">{yesDesc}</span>
                </div>
            </label>
            <label className="flex items-center gap-3.5 p-4 rounded-[18px] bg-black/3 dark:bg-white/5 border-2 border-black/5 dark:border-white/8 cursor-pointer group transition-all hover:border-primary/40" onClick={() => onChange(false)}>
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

function CancelReturnModal({ ret, onClose }: { ret: PurchaseReturn; onClose: () => void }) {
    const [deleteSettlements, setDeleteSettlements] = useState(false);

    const isCash           = (ret.supplier?.id ?? (ret as any).supplier_id) === 1;
    const settlementsTotal = parseFloat(ret.settlements_total ?? '0');
    const hasSettlements   = !isCash && settlementsTotal > 0;

    function confirm() {
        router.delete(`/purchase-returns/${ret.id}`, {
            data: { delete_settlements: isCash ? true : deleteSettlements },
            onSuccess: onClose,
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 dir-rtl">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-[32px] p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200
                border-2 border-black/10 dark:border-white/15
                bg-gradient-to-b from-white to-slate-50
                dark:[background:linear-gradient(165deg,#13192e_0%,#0e1220_100%)]
                shadow-2xl z-10">

                <div className="flex items-center justify-between">
                    <div className="w-16 h-16 rounded-[22px] bg-red-500/10 border-2 border-red-500/25 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <button onClick={onClose}
                        className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-500 dark:text-white/60 flex items-center justify-center transition-all border border-black/5 dark:border-white/10">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">إلغاء المرتجع #{ret.id}</h3>
                    <p className="text-base font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        سيتم إلغاء المرتجع واستعادة كميات المخزون المسترجعة إلى حساب الفاتورة أو المخزن.
                    </p>
                </div>

                {hasSettlements && (
                    <div className="flex flex-col gap-4 p-5 rounded-[24px] bg-black/3 dark:bg-white/5 border-2 border-black/8 dark:border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-base font-black text-slate-700 dark:text-white">التسويات المرتبطة بالمرتجع:</span>
                            <span className="font-black text-purple-600 dark:text-purple-400 text-xl">{fmt(String(settlementsTotal))} د.ل</span>
                        </div>
                        <RadioGroup
                            value={deleteSettlements} onChange={setDeleteSettlements}
                            yesLabel="نعم، احذف التسويات معه" yesDesc="المبلغ لم يُسترد فعلاً"
                            noLabel="لا، أبقِ التسويات كرصيد مستقل" noDesc="المبلغ استُرد فعلاً وسيبقى في سجل المورد"
                        />
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <button onClick={onClose}
                        className="flex-1 h-16 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">
                        إلغاء
                    </button>
                    <button onClick={confirm}
                        className="flex-1 h-16 rounded-[22px] bg-red-500 hover:bg-red-600 text-white font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-500/25 active:scale-95">
                        <Trash2 className="w-6 h-6" /> تأكيد الإلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function PurchaseReturnsIndex({ returns: data, suppliers = [], products = [], paymentMethods = [], flash }: Props) {
    const [cancelTarget, setCancelTarget]           = useState<PurchaseReturn | null>(null);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [activeTab,    setActiveTab]               = useState<'active' | 'deleted'>('active');

    const activeReturns  = (data?.data || []).filter(r => !r.deleted_at);
    const deletedReturns = (data?.data || []).filter(r => r.deleted_at);
    const displayReturns = activeTab === 'active' ? activeReturns : deletedReturns;

    // قراءة الفلاتر الحالية من URL
    const params = new URLSearchParams(window.location.search);
    const [fSupplier,   setFSupplier]   = useState(params.get('filter[supplier_id]') ?? '');
    const [fStatus,     setFStatus]     = useState(params.get('filter[recovery_status]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');
    const [fProduct,    setFProduct]    = useState(params.get('filter[product_id]') ?? '');
    const [fPayMethod,  setFPayMethod]  = useState(params.get('filter[payment_method_id]') ?? '');

    const hasFilter = Boolean(fSupplier || fStatus || fDateFrom || fDateTo || fAmountFrom || fAmountTo || fProduct || fPayMethod);

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fSupplier)   f['filter[supplier_id]']       = fSupplier;
        if (fStatus)     f['filter[recovery_status]']   = fStatus;
        if (fDateFrom)   f['filter[date_from]']         = fDateFrom;
        if (fDateTo)     f['filter[date_to]']           = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']       = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']         = fAmountTo;
        if (fProduct)    f['filter[product_id]']        = fProduct;
        if (fPayMethod)  f['filter[payment_method_id]'] = fPayMethod;
        router.get('/purchase-returns', f, { preserveScroll: true });
        setFilterDrawerOpen(false);
    }

    function resetFilter() {
        setFSupplier(''); setFStatus('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo(''); setFProduct(''); setFPayMethod('');
        router.get('/purchase-returns', {}, { preserveScroll: true });
        setFilterDrawerOpen(false);
    }

    return (
        <AppShell pageTitle="مرتجع الشراء">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">مرتجعات الموردين</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">سجل إرجاع البضاعة للموردين وتسوية المستحقات المالية</p>
                    </div>
                    <Link href="/purchase-returns/create"
                        className="spatial-button flex items-center justify-center gap-3 px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] text-lg sm:text-2xl font-black shadow-xl">
                        <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> مرتجع جديد
                    </Link>
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
                                <span>المرتجعات النشطة</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {activeReturns.length}
                                </span>
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'deleted' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>المرتجعات الملغية</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'deleted' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {deletedReturns.length}
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
                    <SpatialCard title={`سجل مرتجعات الشراء (${displayReturns.length})`} icon={<RotateCcw className="w-6 h-6 text-primary" />}>
                        {displayReturns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                <span className="text-6xl">↩️</span>
                                <span className="font-black text-2xl">{activeTab === 'active' ? 'لا توجد مرتجعات نشطة' : 'لا توجد مرتجعات ملغية'}</span>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                                {['#', 'المورد', 'الفاتورة المرجعية', 'قيمة المرتجع', 'المسترد', 'المتبقي', 'الحالة', 'التاريخ', 'الإجراءات'].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displayReturns.map(r => (
                                                <tr key={r.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group ${r.deleted_at ? 'opacity-50' : ''}`}>
                                                    <td className="px-5 py-6 font-black text-slate-400 dark:text-white/40 text-xl">#{r.id}</td>
                                                    <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">
                                                        <Link href={`/purchase-returns/${r.id}`} className="hover:text-primary transition-colors">
                                                            {r.supplier?.name ?? 'مورد غير معروف'}
                                                        </Link>
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-2xl whitespace-nowrap">
                                                        {r.purchase ? (
                                                            <Link href={`/purchases/${r.purchase.id}`} className="text-primary hover:underline font-black">
                                                                فاتورة #{r.purchase.id}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-white/30 font-bold text-lg">مرتجع مستقل</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-orange-600 dark:text-orange-400 text-2xl whitespace-nowrap">
                                                        {fmt(r.total)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-purple-600 dark:text-purple-400 text-2xl whitespace-nowrap">
                                                        {fmt(r.recovered_amount)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-amber-600 dark:text-amber-400 text-2xl whitespace-nowrap">
                                                        {fmt(r.due_recovery)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                                    </td>
                                                    <td className="px-5 py-6 whitespace-nowrap">
                                                        {r.deleted_at ? (
                                                            <span className="text-base font-black px-4 py-2 rounded-[16px] bg-red-500/10 text-red-500 border border-red-500/20">ملغي</span>
                                                        ) : (
                                                            <span className={`text-base font-black px-4 py-2 rounded-[16px] border ${recoveryClass[r.recovery_status]}`}>
                                                                {recoveryLabel[r.recovery_status]}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-6 text-slate-500 dark:text-white/60 font-bold text-lg whitespace-nowrap">
                                                        {fmtDate(r.created_at)}
                                                    </td>
                                                    <td className="px-5 py-6 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Link href={`/purchase-returns/${r.id}`}
                                                                className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                <Eye className="w-5 h-5 sm:w-6 sm:h-6" /> عرض
                                                            </Link>
                                                            {r.deleted_at ? (
                                                                <button onClick={() => router.post(`/purchase-returns/${r.id}/restore`)}
                                                                    className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /> استعادة
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => setCancelTarget(r)}
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
                                    {displayReturns.map(r => (
                                        <div key={r.id} className={`p-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-4 ${r.deleted_at ? 'opacity-60' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-slate-800 dark:text-white text-2xl">{r.supplier?.name ?? 'مورد غير معروف'}</span>
                                                    <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-0.5">#{r.id} — {fmtDate(r.created_at)}</p>
                                                </div>
                                                {r.deleted_at ? (
                                                    <span className="text-base font-black px-4 py-2 rounded-[14px] bg-red-500/10 text-red-500 border border-red-500/20">ملغي</span>
                                                ) : (
                                                    <span className={`text-base font-black px-4 py-2 rounded-[14px] border ${recoveryClass[r.recovery_status]}`}>
                                                        {recoveryLabel[r.recovery_status]}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/5">
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">المرتجع</span>
                                                    <p className="font-black text-xl text-orange-600 dark:text-orange-400">{fmt(r.total)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">المسترد</span>
                                                    <p className="font-black text-xl text-purple-600 dark:text-purple-400">{fmt(r.recovered_amount)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">المتبقي</span>
                                                    <p className="font-black text-xl text-amber-600 dark:text-amber-400">{fmt(r.due_recovery)}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-2 text-base font-bold text-slate-600 dark:text-white/70">
                                                <span>الفاتورة:</span>
                                                {r.purchase ? (
                                                    <Link href={`/purchases/${r.purchase.id}`} className="text-primary font-black hover:underline">#{r.purchase.id}</Link>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-white/40">مرتجع مستقل</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <Link href={`/purchase-returns/${r.id}`}
                                                    className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[18px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-lg transition-all">
                                                    <Eye className="w-5 h-5" /> عرض
                                                </Link>
                                                {r.deleted_at ? (
                                                    <button onClick={() => router.post(`/purchase-returns/${r.id}/restore`)}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[18px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-lg transition-all">
                                                        <RotateCcw className="w-5 h-5" /> استعادة
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setCancelTarget(r)}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[18px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black text-lg transition-all">
                                                        <Trash2 className="w-5 h-5" /> إلغاء
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <Pagination links={data?.links || []} currentPage={data?.current_page} lastPage={data?.last_page} />
                            </>
                        )}
                    </SpatialCard>
                </div>
            </div>

            {/* Portal Slide-Over Filter Drawer */}
            <FilterDrawer
                isOpen={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                applyFilter={applyFilter}
                resetFilter={resetFilter}
                hasFilter={Boolean(hasFilter)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* العمود الأول (اليمين): المورد والمنتج وحالة الاسترداد */}
                    <div className="flex flex-col gap-6">
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <span className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 border border-blue-500/20">👤</span>
                                <span className="text-slate-900 dark:text-white tracking-wide">المورد والمنتج</span>
                            </h4>

                            <ModernSelect label="المورد" placeholder="الكل"
                                options={[{ label: 'الكل' }, ...(suppliers || []).map(s => ({ label: s.name }))]}
                                defaultValue={fSupplier ? ((suppliers || []).find(s => String(s.id) === fSupplier)?.name ?? '') : 'الكل'}
                                onSelect={val => setFSupplier(val === 'الكل' ? '' : String((suppliers || []).find(s => s.name === val)?.id ?? ''))}
                            />

                            <ModernSelect label="المنتج" placeholder="الكل"
                                options={[{ label: 'الكل' }, ...(products || []).map(p => ({ label: p.name }))]}
                                defaultValue={fProduct ? ((products || []).find(p => String(p.id) === fProduct)?.name ?? '') : 'الكل'}
                                onSelect={val => setFProduct(val === 'الكل' ? '' : String((products || []).find(p => p.name === val)?.id ?? ''))}
                            />

                            <ModernSelect label="حالة الاسترداد" placeholder="الكل"
                                options={[
                                    { label: 'الكل' },
                                    { label: 'لم يُسترد' },
                                    { label: 'جزئي' },
                                    { label: 'مسترد' },
                                ]}
                                defaultValue={
                                    fStatus === 'unpaid'  ? 'لم يُسترد' :
                                    fStatus === 'partial' ? 'جزئي' :
                                    fStatus === 'paid'    ? 'مسترد' : 'الكل'
                                }
                                onSelect={val => setFStatus(
                                    val === 'لم يُسترد' ? 'unpaid' :
                                    val === 'جزئي'       ? 'partial' :
                                    val === 'مسترد'      ? 'paid' : ''
                                )}
                            />
                        </div>
                    </div>

                    {/* العمود الثاني (اليسار): طريقة الاسترداد والمبالغ والتواريخ */}
                    <div className="flex flex-col gap-6">
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <DollarSign className="w-6 h-6 text-emerald-500" />
                                <span className="text-slate-900 dark:text-white tracking-wide">وسيلة الاسترداد والمبالغ</span>
                            </h4>

                            <ModernSelect label="وسيلة الاسترداد" placeholder="الكل"
                                options={[
                                    { label: 'الكل' },
                                    { label: 'هجين', badge: '🔀' },
                                    ...(paymentMethods || []).map(m => ({ label: m.name })),
                                ]}
                                defaultValue={
                                    fPayMethod === 'hybrid' ? 'هجين' :
                                    fPayMethod ? ((paymentMethods || []).find(m => String(m.id) === fPayMethod)?.name ?? '') : 'الكل'
                                }
                                onSelect={val =>
                                    setFPayMethod(
                                        val === 'الكل'  ? '' :
                                        val === 'هجين' ? 'hybrid' :
                                        String((paymentMethods || []).find(m => m.name === val)?.id ?? '')
                                    )
                                }
                            />

                            <AmountRangeInput label="قيمة المرتجع (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                                onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
                        </div>

                        {/* قسم التواريخ */}
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <Calendar className="w-6 h-6 text-purple-500" />
                                <span className="text-slate-900 dark:text-white tracking-wide">نطاق التواريخ</span>
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
                                <DateFilterInput label="إلى تاريخ" value={fDateTo} onChange={setFDateTo} />
                            </div>
                        </div>
                    </div>
                </div>
            </FilterDrawer>

            {cancelTarget && (
                <CancelReturnModal ret={cancelTarget} onClose={() => setCancelTarget(null)} />
            )}
        </AppShell>
    );
}
