import { Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard } from '@/components/ui/SpatialComponents';
import { Plus, ShoppingCart, Eye, Truck, Calendar, DollarSign } from 'lucide-react';

interface Supplier { id: number; name: string; }
interface PaymentMethod { id: number; name: string; }
interface Product { id: number; name: string; }
interface PurchaseItem {
  id: number;
  quantity: string;
  unit_cost: string;
  line_total: string;
  product: Product;
}
interface SupplierPayment {
  id: number;
  amount: string;
  paymentMethod: PaymentMethod;
}
interface Purchase {
  id: number;
  total: string;
  paid_amount: string;
  due_amount: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes: string | null;
  created_at: string;
  supplier: Supplier;
  items: PurchaseItem[];
  payments: SupplierPayment[];
}

interface Props {
  purchases: Purchase[];
  flash?: { success?: string; error?: string };
}

const statusColors = {
  unpaid: 'bg-red-500/10 text-red-500 border border-red-500/20',
  partial: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};

const statusLabels = {
  unpaid: 'غير مدفوع',
  partial: 'مدفوع جزئياً',
  paid: 'مدفوع بالكامل',
};

export default function PurchasesIndex({ purchases, flash }: Props) {
  return (
    <AppShell pageTitle="Step 6 — المشتريات والمخزون">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">المشتريات</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">{purchases.length} فاتورة شراء</p>
          </div>
          <Link href="/purchases/create"
            className="spatial-button flex items-center gap-2 px-5 h-11 text-sm">
            <Plus className="w-4 h-4" />
            فاتورة شراء جديدة
          </Link>
        </div>

        {/* Flash */}
        {flash?.success && (
          <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            {flash.success}
          </div>
        )}
        {flash?.error && (
          <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">
            {flash.error}
          </div>
        )}

        {/* List */}
        <SpatialCard title={`فواتير الشراء (${purchases.length})`} icon={<ShoppingCart className="w-4 h-4" />}>
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30 gap-3">
              <span className="text-4xl">📋</span>
              <span className="font-bold">لا توجد فواتير شراء بعد</span>
              <Link href="/purchases/create"
                className="spatial-button flex items-center gap-2 px-5 h-11 text-sm mt-4">
                <Plus className="w-4 h-4" />
                إنشاء أول فاتورة
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5">
                      {['#', 'المورد', 'عدد المنتجات', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-right text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase, idx) => (
                      <tr key={purchase.id} className={`transition-colors hover:bg-black/2 dark:hover:bg-white/2 ${idx < purchases.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                        <td className="px-4 py-3">
                          <span className="font-black text-slate-800 dark:text-white text-sm">#{purchase.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Truck className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-white text-sm">{purchase.supplier.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-primary/10 text-primary border border-primary/20">
                            {purchase.items.length} منتج
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-black text-slate-800 dark:text-white text-sm">{purchase.total} د</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{purchase.paid_amount} د</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-sm ${+purchase.due_amount > 0 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>
                            {purchase.due_amount} د
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-[6px] ${statusColors[purchase.payment_status]}`}>
                            {statusLabels[purchase.payment_status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(purchase.created_at).toLocaleDateString('ar')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/purchases/${purchase.id}`}
                            className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-xs whitespace-nowrap">
                            <Eye className="w-3 h-3" /> عرض
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden flex flex-col gap-3">
                {purchases.map(purchase => (
                  <div key={purchase.id} className="flex flex-col gap-3 p-4 rounded-[20px] bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 dark:text-white">#{purchase.id}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-[6px] ${statusColors[purchase.payment_status]}`}>
                          {statusLabels[purchase.payment_status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(purchase.created_at).toLocaleDateString('ar')}</span>
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="font-bold text-slate-800 dark:text-white">{purchase.supplier.name}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">عدد المنتجات</span>
                        <span className="font-black text-primary text-sm">{purchase.items.length}</span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">الإجمالي</span>
                        <span className="font-black text-slate-800 dark:text-white text-sm">{purchase.total} د</span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">المدفوع</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{purchase.paid_amount} د</span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">المتبقي</span>
                        <span className={`font-black text-sm ${+purchase.due_amount > 0 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>
                          {purchase.due_amount} د
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Link href={`/purchases/${purchase.id}`}
                      className="flex items-center justify-center gap-2 h-9 rounded-[14px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-sm">
                      <Eye className="w-4 h-4" /> عرض التفاصيل
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </SpatialCard>

      </div>
    </AppShell>
  );
}