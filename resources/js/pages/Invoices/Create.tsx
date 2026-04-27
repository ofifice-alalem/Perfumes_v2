import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Trash2, Check, X, Package, ShoppingCart, CreditCard, Zap, Settings } from 'lucide-react';

interface Customer      { id: number; name: string; }
interface Size          { id: number; label: string; value: string; }
interface Category      { id: number; name: string; unit: string; }
interface ProductPrice  { price_per_unit_regular: string; price_per_unit_vip: string; full_bottle_regular: string | null; full_bottle_vip: string | null; }
interface OriginalDetail { bottle_volume: string; }
interface TierPrice     { size_id: number; price_regular: string; price_vip: string; }
interface PriceTier     { id: number; name: string; tier_prices?: TierPrice[]; }
interface Product {
  id: number; name: string; stock: string; selling_type: string;
  category: Category; price_tier: PriceTier | null;
  product_price: ProductPrice | null;
  original_perfume_detail: OriginalDetail | null;
}
interface PaymentMethod { id: number; name: string; }

interface Props {
  customers: Customer[];
  products: Product[];
  sizes: Size[];
  paymentMethods: PaymentMethod[];
  flash?: { success?: string; error?: string };
}

interface CartItem {
  product_id: number; product_name: string; sale_type: string;
  size_id: string; size_label: string; quantity: string;
  unit_price: number; line_total: number;
}

interface PaymentEntry {
  payment_method_id: string;
  method_name: string;
  amount: string;
}

