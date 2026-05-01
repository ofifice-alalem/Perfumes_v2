import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, X, Package, ShoppingCart, CreditCard, ChevronLeft, Truck } from 'lucide-react';

interface Supplier      { id: number; name: string; phone: string; }
interface Category      { id: number; name: string; unit: string; }
interface Product       { id: number; name: string; stock: string; category: Category; }
interface PaymentMethod { id: number; name: string; }

interface Props {
  suppliers: Supplier[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  defaultSupplierId: number;
  flash?: { success?: string; error?: string };
}

interface CartItem {
  product_id: number;
  product_name: string;
  category_name: string;
  unit: string;
  quantity: string;
  unit_cost: string;
  line_total: number;
}

interface PaymentEntry {
  payment_method_id: string;
  method_name: string;
  amount: string;
}

export default function PurchaseCreate({ suppliers, products, paymentMethods, defaultSupplierId, flash }: Props) {
  const [supplierId, setSupplierId] = useState(String(defaultSupplierId));
  const [notes,       setNotes]       = useState('');
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [payments,    setPayments]    = useState<PaymentEntry[]>([]);
  const [processing,  setProcessing]  = useState(false);
  const [paymentManuallySet, setPaymentManuallySet] = useState(false);

  // Add product form state
  const [selProduct,    setSelProduct]    = useState('');
  const [selQty,        setSelQty]        = useState('');
  const [selTotalPrice, setSelTotalPrice] = useState('');
  const [productKey,    setProductKey]    = useState(0); // لإعادة تهيئة ModernSelect

  // NumberPad state
  const [showNumberPad,      setShowNumberPad]      = useState(false);
  const [numberPadTitle,     setNumberPadTitle]     = useState('');
  const [numberPadInitial,   setNumberPadInitial]   = useState('');
  const [numberPadCallback,  setNumberPadCallback]  = useState<((v: string) => void) | null>(null);

  function openNumberPad(title: string, initial: string, cb: (v: string) => void) {
    setNumberPadTitle(title);
    setNumberPadInitial(initial);
    setNumberPadCallback(() => cb);
    setShowNumberPad(true);
  }

  // Add payment form state
  const [selMethod,   setSelMethod]   = useState('');
  const [selAmount,   setSelAmount]   = useState('');

  const selectedProduct = products.find(p => p.id === +selProduct);
  const total     = cart.reduce((s, i) => s + i.line_total, 0);
  const totalPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0);
  const remaining = total - totalPaid;

  const unitCostPreview = selQty && selTotalPrice && +selQty > 0 ? (+selTotalPrice / +selQty) : null;
  const canAdd = selectedProduct && selQty && +selQty > 0 && selTotalPrice && +selTotalPrice >= 0;

