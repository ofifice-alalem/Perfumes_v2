import { useState } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Trash2, Check, X, CreditCard, Package, Pencil } from 'lucide-react';

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

interface SupplierFinancialSummary {
  total_purchases: number;
  total_payments: number;
  total_settlements: number;
  total_debt: number;
}

interface Props {
  purchase: Purchase;
  products: Product[];
  paymentMethods: PaymentMethod[];
  supplierFinancialSummary: SupplierFinancialSummary;
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
  const [totalPrice, setTotalPrice] = useState('');

  const selectedProduct = products.find(p => p.id === +form.data.product_id);
  const unitCostPreview = form.data.quantity && totalPrice && +form.data.quantity > 0
    ? (+totalPrice / +form.data.quantity)
    : null;

  function handleTotalChange(val: string) {
    setTotalPrice(val);
    if (form.data.quantity && +form.data.quantity > 0 && val) {
      form.setData('unit_cost', (+val / +form.data.quantity).toFixed(4));
    }
  }

  function handleQtyChange(val: string) {
    form.setData('quantity', val);
    if (totalPrice && +val > 0) {
      form.setData('unit_cost', (+totalPrice / +val).toFixed(4));
    }
  }

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
              onChange={e => handleQtyChange(e.target.value)}
              placeholder="0" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">السعر الإجمالي (د)</label>
            <input type="number" min="0" step="0.01" value={totalPrice}
              onChange={e => handleTotalChange(e.target.value)}
              placeholder="0.00" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
          </div>
        </div>
      )}

      {unitCostPreview !== null && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] bg-primary/5 border border-primary/20">
          <span className="text-xs font-bold text-slate-500 dark:text-white/50">سعر الوحدة:</span>
          <span className="font-black text-primary">{unitCostPreview.toFixed(3)} د</span>
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

