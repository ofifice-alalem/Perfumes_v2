import { useState } from 'react';
import { router, Link, useForm } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';
import { Plus, RefreshCw, X, Check, SlidersHorizontal, ChevronDown, Search, Trash2, Eye, RotateCcw } from 'lucide-react';

interface Customer { id: number; name: string; total_debt: string; is_active?: boolean | number; }
interface PaymentMethod { id: number; name: string; }
interface Settlement {
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
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
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

    const hasFilter = fCustomer || fMethod || fDateFrom || fDateTo || fAmountFrom || fAmountTo;

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fCustomer)   f['filter[customer_id]']        = fCustomer;
        if (fMethod)     f['filter[payment_method_id]']  = fMethod;
        if (fDateFrom)   f['filter[date_from]']          = fDateFrom;
        if (fDateTo)     f['filter[date_to]']            = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']        = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']          = fAmountTo;
        router.get('/settlements', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFCustomer(''); setFMethod(''); setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        router.get('/settlements', {}, { preserveScroll: true });
    }

    const form = useForm({
        customer_id: '', invoice_id: '', payment_method_id: '', amount: '', notes: '',
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

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <ModernSelect label="العميل" placeholder="الكل"
                options={[{ label: 'الكل' }, ...customers.map(c => ({ label: c.name }))]}
                defaultValue={fCustomer ? (customers.find(c => String(c.id) === fCustomer)?.name ?? '') : 'الكل'}
                onSelect={val => setFCustomer(val === 'الكل' ? '' : String(customers.find(c => c.name === val)?.id ?? ''))}
            />
            <ModernSelect label="طريقة التسوية" placeholder="الكل"
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
        <AppShell pageTitle="تسويات العملاء">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تسويات العملاء</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تسجيل التسويات عندما يكون العميل دائناً</p>
                    </div>
                    <button onClick={() => setShowCreate(p => !p)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> تسوية جديدة
                    </button>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {showCreate && (
                    <SpatialCard title="تسوية جديدة" icon={<Plus className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <ModernSelect
                                    label="العميل"
                                    options={customerOptions}
                                    defaultValue={selectedCustomer?.name ?? ''}
                                    onSelect={val => form.setData('customer_id', resolveCustomerIdFromLabel(val))}
                                />
                                {form.errors.customer_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.customer_id}</p>}
                            </div>

                            {selectedCustomer && !canSettle && (
                                <div className="sm:col-span-2 lg:col-span-2 px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-center">
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                        ⚠️ لا يمكن إنشاء تسوية — العميل لا يزال مديناً ({fmt(selectedCustomer.total_debt)})
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
                                        {form.errors.payment_method_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.payment_method_id}</p>}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
                                        <input type="number" min="0.01" step="0.01" value={form.data.amount}
                                            onChange={e => form.setData('amount', e.target.value)}
                                            className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                        {form.errors.amount && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.amount}</p>}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                                        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظة</label>
                                        <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                            className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            {canSettle && (
                                <button onClick={submit} disabled={form.processing}
                                    className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
                                    <Check className="w-4 h-4" /> حفظ
                                </button>
                            )}
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
                                التسويات النشطة ({activeSettlements.length})
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${activeTab === 'deleted' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                التسويات المحذوفة ({deletedSettlements.length})
                            </button>
                        </div>

                        <SpatialCard title={`التسويات (${displaySettlements.length})`} icon={<RefreshCw className="w-4 h-4" />}>
                            {displaySettlements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                                    <span className="text-4xl">🔄</span>
                                    <span className="font-bold">{activeTab === 'active' ? 'لا توجد تسويات' : 'لا توجد تسويات محذوفة'}</span>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['#', 'العميل', 'الفاتورة', 'وسيلة التسوية', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {displaySettlements.map(s => (
                                                    <tr key={s.id} className={`hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${s.deleted_at ? 'opacity-50' : ''}`}>
                                                        <td className="px-4 py-3 font-bold text-slate-400 dark:text-white/40">#{s.id}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{s.customer?.name ?? '—'}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/60">
                                                            {s.invoice ? <Link href={`/invoices/${s.invoice.id}`} className="hover:text-primary transition-colors">#{s.invoice.id}</Link> : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{s.payment_method.name}</td>
                                                        <td className="px-4 py-3 font-black text-purple-500 whitespace-nowrap">{fmt(s.amount)}</td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{s.notes ?? '—'}</td>
                                                        <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">{fmtDate(s.created_at)}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Link href={`/settlements/${s.id}`}
                                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                    <Eye className="w-3 h-3" /> عرض
                                                                </Link>
                                                                {s.deleted_at ? (
                                                                    <RestoreModal
                                                                        title="استعادة التسوية"
                                                                        description="هل أنت متأكد من استعادة هذه التسوية؟"
                                                                        onConfirm={() => router.post(`/settlements/${s.id}/restore`, {}, { preserveScroll: true })}
                                                                        trigger={<button className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs"><RotateCcw className="w-3 h-3" /> استعادة</button>}
                                                                    />
                                                                ) : (
                                                                    <DeleteModal onConfirm={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
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
                                        {displaySettlements.map(s => (
                                            <div key={s.id} className={`rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden ${s.deleted_at ? 'opacity-60' : ''}`}>
                                                <div className="px-5 py-4 bg-black/3 dark:bg-white/6">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-slate-800 dark:text-white">{s.customer?.name ?? '—'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{s.id}</span>
                                                        {s.deleted_at && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">محذوف</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                                    {s.invoice && (
                                                        <div className="flex items-center justify-between py-3">
                                                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">الفاتورة</span>
                                                            <Link href={`/invoices/${s.invoice.id}`} className="font-bold text-primary hover:underline">#{s.invoice.id}</Link>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">المبلغ</span>
                                                        <span className="font-black text-purple-500">{fmt(s.amount)}</span>
                                                    </div>
                                                    {s.notes && (
                                                        <div className="flex items-center justify-between py-3">
                                                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                            <span className="font-bold text-slate-500 dark:text-white/60 text-sm">{s.notes}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">طريقة التسوية</span>
                                                        <span className="font-bold text-slate-600 dark:text-white/70">{s.payment_method.name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-3">
                                                        <span className="text-sm font-bold text-slate-400 dark:text-white/40">التاريخ</span>
                                                        <span className="font-bold text-slate-500 dark:text-white/60">{fmtDate(s.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                                    <Link href={`/settlements/${s.id}`}
                                                        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                        <Eye className="w-4 h-4" /> عرض
                                                    </Link>
                                                    {s.deleted_at ? (
                                                        <RestoreModal
                                                            title="استعادة التسوية"
                                                            description="هل أنت متأكد من استعادة هذه التسوية؟"
                                                            onConfirm={() => router.post(`/settlements/${s.id}/restore`, {}, { preserveScroll: true })}
                                                            trigger={<button className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm"><RotateCcw className="w-4 h-4" /> استعادة</button>}
                                                        />
                                                    ) : (
                                                        <button onClick={() => router.delete(`/settlements/${s.id}`, { preserveScroll: true })}
                                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-4 h-4" /> حذف
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {settlements.last_page > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
                                            {settlements.links.map((link, i) => (
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
    );
}
