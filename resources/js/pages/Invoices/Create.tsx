import { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import { Plus, Trash2, Check, X, Package, ShoppingCart, CreditCard, Zap, Settings, User, ChevronLeft, Pause, Play, Clock, AlertCircle } from 'lucide-react';

interface Customer      { id: number; name: string; total_debt?: string; }
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
  invoice?: InvoiceSuccess;
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

// Invoice Success Modal Interface
interface InvoiceSuccess {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_type: string;
  seller_name: string;
  total_amount: number;
  notes: string;
  created_at: string;
  items: {
    product_name: string;
    sale_type: string;
    size_label: string;
    quantity: string;
    unit_price: number;
    line_total: number;
  }[];
  payments: {
    method_name: string;
    amount: number;
  }[];
}

const QUICK_PRODUCTS = [
  { id: 'q1', name: 'مبخرة صغيرة', color: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-700 dark:text-amber-300' },
  { id: 'q2', name: 'بخور عود', color: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  { id: 'q3', name: 'وشق فاخر', color: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-700 dark:text-purple-300' },
  { id: 'q4', name: 'مبخرة كبيرة', color: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-700 dark:text-rose-300' },
  { id: 'q5', name: 'بخور هندي', color: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20 text-pink-700 dark:text-pink-300' },
  { id: 'q6', name: 'عود طبيعي', color: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 text-orange-700 dark:text-orange-300' },
  { id: 'q7', name: 'بخور مسك', color: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20 text-sky-700 dark:text-sky-300' },
  { id: 'q8', name: 'وشق ورد', color: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-700 dark:text-red-300' },
  { id: 'q9', name: 'مبخرة فضية', color: 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/20 text-slate-700 dark:text-slate-300' },
];

const saleTypeLabels: Record<string, string> = {
  tier_decant: 'زيتي', unit_decant: 'أصلي - تقسيم',
  full_bottle: 'عبوة كاملة', unit_based: 'بالوحدة',
};

function resolvePrice(product: Product, saleType: string, sizeId: string, isVip: boolean): number {
  const pp = product.product_price;
  switch (saleType) {
    case 'tier_decant': {
      // Handle custom sizes - use unit_decant pricing for custom sizes
      if (sizeId.startsWith('-custom-')) {
        return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
      }
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
      // Handle custom sizes (negative IDs)
      if (sizeId.startsWith('-custom-')) {
        const customValue = sizeId.replace('-custom-', '');
        return +customValue || 0;
      }
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

export default function InvoicesCreate({ customers, products, sizes, paymentMethods, flash, invoice }: Props) {
  const [mobileTab, setMobileTab] = useState<'add'|'cart'|'pay'>('add');
  const [resetKey, setResetKey] = useState(0);
  const [customerId,   setCustomerId]   = useState('');
  const [customerType, setCustomerType] = useState<'regular'|'vip'>('regular');
  const [notes,        setNotes]        = useState('');
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [payments,     setPayments]     = useState<PaymentEntry[]>([]);
  const [debtPayment,  setDebtPayment]  = useState<PaymentEntry | null>(null);
  const [editingDebt,  setEditingDebt]  = useState(false);
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
  
  // Invoice success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState<InvoiceSuccess | null>(null);
  
  // Number pad modal state
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [numberPadTitle, setNumberPadTitle] = useState('');
  const [numberPadInitialValue, setNumberPadInitialValue] = useState('');
  const [numberPadMaxValue, setNumberPadMaxValue] = useState<number | undefined>(undefined);
  const [numberPadCallback, setNumberPadCallback] = useState<((value: string) => void) | null>(null);
  
  // Sale type modal state
  const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);

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
  
  // Show success modal if invoice data is provided
  useEffect(() => {
    console.log('Invoice data received:', invoice); // Debug log
    if (invoice) {
      setInvoiceSuccess(invoice);
      setShowSuccessModal(true);
      // Clear the form after showing modal
      setTimeout(() => {
        clearCurrentInvoice();
      }, 100);
    }
  }, [invoice]);

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
    if (isOriginal) return [
      { 
        label: 'أصلي - تقسيم', 
        badge: 'unit_decant',
        description: 'بيع بالمليلتر حسب الحجم المطلوب',
        icon: '📊'
      }, 
      { 
        label: 'عبوة كاملة', 
        badge: 'full_bottle',
        description: 'بيع العبوة بالكامل بحجمها الأصلي',
        icon: '🎁'
      }
    ];
    return [{ 
      label: 'بالوحدة', 
      badge: 'unit_based',
      description: 'بيع بالقطعة أو بالجرام',
      icon: '⚖️'
    }];
  };
  const saleTypeMap: Record<string, string> = { 'unit_decant': 'unit_decant', 'full_bottle': 'full_bottle', 'unit_based': 'unit_based' };

  // Auto-select sale type when there's only one option
  useEffect(() => {
    if (selectedProduct && !isTier && !selSaleType) {
      const options = saleTypeOptions();
      if (options.length === 1) {
        const autoSaleType = options[0].badge;
        setSelSaleType(autoSaleType);
      } else if (options.length > 1) {
        // For original perfumes, default to unit_decant (تقسيم)
        if (isOriginal) {
          setSelSaleType('unit_decant');
        } else {
          // Show modal for other products with multiple options
          setShowSaleTypeModal(true);
        }
      }
    }
  }, [selectedProduct, isTier, selSaleType, isOriginal]);

  const previewPrice = selectedProduct && (isTier ? selSize : selSaleType) ? resolvePrice(selectedProduct, effectiveST, selSize, isVip) : null;
  const previewQty   = selectedProduct && (isTier ? selSize : selSaleType) ? resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes) : null;
  const previewCount = effectiveST === 'unit_based' ? 1 : (parseInt(selQty) || 1);
  const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0 ? 
    (effectiveST === 'unit_based' ? 
      resolveLineTotal(effectiveST, previewPrice, previewQty) : 
      resolveLineTotal(effectiveST, previewPrice, previewQty) * previewCount
    ) : null;

  const total      = cart.reduce((s, i) => s + i.line_total, 0);
  const debtAmount  = debtPayment ? (+debtPayment.amount || 0) : 0;
  const originalDebt = customerId ? +(customers.find(c => c.id === +customerId)?.total_debt ?? 0) : 0;
  const grandTotal  = debtPayment ? total + originalDebt : total;
  const totalPaid   = payments.reduce((s, p) => s + (+p.amount || 0), 0) + debtAmount;
  const remaining   = grandTotal - totalPaid;
  // حساب الكمية المستهلكة من المخزون لمنتج معين في السلة الحالية
  function getCartConsumed(productId: number): number {
    return cart
      .filter(i => i.product_id === productId)
      .reduce((s, i) => s + +i.quantity, 0);
  }

  const availableStock = selectedProduct
    ? +selectedProduct.stock - getCartConsumed(selectedProduct.id)
    : 0;

  // الحد الأقصى للعدد (كم مرة يمكن إضافة هذا المنتج)
  const maxCount: number | undefined = selectedProduct && (isTier || selSaleType)
    ? (() => {
        if (effectiveST === 'unit_based') return availableStock;
        const qty = resolveQuantity(selectedProduct, effectiveST, selSize, '1', sizes);
        return qty > 0 ? Math.floor(availableStock / qty) : 0;
      })()
    : undefined;

  const canAdd = selectedProduct
    && (isTier ? (!needsSize || selSize) : selSaleType)
    && (!needsSize || selSize)
    && (!needsQty || selQty)
    && (maxCount === undefined || maxCount > 0);

  function addToCart() {
    if (!selectedProduct || (!isTier && !selSaleType)) return;
    
    // For unit_based products, use selQty as the actual quantity, not count
    if (effectiveST === 'unit_based') {
      const qty = +selQty || 0;
      const price = resolvePrice(selectedProduct, effectiveST, selSize, isVip);
      if (!qty || !price) return;
      
      // Handle size label for custom sizes
      let sizeLabel = '';
      if (selSize.startsWith('-custom-')) {
        const customValue = selSize.replace('-custom-', '');
        sizeLabel = `${customValue} مل (مخصص)`;
      } else {
        const size = sizes.find(s => s.id === +selSize);
        sizeLabel = size?.label ?? '';
      }
      
      const newItem = {
        product_id: selectedProduct.id, product_name: selectedProduct.name,
        sale_type: effectiveST, size_id: selSize, size_label: sizeLabel,
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
      // Handle size label for custom sizes
      let sizeLabel = '';
      if (selSize.startsWith('-custom-')) {
        const customValue = selSize.replace('-custom-', '');
        sizeLabel = `${customValue} مل (مخصص)`;
      } else {
        const size = sizes.find(s => s.id === +selSize);
        sizeLabel = size?.label ?? '';
      }
      
      // Get the count (how many times to add this item)
      const count = parseInt(selQty) || 1;
      
      const newItems = [];
      for (let i = 0; i < count; i++) {
        const newItem = {
          product_id: selectedProduct.id, product_name: selectedProduct.name,
          sale_type: effectiveST, size_id: selSize, size_label: sizeLabel,
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
    
    const currentPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0)
                      + (debtPayment ? (+debtPayment.amount || 0) : 0);
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
      notes, items: cart,
      payments,
      debt_payment: debtPayment || null,
    }, { 
      onFinish: () => setProcessing(false) 
    });
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
    setDebtPayment(null);
    setEditingDebt(false);
    setSelProduct('');
    setSelSaleType('');
    setSelSize('');
    setSelQty('');
    setSelMethod('');
    setSelAmount('');
    setResetKey(k => k + 1);
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
      {/* Invoice Success Modal */}
      {showSuccessModal && invoiceSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">تم إنشاء الفاتورة بنجاح</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">رقم الفاتورة: {invoiceSuccess.invoice_number}</p>
                </div>
              </div>
              <button onClick={() => setShowSuccessModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">العميل</label>
                  <p className="font-bold text-gray-900 dark:text-white">{invoiceSuccess.customer_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{invoiceSuccess.customer_type === 'vip' ? '⭐ VIP' : 'عادي'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">البائع</label>
                  <p className="font-bold text-gray-900 dark:text-white">{invoiceSuccess.seller_name}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">التاريخ</label>
                  <p className="font-bold text-gray-900 dark:text-white">{new Date(invoiceSuccess.created_at).toLocaleDateString('ar')}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">الإجمالي</label>
                  <p className="font-black text-xl text-green-600 dark:text-green-400">{(invoiceSuccess.total_amount || 0).toFixed(2)} د</p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <h3 className="font-black text-gray-900 dark:text-white mb-3">عناصر الفاتورة</h3>
                <div className="space-y-2">
                  {(() => {
                    // Group similar items like in the cart
                    const groupedItems = invoiceSuccess.items.reduce((acc, item, originalIdx) => {
                      const key = `${item.product_name}-${item.size_label}-${item.sale_type}`;
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
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-black text-primary text-sm">{displayCount}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 dark:text-white">{groupedItem.product_name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{saleTypeLabels[groupedItem.sale_type]}</span>
                                {groupedItem.size_label && (
                                  <>
                                    <span>•</span>
                                    <span>{groupedItem.size_label}</span>
                                  </>
                                )}
                                {groupedItem.sale_type === 'unit_based' && (
                                  <>
                                    <span>•</span>
                                    <span>الكمية: {groupedItem.totalQuantity}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">{(groupedItem.totalAmount || 0).toFixed(2)} د</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{groupedItem.unit_price || 0} د / وحدة</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* Payments */}
              <div>
                <h3 className="font-black text-gray-900 dark:text-white mb-3">طرق الدفع</h3>
                <div className="space-y-2">
                  {invoiceSuccess.payments.map((payment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-bold text-gray-900 dark:text-white">{payment.method_name}</span>
                      </div>
                      <span className="font-bold text-green-600 dark:text-green-400">{(payment.amount || 0).toFixed(2)} د</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              {invoiceSuccess.notes && (
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white mb-3">ملاحظات</h3>
                  <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{invoiceSuccess.notes}</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowSuccessModal(false)}
                className="flex-1 spatial-button h-12 text-sm font-bold">
                فاتورة جديدة
              </button>
              <button onClick={() => {
                // Print functionality can be added here
                window.print();
              }}
                className="px-6 h-12 rounded-[16px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold text-sm transition-all">
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile tab switcher */}
      <div className="lg:hidden flex -mx-4 -mt-4 mb-0 border-b border-black/5 dark:border-white/5 shrink-0">
        <button
          onClick={() => setMobileTab('add')}
          className={`flex-1 py-3 text-sm font-black transition-all ${
            mobileTab === 'add'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-slate-400 dark:text-white/40'
          }`}>
          <Package className="w-4 h-4 inline ml-1" /> إضافة
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-3 text-sm font-black transition-all relative ${
            mobileTab === 'cart'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-slate-400 dark:text-white/40'
          }`}>
          <ShoppingCart className="w-4 h-4 inline ml-1" /> الفاتورة
          {cart.length > 0 && (
            <span className="absolute top-2 right-6 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">{cart.length}</span>
          )}
        </button>
        <button
          onClick={() => setMobileTab('pay')}
          className={`flex-1 py-3 text-sm font-black transition-all relative ${
            mobileTab === 'pay'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-slate-400 dark:text-white/40'
          }`}>
          <CreditCard className="w-4 h-4 inline ml-1" /> الدفع
          {remaining > 0.01 && cart.length > 0 && (
            <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500"></span>
          )}
        </button>
      </div>

      {/* POS: full-height, no outer scroll */}
      <div className="flex flex-col lg:flex-row gap-0 -mx-4 lg:-m-10 h-[calc(100dvh-130px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

        {/* ══════════════════════════════════════════════
            LEFT PANEL — إدخال المنتج + منتجات سريعة
        ══════════════════════════════════════════════ */}
        <div className={`flex-1 flex-col overflow-hidden border-r border-black/5 dark:border-white/5 ${mobileTab === 'add' ? 'flex' : 'hidden'} lg:flex`}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <Link href="/invoices" className="hidden sm:flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
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
          <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <ModernSelect key={resetKey} label="" options={customerOptions} defaultValue="زبون نقدي" placeholder="اختر العميل"
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
                    className={`px-4 h-11 rounded-[14px] border-2 transition-all font-bold text-sm ${
                      customerType === type
                        ? 'border-primary bg-primary text-white'
                        : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-primary/40'
                    }`}>
                    {type === 'regular' ? 'عادي' : '⭐ VIP'}
                  </button>
                ))}
              </div>
            </div>
            {/* Debt warning for registered customer */}
            {customerId && (() => {
              const selectedCustomer = customers.find(c => c.id === +customerId);
              const debt = +(selectedCustomer?.total_debt ?? 0);
              if (debt <= 0) return null;
              return (
                <div className="mx-5 mb-3 px-4 py-3 rounded-[14px] bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">الدين السابق: {debt.toFixed(2)} د</span>
                  </div>
                  <button
                    onClick={() => {
                      const method = paymentMethods[0];
                      if (!method) return;
                      setDebtPayment({
                        payment_method_id: String(method.id),
                        method_name: method.name,
                        amount: debt.toFixed(2),
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white font-bold text-xs transition-all shrink-0">
                    <CreditCard className="w-3.5 h-3.5" /> سداد الدين
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Add product form */}
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج</span>
            </div>
            <div className="flex flex-col gap-3">
              {/* First row: Product, Quantity, Price, Total Price */}
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
                  <button
                    onClick={() => setShowSaleTypeModal(true)}
                    className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-44 text-right cursor-pointer hover:border-primary/40 transition-all flex items-center justify-between"
                  >
                    <span>{saleTypeOptions().find(opt => opt.badge === selSaleType)?.label || 'نوع البيع'}</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                {/* Add quantity input for all product types */}
                {selectedProduct && (isTier || selSaleType) && (
                  <button
                    onClick={() => {
                      setNumberPadTitle(needsQty ? "الكمية" : "العدد");
                      setNumberPadInitialValue(selQty || '1');
                      setNumberPadMaxValue(maxCount !== undefined ? maxCount : undefined);
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
              </div>
              
              {/* Second row: Sizes and Add button */}
              {needsSize && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="w-full">
                    <SizeSelect
                      sizes={sizes}
                      selectedSizeId={selSize}
                      onSizeSelect={setSelSize}
                      placeholder="الحجم"
                      product={selectedProduct}
                      isVip={isVip}
                    />
                  </div>
                  <button onClick={addToCart} disabled={!canAdd}
                    className="spatial-button w-full sm:w-auto flex items-center justify-center gap-3 px-8 h-14 sm:h-16 text-lg font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                    <Plus className="w-6 h-6" /> إضافة
                  </button>
                </div>
              )}
              
              {/* Add button for products that don't need sizes */}
              {!needsSize && selectedProduct && (isTier || selSaleType) && (
                <div className="flex justify-end">
                  <button onClick={addToCart} disabled={!canAdd}
                    className="spatial-button flex items-center gap-3 px-8 h-16 text-lg font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                    <Plus className="w-6 h-6" /> إضافة
                  </button>
                </div>
              )}

              {/* Stock warning */}
              {selectedProduct && maxCount !== undefined && maxCount === 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">المخزون غير كافٍ — المتاح: {availableStock} {selectedProduct.category.unit}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick products */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center justify-between mb-4">
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
                  className={`flex items-center justify-center py-6 px-4 rounded-[18px] border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] hover:shadow-md ${qp.color} font-bold text-sm leading-tight min-h-[70px]`}>
                  <span className="text-center">{qp.name}</span>
                </button>
              ))}
            </div>
            
            {/* Notes and Hold Invoice Section - positioned at bottom */}
            <div className="mt-auto">
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">ملاحظات و إدارة الفاتورة</label>
                <div className="flex gap-3 h-[200px]">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="ملاحظات الفاتورة... (اختياري)"
                    className="flex-1 spatial-input rounded-[14px] px-4 py-3 text-sm font-bold resize-none placeholder:text-slate-400 dark:placeholder:text-white/20 h-full"
                  />
                  {cart.length > 0 && (
                    <button onClick={holdCurrentInvoice}
                      className="w-40 flex flex-col items-center justify-center gap-2 h-full rounded-[20px] bg-gradient-to-br from-amber-400/15 to-amber-600/15 hover:from-amber-400/25 hover:to-amber-600/25 border-2 border-amber-500/30 hover:border-amber-500/50 text-amber-700 dark:text-amber-300 font-black text-sm transition-all duration-200 shrink-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-1">
                        <Pause className="w-6 h-6" />
                      </div>
                      <div className="text-center leading-tight">
                        <div className="text-base font-black">تعليق</div>
                        <div className="text-sm font-bold opacity-80">الفاتورة</div>
                      </div>
                      <div className="text-xs opacity-60 mt-1">حفظ مؤقت</div>
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
        <div className={`w-full lg:w-[650px] flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 ${mobileTab === 'cart' || mobileTab === 'pay' ? 'flex' : 'hidden'} lg:flex`}>

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
          <div className={`flex-1 overflow-y-auto px-4 py-3 ${mobileTab === 'pay' ? 'hidden lg:block' : ''}`}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                <ShoppingCart className="w-12 h-12" />
                <span className="font-bold text-sm">لا توجد منتجات</span>
                <span className="text-xs">أضف منتجاً من اليسار</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Table header - hidden on mobile */}
                <div className="hidden sm:grid grid-cols-[60px_2fr_70px_80px_90px_60px] gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-center">عدد</span>
                  <span>المنتج</span>
                  <span className="text-center">حجم</span>
                  <span className="text-center">سعر</span>
                  <span className="text-center">الإجمالي</span>
                  <span className="text-center">حذف</span>
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
                      <div key={idx} className="grid grid-cols-[40px_1fr_auto] sm:grid-cols-[60px_2fr_70px_80px_90px_60px] gap-2 px-3 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/40 transition-all shadow-sm group">
                        {/* Count/Quantity with editable button */}
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            value={displayCount}
                            onClick={(e) => {
                              e.stopPropagation();
                              const cartProduct = products.find(p => p.id === groupedItem.product_id);
                              const consumed = cart
                                .filter((_, i) => !groupedItem.originalIndices.includes(i))
                                .filter(i => i.product_id === groupedItem.product_id)
                                .reduce((s, i) => s + +i.quantity, 0);
                              const stockLeft = cartProduct ? +cartProduct.stock - consumed : 0;
                              const itemQty = +groupedItem.quantity;
                              const cartMax = groupedItem.sale_type === 'unit_based'
                                ? stockLeft
                                : (itemQty > 0 ? Math.floor(stockLeft / itemQty) : 0);
                              setNumberPadTitle(groupedItem.sale_type === 'unit_based' ? "الكمية" : "العدد");
                              setNumberPadInitialValue(String(displayCount));
                              setNumberPadMaxValue(cartMax);
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
                            className="w-10 h-10 sm:w-16 sm:h-14 text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl font-black text-base border-2 border-gray-200 dark:border-gray-600 hover:border-primary/50 transition-all cursor-pointer active:scale-[0.95]"
                          >
                            {displayCount}
                          </button>
                        </div>
                        
                        {/* Product name + type */}
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="font-bold text-slate-800 dark:text-white text-sm truncate">
                            {groupedItem.product_name}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{saleTypeLabels[groupedItem.sale_type]}</span>
                            {/* Size inline on mobile */}
                            <span className="sm:hidden">
                              {groupedItem.size_id.startsWith('-custom-')
                                ? <span className="text-xs font-black text-purple-600"> • {groupedItem.size_id.replace('-custom-', '')} مل</span>
                                : groupedItem.size_label
                                  ? <span className="text-xs font-black text-primary"> • {groupedItem.size_label}</span>
                                  : null}
                            </span>
                            <span className="sm:hidden font-black text-slate-700 dark:text-white text-xs"> • {groupedItem.totalAmount.toFixed(2)} د</span>
                          </div>
                        </div>
                        
                        {/* Size - hidden on mobile */}
                        <div className="hidden sm:flex items-center justify-center">
                          {(() => {
                            if (groupedItem.size_id.startsWith('-custom-')) {
                              const customValue = groupedItem.size_id.replace('-custom-', '');
                              return (
                                <span className="text-xs font-black text-white bg-purple-500 px-2.5 py-1 rounded-full shadow-sm">
                                  {customValue} مل
                                </span>
                              );
                            } else if (groupedItem.sale_type === 'full_bottle') {
                              // For full bottle, show the bottle volume from original_perfume_detail
                              const product = products.find(p => p.id === groupedItem.product_id);
                              const bottleVolume = product?.original_perfume_detail?.bottle_volume;
                              return (
                                <span className="text-xs font-black text-white bg-emerald-500 px-2.5 py-1 rounded-full shadow-sm">
                                  {bottleVolume} مل
                                </span>
                              );
                            } else if (groupedItem.size_label) {
                              return (
                                <span className="text-xs font-black text-white bg-primary px-2.5 py-1 rounded-full shadow-sm">
                                  {groupedItem.size_label}
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">—</span>
                              );
                            }
                          })()}
                        </div>
                        
                        {/* Unit price - hidden on mobile */}
                        <div className="hidden sm:flex items-center justify-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                            {groupedItem.unit_price}
                          </span>
                        </div>
                        
                        {/* Total - hidden on mobile */}
                        <div className="hidden sm:flex items-center justify-center">
                          <span className="font-black text-slate-800 dark:text-white text-base">
                            {groupedItem.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Actions column */}
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCart(prev => {
                                const newCart = prev.filter((_, i) => !groupedItem.originalIndices.includes(i));
                                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                if (payments.length === 1 && newTotal > 0) {
                                  setTimeout(() => {
                                    setPayments(prevPayments => [{ ...prevPayments[0], amount: newTotal.toFixed(2) }]);
                                  }, 0);
                                } else if (newTotal === 0) {
                                  setTimeout(() => setPayments([]), 0);
                                }
                                return newCart;
                              });
                            }}
                            className="w-9 h-9 sm:w-12 sm:h-12 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-[0.95] shadow-md"
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

            {/* Mini totals summary — shown in cart tab on mobile only */}
            <div className={`lg:hidden px-4 py-3 flex items-center justify-between border-b border-black/5 dark:border-white/5 ${mobileTab === 'cart' ? 'flex' : 'hidden'}`}>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 dark:text-white/30 block">الإجمالي</span>
                  <span className="font-black text-slate-800 dark:text-white text-base">{grandTotal.toFixed(2)} د</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 dark:text-white/30 block">المتبقي</span>
                  <span className={`font-black text-base ${remaining > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}>{remaining.toFixed(2)} د</span>
                </div>
              </div>
              <button
                onClick={() => setMobileTab('pay')}
                className="spatial-button flex items-center gap-2 px-5 h-10 text-sm font-black">
                <CreditCard className="w-4 h-4" /> الدفع
              </button>
            </div>

            {/* Payment + Submit — hidden in cart tab on mobile */}
            <div className={`${mobileTab === 'cart' ? 'hidden lg:block' : ''}`}>

            {/* Totals */}
            <div className="px-5 py-4 flex flex-col gap-2 border-b border-black/5 dark:border-white/5">
              {debtPayment ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500 dark:text-white/40">الإجمالي الكلي</span>
                    <span className="text-slate-800 dark:text-white text-lg font-black">{grandTotal.toFixed(2)} د</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-400 dark:text-white/30">الفاتورة الحالية</span>
                    <span className="text-sm font-bold text-slate-600 dark:text-white/60">{total.toFixed(2)} د</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-red-500">سداد الدين</span>
                    <span className="text-sm font-bold text-red-500">
                      {debtAmount < originalDebt
                        ? `${debtPayment!.amount} د من ${originalDebt.toFixed(2)} د`
                        : `${debtPayment!.amount} د`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500 dark:text-white/40">الإجمالي</span>
                  <span className="text-slate-800 dark:text-white text-lg font-black">{total.toFixed(2)} د</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500 dark:text-white/40">المدفوع</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{totalPaid.toFixed(2)} د</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500 dark:text-white/40">المتبقي</span>
                <span className={remaining > 0.01 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-white/30 font-bold'}>
                  {remaining.toFixed(2)} د
                </span>
              </div>
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
              
              {/* Debt payment entry */}
              {debtPayment && (
                <div className="mb-1.5">
                  {editingDebt ? (
                    <div className="flex gap-2 p-3 rounded-[10px] bg-red-500/5 border border-red-500/20">
                      <div className="flex-1">
                        <ModernSelect
                          label=""
                          options={paymentMethods.map(m => ({ label: m.name }))}
                          defaultValue={debtPayment.method_name}
                          placeholder="وسيلة الدفع"
                          onSelect={val => {
                            const m = paymentMethods.find(m => m.name === val);
                            if (m) setDebtPayment(prev => prev ? { ...prev, payment_method_id: String(m.id), method_name: m.name } : prev);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setNumberPadTitle('سداد الدين');
                          setNumberPadInitialValue(debtPayment.amount);
                          setNumberPadCallback(() => (value: string) => {
                            setDebtPayment(prev => prev ? { ...prev, amount: value } : prev);
                          });
                          setShowNumberPad(true);
                        }}
                        className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-28 text-left cursor-pointer hover:border-red-400 transition-all"
                      >
                        {debtPayment.amount}
                      </button>
                      <button onClick={() => setEditingDebt(false)}
                        className="spatial-button flex items-center justify-center w-12 h-14 text-sm">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setDebtPayment(null); setEditingDebt(false); }}
                        className="w-12 h-14 rounded-[16px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-all cursor-pointer"
                         onClick={() => setEditingDebt(true)}>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-bold text-slate-700 dark:text-white/70 text-sm">سداد الدين — {debtPayment.method_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-red-500 text-sm">{debtPayment.amount} د</span>
                        <button onClick={(e) => { e.stopPropagation(); setDebtPayment(null); setEditingDebt(false); }}
                          className="w-5 h-5 rounded-[5px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
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
                {cart.length > 0 ? `إتمام البيع — ${grandTotal.toFixed(2)} د` : 'إتمام البيع'}
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
            </div> {/* end payment+submit wrapper */}
          </div>
        </div>
      </div>
      
      {/* Sale Type Modal */}
      <SaleTypeModal
        isOpen={showSaleTypeModal}
        onClose={() => setShowSaleTypeModal(false)}
        onSelect={(saleType) => {
          setSelSaleType(saleType);
          setSelSize('');
          setSelQty('1');
        }}
        options={saleTypeOptions()}
        title="اختر نوع البيع"
      />
      
      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={showNumberPad}
        onClose={() => { setShowNumberPad(false); setNumberPadMaxValue(undefined); }}
        onConfirm={(value) => {
          if (numberPadCallback) {
            numberPadCallback(value);
          }
        }}
        initialValue={numberPadInitialValue}
        title={numberPadTitle}
        maxValue={numberPadMaxValue}
      />
    </AppShell>
  );
}
