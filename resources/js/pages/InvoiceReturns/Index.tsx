import { useState } from 'react';
import { createPortal } from 'react-dom';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { Plus, Eye, Trash2, RotateCcw, SlidersHorizontal, Search, AlertTriangle, X } from 'lucide-react';

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
    data: T[]; current_page: number; last_page: number; total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    returns:        Paginated<InvoiceReturn>;
    customers:      Customer[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

const recoveryLabel = { unpaid: 'لم يُسترد', partial: 'مسترد جزئياً', paid: 'مسترد بالكامل' };
const recoveryClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(v: string | null) {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

function RadioGroup({ value, onChange, yesLabel, yesDesc, noLabel, noDesc }: {
    value: boolean; onChange: (v: boolean) => void;
    yesLabel: string; yesDesc: string; noLabel: string; noDesc: string;
}) {
    return (
        <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer group" onClick={() => onChange(true)}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${value ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-white/30 group-hover:border-red-400'}`}>
                    {value && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-slate-800 dark:text-white text-base">{yesLabel}</span>
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{yesDesc}</span>
                </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group" onClick={() => onChange(false)}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${!value ? 'border-primary bg-primary' : 'border-slate-300 dark:border-white/30 group-hover:border-primary/60'}`}>
                    {!value && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-slate-800 dark:text-white text-base">{noLabel}</span>
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{noDesc}</span>
                </div>
            </label>
        </div>
    );
}

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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg rounded-[32px] p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200
                border-2 border-black/10 dark:border-white/15
                bg-gradient-to-b from-white via-slate-50 to-slate-100
                dark:[background:linear-gradient(165deg,#13192e_0%,#0e1220_100%)]
                shadow-2xl z-10">

                <div className="flex items-center justify-between">
                    <div className="w-16 h-16 rounded-[22px] bg-red-500/15 border-2 border-red-500/25 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <button onClick={onClose}
                        className="w-12 h-12 rounded-full bg-black/6 dark:bg-white/10 hover:bg-black/12 dark:hover:bg-white/20 text-slate-500 dark:text-white/60 flex items-center justify-center transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">إلغاء المرتجع #{ret.id}</h3>
                    <p className="text-base font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        سيتم إلغاء المرتجع واستعادة المخزون لحالته السابقة.
                    </p>
                </div>

                {hasSettlements && (
                    <div className="flex flex-col gap-4 p-5 rounded-[22px] bg-black/4 dark:bg-white/5 border-2 border-black/8 dark:border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-slate-600 dark:text-white/70">التسويات المرتبطة بهذا المرتجع</span>
                            <span className="font-black text-purple-500 text-xl">{fmt(String(settlementsTotal))} د.ل</span>
                        </div>
                        <div className="h-px bg-black/8 dark:bg-white/8" />
                        <RadioGroup
                            value={deleteSettlements} onChange={setDeleteSettlements}
                            yesLabel="نعم، احذف التسويات معه" yesDesc="المبلغ لم يُسترد فعلاً"
                            noLabel="لا، أبقِ التسويات كرصيد مستقل" noDesc="المبلغ استُرد فعلاً وسيبقى في سجل العميل"
                        />
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <button onClick={onClose}
                        className="flex-1 h-16 rounded-[22px] bg-black/6 dark:bg-white/8 hover:bg-black/10 text-slate-600 dark:text-white/70 font-black text-lg transition-all border border-black/8 dark:border-white/10">
                        إلغاء
                    </button>
                    <button onClick={confirm}
                        className="flex-1 h-16 rounded-[22px] bg-red-500 hover:bg-red-600 text-white font-black text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/30 active:scale-95">
                        <Trash2 className="w-6 h-6" /> تأكيد الإلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function InvoiceReturnsIndex({ returns: data, customers, products, paymentMethods, flash }: Props) {
    const [cancelTarget, setCancelTarget] = useState<InvoiceReturn | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeTab,  setActiveTab]  = useState<'active' | 'deleted'>('active');

    const activeReturns  = data.data.filter(r => !r.deleted_at);
    const deletedReturns = data.data.filter(r => r.deleted_at);
    const displayReturns = activeTab === 'active' ? activeReturns : deletedReturns;

    const params = new URLSearchParams(window.location.search);
    const [fCustomer,   setFCustomer]   = useState(params.get('filter[customer_id]') ?? '');
    const [fStatus,     setFStatus]     = useState(params.get('filter[recovery_status]') ?? '');
    const [fProduct,    setFProduct]    = useState(params.get('filter[product_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');

    const hasFilter = Boolean(fCustomer || fStatus || fProduct || fDateFrom || fDateTo || fAmountFrom || fAmountTo);

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fCustomer)   f['filter[customer_id]']       = fCustomer;
        if (fStatus)     f['filter[recovery_status]']   = fStatus;
        if (fProduct)    f['filter[product_id]']        = fProduct;
        if (fDateFrom)   f['filter[date_from]']         = fDateFrom;
        if (fDateTo)     f['filter[date_to]']           = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']       = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']         = fAmountTo;
        setFilterOpen(false);
        router.get('/invoice-returns', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFCustomer(''); setFStatus(''); setFProduct('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        setFilterOpen(false);
        router.get('/invoice-returns', {}, { preserveScroll: true });
    }

    return (
        <>
        <AppShell pageTitle="مرتجعات العملاء">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">مرتجعات العملاء</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">سجل وإدارة مرتجعات فواتير المبيعات</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/invoice-returns/create"
                            className="spatial-button flex items-center justify-center gap-3 px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] text-lg sm:text-2xl font-black shadow-xl">
                            <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> مرتجع جديد
                        </Link>
                    </div>
                </div>

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
                            <button onClick={() => setFilterOpen(true)}
                                className={`flex items-center gap-3 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl transition-all border-2 active:scale-95 shadow-md ${hasFilter ? 'bg-primary/15 border-primary text-primary shadow-primary/10' : 'spatial-input text-slate-800 dark:text-white hover:border-primary/40'}`}>
                                <SlidersHorizontal className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                <span>الفلترة</span>
                                {hasFilter && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </button>
                        </div>
                    </div>

                    <SpatialCard title={`المرتجعات (${displayReturns.length})`} icon={<RotateCcw className="w-6 h-6 text-primary" />}>
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
                                                {['#', 'العميل', 'الفاتورة', 'المرتجع', 'التسوية', 'المتبقي', 'الحالة', 'التاريخ', ''].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displayReturns.map(ret => (
                                                <tr key={ret.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors cursor-pointer group ${ret.deleted_at ? 'opacity-50' : ''}`}>
                                                    <td className="px-5 py-6 font-black text-slate-400 dark:text-white/40 text-xl">#{ret.id}</td>
                                                    <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{ret.customer?.name ?? 'زبون نقدي'}</td>
                                                    <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/70 text-xl">
                                                        {ret.invoice ? (
                                                            <Link href={`/invoices/${ret.invoice.id}`} className="text-primary hover:underline font-black">
                                                                #{ret.invoice.id}
                                                            </Link>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-orange-500 text-2xl sm:text-3xl whitespace-nowrap">{fmt(ret.total)} <span className="text-sm font-bold">د.ل</span></td>
                                                    <td className="px-5 py-6 font-black text-purple-500 text-2xl sm:text-3xl whitespace-nowrap">{fmt(ret.recovered_amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                    <td className="px-5 py-6 font-black text-amber-500 text-2xl sm:text-3xl whitespace-nowrap">{fmt(ret.due_recovery)} <span className="text-sm font-bold">د.ل</span></td>
                                                    <td className="px-5 py-6 whitespace-nowrap">
                                                        {ret.deleted_at ? (
                                                            <span className="text-lg font-black px-4 py-2 rounded-[14px] bg-red-500/10 text-red-500">ملغي</span>
                                                        ) : (
                                                            <span className={`text-lg font-black px-4 py-2 rounded-[14px] ${recoveryClass[ret.recovery_status]}`}>{recoveryLabel[ret.recovery_status]}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-6 text-slate-700 dark:text-white/80 whitespace-nowrap font-black text-xl">
                                                        <span className="px-4 sm:px-6 py-2.5 rounded-[16px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{fmtDate(ret.created_at)}</span>
                                                    </td>
                                                    <td className="px-5 py-6 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Link href={`/invoice-returns/${ret.id}`} className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                <Eye className="w-6 h-6 sm:w-7 sm:h-7" /> عرض
                                                            </Link>
                                                            {ret.deleted_at ? (
                                                                <button onClick={() => router.post(`/invoice-returns/${ret.id}/restore`, {}, { preserveScroll: true })}
                                                                    className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                    <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => setCancelTarget(ret)}
                                                                    className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                    <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" /> إلغاء
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
                                    {displayReturns.map(ret => (
                                        <div key={ret.id} className={`rounded-[28px] border border-black/8 dark:border-white/12 overflow-hidden ${ret.deleted_at ? 'opacity-60' : ''}`}>
                                            <div className="px-6 py-5 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-xl text-slate-800 dark:text-white">{ret.customer?.name ?? 'زبون نقدي'}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">#{ret.id}</span>
                                                        {ret.deleted_at ? (
                                                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-500">ملغي</span>
                                                        ) : (
                                                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${recoveryClass[ret.recovery_status]}`}>{recoveryLabel[ret.recovery_status]}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-6">
                                                {ret.invoice && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-400 dark:text-white/40">الفاتورة</span>
                                                        <Link href={`/invoices/${ret.invoice.id}`} className="font-black text-xl text-primary hover:underline">#{ret.invoice.id}</Link>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-400 dark:text-white/40">المرتجع</span>
                                                    <span className="font-black text-2xl text-orange-500">{fmt(ret.total)} <span className="text-xs font-normal">د.ل</span></span>
                                                </div>
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-400 dark:text-white/40">التسوية</span>
                                                    <span className="font-black text-2xl text-purple-500">{fmt(ret.recovered_amount)} <span className="text-xs font-normal">د.ل</span></span>
                                                </div>
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-400 dark:text-white/40">المتبقي</span>
                                                    <span className="font-black text-2xl text-amber-500">{fmt(ret.due_recovery)} <span className="text-xs font-normal">د.ل</span></span>
                                                </div>
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                    <span className="text-lg font-black text-slate-800 dark:text-white/90">{fmtDate(ret.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3.5 px-6 py-5 border-t border-black/5 dark:border-white/8">
                                                <Link href={`/invoice-returns/${ret.id}`} className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                    <Eye className="w-6 h-6 sm:w-7 sm:h-7" /> عرض
                                                </Link>
                                                {ret.deleted_at ? (
                                                    <button onClick={() => router.post(`/invoice-returns/${ret.id}/restore`, {}, { preserveScroll: true })}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                        <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setCancelTarget(ret)}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                        <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" /> إلغاء
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {data.last_page > 1 && (
                                    <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
                                        {data.links.map((link, i) => (
                                            link.url ? (
                                                <Link key={i} href={link.url}
                                                    className={`px-5 h-12 rounded-[14px] font-black text-base flex items-center transition-all ${link.active ? 'bg-primary text-white shadow-md' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ) : (
                                                <span key={i} className="px-5 h-12 rounded-[14px] font-black text-base flex items-center text-slate-300 dark:text-white/20"
                                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </SpatialCard>
                </div>
            </div>
        </AppShell>

        {/* Sliding Filter Drawer Portal */}
        {filterOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex justify-start dir-rtl">
                {/* Backdrop Overlay */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
                    onClick={() => setFilterOpen(false)}
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
                                <h3 className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">تصفية المرتجعات المتقدمة</h3>
                                <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تخصيص نتائج البحث والفلترة بكفاءة عالية</p>
                            </div>
                        </div>
                        <button onClick={() => setFilterOpen(false)}
                            className="w-14 h-14 rounded-full bg-black/6 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-500 dark:text-white/60 flex items-center justify-center transition-all border border-black/5 dark:border-white/10 active:scale-95">
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Content Area - 2 Columns */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Column 1 */}
                            <div className="flex flex-col gap-6">
                                <div className="p-6 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                                    <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl shrink-0 border border-blue-500/20">👤</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">العميل والمنتج</span>
                                    </h4>
                                    <ModernSelect label="العميل" placeholder="الكل"
                                        options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                                        defaultValue={fCustomer ? (customers.find(c => String(c.id) === fCustomer)?.name ?? '') : 'الكل'}
                                        onSelect={val => setFCustomer(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
                                    />
                                    <ModernSelect label="المنتج" placeholder="الكل"
                                        options={[{ label: 'الكل' }, ...products.map(p => ({ label: p.name }))]}
                                        defaultValue={fProduct ? (products.find(p => String(p.id) === fProduct)?.name ?? '') : 'الكل'}
                                        onSelect={val => setFProduct(val === 'الكل' ? '' : String(products.find(p => p.name === val)?.id ?? ''))}
                                    />
                                </div>

                                <div className="p-6 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                                    <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                        <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl shrink-0 border border-emerald-500/20">💵</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">نطاق المبالغ</span>
                                    </h4>
                                    <AmountRangeInput label="إجمالي المرتجع (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                                        onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="flex flex-col gap-6">
                                <div className="p-6 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                                    <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                        <span className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl shrink-0 border border-purple-500/20">📊</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">حالة الاسترداد</span>
                                    </h4>
                                    <ModernSelect label="حالة الاسترداد" placeholder="الكل"
                                        options={[{ label: 'الكل' }, { label: 'لم يُسترد' }, { label: 'مسترد جزئياً' }, { label: 'مسترد بالكامل' }]}
                                        defaultValue={fStatus === 'unpaid' ? 'لم يُسترد' : fStatus === 'partial' ? 'مسترد جزئياً' : fStatus === 'paid' ? 'مسترد بالكامل' : 'الكل'}
                                        onSelect={val => setFStatus(val === 'لم يُسترد' ? 'unpaid' : val === 'مسترد جزئياً' ? 'partial' : val === 'مسترد بالكامل' ? 'paid' : '')}
                                    />
                                </div>

                                <div className="p-6 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                                    <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                        <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl shrink-0 border border-amber-500/20">📅</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">التاريخ</span>
                                    </h4>
                                    <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
                                    <DateFilterInput label="إلى تاريخ" value={fDateTo} onChange={setFDateTo} />
                                </div>
                            </div>
                        </div>
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
        )}

        {cancelTarget && (
            <CancelReturnModal ret={cancelTarget} onClose={() => setCancelTarget(null)} />
        )}
        </>
    );
}
