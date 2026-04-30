import { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, X, Package, ShoppingCart, CreditCard, Truck, ChevronLeft, Settings } from 'lucide-react';

interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }
interface Product { id: number; name: string; category: Category; }
interface PaymentMethod { id: number; name: string; }

interface Props {
  suppliers: Supplier[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  flash?: { success?: string; error?: string };
}

interface CartItem {
  product_id: number;
  product_name: string;
  category_name: string;
  quantity: string;
  unit_cost: number;
  line_total: number;
}

interface PaymentEntry {
  payment_method_id: string;
  method_name: string;
  amount: string;
}

export default function PurchasesCreate({ suppliers, products, paymentMethods, flash }: Props) {
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Product selection
  const [selProduct, setSelProduct] = useState('');
  const [selQuantity, setSelQuantity] = useState('');
  const [selUnitCost, setSelUnitCost] = useState('');
  
  // Payment selection
  const [selMethod, setSelMethod] = useState('');
  const [selAmount, setSelAmount] = useState('');
  
  // Modals
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [numberPadTitle, setNumberPadTitle] = useState('');
  const [numberPadInitialValue, setNumberPadInitialValue] = useState('');
  const [numberPadCallback, setNumberPadCallback] = useState<((value: string) => void) | null>(null);

  const selectedProduct = products.find(p => p.id === +selProduct);
  const total = cart.reduce((s, i) => s + i.line_total, 0);
  const totalPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0);
  const remaining = total - totalPaid;
  const canAdd = selectedProduct && selQuantity && selUnitCost && +selQuantity > 0 && +selUnitCost >= 0;

  // Auto-select default payment method
  useEffect(() => {
    if (!selMethod && paymentMethods.length > 0) {
      const cashMethod = paymentMethods.find(m => m.name.includes('نقدي') || m.name.toLowerCase().includes('cash'));
      const defaultMethod = cashMethod || paymentMethods[0];
      setSelMethod(String(defaultMethod.id));
    }
  }, [paymentMethods, selMethod]);

  function addToCart() {
    if (!selectedProduct || !selQuantity || !selUnitCost) return;
    
    const quantity = +selQuantity;
    const totalPrice = +selUnitCost;  // السعر الكلي الذي أدخله المستخدم
    const unitCost = totalPrice / quantity;  // حساب سعر الوحدة
    
    const newItem: CartItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      category_name: selectedProduct.category.name,
      quantity: String(quantity),
      unit_cost: unitCost,  // سعر الوحدة المحسوب
      line_total: totalPrice,  // السعر الكلي
    };
    
