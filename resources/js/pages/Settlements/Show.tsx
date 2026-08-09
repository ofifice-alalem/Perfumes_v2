import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowRight, RefreshCw, User, FileText } from 'lucide-react';

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
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

export default function SettlementsShow({ settlement, flash }: Props) {
    return (
        <AppShell pageTitle={`تسوية #${settlement.id}`}>
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Link href="/settlements" className="flex items-center gap-3 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] bg-black/6 dark:bg-white/8 text-slate-700 dark:text-white/80 hover:bg-black/12 dark:hover:bg-white/15 transition-all shrink-0 border-2 border-black/5 dark:border-white/10 font-black text-lg sm:text-2xl active:scale-95 shadow-md">
                        <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
                        <span>رجوع للتسويات</span>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl sm:text-5xl font-black text-slate-800 dark:text-white">تسوية #{settlement.id}</h1>
                        <p className="text-base sm:text-xl font-bold text-slate-400 dark:text-white/40 mt-1">{settlement.customer?.name ?? 'زبون نقدي'}</p>
                    </div>
                </div>

                {flash?.success && <div className="px-6 py-4 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-lg">{flash.success}</div>}
                {flash?.error   && <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-base sm:text-lg">{flash.error}</div>}

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {[
                        { label: 'المبلغ',       value: `${fmt(settlement.amount)} د.ل`,                    color: 'text-purple-500' },
                        { label: 'وسيلة التسوية',   value: settlement.payment_method.name,            color: 'text-slate-800 dark:text-white' },
                        { label: 'الموظف',       value: settlement.user?.name ?? '—',              color: 'text-slate-800 dark:text-white' },
                        { label: 'التاريخ',       value: fmtDate(settlement.created_at),            color: 'text-slate-800 dark:text-white' },
                    ].map(s => (
                        <div key={s.label} className="spatial-card p-6 flex flex-col gap-2 rounded-[28px]">
                            <span className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider">{s.label}</span>
                            <span className={`text-2xl sm:text-4xl font-black ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* Customer info */}
                {settlement.customer && (
                    <SpatialCard title="بيانات العميل" icon={<User className="w-6 h-6 text-primary" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-2">
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">اسم العميل</p>
                                <Link href={`/customers/${settlement.customer.id}`} className="font-black text-2xl sm:text-3xl text-slate-800 dark:text-white hover:text-primary transition-colors">
                                    {settlement.customer.name}
                                </Link>
                            </div>
                            {settlement.customer.phone && (
                                <div>
                                    <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">رقم الهاتف</p>
                                    <p className="font-black text-2xl sm:text-3xl text-slate-700 dark:text-white/80">{settlement.customer.phone}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">إجمالي الدين الحالي</p>
                                <p className={`font-black text-2xl sm:text-3xl ${parseFloat(settlement.customer.total_debt) > 0 ? 'text-amber-500' : parseFloat(settlement.customer.total_debt) < 0 ? 'text-purple-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {fmt(settlement.customer.total_debt)} د.ل
                                </p>
                            </div>
                        </div>
                    </SpatialCard>
                )}

                {/* Reference: invoice return or invoice */}
                {settlement.invoice_return ? (
                    <SpatialCard title="المرتجع المرتبط" icon={<RefreshCw className="w-6 h-6 text-primary" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2">
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">رقم المرتجع</p>
                                <Link href={`/invoice-returns/${settlement.invoice_return.id}`} className="font-black text-orange-500 hover:underline text-2xl sm:text-4xl">
                                    #{settlement.invoice_return.id}
                                </Link>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">إجمالي المرتجع</p>
                                <p className="font-black text-slate-800 dark:text-white text-2xl sm:text-4xl">{fmt(settlement.invoice_return.total)} د.ل</p>
                            </div>
                        </div>
                    </SpatialCard>
                ) : settlement.invoice ? (
                    <SpatialCard title="الفاتورة المرتبطة" icon={<FileText className="w-6 h-6 text-primary" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2">
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">رقم الفاتورة</p>
                                <Link href={`/invoices/${settlement.invoice.id}`} className="font-black text-primary hover:underline text-2xl sm:text-4xl">
                                    #{settlement.invoice.id}
                                </Link>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">إجمالي الفاتورة</p>
                                <p className="font-black text-slate-800 dark:text-white text-2xl sm:text-4xl">{fmt(settlement.invoice.total)} د.ل</p>
                            </div>
                        </div>
                    </SpatialCard>
                ) : (
                    <div className="px-8 py-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/5">
                        <p className="text-lg font-black text-slate-500 dark:text-white/50">تسوية مستقلة — غير مرتبطة بفاتورة أو مرتجع محدد</p>
                    </div>
                )}

                {/* Notes */}
                {settlement.notes && (
                    <div className="px-8 py-6 rounded-[28px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/5">
                        <p className="text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2">ملاحظات</p>
                        <p className="font-black text-xl sm:text-2xl text-slate-800 dark:text-white/90">{settlement.notes}</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
