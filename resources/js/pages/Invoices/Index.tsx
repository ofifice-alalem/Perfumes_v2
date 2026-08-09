import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, Pagination } from '@/components/ui/SpatialComponents';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { createPortal } from 'react-dom';
import {
    Plus, Eye, Trash2, RotateCcw, AlertTriangle, X,
    SlidersHorizontal, ChevronDown, Search, FileText, Hash,
} from 'lucide-react';
import { RestoreModal } from '@/components/ui/RestoreModal';

interface Customer { id: number; name: string; }
interface User     { id: number; name: string; }
interface Product  { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface Invoice {
    id: number;
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
const statusClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtDate(v: string | null) {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

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

    function RadioGroup({ value, onChange, yesLabel, yesDesc, noLabel, noDesc }: {
        value: boolean; onChange: (v: boolean) => void;
        yesLabel: string; yesDesc: string; noLabel: string; noDesc: string;
    }) {
        return (
            <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center gap-3.5 cursor-pointer group" onClick={() => onChange(true)}>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${value ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-white/30 group-hover:border-red-400'}`}>
                        {value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-white text-base sm:text-lg">{yesLabel}</span>
                        <span className="text-sm sm:text-base font-bold text-slate-400 dark:text-white/50">{yesDesc}</span>
                    </div>
                </label>
                <label className="flex items-center gap-3.5 cursor-pointer group" onClick={() => onChange(false)}>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${!value ? 'border-primary bg-primary' : 'border-slate-300 dark:border-white/30 group-hover:border-primary/60'}`}>
                        {!value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-white text-base sm:text-lg">{noLabel}</span>
                        <span className="text-sm sm:text-base font-bold text-slate-400 dark:text-white/50">{noDesc}</span>
                    </div>
                </label>
            </div>
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-xl rounded-[32px] p-6 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                border-2 border-black/10 dark:border-white/[0.15]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.55)_0%,rgba(20,25,55,0.45)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/20 dark:shadow-black/70">

                <div className="flex items-center justify-between">
                    <div className="w-16 h-16 rounded-[22px] bg-red-500/15 border-2 border-red-500/25 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/6 dark:bg-white/10 hover:bg-black/12 dark:hover:bg-white/20 text-slate-500 dark:text-white/60 flex items-center justify-center transition-all active:scale-95">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">إلغاء فاتورة البيع</h3>
                    <p className="text-base sm:text-xl font-bold text-slate-500 dark:text-white/60 leading-relaxed">سيتم إلغاء الفاتورة واسترداد المخزون.</p>
                </div>

                {hasPayments && (
                    <div className="flex flex-col gap-4 p-5 rounded-[22px] bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-base sm:text-lg font-black text-slate-700 dark:text-white/80">الدفعات المرتبطة</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg sm:text-xl">{fmt(invoice.paid_amount)} د.ل</span>
                        </div>
                        <div className="h-px bg-black/8 dark:bg-white/8" />
                        <RadioGroup
                            value={deletePayments} onChange={setDeletePayments}
                            yesLabel="نعم، احذف الدفعات معها" yesDesc="الفاتورة كانت خطأ في الإدخال"
                            noLabel="لا، أبقِ الدفعات كرصيد للعميل" noDesc="المال دُفع فعلاً وسيبقى في سجل العميل"
                        />
                    </div>
                )}

                {hasSettlements && (
                    <div className="flex flex-col gap-4 p-5 rounded-[22px] bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-base sm:text-lg font-black text-slate-700 dark:text-white/80">التسويات المرتبطة</span>
                            <span className="font-black text-purple-500 text-lg sm:text-xl">{fmt(String(settlementsTotal))} د.ل</span>
                        </div>
                        <div className="h-px bg-black/8 dark:bg-white/8" />
                        <RadioGroup
                            value={deleteSettlements} onChange={setDeleteSettlements}
                            yesLabel="نعم، احذف التسويات معها" yesDesc="التسوية لم تُنفَّذ فعلاً"
                            noLabel="لا، أبقِ التسويات كرصيد مستقل" noDesc="المبلغ استُرد فعلاً وسيبقى في سجل العميل"
                        />
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <button onClick={onClose} className="flex-1 h-16 sm:h-20 rounded-[22px] bg-black/6 dark:bg-white/10 hover:bg-black/12 dark:hover:bg-white/20 text-slate-700 dark:text-white/80 font-black text-lg sm:text-2xl transition-all border-2 border-black/8 dark:border-white/10 active:scale-95">
                        إلغاء
                    </button>
                    <button onClick={confirm} className="flex-1 h-16 sm:h-20 rounded-[22px] bg-red-500 hover:bg-red-600 text-white font-black text-lg sm:text-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-500/30 border-2 border-red-500 active:scale-95">
                        <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" /> تأكيد الإلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function InvoicesIndex({ invoices, customers, users, products, paymentMethods, flash }: Props) {
    const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
    const [filterOpen,   setFilterOpen]   = useState(false);
    const [activeTab,    setActiveTab]    = useState<'active' | 'deleted'>('active');

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

    const hasFilter = fInvoiceId || fCustomer || fUser || fProduct || fDateFrom || fDateTo || fAmountFrom || fAmountTo || fPayMethod;

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
        router.get('/invoices', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFInvoiceId(''); setFCustomer(''); setFUser(''); setFProduct('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo(''); setFPayMethod('');
        router.get('/invoices', {}, { preserveScroll: true });
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            {/* رقم الفاتورة */}
            <div className="flex flex-col gap-2">
                <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-white/75 uppercase tracking-widest">
                    رقم الفاتورة
                </label>
                <button
                    type="button"
                    onClick={() => setShowIdPad(true)}
                    className={`spatial-input h-14 sm:h-16 rounded-[18px] px-4 text-base sm:text-xl font-black cursor-pointer hover:border-primary/40 transition-all shadow-sm active:scale-95 flex items-center justify-between ${
                        fInvoiceId ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-white/30'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-primary" />
                        <span>{fInvoiceId ? `#${fInvoiceId}` : 'ادخل رقم الفاتورة...'}</span>
                    </div>
                    {fInvoiceId && (
                        <span
                            onClick={(e) => { e.stopPropagation(); setFInvoiceId(''); }}
                            className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs text-slate-600 dark:text-white hover:bg-red-500 hover:text-white transition-colors"
                        >
                            ✕
                        </span>
                    )}
                </button>
            </div>

            <ModernSelect label="العميل" placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={fCustomer ? (customers.find(c => String(c.id) === fCustomer)?.name ?? '') : 'الكل'}
                onSelect={val => setFCustomer(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect label="البائع" placeholder="الكل"
                options={[{ label: 'الكل' }, ...users.map(u => ({ label: u.name }))]}
                defaultValue={fUser ? (users.find(u => String(u.id) === fUser)?.name ?? '') : 'الكل'}
                onSelect={val => setFUser(val === 'الكل' ? '' : String(users.find(u => u.name === val)?.id ?? ''))}
            />
            <ModernSelect label="المنتج" placeholder="الكل"
                options={[{ label: 'الكل' }, ...products.map(p => ({ label: p.name }))]}
                defaultValue={fProduct ? (products.find(p => String(p.id) === fProduct)?.name ?? '') : 'الكل'}
                onSelect={val => setFProduct(val === 'الكل' ? '' : String(products.find(p => p.name === val)?.id ?? ''))}
            />
            <ModernSelect label="طريقة الدفع" placeholder="الكل"
                options={[{ label: 'الكل' }, { label: 'هجين', badge: '🔀' }, ...paymentMethods.map(m => ({ label: m.name }))]}
                defaultValue={fPayMethod === 'hybrid' ? 'هجين' : fPayMethod ? (paymentMethods.find(m => String(m.id) === fPayMethod)?.name ?? '') : 'الكل'}
                onSelect={val => setFPayMethod(val === 'الكل' ? '' : val === 'هجين' ? 'hybrid' : String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
            />
            <AmountRangeInput label="الإجمالي (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
            <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={fDateTo}   onChange={setFDateTo} />
            <button onClick={applyFilter} className="w-full h-16 sm:h-20 rounded-[22px] bg-primary text-white font-black text-lg sm:text-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 mt-3">
                <Search className="w-6 h-6 sm:w-7 sm:h-7" /> تطبيق الفلتر
            </button>
            {hasFilter && (
                <button onClick={resetFilter} className="w-full h-16 sm:h-20 rounded-[22px] bg-black/6 dark:bg-white/8 hover:bg-black/12 dark:hover:bg-white/15 text-slate-700 dark:text-white/80 font-black text-lg sm:text-2xl transition-all border-2 border-black/8 dark:border-white/10 shadow-sm mt-2 active:scale-95">
                    إعادة تعيين الفلتر
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="فواتير البيع">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">فواتير البيع</h1>
                        <p className="text-sm sm:text-base font-bold text-slate-400 dark:text-white/40 mt-1">إدارة مبيعات العملاء والمخزون</p>
                    </div>
                    <Link href="/invoices/create" className="spatial-button w-full sm:w-auto flex items-center justify-center gap-3 px-8 h-16 sm:h-20 rounded-[24px] text-lg sm:text-xl font-black shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                        <Plus className="w-6 h-6 stroke-[3]" /> فاتورة بيع جديدة
                    </Link>
                </div>

                {flash?.success && <div className="px-5 py-3.5 rounded-[18px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-base">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3.5 rounded-[18px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-base">{flash.error}</div>}

                {/* Mobile Filter */}
                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)} className="w-full flex items-center justify-between px-7 h-16 sm:h-20 rounded-[22px] spatial-input font-black text-lg sm:text-2xl text-slate-800 dark:text-white border-2">
                        <div className="flex items-center gap-3">
                            <SlidersHorizontal className="w-6 h-6 text-primary" /> خيارات الفلترة
                            {hasFilter && <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />}
                        </div>
                        <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && (
                        <div className="mt-3 spatial-card p-6 sm:p-8 animate-in fade-in slide-in-from-top-2 duration-200">
                            <FilterPanel />
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    <div className="flex-1 min-w-0">
                        {/* Tabs */}
                        <div className="flex gap-3.5 mb-6">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`px-8 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-2xl transition-all border-2 ${
                                    activeTab === 'active'
                                        ? 'bg-primary text-white border-primary shadow-xl scale-[1.02]'
                                        : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/12'
                                }`}
                            >
                                الفواتير النشطة ({activeInvoices.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('deleted')}
                                className={`px-8 h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-2xl transition-all border-2 ${
                                    activeTab === 'deleted'
                                        ? 'bg-primary text-white border-primary shadow-xl scale-[1.02]'
                                        : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/12'
                                }`}
                            >
                                الفواتير الملغية ({deletedInvoices.length})
                            </button>
                        </div>

                        <SpatialCard title={`الفواتير (${displayInvoices.length})`} icon={<FileText className="w-5 h-5" />}>
                            {displayInvoices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                    <span className="text-5xl">🧾</span>
                                    <span className="font-bold text-lg">{activeTab === 'active' ? 'لا توجد فواتير بيع' : 'لا توجد فواتير ملغية'}</span>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-lg sm:text-xl">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['#', 'العميل', 'البائع', 'الإجمالي', 'المدفوع', 'المتبقي', 'التاريخ', 'الإجراءات'].map(h => (
                                                        <th key={h} className="text-right px-5 py-6 text-base sm:text-xl font-black text-slate-600 dark:text-white/60 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {displayInvoices.map(inv => (
                                                    <tr key={inv.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors cursor-pointer group ${inv.deleted_at ? 'opacity-50' : ''}`}>
                                                        <td className="px-5 py-6 font-black text-slate-400 dark:text-white/40 text-xl">#{inv.id}</td>
                                                        <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{inv.customer?.name ?? 'زبون نقدي'}</td>
                                                        <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/70 text-lg sm:text-xl">{inv.user?.name ?? '—'}</td>
                                                        <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl sm:text-3xl whitespace-nowrap">{fmt(inv.total)} <span className="text-sm font-bold">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-emerald-600 dark:text-emerald-400 text-2xl sm:text-3xl whitespace-nowrap">{fmt(inv.paid_amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                        <td className="px-5 py-6 font-black text-amber-500 text-2xl sm:text-3xl whitespace-nowrap">{fmt(inv.due_amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                        <td className="px-5 py-6 text-slate-700 dark:text-white/80 whitespace-nowrap font-black text-xl">
                                                            <span className="px-4 sm:px-6 py-2.5 rounded-[16px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{fmtDate(inv.created_at)}</span>
                                                        </td>
                                                        <td className="px-5 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <Link href={`/invoices/${inv.id}`} className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                    <Eye className="w-6 h-6 sm:w-7 sm:h-7" /> عرض
                                                                </Link>
                                                                {inv.deleted_at ? (
                                                                    <RestoreModal
                                                                        title="استعادة الفاتورة"
                                                                        description="هل أنت متأكد من استعادة هذه الفاتورة؟ سيتم استعادة الدفعات والتسويات المرتبطة بها."
                                                                        onConfirm={() => router.post(`/invoices/${inv.id}/restore`)}
                                                                        trigger={
                                                                            <button className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                                <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة
                                                                            </button>
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <button onClick={() => setCancelTarget(inv)} className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
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
                                        {displayInvoices.map(inv => (
                                            <div key={inv.id} className={`rounded-[28px] border border-black/8 dark:border-white/12 overflow-hidden ${inv.deleted_at ? 'opacity-60' : ''}`}>
                                                <div className="px-6 py-5 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-black text-lg text-slate-800 dark:text-white">{inv.customer?.name ?? 'زبون نقدي'}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{inv.id}</span>
                                                            {inv.deleted_at && (
                                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">ملغي</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-6">
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-400 dark:text-white/40">الفاتورة</span>
                                                        <span className="font-black text-xl text-slate-800 dark:text-white">{fmt(inv.total)} <span className="text-xs font-normal">د.ل</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-400 dark:text-white/40">المدفوع</span>
                                                        <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">{fmt(inv.paid_amount)} <span className="text-xs font-normal">د.ل</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-400 dark:text-white/40">المتبقي</span>
                                                        <span className="font-black text-xl text-amber-500">{fmt(inv.due_amount)} <span className="text-xs font-normal">د.ل</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                        <span className="text-base font-black text-slate-800 dark:text-white/90">{fmtDate(inv.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3.5 px-6 py-5 border-t border-black/5 dark:border-white/8">
                                                    <Link href={`/invoices/${inv.id}`} className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                        <Eye className="w-6 h-6 sm:w-7 sm:h-7" /> عرض
                                                    </Link>
                                                    {inv.deleted_at ? (
                                                        <RestoreModal
                                                            title="استعادة الفاتورة"
                                                            description="هل أنت متأكد من استعادة هذه الفاتورة؟ سيتم استعادة الدفعات والتسويات المرتبطة بها."
                                                            onConfirm={() => router.post(`/invoices/${inv.id}/restore`)}
                                                            trigger={
                                                                <button className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                                    <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة
                                                                </button>
                                                            }
                                                        />
                                                    ) : (
                                                        <button onClick={() => setCancelTarget(inv)} className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" /> إلغاء
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    <Pagination links={invoices.links} currentPage={invoices.current_page} lastPage={invoices.last_page} />
                                </>
                            )}
                        </SpatialCard>
                    </div>

                    {/* Desktop Filter */}
                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>
            </div>

            {cancelTarget && <CancelInvoiceModal invoice={cancelTarget} onClose={() => setCancelTarget(null)} />}

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
