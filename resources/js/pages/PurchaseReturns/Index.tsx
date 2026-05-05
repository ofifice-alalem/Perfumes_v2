import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { Plus, RotateCcw, Eye, Trash2, AlertTriangle, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Supplier { id: number; name: string; }
interface PurchaseReturn {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    total: string;
    recovered_amount: string;
    recovery_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
    settlements_total: string | null;
}
interface Paginated<T> {
    data: T[];
    total: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    returns:   Paginated<PurchaseReturn>;
    suppliers: Supplier[];
    flash?: { success?: string; error?: string };
}

const recoveryLabel = { unpaid: 'لم يُسترد', partial: 'جزئي', paid: 'مسترد' };
const recoveryClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB');
}

function RadioGroup({ value, onChange, yesLabel, yesDesc, noLabel, noDesc }: {
    value: boolean; onChange: (v: boolean) => void;
    yesLabel: string; yesDesc: string; noLabel: string; noDesc: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer group" onClick={() => onChange(true)}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${value ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-white/30 group-hover:border-red-400'}`}>
                    {value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-white/80 text-sm">{yesLabel}</span>
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{yesDesc}</span>
                </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group" onClick={() => onChange(false)}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${!value ? 'border-primary bg-primary' : 'border-slate-300 dark:border-white/30 group-hover:border-primary/60'}`}>
                    {!value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 dark:text-white/80 text-sm">{noLabel}</span>
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{noDesc}</span>
                </div>
            </label>
        </div>
    );
}

function CancelReturnModal({ ret, onClose }: { ret: PurchaseReturn; onClose: () => void }) {
    const [deleteSettlements, setDeleteSettlements] = useState(false);

    const isCash           = ret.supplier.id === 1;
    const settlementsTotal = parseFloat(ret.settlements_total ?? '0');
    const hasSettlements   = !isCash && settlementsTotal > 0;

    function confirm() {
        router.delete(`/purchase-returns/${ret.id}`, {
            data: { delete_settlements: isCash ? true : deleteSettlements },
            onSuccess: onClose,
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-md rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200
                border border-black/10 dark:border-white/[0.12]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.45)_0%,rgba(20,25,55,0.35)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/50">

                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-red-500/12 border border-red-500/15 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">إلغاء المرتجع</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        سيتم إلغاء المرتجع واستعادة المخزون.
                    </p>
                </div>

                {hasSettlements && (
                    <div className="flex flex-col gap-3 p-4 rounded-[18px] bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-slate-600 dark:text-white/70">التسويات المرتبطة بهذا المرتجع</span>
                            <span className="font-black text-purple-500 text-sm">{fmt(String(settlementsTotal))}</span>
                        </div>
                        <div className="h-px bg-black/8 dark:bg-white/8" />
                        <RadioGroup
                            value={deleteSettlements} onChange={setDeleteSettlements}
                            yesLabel="نعم، احذف التسويات معه" yesDesc="المبلغ لم يُسترد فعلاً"
                            noLabel="لا، أبقِ التسويات كرصيد مستقل" noDesc="المبلغ استُرد فعلاً وسيبقى في سجل المورد"
                        />
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button onClick={onClose}
                        className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10">
                        إلغاء
                    </button>
                    <button onClick={confirm}
                        className="flex-1 h-11 rounded-[14px] bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-500/30">
                        <Trash2 className="w-4 h-4" /> تأكيد الإلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function PurchaseReturnsIndex({ returns: data, suppliers, flash }: Props) {
    const [cancelTarget, setCancelTarget] = useState<PurchaseReturn | null>(null);
    const [filterOpen,   setFilterOpen]   = useState(false);

    const [fSupplier, setFSupplier] = useState('');
    const [fStatus,   setFStatus]   = useState('');
    const [fDateFrom, setFDateFrom] = useState('');
    const [fDateTo,   setFDateTo]   = useState('');

    const filtered = data.data.filter(r => {
        if (fSupplier && !r.supplier.name.toLowerCase().includes(fSupplier.toLowerCase())) return false;
        if (fStatus   && r.recovery_status !== fStatus) return false;
        if (fDateFrom && r.created_at && r.created_at < fDateFrom) return false;
        if (fDateTo   && r.created_at && r.created_at.slice(0, 10) > fDateTo) return false;
        return true;
    });

    const hasFilter = fSupplier || fStatus || fDateFrom || fDateTo;

    function resetFilter() {
        setFSupplier(''); setFStatus(''); setFDateFrom(''); setFDateTo('');
    }

    const FilterPanel = () => (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">اسم المورد</label>
                <input value={fSupplier} onChange={e => setFSupplier(e.target.value)}
                    placeholder="بحث..." className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold" />
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">حالة الاسترداد</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                    className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold">
                    <option value="">الكل</option>
                    <option value="unpaid">لم يُسترد</option>
                    <option value="partial">جزئي</option>
                    <option value="paid">مسترد</option>
                </select>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">من تاريخ</label>
                <div className="relative">
                    <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)}
                        className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold w-full" />
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">إلى تاريخ</label>
                <div className="relative">
                    <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)}
                        className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold w-full" />
                </div>
            </div>
            {hasFilter && (
                <button onClick={resetFilter}
                    className="w-full h-10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    إعادة تعيين
                </button>
            )}
        </div>
    );

    return (
        <AppShell pageTitle="المرتجعات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">مرتجعات الموردين</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">سجل إرجاع البضاعة للموردين</p>
                    </div>
                    <Link href="/purchase-returns/create"
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> مرتجع جديد
                    </Link>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

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
                        <SpatialCard title={`المرتجعات (${filtered.length})`} icon={<RotateCcw className="w-4 h-4" />}>
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                                    <span className="text-4xl">↩️</span>
                                    <span className="font-bold">لا توجد مرتجعات</span>
                                </div>
                            ) : (
                                <>
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                                    {['#', 'المورد', 'الفاتورة', 'الإجمالي', 'المسترد', 'الحالة', 'التاريخ', ''].map(h => (
                                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {filtered.map(r => (
                                                    <tr key={r.id} className={`hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${r.deleted_at ? 'opacity-50' : ''}`}>
                                                        <td className="px-4 py-3 font-bold text-slate-400 dark:text-white/40">#{r.id}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{r.supplier.name}</td>
                                                        <td className="px-4 py-3">
                                                            {r.purchase
                                                                ? <Link href={`/purchases/${r.purchase.id}`} className="text-primary font-bold hover:underline">#{r.purchase.id}</Link>
                                                                : <span className="text-slate-400 dark:text-white/30 font-bold">مستقل</span>}
                                                        </td>
                                                        <td className="px-4 py-3 font-black text-orange-500">{fmt(r.total)}</td>
                                                        <td className="px-4 py-3 font-black text-purple-500">{fmt(r.recovered_amount)}</td>
                                                        <td className="px-4 py-3">
                                                            {r.deleted_at ? (
                                                                <span className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-red-500/10 text-red-500">ملغي</span>
                                                            ) : (
                                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] ${recoveryClass[r.recovery_status]}`}>
                                                                    {recoveryLabel[r.recovery_status]}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">
                                                            {fmtDate(r.created_at)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Link href={`/purchase-returns/${r.id}`}
                                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                                    <Eye className="w-3 h-3" /> عرض
                                                                </Link>
                                                                {r.deleted_at ? (
                                                                    <button onClick={() => router.post(`/purchase-returns/${r.id}/restore`)}
                                                                        className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs">
                                                                        <RotateCcw className="w-3 h-3" /> استعادة
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => setCancelTarget(r)}
                                                                        className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                        <Trash2 className="w-3 h-3" /> إلغاء
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
                                        {filtered.map(r => (
                                            <div key={r.id} className={`rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden ${r.deleted_at ? 'opacity-60' : ''}`}>
                                                <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-black text-slate-800 dark:text-white">{r.supplier.name}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{r.id}</span>
                                                            {r.deleted_at
                                                                ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">ملغي</span>
                                                                : <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${recoveryClass[r.recovery_status]}`}>{recoveryLabel[r.recovery_status]}</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-lg text-orange-500">{fmt(r.total)}</span>
                                                </div>
                                                <div className="flex items-center gap-3 px-5 py-4">
                                                    <Link href={`/purchase-returns/${r.id}`}
                                                        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                        <Eye className="w-4 h-4" /> عرض
                                                    </Link>
                                                    {r.deleted_at ? (
                                                        <button onClick={() => router.post(`/purchase-returns/${r.id}/restore`)}
                                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                                            <RotateCcw className="w-4 h-4" /> استعادة
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setCancelTarget(r)}
                                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-4 h-4" /> إلغاء
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {data.last_page > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
                                            {data.links.map((link, i) => (
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

            {cancelTarget && (
                <CancelReturnModal ret={cancelTarget} onClose={() => setCancelTarget(null)} />
            )}
        </AppShell>
    );
}
