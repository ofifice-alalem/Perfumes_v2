import { useState, useEffect } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import { Plus, Trash2, Check, X, CreditCard, Package, Pencil, AlertCircle } from 'lucide-react';

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
  customerDebt: { total_debt: string; total_purchases: string } | null;
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
  paid:    { label: 'دفع مباشر كامل',  cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  partial: { label: 'دفع مباشر جزئي',  cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
  unpaid:  { label: 'بدون دفع مباشر',  cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20' },
};

// ── helpers (same as Create) ─────────────────────────────────────────────────
function resolvePrice(product: Product, saleType: string, sizeId: string, isVip: boolean): number {
  const pp = product.product_price;
  switch (saleType) {
    case 'tier_decant': {
      if (sizeId.startsWith('-custom-')) return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
      const tp = product.price_tier?.tier_prices?.find((t: any) => t.size_id === +sizeId);
      return tp ? +(isVip ? tp.price_vip : tp.price_regular) : 0;
    }
    case 'unit_decant': return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
    case 'full_bottle': return pp ? +(isVip ? (pp.full_bottle_vip ?? 0) : (pp.full_bottle_regular ?? 0)) : 0;
    case 'unit_based':  return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
    default: return 0;
  }
}
function resolveQuantity(product: Product, saleType: string, sizeId: string, manualQty: string, sizes: Size[]): number {
  switch (saleType) {
    case 'tier_decant':
    case 'unit_decant': {
      if (sizeId.startsWith('-custom-')) return +sizeId.replace('-custom-', '') || 0;
      return +(sizes.find(s => s.id === +sizeId)?.value ?? 0);
    }
    case 'full_bottle': return product.original_perfume_detail ? +product.original_perfume_detail.bottle_volume : 0;
    case 'unit_based':  return +manualQty || 0;
    default: return 0;
  }
}
function resolveLineTotal(saleType: string, price: number, quantity: number): number {
  return (saleType === 'full_bottle' || saleType === 'tier_decant') ? price : price * quantity;
}

// ── Add Item Form ─────────────────────────────────────────────────────────────
function AddItemForm({ invoice, products, sizes, onClose }: {
  invoice: Invoice; products: Product[]; sizes: Size[];
  onClose: () => void;
}) {
  const isVip = invoice.customer_type === 'vip';
  const [selProduct,  setSelProduct]  = useState('');
  const [selSaleType, setSelSaleType] = useState('');
  const [selSize,     setSelSize]     = useState('');
  const [selQty,      setSelQty]      = useState('1');
  const [processing,  setProcessing]  = useState(false);
  const [showNumberPad,    setShowNumberPad]    = useState(false);
  const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);

  const selectedProduct = products.find(p => p.id === +selProduct);
  const isTier     = selectedProduct?.selling_type === 'tier_based';
  const isOriginal = selectedProduct?.category.unit === 'ml' && !isTier;
  const needsSize  = isTier || selSaleType === 'unit_decant';
  const needsQty   = selSaleType === 'unit_based';
  const effectiveST = isTier ? 'tier_decant' : selSaleType;

  const saleTypeOptions = () => {
    if (!selectedProduct || isTier) return [];
    if (isOriginal) return [
      { label: 'أصلي - تقسيم', badge: 'unit_decant', description: 'بيع بالمليلتر حسب الحجم المطلوب', icon: '📊' },
      { label: 'عبوة كاملة',   badge: 'full_bottle', description: 'بيع العبوة بالكامل بحجمها الأصلي', icon: '🎁' },
    ];
    return [{ label: 'بالوحدة', badge: 'unit_based', description: 'بيع بالقطعة أو بالجرام', icon: '⚖️' }];
  };

  useEffect(() => {
    if (selectedProduct && !isTier && !selSaleType) {
      const opts = saleTypeOptions();
      if (opts.length === 1) setSelSaleType(opts[0].badge);
      else if (isOriginal) setSelSaleType('unit_decant');
      else setShowSaleTypeModal(true);
    }
  }, [selectedProduct]);

  const previewPrice = selectedProduct && (isTier ? selSize : selSaleType)
    ? resolvePrice(selectedProduct, effectiveST, selSize, isVip) : null;
  const previewQty = selectedProduct && (isTier ? selSize : selSaleType)
    ? resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes) : null;
  const previewCount = effectiveST === 'unit_based' ? 1 : (parseInt(selQty) || 1);
  const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0
    ? resolveLineTotal(effectiveST, previewPrice, previewQty) * (effectiveST === 'unit_based' ? 1 : previewCount)
    : null;

  const canAdd = selectedProduct && (isTier ? (!needsSize || selSize) : selSaleType) && (!needsSize || selSize) && (!needsQty || selQty);

  function submit() {
    if (!selectedProduct || (!isTier && !selSaleType)) return;
    setProcessing(true);
    const qty   = resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes);
    const price = resolvePrice(selectedProduct, effectiveST, selSize, isVip);
    const count = effectiveST === 'unit_based' ? 1 : (parseInt(selQty) || 1);
    const sizeObj = sizes.find(s => s.id === +selSize);
    const sizeLabel = selSize.startsWith('-custom-') ? `${selSize.replace('-custom-', '')} مل (مخصص)` : (sizeObj?.label ?? '');

    const items = effectiveST === 'unit_based'
      ? [{ product_id: selectedProduct.id, sale_type: effectiveST, size_id: selSize || null, quantity: qty, unit_price: price, line_total: resolveLineTotal(effectiveST, price, qty) }]
      : Array.from({ length: count }, () => ({ product_id: selectedProduct.id, sale_type: effectiveST, size_id: selSize || null, quantity: qty, unit_price: price, line_total: resolveLineTotal(effectiveST, price, qty) }));

    router.post(`/invoices/${invoice.id}/items`, { ...items[0], count: effectiveST === 'unit_based' ? 1 : count }, {
      onSuccess: () => { onClose(); },
      onFinish: () => setProcessing(false),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Product */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px]">
          <ModernSelect label="" placeholder="اختر المنتج..."
            options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `${p.stock}` }))}
            defaultValue=""
            onSelect={val => {
              const p = products.find(p => p.name === val);
              setSelProduct(p ? String(p.id) : '');
              setSelSaleType(''); setSelSize(''); setSelQty('1');
            }}
          />
        </div>
        {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
          <button onClick={() => setShowSaleTypeModal(true)}
            className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-44 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all">
            <span>{saleTypeOptions().find(o => o.badge === selSaleType)?.label || 'نوع البيع'}</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
        {selectedProduct && (isTier || selSaleType) && (
          <button
            onClick={() => { setShowNumberPad(true); }}
            className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-24 text-left cursor-pointer hover:border-primary/40 transition-all">
            {selQty || '1'}
          </button>
        )}
        {previewTotal !== null && previewQty !== null && previewQty > 0 && (
          <>
            <div className="flex items-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
              <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">سعر</span>
              <span className="font-black text-primary text-sm mr-1">{previewPrice} د</span>
            </div>
            <div className="flex items-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
              <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">إجمالي</span>
              <span className="font-black text-primary text-sm mr-1">{previewTotal.toFixed(2)} د</span>
            </div>
          </>
        )}
      </div>

      {needsSize && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <SizeSelect sizes={sizes} selectedSizeId={selSize} onSizeSelect={setSelSize}
              placeholder="الحجم" product={selectedProduct} isVip={isVip} />
          </div>
          <button onClick={submit} disabled={!canAdd || processing}
            className="spatial-button flex items-center gap-2 px-6 h-14 text-sm font-black disabled:opacity-40 shrink-0">
            <Plus className="w-5 h-5" /> إضافة
          </button>
        </div>
      )}

      {!needsSize && selectedProduct && (isTier || selSaleType) && (
        <div className="flex justify-between items-center">
          <button onClick={submit} disabled={!canAdd || processing}
            className="spatial-button flex items-center gap-2 px-6 h-14 text-sm font-black disabled:opacity-40">
            <Plus className="w-5 h-5" /> إضافة
          </button>
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
            <X className="w-4 h-4" /> إلغاء
          </button>
        </div>
      )}

      <SaleTypeModal isOpen={showSaleTypeModal} onClose={() => setShowSaleTypeModal(false)}
        onSelect={v => { setSelSaleType(v); setSelSize(''); setSelQty('1'); }}
        options={saleTypeOptions()} title="اختر نوع البيع" />

      <NumberPadModal isOpen={showNumberPad} onClose={() => setShowNumberPad(false)}
        onConfirm={v => setSelQty(v)} initialValue={selQty} title={needsQty ? 'الكمية' : 'العدد'} />
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
export default function InvoiceShow({ invoice, customerDebt, products, sizes, paymentMethods, flash }: Props) {
  const [showAddItem, setShowAddItem]       = useState(false);
  const [deleteItemId, setDeleteItemId]     = useState<number | null>(null);
  const [editingGroup, setEditingGroup]     = useState<{ itemId: number; count: number } | null>(null);
  const [showEditPad, setShowEditPad]       = useState(false);
  const [showDebtPayment, setShowDebtPayment] = useState(false);
  const [debtMethod, setDebtMethod]           = useState('');
  const [debtAmount, setDebtAmount]           = useState('');
  const [debtProcessing, setDebtProcessing]   = useState(false);
  const [showDebtPad, setShowDebtPad]         = useState(false);

  function removeItem(itemId: number) {
    router.delete(`/invoices/${invoice.id}/items/${itemId}`, { onSuccess: () => setDeleteItemId(null) });
  }

  function removeGroup(ids: number[]) {
    router.delete(`/invoices/${invoice.id}/items`, {
      data: { ids },
      onSuccess: () => setDeleteItemId(null),
    });
  }

  function updateCount(itemId: number, newCount: number) {
    router.patch(`/invoices/${invoice.id}/items/${itemId}/count`, { count: newCount }, {
      onSuccess: () => setEditingGroup(null),
    });
  }

  function submitDebtPayment() {
    if (!debtMethod || !debtAmount || !invoice.customer) return;
    setDebtProcessing(true);
    router.post('/payments', {
      customer_id:       invoice.customer.id,
      payment_method_id: debtMethod,
      amount:            debtAmount,
      notes:             `سداد دين — من فاتورة #${invoice.id}`,
    }, {
      onSuccess: () => { setShowDebtPayment(false); setDebtMethod(''); setDebtAmount(''); },
      onFinish:  () => setDebtProcessing(false),
    });
  }

  const isPaid = false; // التعديل مسموح دائماً — الدفع المباشر لا يُغلق الفاتورة

  const groupedItems = Object.values(
    invoice.items.reduce((acc, item) => {
      const key = `${item.product.id}-${item.sale_type}-${item.size?.id ?? 'none'}-${item.unit_price}`;
      if (acc[key]) {
        acc[key].count += 1;
        acc[key].totalLine += +item.line_total;
        acc[key].ids.push(item.id);
      } else {
        acc[key] = { item, count: 1, totalLine: +item.line_total, ids: [item.id] };
      }
      return acc;
    }, {} as Record<string, { item: InvoiceItem; count: number; totalLine: number; ids: number[] }>)
  );

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
                  {/* Header — desktop only */}
                  <div className="hidden sm:grid grid-cols-[60px_2fr_80px_90px_100px_88px] gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-black/3 dark:bg-white/3 rounded-[12px]">
                    <span className="text-center">عدد</span>
                    <span>المنتج</span>
                    <span className="text-center">حجم</span>
                    <span className="text-center">سعر الوحدة</span>
                    <span className="text-center">الإجمالي</span>
                    <span></span>
                  </div>
                  {groupedItems.map(({ item, count, totalLine, ids }) => (
                    <div key={ids.join('-')}>
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-[60px_2fr_80px_90px_100px_88px] gap-3 px-4 py-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 hover:border-primary/20 transition-all items-center">
                        <div className="flex items-center justify-center">
                          <span className="w-10 h-10 rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm">{count}</span>
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product.name}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">{saleTypeLabels[item.sale_type]}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          {item.size
                            ? <span className="text-xs font-black text-white bg-primary px-2.5 py-1 rounded-full">{item.size.label}</span>
                            : <span className="text-sm text-slate-400 dark:text-white/30">—</span>}
                        </div>
                        <div className="flex items-center justify-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{item.unit_price}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <span className="font-black text-slate-800 dark:text-white text-sm">{totalLine.toFixed(2)} د</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                              <button onClick={() => { setEditingGroup({ itemId: ids[0], count }); setShowEditPad(true); }}
                                className="w-9 h-9 rounded-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteItemId(ids[0])}
                                className="w-9 h-9 rounded-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                      </div>

                      {/* Mobile card */}
                      <div className="sm:hidden p-4 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        {/* Row 1: name + size */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-bold text-slate-800 dark:text-white text-sm flex-1 truncate">{item.product.name}</span>
                          {item.size && <span className="text-xs font-black text-white bg-primary px-2 py-0.5 rounded-full shrink-0">{item.size.label}</span>}
                        </div>
                        {/* Row 2: count + unit price + total */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">عدد</span>
                            <span className="font-black text-slate-800 dark:text-white text-sm">{count}</span>
                          </div>
                          <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">سعر الوحدة</span>
                            <span className="font-black text-slate-800 dark:text-white text-sm">{item.unit_price} د</span>
                          </div>
                          <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">السعر الكلي</span>
                            <span className="font-black text-primary text-sm">{totalLine.toFixed(2)} د</span>
                          </div>
                        </div>
                        {/* Row 3: type + edit + delete */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-white/50 bg-black/5 dark:bg-white/8 px-2.5 py-1 rounded-[8px]">{saleTypeLabels[item.sale_type]}</span>
                          <div className="flex items-center gap-2">
                              <button onClick={() => { setEditingGroup({ itemId: ids[0], count }); setShowEditPad(true); }}
                                className="w-10 h-10 rounded-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 flex items-center justify-center transition-all">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteItemId(ids[0])}
                                className="w-10 h-10 rounded-[10px] bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 flex items-center justify-center transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                        </div>
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
            <SpatialCard title="الدفعات المباشرة" icon={<CreditCard className="w-4 h-4" />}>
              {invoice.payments.length === 0 ? (
                <p className="text-sm font-bold text-slate-400 dark:text-white/30 text-center py-4">لا توجد دفعات مباشرة</p>
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

            {/* Customer Debt */}
            {customerDebt && invoice.customer && +customerDebt.total_debt > 0 && (
              <SpatialCard title="الوضع المالي للعميل" icon={<AlertCircle className="w-4 h-4" />}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">إجمالي المشتريات</span>
                    <span className="font-black text-slate-800 dark:text-white">{customerDebt.total_purchases} د</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">الدين الكلي</span>
                    <span className="font-black text-red-500 text-lg">{customerDebt.total_debt} د</span>
                  </div>

                  {!showDebtPayment ? (
                    <button onClick={() => { setShowDebtPayment(true); setDebtAmount(customerDebt.total_debt); }}
                      className="w-full h-11 rounded-[20px] flex items-center justify-center gap-2 font-black text-sm
                        bg-emerald-500/10 text-emerald-600 border border-emerald-500/20
                        hover:bg-emerald-500 hover:text-white hover:border-emerald-500
                        dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30
                        dark:hover:bg-emerald-500 dark:hover:text-white transition-all">
                      <CreditCard className="w-4 h-4" /> تسجيل دفعة
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                      <ModernSelect
                        label="وسيلة الدفع"
                        placeholder="اختر..."
                        options={paymentMethods.map(m => ({ label: m.name }))}
                        defaultValue=""
                        onSelect={val => setDebtMethod(String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
                      />
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ</label>
                        <button onClick={() => setShowDebtPad(true)}
                          className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold text-right cursor-pointer hover:border-primary/40 transition-all">
                          {debtAmount || <span className="text-slate-400 dark:text-white/30">{customerDebt.total_debt}</span>}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={submitDebtPayment}
                          disabled={debtProcessing || !debtMethod || !debtAmount}
                          className="flex-1 spatial-button h-11 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" /> تأكيد
                        </button>
                        <button onClick={() => { setShowDebtPayment(false); setDebtMethod(''); setDebtAmount(''); }}
                          className="px-4 h-11 rounded-[20px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </SpatialCard>
            )}
          </div>
        </div>

        <NumberPadModal isOpen={showEditPad}
          onClose={() => { setShowEditPad(false); setEditingGroup(null); }}
          onConfirm={v => editingGroup && updateCount(editingGroup.itemId, +v)}
          initialValue={String(editingGroup?.count ?? 1)}
          title="تعديل العدد" />

        <NumberPadModal isOpen={showDebtPad}
          onClose={() => setShowDebtPad(false)}
          onConfirm={v => {
            const max = customerDebt ? +customerDebt.total_debt : 0;
            setDebtAmount(max > 0 && +v > max ? String(max) : v);
          }}
          initialValue={debtAmount}
          title="مبلغ الدفعة" />

        <ConfirmModal isOpen={deleteItemId !== null} title="حذف المنتج" message="هل أنت متأكد؟ سيُعاد المخزون تلقائياً."
          onConfirm={() => {
            if (!deleteItemId) return;
            const group = groupedItems.find(g => g.ids.includes(deleteItemId));
            if (group) removeGroup(group.ids);
          }}
          onCancel={() => setDeleteItemId(null)} />

      </div>
    </AppShell>
  );
}
