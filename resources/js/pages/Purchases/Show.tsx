import { useState } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Trash2, Check, X, CreditCard, Package } from 'lucide-react';

interface Category  { id: number; name: string; unit: string; }
interface Product   { id: number; name: string; stock: string; category: Category; }
interface PurchaseItem {
  id: number; quantity: string; unit_cost: string; line_total: string;
  product: Product;
}
interface SupplierPayment {
  id: number; amount: string; notes: string | null; created_at: string;
  payment_method: { name: string };
}
interface Purchase {
  id: number;
  total: string; paid_amount: string; due_amount: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes: string | null; created_at: string;
  supplier: { id: number; name: string; phone: string };
  items: PurchaseItem[];
  payments: SupplierPayment[];
}
interface PaymentMethod { id: number; name: string; }

interface Props {
  purchase: Purchase;
  products: Product[];
  paymentMethods: PaymentMethod[];
  flash?: { success?: string; error?: string };
}

const statusConfig = {
  paid:    { label: 'مدفوعة',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  partial: { label: 'جزئي',       cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
  unpaid:  { label: 'غير مدفوعة', cls: 'bg-red-500/10 text-red-500 border border-red-500/20' },
};

// ── Add Item Form ─────────────────────────────────────────────────────────────
function AddItemForm({ purchaseId, products, onClose }: {
  purchaseId: number; products: Product[]; onClose: () => void;
}) {
  const form = useForm({ product_id: '', quantity: '', unit_cost: '' });

  const selectedProduct = products.find(p => p.id === +form.data.product_id);

  function submit() {
    form.post(`/purchases/${purchaseId}/items`, { onSuccess: onClose });
  }

  return (
    <div className="flex flex-col gap-4">
      <ModernSelect label="المنتج"
        options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `مخزون: ${p.stock}` }))}
        defaultValue=""
        onSelect={val => {
          const p = products.find(p => p.name === val);
          form.setData(prev => ({ ...prev, product_id: p ? String(p.id) : '' }));
        }}
      />

      {selectedProduct && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">
              الكمية ({selectedProduct.category.unit})
            </label>
            <input type="number" min="0.01" step="0.01" value={form.data.quantity}
              onChange={e => form.setData('quantity', e.target.value)}
              placeholder="0" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
            {form.errors.quantity && <p className="text-xs text-red-500 font-bold">{form.errors.quantity}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">سعر الوحدة (د)</label>
            <input type="number" min="0" step="0.01" value={form.data.unit_cost}
              onChange={e => form.setData('unit_cost', e.target.value)}
              placeholder="0.00" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
            {form.errors.unit_cost && <p className="text-xs text-red-500 font-bold">{form.errors.unit_cost}</p>}
          </div>
        </div>
      )}

      {/* معاينة الإجمالي */}
      {form.data.quantity && form.data.unit_cost && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] bg-primary/5 border border-primary/20">
          <span className="text-xs font-bold text-slate-500 dark:text-white/50">الإجمالي:</span>
          <span className="font-black text-primary">{(+form.data.quantity * +form.data.unit_cost).toFixed(2)} د</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={form.processing || !form.data.product_id || !form.data.quantity || !form.data.unit_cost}
          className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
          <Check className="w-4 h-4" /> إضافة
        </button>
        <button onClick={onClose}
          className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
          <X className="w-4 h-4" /> إلغاء
        </button>
      </div>
    </div>
  );
}

