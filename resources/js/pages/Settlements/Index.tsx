import { useState } from 'react';
import { createPortal } from 'react-dom';
import { router, Link, useForm } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, RefreshCw, X, Check, SlidersHorizontal, Search, Trash2, Eye, RotateCcw } from 'lucide-react';

interface Customer { id: number; name: string; total_debt: string; is_active?: boolean | number; }
interface PaymentMethod { id: number; name: string; }
interface Settlement {
    id: number;
    customer: Customer | null;
    invoice_return: { id: number } | null;
    payment_method: { name: string };
    amount: string;
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
}
interface Paginated<T> {
    data: T[]; current_page: number; last_page: number; total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    settlements:    Paginated<Settlement>;
    customers:      Customer[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

function fmt(v: string | number) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(v: string | null) {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

export default function SettlementsIndex({ settlements, customers, paymentMethods, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeTab,  setActiveTab]  = useState<'active' | 'deleted'>('active');

    const activeSettlements  = settlements.data.filter(s => !s.deleted_at);
    const deletedSettlements = settlements.data.filter(s => s.deleted_at);
    const displaySettlements = activeTab === 'active' ? activeSettlements : deletedSettlements;

    const params = new URLSearchParams(window.location.search);
    const [fCustomer,   setFCustomer]   = useState(params.get('filter[customer_id]') ?? '');
    const [fMethod,     setFMethod]     = useState(params.get('filter[payment_method_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');

    // NumberPad
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max); setPadCallback(() => cb); setShowPad(true);
    }

    const hasFilter = Boolean(fCustomer || fMethod || fDateFrom || fDateTo || fAmountFrom || fAmountTo);

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fCustomer)   f['filter[customer_id]']        = fCustomer;
        if (fMethod)     f['filter[payment_method_id]']  = fMethod;
        if (fDateFrom)   f['filter[date_from]']          = fDateFrom;
        if (fDateTo)     f['filter[date_to]']            = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']        = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']          = fAmountTo;
        setFilterOpen(false);
        router.get('/settlements', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFCustomer(''); setFMethod(''); setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        setFilterOpen(false);
        router.get('/settlements', {}, { preserveScroll: true });
    }

    const form = useForm({
        customer_id: '', invoice_return_id: '', payment_method_id: '', amount: '', notes: '',
    });

    const customerOptions      = customers.filter(c => c.is_active !== 0 && c.is_active !== false).map(c => ({ label: c.name, meta: fmt(c.total_debt) }));
    const paymentMethodOptions = paymentMethods.map(m => ({ label: m.name }));

