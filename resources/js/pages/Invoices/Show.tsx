import { useState } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Plus, Trash2, Check, X, CreditCard, Package } from 'lucide-react';

interface Size       { id: number; label: string; value: string; }
interface Category   { id: number; name: string; unit: string; }
interface ProductPrice { price_per_unit_regular: string; price_per_unit_vip: string; full_bottle_regular: string | null; full_bottle_vip: string | null; }
interface OriginalDetail { bottle_volume: string; }
interface PriceTier  { id: number; name: string; }
interface Product {
  id: number; name: string; stock: string; selling_type: string;
  category: Category; price_tier: PriceTier | null;
  product_price: ProductPrice | null;
  original_perfume_detail: OriginalDetail | null;
}
interface InvoiceItem {
  id: number; sale_type: string; quantity: string; unit_price: string; line_total: string;
  product: Product; size: Size | null;
}
interface Payment {
  id: number; amount: string; notes: string | null; created_at: string;
  payment_method: { name: string };
}
interface Invoice {
  id: number; customer_type: 'regular' | 'vip';
  total: string; paid_amount: string; due_amount: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes: string | null; created_at: string;
  user: { name: string };
  customer: { id: number; name: string } | null;
  items: InvoiceItem[];
  payments: Payment[];
}
interface PaymentMethod { id: number; name: string; }

interface Props {
  invoice: Invoice;
  products: Product[];
  sizes: Size[];
  paymentMethods: PaymentMethod[];
  flash?: { success?: string; error?: string };
}

const saleTypeLabels: Record<string, string> = {
  tier_decant:  'زيتي - تقسيم',
  unit_decant:  'أصلي - تقسيم',
  full_bottle:  'عبوة كاملة',
  unit_based:   'بالوحدة',
};