// ── Add Payment Form ──────────────────────────────────────────────────────────
function AddPaymentForm({ purchaseId, dueAmount, paymentMethods, onClose }: {
  purchaseId: number; dueAmount: string; paymentMethods: PaymentMethod[]; onClose: () => void;
}) {
  const form = useForm({ payment_method_id: '', amount: dueAmount, notes: '' });

  function submit() {
    form.post(`/purchases/${purchaseId}/payments`, { onSuccess: onClose });
  }

  return (
    <div className="flex flex-col gap-4">
      <ModernSelect label="وسيلة الدفع"
        options={paymentMethods.map(m => ({ label: m.name }))}
        defaultValue=""
        onSelect={val => form.setData('payment_method_id', String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
      />
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
        <input type="number" min="0.01" step="0.01" value={form.data.amount}
          onChange={e => form.setData('amount', e.target.value)}
          className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
        {form.errors.amount && <p className="text-xs text-red-500 font-bold">{form.errors.amount}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={form.processing || !form.data.payment_method_id}
          className="spatial-button flex items-center gap-2 px-5 h-11 text-sm disabled:opacity-50">
          <Check className="w-4 h-4" /> تسجيل
        </button>
        <button onClick={onClose}
          className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
          <X className="w-4 h-4" /> إلغاء
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PurchaseShow({ purchase, products, paymentMethods, flash }: Props) {
  const [showAddItem, setShowAddItem]       = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [deleteItemId, setDeleteItemId]     = useState<number | null>(null);

  function removeItem(itemId: number) {
    router.delete(`/purchases/${purchase.id}/items/${itemId}`, { onSuccess: () => setDeleteItemId(null) });
  }

  const isPaid = purchase.payment_status === 'paid';

  return (
    <AppShell pageTitle="تفاصيل فاتورة الشراء">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/purchases" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← المشتريات</Link>
            <span className="text-slate-300 dark:text-white/20">/</span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة شراء #{purchase.id}</h1>
            <span className={`text-xs font-black px-3 py-1 rounded-[8px] ${statusConfig[purchase.payment_status].cls}`}>
              {statusConfig[purchase.payment_status].label}
            </span>
          </div>
        </div>

        {/* Flash */}
        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Items */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Purchase Info */}
            <SpatialCard title="معلومات فاتورة الشراء" hideHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'المورد',  value: purchase.supplier.name },
                  { label: 'الهاتف',  value: purchase.supplier.phone },
                  { label: 'التاريخ', value: new Date(purchase.created_at).toLocaleDateString('ar') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                    <span className="font-black text-slate-800 dark:text-white text-sm">{value}</span>
                  </div>
                ))}
              </div>
              {purchase.notes && (
                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-white/50 px-1">{purchase.notes}</p>
              )}
            </SpatialCard>

            {/* Items */}
            <SpatialCard title={`المنتجات المشتراة (${purchase.items.length})`} icon={<Package className="w-4 h-4" />}
              action={!isPaid && (
                <button onClick={() => setShowAddItem(true)}
                  className="spatial-button flex items-center gap-1.5 px-4 h-9 text-sm">
                  <Plus className="w-4 h-4" /> إضافة
                </button>
              )}
            >
              {showAddItem && (
                <div className="mb-5 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                  <AddItemForm purchaseId={purchase.id} products={products} onClose={() => setShowAddItem(false)} />
                </div>
              )}

              {purchase.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-white/30 gap-2">
                  <span className="text-3xl">📦</span>
                  <span className="font-bold text-sm">لا توجد منتجات بعد</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {purchase.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{item.product.name}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-[6px]">
                            {item.product.category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">الكمية: {item.quantity}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">سعر الوحدة: {item.unit_cost} د</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{item.line_total} د</span>
                        {!isPaid && (
                          <button onClick={() => setDeleteItemId(item.id)}
                            className="w-8 h-8 rounded-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SpatialCard>
          </div>

          {/* Right — Summary + Payments */}
          <div className="flex flex-col gap-4">

            {/* Summary */}
            <SpatialCard title="ملخص الفاتورة">
              <div className="flex flex-col gap-3">
                {[
                  { label: 'الإجمالي', value: purchase.total,       cls: 'text-slate-800 dark:text-white' },
                  { label: 'المدفوع',  value: purchase.paid_amount,  cls: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'المتبقي',  value: purchase.due_amount,   cls: +purchase.due_amount > 0 ? 'text-red-500' : 'text-slate-400 dark:text-white/30' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">{label}</span>
                    <span className={`font-black text-lg ${cls}`}>{value} د</span>
                  </div>
                ))}
              </div>
            </SpatialCard>

            {/* Payments */}
            <SpatialCard title="الدفعات للمورد" icon={<CreditCard className="w-4 h-4" />}
              action={!isPaid && +purchase.due_amount > 0 && (
                <button onClick={() => setShowAddPayment(true)}
                  className="spatial-button flex items-center gap-1.5 px-4 h-9 text-sm">
                  <Plus className="w-4 h-4" /> دفعة
                </button>
              )}
            >
              {showAddPayment && (
                <div className="mb-4 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                  <AddPaymentForm purchaseId={purchase.id} dueAmount={purchase.due_amount}
                    paymentMethods={paymentMethods} onClose={() => setShowAddPayment(false)} />
                </div>
              )}

              {purchase.payments.length === 0 ? (
                <p className="text-sm font-bold text-slate-400 dark:text-white/30 text-center py-4">لا توجد دفعات</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {purchase.payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{payment.payment_method.name}</span>
                        <p className="text-xs font-bold text-slate-400 dark:text-white/40 mt-0.5">
                          {new Date(payment.created_at).toLocaleDateString('ar')}
                        </p>
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{payment.amount} د</span>
                    </div>
                  ))}
                </div>
              )}
            </SpatialCard>
          </div>
        </div>

        <ConfirmModal isOpen={deleteItemId !== null} title="حذف المنتج" message="هل أنت متأكد؟ سيُعاد خصم المخزون تلقائياً."
          onConfirm={() => deleteItemId && removeItem(deleteItemId)} onCancel={() => setDeleteItemId(null)} />

      </div>
    </AppShell>
  );
}
