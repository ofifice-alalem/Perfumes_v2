import { useState } from 'react';
import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { Link } from '@inertiajs/react';
import { Plus, Eye, Trash2, ShoppingCart, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

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
    deleted_at: string | null;
}
interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    purchases: Paginated<Purchase>;
    suppliers: Supplier[];
    flash?: { success?: string; error?: string };
}

const statusLabel = { unpaid: 'غير مدفوع', partial: 'جزئي', paid: 'مدفوع' };
const statusClass  = {
    unpaid:  'bg-red-500/10 text-red-500',
    partial: 'bg-amber-500/10 text-amber-500',
    paid:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmt(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── Modal إلغاء الفاتورة ──────────────────────────────────────────────────────
function CancelPurchaseModal({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
    const [deletePayments, setDeletePayments] = useState(false);
    const paidAmount = parseFloat(purchase.paid_amount);
    const hasPayments = paidAmount > 0;

    function confirm() {
        router.delete(`/purchases/${purchase.id}`, {
            data: { delete_payments: deletePayments },
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

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-red-500/12 border border-red-500/15 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">إلغاء فاتورة الشراء</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">
                        سيتم إلغاء الفاتورة واسترداد المخزون وإلغاء التسويات المرتبطة بها.
                    </p>
                </div>

                {/* خيار الدفعات — يظهر فقط إذا كان هناك دفعات */}
                {hasPayments && (
                    <div className="flex flex-col gap-3 p-4 rounded-[18px] bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600 dark:text-white/70">
                                الدفعات المرتبطة بهذه الفاتورة
                            </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                {fmt(purchase.paid_amount)}
                            </span>
                        </div>

                        <div className="h-px bg-black/8 dark:bg-white/8" />

                        {/* خيار نعم */}
                        <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setDeletePayments(true)}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${deletePayments ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-white/30 group-hover:border-red-400'}`}>
                                {deletePayments && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 dark:text-white/80 text-sm">نعم، احذف الدفعات معها</span>
                                <span className="text-xs font-bold text-slate-400 dark:text-white/40">الفاتورة كانت خطأ في الإدخال</span>
                            </div>
                        </label>

                        {/* خيار لا */}
                        <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setDeletePayments(false)}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${!deletePayments ? 'border-primary bg-primary' : 'border-slate-300 dark:border-white/30 group-hover:border-primary/60'}`}>
                                {!deletePayments && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 dark:text-white/80 text-sm">لا، أبقِ الدفعات كدين على المورد</span>
                                <span className="text-xs font-bold text-slate-400 dark:text-white/40">المال دُفع فعلاً وسيبقى في سجل المورد</span>
                            </div>
                        </label>
                    </div>
                )}

                {/* Buttons */}
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

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────────
export default function PurchasesIndex({ purchases, suppliers, flash }: Props) {
    const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);

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
                                            <tr key={p.id} className={`hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${p.deleted_at ? 'opacity-50' : ''}`}>
                                                <td className="px-4 py-3 font-bold text-slate-400 dark:text-white/40">#{p.id}</td>
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{p.supplier.name}</td>
                                                <td className="px-4 py-3 font-black text-slate-700 dark:text-white/80 whitespace-nowrap">{fmt(p.total)}</td>
                                                <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(p.paid_amount)}</td>
                                                <td className="px-4 py-3 font-black text-amber-500 whitespace-nowrap">{fmt(p.due_amount)}</td>
                                                <td className="px-4 py-3">
                                                    {p.deleted_at ? (
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-[8px] bg-red-500/10 text-red-500">ملغي</span>
                                                    ) : (
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-[8px] ${statusClass[p.payment_status]}`}>
                                                            {statusLabel[p.payment_status]}
                                                        </span>
                                                    )}
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
                                                        {p.deleted_at ? (
                                                            <button onClick={() => router.post(`/purchases/${p.id}/restore`)}
                                                                className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs">
                                                                <RotateCcw className="w-3 h-3" /> استعادة
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => setCancelTarget(p)}
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
                                {purchases.data.map(p => (
                                    <div key={p.id} className={`rounded-[24px] border border-black/8 dark:border-white/12 overflow-hidden ${p.deleted_at ? 'opacity-60' : ''}`}>
                                        <div className="px-5 py-4 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                            <div>
                                                <span className="font-black text-slate-800 dark:text-white">{p.supplier.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">#{p.id}</span>
                                                    {p.deleted_at ? (
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">ملغي</span>
                                                    ) : (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass[p.payment_status]}`}>
                                                            {statusLabel[p.payment_status]}
                                                        </span>
                                                    )}
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
                                            {p.deleted_at ? (
                                                <button onClick={() => router.post(`/purchases/${p.id}/restore`)}
                                                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm">
                                                    <RotateCcw className="w-4 h-4" /> استعادة
                                                </button>
                                            ) : (
                                                <button onClick={() => setCancelTarget(p)}
                                                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[14px] border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
                                                    <Trash2 className="w-4 h-4" /> إلغاء
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
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

            {/* Cancel Modal */}
            {cancelTarget && (
                <CancelPurchaseModal
                    purchase={cancelTarget}
                    onClose={() => setCancelTarget(null)}
                />
            )}
        </AppShell>
    );
}
