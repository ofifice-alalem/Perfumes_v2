import { useState } from 'react';
import { router, Link, useForm } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { Plus, CreditCard, X, Check, SlidersHorizontal, ChevronDown, Search, Trash2, Eye, RotateCcw } from 'lucide-react';
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
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
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

    const hasFilter = fCustomer || fMethod || fDateFrom || fDateTo || fAmountFrom || fAmountTo;

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fCustomer)   f['filter[customer_id]']        = fCustomer;
        if (fMethod)     f['filter[payment_method_id]']  = fMethod;
        if (fDateFrom)   f['filter[date_from]']          = fDateFrom;
        if (fDateTo)     f['filter[date_to]']            = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']        = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']          = fAmountTo;
        router.get('/payments', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFCustomer(''); setFMethod(''); setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
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

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect label="العميل" placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={fCustomer ? (customers.find(c => String(c.id) === fCustomer)?.name ?? '') : 'الكل'}
                onSelect={val => setFCustomer(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect label="طريقة الدفع" placeholder="الكل"
                options={[{ label: 'الكل' }, ...paymentMethods.map(m => ({ label: m.name }))]}
                defaultValue={fMethod ? (paymentMethods.find(m => String(m.id) === fMethod)?.name ?? '') : 'الكل'}
                onSelect={val => setFMethod(val === 'الكل' ? '' : String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
            />
            <AmountRangeInput label="المبلغ (من — إلى)" valueFrom={fAmountFrom} valueTo={fAmountTo}
                onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }} />
            <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={fDateTo}   onChange={setFDateTo} />
            <button onClick={applyFilter} className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> تطبيق الفلتر
            </button>
            {hasFilter && (
                <button onClick={resetFilter} className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <>
        <AppShell pageTitle="دفعات العملاء">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">دفعات العملاء</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">سجل المدفوعات من العملاء</p>
                    </div>
                    <button onClick={() => setShowCreate(p => !p)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> دفعة جديدة
                    </button>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* نموذج الإنشاء */}
                {showCreate && (
                    <SpatialCard title="دفعة جديدة" icon={<Plus className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                {form.errors.customer_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.customer_id}</p>}
                                {selectedCustomer && (
                                    <div className={`mt-2 px-3 py-2 rounded-[12px] flex items-center justify-between ${
                                        customerDebt > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
                                    }`}>
                                        <span className="text-xs font-bold text-slate-500 dark:text-white/50">دين العميل</span>
                                        <span className={`font-black text-sm ${customerDebt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {fmt(selectedCustomer.total_debt)}
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
                                {form.errors.payment_method_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.payment_method_id}</p>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
                                <button onClick={() => setShowPad(true)}
                                    className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                                    {form.data.amount || <span className="text-slate-400 dark:text-white/30 font-bold">{maxPayment ? fmt(maxPayment) : '0.00'}</span>}
                                </button>
                                {form.errors.amount && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.amount}</p>}
                            </div>
                            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظة (اختياري)</label>
                                <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                    className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <button onClick={submit} disabled={form.processing || !form.data.customer_id || !form.data.amount}
                                className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
                                <Check className="w-4 h-4" /> حفظ
                            </button>
                            <button onClick={() => { setShowCreate(false); form.reset(); }}
                                className="h-11 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </SpatialCard>
                )}

                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)} className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> فلترة {hasFilter && <span className="w-2 h-2 rounded-full bg-primary" />}</div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200"><FilterPanel /></div>}
                </div>

                <div className="flex gap-6">
                    <div className="flex-1 min-w-0">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setActiveTab('active')} className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                الدفعات النشطة ({activePayments.length})
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${activeTab === 'deleted' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                الدفعات المحذوفة ({deletedPayments.length})
                            </button>
                        </div>

                        <SpatialCard title={`الدفعات (${displayPayments.length})`} icon={<CreditCard className="w-4 h-4" />}>
                            {displayPayments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                                    <span className="text-4xl">💳</span>
                                    <span className="font-bold">{activeTab === 'active' ? 'لا توجد دفعات' : 'لا توجد دفعات محذوفة'}</span>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['#', 'العميل', 'الفاتورة', 'وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {displayPayments.map(pay => (
                                                    <tr key={pay.id} className={`hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${pay.deleted_at ? 'opacity-50' : ''}`}>
                                                        <td className="px-4 py-3 font-bold text-slate-400 dark:text-white/40">#{pay.id}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{pay.customer?.name ?? '—'}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/60">
                                                            {pay.invoice ? <Link href={`/invoices/${pay.invoice.id}`} className="hover:text-primary transition-colors">#{pay.invoice.id}</Link> : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{pay.payment_method.name}</td>
                                                        <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(pay.amount)}</td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{pay.notes ?? '—'}</td>
                                                        <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">{fmtDate(pay.created_at)}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Link href={`/payments/${pay.id}`}
                                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                    <Eye className="w-3 h-3" /> عرض
                                                                </Link>
                                                                {pay.deleted_at ? (
                                                                    <RestoreModal
                                                                        title="استعادة الدفعة"
                                                                        description="هل أنت متأكد من استعادة هذه الدفعة؟"
                                                                        onConfirm={() => router.post(`/payments/${pay.id}/restore`, {}, { preserveScroll: true })}
                                                                        trigger={<button className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs"><RotateCcw className="w-3 h-3" /> استعادة</button>}
                                                                    />
                                                                ) : (
                                                                    <DeleteModal onConfirm={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                                        trigger={<button className="flex items-center gap-1 px-2.5 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs"><Trash2 className="w-3 h-3" /></button>} />
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
                                            <div key={pay.id} className={`rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden ${pay.deleted_at ? 'opacity-60' : ''}`}>
                                                <div className="px-5 py-4 bg-black/3 dark:bg-white/6">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-slate-800 dark:text-white">{pay.customer?.name ?? '—'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{pay.id}</span>
                                                        {pay.deleted_at && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">محذوف</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                                    {pay.invoice && (
                                                        <div className="flex items-center justify-between py-3">
                                                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">الفاتورة</span>
                                                            <Link href={`/invoices/${pay.invoice.id}`} className="font-bold text-primary hover:underline">#{pay.invoice.id}</Link>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">المبلغ</span>
                                                        <span className="font-black text-emerald-600 dark:text-emerald-400">{fmt(pay.amount)}</span>
                                                    </div>
                                                    {pay.notes && (
                                                        <div className="flex items-center justify-between py-3">
                                                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                            <span className="font-bold text-slate-500 dark:text-white/60 text-sm">{pay.notes}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">طريقة الدفع</span>
                                                        <span className="font-bold text-slate-600 dark:text-white/70">{pay.payment_method.name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/60">{fmtDate(pay.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                                    <Link href={`/payments/${pay.id}`}
                                                        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                        <Eye className="w-4 h-4" /> عرض
                                                    </Link>
                                                    {pay.deleted_at ? (
                                                        <RestoreModal
                                                            title="استعادة الدفعة"
                                                            description="هل أنت متأكد من استعادة هذه الدفعة؟"
                                                            onConfirm={() => router.post(`/payments/${pay.id}/restore`, {}, { preserveScroll: true })}
                                                            trigger={<button className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm"><RotateCcw className="w-4 h-4" /> استعادة</button>}
                                                        />
                                                    ) : (
                                                        <button onClick={() => router.delete(`/payments/${pay.id}`, { preserveScroll: true })}
                                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-4 h-4" /> حذف
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {payments.last_page > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
                                            {payments.links.map((link, i) => (
                                                link.url ? (
                                                    <Link key={i} href={link.url}
                                                        className={`px-4 h-9 rounded-[12px] font-bold text-sm flex items-center transition-all ${link.active ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }} />
                                                ) : (
                                                    <span key={i} className="px-4 h-9 rounded-[12px] font-bold text-sm flex items-center text-slate-300 dark:text-white/20"
                                                        dangerouslySetInnerHTML={{ __html: link.label }} />
                                                )
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </SpatialCard>
                    </div>
                    <div className="hidden lg:block w-[360px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>
            </div>
        </AppShell>

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
