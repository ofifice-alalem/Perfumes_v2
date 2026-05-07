import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowRight, RefreshCw } from 'lucide-react';

interface Customer { id: number; name: string; phone: string | null; total_debt: string; }
interface Invoice { id: number; total: string; payment_status: string; }
interface InvoiceReturn { id: number; total: string; }
interface PaymentMethod { id: number; name: string; }
interface User { id: number; name: string; }
interface Settlement {
    id: number;
    customer: Customer | null;
    invoice: Invoice | null;
    invoice_return: InvoiceReturn | null;
    payment_method: PaymentMethod;
    user: User | null;
    amount: string;
    notes: string | null;
    created_at: string;
}
interface Props {
    settlement: Settlement;
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

export default function SettlementsShow({ settlement, flash }: Props) {
    return (
        <AppShell pageTitle={`تسوية #${settlement.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/settlements"
                        className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تسوية #{settlement.id}</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">{settlement.customer?.name ?? 'زبون نقدي'}</p>
                    </div>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'المبلغ',       value: fmt(settlement.amount),                    color: 'text-purple-500' },
                        { label: 'وسيلة التسوية',   value: settlement.payment_method.name,            color: 'text-slate-800 dark:text-white' },
                        { label: 'الموظف',       value: settlement.user?.name ?? '—',              color: 'text-slate-800 dark:text-white' },
                        { label: 'التاريخ',       value: fmtDate(settlement.created_at),            color: 'text-slate-800 dark:text-white' },
                    ].map(s => (
                        <div key={s.label} className="spatial-card p-4 flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{s.label}</span>
                            <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* Customer info */}
                {settlement.customer && (
                    <SpatialCard title="بيانات العميل" icon={<RefreshCw className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">الاسم</p>
                                <Link href={`/customers/${settlement.customer.id}`} className="font-black text-slate-800 dark:text-white hover:text-primary transition-colors">
                                    {settlement.customer.name}
                                </Link>
                            </div>
                            {settlement.customer.phone && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">الهاتف</p>
                                    <p className="font-bold text-slate-700 dark:text-white/80">{settlement.customer.phone}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">إجمالي الدين</p>
                                <p className={`font-black text-lg ${parseFloat(settlement.customer.total_debt) > 0 ? 'text-amber-500' : parseFloat(settlement.customer.total_debt) < 0 ? 'text-purple-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {fmt(settlement.customer.total_debt)}
                                </p>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Reference: invoice return or invoice */}
                {settlement.invoice_return ? (
                    <SpatialCard title="المرتجع المرتبط" icon={<RefreshCw className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">رقم المرتجع</p>
                                <Link href={`/invoice-returns/${settlement.invoice_return.id}`} className="font-black text-orange-500 hover:underline text-lg">
                                    #{settlement.invoice_return.id}
                                </Link>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">إجمالي المرتجع</p>
                                <p className="font-black text-slate-800 dark:text-white text-lg">{fmt(settlement.invoice_return.total)}</p>
                            </div>
                        </div>
                    </SpatialCard>
                ) : settlement.invoice ? (
                    <SpatialCard title="الفاتورة المرتبطة" icon={<RefreshCw className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">رقم الفاتورة</p>
                                <Link href={`/invoices/${settlement.invoice.id}`} className="font-black text-primary hover:underline text-lg">
                                    #{settlement.invoice.id}
                                </Link>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">إجمالي الفاتورة</p>
                                <p className="font-black text-slate-800 dark:text-white text-lg">{fmt(settlement.invoice.total)}</p>
                            </div>
                        </div>
                    </SpatialCard>
                ) : (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40">تسوية مستقلة — غير مرتبطة بفاتورة أو مرتجع محدد</p>
                    </div>
                )}

                {/* Notes */}
                {settlement.notes && (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ملاحظات</p>
                        <p className="font-bold text-slate-700 dark:text-white/80">{settlement.notes}</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
