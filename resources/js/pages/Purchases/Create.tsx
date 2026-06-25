import { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, X, Package, ShoppingCart, CreditCard, ChevronLeft, Truck } from 'lucide-react';

interface Supplier      { id: number; name: string; phone: string; }
interface Category      { id: number; name: string; unit: string; }
interface Product       { id: number; name: string; stock: string; category: Category; qrcode?: string | null; }
interface PaymentMethod { id: number; name: string; }

interface Props {
    suppliers:      Supplier[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface CartItem {
    product_id:    number;
    product_name:  string;
    category_name: string;
    unit:          string;
    quantity:      string;
    unit_cost:     string;
    line_total:    number;
}

interface PaymentEntry {
    payment_method_id: string;
    method_name:       string;
    amount:            string;
}

export default function PurchasesCreate({ suppliers, products, paymentMethods, flash }: Props) {
    const [supplierId,          setSupplierId]          = useState('1');
    const [notes,               setNotes]               = useState('');
    const [cart,                setCart]                = useState<CartItem[]>([]);
    const [payments,            setPayments]            = useState<PaymentEntry[]>([]);
    const [processing,          setProcessing]          = useState(false);
    const [showCreditConfirm,   setShowCreditConfirm]   = useState(false);
    const [paymentManuallySet,  setPaymentManuallySet]  = useState(false);

    // Add product form
    const [selProduct,    setSelProduct]    = useState('');
    const [selQty,        setSelQty]        = useState('');
    const [selTotalPrice, setSelTotalPrice] = useState('');
    const [productKey,    setProductKey]    = useState(0);

    // NumberPad
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);
    
    // Mobile tabs state
    const [activeTab, setActiveTab] = useState<'products' | 'payment' | 'confirm'>('products');

    // Default Payment Method
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string>('');

    // Load default payment method from localStorage
    useEffect(() => {
        const loadDefaultPayment = () => {
            const saved = localStorage.getItem('defaultPaymentMethodId');
            if (saved && paymentMethods.find(m => String(m.id) === saved)) {
                setDefaultPaymentMethodId(saved);
            } else if (paymentMethods.length > 0) {
                setDefaultPaymentMethodId(String(paymentMethods[0].id));
            }
        };

        loadDefaultPayment();
        window.addEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
        return () => window.removeEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
    }, [paymentMethods]);

    // ── Barcode Scanner Listener ─────────────────────────────────────────────
    useEffect(() => {
        let buffer = '';
        let lastTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            
            const now = Date.now();
            if (now - lastTime > 100) {
                buffer = '';
            }
            lastTime = now;

            if (e.key === 'Enter') {
                if (buffer.length > 3) {
                    const scanned = products.find(p => p.qrcode && p.qrcode.toLowerCase() === buffer.toLowerCase());
                    if (scanned) {
                        e.preventDefault();
                        setSelProduct(String(scanned.id));
                        setSelQty(''); setSelTotalPrice('');
                        setProductKey(k => k + 1);
                    }
                }
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [products]);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadCallback(() => cb); setPadMax(max); setShowPad(true);
    }

    // Payment form
    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');

    const selectedProduct   = products.find(p => p.id === +selProduct);
    const total             = cart.reduce((s, i) => s + i.line_total, 0);
    const totalPaid         = payments.reduce((s, p) => s + (+p.amount || 0), 0);
    const remaining         = total - totalPaid;
    const unitCostPreview   = selQty && selTotalPrice && +selQty > 0 ? (+selTotalPrice / +selQty) : null;
    const canAdd            = selectedProduct && selQty && +selQty > 0 && selTotalPrice && +selTotalPrice >= 0;
    const selectedSupplierName = supplierId === '1' ? 'مورد نقدي' : (suppliers.find(s => s.id === +supplierId)?.name ?? '');

    function addToCart() {
        if (!selectedProduct || !selQty || !selTotalPrice) return;
        const qty       = +selQty;
        const lineTotal = +selTotalPrice;
        const unitCost  = qty > 0 ? lineTotal / qty : 0;

        const newCart = [...cart, {
            product_id:    selectedProduct.id,
            product_name:  selectedProduct.name,
            category_name: selectedProduct.category.name,
            unit:          selectedProduct.category.unit,
            quantity:      String(qty),
            unit_cost:     unitCost.toFixed(4),
            line_total:    lineTotal,
        }];
        setCart(newCart);

        const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
        if (!paymentManuallySet) {
            if (payments.length === 0 && paymentMethods.length > 0) {
                const defId = defaultPaymentMethodId || String(paymentMethods[0].id);
                const def = paymentMethods.find(m => String(m.id) === defId) || paymentMethods[0];
                setPayments([{ payment_method_id: String(def.id), method_name: def.name, amount: newTotal.toFixed(2) }]);
            } else if (payments.length === 1) {
                setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]);
            }
        }

        setSelProduct(''); setSelQty(''); setSelTotalPrice('');
        setProductKey(k => k + 1);
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
        if (supplierId === '1' && remaining > 0.01) return;
        if (supplierId !== '1' && remaining > 0.01) {
            setShowCreditConfirm(true);
            return;
        }
        executeSubmit();
    }

