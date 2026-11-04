import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, Truck, AlertCircle, Edit,
    Wallet, CheckCircle2, RefreshCw, Search, ChevronDown,
    Calculator, DollarSign
} from 'lucide-react';

interface Supplier      { id: number; name: string; phone?: string; total_debt?: string; }
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

function toAsciiDigits(str: string | number | null | undefined): string {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .trim();
}

function fmt(n: number | string) {
    const val = typeof n === 'number' ? n : parseFloat(n);
    return isNaN(val) ? '0.00' : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchasesCreate({ suppliers = [], products = [], paymentMethods = [], flash }: Props) {
    const [supplierId,          setSupplierId]          = useState('1');
    const [notes,               setNotes]               = useState('');
    const [cart,                setCart]                = useState<CartItem[]>([]);
    const [payments,            setPayments]            = useState<PaymentEntry[]>([]);
    const [processing,          setProcessing]          = useState(false);
    const [showCreditConfirm,   setShowCreditConfirm]   = useState(false);
    const [showPaymentDrawer,   setShowPaymentDrawer]   = useState(false);
    const [paymentManuallySet,  setPaymentManuallySet]  = useState(false);
    const [toastMessage,        setToastMessage]        = useState<string | null>(null);

    // Form inputs for product selection
    const [selProduct,    setSelProduct]    = useState('');
    const [selQty,        setSelQty]        = useState('1');
    const [selTotalPrice, setSelTotalPrice] = useState('');

    // Dropdown states (Exact match with Invoices/Create)
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [productSearch, setProductSearch]                 = useState('');
    const productDropdownRef                                = useRef<HTMLDivElement>(null);
    const productSearchInputRef                             = useRef<HTMLInputElement>(null);

    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const [supplierSearch, setSupplierSearch]                 = useState('');
    const supplierDropdownRef                                 = useRef<HTMLDivElement>(null);
    const supplierSearchInputRef                              = useRef<HTMLInputElement>(null);

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

    // Payment Form States inside Drawer
    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');

    // Click outside handler for Product Dropdown
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
                setIsProductDropdownOpen(false);
            }
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
                setIsSupplierDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isProductDropdownOpen) {
            setTimeout(() => productSearchInputRef.current?.focus(), 50);
        } else {
            setProductSearch('');
        }
    }, [isProductDropdownOpen]);

    useEffect(() => {
        if (isSupplierDropdownOpen) {
            setTimeout(() => supplierSearchInputRef.current?.focus(), 50);
        } else {
            setSupplierSearch('');
        }
    }, [isSupplierDropdownOpen]);

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

    const selectedProduct = products.find(p => p.id === +selProduct);
    const total           = cart.reduce((s, i) => s + i.line_total, 0);
    const totalPaid       = payments.reduce((s, p) => s + (+p.amount || 0), 0);
    const remaining       = total - totalPaid;
    const unitCostPreview = selQty && selTotalPrice && +selQty > 0 ? (+selTotalPrice / +selQty) : null;
    const canAdd          = selectedProduct && selQty && +selQty > 0 && selTotalPrice && +selTotalPrice >= 0;
    const isCashSupplier  = supplierId === '1';
    const selectedSupplier = isCashSupplier
        ? { id: 1, name: 'مورد نقدي', total_debt: '0' }
        : suppliers.find(s => String(s.id) === supplierId);

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

    // Barcode Scanner Listener
    useEffect(() => {
        let buffer = '';
        let lastTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const now = Date.now();
            if (now - lastTime > 150) buffer = '';
            lastTime = now;

            if (e.key === 'Enter') {
                const cleanBuffer = toAsciiDigits(buffer).toLowerCase();
                if (cleanBuffer.length > 3) {
                    const scanned = products.find(p => {
                        if (!p.qrcode) return false;
                        const cleanQr = toAsciiDigits(p.qrcode).toLowerCase();
                        return cleanQr === cleanBuffer ||
                               cleanBuffer.includes(cleanQr) ||
                               cleanQr.includes(cleanBuffer);
                    });
                    if (scanned) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelProduct(String(scanned.id));
                        setSelQty('1');
                        setSelTotalPrice('');
                        setIsProductDropdownOpen(false);
                        setActiveTab('products');
                        setToastMessage(`تم اختيار: ${scanned.name}`);
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
        setPadTitle(title);
        setPadInitial(initial);
        setPadCallback(() => cb);
        setPadMax(max);
        setShowPad(true);
    }

    function resetProductForm() {
        setSelProduct('');
        setSelQty('1');
        setSelTotalPrice('');
    }

    function addToCart() {
        if (!selectedProduct || !selQty || !selTotalPrice) return;
        const qty       = +selQty;
        const lineTotal = +selTotalPrice;
        const unitCost  = qty > 0 ? lineTotal / qty : 0;

        // Group / Merge identical item if same product_id and same unit_cost
        const existIdx = cart.findIndex(i => i.product_id === selectedProduct.id && +i.unit_cost === +unitCost.toFixed(4));
        let newCart: CartItem[];
        if (existIdx !== -1) {
            newCart = cart.map((item, i) => i === existIdx ? {
                ...item,
                quantity:   String(+item.quantity + qty),
                line_total: item.line_total + lineTotal,
            } : item);
        } else {
            newCart = [...cart, {
                product_id:    selectedProduct.id,
                product_name:  selectedProduct.name,
                category_name: selectedProduct.category.name,
                unit:          selectedProduct.category.unit,
                quantity:      String(qty),
                unit_cost:     unitCost.toFixed(4),
                line_total:    lineTotal,
            }];
        }
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

        resetProductForm();
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

    function handleSelectPaymentMethod(methodId: string) {
        if (selMethod === methodId) {
            setSelMethod('');
            setSelAmount('');
        } else {
            setSelMethod(methodId);
            setSelAmount(remaining > 0 ? remaining.toFixed(2) : '');
        }
    }

    function addPayment() {
        const amountToAdd = selAmount || (remaining > 0 ? remaining.toFixed(2) : '');
        if (!selMethod || !amountToAdd || +amountToAdd <= 0) return;
        if (+amountToAdd > remaining + 0.001) return;
        const method = paymentMethods.find(m => m.id === +selMethod);
        if (!method) return;

        setPayments(prev => {
            const existing = prev.findIndex(p => p.payment_method_id === selMethod);
            if (existing !== -1) {
                return prev.map((p, i) => i === existing
                    ? { ...p, amount: (+p.amount + +amountToAdd).toFixed(2) }
                    : p
                );
            }
            return [...prev, { payment_method_id: selMethod, method_name: method.name, amount: amountToAdd }];
        });

        setPaymentManuallySet(true);
        setSelMethod('');
        setSelAmount('');
    }

    function submit() {
        if (!supplierId || cart.length === 0) return;
        if (isCashSupplier && remaining > 0.01) return;
        if (!isCashSupplier && remaining > 0.01) {
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
                setCart([]);
                setPayments([]);
                setNotes('');
                setPaymentManuallySet(false);
            },
            onFinish: () => setProcessing(false),
        });
    }

    function clearForm() {
        setCart([]);
        setPayments([]);
        setPaymentManuallySet(false);
        resetProductForm();
    }

    // Filtered lists for dropdown search
    const filteredProducts = products.filter(p => {
        if (!productSearch.trim()) return true;
        const q = productSearch.toLowerCase().trim();
        return p.name.toLowerCase().includes(q) ||
               (p.qrcode && toAsciiDigits(p.qrcode).toLowerCase().includes(q)) ||
               (p.category?.name && p.category.name.toLowerCase().includes(q));
    });

    const otherSuppliers = suppliers.filter(s => s.id !== 1);
    const filteredSuppliers = otherSuppliers.filter(s => {
        if (!supplierSearch.trim()) return true;
        const q = supplierSearch.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q));
    });

    return (
        <AppShell pageTitle="فاتورة شراء جديدة">
            {/* إشعار عائم في الزاوية */}
            {toastMessage && (
                <div className="fixed top-5 left-5 z-[9999] animate-in fade-in slide-in-from-left-4 duration-200">
                    <div className="bg-white dark:bg-[#0c1421] text-slate-800 dark:text-white px-3.5 py-2.5 rounded-[2px] shadow-xl border border-brand/30 flex items-center gap-3 max-w-md">
                        <div className="w-7 h-7 rounded-[2px] bg-brand/15 text-brand flex items-center justify-center shrink-0 border border-brand/30">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs leading-snug">{toastMessage}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setToastMessage(null)}
                            className="w-6 h-6 rounded-[2px] hover:bg-slate-100 dark:hover:bg-[#152238] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ══ العرض المكتبي (Desktop Workstation Layout) ══ */}
            <div className="hidden lg:flex flex-row gap-0 flex-1 min-h-0 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] overflow-hidden bg-white dark:bg-[#0c1421] mt-0.5">

                {/* ── اللوحة اليسرى: إدخال المواد والأصناف والإجراءات ── */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200/90 dark:border-[#1d2d42]">

                    {/* الشريط العلوي للوحة اليسرى */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link href="/purchases" className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-xs">
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>فواتير الشراء</span>
                            </Link>
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                فاتورة شراء جديدة
                            </span>
                        </div>
                        {flash?.error && <span className="text-xs font-bold text-rose-500 max-w-[200px] truncate">{flash.error}</span>}
                    </div>

                    {/* حقول إدخال الصنف والكمية والتكلفة */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 bg-slate-50/30 dark:bg-[#080e18]/40 space-y-3">
                        {/* بطاقة اختيار الصنف المطابقة تماماً لـ ProductSelector */}
                        <div className="flex flex-col gap-2.5">
                            {/* سطر اختيار الصنف وزر التفريغ */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center">
                                {/* القائمة المنسدلة الذكية للصنف */}
                                <div className="flex-1 min-w-0 relative" ref={productDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                                        className={`h-11 sm:h-12 w-full px-3.5 rounded-[2px] border text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                                            isProductDropdownOpen
                                                ? 'border-brand bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs'
                                                : selectedProduct
                                                    ? 'border-slate-300 dark:border-[#22354e] bg-white dark:bg-[#0c1421] text-slate-900 dark:text-white'
                                                    : 'border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-slate-400 hover:border-slate-300 dark:hover:border-[#283e58]'
                                        }`}
                                    >
                                        <span className="truncate">
                                            {selectedProduct ? selectedProduct.name : 'ابحث أو اختر المنتج أو امسح الباركود...'}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0 mr-1.5">
                                            {selectedProduct && (
                                                <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 dark:bg-sky-950/40 px-2 py-0.5 rounded-[2px]">
                                                    مخزون: {selectedProduct.stock} {selectedProduct.category?.unit}
                                                </span>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180 text-brand' : ''}`} />
                                        </div>
                                    </button>

                                    {/* القائمة المنبثقة للبحث */}
                                    {isProductDropdownOpen && (
                                        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[280px]">
                                            <div className="p-2 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/80 dark:bg-[#09111c] flex items-center gap-2">
                                                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                                <input
                                                    ref={productSearchInputRef}
                                                    type="text"
                                                    value={productSearch}
                                                    onChange={e => setProductSearch(e.target.value)}
                                                    placeholder="اكتب اسم المنتج أو الصنف أو امسح الباركود..."
                                                    className="w-full bg-transparent border-none text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && filteredProducts.length > 0) {
                                                            const p = filteredProducts[0];
                                                            setSelProduct(String(p.id));
                                                            setSelQty('1');
                                                            setSelTotalPrice('');
                                                            setIsProductDropdownOpen(false);
                                                        }
                                                    }}
                                                />
                                                {productSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductSearch('')}
                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <ul className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scroll">
                                                {filteredProducts.length === 0 ? (
                                                    <li className="px-4 py-4 text-center text-xs font-semibold text-slate-400">
                                                        لا توجد منتجات مطابقة للبحث
                                                    </li>
                                                ) : (
                                                    filteredProducts.map(p => {
                                                        const isSelected = p.id === +selProduct;
                                                        return (
                                                            <li
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setSelProduct(String(p.id));
                                                                    setSelQty('1');
                                                                    setSelTotalPrice('');
                                                                    setIsProductDropdownOpen(false);
                                                                }}
                                                                className={`px-3 py-2.5 rounded-[2px] text-xs font-bold cursor-pointer flex items-center justify-between transition-all border ${
                                                                    isSelected
                                                                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800/60 dark:bg-sky-950/40 shadow-2xs'
                                                                        : 'bg-slate-50/50 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100 dark:hover:bg-[#131f32] hover:border-slate-300 dark:hover:border-[#253952]'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    <span className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-white">
                                                                        {p.name}
                                                                    </span>
                                                                    {p.category?.name && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                                                            {p.category.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 shrink-0 mr-2">
                                                                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                                                        المخزون: {p.stock} {p.category?.unit}
                                                                    </span>
                                                                    {isSelected && <Check className="w-4 h-4 text-brand" />}
                                                                </div>
                                                            </li>
                                                        );
                                                    })
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* زر التفريغ السريع */}
                                {selectedProduct && (
                                    <button
                                        type="button"
                                        onClick={resetProductForm}
                                        title="تفريغ الصنف المختار والبدء من جديد"
                                        className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>تفريغ</span>
                                    </button>
                                )}
                            </div>

                            {/* سطر الإدخال المالي: الكمية أولاً ثم التكلفة الإجمالية وزر الإضافة */}
                            {selectedProduct && (
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end p-3.5 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                                    {/* حقل الكمية / العدد أولاً */}
                                    <div className="flex flex-col gap-1 w-full sm:w-32 shrink-0">
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                            الكمية ({selectedProduct.category?.unit || 'وحدة'})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => openPad(`الكمية (${selectedProduct.category?.unit})`, selQty || '1', v => setSelQty(v))}
                                            className="h-11 sm:h-12 w-full px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand text-sm sm:text-base font-number font-black text-slate-900 dark:text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                            title="الكمية"
                                        >
                                            {selQty || '1'}
                                        </button>
                                    </div>

                                    {/* حقل التكلفة الإجمالية المدفوعة للمادة (عرض الرقم فقط بدون نصوص) */}
                                    <div className="flex-1 flex flex-col gap-1">
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                            التكلفة الإجمالية للمادة
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => openPad('التكلفة الإجمالية للمادة', selTotalPrice, v => setSelTotalPrice(v))}
                                            className="h-11 sm:h-12 rounded-[2px] px-4 font-number font-bold text-sm sm:text-base flex items-center justify-center cursor-pointer transition-colors border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] text-slate-900 dark:text-white hover:border-brand shadow-2xs"
                                        >
                                            <span className="font-number font-black text-slate-900 dark:text-white">
                                                {selTotalPrice ? fmt(selTotalPrice) : '0.00'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* زر الإضافة للسلة */}
                                    <button
                                        type="button"
                                        onClick={addToCart}
                                        disabled={!canAdd}
                                        className="h-11 sm:h-12 px-6 sm:px-8 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>إضافة للفاتورة</span>
                                    </button>
                                </div>
                            )}

                            {/* شريط المعاينة المحسوبة لتكلفة الوحدة (مطابق لشريط معاينة إجمالي العنصر) */}
                            {unitCostPreview !== null && (
                                <div className="flex items-center justify-between px-4 py-2.5 rounded-[2px] bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/25 animate-in fade-in duration-100">
                                    <div className="flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                            تكلفة الوحدة الواحدة المحتسبة ({selectedProduct?.category?.unit}):
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-base sm:text-lg font-number font-black text-sky-600 dark:text-sky-400">
                                            {unitCostPreview.toFixed(3)}
                                        </span>
                                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">د.ل / {selectedProduct?.category?.unit}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* شريط الإجراءات السفلي لمكتب العمل (مطابق تماماً لمبيعات الفواتير) */}
                    <div className="px-4 py-4 border-t border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0 flex items-stretch gap-2.5">
                        <Link
                            href="/purchases"
                            className="h-24 sm:h-28 px-3.5 sm:px-4 rounded-[2px] border border-slate-300 dark:border-[#22354e] bg-slate-100 hover:bg-slate-200 dark:bg-[#121c2c] dark:hover:bg-[#18263b] text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm transition-colors shrink-0 flex items-center justify-center shadow-sm"
                        >
                            <span>إلغاء</span>
                        </Link>
                        <button
                            type="button"
                            onClick={clearForm}
                            disabled={cart.length === 0}
                            className="h-24 sm:h-28 px-3.5 sm:px-4.5 rounded-[2px] border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-500 dark:text-rose-400 font-bold text-xs sm:text-sm transition-colors shrink-0 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center shadow-sm"
                        >
                            <span>مسح الفاتورة</span>
                        </button>

                        {cart.length === 0 ? (
                            <div className="flex-1 h-24 sm:h-28 flex items-center justify-center gap-2 px-4 rounded-[2px] bg-slate-100 dark:bg-[#101a29] border border-slate-300 dark:border-[#22354e] text-slate-500 dark:text-slate-400 select-none shadow-sm">
                                <ShoppingCart className="w-5 h-5 opacity-60" />
                                <span className="text-base sm:text-lg font-bold">السلة فارغة</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowPaymentDrawer(true)}
                                className="flex-1 h-24 sm:h-28 flex items-center justify-center gap-2.5 px-6 rounded-[2px] bg-brand hover:opacity-95 text-white font-black cursor-pointer shadow-lg active:scale-[0.99] transition-all"
                            >
                                <CreditCard className="w-6 h-6 stroke-[2.2]" />
                                <span className="text-xl sm:text-2xl font-black tracking-wide">
                                    إتمام الدفع والتأكيد
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── اللوحة اليمنى: اختيار المورد وسلة الأصناف (مطابقة لـ Invoices/Create Right Panel) ── */}
                <div className="w-full lg:w-[460px] xl:w-[480px] 2xl:w-[500px] flex flex-col overflow-hidden bg-white dark:bg-[#0c1421] shrink-0 border-r border-slate-200/90 dark:border-[#1d2d42]">

                    {/* شريط اختيار المورد (مطابق تماماً لـ WorkstationCustomerSelect) */}
                    <div className="p-3 border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">المورد</span>
                            <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                isCashSupplier
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}>
                                {isCashSupplier ? 'مورد نقدي' : 'مورد آجل'}
                            </span>
                        </div>

                        {/* القائمة المنسدلة للموردين */}
                        <div className="relative flex-1 min-w-0" ref={supplierDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                                className={`h-11 sm:h-12 w-full px-3 rounded-[2px] border text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                                    isSupplierDropdownOpen
                                        ? 'border-brand bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs'
                                        : !isCashSupplier
                                            ? 'border-slate-300 dark:border-[#22354e] bg-white dark:bg-[#0c1421] text-slate-900 dark:text-white'
                                            : 'border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Truck className="w-4 h-4 text-brand shrink-0" />
                                    <span className="truncate">{selectedSupplier ? selectedSupplier.name : 'مورد نقدي'}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 mr-1.5">
                                    {!isCashSupplier && selectedSupplier?.total_debt && +selectedSupplier.total_debt > 0 && (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-[2px] font-number font-bold">
                                            دين: {fmt(+selectedSupplier.total_debt)}
                                        </span>
                                    )}
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSupplierDropdownOpen ? 'rotate-180 text-brand' : ''}`} />
                                </div>
                            </button>

                            {isSupplierDropdownOpen && (
                                <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[260px]">
                                    <div className="p-2 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/80 dark:bg-[#09111c] flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <input
                                            ref={supplierSearchInputRef}
                                            type="text"
                                            value={supplierSearch}
                                            onChange={e => setSupplierSearch(e.target.value)}
                                            placeholder="بحث عن مورد..."
                                            className="w-full bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                                        />
                                    </div>
                                    <ul className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-1 custom-scroll">
                                        {(!supplierSearch || 'مورد نقدي'.includes(supplierSearch.trim())) && (
                                            <li
                                                onClick={() => { setSupplierId('1'); setIsSupplierDropdownOpen(false); }}
                                                className={`px-3 py-2 rounded-[2px] text-xs font-bold cursor-pointer flex items-center justify-between border ${
                                                    isCashSupplier
                                                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                                        : 'bg-slate-50/50 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>مورد نقدي (افتراضي)</span>
                                                {isCashSupplier && <Check className="w-3.5 h-3.5 text-brand" />}
                                            </li>
                                        )}
                                        {filteredSuppliers.map(s => {
                                            const isSelected = supplierId === String(s.id);
                                            return (
                                                <li
                                                    key={s.id}
                                                    onClick={() => { setSupplierId(String(s.id)); setIsSupplierDropdownOpen(false); }}
                                                    className={`px-3 py-2 rounded-[2px] text-xs font-bold cursor-pointer flex items-center justify-between border ${
                                                        isSelected
                                                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                                            : 'bg-slate-50/50 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span className="truncate">{s.name}</span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {s.total_debt && +s.total_debt > 0 && (
                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-number font-bold">
                                                                دين: {fmt(+s.total_debt)}
                                                            </span>
                                                        )}
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ترويسة سلة المشتريات */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/75 dark:bg-[#0e1726] shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-brand" />
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                                عناصر الفاتورة
                            </span>
                            {cart.length > 0 && (
                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/25 px-1.5 py-0.2 rounded-[2px]">
                                    {cart.length}
                                </span>
                            )}
                        </div>
                        <div className="text-xs font-number font-bold text-slate-600 dark:text-slate-400">
                            الإجمالي: <span className="text-sky-600 dark:text-sky-400 font-black">{total.toFixed(2)} د.ل</span>
                        </div>
                    </div>

                    {/* قائمة عناصر السلة المكتبي (جدول منسق بنمط Cart.tsx) */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500 py-12 rounded-[2px] border border-dashed border-slate-200 dark:border-[#1d2d42] bg-slate-50/30 dark:bg-[#0c1421]/30">
                                <Package className="w-8 h-8 stroke-[1.5]" />
                                <span className="font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-400">سلة المشتريات فارغة</span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">اختر مادة من اللوحة اليسرى لإضافتها للفاتورة</span>
                            </div>
                        ) : (
                            <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] overflow-hidden bg-white dark:bg-[#0c1421]">
                                {/* ترويسة جدول السلة المطابق لـ Cart.tsx */}
                                <div className="grid grid-cols-[54px_1fr_116px_80px_52px] gap-2 px-3 py-2.5 bg-slate-100/75 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-400 font-bold text-[11px] items-center">
                                    <span className="text-center">الكمية</span>
                                    <span>المادة</span>
                                    <span className="text-center">الوحدة والتكلفة</span>
                                    <span className="text-center">الإجمالي</span>
                                    <span className="text-center">إجراء</span>
                                </div>

                                {/* صفوف جدول السلة */}
                                <div className="divide-y divide-slate-200/90 dark:divide-[#1d2d42]">
                                    {cart.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-[54px_1fr_116px_80px_52px] gap-2 px-3 py-2.5 items-center hover:bg-slate-50/80 dark:hover:bg-[#0e1828] transition-colors"
                                        >
                                            {/* زر تعديل الكمية بالنمبر باد */}
                                            <div className="flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => openPad(`تعديل الكمية (${item.unit})`, item.quantity, newVal => {
                                                        const newQ = parseFloat(newVal) || 1;
                                                        setCart(prev => prev.map((it, i) => i === idx ? {
                                                            ...it,
                                                            quantity:   String(newQ),
                                                            line_total: +(+it.unit_cost * newQ).toFixed(2),
                                                        } : it));
                                                    })}
                                                    className="h-10 sm:h-11 w-11 sm:w-12 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand font-number font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs active:scale-95"
                                                    title="تعديل الكمية"
                                                >
                                                    {item.quantity}
                                                </button>
                                            </div>

                                            {/* تفاصيل المادة */}
                                            <div className="min-w-0 flex flex-col justify-center py-0.5">
                                                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight truncate">
                                                    {item.product_name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                    {item.category_name}
                                                </span>
                                            </div>

                                            {/* الوحدة وسعر التكلفة */}
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 px-1.5 py-0.5 rounded-[2px] truncate max-w-full">
                                                    {item.unit}
                                                </span>
                                                <span className="text-slate-300 dark:text-slate-600 font-bold text-xs">|</span>
                                                <span className="font-number font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                                    {fmt(item.unit_cost)}
                                                </span>
                                            </div>

                                            {/* إجمالي السطر */}
                                            <div className="flex items-center justify-center">
                                                <span className="font-number font-black text-sky-600 dark:text-sky-400 text-xs sm:text-sm">
                                                    {fmt(item.line_total)}
                                                </span>
                                            </div>

                                            {/* زر الحذف المطابق لـ Cart.tsx */}
                                            <div className="flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(idx)}
                                                    title="حذف الصنف من السلة"
                                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-[2px] border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* حقل الملاحظات السفلية */}
                    <div className="px-4 py-3 border-t border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="ملاحظات على فاتورة الشراء... (اختياري)"
                            className="w-full text-xs font-medium p-2.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#080e18] text-slate-800 dark:text-white placeholder:text-slate-400 resize-none focus:outline-hidden focus:border-brand"
                        />
                    </div>
                </div>
            </div>

            {/* ══ العرض على الجوال واللوحي (Mobile & Tablet Layout) ══ */}
            <div className="lg:hidden flex flex-col flex-1 min-h-0 bg-white dark:bg-[#0c1421] rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] overflow-hidden">
                {/* شريط المورد بالجوال */}
                <div className="p-2.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#0c1421]">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-600">المورد:</span>
                        <select
                            value={supplierId}
                            onChange={e => setSupplierId(e.target.value)}
                            className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-xs font-bold"
                        >
                            <option value="1">مورد نقدي</option>
                            {otherSuppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* أزرار التبويبات بالجوال */}
                <div className="flex border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('products')}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-11 font-bold text-xs transition-colors relative ${
                            activeTab === 'products' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        <Package className="w-4 h-4" />
                        <span>المواد</span>
                        {cart.length > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-[2px] bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {cart.length}
                            </span>
                        )}
                        {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('payment')}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-11 font-bold text-xs transition-colors relative ${
                            activeTab === 'payment' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        <CreditCard className="w-4 h-4" />
                        <span>الدفع</span>
                        {activeTab === 'payment' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('confirm')}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-11 font-bold text-xs transition-colors relative ${
                            activeTab === 'confirm' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        <Check className="w-4 h-4" />
                        <span>تأكيد</span>
                        {activeTab === 'confirm' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                    </button>
                </div>

                {/* محتوى تبويبات الجوال */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'products' && (
                        <div className="p-3 flex flex-col gap-3">
                            {/* قائمة منسدلة لاختيار الصنف بالجوال */}
                            <select
                                value={selProduct}
                                onChange={e => {
                                    setSelProduct(e.target.value);
                                    setSelQty('1');
                                    setSelTotalPrice('');
                                }}
                                className="h-11 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-xs font-bold"
                            >
                                <option value="">اختر الصنف أو المادة...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.category?.name})</option>
                                ))}
                            </select>

                            {selectedProduct && (
                                <div className="p-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#0a121e] flex flex-col gap-2.5">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-500">الكمية ({selectedProduct.category?.unit})</span>
                                            <button
                                                type="button"
                                                onClick={() => openPad(`الكمية (${selectedProduct.category?.unit})`, selQty, setSelQty)}
                                                className="h-10 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] font-number font-bold text-xs flex items-center justify-center"
                                            >
                                                {selQty || '1'}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-500">التكلفة الإجمالية</span>
                                            <button
                                                type="button"
                                                onClick={() => openPad('التكلفة الإجمالية', selTotalPrice, setSelTotalPrice)}
                                                className="h-10 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] font-number font-bold text-xs flex items-center justify-center"
                                            >
                                                {selTotalPrice ? fmt(selTotalPrice) : '0.00'}
                                            </button>
                                        </div>
                                    </div>

                                    {unitCostPreview !== null && (
                                        <div className="text-xs font-bold text-sky-600 text-center">
                                            تكلفة الوحدة: {unitCostPreview.toFixed(3)} د.ل
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={addToCart}
                                        disabled={!canAdd}
                                        className="h-10 rounded-[2px] bg-brand text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                                    >
                                        <Plus className="w-4 h-4" /> إضافة للسلة
                                    </button>
                                </div>
                            )}

                            {/* قائمة السلة بالجوال */}
                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-[#1d2d42]">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="p-2.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0e1726] flex items-center justify-between text-xs">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 dark:text-white">{item.product_name}</span>
                                            <span className="text-[10px] text-slate-400">{item.quantity} {item.unit} × {item.unit_cost} د.ل</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-number font-bold text-slate-900 dark:text-white">{item.line_total.toFixed(2)} د.ل</span>
                                            <button onClick={() => removeFromCart(idx)} className="text-rose-500 p-1">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="p-3 flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-[2px] bg-slate-50 dark:bg-[#0a121e] border border-slate-200 dark:border-[#1d2d42] text-xs">
                                <div>
                                    <div className="text-slate-400 text-[10px]">الإجمالي</div>
                                    <div className="font-number font-bold text-slate-900 dark:text-white">{total.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">المدفوع</div>
                                    <div className="font-number font-bold text-emerald-600">{totalPaid.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">المتبقي</div>
                                    <div className={`font-number font-bold ${remaining > 0.01 ? 'text-rose-600' : 'text-slate-400'}`}>{remaining.toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {paymentMethods.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleSelectPaymentMethod(String(m.id))}
                                        className={`h-10 rounded-[2px] border text-xs font-bold transition-colors ${
                                            selMethod === String(m.id)
                                                ? 'bg-brand text-white border-brand'
                                                : 'bg-white dark:bg-[#101a29] border-slate-200 dark:border-[#1d2d42] text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {m.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => openPad('المبلغ المدفوع', selAmount || remaining.toFixed(2), setSelAmount, remaining)}
                                    className="h-10 flex-1 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] font-number font-bold text-xs flex items-center justify-center"
                                >
                                    {selAmount || remaining.toFixed(2)} د.ل
                                </button>
                                <button
                                    type="button"
                                    onClick={addPayment}
                                    disabled={!selMethod || !selAmount}
                                    className="h-10 px-4 rounded-[2px] bg-brand text-white font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40"
                                >
                                    <Plus className="w-3.5 h-3.5" /> إضافة دفعة
                                </button>
                            </div>

                            <div className="flex flex-col gap-1.5 pt-2">
                                {payments.map((p, idx) => (
                                    <div key={idx} className="p-2 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                                        <span className="font-bold text-emerald-700 dark:text-emerald-300">{p.method_name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-number font-black">{p.amount} د.ل</span>
                                            <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'confirm' && (
                        <div className="p-3 flex flex-col gap-3">
                            <div className="p-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-xs flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">المورد:</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{selectedSupplier ? selectedSupplier.name : '—'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">عدد المواد:</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{cart.length} أصناف</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#1d2d42] pt-2">
                                    <span className="font-bold">الإجمالي الكلي:</span>
                                    <span className="font-number font-black text-sm text-brand">{total.toFixed(2)} د.ل</span>
                                </div>
                            </div>

                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                placeholder="ملاحظات على الفاتورة... (اختياري)"
                                className="w-full text-xs p-2 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0a121e]"
                            />

                            <button
                                type="button"
                                onClick={submit}
                                disabled={processing || cart.length === 0 || (isCashSupplier && remaining > 0.01)}
                                className="w-full h-12 rounded-[2px] bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                <Check className="w-4 h-4" />
                                <span>تأكيد وحفظ فاتورة الشراء ({total.toFixed(2)} د.ل)</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ نافذة الدفع السفلية المنبثقة (Payment Drawer / Sheet) المطابقة تماماً لـ PaymentDrawer.tsx ══ */}
            {showPaymentDrawer && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9990] flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setShowPaymentDrawer(false)}
                >
                    <div onClick={() => setShowPaymentDrawer(false)} className="absolute inset-0 cursor-pointer" />

                    <div
                        className="relative z-10 w-full max-w-5xl mx-auto bg-white dark:bg-[#0c1421] border-t border-x border-slate-200/90 dark:border-[#1d2d42] rounded-t-[2px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-[2px] bg-brand/10 border border-brand/25 text-brand flex items-center justify-center shrink-0">
                                    <Wallet className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">إتمام عملية السداد والحساب</h3>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                        المورد: <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedSupplier?.name ?? 'مورد نقدي'}</span> ({isCashSupplier ? 'مورد نقدي' : 'آجل'})
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowPaymentDrawer(false)}
                                className="w-9 h-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273b] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Totals Summary Strip المطابق لـ PaymentDrawer */}
                        <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-100/70 dark:bg-[#09111c] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xs flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجمالي الفاتورة</span>
                                <span className="text-sm sm:text-base font-number font-black text-slate-900 dark:text-white tabular-nums">{fmt(total)} د.ل</span>
                            </div>

                            <div className="p-3 rounded-[2px] bg-sky-500/10 dark:bg-sky-950/30 border border-sky-300/40 dark:border-sky-800/60 shadow-2xs flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">المطلوب سداده</span>
                                <span className="text-sm sm:text-base font-number font-black text-sky-700 dark:text-sky-300 tabular-nums">{fmt(total)} د.ل</span>
                            </div>

                            <div className="p-3 rounded-[2px] bg-brand/10 border border-brand/25 shadow-2xs flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-brand uppercase tracking-wider">المدفوع الفعلي</span>
                                <span className="text-sm sm:text-base font-number font-black text-brand tabular-nums">{fmt(totalPaid)} د.ل</span>
                            </div>

                            <div className={`p-3 rounded-[2px] border shadow-2xs flex flex-col gap-0.5 ${
                                remaining > 0.01
                                    ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-white dark:bg-[#0c1421] border-slate-200/90 dark:border-[#1d2d42] text-slate-500 dark:text-slate-400'
                            }`}>
                                <span className="text-[10px] font-bold uppercase tracking-wider">المتبقي</span>
                                <span className={`text-sm sm:text-base font-number font-black tabular-nums ${remaining > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                    {remaining > 0.01 ? `${fmt(remaining)} د.ل` : '0.00 د.ل (خالص)'}
                                </span>
                            </div>
                        </div>

                        {/* Body Grid */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col lg:flex-row gap-5 sm:gap-6 custom-scroll">
                            {/* Left Col — Select Payment Method */}
                            <div className="flex flex-col gap-3.5 w-full lg:w-1/2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    اختر وسيلة الدفع والمبلغ
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {paymentMethods.map(m => {
                                        const isSelected = selMethod === String(m.id);
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => handleSelectPaymentMethod(String(m.id))}
                                                className={`h-13 sm:h-14 rounded-[2px] font-bold text-xs sm:text-sm transition-all border flex items-center justify-center cursor-pointer shadow-2xs ${
                                                    isSelected
                                                        ? 'bg-brand text-white border-brand shadow-sm font-black'
                                                        : 'bg-white dark:bg-[#101a29] border-slate-200/90 dark:border-[#1d2d42] text-slate-800 dark:text-slate-200 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-[#142032]'
                                                }`}
                                            >
                                                <span>{m.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-2.5 items-center">
                                    <button
                                        type="button"
                                        onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining)}
                                        className="flex-1 h-13 sm:h-14 rounded-[2px] px-4 font-number font-black text-base sm:text-lg flex items-center justify-between cursor-pointer border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-slate-900 dark:text-white hover:border-brand transition-colors shadow-2xs"
                                    >
                                        <span className="text-slate-900 dark:text-white">{selAmount || (remaining > 0 ? remaining.toFixed(2) : '0.00')} د.ل</span>
                                        <span className="text-[10px] font-sans font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 px-2 py-0.5 rounded-[2px]">لوحة الأرقام</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addPayment}
                                        disabled={!selMethod || !selAmount}
                                        className="h-13 sm:h-14 px-5 sm:px-6 rounded-[2px] bg-brand hover:bg-brand/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs cursor-pointer transition-all shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>إضافة دفعة</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right Col — Payments Cards List */}
                            <div className="flex flex-col gap-2.5 w-full lg:w-1/2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    الدفعات المسجلة في الفاتورة
                                </label>

                                {payments.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center min-h-[140px] text-slate-400 dark:text-slate-500 text-xs font-bold border border-dashed border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#09111c] rounded-[2px] p-6 text-center">
                                        لم يتم تسجيل أي دفعات بعد — حدد وسيلة الدفع والمبلغ ثم اضغط «إضافة دفعة»
                                    </div>
                                ) : (
                                    payments.map((p, idx) => (
                                        <div key={idx} className="p-3.5 rounded-[2px] bg-slate-50/80 dark:bg-[#0a121e] border border-slate-200/90 dark:border-[#1d2d42] flex items-center justify-between gap-3 shadow-2xs">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openPad(`تعديل مبلغ (${p.method_name})`, p.amount, v => {
                                                        setPayments(prev => prev.map((pay, i) => i === idx ? { ...pay, amount: v } : pay));
                                                        setPaymentManuallySet(true);
                                                    })}
                                                    className="w-9 h-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                                                    title="تعديل القيمة"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="font-bold text-sky-600 dark:text-sky-400 text-xs px-2 py-0.5 rounded-[2px] bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 shrink-0">
                                                        {p.method_name}
                                                    </span>
                                                    <span className="font-number font-black text-slate-900 dark:text-white text-base sm:text-lg truncate">
                                                        {p.amount} د.ل
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPayments(prev => prev.filter((_, i) => i !== idx));
                                                    setPaymentManuallySet(true);
                                                }}
                                                className="w-11 h-11 rounded-[2px] border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                                                title="حذف الدفعة"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Footer / Submit */}
                        <div className="px-5 pt-3.5 pb-5 sm:pb-6 border-t border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex flex-col gap-2.5 shrink-0">
                            {isCashSupplier && remaining > 0.01 && (
                                <div className="px-3.5 py-2 rounded-[2px] bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 font-bold text-xs text-center">
                                    ⚠️ مورد نقدي — يجب سداد المبلغ المتبقي بالكامل ({fmt(remaining)} د.ل) قبل تأكيد الفاتورة
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={submit}
                                disabled={processing || cart.length === 0 || (isCashSupplier && remaining > 0.01)}
                                className="h-20 sm:h-22 mb-2 sm:mb-3 rounded-[2px] bg-brand hover:opacity-95 text-white font-black text-lg sm:text-xl w-full flex items-center justify-between px-8 shadow-md transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    {processing ? (
                                        <RefreshCw className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <Check className="w-6 h-6" />
                                    )}
                                    <span>{processing ? 'جاري الحفظ...' : 'إتمام الشراء وحفظ الفاتورة'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm sm:text-base font-bold bg-white/20 px-3.5 py-1.5 rounded-[2px]">
                                        المدفوع: {fmt(totalPaid)} د.ل
                                    </span>
                                    <Check className="w-6 h-6" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* لوحة الأرقام المنبثقة */}
            <NumberPadModal
                isOpen={showPad}
                title={padTitle}
                initialValue={padInitial}
                maxValue={padMax}
                onClose={() => setShowPad(false)}
                onConfirm={v => { padCallback?.(v); setShowPad(false); }}
            />

            {/* نافذة تأكيد المعاملة بالآجل */}
            <ConfirmModal
                isOpen={showCreditConfirm}
                title="إتمام فاتورة الشراء بالآجل"
                description={`يوجد مبلغ متبقي (${fmt(remaining)} د.ل) سيتم قيده كدين للمورد في حسابه، هل ترغب في المتابعة والتأكيد؟`}
                confirmText="تأكيد وحفظ بالآجل"
                onConfirm={executeSubmit}
                onCancel={() => setShowCreditConfirm(false)}
            />
        </AppShell>
    );
}