  function addToCart() {
    if (!selectedProduct || !selQty || !selTotalPrice) return;
    const qty       = +selQty;
    const lineTotal = +selTotalPrice;
    const unitCost  = qty > 0 ? lineTotal / qty : 0;
    const newItem: CartItem = {
      product_id:    selectedProduct.id,
      product_name:  selectedProduct.name,
      category_name: selectedProduct.category.name,
      unit:          selectedProduct.category.unit,
      quantity:      String(qty),
      unit_cost:     unitCost.toFixed(4),
      line_total:    lineTotal,
    };
    const newCart = [...cart, newItem];
    setCart(newCart);

    // تحديث الدفعة التلقائية فقط إذا لم يتدخل المستخدم
    const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
    if (!paymentManuallySet) {
      if (payments.length === 0 && paymentMethods.length > 0) {
        const def = paymentMethods[0];
        setPayments([{ payment_method_id: String(def.id), method_name: def.name, amount: newTotal.toFixed(2) }]);
      } else if (payments.length === 1) {
        setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]);
      }
    }

    setSelProduct(''); setSelQty(''); setSelTotalPrice('');
    setProductKey(k => k + 1); // إعادة تهيئة ModernSelect لإغلاق القائمة
  }

  function removeFromCart(idx: number) {
    const newCart = cart.filter((_, i) => i !== idx);
    setCart(newCart);
    const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
    if (payments.length === 1) {
      if (newTotal > 0) setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]);
      else setPayments([]);
    }
  }

  function addPayment() {
    if (!selMethod || !selAmount || +selAmount <= 0) return;
    if (+selAmount > remaining) return;
    const method = paymentMethods.find(m => m.id === +selMethod);
    if (!method) return;

    setPayments(prev => {
      const existing = prev.findIndex(p => p.payment_method_id === selMethod);
      if (existing !== -1) {
        // نفس الوسيلة — نجمع المبلغ
        return prev.map((p, i) => i === existing
          ? { ...p, amount: (+p.amount + +selAmount).toFixed(2) }
          : p
        );
      }
      return [...prev, { payment_method_id: selMethod, method_name: method.name, amount: selAmount }];
    });

    setPaymentManuallySet(true);
    setSelMethod(''); setSelAmount('');
  }

  function submit() {
    if (!supplierId || cart.length === 0) return;
    if (supplierId === '1' && remaining > 0.01) return; // مورد نقدي — يجب الدفع الكامل
    setProcessing(true);
    router.post('/purchases/store-with-items', {
      supplier_id: supplierId,
      notes,
      items: cart.map(i => ({
        product_id: i.product_id,
        quantity:   i.quantity,
        unit_cost:  i.unit_cost,
      })),
      payments,
    }, { onFinish: () => setProcessing(false) });
  }

  const selectedSupplierName = supplierId
    ? suppliers.find(s => s.id === +supplierId)?.name ?? ''
    : 'اختر المورد';

  return (
    <>
      <AppShell pageTitle="فاتورة شراء جديدة">
      <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-10 h-[calc(100vh-80px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

        {/* ══════════════════════════════════════════════
            LEFT PANEL — إدخال المنتجات
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
            {flash?.error && <span className="text-xs font-bold text-red-500">{flash.error}</span>}
          </div>

          {/* Supplier bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <ModernSelect label="" placeholder="مورد نقدي"
                options={[
                  { label: 'مورد نقدي', badge: 'نقدي' },
                  ...suppliers.map(s => ({ label: s.name, meta: s.phone })),
                ]}
                defaultValue="مورد نقدي"
                onSelect={val => {
                  if (val === 'مورد نقدي') { setSupplierId('1'); return; }
                  const s = suppliers.find(s => s.name === val);
                  setSupplierId(s ? String(s.id) : '1');
                }}
              />
            </div>
          </div>

          {/* Add product form */}
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج</span>
            </div>
            {/* صف 1: اسم المنتج */}
            <div className="w-full">
              <ModernSelect key={productKey} label="" placeholder="اختر المنتج..."
                options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `مخزون: ${p.stock}` }))}
                defaultValue=""
                onSelect={val => {
                  const p = products.find(p => p.name === val);
                  setSelProduct(p ? String(p.id) : '');
                  setSelQty(''); setSelTotalPrice('');
                }}
              />
            </div>

            {/* صف 2: الكمية + السعر + معاينة + زر */}
            {selectedProduct && (
              <div className="flex flex-wrap items-end gap-3 w-full pt-6">
                {/* الكمية */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                    الكمية ({selectedProduct.category.unit})
                  </label>
                  <button onClick={() => openNumberPad(`الكمية (${selectedProduct.category.unit})`, selQty, setSelQty)}
                    className="spatial-input h-16 rounded-[20px] px-5 text-[18px] font-black w-36 text-center cursor-pointer hover:border-primary/40 transition-all">
                    {selQty || '0'}
                  </button>
                </div>

                {/* السعر الإجمالي */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">السعر الإجمالي (د)</label>
                  <button onClick={() => openNumberPad('السعر الإجمالي', selTotalPrice, setSelTotalPrice)}
                    className="spatial-input h-16 rounded-[20px] px-5 text-[18px] font-black w-40 text-center cursor-pointer hover:border-primary/40 transition-all">
                    {selTotalPrice || '0.00'}
                  </button>
                </div>

                {/* معاينة سعر الوحدة */}
                {unitCostPreview !== null && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر الوحدة</label>
                    <div className="flex items-center h-16 px-5 rounded-[20px] bg-primary/5 border border-primary/20">
                      <span className="font-black text-primary text-[18px]">{unitCostPreview.toFixed(3)} د</span>
                    </div>
                  </div>
                )}

                {/* زر الإضافة */}
                <button onClick={addToCart} disabled={!canAdd}
                  className="spatial-button flex items-center gap-2 px-8 h-16 text-base font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                  <Plus className="w-5 h-5" /> إضافة
                </button>
              </div>
            )}
          </div>

          {/* Totals + Payment + Submit */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {/* Totals */}
            <div className="flex flex-col gap-2 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
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
            {cart.length > 0 && (
              <div className="flex gap-3">

                {/* يسار — تسجيل دفعة جديدة */}
                <div className="flex flex-col gap-2 w-1/2">
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map(m => (
                      <button key={m.id}
                        onClick={() => setSelMethod(selMethod === String(m.id) ? '' : String(m.id))}
                        className={`flex-1 min-w-[70px] h-16 rounded-[16px] font-bold text-base transition-all border-2 ${
                          selMethod === String(m.id)
                            ? 'bg-primary border-primary text-white'
                            : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-primary/40'
                        }`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openNumberPad('المبلغ', selAmount || remaining.toFixed(2), setSelAmount)}
                      className="spatial-input flex-1 h-16 rounded-[20px] px-4 text-[18px] font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                      {selAmount || remaining.toFixed(2)}
                    </button>
                    <button onClick={addPayment} disabled={!selMethod || !selAmount}
                      className="spatial-button flex items-center justify-center w-20 h-16 disabled:opacity-40 shrink-0">
                      <Plus className="w-7 h-7" />
                    </button>
                  </div>
                </div>

                {/* يمين — كاردات الدفعات */}
                <div className="flex flex-col gap-2 w-1/2">
                  {payments.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center h-full text-slate-300 dark:text-white/20 font-bold text-sm">لا توجد دفعات</div>
                  ) : (
                    payments.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-4 h-[70px] rounded-[18px] bg-emerald-500/10 border-2 border-emerald-500/20">
                        <CreditCard className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{p.method_name}</span>
                          <span className="font-black text-slate-800 dark:text-white text-lg">{p.amount} دينار</span>
                        </div>
                        <button onClick={() => { setPayments(prev => prev.filter((_, i) => i !== idx)); setPaymentManuallySet(false); }}
                          className="w-12 h-12 rounded-[14px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit — ثابت في الأسفل */}
          <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex flex-col gap-2" style={{ transform: 'translateY(-35px)' }}>
            {supplierId === '1' && remaining > 0.01 && (
              <div className="px-4 py-2 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                ⚠️ مورد نقدي — يجب الدفع الكامل قبل التأكيد
              </div>
            )}
            <div className="flex gap-2">
            {/* الإلغاء + المسح — يسار */}
            <div className="flex flex-col gap-2 w-1/4">
              <Link href="/purchases"
                className="h-[70px] flex items-center justify-center gap-2 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/10 dark:border-white/20">
                <X className="w-4 h-4" /> إلغاء
              </Link>
              {cart.length > 0 && (
                <button onClick={() => { setCart([]); setPayments([]); setPaymentManuallySet(false); }}
                  className="h-[70px] flex items-center justify-center gap-2 rounded-[16px] bg-red-500/15 dark:bg-red-500/25 hover:bg-red-500/30 dark:hover:bg-red-500/40 border border-red-500/30 dark:border-red-500/40 text-red-500 dark:text-red-400 font-bold text-sm transition-all">
                  <Trash2 className="w-4 h-4" /> مسح
                </button>
              )}
            </div>
            {/* تأكيد — يمين */}
            <button onClick={submit}
              disabled={processing || !supplierId || cart.length === 0 || (supplierId === '1' && remaining > 0.01)}
              className="spatial-button flex-1 flex items-center justify-center gap-2 text-lg font-black disabled:opacity-40"
              style={{ height: cart.length > 0 ? '148px' : '70px' }}>
              <Check className="w-6 h-6" />
              {cart.length > 0 ? `تأكيد الشراء — ${total.toFixed(2)} د` : 'تأكيد الشراء'}
            </button>
          </div>
          </div>
        </div>

        {/* RIGHT PANEL — عناصر الفاتورة */}
        <div className="w-full lg:w-[600px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="font-black text-slate-800 dark:text-white text-sm">
                عناصر الفاتورة
                {cart.length > 0 && <span className="mr-2 text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{cart.length}</span>}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-white/30">{selectedSupplierName}</span>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                <Package className="w-12 h-12" />
                <span className="font-bold text-sm">لا توجد منتجات</span>
                <span className="text-xs">أضف منتجاً من اليسار</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[2fr_80px_90px_100px_60px] gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                  <span>المنتج</span>
                  <span className="text-center">الكمية</span>
                  <span className="text-center">سعر الوحدة</span>
                  <span className="text-center">الإجمالي</span>
                  <span className="text-center">حذف</span>
                </div>
                {cart.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_80px_90px_100px_60px] gap-3 px-4 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-sm">
                    <div className="min-w-0 flex flex-col justify-center">
                      <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product_name}</span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.category_name}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{item.quantity}{item.unit}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{item.unit_cost}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="font-black text-slate-800 dark:text-white text-base">{item.line_total.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <button onClick={() => removeFromCart(idx)}
                        className="w-10 h-10 rounded-[12px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-[0.95]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ملاحظات */}
          <div className="px-4 pb-3 border-t border-black/5 dark:border-white/5 shrink-0 pt-3">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="ملاحظات على فاتورة الشراء... (اختياري)"
              className="w-full spatial-input rounded-[16px] px-4 py-3 text-sm font-bold resize-none" />
          </div>
        </div>
      </div>
    </AppShell>

      <NumberPadModal
        isOpen={showNumberPad}
        onClose={() => setShowNumberPad(false)}
        onConfirm={v => { numberPadCallback?.(v); }}
        initialValue={numberPadInitial}
        title={numberPadTitle}
      />
    </>
  );
}
