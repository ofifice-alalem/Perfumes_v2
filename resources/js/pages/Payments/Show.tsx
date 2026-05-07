import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowRight, CreditCard } from 'lucide-react';

interface Customer { id: number; name: string; phone: string | null; total_debt: string; }
interface Invoice { id: number; total: string; payment_status: string; }
interface PaymentMethod { id: number; name: string; }
interface User { id: number; name: string; }
interface Payment {
    id: number;
    customer: Customer | null;
    invoice: Invoice | null;
    payment_method: PaymentMethod;
    user: User | null;
    amount: string;
    notes: string | null;
    created_at: string;
}
interface Props {
    payment: Payment;
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

export default function PaymentsShow({ payment, flash }: Props) {
    return (
        <AppShell pageTitle={`دفعة #${payment.id}`}>
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/payments"
                        className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">دفعة #{payment.id}</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">{payment.customer?.name ?? 'زبون نقدي'}</p>
                    </div>
                </div>

                {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
                {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'المبلغ',       value: fmt(payment.amount),                    color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'وسيلة الدفع',   value: payment.payment_method.name,            color: 'text-slate-800 dark:text-white' },
                        { label: 'الموظف',       value: payment.user?.name ?? '—',              color: 'text-slate-800 dark:text-white' },
                        { label: 'التاريخ',       value: fmtDate(payment.created_at),            color: 'text-slate-800 dark:text-white' },
                    ].map(s => (
                        <div key={s.label} className="spatial-card p-4 flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{s.label}</span>
                            <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* Customer info */}
                {payment.customer && (
                    <SpatialCard title="بيانات العميل" icon={<CreditCard className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">الاسم</p>
                                <Link href={`/customers/${payment.customer.id}`} className="font-black text-slate-800 dark:text-white hover:text-primary transition-colors">
                                    {payment.customer.name}
                                </Link>
                            </div>
                            {payment.customer.phone && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">الهاتف</p>
                                    <p className="font-bold text-slate-700 dark:text-white/80">{payment.customer.phone}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">إجمالي الدين</p>
                                <p className={`font-black text-lg ${parseFloat(payment.customer.total_debt) > 0 ? 'text-amber-500' : parseFloat(payment.customer.total_debt) < 0 ? 'text-purple-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {fmt(payment.customer.total_debt)}
                                </p>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Invoice reference */}
                {payment.invoice ? (
                    <SpatialCard title="الفاتورة المرتبطة" icon={<CreditCard className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">رقم الفاتورة</p>
                                <Link href={`/invoices/${payment.invoice.id}`} className="font-black text-primary hover:underline text-lg">
                                    #{payment.invoice.id}
                                </Link>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">إجمالي الفاتورة</p>
                                <p className="font-black text-slate-800 dark:text-white text-lg">{fmt(payment.invoice.total)}</p>
                            </div>
                        </div>
                    </SpatialCard>
                ) : (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40">دفعة مستقلة — غير مرتبطة بفاتورة محددة</p>
                    </div>
                )}

                {/* Notes */}
                {payment.notes && (
                    <div className="px-5 py-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ملاحظات</p>
                        <p className="font-bold text-slate-700 dark:text-white/80">{payment.notes}</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