const statusConfig = {
  paid:    { label: 'مدفوعة',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  partial: { label: 'جزئي',       cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
  unpaid:  { label: 'غير مدفوعة', cls: 'bg-red-500/10 text-red-500 border border-red-500/20' },
};

// ── Add Item Form ─────────────────────────────────────────────────────────────
function AddItemForm({ invoice, products, sizes, onClose }: {
  invoice: Invoice; products: Product[]; sizes: Size[];
  onClose: () => void;
}) {
  const form = useForm({ product_id: '', sale_type: '', size_id: '', quantity: '' });
  const isVip = invoice.customer_type === 'vip';

  const selectedProduct = products.find(p => p.id === +form.data.product_id);
  const isTier    = selectedProduct?.selling_type === 'tier_based';
  const isML      = selectedProduct?.category.unit === 'ml';
  const isOriginal = isML && !isTier;

  const saleTypeOptions = () => {
    if (!selectedProduct) return [];
    if (isTier) return [{ label: 'زيتي - تقسيم', badge: 'tier_decant' }];
    if (isOriginal) return [
      { label: 'أصلي - تقسيم', badge: 'unit_decant' },
      { label: 'عبوة كاملة',   badge: 'full_bottle' },
    ];
    return [{ label: 'بالوحدة', badge: 'unit_based' }];
  };

  const needsSize = form.data.sale_type === 'tier_decant' || form.data.sale_type === 'unit_decant';
  const needsQty  = form.data.sale_type === 'unit_based';

  // حساب السعر المتوقع
  const previewPrice = () => {
    if (!selectedProduct || !form.data.sale_type) return null;
    const pp = selectedProduct.product_price;
    switch (form.data.sale_type) {
      case 'full_bottle': return isVip ? pp?.full_bottle_vip : pp?.full_bottle_regular;
      case 'unit_based':
      case 'unit_decant': return isVip ? pp?.price_per_unit_vip : pp?.price_per_unit_regular;
      default: return null;
    }
  };

  function submit() {
    form.post(`/invoices/${invoice.id}/items`, { onSuccess: onClose });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* المنتج */}
      <ModernSelect label="المنتج"
        options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `${p.stock}` }))}
        defaultValue=""
        onSelect={val => {
          const p = products.find(p => p.name === val);
          form.setData(prev => ({ ...prev, product_id: p ? String(p.id) : '', sale_type: '', size_id: '', quantity: '' }));
        }}
      />

      {/* نوع البيع */}
      {selectedProduct && (
        <ModernSelect label="نوع البيع" options={saleTypeOptions()}
          defaultValue=""
          onSelect={val => {
            const map: Record<string, string> = { 'زيتي - تقسيم': 'tier_decant', 'أصلي - تقسيم': 'unit_decant', 'عبوة كاملة': 'full_bottle', 'بالوحدة': 'unit_based' };
            form.setData(prev => ({ ...prev, sale_type: map[val] ?? '', size_id: '', quantity: '' }));
          }}
        />
      )}

      {/* الحجم */}
      {needsSize && (
        <ModernSelect label="الحجم" options={sizes.map(s => ({ label: s.label, meta: s.value }))}
          defaultValue=""
          onSelect={val => form.setData('size_id', String(sizes.find(s => s.label === val)?.id ?? ''))}
        />
      )}

      {/* الكمية */}
      {needsQty && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الكمية</label>
          <input type="number" min="0.01" step="0.01" value={form.data.quantity}
            onChange={e => form.setData('quantity', e.target.value)}
            placeholder="أدخل الكمية" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
        </div>
      )}

      {/* معاينة السعر */}
      {previewPrice() && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] bg-primary/5 border border-primary/20">
          <span className="text-xs font-bold text-slate-500 dark:text-white/50">سعر الوحدة:</span>
          <span className="font-black text-primary">{previewPrice()} د</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={form.processing || !form.data.product_id || !form.data.sale_type}
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
function AddPaymentForm({ invoiceId, dueAmount, paymentMethods, onClose }: {
  invoiceId: number; dueAmount: string; paymentMethods: PaymentMethod[];
  onClose: () => void;
}) {
  const form = useForm({ payment_method_id: '', amount: dueAmount, notes: '' });

  function submit() {
    form.post(`/invoices/${invoiceId}/payments`, { onSuccess: onClose });
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
export default function InvoiceShow({ invoice, products, sizes, paymentMethods, flash }: Props) {
  const [showAddItem, setShowAddItem]       = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [deleteItemId, setDeleteItemId]     = useState<number | null>(null);

  function removeItem(itemId: number) {
    router.delete(`/invoices/${invoice.id}/items/${itemId}`, { onSuccess: () => setDeleteItemId(null) });
  }

  const isPaid = invoice.payment_status === 'paid';

  return (
    <AppShell pageTitle="تفاصيل الفاتورة">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/invoices" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← الفواتير</Link>
            <span className="text-slate-300 dark:text-white/20">/</span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة #{invoice.id}</h1>
            <span className={`text-xs font-black px-3 py-1 rounded-[8px] ${statusConfig[invoice.payment_status].cls}`}>
              {statusConfig[invoice.payment_status].label}
            </span>
          </div>
        </div>

        {/* Flash */}
        {flash?.success && <div className="px-5 py-3 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">{flash.success}</div>}
        {flash?.error   && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Items */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Invoice Info */}
            <SpatialCard title="معلومات الفاتورة" hideHeader>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'العميل',    value: invoice.customer?.name ?? 'زبون نقدي' },
                  { label: 'نوع العميل', value: invoice.customer_type === 'vip' ? 'VIP' : 'عادي' },
                  { label: 'البائع',    value: invoice.user.name },
                  { label: 'التاريخ',   value: new Date(invoice.created_at).toLocaleDateString('ar') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                    <span className="font-black text-slate-800 dark:text-white text-sm">{value}</span>
                  </div>
                ))}
              </div>
              {invoice.notes && (
                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-white/50 px-1">{invoice.notes}</p>
              )}
            </SpatialCard>

            {/* Items */}
            <SpatialCard title={`المنتجات (${invoice.items.length})`} icon={<Package className="w-4 h-4" />}
              action={!isPaid && (
                <button onClick={() => setShowAddItem(true)}
                  className="spatial-button flex items-center gap-1.5 px-4 h-9 text-sm">
                  <Plus className="w-4 h-4" /> إضافة
                </button>
              )}
            >
              {showAddItem && (
                <div className="mb-5 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                  <AddItemForm invoice={invoice} products={products} sizes={sizes} onClose={() => setShowAddItem(false)} />
                </div>
              )}

              {invoice.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-white/30 gap-2">
                  <span className="text-3xl">📦</span>
                  <span className="font-bold text-sm">لا توجد منتجات بعد</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {invoice.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{item.product.name}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-[6px]">
                            {saleTypeLabels[item.sale_type]}
                          </span>
                          {item.size && <span className="text-xs font-bold text-primary">{item.size.label}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">الكمية: {item.quantity}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">سعر الوحدة: {item.unit_price}</span>
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
                  { label: 'الإجمالي',  value: invoice.total,       cls: 'text-slate-800 dark:text-white' },
                  { label: 'المدفوع',   value: invoice.paid_amount,  cls: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'المتبقي',   value: invoice.due_amount,   cls: +invoice.due_amount > 0 ? 'text-red-500' : 'text-slate-400 dark:text-white/30' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">{label}</span>
                    <span className={`font-black text-lg ${cls}`}>{value} د</span>
                  </div>
                ))}
              </div>
            </SpatialCard>

            {/* Payments */}
            <SpatialCard title="الدفعات" icon={<CreditCard className="w-4 h-4" />}
              action={!isPaid && +invoice.due_amount > 0 && (
                <button onClick={() => setShowAddPayment(true)}
                  className="spatial-button flex items-center gap-1.5 px-4 h-9 text-sm">
                  <Plus className="w-4 h-4" /> دفعة
                </button>
              )}
            >
              {showAddPayment && (
                <div className="mb-4 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                  <AddPaymentForm invoiceId={invoice.id} dueAmount={invoice.due_amount}
                    paymentMethods={paymentMethods} onClose={() => setShowAddPayment(false)} />
                </div>
              )}

              {invoice.payments.length === 0 ? (
                <p className="text-sm font-bold text-slate-400 dark:text-white/30 text-center py-4">لا توجد دفعات</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {invoice.payments.map(payment => (
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

        <ConfirmModal isOpen={deleteItemId !== null} title="حذف المنتج" message="هل أنت متأكد؟ سيُعاد المخزون تلقائياً."
          onConfirm={() => deleteItemId && removeItem(deleteItemId)} onCancel={() => setDeleteItemId(null)} />

      </div>
    </AppShell>
  );
}
