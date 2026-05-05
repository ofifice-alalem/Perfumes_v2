import { Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Plus, RotateCcw, Eye, Trash2 } from 'lucide-react';

interface Supplier { id: number; name: string; }
interface PurchaseReturn {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    total: string;
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
    settlement: { id: number; amount: string } | null;
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

function fmt(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchaseReturnsIndex({ returns: data, suppliers, flash }: Props) {
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

                <SpatialCard title={`المرتجعات (${data.total})`} icon={<RotateCcw className="w-4 h-4" />}>
                    {data.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">↩️</span>
                            <span className="font-bold">لا توجد مرتجعات بعد</span>
                        </div>
                    ) : (
                        <>
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['#', 'المورد', 'الفاتورة', 'الإجمالي', 'تسوية', 'الحالة', 'التاريخ', ''].map(h => (
                                                <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {data.data.map(r => (
                                            <tr key={r.id} className={`hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${r.deleted_at ? 'opacity-50' : ''}`}>
                                                <td className="px-4 py-3 font-bold text-slate-400 dark:text-white/40">#{r.id}</td>
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{r.supplier.name}</td>
                                                <td className="px-4 py-3">
                                                    {r.purchase ? (
                                                        <Link href={`/purchases/${r.purchase.id}`} className="text-primary font-bold hover:underline">#{r.purchase.id}</Link>
                                                    ) : <span className="text-slate-400 dark:text-white/30 font-bold">مستقل</span>}
                                                </td>
                                                <td className="px-4 py-3 font-black text-orange-500">{fmt(r.total)}</td>
                                                <td className="px-4 py-3">
                                                    {r.settlement ? (
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-purple-500/10 text-purple-500">✓ {fmt(r.settlement.amount)}</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-400 dark:text-white/30">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.deleted_at ? (
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-red-500/10 text-red-500">ملغي</span>
                                                    ) : (
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">نشط</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 dark:text-white/40 font-bold text-xs whitespace-nowrap">
                                                    {new Date(r.created_at).toLocaleDateString('en-GB')}
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
                                                            <DeleteModal
                                                                title="إلغاء المرتجع"
                                                                description="سيتم إلغاء المرتجع واستعادة المخزون وإلغاء التسوية المرتبطة."
                                                                onConfirm={() => router.delete(`/purchase-returns/${r.id}`)}
                                                                trigger={
                                                                    <button className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                        <Trash2 className="w-3 h-3" /> إلغاء
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

                            {/* Mobile */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {data.data.map(r => (
                                    <div key={r.id} className={`rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden ${r.deleted_at ? 'opacity-60' : ''}`}>
                                        <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                            <div>
                                                <span className="font-black text-slate-800 dark:text-white">{r.supplier.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{r.id}</span>
                                                    {r.deleted_at
                                                        ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">ملغي</span>
                                                        : r.settlement && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">تسوية</span>
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
                                                <DeleteModal
                                                    title="إلغاء المرتجع"
                                                    description="سيتم إلغاء المرتجع واستعادة المخزون."
                                                    onConfirm={() => router.delete(`/purchase-returns/${r.id}`)}
                                                    wrapperClassName="flex-1"
                                                    trigger={
                                                        <button className="w-full flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                            <Trash2 className="w-4 h-4" /> إلغاء
                                                        </button>
                                                    }
                                                />
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
        </AppShell>
    );
}