    function executeSubmit() {
        setShowCreditConfirm(false);
        setProcessing(true);
        router.post('/purchases', {
            supplier_id: supplierId,
            notes,
            items: cart.map(i => ({
                product_id: i.product_id,
                quantity:   i.quantity,
                line_total: i.line_total,
            })),
            payments: payments.map(p => ({
                payment_method_id: p.payment_method_id,
                amount:            p.amount,
                notes:             null,
            })),
        }, {
            onSuccess: () => {
                setCart([]); setPayments([]); setNotes(''); setPaymentManuallySet(false);
            },
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <>
        <AppShell pageTitle="فاتورة شراء جديدة">
            {/* Desktop Layout */}
            <div className="hidden lg:flex flex-col lg:flex-row gap-0 -m-4 lg:-m-10 h-[calc(100vh-80px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

                {/* ══ LEFT PANEL ══ */}
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
                        <div className="w-full">
                            <ModernSelect key={productKey} label="" placeholder="اختر المنتج..."
                                options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `مخزون: ${p.stock}`, searchKey: p.qrcode ?? undefined }))}
                                defaultValue={selectedProduct?.name ?? ""}
                                onSelect={val => {
                                    const p = products.find(p => p.name === val);
                                    setSelProduct(p ? String(p.id) : '');
                                    setSelQty(''); setSelTotalPrice('');
                                }}
                            />
                        </div>

                        {selectedProduct && (
                            <div className="flex flex-wrap items-end gap-3 w-full pt-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                        الكمية ({selectedProduct.category.unit})
                                    </label>
                                    <button onClick={() => openPad(`الكمية (${selectedProduct.category.unit})`, selQty, setSelQty)}
                                        className="spatial-input h-16 rounded-[20px] px-5 text-[18px] font-black w-36 text-center cursor-pointer hover:border-primary/40 transition-all">
                                        {selQty || '0'}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">السعر الإجمالي</label>
                                    <button onClick={() => openPad('السعر الإجمالي', selTotalPrice, setSelTotalPrice)}
                                        className="spatial-input h-16 rounded-[20px] px-5 text-[18px] font-black w-40 text-center cursor-pointer hover:border-primary/40 transition-all">
                                        {selTotalPrice || '0.00'}
                                    </button>
                                </div>

                                {unitCostPreview !== null && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر الوحدة</label>
                                        <div className="flex items-center h-16 px-5 rounded-[20px] bg-primary/5 border border-primary/20">
                                            <span className="font-black text-primary text-[18px]">{unitCostPreview.toFixed(3)}</span>
                                        </div>
                                    </div>
                                )}

                                <button onClick={addToCart} disabled={!canAdd}
                                    className="spatial-button flex items-center gap-2 px-8 h-16 text-base font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                                    <Plus className="w-5 h-5" /> إضافة
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Totals + Payment */}
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
                                    <span className={cls}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Payment section */}
                        {cart.length > 0 && (
                            <div className="flex gap-3">
                                {/* يسار — تسجيل دفعة */}
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
                                            onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), setSelAmount, remaining)}
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
                                                    <span className="font-black text-slate-800 dark:text-white text-lg">{p.amount}</span>
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

                    {/* Submit */}
                    <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex flex-col gap-2">
                        {supplierId === '1' && remaining > 0.01 && (
                            <div className="px-4 py-2 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                ⚠️ مورد نقدي — يجب الدفع الكامل قبل التأكيد
                            </div>
                        )}
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-2 w-1/4">
                                <Link href="/purchases"
                                    className="h-[68px] flex items-center justify-center gap-2 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/10 dark:border-white/20">
                                    <X className="w-4 h-4" /> إلغاء
                                </Link>
                                {cart.length > 0 && (
                                    <button onClick={() => { setCart([]); setPayments([]); setPaymentManuallySet(false); }}
                                        className="h-[68px] flex items-center justify-center gap-2 rounded-[16px] bg-red-500/15 dark:bg-red-500/25 hover:bg-red-500/30 border border-red-500/30 text-red-500 dark:text-red-400 font-bold text-sm transition-all">
                                        <Trash2 className="w-4 h-4" /> مسح
                                    </button>
                                )}
                            </div>
                            <button onClick={submit}
                                disabled={processing || cart.length === 0 || (supplierId === '1' && remaining > 0.01)}
                                className="spatial-button flex-1 flex items-center justify-center gap-2 text-lg font-black disabled:opacity-40"
                                style={{ height: cart.length > 0 ? '144px' : '68px' }}>
                                <Check className="w-6 h-6" />
                                {cart.length > 0 ? `تأكيد الشراء — ${total.toFixed(2)}` : 'تأكيد الشراء'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT PANEL ══ */}
                <div className="w-full lg:w-[600px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">

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

                    <div className="px-4 pb-3 border-t border-black/5 dark:border-white/5 shrink-0 pt-3">
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            rows={2} placeholder="ملاحظات على فاتورة الشراء... (اختياري)"
                            className="w-full spatial-input rounded-[16px] px-4 py-3 text-sm font-bold resize-none" />
                    </div>
                </div>
            </div>

            {/* Mobile Layout with Tabs */}
            <div className="lg:hidden flex flex-col -m-4 h-[calc(100vh-80px)] overflow-hidden">
                
                {/* Top Bar - Supplier Selection */}
                <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
                        <Link href="/purchases" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-xs">
                            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                        </Link>
                        <span className="font-black text-slate-800 dark:text-white text-xs">فاتورة شراء</span>
                        <div className="w-8" />
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-2">
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
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 shrink-0">
                    <button onClick={() => setActiveTab('products')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${
                            activeTab === 'products' 
                                ? 'text-primary' 
                                : 'text-slate-400 dark:text-white/40'
                        }`}>
                        <Package className="w-4 h-4" />
                        <span>المنتجات</span>
                        {cart.length > 0 && (
                            <span className="absolute top-2 left-1/2 -translate-x-1/2 translate-x-6 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                                {cart.length}
                            </span>
                        )}
                        {activeTab === 'products' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                    <button onClick={() => setActiveTab('payment')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${
                            activeTab === 'payment' 
                                ? 'text-primary' 
                                : 'text-slate-400 dark:text-white/40'
                        }`}>
                        <CreditCard className="w-4 h-4" />
                        <span>الدفع</span>
                        {activeTab === 'payment' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                    <button onClick={() => setActiveTab('confirm')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${
                            activeTab === 'confirm' 
                                ? 'text-primary' 
                                : 'text-slate-400 dark:text-white/40'
                        }`}>
                        <Check className="w-4 h-4" />
                        <span>تأكيد</span>
                        {activeTab === 'confirm' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <div className="h-full flex flex-col overflow-hidden">
                            {/* Add Product Form */}
                            <div className="px-3 py-3 border-b border-black/5 dark:border-white/5 shrink-0 overflow-y-auto">
                                <div className="flex flex-col gap-2.5">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">المنتج</label>
                                        <ModernSelect key={productKey} label="" placeholder="اختر المنتج..."
                                            options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `مخزون: ${p.stock}`, searchKey: p.qrcode ?? undefined }))}
                                            defaultValue={selectedProduct?.name ?? ""}
                                            onSelect={val => {
                                                const p = products.find(p => p.name === val);
                                                setSelProduct(p ? String(p.id) : '');
                                                setSelQty(''); setSelTotalPrice('');
                                            }}
                                        />
                                    </div>

                                    {selectedProduct && (
                                        <>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">
                                                        الكمية ({selectedProduct.category.unit})
                                                    </label>
                                                    <button onClick={() => openPad(`الكمية (${selectedProduct.category.unit})`, selQty, setSelQty)}
                                                        className="spatial-input h-12 rounded-[14px] px-3 text-base font-black w-full text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95">
                                                        {selQty || '0'}
                                                    </button>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">السعر الإجمالي</label>
                                                    <button onClick={() => openPad('السعر الإجمالي', selTotalPrice, setSelTotalPrice)}
                                                        className="spatial-input h-12 rounded-[14px] px-3 text-base font-black w-full text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95">
                                                        {selTotalPrice || '0.00'}
                                                    </button>
                                                </div>
                                            </div>

                                            {unitCostPreview !== null && (
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">سعر الوحدة</label>
                                                    <div className="h-12 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                        <span className="font-black text-primary text-lg">{unitCostPreview.toFixed(3)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <button onClick={addToCart} disabled={!canAdd}
                                                className="spatial-button w-full flex items-center justify-center gap-2 px-6 h-14 text-lg font-black disabled:opacity-40 active:scale-95 transition-transform mt-2">
                                                <Plus className="w-5 h-5" /> إضافة للسلة
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto px-3 py-3">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                                        <ShoppingCart className="w-12 h-12" />
                                        <span className="font-bold text-sm">السلة فارغة</span>
                                        <span className="text-xs">أضف منتجات من الأعلى</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product_name}</h3>
                                                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.category_name}</p>
                                                    </div>
                                                    <button onClick={() => removeFromCart(idx)}
                                                        className="w-9 h-9 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-95 shrink-0">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700">
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">كمية:</span>
                                                        <span className="font-bold text-sm text-slate-800 dark:text-white">{item.quantity}{item.unit}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700">
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">سعر الوحدة:</span>
                                                        <span className="font-bold text-sm text-slate-800 dark:text-white">{item.unit_cost}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-primary/10 border border-primary/20">
                                                        <span className="text-[10px] font-bold text-primary">إجمالي:</span>
                                                        <span className="font-black text-sm text-primary">{item.line_total.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Tab */}
                    {activeTab === 'payment' && (
                        <div className="h-full flex flex-col overflow-hidden">
                            {/* Totals Summary */}
                            <div className="px-3 py-3 border-b border-black/5 dark:border-white/5 shrink-0 bg-black/2 dark:bg-white/2">
                                <div className="flex flex-col gap-2 p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-600 dark:text-white/60">الإجمالي</span>
                                        <span className="text-2xl font-black text-primary">{total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">المدفوع</span>
                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalPaid.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                        <span className="text-sm font-bold text-slate-600 dark:text-white/60">المتبقي</span>
                                        <span className={`text-2xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>{remaining.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="flex-1 overflow-y-auto px-3 py-3">
                                <div className="flex flex-col gap-3">
                                    {cart.length > 0 && (
                                        <div className="flex flex-col gap-2.5">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة دفعة</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {paymentMethods.map(m => (
                                                    <button key={m.id}
                                                        onClick={() => setSelMethod(selMethod === String(m.id) ? '' : String(m.id))}
                                                        className={`h-14 rounded-[14px] font-bold text-sm transition-all border-2 ${
                                                            selMethod === String(m.id)
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-primary/40 active:scale-95'
                                                        }`}>
                                                        {m.name}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), setSelAmount, remaining)}
                                                    className="spatial-input flex-1 h-14 rounded-[14px] px-3 text-base font-black text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95">
                                                    {selAmount || remaining.toFixed(2)}
                                                </button>
                                                <button onClick={addPayment} disabled={!selMethod || !selAmount}
                                                    className="spatial-button flex items-center justify-center w-16 h-14 disabled:opacity-40 active:scale-95">
                                                    <Plus className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الدفعات</label>
                                        {payments.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-white/20">
                                                <CreditCard className="w-12 h-12 mb-2" />
                                                <span className="font-bold text-sm">لا توجد دفعات</span>
                                                <span className="text-xs mt-1">أضف دفعة من الأعلى</span>
                                            </div>
                                        ) : (
                                            payments.map((p, idx) => (
                                                <div key={idx} className="flex items-center gap-2 px-3 h-16 rounded-[14px] bg-emerald-500/10 border-2 border-emerald-500/20">
                                                    <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] truncate">{p.method_name}</span>
                                                        <span className="font-black text-slate-800 dark:text-white text-base truncate">{p.amount}</span>
                                                    </div>
                                                    <button onClick={() => { setPayments(prev => prev.filter((_, i) => i !== idx)); setPaymentManuallySet(false); }}
                                                        className="w-10 h-10 rounded-[12px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-95">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Confirm Tab */}
                    {activeTab === 'confirm' && (
                        <div className="h-full flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-3 py-3">
                                <div className="flex flex-col gap-3">
                                    <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Truck className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المورد</span>
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-white">{selectedSupplierName}</span>
                                    </div>
                                    <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ShoppingCart className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المنتجات</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 dark:text-white">{cart.length} منتج</span>
                                            <span className="text-lg font-black text-primary">{total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CreditCard className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الدفع</span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {payments.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600 dark:text-slate-400 font-bold">{p.method_name}</span>
                                                    <span className="font-black text-slate-800 dark:text-white">{p.amount}</span>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                                <span className="font-bold text-slate-600 dark:text-white/60">المجموع</span>
                                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{totalPaid.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-[14px] bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-slate-600 dark:text-white/60">الإجمالي</span>
                                            <span className="text-2xl font-black text-primary">{total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-600 dark:text-white/60">المتبقي</span>
                                            <span className={`text-xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}>{remaining.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">ملاحظات</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                            rows={3} placeholder="ملاحظات على الفاتورة... (اختياري)"
                                            className="w-full spatial-input rounded-[14px] px-3 py-2.5 text-xs font-bold resize-none" />
                                    </div>
                                    {supplierId === '1' && remaining > 0.01 && (
                                        <div className="px-3 py-2.5 rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                ⚠️ مورد نقدي — يجب الدفع الكامل قبل التأكيد
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-3 py-3 border-t border-black/5 dark:border-white/5 shrink-0 bg-white dark:bg-slate-900">
                                <div className="flex flex-col gap-2">
                                    <button onClick={submit}
                                        disabled={processing || cart.length === 0 || (supplierId === '1' && remaining > 0.01)}
                                        className="spatial-button w-full flex items-center justify-center gap-2 h-14 text-lg font-black disabled:opacity-40 active:scale-95 transition-transform">
                                        <Check className="w-5 h-5" />
                                        <span>تأكيد الشراء — {total.toFixed(2)}</span>
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        {cart.length > 0 && (
                                            <button onClick={() => { setCart([]); setPayments([]); setPaymentManuallySet(false); }}
                                                className="flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] bg-red-500/15 hover:bg-red-500/30 border-2 border-red-500/30 text-red-500 font-bold text-xs transition-all active:scale-95">
                                                <Trash2 className="w-4 h-4" />
                                                <span>مسح</span>
                                            </button>
                                        )}
                                        <Link href="/purchases"
                                            className={`flex flex-col items-center justify-center gap-1 h-16 rounded-[12px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border-2 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 font-bold text-xs transition-all ${cart.length > 0 ? '' : 'col-span-2'}`}>
                                            <X className="w-4 h-4" />
                                            <span>إلغاء</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>

        <NumberPadModal
            isOpen={showPad}
            title={padTitle}
            initialValue={padInitial}
            maxValue={padMax}
            onClose={() => setShowPad(false)}
            onConfirm={v => { padCallback?.(v); setShowPad(false); }}
        />
        <ConfirmModal
            isOpen={showCreditConfirm}
            title="إتمام العملية بالآجل"
            description={`يوجد مبلغ متبقي (${remaining.toFixed(2)})، هل أنت متأكد من حفظ المعاملة بالآجل؟`}
            confirmText="تأكيد وحفظ"
            onConfirm={executeSubmit}
            onCancel={() => setShowCreditConfirm(false)}
        />
        </>
    );
}
