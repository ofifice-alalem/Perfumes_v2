import { router } from '@inertiajs/react';
import { useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { RestoreModal } from '@/components/ui/RestoreModal';
import { Plus, RefreshCw, X, Check, SlidersHorizontal, ChevronDown, Search, Trash2, Eye, RotateCcw } from 'lucide-react';
import { DateFilterInput } from '@/components/ui/DateFilterInput';
import { AmountRangeInput } from '@/components/ui/AmountRangeInput';

interface Supplier      { id: number; name: string; total_debt: string; }
interface PaymentMethod { id: number; name: string; }
interface SupplierSettlement {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    purchase_return: { id: number } | null;
    payment_method: PaymentMethod;
    amount: string;
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
}
interface Paginated<T> {
    data: T[];
    total: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    settlements:    Paginated<SupplierSettlement>;
    suppliers:      Supplier[];
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
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB');
}

export default function SupplierSettlementsIndex({ settlements, suppliers, paymentMethods, flash }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeTab,  setActiveTab]  = useState<'active' | 'deleted'>('active');

    const activeSettlements  = settlements.data.filter(s => !s.deleted_at);
    const deletedSettlements = settlements.data.filter(s => s.deleted_at);
    const displaySettlements = activeTab === 'active' ? activeSettlements : deletedSettlements;

    // قراءة الفلاتر الحالية من URL
    const params = new URLSearchParams(window.location.search);
    const [fSupplier,   setFSupplier]   = useState(params.get('filter[supplier_id]') ?? '');
    const [fMethod,     setFMethod]     = useState(params.get('filter[payment_method_id]') ?? '');
    const [fDateFrom,   setFDateFrom]   = useState(params.get('filter[date_from]') ?? '');
    const [fDateTo,     setFDateTo]     = useState(params.get('filter[date_to]') ?? '');
    const [fAmountFrom, setFAmountFrom] = useState(params.get('filter[amount_from]') ?? '');
    const [fAmountTo,   setFAmountTo]   = useState(params.get('filter[amount_to]') ?? '');

    const hasFilter = fSupplier || fMethod || fDateFrom || fDateTo || fAmountFrom || fAmountTo;

    function applyFilter() {
        const f: Record<string, string> = {};
        if (fSupplier)   f['filter[supplier_id]']       = fSupplier;
        if (fMethod)     f['filter[payment_method_id]'] = fMethod;
        if (fDateFrom)   f['filter[date_from]']         = fDateFrom;
        if (fDateTo)     f['filter[date_to]']           = fDateTo;
        if (fAmountFrom) f['filter[amount_from]']       = fAmountFrom;
        if (fAmountTo)   f['filter[amount_to]']         = fAmountTo;
        router.get('/supplier-settlements', f, { preserveScroll: true });
    }

    function resetFilter() {
        setFSupplier(''); setFMethod('');
        setFDateFrom(''); setFDateTo(''); setFAmountFrom(''); setFAmountTo('');
        router.get('/supplier-settlements', {}, { preserveScroll: true });
    }

    // نموذج الإنشاء
    const form = useForm({
        supplier_id: '', purchase_id: '', payment_method_id: '', amount: '', notes: '',
    });

    const supplierOptions      = suppliers.map(s => ({ label: s.name, meta: fmt(s.total_debt) }));
    const paymentMethodOptions = paymentMethods.map(m => ({ label: m.name }));

    function resolveSupplierIdFromLabel(label: string) {
        return String(suppliers.find(s => s.name === label)?.id ?? '');
    }
    function resolveMethodIdFromLabel(label: string) {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    const selectedSupplier = suppliers.find(s => String(s.id) === form.data.supplier_id);
    const canSettle = selectedSupplier ? parseFloat(selectedSupplier.total_debt) < 0 : false;

    function submit() {
        form.post('/supplier-settlements', {
            onSuccess: () => { form.reset(); setShowCreate(false); },
        });
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">

            {/* المورد */}
            <ModernSelect
                label="المورد"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...suppliers.map(s => ({ label: s.name }))]}
                defaultValue={fSupplier ? (suppliers.find(s => String(s.id) === fSupplier)?.name ?? '') : 'الكل'}
                onSelect={val => setFSupplier(val === 'الكل' ? '' : String(suppliers.find(s => s.name === val)?.id ?? ''))}
            />

            {/* وسيلة الدفع */}
            <ModernSelect
                label="وسيلة الدفع"
                placeholder="الكل"
                options={[{ label: 'الكل' }, ...paymentMethods.map(m => ({ label: m.name }))]}
                defaultValue={fMethod ? (paymentMethods.find(m => String(m.id) === fMethod)?.name ?? '') : 'الكل'}
                onSelect={val => setFMethod(val === 'الكل' ? '' : String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
            />

            <AmountRangeInput
                label="المبلغ (من — إلى)"
                valueFrom={fAmountFrom}
                valueTo={fAmountTo}
                onChange={(from, to) => { setFAmountFrom(from); setFAmountTo(to); }}
            />

            {/* التاريخ */}
            <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={fDateTo}   onChange={setFDateTo} />

            {/* أزرار */}
            <button onClick={applyFilter}
                className="w-full h-11 rounded-[14px] bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> تطبيق الفلتر
            </button>
            {hasFilter && (
                <button onClick={resetFilter}
                    className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="تسويات الموردين">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تسويات الموردين</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">تسجيل التسويات عندما يكون المورد دائناً</p>
                    </div>
                    <button onClick={() => setShowCreate(p => !p)}
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> تسوية جديدة
                    </button>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* نموذج الإنشاء */}
                {showCreate && (
                    <SpatialCard title="تسوية جديدة" icon={<Plus className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <ModernSelect
                                    label="المورد"
                                    options={supplierOptions}
                                    defaultValue={selectedSupplier?.name ?? ''}
                                    onSelect={val => form.setData('supplier_id', resolveSupplierIdFromLabel(val))}
                                />
                                {form.errors.supplier_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.supplier_id}</p>}
                            </div>

                            {selectedSupplier && !canSettle && (
                                <div className="sm:col-span-2 lg:col-span-2 px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-center">
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                        ⚠️ لا يمكن إنشاء تسوية — المورد لا يزال مديناً ({fmt(selectedSupplier.total_debt)})
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

                {/* Mobile Filter */}
                <div className="lg:hidden">
                    <button onClick={() => setFilterOpen(p => !p)}
                        className="w-full flex items-center justify-between px-5 h-12 rounded-[18px] spatial-input font-bold text-[14px] text-slate-700 dark:text-white/70">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" />
                            فلترة
                            {hasFilter && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && (
                        <div className="mt-3 spatial-card p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <FilterPanel />
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    <div className="flex-1 min-w-0">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setActiveTab('active')} className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                النشطة ({activeSettlements.length})
                            </button>
                            <button onClick={() => setActiveTab('deleted')} className={`px-5 h-11 rounded-[14px] font-bold text-sm transition-all ${activeTab === 'deleted' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}>
                                الملغية ({deletedSettlements.length})
                            </button>
                        </div>

                        <SpatialCard title={`التسويات (${displaySettlements.length})`} icon={<RefreshCw className="w-4 h-4" />}>
                            {displaySettlements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                                    <span className="text-4xl">🔄</span>
                                    <span className="font-bold">{activeTab === 'active' ? 'لا توجد تسويات' : 'لا توجد تسويات ملغية'}</span>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['المورد', 'المرجع', 'وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {displaySettlements.map(s => (
                                                    <tr key={s.id} className={`hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${s.deleted_at ? 'opacity-50' : ''}`}>
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                                                            <Link href={`/supplier-settlements/${s.id}`} className="hover:text-primary transition-colors">{s.supplier.name}</Link>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {s.purchase_return ? (
                                                                <Link href={`/purchase-returns/${s.purchase_return.id}`} className="text-orange-500 font-bold hover:underline">مرتجع #{s.purchase_return.id}</Link>
                                                            ) : s.purchase ? (
                                                                <Link href={`/purchases/${s.purchase.id}`} className="text-primary font-bold hover:underline">فاتورة #{s.purchase.id}</Link>
                                                            ) : <span className="text-slate-400 dark:text-white/30 font-bold">مستقلة</span>}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{s.payment_method.name}</td>
                                                        <td className="px-4 py-3 font-black text-purple-500">{fmt(s.amount)}</td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-bold">{s.notes ?? '—'}</td>
                                                        <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">{fmtDate(s.created_at)}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Link href={`/supplier-settlements/${s.id}`}
                                                                    className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                    عرض
                                                                </Link>
                                                                {s.deleted_at ? (
                                                                    <RestoreModal
                                                                        title="استعادة التسوية"
                                                                        description="هل أنت متأكد من استعادة هذه التسوية؟"
                                                                        onConfirm={() => router.post(`/supplier-settlements/${s.id}/restore`, {}, { preserveScroll: true })}
                                                                        trigger={<button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs"><RotateCcw className="w-3 h-3" /> استعادة</button>}
                                                                    />
                                                                ) : (
                                                                    <DeleteModal
                                                                        onConfirm={() => router.delete(`/supplier-settlements/${s.id}`)}
                                                                        trigger={
                                                                            <button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                                حذف
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
                                        {displaySettlements.map(s => (
                                            <div key={s.id} className={`rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden ${s.deleted_at ? 'opacity-60' : ''}`}>
                                                <div className="px-5 py-4 bg-black/3 dark:bg-white/6">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-slate-800 dark:text-white">{s.supplier.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{s.id}</span>
                                                        {s.deleted_at && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">ملغي</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                                    {s.purchase_return ? (
                                                        <div className="flex items-center justify-between py-3">
                                                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">المرجع</span>
                                                            <Link href={`/purchase-returns/${s.purchase_return.id}`} className="font-bold text-orange-500 hover:underline">مرتجع #{s.purchase_return.id}</Link>
                                                        </div>
                                                    ) : s.purchase ? (
                                                        <div className="flex items-center justify-between py-3">
                                                            <span className="text-sm font-bold text-slate-400 dark:text-white/40">الفاتورة</span>
                                                            <Link href={`/purchases/${s.purchase.id}`} className="font-bold text-primary hover:underline">فاتورة #{s.purchase.id}</Link>
                                                        </div>
                                                    ) : null}
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
                                                    <Link href={`/supplier-settlements/${s.id}`}
                                                        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                        <Eye className="w-4 h-4" /> عرض
                                                    </Link>
                                                    {s.deleted_at ? (
                                                        <RestoreModal
                                                            title="استعادة التسوية"
                                                            description="هل أنت متأكد من استعادة هذه التسوية؟"
                                                            onConfirm={() => router.post(`/supplier-settlements/${s.id}/restore`, {}, { preserveScroll: true })}
                                                            trigger={<button className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm"><RotateCcw className="w-4 h-4" /> استعادة</button>}
                                                        />
                                                    ) : (
                                                        <button onClick={() => router.delete(`/supplier-settlements/${s.id}`)}
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
                                                        className={`px-4 h-9 rounded-[12px] font-bold text-sm flex items-center transition-all ${link.active ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10'}`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                ) : (
                                                    <span key={i} className="px-4 h-9 rounded-[12px] font-bold text-sm flex items-center text-slate-300 dark:text-white/20"
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                )
                                            ))}
                                        </div>
                                    )}
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
        </AppShell>
    );
}
