import { router, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect, Pagination } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, CreditCard, X, Check, SlidersHorizontal, Trash2, Eye, RotateCcw, Search, Calendar, DollarSign, User } from 'lucide-react';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';

interface Supplier      { id: number; name: string; total_debt: string; is_active?: boolean | number; }
interface Product       { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface SupplierPayment {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    payment_method: PaymentMethod;
    amount: string;
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
}
interface Paginated<T> {
    data: T[];
    total: number;
    current_page: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    payments:       Paginated<SupplierPayment>;
    suppliers:      Supplier[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

// ── المكون المصغر للفلترة الجانبية ───────────────────────────────────────────────
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
                            <h3 className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">فلترة مدفوعات الموردين</h3>
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

export default function SupplierPaymentsIndex({ payments, suppliers = [], products = [], paymentMethods = [], flash }: Props) {
    const [showCreate, setSetShowCreate] = useState(false);
    const [showPad,    setShowPad]       = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [activeTab,  setActiveTab]     = useState<'active' | 'deleted'>('active');

    const activePayments  = (payments?.data || []).filter(p => !p.deleted_at);
    const deletedPayments = (payments?.data || []).filter(p => p.deleted_at);
    const displayPayments = activeTab === 'active' ? activePayments : deletedPayments;

    // قراءة الفلاتر الحالية من URL
    const params = new URLSearchParams(window.location.search);
    const [fSupplier,   setFSupplier]   = useState(params.get('filter[supplier_id]') ?? '');
    const [fMethod,     setFMethod]     = useState(params.get('filter[payment_method_id]') ?? '');
    const [fProduct,    setFProduct]    = useState(params.get('filter[product_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');

    const hasFilter = Boolean(fSupplier || fMethod || fProduct || fDateFrom || fDateTo || fAmountFrom || fAmountTo);

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fSupplier)   f['filter[supplier_id]']        = fSupplier;
        if (fMethod)     f['filter[payment_method_id]']  = fMethod;
        if (fProduct)    f['filter[product_id]']         = fProduct;
        if (fDateFrom)   f['filter[date_from]']          = fDateFrom;
        if (fDateTo)     f['filter[date_to]']            = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']        = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']          = fAmountTo;
        router.get('/supplier-payments', f, { preserveScroll: true });
        setFilterDrawerOpen(false);
    }

