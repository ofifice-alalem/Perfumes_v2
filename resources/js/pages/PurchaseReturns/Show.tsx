import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowRight, RotateCcw, Package } from 'lucide-react';

interface Product  { id: number; name: string; }
interface Supplier { id: number; name: string; }
interface ReturnItem {
    id: number; product: Product;
    quantity: string; unit_cost: string; line_total: string;
}
interface Settlement {
    id: number; amount: string;
    payment_method: { name: string };
    notes: string | null;
    created_at: string;
}
interface PurchaseReturn {
    id: number;
    supplier: Supplier;
    purchase: { id: number } | null;
    total: string;
    notes: string | null;
    created_at: string;
    items: ReturnItem[];
    settlement: Settlement | null;
}
interface Props {
    return: PurchaseReturn;
    flash?: { success?: string; error?: string };
}

function fmt(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchaseReturnsShow({ return: ret, flash }: Props) {
    return (
        <AppShell pageTitle={`مرتجع #${ret.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                <div className="flex items-center gap-3">
                    <Link href="/purchase-returns" className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">مرتجع #{ret.id}</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">{ret.supplier.name}</p>
                    </div>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="spatial-card p-4 flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">إجمالي المرتجع</span>
                        <span className="text-xl font-black text-orange-500">{fmt(ret.total)}</span>
                    </div>
                    <div className="spatial-card p-4 flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">المورد</span>
                        <span className="text-lg font-black text-slate-800 dark:text-white">{ret.supplier.name}</span>
                    </div>
                    <div className="spatial-card p-4 flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">الفاتورة المرجعية</span>
                        {ret.purchase ? (
                            <Link href={`/purchases/${ret.purchase.id}`} className="text-lg font-black text-primary hover:underline">#{ret.purchase.id}</Link>
                        ) : (
                            <span className="text-lg font-black text-slate-400 dark:text-white/40">مستقل</span>
                        )}
                    </div>
                </div>

                {/* Items */}
                <SpatialCard title={`المنتجات المرتجعة (${ret.items.length})`} icon={<Package className="w-4 h-4" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                    {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map(h => (
                                        <th key={h} className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {ret.items.map(item => (
                                    <tr key={item.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{item.product.name}</td>
                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{item.quantity}</td>
                                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-white/70">{fmt(item.unit_cost)}</td>
                                        <td className="px-4 py-3 font-black text-orange-500">{fmt(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SpatialCard>

                {/* Settlement */}
                {ret.settlement ? (
                    <SpatialCard title="التسوية المرتبطة" icon={<RotateCcw className="w-4 h-4" />}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">المبلغ</span>
                                <span className="font-black text-purple-500 text-lg">{fmt(ret.settlement.amount)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">وسيلة الدفع</span>
                                <span className="font-bold text-slate-700 dark:text-white/80">{ret.settlement.payment_method.name}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">ملاحظة</span>
                                <span className="font-bold text-slate-500 dark:text-white/50">{ret.settlement.notes ?? '—'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">التاريخ</span>
                                <span className="font-bold text-slate-500 dark:text-white/50 text-sm">
                                    {new Date(ret.settlement.created_at).toLocaleDateString('en-GB')}
                                </span>
                            </div>
                        </div>
                    </SpatialCard>
                ) : (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40">لا توجد تسوية مرتبطة بهذا المرتجع</p>
                    </div>
                )}

                {ret.notes && (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ملاحظات</p>
                        <p className="font-bold text-slate-700 dark:text-white/80">{ret.notes}</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
