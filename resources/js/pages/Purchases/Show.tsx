import { useState } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Trash2, ChevronLeft, Package, CreditCard, Truck, Calendar, DollarSign, Check, X } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }
interface Product { id: number; name: string; category: Category; }
interface PaymentMethod { id: number; name: string; }
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
  notes: string | null;
  payment_method: PaymentMethod; // تغيير من paymentMethod إلى payment_method
  created_at: string;
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
  purchase: Purchase;
  products: Product[];
  paymentMethods: PaymentMethod[];
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

export default function PurchasesShow({ purchase, products, paymentMethods, flash }: Props) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const itemForm = useForm({
    product_id: '',
    quantity: '',
    total_cost: '', // تغيير من unit_cost إلى total_cost
  });

  const paymentForm = useForm({
    payment_method_id: '',
    amount: '',
    notes: '',
  });

  function addItem() {
    itemForm.post(`/purchases/${purchase.id}/items`, {
      onSuccess: () => {
        itemForm.reset();
        setShowAddItem(false);
      },
    });
  }

  function addPayment() {
    paymentForm.post(`/purchases/${purchase.id}/payments`, {
      onSuccess: () => {
        paymentForm.reset();
        setShowAddPayment(false);
      },
    });
  }

  function deleteItem(itemId: number) {
    router.delete(`/purchases/${purchase.id}/items/${itemId}`, {
      onSuccess: () => setDeleteItemId(null),
    });
  }

  const productOptions = products.map(p => ({ 
    label: p.name, 
    badge: p.category.name 
  }));

  const paymentMethodOptions = paymentMethods.map(pm => ({ 
    label: pm.name, 
    badge: '' 
  }));

  return (
    <AppShell pageTitle="Step 6 — المشتريات والمخزون">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/purchases" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
              <ChevronLeft className="w-4 h-4" /> المشتريات
            </Link>
            <span className="text-slate-300 dark:text-white/10">/</span>
            <span className="font-black text-slate-800 dark:text-white text-sm">فاتورة #{purchase.id}</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-[8px] ${statusColors[purchase.payment_status]}`}>
            {statusLabels[purchase.payment_status]}
          </span>
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

        {/* Purchase Info */}
        <SpatialCard title="معلومات الفاتورة" icon={<Truck className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-black/3 dark:bg-white/3">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">المورد</span>
              <span className="font-black text-slate-800 dark:text-white">{purchase.supplier.name}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-black/3 dark:bg-white/3">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">التاريخ</span>
              <span className="font-black text-slate-800 dark:text-white">{new Date(purchase.created_at).toLocaleDateString('ar')}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-black/3 dark:bg-white/3">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">عدد المنتجات</span>
              <span className="font-black text-primary">{purchase.items.length}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-black/3 dark:bg-white/3">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40">الإجمالي</span>
              <span className="font-black text-slate-800 dark:text-white">{purchase.total} د</span>
            </div>
          </div>
          {purchase.notes && (
            <div className="mt-4 p-4 rounded-[16px] bg-blue-500/5 border border-blue-500/20">
              <span className="text-xs font-bold text-slate-400 dark:text-white/40 block mb-1">ملاحظات</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{purchase.notes}</span>
            </div>
          )}
        </SpatialCard>

        {/* Items */}
        <SpatialCard 
          title={`المنتجات (${purchase.items.length})`} 
          icon={<Package className="w-4 h-4" />}
          action={
            <button onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-xs">
              <Plus className="w-3 h-3" /> إضافة منتج
            </button>
          }
        >
          {/* Add Item Form */}
          {showAddItem && (
            <div className="mb-4 p-4 rounded-[16px] bg-primary/5 border border-primary/20">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ModernSelect 
                    label="المنتج" 
                    options={productOptions}
                    defaultValue=""
                    placeholder="اختر المنتج..."
                    onSelect={val => {
                      const product = products.find(p => p.name === val);
                      itemForm.setData('product_id', product ? String(product.id) : '');
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75">الكمية</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={itemForm.data.quantity}
                      onChange={e => itemForm.setData('quantity', e.target.value)}
                      placeholder="0"
                      className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75">السعر الكلي</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemForm.data.total_cost}
                      onChange={e => itemForm.setData('total_cost', e.target.value)}
                      placeholder="0"
                      className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                    />
                  </div>
                </div>
                
                {/* عرض سعر الوحدة المحسوب */}
                {itemForm.data.quantity && itemForm.data.total_cost && (
                  <div className="flex items-center gap-1 px-4 py-3 rounded-[14px] bg-blue-500/5 border border-blue-500/20">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">سعر الوحدة المحسوب:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                      {(+itemForm.data.total_cost / +itemForm.data.quantity).toFixed(3)} د
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={addItem} disabled={itemForm.processing}
                    className="spatial-button flex items-center gap-2 px-4 h-10 text-sm">
                    <Check className="w-4 h-4" /> إضافة
                  </button>
                  <button onClick={() => { setShowAddItem(false); itemForm.reset(); }}
                    className="h-10 px-4 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {purchase.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30 gap-3">
              <Package className="w-8 h-8" />
              <span className="font-bold">لا توجد منتجات بعد</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5">
                    {['المنتج', 'التصنيف', 'الكمية', 'سعر الوحدة', 'الإجمالي', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item, idx) => (
                    <tr key={item.id} className={`transition-colors hover:bg-black/2 dark:hover:bg-white/2 ${idx < purchase.items.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 dark:text-white">{item.product.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-primary/10 text-primary border border-primary/20">
                          {item.product.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-800 dark:text-white">{item.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-800 dark:text-white">{item.unit_cost} د</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-primary">{item.line_total} د</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setDeleteItemId(item.id)}
                          className="w-8 h-8 rounded-[8px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SpatialCard>

        {/* Payment Summary & Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Payment Summary */}
          <SpatialCard title="ملخص الدفع" icon={<DollarSign className="w-4 h-4" />}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500 dark:text-white/40">الإجمالي</span>
                <span className="font-black text-slate-800 dark:text-white text-lg">{purchase.total} د</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500 dark:text-white/40">المدفوع</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{purchase.paid_amount} د</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500 dark:text-white/40">المتبقي</span>
                <span className={`font-bold ${+purchase.due_amount > 0 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>
                  {purchase.due_amount} د
                </span>
              </div>
            </div>
          </SpatialCard>

          {/* Payments */}
          <SpatialCard 
            title={`المدفوعات (${purchase.payments.length})`} 
            icon={<CreditCard className="w-4 h-4" />}
            action={
              +purchase.due_amount > 0 && (
                <button onClick={() => setShowAddPayment(true)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 font-bold text-xs">
                  <Plus className="w-3 h-3" /> دفعة جديدة
                </button>
              )
            }
          >
            {/* Add Payment Form */}
            {showAddPayment && (
              <div className="mb-4 p-4 rounded-[16px] bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ModernSelect 
                      label="وسيلة الدفع" 
                      options={paymentMethodOptions}
                      defaultValue=""
                      placeholder="اختر وسيلة الدفع..."
                      onSelect={val => {
                        const method = paymentMethods.find(pm => pm.name === val);
                        paymentForm.setData('payment_method_id', method ? String(method.id) : '');
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-white/75">المبلغ</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={purchase.due_amount}
                        value={paymentForm.data.amount}
                        onChange={e => paymentForm.setData('amount', e.target.value)}
                        placeholder={`الحد الأقصى: ${purchase.due_amount}`}
                        className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75">ملاحظات</label>
                    <input
                      value={paymentForm.data.notes}
                      onChange={e => paymentForm.setData('notes', e.target.value)}
                      placeholder="ملاحظة اختيارية..."
                      className="spatial-input h-11 rounded-[14px] px-4 text-[14px] font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={addPayment} disabled={paymentForm.processing}
                      className="spatial-button flex items-center gap-2 px-4 h-10 text-sm">
                      <Check className="w-4 h-4" /> تسجيل الدفعة
                    </button>
                    <button onClick={() => { setShowAddPayment(false); paymentForm.reset(); }}
                      className="h-10 px-4 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {purchase.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30 gap-3">
                <CreditCard className="w-8 h-8" />
                <span className="font-bold">لا توجد مدفوعات بعد</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {purchase.payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-[12px] bg-emerald-500/5 border border-emerald-500/15">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-white/70 text-sm">{payment.payment_method?.name || 'غير محدد'}</span>
                        {payment.notes && (
                          <span className="text-xs text-slate-500 dark:text-white/50">{payment.notes}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{payment.amount} د</span>
                      <span className="text-xs text-slate-400 dark:text-white/30">
                        {new Date(payment.created_at).toLocaleDateString('ar')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SpatialCard>

        </div>

      </div>

      <ConfirmModal
        isOpen={deleteItemId !== null}
        onConfirm={() => deleteItemId && deleteItem(deleteItemId)}
        onCancel={() => setDeleteItemId(null)}
        title="حذف المنتج"
        message="هل أنت متأكد من حذف هذا المنتج؟ سيتم إعادة الكمية إلى المخزون."
      />

    </AppShell>
  );
}