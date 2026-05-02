import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { CreditCard } from 'lucide-react';

interface Payment {
  id: number; amount: string; notes: string | null; created_at: string;
  customer: { id: number; name: string; total_debt: string; total_purchases: string } | null;
  invoice: { id: number; total: string; payment_status: string } | null;
  payment_method: { name: string };
}
interface Props { payment: Payment; }

export default function PaymentShow({ payment }: Props) {
  return (
    <AppShell pageTitle="تفاصيل الدفعة">
      <div className="flex flex-col gap-6 max-w-2xl">

        <div className="flex items-center gap-3">
          <Link href="/payments" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← المدفوعات</Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">دفعة #{payment.id}</h1>
        </div>

        <SpatialCard title="معلومات الدفعة" icon={<CreditCard className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'المبلغ',      value: `${payment.amount} د`,                          cls: 'text-emerald-600 dark:text-emerald-400 font-black text-lg' },
              { label: 'وسيلة الدفع', value: payment.payment_method.name,                    cls: '' },
              { label: 'التاريخ',     value: new Date(payment.created_at).toLocaleDateString('ar'), cls: '' },
              { label: 'ملاحظات',     value: payment.notes ?? '—',                           cls: '' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                <span className={`font-bold text-slate-800 dark:text-white text-sm ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </SpatialCard>

        {payment.customer && (
          <SpatialCard title="العميل">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                <span className="text-xs font-bold text-slate-400 dark:text-white/40">الاسم</span>
                <span className="font-bold text-slate-800 dark:text-white text-sm">{payment.customer.name}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                <span className="text-xs font-bold text-slate-400 dark:text-white/40">الدين الكلي</span>
                <span className={`font-black text-sm ${+payment.customer.total_debt > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {+payment.customer.total_debt > 0 ? `${payment.customer.total_debt} د` : 'مسدد'}
                </span>
              </div>
            </div>
          </SpatialCard>
        )}

        {payment.invoice && (
          <SpatialCard title="الفاتورة المرتبطة">
            <div className="flex items-center justify-between p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
              <div>
                <span className="font-bold text-slate-800 dark:text-white text-sm">فاتورة #{payment.invoice.id}</span>
                <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">إجمالي: {payment.invoice.total} د</p>
              </div>
              <Link href={`/invoices/${payment.invoice.id}`}
                className="spatial-button px-4 h-9 text-sm">
                عرض الفاتورة
              </Link>
            </div>
          </SpatialCard>
        )}
      </div>
    </AppShell>
  );
}