    setCart(prev => {
      const newCart = [...prev, newItem];
      const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
      
      // Auto-add payment for the new total (only if no payments exist yet)
      if (prev.length === 0 && paymentMethods.length > 0) {
        const cashMethod = paymentMethods.find(m => m.name.includes('نقدي') || m.name.toLowerCase().includes('cash'));
        const defaultMethod = cashMethod || paymentMethods[0];
        
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
    
    setSelProduct('');
    setSelQuantity('');
    setSelUnitCost('');
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
    
    setPayments(prev => [...prev, { 
      payment_method_id: selMethod, 
      method_name: method.name, 
      amount: selAmount 
    }]);
    setSelMethod('');
    setSelAmount('');
  }

  function submit() {
    if (cart.length === 0 || !supplierId) return;
    
    setProcessing(true);
    router.post('/purchases/with-items', {
      supplier_id: supplierId,
      notes,
      items: cart,
      payments,
    }, { 
      onFinish: () => setProcessing(false) 
    });
  }

  function clearForm() {
    setSupplierId('');
    setNotes('');
    setCart([]);
    setPayments([]);
    setSelProduct('');
    setSelQuantity('');
    setSelUnitCost('');
    setSelMethod('');
    setSelAmount('');
  }

  const supplierOptions = [
    { label: 'اختر المورد...', badge: '' },
    ...suppliers.map(s => ({ label: s.name, badge: '' })),
  ];

  const selectedSupplierName = supplierId
    ? suppliers.find(s => s.id === +supplierId)?.name ?? 'غير محدد'
    : 'اختر المورد...';

  return (
    <AppShell pageTitle="Step 6 — المشتريات والمخزون">
      {/* Purchase System: full-height, no outer scroll */}
      <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-10 h-[calc(100vh-80px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

        {/* ══════════════════════════════════════════════
            LEFT PANEL — إدخال المنتج
        ══════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <Link href="/purchases" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
                <ChevronLeft className="w-4 h-4" /> المشتريات
              </Link>
              <span className="text-slate-300 dark:text-white/10">/</span>
              <span className="font-black text-slate-800 dark:text-white text-sm">فاتورة شراء جديدة</span>
            </div>
            <div className="flex items-center gap-2">
              {flash?.error && <span className="text-xs font-bold text-red-500">{flash.error}</span>}
            </div>
          </div>

          {/* Supplier bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <ModernSelect 
                  label="" 
                  options={supplierOptions} 
                  defaultValue="اختر المورد..." 
                  placeholder="اختر المورد..."
                  onSelect={val => {
                    const supplier = suppliers.find(s => s.name === val);
                    setSupplierId(supplier ? String(supplier.id) : '');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Add product form */}
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {/* Product selection row */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <ModernSelect 
                    label="" 
                    placeholder="اختر المنتج..."
                    options={products.map(p => ({ label: p.name, badge: p.category.name }))}
                    defaultValue=""
                    onSelect={val => {
                      const p = products.find(p => p.name === val);
                      setSelProduct(p ? String(p.id) : '');
                      setSelQuantity('');
                      setSelUnitCost('');
                    }}
                  />
                </div>
                
                {selectedProduct && (
                  <>
                    <button
                      onClick={() => {
                        setNumberPadTitle("الكمية");
                        setNumberPadInitialValue(selQuantity || '');
                        setNumberPadCallback(() => (value: string) => setSelQuantity(value));
                        setShowNumberPad(true);
                      }}
                      className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-28 text-left cursor-pointer hover:border-primary/40 transition-all"
                    >
                      {selQuantity || 'الكمية'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setNumberPadTitle("السعر الكلي");
                        setNumberPadInitialValue(selUnitCost || '');
                        setNumberPadCallback(() => (value: string) => setSelUnitCost(value));
                        setShowNumberPad(true);
                      }}
                      className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-32 text-left cursor-pointer hover:border-primary/40 transition-all"
                    >
                      {selUnitCost || 'السعر الكلي'}
                    </button>
                    
                    {selQuantity && selUnitCost && (
                      <>
                        <div className="flex items-center gap-1 px-3 h-14 rounded-[16px] bg-blue-500/5 border border-blue-500/20">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">سعر/وحدة</span>
                          <span className="font-black text-blue-600 text-sm mr-1">
                            {(+selUnitCost / +selQuantity).toFixed(3)} د
                          </span>
                        </div>
                        <div className="flex items-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">إجمالي</span>
                          <span className="font-black text-primary text-sm mr-1">
                            {(+selUnitCost).toFixed(2)} د
                          </span>
                        </div>
                      </>
                    )}
                    
                    <button onClick={addToCart} disabled={!canAdd}
                      className="spatial-button flex items-center gap-3 px-8 h-14 text-lg font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                      <Plus className="w-6 h-6" /> إضافة
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-primary" />
              <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظات</span>
            </div>
            
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات فاتورة الشراء... (اختياري)"
              className="w-full h-32 spatial-input rounded-[14px] px-4 py-3 text-sm font-bold resize-none placeholder:text-slate-400 dark:placeholder:text-white/20"
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            RIGHT PANEL — الفاتورة
        ══════════════════════════════════════════════ */}
        <div className="w-full lg:w-[650px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0">

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="font-black text-slate-800 dark:text-white text-sm">
                فاتورة الشراء
                {cart.length > 0 && <span className="mr-2 text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{cart.length}</span>}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-white/30">{selectedSupplierName}</span>
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
              <div className="flex flex-col gap-2">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_80px_90px_100px_80px] gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                  <span>المنتج</span>
                  <span className="text-center">الكمية</span>
                  <span className="text-center">سعر/وحدة</span>
                  <span className="text-center">الإجمالي</span>
                  <span className="text-center">إجراءات</span>
                </div>
                
                {cart.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_80px_90px_100px_80px] gap-3 px-4 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/40 transition-all shadow-sm hover:shadow-md group">
                    
                    {/* Product name + category */}
                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="font-bold text-slate-800 dark:text-white text-sm truncate">
                        {item.product_name}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {item.category_name}
                      </div>
                    </div>
                    
                    {/* Quantity */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => {
                          setNumberPadTitle("الكمية");
                          setNumberPadInitialValue(item.quantity);
                          setNumberPadCallback(() => (value: string) => {
                            const newQuantity = +value || 0;
                            if (newQuantity <= 0) return;
                            
                            setCart(prev => {
                              const newCart = prev.map((cartItem, i) => 
                                i === idx 
                                  ? { ...cartItem, quantity: String(newQuantity), line_total: newQuantity * cartItem.unit_cost }
                                  : cartItem
                              );
                              
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
                              }
                              
                              return newCart;
                            });
                          });
                          setShowNumberPad(true);
                        }}
                        className="w-16 h-12 text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl font-black text-sm border-2 border-gray-200 dark:border-gray-600 hover:border-primary/50 transition-all cursor-pointer active:scale-[0.95]"
                      >
                        {item.quantity}
                      </button>
                    </div>
                    
                    {/* Unit cost */}
                    <div className="flex items-center justify-center">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">
                        {item.unit_cost.toFixed(3)}
                      </span>
                    </div>
                    
                    {/* Total */}
                    <div className="flex items-center justify-center">
                      <span className="font-black text-slate-800 dark:text-white text-base">
                        {item.line_total.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-center">
                      <button 
                        onClick={() => {
                          setCart(prev => {
                            const newCart = prev.filter((_, i) => i !== idx);
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
                        className="w-10 h-10 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-[0.95] shadow-lg hover:shadow-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Payment + Submit */}
          <div className="shrink-0 border-t border-black/5 dark:border-white/5">

            {/* Totals */}
            <div className="px-5 py-4 flex flex-col gap-2 border-b border-black/5 dark:border-white/5">
              {[
                { label: 'الإجمالي', value: total.toFixed(2), cls: 'text-slate-800 dark:text-white text-lg font-black' },
                { label: 'المدفوع', value: totalPaid.toFixed(2), cls: 'text-emerald-600 dark:text-emerald-400 font-bold' },
                { label: 'المتبقي', value: remaining.toFixed(2), cls: remaining > 0 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-white/30 font-bold' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500 dark:text-white/40">{label}</span>
                  <span className={cls}>{value} د</span>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="px-5 py-3 border-b border-black/5 dark:border-white/5">
              {/* Payment input */}
              {cart.length > 0 && (
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <ModernSelect 
                      label="" 
                      options={paymentMethods.map(m => ({ label: m.name }))} 
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
                <div key={idx} className="mb-1.5 flex items-center justify-between px-3 py-2 rounded-[10px] bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-all">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-bold text-slate-700 dark:text-white/70 text-sm">{p.method_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{p.amount} د</span>
                    <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))}
                      className="w-5 h-5 rounded-[5px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="px-5 py-4 flex flex-col gap-2">
              <button onClick={submit}
                disabled={processing || cart.length === 0 || !supplierId}
                className="spatial-button w-full flex items-center justify-center gap-2 h-14 text-base font-black disabled:opacity-40">
                <Check className="w-5 h-5" />
                {cart.length > 0 ? `إتمام الشراء — ${total.toFixed(2)} د` : 'إتمام الشراء'}
              </button>
              
              <div className="flex gap-2">
                <Link href="/purchases"
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/8 text-slate-500 dark:text-white/40 font-bold text-sm transition-all">
                  <X className="w-4 h-4" /> إلغاء
                </Link>
                {cart.length > 0 && (
                  <button onClick={clearForm}
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