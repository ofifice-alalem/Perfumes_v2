import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Trash2, Check, X, Package, ShoppingCart } from 'lucide-react';

interface Customer      { id: number; name: string; }
interface Size          { id: number; label: string; value: string; }
interface Category      { id: number; name: string; unit: string; }
interface ProductPrice  { price_per_unit_regular: string; price_per_unit_vip: string; full_bottle_regular: string | null; full_bottle_vip: string | null; }
interface OriginalDetail { bottle_volume: string; }
interface PriceTier     { id: number; name: string; tier_prices?: TierPrice[]; }
interface TierPrice     { size_id: number; price_regular: string; price_vip: string; }
interface Product {
  id: number; name: string; stock: string; selling_type: string;
  category: Category; price_tier: PriceTier | null;
  product_price: ProductPrice | null;
  original_perfume_detail: OriginalDetail | null;
}

interface Props {
  customers: Customer[];
  products: Product[];
  sizes: Size[];
  paymentMethods: { id: number; name: string }[];
  flash?: { success?: string; error?: string };
}

interface CartItem {
  product_id: number;
  product_name: string;
  sale_type: string;
  size_id: string;
  size_label: string;
  quantity: string;
  unit_price: number;
  line_total: number;
}

const saleTypeLabels: Record<string, string> = {
  tier_decant: 'زيتي - تقسيم',
  unit_decant: 'أصلي - تقسيم',
  full_bottle: 'عبوة كاملة',
  unit_based:  'بالوحدة',
};

function resolvePrice(product: Product, saleType: string, sizeId: string, isVip: boolean): number {
  const pp = product.product_price;
  switch (saleType) {
    case 'tier_decant': {
      const tp = product.price_tier?.tier_prices?.find((t: any) => t.size_id === +sizeId);
      return tp ? +(isVip ? tp.price_vip : tp.price_regular) : 0;
    }
    case 'unit_decant':
      return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
    case 'full_bottle':
      // سعر ثابت — لا يُضرب في الكمية
      return pp ? +(isVip ? (pp.full_bottle_vip ?? 0) : (pp.full_bottle_regular ?? 0)) : 0;
    case 'unit_based':
      return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
    default: return 0;
  }
}

function resolveQuantity(product: Product, saleType: string, sizeId: string, manualQty: string, sizes: Size[]): number {
  switch (saleType) {
    case 'tier_decant':
    case 'unit_decant': {
      const size = sizes.find(s => s.id === +sizeId);
      return size ? +size.value : 0;
    }
    case 'full_bottle':
      return product.original_perfume_detail ? +product.original_perfume_detail.bottle_volume : 0;
    case 'unit_based':
      return +manualQty || 0;
    default: return 0;
  }
}

function resolveLineTotal(saleType: string, price: number, quantity: number): number {
  // عبوة كاملة و تير ديكانت → سعر ثابت
  if (saleType === 'full_bottle' || saleType === 'tier_decant') return price;
  return price * quantity;
}

