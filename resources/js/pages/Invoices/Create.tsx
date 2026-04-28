import { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, X, Package, ShoppingCart, CreditCard, Zap, Settings, User, ChevronLeft, Pause, Play, Clock } from 'lucide-react';

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
  customers: Customer[]; products: Product[]; sizes: Size[];
  paymentMethods: PaymentMethod[]; flash?: { success?: string; error?: string };
}
interface CartItem {
  product_id: number; product_name: string; sale_type: string;
  size_id: string; size_label: string; quantity: string;
  unit_price: number; line_total: number;
}
interface PaymentEntry { payment_method_id: string; method_name: string; amount: string; }

// Hold Invoice Interface
interface HoldInvoice {
  id: string;
  customerId: string;
  customerType: 'regular' | 'vip';
  customerName: string;
  notes: string;
  cart: CartItem[];
  payments: PaymentEntry[];
  timestamp: number;
  total: number;
}

const QUICK_PRODUCTS = [
  { id: 'q1', name: 'مبخرة صغيرة', emoji: '🪔', color: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-700 dark:text-amber-300' },
  { id: 'q2', name: 'بخور عود',    emoji: '🌿', color: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  { id: 'q3', name: 'وشق فاخر',   emoji: '✨', color: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-700 dark:text-purple-300' },
  { id: 'q4', name: 'مبخرة كبيرة', emoji: '🏺', color: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-700 dark:text-rose-300' },
  { id: 'q5', name: 'بخور هندي',   emoji: '🌸', color: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20 text-pink-700 dark:text-pink-300' },
  { id: 'q6', name: 'عود طبيعي',   emoji: '🪵', color: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 text-orange-700 dark:text-orange-300' },
  { id: 'q7', name: 'بخور مسك',    emoji: '💨', color: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20 text-sky-700 dark:text-sky-300' },
  { id: 'q8', name: 'وشق ورد',     emoji: '🌹', color: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-700 dark:text-red-300' },
  { id: 'q9', name: 'مبخرة فضية',  emoji: '🥈', color: 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/20 text-slate-700 dark:text-slate-300' },
];

const saleTypeLabels: Record<string, string> = {
  tier_decant: 'زيتي', unit_decant: 'أصلي - تقسيم',
  full_bottle: 'عبوة كاملة', unit_based: 'بالوحدة',
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
    case 'unit_decant': return +(sizes.find(s => s.id === +sizeId)?.value ?? 0);
    case 'full_bottle': return product.original_perfume_detail ? +product.original_perfume_detail.bottle_volume : 0;
    case 'unit_based':  return +manualQty || 0;
    default: return 0;
  }
}
function resolveLineTotal(saleType: string, price: number, quantity: number): number {
  return (saleType === 'full_bottle' || saleType === 'tier_decant') ? price : price * quantity;
}

export default function InvoicesCreate({ customers, products, sizes, paymentMethods, flash }: Props) {
  const [customerId,   setCustomerId]   = useState('');
  const [customerType, setCustomerType] = useState<'regular'|'vip'>('regular');
  const [notes,        setNotes]        = useState('');
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [payments,     setPayments]     = useState<PaymentEntry[]>([]);
  const [processing,   setProcessing]   = useState(false);
  const [selProduct,   setSelProduct]   = useState('');
  const [selSaleType,  setSelSaleType]  = useState('');
  const [selSize,      setSelSize]      = useState('');
  const [selQty,       setSelQty]       = useState('');
  const [selMethod,    setSelMethod]    = useState('');
  const [selAmount,    setSelAmount]    = useState('');
  const [editingPayment, setEditingPayment] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('');
  
  // Hold invoices state
  const [holdInvoices, setHoldInvoices] = useState<HoldInvoice[]>([]);
  const [showHoldList, setShowHoldList] = useState(false);
  
  // Number pad modal state
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [numberPadTitle, setNumberPadTitle] = useState('');
  const [numberPadInitialValue, setNumberPadInitialValue] = useState('');
  const [numberPadCallback, setNumberPadCallback] = useState<((value: string) => void) | null>(null);

  // Load hold invoices from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('holdInvoices');
    if (saved) {
      try {
        setHoldInvoices(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse hold invoices:', e);
      }
    }
  }, []);

  // Save hold invoices to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('holdInvoices', JSON.stringify(holdInvoices));
  }, [holdInvoices]);

  const isVip           = customerType === 'vip';
  const isCashCustomer  = !customerId;
  const selectedProduct = products.find(p => p.id === +selProduct);
  const isTier          = selectedProduct?.selling_type === 'tier_based';
  const isOriginal      = selectedProduct?.category.unit === 'ml' && !isTier;
  const needsSize       = isTier || selSaleType === 'unit_decant';
  const needsQty        = selSaleType === 'unit_based';
  const effectiveST     = isTier ? 'tier_decant' : selSaleType;

  const saleTypeOptions = () => {
    if (!selectedProduct || isTier) return [];
    if (isOriginal) return [{ label: 'أصلي - تقسيم', badge: 'unit_decant' }, { label: 'عبوة كاملة', badge: 'full_bottle' }];
    return [{ label: 'بالوحدة', badge: 'unit_based' }];
  };
  const saleTypeMap: Record<string, string> = { 'أصلي - تقسيم': 'unit_decant', 'عبوة كاملة': 'full_bottle', 'بالوحدة': 'unit_based' };

  const previewPrice = selectedProduct && (isTier ? selSize : selSaleType) ? resolvePrice(selectedProduct, effectiveST, selSize, isVip) : null;
  const previewQty   = selectedProduct && (isTier ? selSize : selSaleType) ? resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes) : null;
  const previewCount = effectiveST === 'unit_based' ? 1 : (parseInt(selQty) || 1);
  const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0 ? 
    (effectiveST === 'unit_based' ? 
      resolveLineTotal(effectiveST, previewPrice, previewQty) : 
      resolveLineTotal(effectiveST, previewPrice, previewQty) * previewCount
    ) : null;

  const total     = cart.reduce((s, i) => s + i.line_total, 0);
  const totalPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0);
  const remaining = total - totalPaid;
  const canAdd    = selectedProduct && (isTier ? (!needsSize || selSize) : selSaleType) && (!needsSize || selSize) && (!needsQty || selQty);

  function addToCart() {
    if (!selectedProduct || (!isTier && !selSaleType)) return;
    
    // For unit_based products, use selQty as the actual quantity, not count
    if (effectiveST === 'unit_based') {
      const qty = +selQty || 0;
      const price = resolvePrice(selectedProduct, effectiveST, selSize, isVip);
      if (!qty || !price) return;
      
      const newItem = {
        product_id: selectedProduct.id, product_name: selectedProduct.name,
        sale_type: effectiveST, size_id: selSize, size_label: '',
        quantity: String(qty), unit_price: price,
        line_total: resolveLineTotal(effectiveST, price, qty),
      };
      
      setCart(prev => {
        const newCart = [...prev, newItem];
        const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
        
        // Auto-add payment for the new total (only if no payments exist yet)
        if (prev.length === 0 && paymentMethods.length > 0) {
          const cardMethod = paymentMethods.find(m => m.name.includes('بطاقة') || m.name.toLowerCase().includes('card'));
          const defaultMethod = cardMethod || paymentMethods[0];
          
          setTimeout(() => {
            setPayments([{
              payment_method_id: String(defaultMethod.id),
              method_name: defaultMethod.name,
              amount: newTotal.toFixed(2)
            }]);
          }, 0);
        } else if (prev.length > 0 && payments.length === 1) {
          // Update existing single payment
          setTimeout(() => {
            setPayments(prevPayments => [
              {
                ...prevPayments[0],
                amount: newTotal.toFixed(2)
              }
            ]);
          }, 0);
        }
        
        return newCart;
      });
    } else {
      // For other products (tier_decant, unit_decant, full_bottle), use selQty as count
      const qty = resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes);
      const price = resolvePrice(selectedProduct, effectiveST, selSize, isVip);
      if (!qty || !price) return;
      const size = sizes.find(s => s.id === +selSize);
      
      // Get the count (how many times to add this item)
      const count = parseInt(selQty) || 1;
      
      const newItems = [];
      for (let i = 0; i < count; i++) {
        const newItem = {
          product_id: selectedProduct.id, product_name: selectedProduct.name,
          sale_type: effectiveST, size_id: selSize, size_label: size?.label ?? '',
          quantity: String(qty), unit_price: price,
          line_total: resolveLineTotal(effectiveST, price, qty),
        };
        newItems.push(newItem);
      }
      
      setCart(prev => {
        const newCart = [...prev, ...newItems];
        const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
        
        // Auto-add payment for the new total (only if no payments exist yet)
        if (prev.length === 0 && paymentMethods.length > 0) {
          const cardMethod = paymentMethods.find(m => m.name.includes('بطاقة') || m.name.toLowerCase().includes('card'));
          const defaultMethod = cardMethod || paymentMethods[0];
          
          setTimeout(() => {
            setPayments([{
              payment_method_id: String(defaultMethod.id),
              method_name: defaultMethod.name,
              amount: newTotal.toFixed(2)
            }]);
          }, 0);
        } else if (prev.length > 0 && payments.length === 1) {
          // Update existing single payment
          setTimeout(() => {
            setPayments(prevPayments => [
              {
                ...prevPayments[0],
                amount: newTotal.toFixed(2)
              }
            ]);
          }, 0);
        }
        
        return newCart;
      });
    }
    
    setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('');
  }

  function addPayment() {
    if (!selMethod || !selAmount || +selAmount <= 0) return;
    
    // Check if total payments would exceed invoice total
    const currentPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0);
    if (currentPaid + (+selAmount) > total) {
      alert(`المبلغ يتجاوز إجمالي الفاتورة. المتاح: ${(total - currentPaid).toFixed(2)} د`);
      return;
    }
    
    const method = paymentMethods.find(m => m.id === +selMethod);
    if (!method) return;
    setPayments(prev => [...prev, { payment_method_id: selMethod, method_name: method.name, amount: selAmount }]);
    setSelMethod(''); setSelAmount('');
  }

  function startEditPayment(idx: number) {
    const payment = payments[idx];
    setEditingPayment(idx);
    setEditAmount(payment.amount);
    setEditMethod(payment.payment_method_id);
  }

  function saveEditPayment(idx: number) {
    if (!editMethod || !editAmount || +editAmount <= 0) return;
    
    // Check if edited payment would exceed total
    const otherPayments = payments.filter((_, i) => i !== idx);
    const otherPaid = otherPayments.reduce((s, p) => s + (+p.amount || 0), 0);
    if (otherPaid + (+editAmount) > total) {
      alert(`المبلغ يتجاوز إجمالي الفاتورة. المتاح: ${(total - otherPaid).toFixed(2)} د`);
      return;
    }
    
    const method = paymentMethods.find(m => m.id === +editMethod);
    if (!method) return;
    
    setPayments(prev => prev.map((p, i) => i === idx ? {
      payment_method_id: editMethod,
      method_name: method.name,
      amount: editAmount
    } : p));
    
    setEditingPayment(null);
    setEditAmount('');
    setEditMethod('');
  }

  function cancelEditPayment() {
    setEditingPayment(null);
    setEditAmount('');
    setEditMethod('');
  }

  // Auto-select default payment method (بطاقة)
  useEffect(() => {
    if (!selMethod && paymentMethods.length > 0) {
      const cardMethod = paymentMethods.find(m => m.name.includes('بطاقة') || m.name.toLowerCase().includes('card'));
      const defaultMethod = cardMethod || paymentMethods[0];
      setSelMethod(String(defaultMethod.id));
    }
  }, [paymentMethods, selMethod]);

  function submit() {
    if (cart.length === 0 || (isCashCustomer && Math.abs(remaining) > 0.01)) return;
    setProcessing(true);
    router.post('/invoices/with-items', {
      customer_id: customerId || null, customer_type: customerType,
      notes, items: cart, payments,
    }, { onFinish: () => setProcessing(false) });
  }

  // Hold invoice functions
  function holdCurrentInvoice() {
    if (cart.length === 0) return;
    
    const selectedCustomer = customerId 
      ? customers.find(c => c.id === +customerId)
      : null;
    
    const holdInvoice: HoldInvoice = {
      id: Date.now().toString(),
      customerId,
      customerType,
      customerName: selectedCustomer?.name ?? 'زبون نقدي',
      notes,
      cart: [...cart],
      payments: [...payments],
      timestamp: Date.now(),
      total,
    };
    
    setHoldInvoices(prev => [...prev, holdInvoice]);
    clearCurrentInvoice();
  }

  function restoreHoldInvoice(holdInvoice: HoldInvoice) {
    setCustomerId(holdInvoice.customerId);
    setCustomerType(holdInvoice.customerType);
    setNotes(holdInvoice.notes);
    setCart([...holdInvoice.cart]);
    setPayments([...holdInvoice.payments]);
    
    // Remove from hold list
    setHoldInvoices(prev => prev.filter(h => h.id !== holdInvoice.id));
    setShowHoldList(false);
  }

  function deleteHoldInvoice(holdId: string) {
    setHoldInvoices(prev => prev.filter(h => h.id !== holdId));
  }

  function clearCurrentInvoice() {
    setCustomerId('');
    setCustomerType('regular');
    setNotes('');
    setCart([]);
    setPayments([]);
    setSelProduct('');
    setSelSaleType('');
    setSelSize('');
    setSelQty('');
    setSelMethod('');
    setSelAmount('');
  }

  const customerOptions = [
    { label: 'زبون نقدي', badge: 'نقدي' },
    ...customers.filter(c => c.id !== 1).map(c => ({ label: c.name, badge: '' })),
  ];

  const selectedCustomerName = customerId
    ? customers.find(c => c.id === +customerId)?.name ?? 'زبون نقدي'
    : 'زبون نقدي';

  return (
    <AppShell pageTitle="نقطة البيع">
      {/* POS: full-height, no outer scroll */}
      <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-10 h-[calc(100vh-80px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

        {/* ══════════════════════════════════════════════
            LEFT PANEL — إدخال المنتج + منتجات سريعة
        ══════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <Link href="/invoices" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
                <ChevronLeft className="w-4 h-4" /> الفواتير
              </Link>
              <span className="text-slate-300 dark:text-white/10">/</span>
              <span className="font-black text-slate-800 dark:text-white text-sm">فاتورة جديدة</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Hold invoices indicator */}
              {holdInvoices.length > 0 && (
                <button
                  onClick={() => setShowHoldList(!showHoldList)}
                  className="relative flex items-center gap-2 px-3 h-8 rounded-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs transition-all"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>معلقة ({holdInvoices.length})</span>
                </button>
              )}
              {flash?.error && <span className="text-xs font-bold text-red-500">{flash.error}</span>}
            </div>
          </div>

          {/* Hold invoices dropdown */}
          {showHoldList && holdInvoices.length > 0 && (
            <div className="absolute top-16 left-5 right-5 z-50 bg-white dark:bg-slate-800 rounded-[20px] border border-black/10 dark:border-white/10 shadow-xl max-h-80 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-slate-800 dark:text-white text-sm">الفواتير المعلقة</span>
                  <button onClick={() => setShowHoldList(false)} className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/40">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {holdInvoices.map(hold => (
                    <div key={hold.id} className="flex items-center gap-3 p-3 rounded-[14px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 hover:border-primary/20 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{hold.customerName}</span>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{hold.cart.length} منتج</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-400 dark:text-white/30">{hold.total.toFixed(2)} د</span>
                          <span className="text-xs text-slate-400 dark:text-white/30">•</span>
                          <span className="text-xs text-slate-400 dark:text-white/30">{new Date(hold.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => restoreHoldInvoice(hold)}
                          className="w-8 h-8 rounded-[8px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteHoldInvoice(hold.id)}
                          className="w-8 h-8 rounded-[8px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Customer bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <ModernSelect label="" options={customerOptions} defaultValue="زبون نقدي" placeholder="اختر العميل"
                  onSelect={val => {
                    const c = customers.find(c => c.name === val);
                    setCustomerId(c && c.id !== 1 ? String(c.id) : '');
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {(['regular', 'vip'] as const).map(type => (
                <button key={type} onClick={() => setCustomerType(type)}
                  className={`px-4 h-10 rounded-[14px] border-2 transition-all font-bold text-xs ${
                    customerType === type
                      ? 'border-primary bg-primary text-white'
                      : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-primary/40'
                  }`}>
                  {type === 'regular' ? 'عادي' : '⭐ VIP'}
                </button>
              ))}
            </div>
          </div>

          {/* Add product form */}
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[180px]">
                <ModernSelect label="" placeholder="اختر المنتج..."
                  options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `${p.stock}` }))}
                  defaultValue=""
                  onSelect={val => {
                    const p = products.find(p => p.name === val);
                    setSelProduct(p ? String(p.id) : '');
                    setSelSaleType(''); setSelSize(''); setSelQty('');
                  }}
                />
              </div>
              {selectedProduct && !isTier && saleTypeOptions().length > 0 && (
                <div className="w-44">
                  <ModernSelect label="" placeholder="نوع البيع" options={saleTypeOptions()} defaultValue=""
                    onSelect={val => { setSelSaleType(saleTypeMap[val] ?? ''); setSelSize(''); setSelQty(''); }}
                  />
                </div>
              )}
              {needsSize && (
                <div className="w-36">
                  <ModernSelect label="" placeholder="الحجم" options={sizes.map(s => ({ label: s.label, meta: s.value }))} defaultValue=""
                    onSelect={val => setSelSize(String(sizes.find(s => s.label === val)?.id ?? ''))}
                  />
                </div>
              )}
              {/* Add quantity input for all product types */}
              {selectedProduct && (isTier || selSaleType) && (
                <button
                  onClick={() => {
                    setNumberPadTitle(needsQty ? "الكمية" : "العدد");
                    setNumberPadInitialValue(selQty || '1');
                    setNumberPadCallback(() => (value: string) => setSelQty(value));
                    setShowNumberPad(true);
                  }}
                  className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-24 text-left cursor-pointer hover:border-primary/40 transition-all"
                >
                  {selQty || '1'}
                </button>
              )}
              {/* preview chips */}
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
              <button onClick={addToCart} disabled={!canAdd}
                className="spatial-button flex items-center gap-2 px-6 h-14 text-sm disabled:opacity-40 shrink-0">
                <Plus className="w-4 h-4" /> إضافة
              </button>
            </div>
          </div>

          {/* Quick products */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">منتجات سريعة</span>
              </div>
              <button className="flex items-center gap-1.5 px-3 h-7 rounded-[8px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 font-bold text-xs transition-all">
                <Settings className="w-3 h-3" /> تخصيص
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mb-6">
              {QUICK_PRODUCTS.map(qp => (
                <button key={qp.id}
                  className={`flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-[20px] border transition-all duration-150 hover:scale-[1.03] active:scale-[0.97] ${qp.color}`}>
                  <span className="text-3xl">{qp.emoji}</span>
                  <span className="text-xs font-black text-center leading-tight">{qp.name}</span>
                </button>
              ))}
            </div>
            
            {/* Notes and Hold Invoice Section */}
            <div className="space-y-3">
              {/* Notes and Hold Invoice in same row */}
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">ملاحظات و إدارة الفاتورة</label>
                <div className="flex gap-3">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="ملاحظات الفاتورة... (اختياري)"
                    rows={3}
                    className="flex-1 spatial-input rounded-[14px] px-4 py-3 text-sm font-bold resize-none placeholder:text-slate-400 dark:placeholder:text-white/20"
                  />
                  {cart.length > 0 && (
                    <button onClick={holdCurrentInvoice}
                      className="w-32 flex flex-col items-center justify-center gap-1 h-[84px] rounded-[16px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs transition-all shrink-0">
                      <Pause className="w-4 h-4" />
                      <span>تعليق</span>
                      <span>الفاتورة</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            RIGHT PANEL — الفاتورة
        ══════════════════════════════════════════════ */}
        <div className="w-full lg:w-[580px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0">

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="font-black text-slate-800 dark:text-white text-sm">
                الفاتورة
                {cart.length > 0 && <span className="mr-2 text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{cart.length}</span>}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-white/30">{selectedCustomerName}</span>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                <ShoppingCart className="w-12 h-12" />
                <span className="font-bold text-sm">لا توجد منتجات</span>
                <span className="text-xs">أضف منتجاً من اليسار</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Table header */}
                <div className="grid grid-cols-[60px_1fr_80px_90px_100px] gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-center">عدد</span>
                  <span>المنتج</span>
                  <span className="text-center">حجم</span>
                  <span className="text-center">سعر الوحدة</span>
                  <span className="text-center">الإجمالي</span>
                </div>
                
                {(() => {
                  // Group similar items
                  const groupedItems = cart.reduce((acc, item, originalIdx) => {
                    const key = `${item.product_id}-${item.size_id}-${item.sale_type}`;
                    if (!acc[key]) {
                      acc[key] = {
                        ...item,
                        count: 1,
                        totalQuantity: +item.quantity,
                        totalAmount: item.line_total,
                        originalIndices: [originalIdx]
                      };
                    } else {
                      acc[key].count += 1;
                      acc[key].totalQuantity += +item.quantity;
                      acc[key].totalAmount += item.line_total;
                      acc[key].originalIndices.push(originalIdx);
                    }
                    return acc;
                  }, {} as Record<string, any>);
                  
                  return Object.values(groupedItems).map((groupedItem: any, idx) => {
                    // For unit_based items, show total quantity instead of count
                    const displayCount = groupedItem.sale_type === 'unit_based' 
                      ? groupedItem.totalQuantity 
                      : groupedItem.count;
                    
                    return (
                      <div key={idx} className="grid grid-cols-[60px_1fr_80px_90px_100px] gap-3 px-4 py-4 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/40 transition-all shadow-sm hover:shadow-md group">
                        {/* Count/Quantity with editable button */}
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            value={displayCount}
                            onClick={(e) => {
                              e.stopPropagation();
                              setNumberPadTitle(groupedItem.sale_type === 'unit_based' ? "الكمية" : "العدد");
                              setNumberPadInitialValue(String(displayCount));
                              setNumberPadCallback(() => (value: string) => {
                                const newCount = parseInt(value) || 1;
                                const currentCount = displayCount;
                                
                                if (newCount === currentCount) return;
                                
                                // Get the first item to use as template
                                const firstItem = cart.find((_, i) => groupedItem.originalIndices.includes(i));
                                if (!firstItem) return;
                                
                                const product = products.find(p => p.id === firstItem.product_id);
                                if (!product) return;
                                
                                // Remove all current items of this group
                                setCart(prev => {
                                  let newCart = prev.filter((_, i) => !groupedItem.originalIndices.includes(i));
                                  
                                  // Add the new quantity
                                  for (let i = 0; i < newCount; i++) {
                                    const qty = resolveQuantity(product, firstItem.sale_type, firstItem.size_id, '1', sizes);
                                    const price = resolvePrice(product, firstItem.sale_type, firstItem.size_id, isVip);
                                    
                                    if (qty && price) {
                                      const size = sizes.find(s => s.id === +firstItem.size_id);
                                      const newItem = {
                                        product_id: product.id,
                                        product_name: product.name,
                                        sale_type: firstItem.sale_type,
                                        size_id: firstItem.size_id,
                                        size_label: size?.label ?? '',
                                        quantity: String(qty),
                                        unit_price: price,
                                        line_total: resolveLineTotal(firstItem.sale_type, price, qty),
                                      };
                                      newCart.push(newItem);
                                    }
                                  }
                                  
                                  const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                  
                                  // Update payment if only one payment exists
                                  if (payments.length === 1 && newTotal > 0) {
                                    setTimeout(() => {
                                      setPayments(prevPayments => [
                                        {
                                          ...prevPayments[0],
                                          amount: newTotal.toFixed(2)
                                        }
                                      ]);
                                    }, 0);
                                  } else if (newTotal === 0) {
                                    setTimeout(() => setPayments([]), 0);
                                  }
                                  
                                  return newCart;
                                });
                              });
                              setShowNumberPad(true);
                            }}
                            className="w-12 h-8 text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg font-bold text-sm border border-gray-200 dark:border-gray-600 hover:border-primary/50 transition-all cursor-pointer"
                          >
                            {displayCount}
                          </button>
                        </div>
                        
                        {/* Product name + type */}
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="font-bold text-slate-800 dark:text-white text-sm truncate mb-1">
                            {groupedItem.product_name}
                          </div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {saleTypeLabels[groupedItem.sale_type]}
                          </div>
                        </div>
                        
                        {/* Size */}
                        <div className="flex items-center justify-center">
                          {groupedItem.size_label ? (
                            <span className="text-xs font-black text-white bg-primary px-2.5 py-1 rounded-full shadow-sm">
                              {groupedItem.size_label}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">—</span>
                          )}
                        </div>
                        
                        {/* Unit price */}
                        <div className="flex items-center justify-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                            {groupedItem.unit_price}
                          </span>
                        </div>
                        
                        {/* Total + delete */}
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <span className="font-black text-slate-800 dark:text-white text-base">
                              {groupedItem.totalAmount.toFixed(2)}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Remove all instances of this grouped item
                              setCart(prev => {
                                const newCart = prev.filter((_, i) => !groupedItem.originalIndices.includes(i));
                                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                
                                // Update payment if only one payment exists
                                if (payments.length === 1 && newTotal > 0) {
                                  setTimeout(() => {
                                    setPayments(prevPayments => [
                                      {
                                        ...prevPayments[0],
                                        amount: newTotal.toFixed(2)
                                      }
                                    ]);
                                  }, 0);
                                } else if (newTotal === 0) {
                                  setTimeout(() => setPayments([]), 0);
                                }
                                
                                return newCart;
                              });
                            }}
                            className="w-8 h-8 rounded-[10px] bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 flex items-center justify-center transition-all ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Totals + Payment + Submit */}
          <div className="shrink-0 border-t border-black/5 dark:border-white/5">

            {/* Totals */}
            <div className="px-5 py-4 flex flex-col gap-2 border-b border-black/5 dark:border-white/5">
              {[
                { label: 'الإجمالي', value: total.toFixed(2),     cls: 'text-slate-800 dark:text-white text-lg font-black' },
                { label: 'المدفوع',  value: totalPaid.toFixed(2), cls: 'text-emerald-600 dark:text-emerald-400 font-bold' },
                { label: 'المتبقي',  value: remaining.toFixed(2), cls: remaining > 0 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-white/30 font-bold' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500 dark:text-white/40">{label}</span>
                  <span className={cls}>{value} د</span>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="px-5 py-3 border-b border-black/5 dark:border-white/5">
              {isCashCustomer && remaining > 0.01 && (
                <div className="mb-3 px-3 py-2 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  ⚠️ زبون نقدي — يجب الدفع الكامل
                </div>
              )}
              
              {/* Payment input - always show when there are items */}
              {cart.length > 0 && (
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <ModernSelect label="" options={paymentMethods.map(m => ({ label: m.name }))} 
                      defaultValue={paymentMethods.find(m => m.id === +selMethod)?.name || ""} 
                      placeholder="وسيلة الدفع"
                      onSelect={val => setSelMethod(String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setNumberPadTitle("المبلغ");
                      setNumberPadInitialValue(selAmount || remaining.toFixed(2));
                      setNumberPadCallback(() => (value: string) => setSelAmount(value));
                      setShowNumberPad(true);
                    }}
                    className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-28 text-left cursor-pointer hover:border-primary/40 transition-all"
                  >
                    {selAmount || remaining.toFixed(2)}
                  </button>
                  <button onClick={addPayment} disabled={!selMethod || !selAmount}
                    className="spatial-button flex items-center justify-center w-14 h-14 text-sm disabled:opacity-40 shrink-0">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {payments.map((p, idx) => (
                <div key={idx} className="mb-1.5">
                  {editingPayment === idx ? (
                    <div className="flex gap-2 p-3 rounded-[10px] bg-blue-500/5 border border-blue-500/20">
                      <div className="flex-1">
                        <ModernSelect 
                          label="" 
                          options={paymentMethods.map(m => ({ label: m.name }))} 
                          defaultValue={paymentMethods.find(m => m.id === +editMethod)?.name || ""}
                          placeholder="وسيلة الدفع"
                          onSelect={val => setEditMethod(String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
                        />
                      </div>
                      <input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        value={editAmount}
                        onClick={() => {
                          setNumberPadTitle("المبلغ");
                          setNumberPadInitialValue(editAmount);
                          setNumberPadCallback(() => (value: string) => setEditAmount(value));
                          setShowNumberPad(true);
                        }}
                        readOnly
                        className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-28 cursor-pointer hover:border-primary/40 transition-all" 
                      />
                      <button onClick={() => saveEditPayment(idx)} disabled={!editMethod || !editAmount}
                        className="spatial-button flex items-center justify-center w-12 h-14 text-sm disabled:opacity-40">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEditPayment}
                        className="w-12 h-14 rounded-[16px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-all cursor-pointer"
                         onClick={() => startEditPayment(idx)}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-bold text-slate-700 dark:text-white/70 text-sm">{p.method_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{p.amount} د</span>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setPayments(prev => prev.filter((_, i) => i !== idx));
                        }}
                          className="w-5 h-5 rounded-[5px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="px-5 py-4 flex flex-col gap-2">
              <button onClick={submit}
                disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                className="spatial-button w-full flex items-center justify-center gap-2 h-14 text-base font-black disabled:opacity-40">
                <Check className="w-5 h-5" />
                {cart.length > 0 ? `إتمام البيع — ${total.toFixed(2)} د` : 'إتمام البيع'}
              </button>
              
              <div className="flex gap-2">
                <Link href="/invoices"
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/8 text-slate-500 dark:text-white/40 font-bold text-sm transition-all">
                  <X className="w-4 h-4" /> إلغاء
                </Link>
                {cart.length > 0 && (
                  <button onClick={clearCurrentInvoice}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[16px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-bold text-sm transition-all">
                    <Trash2 className="w-4 h-4" /> مسح
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={showNumberPad}
        onClose={() => setShowNumberPad(false)}
        onConfirm={(value) => {
          if (numberPadCallback) {
            numberPadCallback(value);
          }
        }}
        initialValue={numberPadInitialValue}
        title={numberPadTitle}
      />
    </AppShell>
  );
}
