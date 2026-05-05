import { router } from '@inertiajs/react';
import { useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Plus, RefreshCw, X, Check, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { DateFilterInput } from '@/components/ui/DateFilterInput';

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

function fmt(v: string) {
    const n = parseFloat(v);
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

    // فلتر
    const [fSupplier, setFSupplier] = useState('');
    const [fMethod,   setFMethod]   = useState('');
    const [fDateFrom, setFDateFrom] = useState('');
    const [fDateTo,   setFDateTo]   = useState('');

    const filtered = settlements.data.filter(s => {
        if (fSupplier && !s.supplier.name.toLowerCase().includes(fSupplier.toLowerCase())) return false;
        if (fMethod   && s.payment_method.name !== fMethod) return false;
        if (fDateFrom && s.created_at && s.created_at < fDateFrom) return false;
        if (fDateTo   && s.created_at && s.created_at.slice(0, 10) > fDateTo) return false;
        return true;
    });

    const hasFilter = fSupplier || fMethod || fDateFrom || fDateTo;

    function resetFilter() {
        setFSupplier(''); setFMethod(''); setFDateFrom(''); setFDateTo('');
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
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم المورد</label>
                <input value={fSupplier} onChange={e => setFSupplier(e.target.value)}
                    placeholder="بحث..." className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">وسيلة الدفع</label>
                <select value={fMethod} onChange={e => setFMethod(e.target.value)}
                    className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold">
                    <option value="">الكل</option>
                    {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
            </div>
            <DateFilterInput label="من تاريخ" value={fDateFrom} onChange={setFDateFrom} />
            <DateFilterInput label="إلى تاريخ" value={fDateTo} onChange={setFDateTo} />
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
                        <SpatialCard title={`التسويات (${filtered.length})`} icon={<RefreshCw className="w-4 h-4" />}>
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                                    <span className="text-4xl">🔄</span>
                                    <span className="font-bold">لا توجد تسويات</span>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['المورد', 'المرجع', 'وسيلة الدفع', 'المبلغ', 'ملاحظة', 'التاريخ', ''].map(h => (
                                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {filtered.map(s => (
                                                    <tr key={s.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
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
                                                                <DeleteModal
                                                                    onConfirm={() => router.delete(`/supplier-settlements/${s.id}`)}
                                                                    trigger={
                                                                        <button className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                            حذف
                                                                        </button>
                                                                    }
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
                    <div className="hidden lg:block w-[260px] shrink-0">
                        <SpatialCard title="فلترة" icon={<SlidersHorizontal className="w-4 h-4" />}>
                            <FilterPanel />
                        </SpatialCard>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
