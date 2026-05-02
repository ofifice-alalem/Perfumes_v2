import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowLeftRight, Users, FileText, Calendar, MessageSquare } from 'lucide-react';

interface Settlement {
  id: number; amount: string; notes: string | null; created_at: string;
  customer: { id: number; name: string; total_debt: string; total_purchases: string } | null;
  invoice: { id: number; total: string } | null;
  payment_method: { name: string };
}
interface Props { settlement: Settlement; }

export default function SettlementShow({ settlement }: Props) {
  const debt = settlement.customer ? +settlement.customer.total_debt : 0;

  return (
    <AppShell pageTitle="تفاصيل التسوية">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/settlements" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← التسويات</Link>
            <span className="text-slate-300 dark:text-white/20">/</span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">تسوية #{settlement.id}</h1>
          </div>
          <span className="text-sm font-black px-4 py-2 rounded-[12px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit">
            {settlement.amount} د
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* المبلغ — بطاقة كبيرة */}
            <SpatialCard title="ملخص التسوية" icon={<ArrowLeftRight className="w-4 h-4" />}>
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">المبلغ المُرجَع</span>
                <span className="text-6xl font-black text-amber-600 dark:text-amber-400">{settlement.amount}</span>
                <span className="text-xl font-bold text-slate-500 dark:text-white/50">دينار</span>
              </div>
            </SpatialCard>

            {/* التفاصيل */}
            <SpatialCard title="تفاصيل التسوية">
              <div className="flex flex-col gap-0">
                {[
                  { icon: <ArrowLeftRight className="w-4 h-4" />, label: 'وسيلة الرد', value: settlement.payment_method.name },
                  { icon: <Calendar className="w-4 h-4" />,       label: 'التاريخ',    value: new Date(settlement.created_at).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  { icon: <MessageSquare className="w-4 h-4" />,  label: 'ملاحظات',    value: settlement.notes ?? '—' },
                ].map(({ icon, label, value }, i, arr) => (
                  <div key={label} className={`flex items-center gap-4 py-4 ${i < arr.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                    <div className="w-10 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500 dark:text-white/50">{label}</span>
                      <span className="font-black text-slate-800 dark:text-white text-sm">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SpatialCard>

            {/* الفاتورة المرتبطة */}
            {settlement.invoice && (
              <SpatialCard title="الفاتورة المرتبطة" icon={<FileText className="w-4 h-4" />}>
                <div className="flex items-center justify-between p-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[14px] bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-black text-slate-800 dark:text-white">فاتورة #{settlement.invoice.id}</span>
                      <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">إجمالي: {settlement.invoice.total} د</p>
                    </div>
                  </div>
                  <Link href={`/invoices/${settlement.invoice.id}`}
                    className="flex items-center gap-2 px-4 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                    عرض
                  </Link>
                </div>
              </SpatialCard>
            )}
          </div>

          {/* Right — العميل */}
          {settlement.customer && (
            <div className="flex flex-col gap-6">
              <SpatialCard title="العميل" icon={<Users className="w-4 h-4" />}>
                <div className="flex flex-col gap-4">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-4 p-4 rounded-[16px] bg-black/3 dark:bg-white/3">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center font-black text-2xl text-amber-600 dark:text-amber-400 shrink-0">
                      {settlement.customer.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-black text-slate-800 dark:text-white text-lg">{settlement.customer.name}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                      <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">إجمالي المشتريات</span>
                      <div className="flex items-end gap-1 mt-2">
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{settlement.customer.total_purchases}</span>
                        <span className="text-sm font-bold text-slate-400 dark:text-white/40 mb-1">د</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-[16px] border ${
                      debt > 0 ? 'bg-red-500/5 border-red-500/20'
                      : debt < 0 ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-black/3 dark:bg-white/3 border-black/5 dark:border-white/5'
                    }`}>
                      <span className={`text-xs font-bold uppercase tracking-widest ${
                        debt > 0 ? 'text-red-500' : debt < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-white/40'
                      }`}>
                        {debt > 0 ? 'مدين' : debt < 0 ? 'دائن' : 'الحالة المالية'}
                      </span>
                      <div className="flex items-end gap-1 mt-2">
                        <span className={`text-3xl font-black ${
                          debt > 0 ? 'text-red-500' : debt < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-white/30'
                        }`}>
                          {debt === 0 ? 'مسدد' : Math.abs(debt)}
                        </span>
                        {debt !== 0 && <span className={`text-sm font-bold mb-1 ${debt > 0 ? 'text-red-400' : 'text-emerald-500'}`}>د</span>}
                      </div>
                    </div>
                  </div>

                  <Link href="/customers"
                    className="w-full flex items-center justify-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    <Users className="w-4 h-4" /> عرض العملاء
                  </Link>
                </div>
              </SpatialCard>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
