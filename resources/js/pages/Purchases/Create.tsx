import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, X, Package, ShoppingCart, CreditCard, ChevronLeft, Truck, Wallet, ChevronUp } from 'lucide-react';

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
    const [showPaymentDrawer,   setShowPaymentDrawer]   = useState(false);
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

    useEffect(() => {
        if (showPaymentDrawer) {
            const rem = total - totalPaid;
            if (!selMethod && paymentMethods.length > 0) {
                const defId = defaultPaymentMethodId || String(paymentMethods[0].id);
                setSelMethod(defId);
                setSelAmount(rem > 0 ? rem.toFixed(2) : '');
            } else if (!selAmount && rem > 0) {
                setSelAmount(rem.toFixed(2));
            }
        }
    }, [showPaymentDrawer]);

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
            <div className="hidden lg:flex flex-row gap-0 -m-4 lg:-m-10 h-[calc(100dvh-155px)] overflow-hidden">

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
                    <div className="px-5 py-4 flex-1 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج للفاتورة</span>
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
                            <div className="flex flex-col gap-4 w-full pt-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
                                            الكمية ({selectedProduct.category.unit})
                                        </label>
                                        <button onClick={() => openPad(`الكمية (${selectedProduct.category.unit})`, selQty, setSelQty)}
                                            className="spatial-input h-16 sm:h-20 rounded-[22px] px-5 sm:px-6 text-xl sm:text-[24px] font-black text-center cursor-pointer hover:border-primary/40 transition-all border-2 active:scale-95 shadow-sm">
                                            {selQty || '0'}
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">السعر الإجمالي</label>
                                        <button onClick={() => openPad('السعر الإجمالي', selTotalPrice, setSelTotalPrice)}
                                            className="spatial-input h-16 sm:h-20 rounded-[22px] px-5 sm:px-6 text-xl sm:text-[24px] font-black text-center cursor-pointer hover:border-primary/40 transition-all border-2 active:scale-95 shadow-sm">
                                            {selTotalPrice || '0.00'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                    {unitCostPreview !== null && (
                                        <div className="flex-1 flex items-center justify-between px-5 h-16 sm:h-20 rounded-[22px] bg-primary/10 border-2 border-primary/20">
                                            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">سعر الوحدة</span>
                                            <span className="font-black text-primary text-xl sm:text-2xl">{unitCostPreview.toFixed(3)} <span className="text-xs font-bold">د.ل</span></span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                            setSelProduct(''); setSelQty(''); setSelTotalPrice(''); setProductKey(k => k + 1);
                                        }}
                                        title="إلغاء الاختيار وتفريغ الحقول"
                                        className="h-16 sm:h-20 px-4 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border-2 border-red-500/30 text-red-500 font-black text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer shadow-sm">
                                            <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                                            <span>إلغاء</span>
                                        </button>
                                        <button onClick={addToCart} disabled={!canAdd}
                                            className="spatial-button flex-1 sm:flex-initial min-w-[140px] flex items-center justify-center gap-2.5 px-8 h-16 sm:h-20 rounded-[22px] text-xl font-black disabled:opacity-40 shrink-0 active:scale-95 hover:scale-[1.02] shadow-lg">
                                            <Plus className="w-6 h-6" /> إضافة للسلة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fixed Bottom Submit Action Bar */}
                    <div className="px-3 sm:px-5 pt-2.5 sm:pt-3 pb-2 sm:pb-2.5 border-t border-black/5 dark:border-white/5 shrink-0 flex items-stretch gap-2 sm:gap-3">
                        <div className="flex flex-col gap-2 shrink-0">
                            <Link href="/purchases" className="h-16 sm:h-20 w-36 sm:w-48 flex items-center justify-center gap-2.5 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-black text-base sm:text-lg transition-all border border-black/10 dark:border-white/20 shrink-0 shadow-sm active:scale-95">
                                <X className="w-6 h-6" /> إلغاء
                            </Link>
                            <button onClick={() => { setCart([]); setPayments([]); setPaymentManuallySet(false); }} disabled={cart.length === 0} className="h-16 sm:h-20 w-36 sm:w-48 flex items-center justify-center gap-2.5 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-black text-base sm:text-lg transition-all shrink-0 shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none">
                                <Trash2 className="w-6 h-6" /> مسح
                            </button>
                        </div>
                        <button onClick={() => setShowPaymentDrawer(true)}
                            disabled={cart.length === 0}
                            className="spatial-button flex-1 flex items-center justify-between px-6 sm:px-10 rounded-[28px] text-xl sm:text-[24px] font-black shadow-2xl disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all">
                            <div className="flex items-center gap-3.5">
                                <Wallet className="w-8 h-8 sm:w-10 sm:h-10" />
                                <span>تأكيد الشراء والانتقال للدفع</span>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <span className="text-xs sm:text-sm font-black bg-white/20 dark:bg-black/20 px-3.5 py-2 rounded-full">{cart.length} أصناف</span>
                                <span className="text-2xl sm:text-3xl font-black">{total.toFixed(2)} د.ل</span>
                                <ChevronUp className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* ══ RIGHT PANEL ══ */}
                <div className="w-full lg:w-[600px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">

                    <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            <span className="font-black text-slate-800 dark:text-white text-base">
                                عناصر الفاتورة
                                {cart.length > 0 && <span className="mr-2 text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">{cart.length}</span>}
                            </span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-500 dark:text-white/40">{selectedSupplierName}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                                <Package className="w-16 h-16" />
                                <span className="font-black text-lg">السلة فارغة</span>
                                <span className="text-sm font-bold">اختر منتجاً من اليسار لإضافته للفاتورة</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-[2fr_90px_100px_110px_72px] gap-2.5 px-4 py-2.5 text-xs font-black text-slate-500 dark:text-white/40 bg-slate-100/70 dark:bg-slate-800/70 rounded-[14px] border border-black/5 dark:border-white/10">
                                    <span>المنتج</span>
                                    <span className="text-center">الكمية</span>
                                    <span className="text-center">سعر الوحدة</span>
                                    <span className="text-center">الإجمالي</span>
                                    <span className="text-center">حذف</span>
                                </div>
                                {cart.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-[2fr_90px_100px_110px_72px] gap-2.5 px-4 py-3.5 rounded-[20px] bg-white dark:bg-slate-800 border-2 border-black/5 dark:border-white/10 hover:border-primary/40 transition-all shadow-sm items-center">
                                        <div className="min-w-0 flex flex-col justify-center">
                                            <span className="font-black text-slate-900 dark:text-white text-base truncate">{item.product_name}</span>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{item.category_name}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <div className="w-full h-14 rounded-[14px] bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 font-black text-sm text-slate-800 dark:text-white flex items-center justify-center">
                                                {item.quantity}{item.unit}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <div className="w-full h-14 rounded-[14px] bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 font-black text-sm text-slate-800 dark:text-white flex items-center justify-center">
                                                {item.unit_cost}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="font-black text-primary text-lg sm:text-xl">{item.line_total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <button onClick={() => removeFromCart(idx)}
                                                title="حذف المنتج من الفاتورة"
                                                className="w-16 h-16 rounded-[20px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/25 cursor-pointer shrink-0">
                                                <Trash2 className="w-8 h-8 stroke-[2.5]" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-4 pb-4 border-t border-black/5 dark:border-white/5 shrink-0 pt-3">
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            rows={2} placeholder="ملاحظات على فاتورة الشراء... (اختياري)"
                            className="w-full spatial-input rounded-[18px] px-4 py-3 text-sm font-bold resize-none" />
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

        {/* ══ PAYMENT DRAWER (BOTTOM SHEET) ══ */}
        {showPaymentDrawer && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex flex-col justify-end animate-in fade-in duration-200" onClick={() => setShowPaymentDrawer(false)}>
                <div className="bg-white dark:bg-slate-900 border-t border-black/10 dark:border-white/10 rounded-t-[36px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>

                    {/* Drawer Header */}
                    <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-[18px] bg-primary/10 text-primary flex items-center justify-center font-black">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white">إتمام تسوية فاتورة الشراء والسداد</h2>
                                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-white/40">
                                    المورد: <span className="text-primary font-black">{selectedSupplierName}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowPaymentDrawer(false)} className="w-12 h-12 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-600 dark:text-white/70 transition-all active:scale-95">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="p-6 sm:p-8 overflow-y-auto flex flex-col gap-6">

                        {/* Top Totals Strip */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-5 rounded-[26px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/5">
                            <div className="flex flex-col items-center justify-center p-3 rounded-[20px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5 shadow-sm">
                                <span className="text-xs sm:text-sm font-black text-slate-500 dark:text-white/40 mb-1">إجمالي الشراء</span>
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{total.toFixed(2)} <span className="text-xs font-bold">د.ل</span></span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                                <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 mb-1">المدفوع للمورد</span>
                                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{totalPaid.toFixed(2)} <span className="text-xs font-bold">د.ل</span></span>
                            </div>
                            <div className={`flex flex-col items-center justify-center p-3 rounded-[20px] border shadow-sm ${remaining > 0.01 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-100 dark:bg-slate-800 border-black/5 dark:border-white/5'}`}>
                                <span className="text-xs sm:text-sm font-black text-slate-500 dark:text-white/40 mb-1">المتبقي (آجل)</span>
                                <span className={`text-2xl sm:text-3xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>{remaining.toFixed(2)} <span className="text-xs font-bold">د.ل</span></span>
                            </div>
                        </div>

                        {/* Middle Content — Payment Methods & Payments List */}
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Left Col — Select Payment Method */}
                            <div className="flex flex-col gap-4 w-full lg:w-1/2">
                                <label className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">اختر طريقة التسوية والمبلغ</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {paymentMethods.map(m => {
                                        const methodId = String(m.id);
                                        const isSelected = selMethod === methodId;
                                        return (
                                            <button key={m.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelMethod('');
                                                        setSelAmount('');
                                                    } else {
                                                        setSelMethod(methodId);
                                                        setSelAmount(remaining > 0 ? remaining.toFixed(2) : '');
                                                    }
                                                }}
                                                className={`h-16 sm:h-20 rounded-[20px] font-black text-base sm:text-lg transition-all border-2 flex items-center justify-center ${isSelected
                                                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                                                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-primary/40 active:scale-95'
                                                    }`}>
                                                {m.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-3 mt-1">
                                    <button
                                        onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining)}
                                        className="spatial-input flex-1 h-16 sm:h-20 rounded-[22px] px-5 text-xl sm:text-[24px] font-black text-center cursor-pointer hover:border-primary/40 border-2 transition-all active:scale-95 shadow-sm">
                                        {selAmount || remaining.toFixed(2)}
                                    </button>
                                    <button
                                        onClick={addPayment}
                                        disabled={!selMethod || !selAmount || +selAmount <= 0 || +selAmount > remaining + 0.001}
                                        className="spatial-button flex items-center justify-center gap-2 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] text-lg sm:text-xl font-black disabled:opacity-40 shrink-0 active:scale-95 shadow-md">
                                        <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> إضافة تسوية
                                    </button>
                                </div>
                            </div>

                            {/* Right Col — Payments Cards List */}
                            <div className="flex flex-col gap-3 w-full lg:w-1/2">
                                <label className="text-sm sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center justify-between">
                                    <span>الدفعات المسجلة</span>
                                    {payments.length > 0 && (
                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                            {payments.length} دفعة
                                        </span>
                                    )}
                                </label>
                                {payments.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center min-h-[160px] text-slate-400 dark:text-white/30 font-black text-lg border-2 border-dashed border-black/10 dark:border-white/10 rounded-[24px]">
                                        لم يتم إضافة أي دفعات بعد
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between px-6 py-5 rounded-[24px] bg-emerald-500/10 border-2 border-emerald-500/30 shadow-md transition-all hover:border-emerald-500/50 min-h-[84px]">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-[16px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                        <CreditCard className="w-7 h-7" />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm sm:text-base">{p.method_name}</span>
                                                        <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl tracking-tight">{p.amount} <span className="text-sm">د.ل</span></span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setPayments(prev => prev.filter((_, i) => i !== idx)); setPaymentManuallySet(false); }}
                                                    title="حذف الدفعة"
                                                    className="w-14 h-14 rounded-[18px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-lg shadow-red-500/25 cursor-pointer">
                                                    <Trash2 className="w-6 h-6 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Submit Button */}
                    <div className="pt-5 sm:pt-6 pb-16 sm:pb-24 px-6 sm:px-8 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-4">
                        <button onClick={() => setShowPaymentDrawer(false)} className="h-16 sm:h-20 px-6 sm:px-8 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-black text-base sm:text-lg transition-all border border-black/10 dark:border-white/20 active:scale-95">
                            رجوع للتعديل
                        </button>
                        <button onClick={() => { setShowPaymentDrawer(false); submit(); }}
                            disabled={processing || cart.length === 0 || (supplierId === '1' && remaining > 0.01)}
                            className="spatial-button flex-1 flex items-center justify-center gap-3 h-16 sm:h-20 rounded-[22px] text-xl sm:text-2xl font-black disabled:opacity-40 active:scale-95 shadow-xl">
                            <Check className="w-7 h-7 sm:w-8 sm:h-8" />
                            <span>تأكيد وحفظ فاتورة الشراء ({total.toFixed(2)} د.ل)</span>
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        </>
    );
}
