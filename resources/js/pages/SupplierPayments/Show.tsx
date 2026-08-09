import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowRight, CreditCard, User, FileText, Calendar, Wallet, StickyNote } from 'lucide-react';

interface Supplier      { id: number; name: string; phone: string | null; total_debt: string; }
interface Purchase      { id: number; total: string; payment_status: string; }
interface PaymentMethod { id: number; name: string; }

interface SupplierPayment {
    id: number;
    supplier: Supplier;
    purchase: Purchase | null;
    payment_method: PaymentMethod;
    amount: string;
    notes: string | null;
    created_at: string;
    deleted_at: string | null;
}

interface Props {
    payment: SupplierPayment;
    flash?: { success?: string; error?: string };
}

function fmt(v: string | number) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v.replace(' ', 'T'));
    return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
}

export default function SupplierPaymentsShow({ payment, flash }: Props) {
    const isSoftDeleted = !!payment.deleted_at;

    return (
        <AppShell pageTitle={`دفعة مورد #${payment.id}`}>
            <div className="flex flex-col gap-8 pb-32 lg:pb-0">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/supplier-payments"
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-black/5 dark:bg-white/8 hover:bg-primary/10 hover:text-primary border-2 border-black/5 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 transition-all shrink-0 active:scale-95 shadow-sm">
                            <ArrowRight className="w-7 h-7 sm:w-8 sm:h-8" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white">تفاصيل دفعة المورد #{payment.id}</h1>
                                {isSoftDeleted && (
                                    <span className="text-base font-black px-4 py-1.5 rounded-[14px] bg-red-500/10 text-red-500 border border-red-500/20">
                                        ملغية / محذوفة
                                    </span>
                                )}
                            </div>
                            <p className="text-base sm:text-lg font-bold text-slate-400 dark:text-white/40 mt-1">
                                {payment.supplier?.name ?? 'مورد غير معروف'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="px-6 py-4 rounded-[22px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg sm:text-xl shadow-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="px-6 py-4 rounded-[22px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg sm:text-xl shadow-sm">
                        {flash.error}
                    </div>
                )}

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 sm:p-8 rounded-[28px] bg-emerald-500/10 border-2 border-emerald-500/20 flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">مبلغ الدفعة</span>
                            <Wallet className="w-7 h-7 text-emerald-500" />
                        </div>
                        <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                            {fmt(payment.amount)} <span className="text-xl font-bold">د.ل</span>
                        </span>
                    </div>

                    <div className="p-6 sm:p-8 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/5 dark:border-white/10 flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">وسيلة الدفع</span>
                            <CreditCard className="w-7 h-7 text-primary" />
                        </div>
                        <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                            {payment.payment_method?.name ?? '—'}
                        </span>
                    </div>

                    <div className="p-6 sm:p-8 rounded-[28px] bg-black/3 dark:bg-white/4 border-2 border-black/5 dark:border-white/10 flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">تاريخ السداد</span>
                            <Calendar className="w-7 h-7 text-purple-500" />
                        </div>
                        <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-wide">
                            {fmtDate(payment.created_at)}
                        </span>
                    </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Supplier Info */}
                    <SpatialCard title="بيانات المورد" icon={<User className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-col gap-6 p-2">
                            <div className="flex items-center justify-between p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/8">
                                <span className="text-base font-bold text-slate-400 dark:text-white/50">اسم المورد</span>
                                <Link href="/suppliers" className="text-xl font-black text-slate-800 dark:text-white hover:text-primary transition-colors">
                                    {payment.supplier?.name ?? 'مورد غير معروف'}
                                </Link>
                            </div>

                            {payment.supplier?.phone && (
                                <div className="flex items-center justify-between p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/8">
                                    <span className="text-base font-bold text-slate-400 dark:text-white/50">رقم الهاتف</span>
                                    <span className="text-xl font-black text-slate-800 dark:text-white">{payment.supplier.phone}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/8">
                                <span className="text-base font-bold text-slate-400 dark:text-white/50">إجمالي ديون المورد الحالية</span>
                                <span className={`text-2xl font-black ${parseFloat(payment.supplier?.total_debt ?? '0') > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {fmt(payment.supplier?.total_debt ?? '0')} د.ل
                                </span>
                            </div>
                        </div>
                    </SpatialCard>

                    {/* Linked Purchase or Independent Status */}
                    <SpatialCard title="ربط الفاتورة" icon={<FileText className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-col gap-6 p-2">
                            {payment.purchase ? (
                                <>
                                    <div className="flex items-center justify-between p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/8">
                                        <span className="text-base font-bold text-slate-400 dark:text-white/50">رقم فاتورة الشراء</span>
                                        <Link href={`/purchases/${payment.purchase.id}`} className="text-2xl font-black text-primary hover:underline">
                                            #{payment.purchase.id}
                                        </Link>
                                    </div>
                                    <div className="flex items-center justify-between p-5 rounded-[22px] bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/8">
                                        <span className="text-base font-bold text-slate-400 dark:text-white/50">إجمالي قيمة الفاتورة</span>
                                        <span className="text-2xl font-black text-slate-800 dark:text-white">{fmt(payment.purchase.total)} د.ل</span>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 rounded-[24px] bg-primary/5 border-2 border-primary/20 flex flex-col items-center justify-center text-center gap-3">
                                    <span className="text-4xl">🔗</span>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">دفعة مستقلة</h3>
                                    <p className="text-base font-bold text-slate-500 dark:text-white/60">
                                        هذه الدفعة سُجلت كدفعة عامة لحساب المورد وغير مرتبطة برقم فاتورة شراء محددة.
                                    </p>
                                </div>
                            )}
                        </div>
                    </SpatialCard>
                </div>

                {/* Notes Card */}
                {payment.notes && (
                    <SpatialCard title="ملاحظات الدفعة" icon={<StickyNote className="w-6 h-6 text-amber-500" />}>
                        <div className="p-6 rounded-[22px] bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/8 text-lg font-bold text-slate-700 dark:text-white/80 leading-relaxed">
                            {payment.notes}
                        </div>
                    </SpatialCard>
                )}
            </div>
        </AppShell>
    );
}