export default function InvoicesCreate({ customers, products, sizes, paymentMethods, flash }: Props) {
  const [customerId,   setCustomerId]   = useState('');
  const [customerType, setCustomerType] = useState<'regular'|'vip'>('regular');
  const [notes,        setNotes]        = useState('');
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [processing,   setProcessing]   = useState(false);

  // Add Item State
  const [selProduct,  setSelProduct]  = useState('');
  const [selSaleType, setSelSaleType] = useState('');
  const [selSize,     setSelSize]     = useState('');
  const [selQty,      setSelQty]      = useState('');

  const isVip = customerType === 'vip';
  const selectedProduct = products.find(p => p.id === +selProduct);
  const isTier     = selectedProduct?.selling_type === 'tier_based';
  const isML       = selectedProduct?.category.unit === 'ml';
  const isOriginal = isML && !isTier;
  const needsSize  = isTier || selSaleType === 'unit_decant';
  const needsQty   = selSaleType === 'unit_based';

  // عطر زيتي → tier_decant مباشرة
  const effectiveSaleType = isTier ? 'tier_decant' : selSaleType;

  const saleTypeOptions = () => {
    if (!selectedProduct) return [];
    if (isTier)     return []; // لا يظهر — tier_decant تلقائي
    if (isOriginal) return [{ label: 'أصلي - تقسيم', badge: 'unit_decant' }, { label: 'عبوة كاملة', badge: 'full_bottle' }];
    return [{ label: 'بالوحدة', badge: 'unit_based' }];
  };

  const saleTypeMap: Record<string, string> = { 'زيتي - تقسيم': 'tier_decant', 'أصلي - تقسيم': 'unit_decant', 'عبوة كاملة': 'full_bottle', 'بالوحدة': 'unit_based' };

  const previewPrice = selectedProduct && (isTier ? selSize : selSaleType)
    ? resolvePrice(selectedProduct, effectiveSaleType, selSize, isVip)
    : null;

  const previewQty = selectedProduct && (isTier ? selSize : selSaleType)
    ? resolveQuantity(selectedProduct, effectiveSaleType, selSize, selQty, sizes)
    : null;

  const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0
    ? resolveLineTotal(effectiveSaleType, previewPrice, previewQty)
    : null;

  function addToCart() {
    if (!selectedProduct || (!isTier && !selSaleType)) return;
    const qty   = resolveQuantity(selectedProduct, effectiveSaleType, selSize, selQty, sizes);
    const price = resolvePrice(selectedProduct, effectiveSaleType, selSize, isVip);
    if (!qty || !price) return;

    const size = sizes.find(s => s.id === +selSize);
    const lineTotal = resolveLineTotal(effectiveSaleType, price, qty);

    setCart(prev => [...prev, {
      product_id:   selectedProduct.id,
      product_name: selectedProduct.name,
      sale_type:    effectiveSaleType,
      size_id:      selSize,
      size_label:   size?.label ?? '',
      quantity:     String(qty),
      unit_price:   price,
      line_total:   lineTotal,
    }]);

    setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('');
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  const total = cart.reduce((sum, item) => sum + item.line_total, 0);

  function submit() {
    if (cart.length === 0) return;
    setProcessing(true);
    router.post('/invoices/with-items', {
      customer_id:   customerId || null,
      customer_type: customerType,
      notes,
      items: cart,
    }, {
      onFinish: () => setProcessing(false),
    });
  }

  const customerOptions = [
    { label: 'زبون نقدي', badge: 'نقدي' },
    ...customers.filter(c => c.id !== 1).map(c => ({ label: c.name, badge: '' })),
  ];

  return (
    <AppShell pageTitle="فاتورة جديدة">
      <div className="flex flex-col gap-6 pb-32 lg:pb-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← الفواتير</Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة جديدة</h1>
        </div>

        {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Products */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Add Product */}
            <SpatialCard title="إضافة منتج" icon={<Package className="w-4 h-4" />}>
              <div className="flex flex-col gap-4">
                <ModernSelect label="المنتج"
                  options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `${p.stock}` }))}
                  defaultValue=""
                  onSelect={val => {
                    const p = products.find(p => p.name === val);
                    setSelProduct(p ? String(p.id) : '');
                    setSelSaleType(''); setSelSize(''); setSelQty('');
                  }}
                />

                {selectedProduct && !isTier && saleTypeOptions().length > 0 && (
                  <ModernSelect label="نوع البيع" options={saleTypeOptions()}
                    defaultValue=""
                    onSelect={val => { setSelSaleType(saleTypeMap[val] ?? ''); setSelSize(''); setSelQty(''); }}
                  />
                )}

                {needsSize && (
                  <ModernSelect label="الحجم" options={sizes.map(s => ({ label: s.label, meta: s.value }))}
                    defaultValue=""
                    onSelect={val => setSelSize(String(sizes.find(s => s.label === val)?.id ?? ''))}
                  />
                )}

                {needsQty && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الكمية</label>
                    <input type="number" min="0.01" step="0.01" value={selQty}
                      onChange={e => setSelQty(e.target.value)}
                      placeholder="أدخل الكمية" className="spatial-input h-12 rounded-[16px] px-4 text-[15px] font-bold" />
                  </div>
                )}

                {previewPrice !== null && previewQty !== null && previewQty > 0 && previewTotal !== null && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: effectiveSaleType === 'full_bottle' ? 'سعر العبوة' : 'سعر الوحدة', value: `${previewPrice} د` },
                      { label: 'الكمية',      value: effectiveSaleType === 'full_bottle' ? `${previewQty} ml` : previewQty },
                      { label: 'الإجمالي',    value: `${previewTotal.toFixed(2)} د` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-primary/5 border border-primary/20">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">{label}</span>
                        <span className="font-black text-primary text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={addToCart}
                  disabled={!selectedProduct || (!isTier && !selSaleType) || (needsSize && !selSize) || (needsQty && !selQty)}
                  className="spatial-button flex items-center justify-center gap-2 h-11 text-sm disabled:opacity-40">
                  <Plus className="w-4 h-4" /> إضافة للفاتورة
                </button>
              </div>
            </SpatialCard>

            {/* Cart */}
            {cart.length > 0 && (
              <SpatialCard title={`المنتجات المضافة (${cart.length})`} icon={<ShoppingCart className="w-4 h-4" />}>
                <div className="flex flex-col gap-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{item.product_name}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-[6px]">
                            {saleTypeLabels[item.sale_type]}
                          </span>
                          {item.size_label && <span className="text-xs font-bold text-primary">{item.size_label}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">الكمية: {item.quantity}</span>
                          <span className="text-xs font-bold text-slate-400 dark:text-white/40">سعر الوحدة: {item.unit_price}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{item.line_total.toFixed(2)} د</span>
                        <button onClick={() => removeFromCart(idx)}
                          className="w-8 h-8 rounded-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SpatialCard>
            )}
          </div>

          {/* Right — Customer + Summary */}
          <div className="flex flex-col gap-4">

            {/* Customer */}
            <SpatialCard title="بيانات الفاتورة">
              <div className="flex flex-col gap-4">
                <ModernSelect label="العميل" options={customerOptions}
                  defaultValue="زبون نقدي"
                  onSelect={val => {
                    const c = customers.find(c => c.name === val);
                    setCustomerId(c ? String(c.id) : '');
                  }}
                />

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">نوع العميل</label>
                  <div className="flex gap-2">
                    {(['regular', 'vip'] as const).map(type => (
                      <button key={type} onClick={() => setCustomerType(type)}
                        className={`flex-1 h-10 rounded-[14px] border-2 transition-all font-bold text-sm ${
                          customerType === type
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50'
                        }`}>
                        {type === 'regular' ? 'عادي' : 'VIP'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="اختياري..." rows={2}
                    className="spatial-input rounded-[16px] px-4 py-3 text-[14px] font-bold resize-none" />
                </div>
              </div>
            </SpatialCard>

            {/* Summary */}
            {cart.length > 0 && (
              <SpatialCard title="الملخص">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">عدد المنتجات</span>
                    <span className="font-black text-slate-800 dark:text-white">{cart.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/50">الإجمالي</span>
                    <span className="font-black text-xl text-primary">{total.toFixed(2)} د</span>
                  </div>

                  <button onClick={submit} disabled={processing || cart.length === 0}
                    className="spatial-button w-full flex items-center justify-center gap-2 h-12 text-sm mt-2 disabled:opacity-40">
                    <Check className="w-4 h-4" /> حفظ الفاتورة
                  </button>
                  <Link href="/invoices"
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                    <X className="w-4 h-4" /> إلغاء
                  </Link>
                </div>
              </SpatialCard>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