    function resetFilter() {
        setFSupplier(''); setFMethod(''); setFProduct('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        router.get('/supplier-payments', {}, { preserveScroll: true });
        setFilterDrawerOpen(false);
    }

    // نموذج الإنشاء
    const form = useForm({
        supplier_id: '', purchase_id: '', payment_method_id: '', amount: '', notes: '',
    });

    const selectedSupplier = (suppliers || []).find(s => String(s.id) === form.data.supplier_id);
    const supplierDebt     = selectedSupplier ? parseFloat(selectedSupplier.total_debt) : 0;
    const canPay           = selectedSupplier ? supplierDebt > 0 : false;
    const maxPayment       = supplierDebt > 0 ? supplierDebt : undefined;

    const supplierOptions      = (suppliers || []).filter(s => s.is_active !== 0 && s.is_active !== false).map(s => ({ label: s.name, meta: fmt(s.total_debt) }));
    const paymentMethodOptions = (paymentMethods || []).map(m => ({ label: m.name }));

    function resolveSupplierIdFromLabel(label: string) {
        return String((suppliers || []).find(s => s.name === label)?.id ?? '');
    }
    function resolveMethodIdFromLabel(label: string) {
        return String((paymentMethods || []).find(m => m.name === label)?.id ?? '');
    }

    function submit() {
        form.post('/supplier-payments', {
            onSuccess: () => { form.reset(); setSetShowCreate(false); },
        });
    }

    return (
        <AppShell pageTitle="مدفوعات للموردين">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">مدفوعات للموردين</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">سجل وإدارة جميع الدفعات المسددة للموردين</p>
                    </div>
                    <button onClick={() => setSetShowCreate(p => !p)}
                        className="spatial-button flex items-center justify-center gap-3 px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] text-lg sm:text-2xl font-black shadow-xl">
                        <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> دفعة جديدة
                    </button>
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

                {/* Create Payment Form Card */}
                {showCreate && (
                    <SpatialCard title="إضافة دفعة مورد جديدة" icon={<Plus className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-col gap-6 p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <ModernSelect
                                        label="المورد"
                                        options={supplierOptions}
                                        defaultValue={selectedSupplier?.name ?? ''}
                                        onSelect={val => {
                                            form.setData('supplier_id', resolveSupplierIdFromLabel(val));
                                            form.setData('amount', '');
                                        }}
                                    />
                                    {form.errors.supplier_id && <p className="text-sm text-red-500 font-black mt-2">{form.errors.supplier_id}</p>}
                                    {selectedSupplier && (
                                        <div className={`mt-3 px-4 py-3 rounded-[16px] flex items-center justify-between border-2 ${
                                            supplierDebt > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            <span className="text-sm font-black">دين المورد الحالي:</span>
                                            <span className="font-black text-xl">
                                                {fmt(selectedSupplier.total_debt)} د.ل
                                                {supplierDebt <= 0 && <span className="text-sm mr-2">(لا يوجد دين)</span>}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {selectedSupplier && !canPay && (
                                    <div className="sm:col-span-2 lg:col-span-2 px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center">
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                            ⚠️ لا يمكن إنشاء دفعة — لا توجد ديون مستحقة على هذا المورد
                                        </p>
                                    </div>
                                )}

                                {canPay && (
                                    <>
                                        <div>
                                            <ModernSelect
                                                label="وسيلة الدفع"
                                                options={paymentMethodOptions}
                                                defaultValue={(paymentMethods || []).find(m => String(m.id) === form.data.payment_method_id)?.name ?? ''}
                                                onSelect={val => form.setData('payment_method_id', resolveMethodIdFromLabel(val))}
                                            />
                                            {form.errors.payment_method_id && <p className="text-sm text-red-500 font-black mt-2">{form.errors.payment_method_id}</p>}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-black text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ المسدد</label>
                                            <button onClick={() => setShowPad(true)}
                                                className="spatial-input h-16 rounded-[22px] px-6 text-2xl font-black text-center cursor-pointer hover:border-primary/40 transition-all border-2 border-black/10 dark:border-white/15">
                                                {form.data.amount ? `${form.data.amount} د.ل` : <span className="text-slate-400 dark:text-white/30 font-bold">{maxPayment ? `${fmt(maxPayment)} د.ل` : '0.00 د.ل'}</span>}
                                            </button>
                                            {form.errors.amount && <p className="text-sm text-red-500 font-black mt-2">{form.errors.amount}</p>}
                                        </div>
                                        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                                            <label className="text-sm font-black text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظة (اختياري)</label>
                                            <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                                className="spatial-input h-16 rounded-[22px] px-6 text-xl font-bold border-2 border-black/10 dark:border-white/15" />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t-2 border-black/5 dark:border-white/8">
                                {canPay && (
                                    <button onClick={submit} disabled={form.processing || !form.data.supplier_id || !form.data.amount}
                                        className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] font-black text-xl disabled:opacity-50 shadow-lg">
                                        <Check className="w-6 h-6" /> حفظ الدفعة
                                    </button>
                                )}
                                <button onClick={() => { setSetShowCreate(false); form.reset(); }}
                                    className="h-16 px-8 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Tabs & Filter Bar Section */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveTab('active')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'active' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>الدفعات النشطة</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {activePayments.length}
                                </span>
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'deleted' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>الدفعات الملغية</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'deleted' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {deletedPayments.length}
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
                    <SpatialCard title={`سجل مدفوعات الموردين (${displayPayments.length})`} icon={<CreditCard className="w-6 h-6 text-primary" />}>
                        {displayPayments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                <span className="text-6xl">💳</span>
                                <span className="font-black text-2xl">{activeTab === 'active' ? 'لا توجد دفعات نشطة' : 'لا توجد دفعات ملغية'}</span>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                                {['#', 'المورد', 'الفاتورة المرتبطة', 'وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', 'الإجراءات'].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displayPayments.map(p => (
                                                <tr key={p.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors group ${p.deleted_at ? 'opacity-50' : ''}`}>
                                                    <td className="px-5 py-6 font-black text-slate-400 dark:text-white/40 text-xl">#{p.id}</td>
                                                    <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">
                                                        <Link href={`/supplier-payments/${p.id}`} className="hover:text-primary transition-colors">
                                                            {p.supplier?.name ?? 'مورد غير معروف'}
                                                        </Link>
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-2xl whitespace-nowrap">
                                                        {p.purchase ? (
                                                            <Link href={`/purchases/${p.purchase.id}`} className="text-primary hover:underline font-black">
                                                                #{p.purchase.id}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-white/30 font-bold text-lg">مستقلة</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-slate-700 dark:text-white/80 text-xl whitespace-nowrap">
                                                        {p.payment_method?.name ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-6 font-black text-emerald-600 dark:text-emerald-400 text-2xl whitespace-nowrap">
                                                        {fmt(p.amount)} <span className="text-sm font-bold opacity-75">د.ل</span>
                                                    </td>
                                                    <td className="px-5 py-6 font-bold text-slate-500 dark:text-white/60 text-lg max-w-[200px] truncate">
                                                        {p.notes ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-6 text-slate-500 dark:text-white/60 font-bold text-lg whitespace-nowrap">
                                                        {fmtDate(p.created_at)}
                                                    </td>
                                                    <td className="px-5 py-6 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Link href={`/supplier-payments/${p.id}`}
                                                                className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                <Eye className="w-5 h-5 sm:w-6 sm:h-6" /> عرض
                                                            </Link>
                                                            {p.deleted_at ? (
                                                                <RestoreModal
                                                                    title="استعادة الدفعة"
                                                                    description="هل أنت متأكد من استعادة هذه الدفعة وإرجاعها لحساب المورد؟"
                                                                    onConfirm={() => router.post(`/supplier-payments/${p.id}/restore`, {}, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /> استعادة
                                                                        </button>
                                                                    }
                                                                />
                                                            ) : (
                                                                <DeleteModal
                                                                    onConfirm={() => router.delete(`/supplier-payments/${p.id}`)}
                                                                    trigger={
                                                                        <button className="flex items-center gap-2.5 px-6 sm:px-8 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" /> حذف
                                                                        </button>
                                                                    }
                                                                />
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
                                    {displayPayments.map(p => (
                                        <div key={p.id} className={`p-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-4 ${p.deleted_at ? 'opacity-60' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-slate-800 dark:text-white text-2xl">{p.supplier?.name ?? 'مورد غير معروف'}</span>
                                                    <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-0.5">#{p.id} — {fmtDate(p.created_at)}</p>
                                                </div>
                                                {p.deleted_at && (
                                                    <span className="text-base font-black px-4 py-2 rounded-[14px] bg-red-500/10 text-red-500 border border-red-500/20">ملغي</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/5">
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">المبلغ</span>
                                                    <p className="font-black text-2xl text-emerald-600 dark:text-emerald-400">{fmt(p.amount)} د.ل</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase">طريقة الدفع</span>
                                                    <p className="font-black text-xl text-slate-800 dark:text-white">{p.payment_method?.name ?? '—'}</p>
                                                </div>
                                            </div>

                                            {p.notes && (
                                                <p className="text-base font-bold text-slate-600 dark:text-white/70 px-2">{p.notes}</p>
                                            )}

                                            <div className="flex items-center gap-3 pt-2">
                                                <Link href={`/supplier-payments/${p.id}`}
                                                    className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[18px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-lg transition-all">
                                                    <Eye className="w-5 h-5" /> عرض
                                                </Link>
                                                {p.deleted_at ? (
                                                    <RestoreModal
                                                        title="استعادة الدفعة"
                                                        description="هل أنت متأكد من استعادة هذه الدفعة؟"
                                                        onConfirm={() => router.post(`/supplier-payments/${p.id}/restore`, {}, { preserveScroll: true })}
                                                        trigger={
                                                            <button className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[18px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-lg transition-all">
                                                                <RotateCcw className="w-5 h-5" /> استعادة
                                                            </button>
                                                        }
                                                    />
                                                ) : (
                                                    <DeleteModal
                                                        onConfirm={() => router.delete(`/supplier-payments/${p.id}`)}
                                                        trigger={
                                                            <button className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-[18px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black text-lg transition-all">
                                                                <Trash2 className="w-5 h-5" /> حذف
                                                            </button>
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <Pagination links={payments?.links || []} currentPage={payments?.current_page} lastPage={payments?.last_page} />
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
                    {/* العمود الأول (اليمين): المورد ووسيلة الدفع والمنتج */}
                    <div className="flex flex-col gap-6">
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <span className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 border border-blue-500/20">👤</span>
                                <span className="text-slate-900 dark:text-white tracking-wide">المورد ووسيلة الدفع</span>
                            </h4>

                            <ModernSelect label="المورد" placeholder="الكل"
                                options={[{ label: 'الكل' }, ...(suppliers || []).map(s => ({ label: s.name }))]}
                                defaultValue={fSupplier ? ((suppliers || []).find(s => String(s.id) === fSupplier)?.name ?? '') : 'الكل'}
                                onSelect={val => setFSupplier(val === 'الكل' ? '' : String((suppliers || []).find(s => s.name === val)?.id ?? ''))}
                            />

                            <ModernSelect label="وسيلة الدفع" placeholder="الكل"
                                options={[{ label: 'الكل' }, ...(paymentMethods || []).map(m => ({ label: m.name }))]}
                                defaultValue={fMethod ? ((paymentMethods || []).find(m => String(m.id) === fMethod)?.name ?? '') : 'الكل'}
                                onSelect={val => setFMethod(val === 'الكل' ? '' : String((paymentMethods || []).find(m => m.name === val)?.id ?? ''))}
                            />

                            <ModernSelect label="المنتج (في الفاتورة المرتبطة)" placeholder="الكل"
                                options={[{ label: 'الكل' }, ...(products || []).map(p => ({ label: p.name }))]}
                                defaultValue={fProduct ? ((products || []).find(p => String(p.id) === fProduct)?.name ?? '') : 'الكل'}
                                onSelect={val => setFProduct(val === 'الكل' ? '' : String((products || []).find(p => p.name === val)?.id ?? ''))}
                            />
                        </div>
                    </div>

                    {/* العمود الثاني (اليسار): نطاق المبالغ ونطاق التواريخ */}
                    <div className="flex flex-col gap-6">
                        {/* قسم المبالغ */}
                        <div className="p-6 sm:p-7 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                            <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                <DollarSign className="w-6 h-6 text-emerald-500" />
                                <span className="text-slate-900 dark:text-white tracking-wide">نطاق المبالغ</span>
                            </h4>
                            <AmountRangeInput label="المبلغ (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
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

            {/* NumberPadModal for entering amounts */}
            <NumberPadModal
                isOpen={showPad}
                title="أدخل مبلغ الدفعة"
                initialValue={form.data.amount || (maxPayment ? String(maxPayment) : '')}
                maxValue={maxPayment}
                onClose={() => setShowPad(false)}
                onConfirm={v => { form.setData('amount', v); setShowPad(false); }}
            />
        </AppShell>
    );
}