    function resolveCustomerIdFromLabel(label: string) {
        return String(customers.find(c => c.name === label)?.id ?? '');
    }
    function resolveMethodIdFromLabel(label: string) {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    const selectedCustomer = customers.find(c => String(c.id) === form.data.customer_id);
    const canSettle = selectedCustomer ? parseFloat(selectedCustomer.total_debt) < 0 : false;

    function submit() {
        form.post('/settlements', {
            onSuccess: () => { form.reset(); setShowCreate(false); },
        });
    }

    return (
        <>
        <AppShell pageTitle="تسويات العملاء">
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">تسويات العملاء</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">سجل وإدارة تسويات رصيد العملاء عند الدائنية</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowCreate(p => !p)}
                            className="spatial-button flex items-center justify-center gap-3 px-7 sm:px-9 h-16 sm:h-20 rounded-[22px] text-lg sm:text-2xl font-black shadow-xl">
                            <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> تسوية جديدة
                        </button>
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

                {/* Create Settlement Form */}
                {showCreate && (
                    <SpatialCard title="إضافة تسوية جديدة" icon={<Plus className="w-6 h-6 text-primary" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                            <div>
                                <ModernSelect
                                    label="العميل"
                                    options={customerOptions}
                                    defaultValue={selectedCustomer?.name ?? ''}
                                    onSelect={val => form.setData('customer_id', resolveCustomerIdFromLabel(val))}
                                />
                                {form.errors.customer_id && <p className="text-sm text-red-500 font-bold mt-1.5">{form.errors.customer_id}</p>}
                            </div>

                            {selectedCustomer && !canSettle && (
                                <div className="sm:col-span-2 lg:col-span-2 px-6 py-4 rounded-[20px] bg-amber-500/10 border-2 border-amber-500/20 flex items-center">
                                    <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                                        ⚠️ لا يمكن إنشاء تسوية — العميل لا يزال مديناً بمبلغ ({fmt(selectedCustomer.total_debt)} د.ل)
                                    </p>
                                </div>
                            )}

                            {canSettle && (
                                <>
                                    <div>
                                        <ModernSelect
                                            label="وسيلة الدفع"
                                            options={paymentMethodOptions}
                                            defaultValue={paymentMethods.find(m => String(m.id) === form.data.payment_method_id)?.name ?? ''}
                                            onSelect={val => form.setData('payment_method_id', resolveMethodIdFromLabel(val))}
                                        />
                                        {form.errors.payment_method_id && <p className="text-sm text-red-500 font-bold mt-1.5">{form.errors.payment_method_id}</p>}
                                    </div>

                                    <div className="flex flex-col gap-2.5">
                                        <label className="text-sm sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">المبلغ</label>
                                        <button type="button" onClick={() => {
                                            const maxSettlementLimit = selectedCustomer ? Math.abs(parseFloat(selectedCustomer.total_debt)) : 0;
                                            openPad('المبلغ', form.data.amount || String(maxSettlementLimit), v => form.setData('amount', v), maxSettlementLimit);
                                        }} className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl sm:text-2xl font-black text-right w-full cursor-pointer hover:border-primary/40 transition-all border-2">
                                            {form.data.amount ? (
                                                <span>{fmt(form.data.amount)} <span className="text-sm font-bold text-slate-400">د.ل</span></span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-white/30 font-bold">{fmt(selectedCustomer ? Math.abs(parseFloat(selectedCustomer.total_debt)) : 0)} د.ل</span>
                                            )}
                                        </button>
                                        {form.errors.amount && <p className="text-sm text-red-500 font-bold mt-1.5">{form.errors.amount}</p>}
                                    </div>

                                    <div className="flex flex-col gap-2.5 sm:col-span-2 lg:col-span-3">
                                        <label className="text-sm sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">ملاحظة</label>
                                        <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                            className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-lg sm:text-xl font-bold border-2" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-black/5 dark:border-white/8">
                            {canSettle && (
                                <button onClick={submit} disabled={form.processing}
                                    className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[20px] text-lg sm:text-xl font-black shadow-lg">
                                    <Check className="w-6 h-6" /> حفظ التسوية
                                </button>
                            )}
                            <button onClick={() => { setShowCreate(false); form.reset(); }}
                                className="h-16 px-6 rounded-[20px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all font-black text-lg">
                                إلغاء
                            </button>
                        </div>
                    </SpatialCard>
                )}

                {/* Tabs & Filter Bar Section */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveTab('active')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'active' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>التسويات النشطة</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {activeSettlements.length}
                                </span>
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`h-16 sm:h-20 rounded-[22px] font-black text-lg sm:text-xl px-6 sm:px-8 transition-all flex items-center gap-3 ${activeTab === 'deleted' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                <span>التسويات المحذوفة</span>
                                <span className={`px-3 py-1 rounded-full text-base font-black ${activeTab === 'deleted' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white'}`}>
                                    {deletedSettlements.length}
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

                    <SpatialCard title={`سجل التسويات (${displaySettlements.length})`} icon={<RefreshCw className="w-6 h-6 text-primary" />}>
                        {displaySettlements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                <span className="text-6xl">🔄</span>
                                <span className="font-black text-2xl">{activeTab === 'active' ? 'لا توجد تسويات نشطة' : 'لا توجد تسويات محذوفة'}</span>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b-2 border-black/5 dark:border-white/5">
                                                {['#', 'العميل', 'المرتجع المرتبط', 'وسيلة التسوية', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                                    <th key={h} className="px-5 py-5 text-base sm:text-lg font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displaySettlements.map(s => (
                                                <tr key={s.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 transition-colors cursor-pointer group ${s.deleted_at ? 'opacity-50' : ''}`}>
                                                    <td className="px-5 py-6 font-black text-slate-400 dark:text-white/40 text-xl">#{s.id}</td>
                                                    <td className="px-5 py-6 font-black text-slate-800 dark:text-white text-2xl">{s.customer?.name ?? '—'}</td>
                                                    <td className="px-5 py-6 font-black text-slate-600 dark:text-white/70 text-xl">
                                                        {s.invoice_return ? (
                                                            <Link href={`/invoice-returns/${s.invoice_return.id}`} className="text-primary hover:underline font-black">
                                                                #{s.invoice_return.id}
                                                            </Link>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-5 py-6 font-bold text-slate-600 dark:text-white/70 text-lg sm:text-xl">{s.payment_method.name}</td>
                                                    <td className="px-5 py-6 font-black text-purple-500 text-2xl sm:text-3xl whitespace-nowrap">{fmt(s.amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                    <td className="px-5 py-6 text-slate-600 dark:text-white/60 font-bold text-lg">{s.notes ?? '—'}</td>
                                                    <td className="px-5 py-6 text-slate-700 dark:text-white/80 whitespace-nowrap font-black text-xl">
                                                        <span className="px-4 sm:px-6 py-2.5 rounded-[16px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{fmtDate(s.created_at)}</span>
                                                    </td>
                                                    <td className="px-5 py-6 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Link href={`/settlements/${s.id}`} className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                <Eye className="w-6 h-6 sm:w-7 sm:h-7" /> عرض
                                                            </Link>
                                                            {s.deleted_at ? (
                                                                <RestoreModal
                                                                    title="استعادة التسوية"
                                                                    description="هل أنت متأكد من استعادة هذه التسوية؟"
                                                                    onConfirm={() => router.post(`/settlements/${s.id}/restore`, {}, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                            <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة
                                                                        </button>
                                                                    }
                                                                />
                                                            ) : (
                                                                <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button className="flex items-center gap-2.5 px-7 sm:px-9 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl active:scale-95 shadow-md">
                                                                            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" /> حذف
                                                                        </button>
                                                                    } />
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
                                    {displaySettlements.map(s => (
                                        <div key={s.id} className={`rounded-[28px] border border-black/8 dark:border-white/12 overflow-hidden ${s.deleted_at ? 'opacity-60' : ''}`}>
                                            <div className="px-6 py-5 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-xl text-slate-800 dark:text-white">{s.customer?.name ?? '—'}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">#{s.id}</span>
                                                        {s.deleted_at && (
                                                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-500">محذوف</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-6">
                                                {s.invoice_return && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-400 dark:text-white/40">المرتجع</span>
                                                        <Link href={`/invoice-returns/${s.invoice_return.id}`} className="font-black text-xl text-primary hover:underline">#{s.invoice_return.id}</Link>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-400 dark:text-white/40">المبلغ</span>
                                                    <span className="font-black text-2xl text-purple-500">{fmt(s.amount)} <span className="text-xs font-normal">د.ل</span></span>
                                                </div>
                                                {s.notes && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                        <span className="font-bold text-slate-700 dark:text-white/80 text-lg">{s.notes}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-400 dark:text-white/40">وسيلة التسوية</span>
                                                    <span className="font-bold text-slate-700 dark:text-white/80 text-lg">{s.payment_method.name}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                    <span className="text-lg font-black text-slate-800 dark:text-white/90">{fmtDate(s.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3.5 px-6 py-5 border-t border-black/5 dark:border-white/8">
                                                <Link href={`/settlements/${s.id}`} className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                    <Eye className="w-6 h-6 sm:w-7 sm:h-7" /> عرض
                                                </Link>
                                                {s.deleted_at ? (
                                                    <RestoreModal
                                                        title="استعادة التسوية"
                                                        description="هل أنت متأكد من استعادة هذه التسوية؟"
                                                        onConfirm={() => router.post(`/settlements/${s.id}/restore`, {}, { preserveScroll: true })}
                                                        trigger={
                                                            <button className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                                <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> استعادة
                                                            </button>
                                                        }
                                                    />
                                                ) : (
                                                    <button onClick={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                        className="flex-1 flex items-center justify-center gap-2.5 h-16 sm:h-20 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                                                        <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" /> حذف
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {settlements.last_page > 1 && (
                                    <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
                                        {settlements.links.map((link, i) => (
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
                                <h3 className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">تصفية التسويات المتقدمة</h3>
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
                                        <span className="text-slate-900 dark:text-white tracking-wide">العميل والمعلومات الأساسية</span>
                                    </h4>
                                    <ModernSelect label="العميل" placeholder="الكل"
                                        options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                                        defaultValue={fCustomer ? (customers.find(c => String(c.id) === fCustomer)?.name ?? '') : 'الكل'}
                                        onSelect={val => setFCustomer(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
                                    />
                                </div>

                                <div className="p-6 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                                    <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                        <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl shrink-0 border border-emerald-500/20">💵</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">نطاق المبالغ</span>
                                    </h4>
                                    <AmountRangeInput label="المبلغ (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                                        onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="flex flex-col gap-6">
                                <div className="p-6 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/6 dark:border-white/10 flex flex-col gap-6">
                                    <h4 className="text-base sm:text-xl font-black flex items-center gap-3 border-b-2 border-black/5 dark:border-white/8 pb-3.5">
                                        <span className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl shrink-0 border border-purple-500/20">💳</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">وسيلة التسوية</span>
                                    </h4>
                                    <ModernSelect label="طريقة التسوية" placeholder="الكل"
                                        options={[{ label: 'الكل' }, ...paymentMethods.map(m => ({ label: m.name }))]}
                                        defaultValue={fMethod ? (paymentMethods.find(m => String(m.id) === fMethod)?.name ?? '') : 'الكل'}
                                        onSelect={val => setFMethod(val === 'الكل' ? '' : String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
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

        <NumberPadModal
            isOpen={showPad}
            title={padTitle}
            initialValue={padInitial}
            maxValue={padMax}
            onClose={() => setShowPad(false)}
            onConfirm={v => { padCallback?.(v); setShowPad(false); }}
        />
        </>
    );
}
