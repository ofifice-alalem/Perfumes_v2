import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';

interface Settlement {
  id: number; amount: string; notes: string | null; created_at: string;
  customer: { id: number; name: string; total_debt: string; total_purchases: string } | null;
  invoice: { id: number; total: string } | null;
  payment_method: { name: string };
}
interface Props { settlement: Settlement; }

export default function SettlementShow({ settlement }: Props) {
  return (
    <AppShell pageTitle="تفاصيل التسوية">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/settlements" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← التسويات</Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">تسوية #{settlement.id}</h1>
          <span className="text-xs font-black px-3 py-1 rounded-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {settlement.amount} د
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <SpatialCard title="معلومات التسوية" hideHeader>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'المبلغ المُرجَع', value: `${settlement.amount} د`,                               cls: 'text-amber-600 dark:text-amber-400 font-black text-lg' },
                  { label: 'وسيلة الرد',      value: settlement.payment_method.name,                         cls: '' },
                  { label: 'التاريخ',         value: new Date(settlement.created_at).toLocaleDateString('ar'), cls: '' },
                  { label: 'ملاحظات',         value: settlement.notes ?? '—',                                cls: '' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                    <span className={`font-bold text-slate-800 dark:text-white text-sm ${cls}`}>{value}</span>
                  </div>
                ))}
              </div>
            </SpatialCard>

            {settlement.invoice && (
              <SpatialCard title="الفاتورة المرتبطة">
                <div className="flex items-center justify-between p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">فاتورة #{settlement.invoice.id}</span>
                    <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">إجمالي: {settlement.invoice.total} د</p>
                  </div>
                  <Link href={`/invoices/${settlement.invoice.id}`}
                    className="flex items-center gap-2 px-4 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                    عرض الفاتورة
                  </Link>
                </div>
              </SpatialCard>
            )}
          </div>

          {/* Right */}
          {settlement.customer && (
            <div className="flex flex-col gap-4">
              <SpatialCard title="العميل" icon={<ArrowLeftRight className="w-4 h-4" />}>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">الاسم</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{settlement.customer.name}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">إجمالي المشتريات</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{settlement.customer.total_purchases} د</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-black/5 dark:border-white/5">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">
                      {+settlement.customer.total_debt > 0 ? 'مدين' : +settlement.customer.total_debt < 0 ? 'دائن' : 'مسدد'}
                    </span>
                    <span className={`font-black text-lg ${
                      +settlement.customer.total_debt > 0 ? 'text-red-500'
                      : +settlement.customer.total_debt < 0 ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-white/30'
                    }`}>
                      {+settlement.customer.total_debt === 0 ? 'مسدد' : `${Math.abs(+settlement.customer.total_debt)} د`}
                    </span>
                  </div>
                  <Link href={`/customers`}
                    className="w-full flex items-center justify-center gap-2 px-4 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white border border-black/10 dark:border-white/10 hover:border-primary text-slate-600 dark:text-white/60 font-bold text-[13px] transition-all">
                    <AlertCircle className="w-4 h-4" /> عرض العميل
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