// ── Edit Item Row ─────────────────────────────────────────────────────────────
function EditItemRow({ item, purchaseId, onClose }: {
  item: PurchaseItem; purchaseId: number; onClose: () => void;
}) {
  const [qty,        setQty]        = useState(item.quantity);
  const [totalPrice, setTotalPrice] = useState(item.line_total);
  const [processing, setProcessing] = useState(false);

  const unitCost = +qty > 0 ? (+totalPrice / +qty) : 0;

  function save() {
    setProcessing(true);
    router.patch(`/purchases/${purchaseId}/items/${item.id}`, {
      quantity:  qty,
      unit_cost: unitCost.toFixed(4),
    }, { onFinish: () => { setProcessing(false); onClose(); } });
  }

  return (
    <>
      {/* الكمية */}
      <td className="px-4 py-2">
        <input type="number" min="0.01" step="0.01" value={qty}
          onChange={e => setQty(e.target.value)}
          className="spatial-input h-10 rounded-[12px] px-3 text-[14px] font-bold w-28" />
      </td>
      {/* السعر الإجمالي */}
      <td className="px-4 py-2">
        <input type="number" min="0" step="0.01" value={totalPrice}
          onChange={e => setTotalPrice(e.target.value)}
          className="spatial-input h-10 rounded-[12px] px-3 text-[14px] font-bold w-28" />
      </td>
      {/* سعر الوحدة */}
      <td className="px-4 py-2 text-center">
        <span className="text-xs font-bold text-primary">{unitCost.toFixed(3)}</span>
      </td>
      {/* إجراءات */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <button onClick={save} disabled={processing}
            className="w-8 h-8 rounded-[8px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-[8px] bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:bg-black/10 flex items-center justify-center transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </>
  );
}

// ── Add Supplier Payment Form ──────────────────────────────────
function AddSupplierPaymentForm({ supplierId, purchaseId, totalDebt, paymentMethods, onClose }: {
  supplierId: number; purchaseId: number; totalDebt: string; paymentMethods: PaymentMethod[]; onClose: () => void;
}) {
  const form = useForm({ 
    supplier_id: supplierId,
    redirect_purchase: purchaseId,
    payment_method_id: '', 
    amount: totalDebt, 
    notes: '' 
  });

  function submit() {
    form.post('/supplier-payments', { onSuccess: onClose });
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
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
        <textarea value={form.data.notes}
          onChange={e => form.setData('notes', e.target.value)}
          className="spatial-input rounded-[16px] px-4 py-3 text-[15px] font-bold resize-none" rows={2} />
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
export default function PurchaseShow({ purchase, products, paymentMethods, supplierFinancialSummary, flash }: Props) {
  const [showAddItem,   setShowAddItem]   = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddSupplierPayment, setShowAddSupplierPayment] = useState(false);
  const [editItemId,    setEditItemId]    = useState<number | null>(null);
  const [deleteItemId,  setDeleteItemId]  = useState<number | null>(null);

  function removeItem(itemId: number) {
    router.delete(`/purchases/${purchase.id}/items/${itemId}`, { onSuccess: () => setDeleteItemId(null) });
  }

  return (
    <AppShell pageTitle="تفاصيل فاتورة الشراء">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← المشتريات</Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة شراء #{purchase.id}</h1>
          <span className={`text-xs font-black px-3 py-1 rounded-[8px] ${statusConfig[purchase.payment_status].cls}`}>
            {statusConfig[purchase.payment_status].label}
          </span>
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

            {/* Items Table */}
            <SpatialCard
              title={`المنتجات المشتراة (${purchase.items.length})`}
              icon={<Package className="w-4 h-4" />}
              action={
                <button onClick={() => setShowAddItem(true)}
                  className="spatial-button flex items-center gap-1.5 px-4 h-9 text-sm">
                  <Plus className="w-4 h-4" /> إضافة
                </button>
              }
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5">
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-400 dark:text-white/40">المنتج</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-400 dark:text-white/40">الكمية</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-400 dark:text-white/40">السعر الإجمالي</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-400 dark:text-white/40">سعر الوحدة</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-400 dark:text-white/40">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.items.map(item => (
                        <tr key={item.id} className="border-b border-black/3 dark:border-white/3 hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                          {editItemId === item.id ? (
                            <>
                              <td className="px-4 py-2">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-white">{item.product.name}</span>
                                  <span className="block text-xs text-slate-400 dark:text-white/40">{item.product.category.name}</span>
                                </div>
                              </td>
                              <EditItemRow item={item} purchaseId={purchase.id} onClose={() => setEditItemId(null)} />
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-white">{item.product.name}</span>
                                  <span className="block text-xs text-slate-400 dark:text-white/40">{item.product.category.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">
                                {item.quantity}{item.product.category.unit}
                              </td>
                              <td className="px-4 py-2 font-black text-slate-800 dark:text-white">
                                {item.line_total} د
                              </td>
                              <td className="px-4 py-2 text-center text-xs font-bold text-slate-400 dark:text-white/40">
                                {item.unit_cost}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => setEditItemId(item.id)}
                                    className="w-8 h-8 rounded-[8px] bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white text-slate-500 dark:text-white/50 flex items-center justify-center transition-all">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteItemId(item.id)}
                                    className="w-8 h-8 rounded-[8px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  { label: 'الإجمالي', value: purchase.total,      cls: 'text-slate-800 dark:text-white' },
                  { label: 'المدفوع',  value: purchase.paid_amount, cls: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'المتبقي',  value: purchase.due_amount,  cls: +purchase.due_amount > 0 ? 'text-red-500' : 'text-slate-400 dark:text-white/30' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">{label}</span>
                    <span className={`font-black text-lg ${cls}`}>{value} د</span>
                  </div>
                ))}
              </div>
            </SpatialCard>

            {/* Supplier Financial Status */}
            {purchase.supplier.id !== 1 && (
              <SpatialCard title="الوضع المالي للمورد">
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'إجمالي المشتريات', value: (+supplierFinancialSummary.total_purchases).toFixed(2), cls: 'text-slate-800 dark:text-white' },
                    { label: 'إجمالي المدفوعات', value: (+supplierFinancialSummary.total_payments).toFixed(2), cls: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'إجمالي التسويات', value: (+supplierFinancialSummary.total_settlements).toFixed(2), cls: 'text-amber-600 dark:text-amber-400' },
                    { label: 'الدين الكلي', value: (+supplierFinancialSummary.total_debt).toFixed(2), cls: +supplierFinancialSummary.total_debt > 0 ? 'text-red-500' : +supplierFinancialSummary.total_debt < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-white/30' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                      <span className="text-sm font-bold text-slate-500 dark:text-white/50">{label}</span>
                      <span className={`font-black text-lg ${cls}`}>{value} د</span>
                    </div>
                  ))}
                </div>
                {+supplierFinancialSummary.total_debt > 0 && (
                  <button
                    onClick={() => setShowAddSupplierPayment(true)}
                    className="spatial-button w-full mt-3 flex items-center justify-center gap-2 h-11 text-sm"
                  >
                    <CreditCard className="w-4 h-4" /> سداد دفعة للمورد
                  </button>
                )}
                {showAddSupplierPayment && (
                  <div className="mt-3 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                    <AddSupplierPaymentForm 
                      supplierId={purchase.supplier.id} 
                      purchaseId={purchase.id}
                      totalDebt={supplierFinancialSummary.total_debt.toString()}
                      paymentMethods={paymentMethods} 
                      onClose={() => setShowAddSupplierPayment(false)} 
                    />
                  </div>
                )}
              </SpatialCard>
            )}

            {/* Payments */}
            <SpatialCard title="الدفعات للمورد" icon={<CreditCard className="w-4 h-4" />}
              action={+purchase.due_amount > 0 && (
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
