import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { DeleteModal } from '@/components/ui/DeleteModal';
import { Link } from '@inertiajs/react';
import { Plus, Eye, Trash2, ShoppingCart } from 'lucide-react';

interface Supplier { id: number; name: string; }
interface Purchase {
    id: number;
    supplier: Supplier;
    total: string;
    paid_amount: string;
    due_amount: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes: string | null;
    created_at: string;
}
interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    purchases: Paginated<Purchase>;
    suppliers: Supplier[];
    flash?: { success?: string; error?: string };
}

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function PurchasesIndex({ purchases, suppliers, flash }: Props) {
    return (
        <AppShell pageTitle="المشتريات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">فواتير الشراء</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إدارة مشتريات الموردين والمخزون</p>
                    </div>
                    <Link href="/purchases/create"
                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 text-sm">
                        <Plus className="w-4 h-4" /> فاتورة شراء جديدة
                    </Link>
                </div>

                {flash?.success && (
                    <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                <SpatialCard title={`الفواتير (${purchases.total})`} icon={<ShoppingCart className="w-4 h-4" />}>
                    {purchases.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
                            <span className="text-4xl">🛒</span>
                            <span className="font-bold">لا توجد فواتير شراء بعد</span>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            {['#', 'المورد', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {purchases.data.map(p => (
                                            <tr key={p.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-400 dark:text-white/40">#{p.id}</td>
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{p.supplier.name}</td>
                                                <td className="px-4 py-3 font-black text-slate-700 dark:text-white/80 whitespace-nowrap">{fmt(p.total)}</td>
                                                <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(p.paid_amount)}</td>
                                                <td className="px-4 py-3 font-black text-amber-500 whitespace-nowrap">{fmt(p.due_amount)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] ${statusClass[p.payment_status]}`}>
                                                        {statusLabel[p.payment_status]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-white/50 whitespace-nowrap font-bold text-xs">
                                                    {new Date(p.created_at).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/purchases/${p.id}`}
                                                            className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-xs">
                                                            <Eye className="w-3 h-3" /> عرض
                                                        </Link>
                                                        <DeleteModal
                                                            title="حذف فاتورة الشراء"
                                                            description="سيتم استعادة المخزون وحذف جميع بيانات الفاتورة. لا يمكن التراجع."
                                                            onConfirm={() => router.delete(`/purchases/${p.id}`)}
                                                            trigger={
                                                                <button className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs">
                                                                    <Trash2 className="w-3 h-3" /> حذف
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

                            {/* Mobile Cards */}
                            <div className="flex flex-col gap-4 lg:hidden">
                                {purchases.data.map(p => (
                                    <div key={p.id} className="rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden">
                                        <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                            <div>
                                                <span className="font-black text-slate-800 dark:text-white">{p.supplier.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{p.id}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass[p.payment_status]}`}>
                                                        {statusLabel[p.payment_status]}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-black text-lg text-slate-800 dark:text-white">{fmt(p.total)}</span>
                                        </div>
                                        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/8 px-5">
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-sm font-bold text-slate-400 dark:text-white/40">المدفوع</span>
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">{fmt(p.paid_amount)}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-sm font-bold text-slate-400 dark:text-white/40">المتبقي</span>
                                                <span className="font-black text-amber-500">{fmt(p.due_amount)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 px-5 py-4 border-t border-black/5 dark:border-white/8">
                                            <Link href={`/purchases/${p.id}`}
                                                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm">
                                                <Eye className="w-4 h-4" /> عرض
                                            </Link>
                                            <DeleteModal
                                                title="حذف فاتورة الشراء"
                                                description="سيتم استعادة المخزون وحذف جميع بيانات الفاتورة."
                                                onConfirm={() => router.delete(`/purchases/${p.id}`)}
                                                wrapperClassName="flex-1"
                                                trigger={
                                                    <button className="w-full flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                        <Trash2 className="w-4 h-4" /> حذف
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {purchases.last_page > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
                                    {purchases.links.map((link, i) => (
                                        link.url ? (
                                            <Link key={i} href={link.url}
                                                className={`px-4 h-9 rounded-[12px] font-bold text-sm flex items-center transition-all ${link.active ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/8 text-slate-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/12'}`}
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