// ── Dummy quick products (مظهر فقط) ──────────────────────────────────────────
const QUICK_PRODUCTS = [
  { id: 'q1', name: 'مبخرة صغيرة', emoji: '🪔', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-700 dark:text-amber-400' },
  { id: 'q2', name: 'بخور عود',    emoji: '🌿', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' },
  { id: 'q3', name: 'وشق فاخر',   emoji: '✨', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-700 dark:text-purple-400' },
  { id: 'q4', name: 'مبخرة كبيرة', emoji: '🏺', color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-700 dark:text-rose-400' },
  { id: 'q5', name: 'بخور هندي',   emoji: '🌸', color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-700 dark:text-pink-400' },
  { id: 'q6', name: 'عود طبيعي',   emoji: '🪵', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-700 dark:text-orange-400' },
  { id: 'q7', name: 'بخور مسك',    emoji: '💨', color: 'from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-700 dark:text-sky-400' },
  { id: 'q8', name: 'وشق ورد',     emoji: '🌹', color: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-700 dark:text-red-400' },
  { id: 'q9', name: 'مبخرة فضية',  emoji: '🥈', color: 'from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-700 dark:text-slate-400' },
];

const saleTypeLabels: Record<string, string> = {
  tier_decant: 'زيتي - تقسيم', unit_decant: 'أصلي - تقسيم',
  full_bottle: 'عبوة كاملة',   unit_based:  'بالوحدة',
};

function resolvePrice(product: Product, saleType: string, sizeId: string, isVip: boolean): number {
  const pp = product.product_price;
  switch (saleType) {
    case 'tier_decant': {
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
    case 'unit_decant': return sizes.find(s => s.id === +sizeId)?.value ? +sizes.find(s => s.id === +sizeId)!.value : 0;
    case 'full_bottle': return product.original_perfume_detail ? +product.original_perfume_detail.bottle_volume : 0;
    case 'unit_based':  return +manualQty || 0;
    default: return 0;
  }
}

function resolveLineTotal(saleType: string, price: number, quantity: number): number {
  if (saleType === 'full_bottle' || saleType === 'tier_decant') return price;
  return price * quantity;
}

export default function InvoicesCreate({ customers, products, sizes, paymentMethods, flash }: Props) {
  // Invoice state
  const [customerId,   setCustomerId]   = useState('');
  const [customerType, setCustomerType] = useState<'regular'|'vip'>('regular');
  const [notes,        setNotes]        = useState('');
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [payments,     setPayments]     = useState<PaymentEntry[]>([]);
  const [processing,   setProcessing]   = useState(false);

  // Add item state
  const [selProduct,  setSelProduct]  = useState('');
  const [selSaleType, setSelSaleType] = useState('');
  const [selSize,     setSelSize]     = useState('');
  const [selQty,      setSelQty]      = useState('');

  // Add payment state
  const [selMethod, setSelMethod] = useState('');
  const [selAmount, setSelAmount] = useState('');

  const isVip          = customerType === 'vip';
  const isCashCustomer = !customerId;
  const selectedProduct = products.find(p => p.id === +selProduct);
  const isTier     = selectedProduct?.selling_type === 'tier_based';
  const isML       = selectedProduct?.category.unit === 'ml';
  const isOriginal = isML && !isTier;
  const needsSize  = isTier || selSaleType === 'unit_decant';
  const needsQty   = selSaleType === 'unit_based';
  const effectiveSaleType = isTier ? 'tier_decant' : selSaleType;

  const saleTypeOptions = () => {
    if (!selectedProduct) return [];
    if (isTier)     return [];
    if (isOriginal) return [{ label: 'أصلي - تقسيم', badge: 'unit_decant' }, { label: 'عبوة كاملة', badge: 'full_bottle' }];
    return [{ label: 'بالوحدة', badge: 'unit_based' }];
  };
  const saleTypeMap: Record<string, string> = { 'أصلي - تقسيم': 'unit_decant', 'عبوة كاملة': 'full_bottle', 'بالوحدة': 'unit_based' };

  const previewPrice = selectedProduct && (isTier ? selSize : selSaleType)
    ? resolvePrice(selectedProduct, effectiveSaleType, selSize, isVip) : null;
  const previewQty = selectedProduct && (isTier ? selSize : selSaleType)
    ? resolveQuantity(selectedProduct, effectiveSaleType, selSize, selQty, sizes) : null;
  const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0
    ? resolveLineTotal(effectiveSaleType, previewPrice, previewQty) : null;

  const total     = cart.reduce((s, i) => s + i.line_total, 0);
  const totalPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0);
  const remaining = total - totalPaid;

  function addToCart() {
    if (!selectedProduct || (!isTier && !selSaleType)) return;
    const qty   = resolveQuantity(selectedProduct, effectiveSaleType, selSize, selQty, sizes);
    const price = resolvePrice(selectedProduct, effectiveSaleType, selSize, isVip);
    if (!qty || !price) return;
    const size = sizes.find(s => s.id === +selSize);
    setCart(prev => [...prev, {
      product_id: selectedProduct.id, product_name: selectedProduct.name,
      sale_type: effectiveSaleType, size_id: selSize, size_label: size?.label ?? '',
      quantity: String(qty), unit_price: price,
      line_total: resolveLineTotal(effectiveSaleType, price, qty),
    }]);
    setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('');
  }

  function addPayment() {
    if (!selMethod || !selAmount || +selAmount <= 0) return;
    const method = paymentMethods.find(m => m.id === +selMethod);
    if (!method) return;
    setPayments(prev => [...prev, { payment_method_id: selMethod, method_name: method.name, amount: selAmount }]);
    setSelMethod(''); setSelAmount('');
  }

  function submit() {
    if (cart.length === 0) return;
    if (isCashCustomer && Math.abs(remaining) > 0.01) return;
    setProcessing(true);
    router.post('/invoices/with-items', {
      customer_id: customerId || null,
      customer_type: customerType,
      notes,
      items: cart,
      payments,
    }, { onFinish: () => setProcessing(false) });
  }

  const customerOptions = [
    { label: 'زبون نقدي', badge: 'نقدي' },
    ...customers.filter(c => c.id !== 1).map(c => ({ label: c.name, badge: '' })),
  ];

  const canAdd = selectedProduct && (isTier ? (!needsSize || selSize) : selSaleType) && (!needsSize || selSize) && (!needsQty || selQty);

  return (
    <AppShell pageTitle="فاتورة جديدة">
      <div className="flex flex-col gap-4 h-full">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">← الفواتير</Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة جديدة</h1>
        </div>

        {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">

          {/* ── Left: Input + Quick Products ── */}
          <div className="flex flex-col gap-4">

            {/* بيانات الفاتورة */}
            <SpatialCard title="بيانات الفاتورة">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <ModernSelect label="العميل" options={customerOptions} defaultValue="زبون نقدي"
                    onSelect={val => {
                      const c = customers.find(c => c.name === val);
                      setCustomerId(c && c.id !== 1 ? String(c.id) : '');
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">نوع العميل</label>
                  <div className="flex gap-2 h-14">
                    {(['regular', 'vip'] as const).map(type => (
                      <button key={type} onClick={() => setCustomerType(type)}
                        className={`flex-1 rounded-[20px] border-2 transition-all font-bold text-sm ${
                          customerType === type ? 'border-primary bg-primary/10 text-primary' : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50'
                        }`}>
                        {type === 'regular' ? 'عادي' : '⭐ VIP'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SpatialCard>

            {/* إضافة منتج */}
            <SpatialCard title="إضافة منتج" icon={<Package className="w-4 h-4" />}>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <ModernSelect label="نوع البيع" options={saleTypeOptions()} defaultValue=""
                      onSelect={val => { setSelSaleType(saleTypeMap[val] ?? ''); setSelSize(''); setSelQty(''); }}
                    />
                  )}
                  {needsSize && (
                    <ModernSelect label="الحجم" options={sizes.map(s => ({ label: s.label, meta: s.value }))} defaultValue=""
                      onSelect={val => setSelSize(String(sizes.find(s => s.label === val)?.id ?? ''))}
                    />
                  )}
                  {needsQty && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الكمية</label>
                      <input type="number" min="0.01" step="0.01" value={selQty}
                        onChange={e => setSelQty(e.target.value)}
                        placeholder="أدخل الكمية" className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                    </div>
                  )}
                </div>

                {/* معاينة + زر الإضافة */}
                <div className="flex items-center gap-3">
                  {previewTotal !== null && previewQty !== null && previewQty > 0 && (
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {[
                        { label: 'سعر الوحدة', value: `${previewPrice} د` },
                        { label: 'الكمية',     value: effectiveSaleType === 'full_bottle' ? `${previewQty} ml` : previewQty },
                        { label: 'الإجمالي',   value: `${previewTotal?.toFixed(2)} د` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5 p-3 rounded-[14px] bg-primary/5 border border-primary/20">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">{label}</span>
                          <span className="font-black text-primary text-sm">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={addToCart} disabled={!canAdd}
                    className="spatial-button flex items-center gap-2 px-6 h-12 text-sm disabled:opacity-40 shrink-0">
                    <Plus className="w-4 h-4" /> إضافة
                  </button>
                </div>
              </div>
            </SpatialCard>

            {/* ⚡ منتجات سريعة */}
            <SpatialCard title="منتجات سريعة" icon={<Zap className="w-4 h-4" />}
              action={
                <button className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 font-bold text-xs transition-all">
                  <Settings className="w-3.5 h-3.5" /> تخصيص
                </button>
              }
            >
              <div className="grid grid-cols-3 gap-3">
                {QUICK_PRODUCTS.map(qp => (
                  <button key={qp.id}
                    className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] bg-gradient-to-br border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${qp.color}`}
                  >
                    <span className="text-2xl">{qp.emoji}</span>
                    <span className="text-xs font-black text-center leading-tight">{qp.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-400 dark:text-white/30 text-center mt-3">
                اضغط على أي منتج لإضافته مباشرة للفاتورة
              </p>
            </SpatialCard>

          </div>

          {/* ── Right: الفاتورة (sticky) ── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-4">

            {/* قائمة المنتجات */}
            <SpatialCard title={`المنتجات ${cart.length > 0 ? `(${cart.length})` : ''}`} icon={<ShoppingCart className="w-4 h-4" />}>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 dark:text-white/30">
                  <ShoppingCart className="w-8 h-8 opacity-30" />
                  <span className="font-bold text-sm">لا توجد منتجات بعد</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{item.product_name}</span>
                          {item.size_label && <span className="text-xs font-bold text-primary">{item.size_label}</span>}
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40">{saleTypeLabels[item.sale_type]}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{item.line_total.toFixed(2)} د</span>
                        <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                          className="w-7 h-7 rounded-[8px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SpatialCard>

            {/* الدفع */}
            {cart.length > 0 && (
              <SpatialCard title="الدفع" icon={<CreditCard className="w-4 h-4" />}>
                <div className="flex flex-col gap-4">

                  {/* الأرقام */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'الإجمالي', value: `${total.toFixed(2)} د`,     cls: 'text-slate-800 dark:text-white' },
                      { label: 'المدفوع',  value: `${totalPaid.toFixed(2)} د`, cls: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'المتبقي',  value: `${remaining.toFixed(2)} د`, cls: remaining > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400' },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex flex-col gap-1 p-3 rounded-[14px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">{label}</span>
                        <span className={`font-black text-sm ${cls}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {isCashCustomer && remaining > 0.01 && (
                    <div className="px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                      ⚠️ زبون نقدي — يجب الدفع الكامل
                    </div>
                  )}

                  {/* إضافة دفعة */}
                  {remaining > 0.01 && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <ModernSelect label="" options={paymentMethods.map(m => ({ label: m.name }))} defaultValue="" placeholder="وسيلة الدفع"
                          onSelect={val => setSelMethod(String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
                        />
                      </div>
                      <div className="flex flex-col gap-2 w-28">
                        <input type="number" min="0.01" step="0.01" value={selAmount}
                          onChange={e => setSelAmount(e.target.value)}
                          placeholder={remaining.toFixed(2)}
                          className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                      </div>
                      <div className="flex items-end">
                        <button onClick={addPayment} disabled={!selMethod || !selAmount}
                          className="spatial-button flex items-center gap-1 px-4 h-14 text-sm disabled:opacity-40">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* قائمة الدفعات */}
                  {payments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-[14px] bg-emerald-500/5 border border-emerald-500/20">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{p.method_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{p.amount} د</span>
                        <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))}
                          className="w-6 h-6 rounded-[6px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SpatialCard>
            )}

            {/* حفظ */}
            <div className="flex flex-col gap-2">
              <button onClick={submit}
                disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                className="spatial-button w-full flex items-center justify-center gap-2 h-13 text-sm disabled:opacity-40">
                <Check className="w-4 h-4" />
                {cart.length > 0 ? `حفظ الفاتورة — ${total.toFixed(2)} د` : 'حفظ الفاتورة'}
              </button>
              <Link href="/invoices"
                className="w-full flex items-center justify-center gap-2 h-10 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all">
                <X className="w-4 h-4" /> إلغاء
              </Link>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
