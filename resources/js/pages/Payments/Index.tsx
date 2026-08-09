import { useState } from 'react';
import { createPortal } from 'react-dom';
import { router, Link, useForm } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { Plus, CreditCard, X, Check, SlidersHorizontal, Search, Trash2, Eye, RotateCcw } from 'lucide-react';
import { RestoreModal } from '@/components/ui/RestoreModal';

interface Customer { id: number; name: string; total_debt: string; is_active?: boolean | number; }
interface PaymentMethod { id: number; name: string; }
interface Product  { id: number; name: string; }
interface Payment {
    id: number;
    customer: Customer | null;
    invoice: { id: number } | null;
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
    payments:       Paginated<Payment>;
    customers:      Customer[];
    paymentMethods: PaymentMethod[];
    products:       Product[];
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

export default function PaymentsIndex({ payments, customers, paymentMethods, products, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [showPad,    setShowPad]    = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeTab,  setActiveTab]  = useState<'active' | 'deleted'>('active');

    const activePayments  = payments.data.filter(p => !p.deleted_at);
    const deletedPayments = payments.data.filter(p => p.deleted_at);
    const displayPayments = activeTab === 'active' ? activePayments : deletedPayments;
    const params = new URLSearchParams(window.location.search);
    const [fCustomer,   setFCustomer]   = useState(params.get('filter[customer_id]') ?? '');
    const [fMethod,     setFMethod]     = useState(params.get('filter[payment_method_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');

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
        router.get('/payments', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFCustomer(''); setFMethod(''); setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        setFilterOpen(false);
        router.get('/payments', {}, { preserveScroll: true });
    }

    // نموذج الإنشاء
    const form = useForm({
        customer_id: '', invoice_id: '', payment_method_id: '', amount: '', notes: '',
    });

    const selectedCustomer = customers.find(c => String(c.id) === form.data.customer_id);
    const customerDebt     = selectedCustomer ? parseFloat(selectedCustomer.total_debt) : 0;
    const maxPayment       = customerDebt > 0 ? customerDebt : undefined;

    const customerOptions      = customers.filter(c => c.is_active !== 0 && c.is_active !== false).map(c => ({ label: c.name, meta: fmt(c.total_debt) }));
    const paymentMethodOptions = paymentMethods.map(m => ({ label: m.name }));

    function resolveCustomerIdFromLabel(label: string) {
        return String(customers.find(c => c.name === label)?.id ?? '');
    }
    function resolveMethodIdFromLabel(label: string) {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    function submit() {
        form.post('/payments', {
            onSuccess: () => { form.reset(); setShowCreate(false); },
        });
    }

    return (
        <>
        <AppShell pageTitle="دفعات العملاء">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">دفعات العملاء</h1>
                        <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">سجل المدفوعات من العملاء</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                        <button onClick={() => setFilterOpen(true)}
                            className="flex items-center gap-3 px-6 h-16 rounded-[22px] spatial-input font-black text-lg sm:text-xl text-slate-800 dark:text-white hover:border-primary/40 transition-all border-2 active:scale-95 shadow-sm">
                            <SlidersHorizontal className="w-6 h-6 text-primary" />
                            <span>الفلترة</span>
                            {hasFilter && (
                                <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                            )}
                        </button>
                        {hasFilter && (
                            <button onClick={resetFilter}
                                className="flex items-center gap-2 px-5 h-16 rounded-[22px] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black text-base sm:text-lg transition-all border-2 border-red-500/20 active:scale-95 shadow-sm whitespace-nowrap">
                                <RotateCcw className="w-5 h-5" />
                                <span>إعادة تعيين</span>
                            </button>
                        )}
                        <button onClick={() => setShowCreate(p => !p)}
                            className="spatial-button flex items-center justify-center gap-3 px-8 h-16 rounded-[22px] font-black text-lg sm:text-xl shadow-md">
                            <Plus className="w-6 h-6" /> <span>دفعة جديدة</span>
                        </button>
                    </div>
                </div>

                {flash?.success && <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-lg">{flash.success}</div>}
                {flash?.error   && <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-base sm:text-lg">{flash.error}</div>}

                {/* نموذج الإنشاء */}
                {showCreate && (
                    <SpatialCard title="دفعة جديدة" icon={<Plus className="w-6 h-6" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <ModernSelect
                                    label="العميل"
                                    options={customerOptions}
                                    defaultValue={selectedCustomer?.name ?? ''}
                                    onSelect={val => {
                                        form.setData('customer_id', resolveCustomerIdFromLabel(val));
                                        form.setData('amount', '');
                                    }}
                                />
                                {form.errors.customer_id && <p className="text-sm text-red-500 font-bold mt-1">{form.errors.customer_id}</p>}
                                {selectedCustomer && (
                                    <div className={`mt-3 px-4 py-3 rounded-[16px] flex items-center justify-between border-2 ${
                                        customerDebt > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                                    }`}>
                                        <span className="text-sm font-black text-slate-600 dark:text-white/60">دين العميل</span>
                                        <span className={`font-black text-lg sm:text-xl ${customerDebt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {fmt(selectedCustomer.total_debt)} د.ل
                                            {customerDebt <= 0 && <span className="text-xs mr-1">(لا يوجد دين)</span>}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <ModernSelect
                                    label="وسيلة الدفع"
                                    options={paymentMethodOptions}
                                    defaultValue={paymentMethods.find(m => String(m.id) === form.data.payment_method_id)?.name ?? ''}
                                    onSelect={val => form.setData('payment_method_id', resolveMethodIdFromLabel(val))}
                                />
                                {form.errors.payment_method_id && <p className="text-sm text-red-500 font-bold mt-1">{form.errors.payment_method_id}</p>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-black text-slate-700 dark:text-white/75 uppercase tracking-wider">المبلغ</label>
                                <button onClick={() => setShowPad(true)}
                                    className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-xl sm:text-2xl font-black text-center cursor-pointer hover:border-primary/40 transition-all border-2">
                                    {form.data.amount ? `${form.data.amount} د.ل` : <span className="text-slate-400 dark:text-white/30 font-bold">{maxPayment ? `${fmt(maxPayment)} د.ل` : '0.00 د.ل'}</span>}
                                </button>
                                {form.errors.amount && <p className="text-sm text-red-500 font-bold mt-1">{form.errors.amount}</p>}
                            </div>
                            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                                <label className="text-sm font-black text-slate-700 dark:text-white/75 uppercase tracking-wider">ملاحظة (اختياري)</label>
                                <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                    className="spatial-input h-16 rounded-[22px] px-6 text-lg font-bold border-2" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-6">
                            <button onClick={submit} disabled={form.processing || !form.data.customer_id || !form.data.amount}
                                className="spatial-button flex items-center gap-3 px-8 h-16 rounded-[22px] text-lg sm:text-xl font-black disabled:opacity-50 shadow-md">
                                <Check className="w-6 h-6" /> حفظ الدفعة
                            </button>
                            <button onClick={() => { setShowCreate(false); form.reset(); }}
                                className="h-16 px-6 rounded-[22px] bg-black/6 dark:bg-white/10 text-slate-700 dark:text-white/80 font-black text-lg transition-all border-2 border-black/5 dark:border-white/10">
                                <X className="w-6 h-6" /> إلغاء
                            </button>
                        </div>
                    </SpatialCard>
                )}

                {/* Tabs & Table */}
                <div className="flex flex-col gap-4">
                    {/* Tabs */}
                    <div className="flex gap-3">
                        <button onClick={() => setActiveTab('active')} className={`px-6 h-14 sm:h-16 rounded-[20px] font-black text-base sm:text-xl transition-all border-2 ${activeTab === 'active' ? 'bg-primary text-white border-primary shadow-md' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12 border-transparent'}`}>
                            الدفعات النشطة ({activePayments.length})
                        </button>
                        <button onClick={() => setActiveTab('deleted')} className={`px-6 h-14 sm:h-16 rounded-[20px] font-black text-base sm:text-xl transition-all border-2 ${activeTab === 'deleted' ? 'bg-primary text-white border-primary shadow-md' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12 border-transparent'}`}>
                            الدفعات المحذوفة ({deletedPayments.length})
                        </button>
                    </div>

                    <SpatialCard title={`الدفعات (${displayPayments.length})`} icon={<CreditCard className="w-6 h-6" />}>
                        {displayPayments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                <span className="text-6xl">💳</span>
                                <span className="font-black text-xl">{activeTab === 'active' ? 'لا توجد دفعات' : 'لا توجد دفعات محذوفة'}</span>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-lg sm:text-xl">
                                        <thead>
                                            <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                {['#', 'العميل', 'الفاتورة', 'وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', 'الإجراءات'].map(h => (
                                                    <th key={h} className={`px-5 py-5 text-base sm:text-xl font-black text-slate-600 dark:text-white/60 uppercase tracking-wider ${h === 'الإجراءات' ? 'text-center' : 'text-right'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {displayPayments.map(pay => (
                                                <tr key={pay.id} className={`hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer group transition-colors ${pay.deleted_at ? 'opacity-50' : ''}`}>
                                                    <td className="px-5 py-5 font-black text-slate-400 dark:text-white/40 text-xl sm:text-2xl">#{pay.id}</td>
                                                    <td className="px-5 py-5 font-black text-slate-800 dark:text-white text-xl sm:text-2xl">{pay.customer?.name ?? '—'}</td>
                                                    <td className="px-5 py-5 font-black text-slate-500 dark:text-white/60 text-xl sm:text-2xl">
                                                        {pay.invoice ? <Link href={`/invoices/${pay.invoice.id}`} className="hover:text-primary transition-colors text-primary font-black">#{pay.invoice.id}</Link> : '—'}
                                                    </td>
                                                    <td className="px-5 py-5 font-black text-slate-700 dark:text-white/80 text-xl sm:text-2xl">{pay.payment_method.name}</td>
                                                    <td className="px-5 py-5 font-black text-emerald-600 dark:text-emerald-400 text-2xl sm:text-3xl whitespace-nowrap">{fmt(pay.amount)} <span className="text-sm font-bold">د.ل</span></td>
                                                    <td className="px-5 py-5 text-slate-600 dark:text-white/60 font-bold text-lg">{pay.notes ?? '—'}</td>
                                                    <td className="px-5 py-5 font-bold whitespace-nowrap">
                                                        <span className="px-4 sm:px-6 py-2.5 rounded-[16px] bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/10 text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{fmtDate(pay.created_at)}</span>
                                                    </td>
                                                    <td className="px-5 py-5 text-center">
                                                        <div className="flex items-center justify-center gap-2.5">
                                                            <Link href={`/payments/${pay.id}`}
                                                                className="inline-flex items-center justify-center gap-2 px-5 h-14 sm:h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-base sm:text-xl shadow-md active:scale-95 whitespace-nowrap">
                                                                <Eye className="w-5 h-5 sm:w-6 sm:h-6" /> <span>عرض</span>
                                                            </Link>
                                                            {pay.deleted_at ? (
                                                                <RestoreModal
                                                                    title="استعادة الدفعة"
                                                                    description="هل أنت متأكد من استعادة هذه الدفعة؟"
                                                                    onConfirm={() => router.post(`/payments/${pay.id}/restore`, {}, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button className="inline-flex items-center justify-center gap-2 px-5 h-14 sm:h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-base sm:text-xl shadow-md active:scale-95 whitespace-nowrap">
                                                                            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /> <span>استعادة</span>
                                                                        </button>
                                                                    }
                                                                />
                                                            ) : (
                                                                <DeleteModal onConfirm={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                                    trigger={
                                                                        <button className="inline-flex items-center justify-center gap-2 px-5 h-14 sm:h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-base sm:text-xl shadow-md active:scale-95 whitespace-nowrap">
                                                                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" /> <span>حذف</span>
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
                                    {displayPayments.map(pay => (
                                        <div key={pay.id} className={`rounded-[28px] border-2 border-black/8 dark:border-white/12 overflow-hidden ${pay.deleted_at ? 'opacity-60' : ''}`}>
                                            <div className="px-6 py-5 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                <div>
                                                    <span className="font-black text-xl text-slate-800 dark:text-white block">{pay.customer?.name ?? '—'}</span>
                                                    <span className="text-sm font-bold text-slate-400 dark:text-white/40">#{pay.id}</span>
                                                </div>
                                                {pay.deleted_at && <span className="text-xs font-black px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">محذوف</span>}
                                            </div>
                                            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-6">
                                                {pay.invoice && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-500 dark:text-white/50">الفاتورة</span>
                                                        <Link href={`/invoices/${pay.invoice.id}`} className="font-black text-primary hover:underline text-lg">#{pay.invoice.id}</Link>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-500 dark:text-white/50">المبلغ</span>
                                                    <span className="font-black text-2xl text-emerald-600 dark:text-emerald-400">{fmt(pay.amount)} د.ل</span>
                                                </div>
                                                {pay.notes && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-bold text-slate-500 dark:text-white/50">ملاحظة</span>
                                                        <span className="font-bold text-slate-700 dark:text-white/80 text-base">{pay.notes}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-500 dark:text-white/50">طريقة الدفع</span>
                                                    <span className="font-black text-slate-800 dark:text-white text-lg">{pay.payment_method.name}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-bold text-slate-500 dark:text-white/50">التاريخ</span>
                                                    <span className="text-lg font-black text-slate-800 dark:text-white/90">{fmtDate(pay.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 px-6 py-5 border-t-2 border-black/5 dark:border-white/8 bg-slate-50/50 dark:bg-slate-900/30">
                                                <Link href={`/payments/${pay.id}`}
                                                    className="flex-1 flex items-center justify-center gap-2 h-16 rounded-[20px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black text-lg shadow-sm">
                                                    <Eye className="w-6 h-6" /> <span>عرض</span>
                                                </Link>
                                                {pay.deleted_at ? (
                                                    <RestoreModal
                                                        title="استعادة الدفعة"
                                                        description="هل أنت متأكد من استعادة هذه الدفعة؟"
                                                        onConfirm={() => router.post(`/payments/${pay.id}/restore`, {}, { preserveScroll: true })}
                                                        trigger={
                                                            <button className="flex-1 flex items-center justify-center gap-2 h-16 rounded-[20px] border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-lg shadow-sm">
                                                                <RotateCcw className="w-6 h-6" /> <span>استعادة</span>
                                                            </button>
                                                        }
                                                    />
                                                ) : (
                                                    <DeleteModal onConfirm={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                        trigger={
                                                            <button className="flex-1 flex items-center justify-center gap-2 h-16 rounded-[20px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-lg shadow-sm">
                                                                <Trash2 className="w-6 h-6" /> <span>حذف</span>
                                                            </button>
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {payments.last_page > 1 && (
                                    <div className="flex items-center justify-center gap-3 pt-6 flex-wrap">
                                        {payments.links.map((link, i) => (
                                            link.url ? (
                                                <Link key={i} href={link.url}
                                                    className={`px-6 h-14 rounded-[18px] font-black text-lg flex items-center transition-all border-2 ${link.active ? 'bg-primary text-white border-primary shadow-md' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12 border-transparent'}`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ) : (
                                                <span key={i} className="px-6 h-14 rounded-[18px] font-black text-lg flex items-center text-slate-300 dark:text-white/20"
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

        {filterOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex justify-start dir-rtl">
                {/* Backdrop Overlay - Closes drawer on click */}
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
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b-2 border-black/5 dark:border-white/8 shrink-0 bg-black/3 dark:bg-white/4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-[22px] bg-primary/10 border-2 border-primary/25 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                                <SlidersHorizontal className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white text-2xl sm:text-3xl">فلترة المدفوعات المتقدمة</h3>
                                <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تخصيص نتائج البحث والفلترة بكفاءة عالية</p>
                            </div>
                        </div>
                        <button onClick={() => setFilterOpen(false)}
                            className="w-14 h-14 rounded-full bg-black/6 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-500 dark:text-white/60 flex items-center justify-center transition-all border border-black/5 dark:border-white/10 active:scale-95">
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Drawer Content - 2 Columns */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Column 1: Customer & Amounts */}
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-slate-50 dark:bg-slate-900/40 border-2 border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/5">
                                        <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-lg">👤</span>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white/90">البحث والعميل</h3>
                                    </div>
                                    <ModernSelect label="العميل" placeholder="الكل"
                                        options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                                        defaultValue={fCustomer ? (customers.find(c => String(c.id) === fCustomer)?.name ?? '') : 'الكل'}
                                        onSelect={val => setFCustomer(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
                                    />
                                </div>

                                <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-slate-50 dark:bg-slate-900/40 border-2 border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/5">
                                        <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-lg">💵</span>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white/90">المبالغ</h3>
                                    </div>
                                    <AmountRangeInput label="المبلغ (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                                        onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
                                </div>
                            </div>

                            {/* Column 2: Payment Method & Dates */}
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-slate-50 dark:bg-slate-900/40 border-2 border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/5">
                                        <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-lg">💳</span>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white/90">طريقة الدفع</h3>
                                    </div>
                                    <ModernSelect label="طريقة الدفع" placeholder="الكل"
                                        options={[{ label: 'الكل' }, ...paymentMethods.map(m => ({ label: m.name }))]}
                                        defaultValue={fMethod ? (paymentMethods.find(m => String(m.id) === fMethod)?.name ?? '') : 'الكل'}
                                        onSelect={val => setFMethod(val === 'الكل' ? '' : String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
                                    />
                                </div>

                                <div className="flex flex-col gap-4 p-6 rounded-[24px] bg-slate-50 dark:bg-slate-900/40 border-2 border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/5">
                                        <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-lg">📅</span>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white/90">التواريخ</h3>
                                    </div>
                                    <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
                                    <DateFilterInput label="إلى تاريخ" value={fDateTo} onChange={setFDateTo} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Drawer Footer */}
                    <div className="flex items-center gap-4 px-8 py-6 border-t border-black/10 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
                        <button onClick={applyFilter}
                            className="spatial-button flex-1 h-16 rounded-[22px] text-xl font-black shadow-lg flex items-center justify-center gap-3">
                            <Search className="w-6 h-6" /> تطبيق الفلتر
                        </button>
                        {hasFilter && (
                            <button onClick={resetFilter}
                                className="h-16 px-6 rounded-[22px] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black text-lg transition-all border-2 border-red-500/20 active:scale-95">
                                إعادة تعيين
                            </button>
                        )}
                    </div>
                </div>
            </div>,
            document.body
        )}

        <NumberPadModal
            isOpen={showPad}
            title="المبلغ"
            initialValue={form.data.amount || (maxPayment ? String(maxPayment) : '')}
            maxValue={maxPayment}
            onClose={() => setShowPad(false)}
            onConfirm={v => { form.setData('amount', v); setShowPad(false); }}
        />
        </>
    );
}
