import { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, User, AlertCircle,
} from 'lucide-react';

interface Customer      { id: number; name: string; total_debt?: string; }
interface Size          { id: number; label: string; value: string; }
interface Category      { id: number; name: string; unit: string; }
interface ProductPrice  {
    price_per_unit_regular: string; price_per_unit_vip: string;
    full_bottle_regular: string | null; full_bottle_vip: string | null;
}
interface OriginalDetail { bottle_volume: string; }
interface TierPrice     { size_id: number; price_regular: string; price_vip: string; }
interface PriceTier     { id: number; name: string; tier_prices?: TierPrice[]; }
interface Product {
    id: number; name: string; stock: string; selling_type: string;
    category: Category;
    price_tier: PriceTier | null;
    product_price: ProductPrice | null;
    original_perfume_detail: OriginalDetail | null;
}
interface PaymentMethod { id: number; name: string; }

interface Props {
    customers:      Customer[];
    products:       Product[];
    sizes:          Size[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface CartItem {
    product_id:   number;
    product_name: string;
    sale_type:    string;
    size_id:      string;
    size_label:   string;
    quantity:     string;
    unit_price:   number;
    line_total:   number;
}

interface PaymentEntry {
    payment_method_id: string;
    method_name:       string;
    amount:            string;
}

const saleTypeLabels: Record<string, string> = {
    tier_decant:  'زيتي',
    unit_decant:  'أصلي - تقسيم',
    full_bottle:  'عبوة كاملة',
    unit_based:   'بالوحدة',
};

// ── helper functions ──────────────────────────────────────────────────────────

function resolvePrice(product: Product, saleType: string, sizeId: string, isVip: boolean): number {
    const pp = product.product_price;
    switch (saleType) {
        case 'tier_decant': {
            if (sizeId.startsWith('-custom-')) {
                return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
            }
            const tp = product.price_tier?.tier_prices?.find(t => t.size_id === +sizeId);
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
            if (sizeId.startsWith('-custom-')) return +(sizeId.replace('-custom-', '')) || 0;
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

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicesCreate({ customers, products, sizes, paymentMethods, flash }: Props) {
    const [resetKey,      setResetKey]      = useState(0);
    const [customerId,    setCustomerId]    = useState('');
    const [customerType,  setCustomerType]  = useState<'regular'|'vip'>('regular');
    const [notes,         setNotes]         = useState('');
    const [cart,          setCart]          = useState<CartItem[]>([]);
    const [payments,      setPayments]      = useState<PaymentEntry[]>([]);
    const [debtPayment,   setDebtPayment]   = useState<PaymentEntry | null>(null);
    const [processing,    setProcessing]    = useState(false);

    // product selection
    const [selProduct,   setSelProduct]   = useState('');
    const [selSaleType,  setSelSaleType]  = useState('');
    const [selSize,      setSelSize]      = useState('');
    const [selQty,       setSelQty]       = useState('1');
    const [selUnitPrice, setSelUnitPrice] = useState('');
    const [selMinPrice,  setSelMinPrice]  = useState(0);

    // payment input
    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');

    // modals
    const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max);
        setPadCallback(() => cb); setShowPad(true);
    }

    // ── derived ──────────────────────────────────────────────────────────────
    const isVip          = customerType === 'vip';
    const isCashCustomer = !customerId;
    const selectedProduct = products.find(p => p.id === +selProduct);
    const isTier         = selectedProduct?.selling_type === 'tier_based';
    const isOriginal     = selectedProduct?.category.unit === 'ml' && !isTier;
    const needsSize      = isTier || selSaleType === 'unit_decant';
    const needsQty       = selSaleType === 'unit_based';
    const effectiveST    = isTier ? 'tier_decant' : selSaleType;

    const selectedCustomer = customerId ? customers.find(c => c.id === +customerId) : null;
    const originalDebt     = +(selectedCustomer?.total_debt ?? 0);

    // sale type options for non-tier products
    function saleTypeOptions() {
        if (!selectedProduct || isTier) return [];
        if (isOriginal) return [
            { label: 'أصلي - تقسيم', badge: 'unit_decant', description: 'بيع بالمليلتر حسب الحجم المطلوب', icon: '📊' },
            { label: 'عبوة كاملة',   badge: 'full_bottle', description: 'بيع العبوة بالكامل بحجمها الأصلي', icon: '🎁' },
        ];
        return [{ label: 'بالوحدة', badge: 'unit_based', description: 'بيع بالقطعة أو بالجرام', icon: '⚖️' }];
    }

    // auto-select sale type when product changes
    useEffect(() => {
        if (selectedProduct && !isTier && !selSaleType) {
            const opts = saleTypeOptions();
            if (opts.length === 1) {
                setSelSaleType(opts[0].badge);
            } else if (isOriginal) {
                setSelSaleType('unit_decant');
            } else {
                setShowSaleTypeModal(true);
            }
        }
    }, [selectedProduct, isTier, selSaleType]);

    // ── حساب السعر الافتراضي والحد الأدنى لأي نوع بيع ──────────────────────
    function resolveDefaultAndMin(): { defaultPrice: number; minPrice: number } {
        if (!selectedProduct || !effectiveST) return { defaultPrice: 0, minPrice: 0 };
        const pp = selectedProduct.product_price;
        const pt = selectedProduct.price_tier;
        switch (effectiveST) {
            case 'tier_decant': {
                if (!selSize) return { defaultPrice: 0, minPrice: 0 };
                if (selSize.startsWith('-custom-')) {
                    return {
                        defaultPrice: pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0,
                        minPrice:     pp ? +pp.price_per_unit_vip : 0,
                    };
                }
                const tp = pt?.tier_prices?.find(t => t.size_id === +selSize);
                return tp ? { defaultPrice: +(isVip ? tp.price_vip : tp.price_regular), minPrice: +tp.price_vip } : { defaultPrice: 0, minPrice: 0 };
            }
            case 'unit_decant':
            case 'unit_based':
                return pp ? {
                    defaultPrice: +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular),
                    minPrice:     +pp.price_per_unit_vip,
                } : { defaultPrice: 0, minPrice: 0 };
            case 'full_bottle':
                return pp ? {
                    defaultPrice: +(isVip ? (pp.full_bottle_vip ?? 0) : (pp.full_bottle_regular ?? 0)),
                    minPrice:     +(pp.full_bottle_vip ?? 0),
                } : { defaultPrice: 0, minPrice: 0 };
            default: return { defaultPrice: 0, minPrice: 0 };
        }
    }

    // هل يجب إظهار حقل السعر؟ — عندما يكون نوع البيع محدداً والحجم محدداً (إن كان مطلوباً)
    const showPriceField = !!(selectedProduct && effectiveST && (!needsSize || selSize));

    // عند تغيير المنتج أو نوع البيع أو الحجم — نحدّث السعر الافتراضي تلقائياً
    useEffect(() => {
        if (showPriceField) {
            const { defaultPrice, minPrice } = resolveDefaultAndMin();
            if (defaultPrice > 0) {
                setSelUnitPrice(defaultPrice.toFixed(2));
                setSelMinPrice(minPrice);
            } else {
                setSelUnitPrice('');
                setSelMinPrice(0);
            }
        }
    }, [selProduct, selSaleType, selSize, isVip]);

    // stock calculations
    function getCartConsumed(productId: number): number {
        return cart.filter(i => i.product_id === productId).reduce((s, i) => s + +i.quantity, 0);
    }
    const availableStock = selectedProduct ? +selectedProduct.stock - getCartConsumed(selectedProduct.id) : 0;

    const maxCount: number | undefined = selectedProduct && (isTier || selSaleType)
        ? (() => {
            if (effectiveST === 'unit_based') return availableStock;
            if (needsSize && !selSize) return undefined;
            const qty = resolveQuantity(selectedProduct, effectiveST, selSize, '1', sizes);
            return qty > 0 ? Math.floor(availableStock / qty) : 0;
        })()
        : undefined;

    // preview — يستخدم selUnitPrice إذا أدخله المستخدم وإلا السعر الافتراضي
    const effectiveUnitPrice = selUnitPrice && +selUnitPrice >= selMinPrice
        ? +selUnitPrice
        : (selectedProduct && (isTier ? selSize : selSaleType)
            ? resolvePrice(selectedProduct, effectiveST, selSize, isVip)
            : null);
    const previewPrice = effectiveUnitPrice;
    const previewQty = selectedProduct && (isTier ? selSize : selSaleType)
        ? resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes) : null;
    const previewCount = effectiveST === 'unit_based' ? (+selQty || 1) : (parseInt(selQty) || 1);
    const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0
        ? resolveLineTotal(effectiveST, previewPrice, previewQty) * (effectiveST === 'unit_based' ? 1 : previewCount)
        : null;

    // totals
    const total      = cart.reduce((s, i) => s + i.line_total, 0);
    const debtAmount = debtPayment ? (+debtPayment.amount || 0) : 0;
    const grandTotal = debtPayment ? total + originalDebt : total;
    const totalPaid  = payments.reduce((s, p) => s + (+p.amount || 0), 0) + debtAmount;
    const remaining  = grandTotal - totalPaid;

    const canAdd = !!(selectedProduct
        && (isTier ? (!needsSize || selSize) : selSaleType)
        && (!needsSize || selSize)
        && (!needsQty || selQty)
        && (maxCount === undefined || maxCount > 0));

    // ── actions ───────────────────────────────────────────────────────────────

    function updatePaymentForTotal(newTotal: number) {
        if (payments.length === 1 && newTotal > 0) {
            setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]);
        } else if (newTotal === 0) {
            setPayments([]);
        }
    }

    function addToCart() {
        if (!selectedProduct || (!isTier && !selSaleType)) return;

        // السعر: إما ما أدخله المستخدم أو السعر الافتراضي
        const unitPrice = selUnitPrice && +selUnitPrice >= selMinPrice
            ? +selUnitPrice
            : resolvePrice(selectedProduct, effectiveST, selSize, isVip);

        if (effectiveST === 'unit_based') {
            const qty = +selQty || 0;
            if (!qty || !unitPrice) return;
            const newItem: CartItem = {
                product_id: selectedProduct.id, product_name: selectedProduct.name,
                sale_type: effectiveST, size_id: selSize, size_label: '',
                quantity: String(qty), unit_price: unitPrice,
                line_total: resolveLineTotal(effectiveST, unitPrice, qty),
            };
            setCart(prev => {
                const newCart = [...prev, newItem];
                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                if (prev.length === 0 && paymentMethods.length > 0) {
                    setPayments([{ payment_method_id: String(paymentMethods[0].id), method_name: paymentMethods[0].name, amount: newTotal.toFixed(2) }]);
                } else { setTimeout(() => updatePaymentForTotal(newTotal), 0); }
                return newCart;
            });
        } else {
            const qty = resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes);
            if (!qty || !unitPrice) return;
            const sizeLabel = selSize.startsWith('-custom-')
                ? `${selSize.replace('-custom-', '')} مل`
                : (sizes.find(s => s.id === +selSize)?.label ?? '');
            const count = parseInt(selQty) || 1;
            const newItems: CartItem[] = Array.from({ length: count }, () => ({
                product_id: selectedProduct.id, product_name: selectedProduct.name,
                sale_type: effectiveST, size_id: selSize, size_label: sizeLabel,
                quantity: String(qty), unit_price: unitPrice,
                line_total: resolveLineTotal(effectiveST, unitPrice, qty),
            }));
            setCart(prev => {
                const newCart = [...prev, ...newItems];
                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                if (prev.length === 0 && paymentMethods.length > 0) {
                    setPayments([{ payment_method_id: String(paymentMethods[0].id), method_name: paymentMethods[0].name, amount: newTotal.toFixed(2) }]);
                } else { setTimeout(() => updatePaymentForTotal(newTotal), 0); }
                return newCart;
            });
        }

        setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1');
        setSelUnitPrice(''); setSelMinPrice(0);
        setResetKey(k => k + 1);
    }

    function removeGroup(indices: number[]) {
        setCart(prev => {
            const newCart = prev.filter((_, i) => !indices.includes(i));
            const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
            setTimeout(() => updatePaymentForTotal(newTotal), 0);
            return newCart;
        });
    }

    function addPayment() {
        if (!selMethod || !selAmount || +selAmount <= 0) return;
        const currentPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0) + debtAmount;
        if (currentPaid + +selAmount > total) return;
        const method = paymentMethods.find(m => m.id === +selMethod);
        if (!method) return;
        setPayments(prev => [...prev, { payment_method_id: selMethod, method_name: method.name, amount: selAmount }]);
        setSelMethod(''); setSelAmount('');
    }

    function clearForm() {
        setCustomerId(''); setCustomerType('regular'); setNotes('');
        setCart([]); setPayments([]); setDebtPayment(null);
        setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1');
        setSelUnitPrice(''); setSelMinPrice(0);
        setSelMethod(''); setSelAmount('');
        setResetKey(k => k + 1);
    }

    function submit() {
        if (cart.length === 0 || (isCashCustomer && Math.abs(remaining) > 0.01)) return;
        setProcessing(true);
        router.post('/invoices', {
            customer_id:   customerId || null,
            customer_type: customerType,
            notes,
            items: cart.map(i => ({
                product_id: i.product_id,
                size_id:    i.size_id && !i.size_id.startsWith('-custom-') ? i.size_id : null,
                sale_type:  i.sale_type,
                quantity:   i.quantity,
                unit_price: i.unit_price,
                line_total: i.line_total,
            })),
            payments: payments.map(p => ({
                payment_method_id: p.payment_method_id,
                amount:            p.amount,
                notes:             null,
            })),
            debt_payment: debtPayment ? {
                payment_method_id: debtPayment.payment_method_id,
                amount:            debtPayment.amount,
            } : null,
        }, {
            onSuccess: clearForm,
            onFinish:  () => setProcessing(false),
        });
    }

    const customerOptions = [
        { label: 'زبون نقدي', badge: 'نقدي' },
        ...customers.filter(c => c.id !== 1).map(c => ({ label: c.name, badge: '' })),
    ];
    const selectedCustomerName = selectedCustomer?.name ?? 'زبون نقدي';

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <>
        <AppShell pageTitle="فاتورة بيع جديدة">
            <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-10 h-[calc(100vh-80px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

                {/* ══ LEFT PANEL ══ */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">

                    {/* Top bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <Link href="/invoices" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
                                <ChevronLeft className="w-4 h-4" /> فواتير البيع
                            </Link>
                            <span className="text-slate-300 dark:text-white/10">/</span>
                            <span className="font-black text-slate-800 dark:text-white text-sm">فاتورة جديدة</span>
                        </div>
                        {flash?.error && <span className="text-xs font-bold text-red-500">{flash.error}</span>}
                    </div>

                    {/* Customer bar */}
                    <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <ModernSelect key={resetKey} label="" options={customerOptions}
                                        defaultValue="زبون نقدي" placeholder="اختر العميل"
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
                                        className={`px-4 h-11 rounded-[14px] border-2 transition-all font-bold text-sm ${customerType === type ? 'border-primary bg-primary text-white' : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-primary/40'}`}>
                                        {type === 'regular' ? 'عادي' : '⭐ VIP'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Debt warning */}
                        {customerId && originalDebt > 0 && (
                            <div className="mx-5 mb-3 px-4 py-3 rounded-[14px] bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span className="text-sm font-bold text-red-600 dark:text-red-400">الدين السابق: {originalDebt.toFixed(2)}</span>
                                </div>
                                <button onClick={() => {
                                    const m = paymentMethods[0];
                                    if (!m) return;
                                    setDebtPayment({ payment_method_id: String(m.id), method_name: m.name, amount: originalDebt.toFixed(2) });
                                }} className="flex items-center gap-1.5 px-3 h-8 rounded-[10px] bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white font-bold text-xs transition-all shrink-0">
                                    <CreditCard className="w-3.5 h-3.5" /> سداد الدين
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Add product form */}
                    <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Row 1: product + sale type + qty + preview */}
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[180px]">
                                    <ModernSelect key={`p-${resetKey}`} label="" placeholder="اختر المنتج..."
                                        options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `${p.stock}` }))}
                                        defaultValue=""
                                        onSelect={val => {
                                            const p = products.find(p => p.name === val);
                                            setSelProduct(p ? String(p.id) : '');
                                            setSelSaleType(''); setSelSize(''); setSelQty('1');
                                        }}
                                    />
                                </div>

                                {/* sale type toggle for non-tier with multiple options */}
                                {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
                                    <button onClick={() => setShowSaleTypeModal(true)}
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-44 cursor-pointer hover:border-primary/40 transition-all flex items-center justify-between">
                                        <span>{saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}</span>
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                )}

                                {/* qty / count input */}
                                {selectedProduct && (isTier || selSaleType) && (
                                    <button onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v), maxCount)}
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[18px] font-black w-24 text-center cursor-pointer hover:border-primary/40 transition-all">
                                        {selQty || '1'}
                                    </button>
                                )}

                                {/* preview chips */}
                                {previewTotal !== null && previewQty !== null && previewQty > 0 && (
                                    <>
                                        <div className="flex items-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">سعر</span>
                                            <span className="font-black text-primary text-sm mr-1">{previewPrice?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">إجمالي</span>
                                            <span className="font-black text-primary text-sm mr-1">{fmt(previewTotal)}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Row 2: sizes (if needed) */}
                            {needsSize && (
                                <div className="w-full">
                                    <SizeSelect sizes={sizes} selectedSizeId={selSize}
                                        onSizeSelect={id => { setSelSize(id); setSelUnitPrice(''); }}
                                        onPriceResolved={(def, min) => { setSelUnitPrice(def.toFixed(2)); setSelMinPrice(min); }}
                                        product={selectedProduct} isVip={isVip} />
                                </div>
                            )}

                            {/* Row 3: حقل سعر الوحدة + زر الإضافة — يظهر لجميع أنواع البيع */}
                            {showPriceField && (
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                            سعر الوحدة
                                            {selMinPrice > 0 && (
                                                <span className="mr-1 text-slate-400 dark:text-white/30 normal-case font-bold">
                                                    (حد أدنى: {selMinPrice.toFixed(2)})
                                                </span>
                                            )}
                                        </label>
                                        <button
                                            onClick={() => openPad(
                                                `سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`,
                                                selUnitPrice,
                                                v => setSelUnitPrice(v),
                                            )}
                                            className={`h-14 rounded-[20px] px-5 text-[18px] font-black w-full sm:w-36 text-center cursor-pointer transition-all spatial-input ${
                                                selUnitPrice && +selUnitPrice < selMinPrice
                                                    ? 'border-red-500/60 text-red-500'
                                                    : 'hover:border-primary/40'
                                            }`}>
                                            {selUnitPrice || '0.00'}
                                        </button>
                                        {selUnitPrice && +selUnitPrice < selMinPrice && (
                                            <span className="text-xs font-bold text-red-500">أقل من الحد الأدنى</span>
                                        )}
                                    </div>
                                    <button onClick={addToCart} disabled={!canAdd || (!!selUnitPrice && +selUnitPrice < selMinPrice)}
                                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-3 px-8 h-14 text-lg font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                                        <Plus className="w-6 h-6" /> إضافة
                                    </button>
                                </div>
                            )}

                            {/* Stock warning */}
                            {selectedProduct && maxCount !== undefined && maxCount === 0 && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-red-500/10 border border-red-500/20">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                        المخزون غير كافٍ — المتاح: {availableStock} {selectedProduct.category.unit}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes + totals */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            rows={3} placeholder="ملاحظات على فاتورة البيع... (اختياري)"
                            className="w-full spatial-input rounded-[16px] px-4 py-3 text-sm font-bold resize-none" />

                        {/* Totals summary */}
                        <div className="flex flex-col gap-2 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                            {[
                                { label: 'الإجمالي', value: grandTotal.toFixed(2), cls: 'text-slate-800 dark:text-white text-lg font-black' },
                                { label: 'المدفوع',  value: totalPaid.toFixed(2),  cls: 'text-emerald-600 dark:text-emerald-400 font-bold' },
                                { label: 'المتبقي',  value: remaining.toFixed(2),  cls: remaining > 0.01 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-white/30 font-bold' },
                            ].map(({ label, value, cls }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500 dark:text-white/40">{label}</span>
                                    <span className={cls}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex flex-col gap-2">
                        {isCashCustomer && remaining > 0.01 && (
                            <div className="px-4 py-2 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                ⚠️ زبون نقدي — يجب الدفع الكامل قبل التأكيد
                            </div>
                        )}
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-2 w-1/4">
                                <Link href="/invoices" className="h-[68px] flex items-center justify-center gap-2 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/10 dark:border-white/20">
                                    <X className="w-4 h-4" /> إلغاء
                                </Link>
                                {cart.length > 0 && (
                                    <button onClick={clearForm} className="h-[68px] flex items-center justify-center gap-2 rounded-[16px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-bold text-sm transition-all">
                                        <Trash2 className="w-4 h-4" /> مسح
                                    </button>
                                )}
                            </div>
                            <button onClick={submit}
                                disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                                className="spatial-button flex-1 flex items-center justify-center gap-2 text-lg font-black disabled:opacity-40"
                                style={{ height: cart.length > 0 ? '144px' : '68px' }}>
                                <Check className="w-6 h-6" />
                                {cart.length > 0 ? `تأكيد البيع — ${grandTotal.toFixed(2)}` : 'تأكيد البيع'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT PANEL ══ */}
                <div className="w-full lg:w-[650px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0">

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
                                <Package className="w-12 h-12" />
                                <span className="font-bold text-sm">لا توجد منتجات</span>
                                <span className="text-xs">أضف منتجاً من اليسار</span>
                            </div>
                        ) : (() => {
                            // group identical items
                            const groups = cart.reduce((acc, item, idx) => {
                                const key = `${item.product_id}-${item.size_id}-${item.sale_type}`;
                                if (!acc[key]) {
                                    acc[key] = { ...item, count: 1, totalQty: +item.quantity, totalAmount: item.line_total, indices: [idx] };
                                } else {
                                    acc[key].count++;
                                    acc[key].totalQty += +item.quantity;
                                    acc[key].totalAmount += item.line_total;
                                    acc[key].indices.push(idx);
                                }
                                return acc;
                            }, {} as Record<string, any>);

                            return (
                                <div className="flex flex-col gap-2">
                                    <div className="hidden sm:grid grid-cols-[60px_2fr_70px_80px_90px_50px] gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                                        <span className="text-center">عدد</span>
                                        <span>المنتج</span>
                                        <span className="text-center">حجم</span>
                                        <span className="text-center">سعر</span>
                                        <span className="text-center">الإجمالي</span>
                                        <span className="text-center">حذف</span>
                                    </div>
                                    {Object.values(groups).map((g: any, idx) => {
                                        const displayCount = g.sale_type === 'unit_based' ? g.totalQty : g.count;
                                        return (
                                            <div key={idx} className="grid grid-cols-[60px_2fr_70px_80px_90px_50px] gap-2 px-3 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-sm">
                                                {/* count — clickable to edit */}
                                                <div className="flex items-center justify-center">
                                                    <button onClick={() => {
                                                        const p = products.find(p => p.id === g.product_id);
                                                        const consumed = cart.filter((_, i) => !g.indices.includes(i)).filter(i => i.product_id === g.product_id).reduce((s, i) => s + +i.quantity, 0);
                                                        const stockLeft = p ? +p.stock - consumed : 0;
                                                        const itemQty = +g.quantity;
                                                        const cartMax = g.sale_type === 'unit_based' ? stockLeft : (itemQty > 0 ? Math.floor(stockLeft / itemQty) : 0);
                                                        openPad(g.sale_type === 'unit_based' ? 'الكمية' : 'العدد', String(displayCount), newVal => {
                                                            const newCount = parseInt(newVal) || 1;
                                                            const product = products.find(p => p.id === g.product_id);
                                                            if (!product) return;
                                                            setCart(prev => {
                                                                let newCart = prev.filter((_, i) => !g.indices.includes(i));
                                                                for (let i = 0; i < newCount; i++) {
                                                                    const qty   = resolveQuantity(product, g.sale_type, g.size_id, '1', sizes);
                                                                    const price = resolvePrice(product, g.sale_type, g.size_id, isVip);
                                                                    if (qty && price) {
                                                                        newCart.push({ product_id: product.id, product_name: product.name, sale_type: g.sale_type, size_id: g.size_id, size_label: g.size_label, quantity: String(qty), unit_price: price, line_total: resolveLineTotal(g.sale_type, price, qty) });
                                                                    }
                                                                }
                                                                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                                setTimeout(() => updatePaymentForTotal(newTotal), 0);
                                                                return newCart;
                                                            });
                                                        }, cartMax);
                                                    }} className="w-14 h-12 rounded-[12px] bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-primary/50 font-black text-base text-slate-800 dark:text-white transition-all cursor-pointer active:scale-[0.95]">
                                                        {displayCount}
                                                    </button>
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{g.product_name}</span>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{saleTypeLabels[g.sale_type] ?? g.sale_type}</span>
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    {g.size_label ? (
                                                        <span className="text-xs font-black text-white bg-primary px-2 py-1 rounded-full">{g.size_label}</span>
                                                    ) : g.sale_type === 'full_bottle' ? (
                                                        <span className="text-xs font-black text-white bg-emerald-500 px-2 py-1 rounded-full">
                                                            {products.find(p => p.id === g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                                        </span>
                                                    ) : <span className="text-slate-400 text-sm">—</span>}
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{g.unit_price}</span>
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    <span className="font-black text-slate-800 dark:text-white text-base">{g.totalAmount.toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    <button onClick={() => removeGroup(g.indices)}
                                                        className="w-10 h-10 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-[0.95]">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Payment section */}
                    <div className="shrink-0 border-t border-black/5 dark:border-white/5 px-5 py-4 flex flex-col gap-3">

                        {/* Debt payment row */}
                        {debtPayment && (
                            <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-red-500/5 border border-red-500/15">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                    <span className="font-bold text-slate-700 dark:text-white/70 text-sm">سداد الدين — {debtPayment.method_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openPad('سداد الدين', debtPayment.amount, v => setDebtPayment(prev => prev ? { ...prev, amount: v } : prev))}
                                        className="font-black text-red-500 text-sm hover:underline cursor-pointer">{debtPayment.amount}</button>
                                    <button onClick={() => setDebtPayment(null)} className="w-5 h-5 rounded-[5px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Payment entries */}
                        {payments.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-emerald-500/5 border border-emerald-500/15">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="font-bold text-slate-700 dark:text-white/70 text-sm">{p.method_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{p.amount}</span>
                                    <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))}
                                        className="w-5 h-5 rounded-[5px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add payment row */}
                        {cart.length > 0 && (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <ModernSelect label="" options={paymentMethods.map(m => ({ label: m.name }))}
                                        defaultValue={paymentMethods.find(m => m.id === +selMethod)?.name ?? ''}
                                        placeholder="وسيلة الدفع"
                                        onSelect={val => setSelMethod(String(paymentMethods.find(m => m.name === val)?.id ?? ''))}
                                    />
                                </div>
                                <button onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v))}
                                    className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold w-28 text-center cursor-pointer hover:border-primary/40 transition-all">
                                    {selAmount || remaining.toFixed(2)}
                                </button>
                                <button onClick={addPayment} disabled={!selMethod || !selAmount}
                                    className="spatial-button flex items-center justify-center w-14 h-14 disabled:opacity-40 shrink-0">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>

        <SaleTypeModal
            isOpen={showSaleTypeModal}
            onClose={() => setShowSaleTypeModal(false)}
            onSelect={st => { setSelSaleType(st); setSelSize(''); setSelQty('1'); }}
            options={saleTypeOptions()}
            title="اختر نوع البيع"
        />

        <NumberPadModal
            isOpen={showPad}
            title={padTitle}
            initialValue={padInitial}
            maxValue={padMax}
            onClose={() => setShowPad(false)}
            onConfirm={v => { padCallback?.(v); setShowPad(false); }}
        />
        </>
    );
}
