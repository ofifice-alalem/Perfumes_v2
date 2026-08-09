import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, User, AlertCircle, Clock, Play, Pause, Edit,
    ChevronUp, Wallet, CheckCircle2,
} from 'lucide-react';

interface Customer { id: number; name: string; total_debt?: string; }
interface Size { id: number; label: string; value: string; }
interface Category { id: number; name: string; unit: string; }
interface ProductPrice {
    price_per_unit_regular: string; price_per_unit_vip: string;
    full_bottle_regular: string | null; full_bottle_vip: string | null;
}
interface OriginalDetail { bottle_volume: string; }
interface TierPrice { size_id: number; price_regular: string; price_vip: string; }
interface PriceTier { id: number; name: string; tier_prices?: TierPrice[]; }
interface Product {
    id: number; name: string; stock: string; selling_type: string; qrcode?: string | null;
    category: Category;
    price_tier: PriceTier | null;
    product_price: ProductPrice | null;
    original_perfume_detail: OriginalDetail | null;
}
interface PaymentMethod { id: number; name: string; }

interface InvoiceItemData {
    id: number; product_id: number; size_id: number | null;
    sale_type: string; quantity: string; unit_price: string; line_total: string;
    product: { id: number; name: string; category?: Category };
    size: { id: number; label: string; value: string } | null;
}
interface InvoicePaymentData {
    id: number; amount: string;
    payment_method: { id: number; name: string };
}
interface EditInvoice {
    id: number; customer_id: number; customer_type: string;
    notes: string | null;
    customer: { id: number; name: string; total_debt?: string } | null;
    items: InvoiceItemData[];
    payments: InvoicePaymentData[];
}

interface Props {
    customers: Customer[];
    products: Product[];
    sizes: Size[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
    editInvoice?: EditInvoice;
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

interface PaymentEntry {
    payment_method_id: string;
    method_name: string;
    amount: string;
}

// Hold Invoice Interface
interface HoldInvoice {
    id: string;
    customerId: string;
    customerType: 'regular' | 'vip';
    customerName: string;
    notes: string;
    cart: CartItem[];
    payments: PaymentEntry[];
    debtPayment: PaymentEntry | null;
    timestamp: number;
    total: number;
}

const saleTypeLabels: Record<string, string> = {
    tier_decant: 'زيتي',
    unit_decant: 'أصلي - تقسيم',
    full_bottle: 'عبوة كاملة',
    unit_based: 'بالوحدة',
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
        case 'unit_based': return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
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
        case 'unit_based': return +manualQty || 0;
        default: return 0;
    }
}

function resolveLineTotal(saleType: string, price: number, quantity: number): number {
    return (saleType === 'full_bottle' || saleType === 'tier_decant') ? price : price * quantity;
}

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getProductDisplayPrice(p: Product, isVip: boolean): string {
    const pp = p.product_price;
    if (!pp) return '';
    const unitPrice = parseFloat(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular);
    const fullPrice = pp.full_bottle_regular ? parseFloat(isVip ? (pp.full_bottle_vip ?? '0') : pp.full_bottle_regular) : 0;
    
    if (unitPrice > 0) return `${fmt(unitPrice)} د.ل`;
    if (fullPrice > 0) return `${fmt(fullPrice)} د.ل`;
    if (p.price_tier?.tier_prices?.length) {
        const prices = p.price_tier.tier_prices.map(t => parseFloat(isVip ? t.price_vip : t.price_regular)).filter(n => !isNaN(n) && n > 0);
        if (prices.length > 0) {
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return min === max ? `${fmt(min)} د.ل` : `${fmt(min)} - ${fmt(max)} د.ل`;
        }
    }
    return '';
}

export default function InvoicesCreate({ customers, products, sizes, paymentMethods, flash, editInvoice }: Props) {
    const isEditMode = !!editInvoice;

    // Build initial cart from invoice items when editing
    function buildInitialCart(): CartItem[] {
        if (!editInvoice) return [];
        return editInvoice.items.map(item => ({
            product_id: item.product_id,
            product_name: item.product?.name ?? '',
            sale_type: item.sale_type,
            size_id: item.size_id ? String(item.size_id) : '',
            size_label: item.size?.label ?? '',
            quantity: String(item.quantity),
            unit_price: +item.unit_price,
            line_total: +item.line_total,
        }));
    }

    // Build initial payments from invoice payments when editing
    function buildInitialPayments(): PaymentEntry[] {
        if (!editInvoice) return [];
        return editInvoice.payments.map(p => ({
            payment_method_id: String(p.payment_method.id),
            method_name: p.payment_method.name,
            amount: (+p.amount).toFixed(2),
        }));
    }

    const [resetKey, setResetKey] = useState(0);
    const [customerId, setCustomerId] = useState(editInvoice && editInvoice.customer_id !== 1 ? String(editInvoice.customer_id) : '');
    const [customerType, setCustomerType] = useState<'regular' | 'vip'>(editInvoice?.customer_type === 'vip' ? 'vip' : 'regular');
    const [notes, setNotes] = useState(editInvoice?.notes ?? '');
    const [cart, setCart] = useState<CartItem[]>(buildInitialCart);
    const [payments, setPayments] = useState<PaymentEntry[]>(buildInitialPayments);
    const [debtPayment, setDebtPayment] = useState<PaymentEntry | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showCreditConfirm, setShowCreditConfirm] = useState(false);
    const [paymentManuallySet, setPaymentManuallySet] = useState(isEditMode);
    const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F10') {
                e.preventDefault();
                if (!showPaymentDrawer && cart.length > 0) {
                    setShowPaymentDrawer(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPaymentDrawer, cart]);

    // Hold invoices state
    const [holdInvoices, setHoldInvoices] = useState<HoldInvoice[]>([]);
    const [showHoldList, setShowHoldList] = useState(false);

    // Default Payment Method
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string>('');

    // product selection
    const [selProduct, setSelProduct] = useState('');
    const [selSaleType, setSelSaleType] = useState('');
    const [selSize, setSelSize] = useState('');
    const [selQty, setSelQty] = useState('1');
    const [selUnitPrice, setSelUnitPrice] = useState('');
    const [selMinPrice, setSelMinPrice] = useState(0);

    // payment input
    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');

    // modals
    const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);
    const [showPad, setShowPad] = useState(false);
    const [padTitle, setPadTitle] = useState('');
    const [padInitial, setPadInitial] = useState('');
    const [padMax, setPadMax] = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    // Mobile tabs state
    const [activeTab, setActiveTab] = useState<'products' | 'payment' | 'confirm'>('products');

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max);
        setPadCallback(() => cb); setShowPad(true);
    }

    // Auto-switch to payment tab when cart has items
    useEffect(() => {
        if (cart.length > 0 && activeTab === 'products') {
            // Don't auto-switch, let user control
        }
    }, [cart.length]);

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
                        setSelSaleType(''); setSelSize(''); setSelQty('1');
                        setSelUnitPrice(''); setSelMinPrice(0);
                        setResetKey(k => k + 1);
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

    // ── derived ──────────────────────────────────────────────────────────────
    const isVip = customerType === 'vip';
    const isCashCustomer = !customerId;
    const selectedProduct = products.find(p => p.id === +selProduct);
    const isTier = selectedProduct?.selling_type === 'tier_based';
    const isOriginal = selectedProduct?.category.unit === 'ml' && !isTier;
    const needsSize = isTier || selSaleType === 'unit_decant';
    const needsQty = selSaleType === 'unit_based';
    const effectiveST = isTier ? 'tier_decant' : selSaleType;

    const selectedCustomer = customerId ? customers.find(c => c.id === +customerId) : null;
    const originalDebt = +(selectedCustomer?.total_debt ?? 0);

    // sale type options for non-tier products
    function saleTypeOptions() {
        if (!selectedProduct || isTier) return [];
        if (isOriginal) return [
            { label: 'أصلي - تقسيم', badge: 'unit_decant', description: 'بيع بالمليلتر حسب الحجم المطلوب', icon: '📊' },
            { label: 'عبوة كاملة', badge: 'full_bottle', description: 'بيع العبوة بالكامل بحجمها الأصلي', icon: '🎁' },
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
                        minPrice: pp ? +pp.price_per_unit_vip : 0,
                    };
                }
                const tp = pt?.tier_prices?.find(t => t.size_id === +selSize);
                return tp ? { defaultPrice: +(isVip ? tp.price_vip : tp.price_regular), minPrice: +tp.price_vip } : { defaultPrice: 0, minPrice: 0 };
            }
            case 'unit_decant':
            case 'unit_based':
                return pp ? {
                    defaultPrice: +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular),
                    minPrice: +pp.price_per_unit_vip,
                } : { defaultPrice: 0, minPrice: 0 };
            case 'full_bottle':
                return pp ? {
                    defaultPrice: +(isVip ? (pp.full_bottle_vip ?? 0) : (pp.full_bottle_regular ?? 0)),
                    minPrice: +(pp.full_bottle_vip ?? 0),
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
    // في وضع التعديل، المخزون الحالي يكون مخصوماً منه الفاتورة الأصلية
    // لذا نضيف كميات الفاتورة الأصلية للمنتج ليظهر المخزون المتاح الفعلي
    function getOriginalInvoiceQty(productId: number): number {
        if (!editInvoice) return 0;
        return editInvoice.items.filter(i => i.product_id === productId).reduce((s, i) => s + +i.quantity, 0);
    }
    const availableStock = selectedProduct
        ? +selectedProduct.stock + getOriginalInvoiceQty(selectedProduct.id) - getCartConsumed(selectedProduct.id)
        : 0;

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
    const total = cart.reduce((s, i) => s + i.line_total, 0);
    const debtAmount = debtPayment ? (+debtPayment.amount || 0) : 0;
    const grandTotal = debtPayment ? total + originalDebt : total;
    const totalPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0) + debtAmount;
    const remaining = grandTotal - totalPaid;

    const canAdd = !!(selectedProduct
        && (isTier ? (!needsSize || selSize) : selSaleType)
        && (!needsSize || selSize)
        && (!needsQty || selQty)
        && (maxCount === undefined || maxCount > 0));

    // ── actions ───────────────────────────────────────────────────────────────

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

                if (!paymentManuallySet) {
                    if (prev.length === 0 && paymentMethods.length > 0) {
                        const def = paymentMethods.find(m => String(m.id) === defaultPaymentMethodId) || paymentMethods[0];
                        setPayments([{ payment_method_id: String(def.id), method_name: def.name, amount: newTotal.toFixed(2) }]);
                    } else if (payments.length === 1) {
                        setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]);
                    }
                }

                return newCart;
            });
        } else {
            const qty = resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes);
            if (!qty || !unitPrice) return;
            const sizeLabel = selSize.startsWith('-custom-')
                ? `${selSize.replace('-custom-', '')} مل`
                : (sizes.find(s => s.id === +selSize)?.label ?? '');
            const count = parseInt(selQty) || 1;
            const singleLineTotal = resolveLineTotal(effectiveST, unitPrice, qty);
            const totalQty = qty * count;
            const totalLT = singleLineTotal * count;
            const sizeKey = selSize && !selSize.startsWith('-custom-') ? selSize : selSize;
            setCart(prev => {
                // دمج مع عنصر موجود إذا كان نفس المنتج/الحجم/النوع/السعر
                const existIdx = prev.findIndex(i =>
                    i.product_id === selectedProduct.id &&
                    i.size_id === sizeKey &&
                    i.sale_type === effectiveST &&
                    i.unit_price === unitPrice
                );
                let newCart: CartItem[];
                if (existIdx !== -1) {
                    newCart = prev.map((item, i) => i === existIdx ? {
                        ...item,
                        quantity: String(+item.quantity + totalQty),
                        line_total: item.line_total + totalLT,
                    } : item);
                } else {
                    newCart = [...prev, {
                        product_id: selectedProduct.id, product_name: selectedProduct.name,
                        sale_type: effectiveST, size_id: sizeKey, size_label: sizeLabel,
                        quantity: String(totalQty), unit_price: unitPrice,
                        line_total: totalLT,
                    }];
                }
                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                if (!paymentManuallySet) {
                    if (prev.length === 0 && paymentMethods.length > 0) {
                        const def = paymentMethods.find(m => String(m.id) === defaultPaymentMethodId) || paymentMethods[0];
                        setPayments([{ payment_method_id: String(def.id), method_name: def.name, amount: newTotal.toFixed(2) }]);
                    } else if (payments.length === 1) {
                        setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]);
                    }
                }
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

            if (payments.length === 1) {
                if (newTotal > 0) {
                    setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]);
                } else {
                    setPayments([]);
                }
            }

            return newCart;
        });
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
        const currentPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0) + debtAmount;
        if (currentPaid + +amountToAdd > grandTotal + 0.001) return;
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

    function clearForm() {
        setCustomerId(''); setCustomerType('regular'); setNotes('');
        setCart([]); setPayments([]); setDebtPayment(null);
        setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1');
        setSelUnitPrice(''); setSelMinPrice(0);
        setSelMethod(''); setSelAmount('');
        setPaymentManuallySet(false);
        setResetKey(k => k + 1);
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
            debtPayment: debtPayment ? { ...debtPayment } : null,
            timestamp: Date.now(),
            total,
        };

        setHoldInvoices(prev => [...prev, holdInvoice]);
        clearForm();
    }

    function restoreHoldInvoice(holdInvoice: HoldInvoice) {
        setCustomerId(holdInvoice.customerId);
        setCustomerType(holdInvoice.customerType);
        setNotes(holdInvoice.notes);
        setCart([...holdInvoice.cart]);
        setPayments([...holdInvoice.payments]);
        setDebtPayment(holdInvoice.debtPayment ? { ...holdInvoice.debtPayment } : null);

        // Remove from hold list
        setHoldInvoices(prev => prev.filter(h => h.id !== holdInvoice.id));
        setShowHoldList(false);

        // Reset key to force ModernSelect to update
        setResetKey(k => k + 1);
    }

    function deleteHoldInvoice(holdId: string) {
        setHoldInvoices(prev => prev.filter(h => h.id !== holdId));
    }

    function submit() {
        if (cart.length === 0 || (isCashCustomer && Math.abs(remaining) > 0.01)) return;
        if (!isCashCustomer && remaining > 0.01) {
            setShowCreditConfirm(true);
            return;
        }
        executeSubmit();
    }

    function executeSubmit() {
        setShowCreditConfirm(false);
        setShowPaymentDrawer(false);
        setProcessing(true);

        const payload = {
            customer_id: customerId || null,
            customer_type: customerType,
            notes,
            items: cart.map(i => ({
                product_id: i.product_id,
                size_id: i.size_id && !i.size_id.startsWith('-custom-') ? i.size_id : null,
                sale_type: i.sale_type,
                quantity: i.quantity,
                unit_price: i.unit_price,
                line_total: i.line_total,
            })),
            payments: payments.map(p => ({
                payment_method_id: p.payment_method_id,
                amount: p.amount,
                notes: null,
            })),
            ...(isEditMode ? {} : {
                debt_payment: debtPayment ? {
                    payment_method_id: debtPayment.payment_method_id,
                    amount: debtPayment.amount,
                } : null,
            }),
        };

        if (isEditMode) {
            router.put(`/invoices/${editInvoice!.id}`, payload, {
                onFinish: () => setProcessing(false),
            });
        } else {
            router.post('/invoices', payload, {
                onSuccess: clearForm,
                onFinish: () => setProcessing(false),
            });
        }
    }

    const customerOptions = [
        { label: 'زبون نقدي', badge: 'نقدي' },
        ...customers.filter(c => c.id !== 1).map(c => ({ label: c.name, badge: '' })),
    ];
    const selectedCustomerName = selectedCustomer?.name ?? 'زبون نقدي';

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <>
            <AppShell pageTitle={isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة بيع جديدة'}>
                {/* Desktop Layout - كما هو */}
                <div className="hidden lg:flex flex-row gap-0 -m-4 lg:-m-10 h-[calc(100dvh-155px)] overflow-hidden">

                    {/* ══ LEFT PANEL ══ */}
                    <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">

                        {/* Top bar */}
                        <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <Link href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'} className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-xs sm:text-sm shrink-0">
                                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">{isEditMode ? 'عرض الفاتورة' : 'فواتير البيع'}</span>
                                    <span className="sm:hidden">رجوع</span>
                                </Link>
                                <span className="text-slate-300 dark:text-white/10 hidden sm:inline">/</span>
                                <span className="font-black text-slate-800 dark:text-white text-xs sm:text-sm truncate">{isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة جديدة'}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Hold invoices touchscreen square button */}
                                {!isEditMode && (
                                    <button
                                        onClick={() => setShowHoldList(!showHoldList)}
                                        className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-[18px] sm:rounded-[24px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-600/35 border-2 border-amber-500/50 hover:border-amber-500/80 text-amber-800 dark:text-amber-200 font-black flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all shadow-md hover:shadow-xl active:scale-95 shrink-0 cursor-pointer"
                                        title="الفواتير المعلقة"
                                    >
                                        <Clock className="w-6 h-6 sm:w-9 sm:h-9 text-amber-600 dark:text-amber-300" />
                                        <span className="text-[10px] sm:text-xs font-black leading-none">معلقة</span>
                                        {holdInvoices.length > 0 && (
                                            <span className="absolute -top-2 -right-2 min-w-[24px] sm:min-w-[30px] h-[24px] sm:h-[30px] px-1 rounded-full bg-amber-500 text-white font-black text-xs sm:text-base flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg animate-pulse">
                                                {holdInvoices.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {flash?.error && <span className="text-[10px] sm:text-xs font-bold text-red-500 max-w-[100px] sm:max-w-none truncate">{flash.error}</span>}
                            </div>
                        </div>


                        {/* Add product form */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4 border-b border-black/5 dark:border-white/5">
                            <div className="flex flex-col gap-2.5 sm:gap-3">
                                {/* Row 1: product + sale type + qty + preview */}
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 items-stretch sm:items-end">
                                    <div className="flex items-center gap-2 flex-1 min-w-full sm:min-w-[180px]">
                                        <div className="flex-1 min-w-0">
                                            <ModernSelect key={`p-${resetKey}`} label="" placeholder="اختر المنتج..."
                                                options={products.map(p => ({ label: p.name, badge: p.category.name, price: getProductDisplayPrice(p, isVip), meta: `المخزون: ${p.stock}`, searchKey: p.qrcode ?? undefined }))}
                                                defaultValue={selectedProduct?.name ?? ""}
                                                onSelect={val => {
                                                    const p = products.find(p => p.name === val);
                                                    setSelProduct(p ? String(p.id) : '');
                                                    setSelSaleType(''); setSelSize(''); setSelQty('1');
                                                }}
                                            />
                                        </div>
                                        {selectedProduct && (
                                            <button onClick={() => {
                                                setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1'); setSelUnitPrice(''); setSelMinPrice(0); setResetKey(k => k + 1);
                                            }}
                                            title="إلغاء الاختيار وتفريغ الحقول"
                                            className="h-16 sm:h-20 w-16 sm:w-20 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border-2 border-red-500/30 text-red-500 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm">
                                                <X className="w-6 h-6 stroke-[2.5]" />
                                            </button>
                                        )}
                                    </div>

                                    {/* sale type toggle for non-tier with multiple options */}
                                    {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
                                        <button onClick={() => setShowSaleTypeModal(true)}
                                            className="spatial-input h-16 sm:h-20 rounded-[22px] px-4 sm:px-5 text-base sm:text-lg font-black w-full sm:w-48 cursor-pointer hover:border-primary/40 border-2 transition-all flex items-center justify-between shadow-sm">
                                            <span className="truncate">{saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}</span>
                                            <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* qty / count input */}
                                    {selectedProduct && (isTier || selSaleType) && (
                                        <button onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v), maxCount)}
                                            className="spatial-input h-16 sm:h-20 rounded-[22px] px-4 sm:px-6 text-xl sm:text-[24px] font-black w-full sm:w-32 text-center cursor-pointer hover:border-primary/40 border-2 transition-all active:scale-95 shadow-sm">
                                            {selQty || '1'}
                                        </button>
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
                                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3.5 sm:p-4 rounded-[22px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md">
                                        <div className="flex flex-1 items-center justify-between gap-3">
                                            <div className="flex flex-col gap-1 shrink-0">
                                                <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                                    سعر الوحدة
                                                </span>
                                                {selMinPrice > 0 && (
                                                    <div className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-500/30">
                                                        <span className="text-xs font-bold text-amber-800/80 dark:text-amber-200/80">حد أدنى:</span>
                                                        <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-300 tracking-tight">
                                                            {selMinPrice.toFixed(2)}
                                                        </span>
                                                        <span className="text-xs font-bold">د.ل</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => openPad(
                                                    `سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`,
                                                    selUnitPrice,
                                                    v => setSelUnitPrice(v),
                                                )}
                                                className={`h-16 sm:h-20 rounded-[20px] px-5 sm:px-6 text-xl sm:text-[24px] font-black flex-1 text-center cursor-pointer transition-all border-2 spatial-input active:scale-95 shadow-sm ${selUnitPrice && +selUnitPrice < selMinPrice
                                                    ? 'border-red-500/60 text-red-500 bg-red-500/5'
                                                    : 'hover:border-primary/40'
                                                    }`}>
                                                {selUnitPrice || '0.00'}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {selectedProduct && (
                                                <button onClick={() => {
                                                    setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1'); setSelUnitPrice(''); setSelMinPrice(0); setResetKey(k => k + 1);
                                                }}
                                                title="إلغاء الاختيار وتفريغ الحقول"
                                                className="h-16 sm:h-20 px-4 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border-2 border-red-500/30 text-red-500 font-black text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer shadow-sm">
                                                    <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                                                    <span>إلغاء</span>
                                                </button>
                                            )}
                                            <button onClick={addToCart} disabled={!canAdd || (!!selUnitPrice && +selUnitPrice < selMinPrice)}
                                                className="spatial-button flex-1 sm:flex-initial min-w-[140px] flex items-center justify-center gap-2.5 sm:gap-3 px-8 sm:px-12 h-16 sm:h-20 rounded-[22px] text-xl sm:text-[22px] font-black disabled:opacity-40 shrink-0 active:scale-95 hover:scale-[1.02] transition-transform shadow-lg">
                                                <Plus className="w-6 h-6 sm:w-7 sm:h-7" /> إضافة
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Row 4: Dedicated Item Total preview row */}
                                {previewTotal !== null && previewQty !== null && previewQty > 0 && (
                                    <div className="flex items-center justify-between px-5 py-3 sm:py-3.5 rounded-[22px] bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 backdrop-blur-md shadow-sm">
                                        <span className="text-sm sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                            الإجمالي
                                        </span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                                                {fmt(previewTotal)}
                                            </span>
                                            <span className="text-xs sm:text-sm font-black text-primary">د.ل</span>
                                        </div>
                                    </div>
                                )}

                                {/* Stock warning */}
                                {selectedProduct && maxCount !== undefined && maxCount === 0 && (
                                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[12px] bg-red-500/10 border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                                            المخزون غير كافٍ — المتاح: {availableStock} {selectedProduct.category.unit}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Submit Action Bar */}
                        <div className="px-3 sm:px-5 pt-2.5 sm:pt-3 pb-2 sm:pb-2.5 border-t border-black/5 dark:border-white/5 shrink-0 flex items-stretch gap-2 sm:gap-3">
                            <div className="flex flex-col gap-2 shrink-0">
                                <Link href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'} className="h-16 sm:h-20 w-36 sm:w-48 flex items-center justify-center gap-2.5 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-black text-base sm:text-lg transition-all border border-black/10 dark:border-white/20 shrink-0 shadow-sm active:scale-95">
                                    <X className="w-6 h-6" /> إلغاء
                                </Link>
                                {!isEditMode && (
                                    <button onClick={clearForm} disabled={cart.length === 0} className="h-16 sm:h-20 w-36 sm:w-48 flex items-center justify-center gap-2.5 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-black text-base sm:text-lg transition-all shrink-0 shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none">
                                        <Trash2 className="w-6 h-6" /> مسح
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setShowPaymentDrawer(true)}
                                disabled={cart.length === 0}
                                className="spatial-button flex-1 flex items-center justify-between px-6 sm:px-10 rounded-[28px] text-xl sm:text-[24px] font-black shadow-2xl disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all">
                                <div className="flex items-center gap-3.5">
                                    <Wallet className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <span>{isEditMode ? 'تأكيد الفاتورة والسداد' : 'تأكيد الفاتورة والانتقال للدفع'}</span>
                                </div>
                                <div className="flex items-center gap-3.5">
                                    <span className="text-xs sm:text-sm font-black bg-white/20 dark:bg-black/20 px-3.5 py-2 rounded-full">{cart.length} أصناف</span>
                                    <span className="text-2xl sm:text-3xl font-black">{grandTotal.toFixed(2)} د.ل</span>
                                    <ChevronUp className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* ══ RIGHT PANEL ══ */}
                    <div className="w-full lg:w-[600px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">

                        {/* Customer bar */}
                        <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
                                <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                                    <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <ModernSelect key={`customer-${resetKey}`} label="" options={customerOptions}
                                            defaultValue={customerId ? customers.find(c => c.id === +customerId)?.name ?? 'زبون نقدي' : 'زبون نقدي'} placeholder="اختر العميل"
                                            onSelect={val => {
                                                const c = customers.find(c => c.name === val);
                                                setCustomerId(c && c.id !== 1 ? String(c.id) : '');
                                            }}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Debt warning */}
                            {customerId && originalDebt > 0 && (
                                <div className="mx-3 sm:mx-5 mb-2.5 sm:mb-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-[12px] sm:rounded-[14px] bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">الدين السابق: {originalDebt.toFixed(2)}</span>
                                    </div>
                                    <button onClick={() => {
                                        const m = paymentMethods[0];
                                        if (!m) return;
                                        setDebtPayment({ payment_method_id: String(m.id), method_name: m.name, amount: originalDebt.toFixed(2) });
                                    }} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 h-9 sm:h-8 rounded-[10px] bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white font-bold text-xs transition-all shrink-0 active:scale-95">
                                        <CreditCard className="w-3.5 h-3.5" /> سداد الدين
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Panel header */}
                        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                <span className="font-black text-slate-800 dark:text-white text-xs sm:text-sm">
                                    عناصر الفاتورة
                                    {cart.length > 0 && <span className="mr-1.5 sm:mr-2 text-[10px] sm:text-xs font-black text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-full">{cart.length}</span>}
                                </span>
                            </div>
                        </div>

                        {/* Cart items */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2.5 sm:py-3">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                                    <Package className="w-10 h-10 sm:w-12 sm:h-12" />
                                    <span className="font-bold text-xs sm:text-sm">لا توجد منتجات</span>
                                    <span className="text-[10px] sm:text-xs">أضف منتجاً من اليسار</span>
                                </div>
                            ) : (() => {
                                // group identical items
                                const groups = cart.reduce((acc, item, idx) => {
                                    const key = `${item.product_id}-${item.size_id}-${item.sale_type}-${item.unit_price}`;
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
                                        {/* Desktop table header */}
                                        <div className="hidden lg:grid grid-cols-[70px_2fr_80px_90px_100px_76px] gap-2.5 px-4 py-2.5 text-xs font-black text-slate-500 dark:text-white/40 bg-slate-100/70 dark:bg-slate-800/70 rounded-[14px] border border-black/5 dark:border-white/10">
                                            <span className="text-center">عدد</span>
                                            <span>المنتج</span>
                                            <span className="text-center">حجم</span>
                                            <span className="text-center">سعر</span>
                                            <span className="text-center">الإجمالي</span>
                                            <span className="text-center">حذف</span>
                                        </div>
                                        {Object.values(groups).map((g: any, idx) => {
                                            // احسب عدد الوحدات من الكمية الإجمالية
                                            const singleQty = g.sale_type !== 'unit_based'
                                                ? resolveQuantity(products.find(p => p.id === g.product_id)!, g.sale_type, g.size_id || '', '1', sizes)
                                                : 1;
                                            const displayCount = g.sale_type === 'unit_based' ? g.totalQty : (singleQty > 0 ? Math.round(g.totalQty / singleQty) : g.count);
                                            return (
                                                <div key={idx}>
                                                    {/* Desktop view - Grid */}
                                                    <div className="hidden lg:grid grid-cols-[70px_2fr_80px_90px_100px_76px] gap-2.5 px-4 py-3.5 rounded-[20px] bg-white dark:bg-slate-800 border-2 border-black/5 dark:border-white/10 hover:border-primary/40 transition-all shadow-sm items-center">
                                                        {/* count — clickable to edit */}
                                                        <div className="flex items-center justify-center">
                                                            <button onClick={() => {
                                                                const p = products.find(p => p.id === g.product_id);
                                                                const consumed = cart.filter((_, i) => !g.indices.includes(i)).filter(i => i.product_id === g.product_id).reduce((s, i) => s + +i.quantity, 0);
                                                                const stockLeft = p ? +p.stock - consumed : 0;
                                                                const cartMax = g.sale_type === 'unit_based' ? stockLeft : (singleQty > 0 ? Math.floor(stockLeft / singleQty) : 0);
                                                                openPad(g.sale_type === 'unit_based' ? 'الكمية' : 'العدد', String(displayCount), newVal => {
                                                                    const newCount = parseInt(newVal) || 1;
                                                                    const product = products.find(p => p.id === g.product_id);
                                                                    if (!product) return;
                                                                    setCart(prev => {
                                                                        const without = prev.filter((_, i) => !g.indices.includes(i));
                                                                        const price = g.unit_price;
                                                                        if (g.sale_type === 'unit_based') {
                                                                            const newCart = [...without, { ...prev[g.indices[0]], quantity: String(newCount), line_total: resolveLineTotal('unit_based', price, newCount) }];
                                                                            const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                                            if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]), 0);
                                                                            return newCart;
                                                                        }
                                                                        // سطر واحد بالكمية المجمّعة الجديدة
                                                                        const qty = resolveQuantity(product, g.sale_type, g.size_id, '1', sizes);
                                                                        const singleLT = resolveLineTotal(g.sale_type, price, qty);
                                                                        const newCart = [...without, { ...prev[g.indices[0]], quantity: String(qty * newCount), line_total: singleLT * newCount }];
                                                                        const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                                        if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]), 0);
                                                                        return newCart;
                                                                    });
                                                                }, cartMax);
                                                            }} className="w-16 h-14 rounded-[14px] bg-black/5 dark:bg-white/10 border-2 border-black/10 dark:border-white/20 hover:border-primary/50 font-black text-lg text-slate-800 dark:text-white transition-all cursor-pointer active:scale-95 shadow-xs flex items-center justify-center">
                                                                {displayCount}
                                                            </button>
                                                        </div>
                                                        <div className="min-w-0 flex flex-col justify-center gap-0.5">
                                                            <span className="font-black text-slate-900 dark:text-white text-base truncate">{g.product_name}</span>
                                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{saleTypeLabels[g.sale_type] ?? g.sale_type}</span>
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            {g.size_label ? (
                                                                <span className="text-xs font-black text-white bg-primary px-3 py-1.5 rounded-full shadow-xs">{g.size_label}</span>
                                                            ) : g.sale_type === 'full_bottle' ? (
                                                                <span className="text-xs font-black text-white bg-emerald-500 px-3 py-1.5 rounded-full shadow-xs">
                                                                    {products.find(p => p.id === g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                                                </span>
                                                            ) : <span className="text-slate-400 text-sm font-bold">—</span>}
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-base">{g.unit_price}</span>
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            <span className="font-black text-primary dark:text-primary-light text-lg">{g.totalAmount.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-center">
                                                            <button onClick={() => removeGroup(g.indices)}
                                                                title="حذف العنصر"
                                                                className="w-16 h-16 rounded-[20px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/25 cursor-pointer shrink-0">
                                                                <Trash2 className="w-8 h-8 stroke-[2.5]" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Mobile view - Card */}
                                                    <div className="lg:hidden flex flex-col gap-2.5 p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-black/5 dark:border-white/10 shadow-sm">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-black text-slate-900 dark:text-white text-base truncate">{g.product_name}</h3>
                                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{saleTypeLabels[g.sale_type] ?? g.sale_type}</p>
                                                            </div>
                                                            <button onClick={() => removeGroup(g.indices)}
                                                                title="حذف العنصر"
                                                                className="w-14 h-14 rounded-[16px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-lg shadow-red-500/25 cursor-pointer">
                                                                <Trash2 className="w-7 h-7 stroke-[2.5]" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {/* Count */}
                                                            <button onClick={() => {
                                                                const p = products.find(p => p.id === g.product_id);
                                                                const consumed = cart.filter((_, i) => !g.indices.includes(i)).filter(i => i.product_id === g.product_id).reduce((s, i) => s + +i.quantity, 0);
                                                                const stockLeft = p ? +p.stock - consumed : 0;
                                                                const cartMax = g.sale_type === 'unit_based' ? stockLeft : (singleQty > 0 ? Math.floor(stockLeft / singleQty) : 0);
                                                                openPad(g.sale_type === 'unit_based' ? 'الكمية' : 'العدد', String(displayCount), newVal => {
                                                                    const newCount = parseInt(newVal) || 1;
                                                                    const product = products.find(p => p.id === g.product_id);
                                                                    if (!product) return;
                                                                    setCart(prev => {
                                                                        const without = prev.filter((_, i) => !g.indices.includes(i));
                                                                        const price = g.unit_price;
                                                                        if (g.sale_type === 'unit_based') {
                                                                            const newCart = [...without, { ...prev[g.indices[0]], quantity: String(newCount), line_total: resolveLineTotal('unit_based', price, newCount) }];
                                                                            const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                                            if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]), 0);
                                                                            return newCart;
                                                                        }
                                                                        const qty = resolveQuantity(product, g.sale_type, g.size_id, '1', sizes);
                                                                        const singleLT = resolveLineTotal(g.sale_type, price, qty);
                                                                        const newCart = [...without, { ...prev[g.indices[0]], quantity: String(qty * newCount), line_total: singleLT * newCount }];
                                                                        const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                                        if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]), 0);
                                                                        return newCart;
                                                                    });
                                                                }, cartMax);
                                                            }} className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-primary/50 transition-all active:scale-95">
                                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">عدد:</span>
                                                                <span className="font-black text-sm text-slate-800 dark:text-white">{displayCount}</span>
                                                            </button>

                                                            {/* Size */}
                                                            {g.size_label ? (
                                                                <span className="text-[10px] font-black text-white bg-primary px-2 py-1 rounded-full">{g.size_label}</span>
                                                            ) : g.sale_type === 'full_bottle' ? (
                                                                <span className="text-[10px] font-black text-white bg-emerald-500 px-2 py-1 rounded-full">
                                                                    {products.find(p => p.id === g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                                                </span>
                                                            ) : null}

                                                            {/* Price */}
                                                            <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700">
                                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">سعر:</span>
                                                                <span className="font-bold text-sm text-slate-800 dark:text-white">{g.unit_price}</span>
                                                            </div>

                                                            {/* Total */}
                                                            <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-primary/10 border border-primary/20">
                                                                <span className="text-[10px] font-bold text-primary">إجمالي:</span>
                                                                <span className="font-black text-sm text-primary">{g.totalAmount.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Notes section */}
                        <div className="px-3 sm:px-4 pb-1.5 sm:pb-2 border-t border-black/5 dark:border-white/5 shrink-0 pt-2 sm:pt-2.5">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                {!isEditMode && cart.length > 0 && (
                                    <button onClick={holdCurrentInvoice}
                                        className="flex-1 sm:flex-none sm:w-60 flex flex-col items-center justify-center gap-2 rounded-[18px] sm:rounded-[22px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-600/35 border-2 border-amber-500/50 hover:border-amber-500/80 text-amber-800 dark:text-amber-200 font-black text-base sm:text-xl transition-all duration-200 shrink-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.03] active:scale-[0.97] hover:-translate-y-0.5 min-h-[120px] sm:min-h-[144px] px-5">
                                        <div className="flex items-center gap-2.5">
                                            <Pause className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-300" />
                                            <span className="text-lg sm:text-xl font-black">تعليق الفاتورة</span>
                                        </div>
                                        <span className="text-xs sm:text-sm opacity-85 font-bold">حفظ مؤقت واسترجاع لاحقاً</span>
                                    </button>
                                )}
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    rows={2} placeholder="ملاحظات على فاتورة البيع... (اختياري)"
                                    className="flex-1 spatial-input rounded-[16px] sm:rounded-[20px] px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold resize-none min-h-[100px] sm:min-h-[144px]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout with Tabs */}
                <div className="lg:hidden flex flex-col -m-4 h-[calc(100vh-80px)] overflow-hidden">

                    {/* Top Bar - Customer Selection */}
                    <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
                            <Link href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'} className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-xs">
                                <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                            </Link>
                            <span className="font-black text-slate-800 dark:text-white text-xs">{isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة جديدة'}</span>
                            <div className="flex items-center gap-1.5">
                                {!isEditMode && (
                                    <button onClick={() => setShowHoldList(!showHoldList)}
                                        className="relative w-14 h-14 rounded-[18px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 border-2 border-amber-500/50 text-amber-800 dark:text-amber-200 font-black flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
                                        title="الفواتير المعلقة">
                                        <Clock className="w-6 h-6 text-amber-600 dark:text-amber-300" />
                                        <span className="text-[10px] font-black leading-none">معلقة</span>
                                        {holdInvoices.length > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-pulse">
                                                {holdInvoices.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <ModernSelect key={`customer-mobile-${resetKey}`} label="" options={customerOptions}
                                    defaultValue={customerId ? customers.find(c => c.id === +customerId)?.name ?? 'زبون نقدي' : 'زبون نقدي'} placeholder="اختر العميل"
                                    onSelect={val => {
                                        const c = customers.find(c => c.name === val);
                                        setCustomerId(c && c.id !== 1 ? String(c.id) : '');
                                    }}
                                />
                            </div>

                        </div>

                        {customerId && originalDebt > 0 && (
                            <div className="mx-3 mb-2 px-3 py-2 rounded-[12px] bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400 truncate">دين: {originalDebt.toFixed(2)}</span>
                                </div>
                                <button onClick={() => {
                                    const m = paymentMethods[0];
                                    if (!m) return;
                                    setDebtPayment({ payment_method_id: String(m.id), method_name: m.name, amount: originalDebt.toFixed(2) });
                                    setActiveTab('payment');
                                }} className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white font-bold text-[10px] transition-all shrink-0 whitespace-nowrap">
                                    <CreditCard className="w-3 h-3" /> سداد
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex border-b border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 shrink-0">
                        <button onClick={() => setActiveTab('products')}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${activeTab === 'products'
                                ? 'text-primary'
                                : 'text-slate-400 dark:text-white/40'
                                }`}>
                            <Package className="w-4 h-4" />
                            <span>المنتجات</span>
                            {cart.length > 0 && (
                                <span className="absolute top-2 left-1/2 -translate-x-1/2 translate-x-6 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                                    {cart.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)}
                                </span>
                            )}
                            {activeTab === 'products' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                        </button>
                        <button onClick={() => setActiveTab('payment')}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${activeTab === 'payment'
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
                            className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${activeTab === 'confirm'
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
                    <div className="flex-1 overflow-y-auto">
                        {/* Products Tab */}
                        {activeTab === 'products' && (
                            <div className="flex flex-col">
                                {/* Add Product Form */}
                                <div className="px-3 py-3 border-b border-black/5 dark:border-white/5">
                                    <div className="flex flex-col gap-2.5">
                                        {/* Product Selection */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest block">المنتج</label>
                                                {selectedProduct && (
                                                    <button onClick={() => {
                                                        setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1'); setSelUnitPrice(''); setSelMinPrice(0); setResetKey(k => k + 1);
                                                    }} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
                                                        <X className="w-3.5 h-3.5" /> إلغاء الاختيار
                                                    </button>
                                                )}
                                            </div>
                                            <ModernSelect key={`p-mobile-${resetKey}`} label="" placeholder="اختر المنتج..."
                                                options={products.map(p => ({ label: p.name, badge: p.category.name, price: getProductDisplayPrice(p, isVip), meta: `المخزون: ${p.stock}`, searchKey: p.qrcode ?? undefined }))}
                                                defaultValue={selectedProduct?.name ?? ""}
                                                onSelect={val => {
                                                    const p = products.find(p => p.name === val);
                                                    setSelProduct(p ? String(p.id) : '');
                                                    setSelSaleType(''); setSelSize(''); setSelQty('1');
                                                }}
                                            />
                                        </div>

                                        {/* Sale Type */}
                                        {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">نوع البيع</label>
                                                <button onClick={() => setShowSaleTypeModal(true)}
                                                    className="spatial-input h-12 rounded-[14px] px-3 text-sm font-bold w-full cursor-pointer hover:border-primary/40 transition-all flex items-center justify-between">
                                                    <span className="truncate">{saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}</span>
                                                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}

                                        {/* Sizes */}
                                        {needsSize && (
                                            <div>
                                                <SizeSelect sizes={sizes} selectedSizeId={selSize}
                                                    onSizeSelect={id => { setSelSize(id); setSelUnitPrice(''); }}
                                                    onPriceResolved={(def, min) => { setSelUnitPrice(def.toFixed(2)); setSelMinPrice(min); }}
                                                    product={selectedProduct} isVip={isVip} />
                                            </div>
                                        )}

                                        {/* Unit Price */}
                                        {showPriceField && (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex flex-col gap-0.5 shrink-0">
                                                        <span className="text-xs font-black text-slate-700 dark:text-white/90">
                                                            سعر الوحدة
                                                        </span>
                                                        {selMinPrice > 0 && (
                                                            <div className="inline-flex items-baseline gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-500/30">
                                                                <span className="text-[10px] font-bold text-amber-800/80 dark:text-amber-200/80">حد أدنى:</span>
                                                                <span className="text-sm font-black text-amber-600 dark:text-amber-300 tracking-tight">
                                                                    {selMinPrice.toFixed(2)}
                                                                </span>
                                                                <span className="text-[10px] font-bold">د.ل</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => openPad(`سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`, selUnitPrice, v => setSelUnitPrice(v))}
                                                        className={`h-12 rounded-[14px] px-4 text-base font-black flex-1 text-center cursor-pointer transition-all spatial-input active:scale-95 ${selUnitPrice && +selUnitPrice < selMinPrice ? 'border-red-500/60 text-red-500' : 'hover:border-primary/40'
                                                            }`}>
                                                        {selUnitPrice || '0.00'}
                                                    </button>
                                                </div>
                                                {selUnitPrice && +selUnitPrice < selMinPrice && (
                                                    <span className="text-[10px] font-bold text-red-500 block">أقل من الحد الأدنى</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Quantity & Price Preview */}
                                        {selectedProduct && (isTier || selSaleType) && (
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">{needsQty ? 'الكمية' : 'العدد'}</label>
                                                    <button onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v), maxCount)}
                                                        className="spatial-input h-12 rounded-[14px] px-3 text-base font-black w-full text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95">
                                                        {selQty || '1'}
                                                    </button>
                                                </div>
                                                {previewTotal !== null && previewQty !== null && previewQty > 0 && (
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">الإجمالي</label>
                                                        <div className="h-12 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                            <span className="font-black text-primary text-lg">{fmt(previewTotal)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}



                                        {/* Stock Warning */}
                                        {selectedProduct && maxCount !== undefined && maxCount === 0 && (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-red-500/10 border border-red-500/20">
                                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                                    المخزون غير كافٍ — المتاح: {availableStock} {selectedProduct.category.unit}
                                                </span>
                                            </div>
                                        )}

                                        {/* Add Button */}
                                        <button onClick={() => { addToCart(); if (cart.length === 0) setActiveTab('payment'); }}
                                            disabled={!canAdd || (!!selUnitPrice && +selUnitPrice < selMinPrice)}
                                            className="spatial-button w-full flex items-center justify-center gap-2 px-6 h-14 text-lg font-black disabled:opacity-40 active:scale-95 transition-transform mt-2">
                                            <Plus className="w-5 h-5" /> إضافة للسلة
                                        </button>
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
                                    ) : (() => {
                                        const groups = cart.reduce((acc, item, idx) => {
                                            const key = `${item.product_id}-${item.size_id}-${item.sale_type}-${item.unit_price}`;
                                            if (!acc[key]) {
                                                acc[key] = { ...item, count: 1, totalQty: +item.quantity, totalAmount: item.line_total, indices: [idx] };
                                            } else {
                                                acc[key].count++; acc[key].totalQty += +item.quantity; acc[key].totalAmount += item.line_total; acc[key].indices.push(idx);
                                            }
                                            return acc;
                                        }, {} as Record<string, any>);

                                        return (
                                            <div className="flex flex-col gap-2">
                                                {Object.values(groups).map((g: any, idx) => {
                                                    const mSingleQty = g.sale_type !== 'unit_based'
                                                        ? resolveQuantity(products.find(p => p.id === g.product_id)!, g.sale_type, g.size_id || '', '1', sizes)
                                                        : 1;
                                                    const displayCount = g.sale_type === 'unit_based' ? g.totalQty : (mSingleQty > 0 ? Math.round(g.totalQty / mSingleQty) : g.count);
                                                    return (
                                                        <div key={idx} className="flex flex-col gap-2.5 p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-black/5 dark:border-white/10 shadow-sm">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="font-black text-slate-900 dark:text-white text-base truncate">{g.product_name}</h3>
                                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{saleTypeLabels[g.sale_type] ?? g.sale_type}</p>
                                                                </div>
                                                                <button onClick={() => removeGroup(g.indices)}
                                                                    title="حذف العنصر"
                                                                    className="w-14 h-14 rounded-[16px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-lg shadow-red-500/25 cursor-pointer">
                                                                    <Trash2 className="w-7 h-7 stroke-[2.5]" />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <button onClick={() => {
                                                                    const p = products.find(p => p.id === g.product_id);
                                                                    const consumed = cart.filter((_, i) => !g.indices.includes(i)).filter(i => i.product_id === g.product_id).reduce((s, i) => s + +i.quantity, 0);
                                                                    const stockLeft = p ? +p.stock - consumed : 0;
                                                                    const cartMax = g.sale_type === 'unit_based' ? stockLeft : (mSingleQty > 0 ? Math.floor(stockLeft / mSingleQty) : 0);
                                                                    openPad(g.sale_type === 'unit_based' ? 'الكمية' : 'العدد', String(displayCount), newVal => {
                                                                        const newCount = parseInt(newVal) || 1;
                                                                        const product = products.find(p => p.id === g.product_id);
                                                                        if (!product) return;
                                                                        setCart(prev => {
                                                                            const without = prev.filter((_, i) => !g.indices.includes(i));
                                                                            const price = g.unit_price;
                                                                            if (g.sale_type === 'unit_based') {
                                                                                const newCart = [...without, { ...prev[g.indices[0]], quantity: String(newCount), line_total: resolveLineTotal('unit_based', price, newCount) }];
                                                                                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                                                if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]), 0);
                                                                                return newCart;
                                                                            }
                                                                            const qty = resolveQuantity(product, g.sale_type, g.size_id, '1', sizes);
                                                                            const singleLT = resolveLineTotal(g.sale_type, price, qty);
                                                                            const newCart = [...without, { ...prev[g.indices[0]], quantity: String(qty * newCount), line_total: singleLT * newCount }];
                                                                            const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                                            if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prev => [{ ...prev[0], amount: newTotal.toFixed(2) }]), 0);
                                                                            return newCart;
                                                                        });
                                                                    }, cartMax);
                                                                }} className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-primary/50 transition-all active:scale-95">
                                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">عدد:</span>
                                                                    <span className="font-black text-sm text-slate-800 dark:text-white">{displayCount}</span>
                                                                </button>
                                                                {g.size_label ? (
                                                                    <span className="text-[10px] font-black text-white bg-primary px-2 py-1 rounded-full">{g.size_label}</span>
                                                                ) : g.sale_type === 'full_bottle' ? (
                                                                    <span className="text-[10px] font-black text-white bg-emerald-500 px-2 py-1 rounded-full">
                                                                        {products.find(p => p.id === g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                                                    </span>
                                                                ) : null}
                                                                <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700">
                                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">سعر:</span>
                                                                    <span className="font-bold text-sm text-slate-800 dark:text-white">{g.unit_price}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-primary/10 border border-primary/20">
                                                                    <span className="text-[10px] font-bold text-primary">إجمالي:</span>
                                                                    <span className="font-black text-sm text-primary">{g.totalAmount.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Payment Tab */}
                        {activeTab === 'payment' && (
                            <div className="flex flex-col">
                                {/* Totals Summary */}
                                <div className="px-3 py-3 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                    <div className="flex flex-col gap-2 p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                                            <span className="text-xs font-bold text-slate-500 dark:text-white/40">الفاتورة</span>
                                            <span className="text-lg font-black text-slate-800 dark:text-white">{total.toFixed(2)}</span>
                                        </div>
                                        {debtPayment && (
                                            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                                                <span className="text-xs font-bold text-red-500">الدين السابق</span>
                                                <span className="text-lg font-black text-red-600 dark:text-red-400">{originalDebt.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-600 dark:text-white/60">الإجمالي</span>
                                            <span className="text-2xl font-black text-primary">{grandTotal.toFixed(2)}</span>
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
                                <div className="px-3 py-3">
                                    <div className="flex flex-col gap-3">
                                        {/* Add Payment Section */}
                                        {cart.length > 0 && (
                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة دفعة</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {paymentMethods.map(m => (
                                                        <button key={m.id}
                                                            onClick={() => handleSelectPaymentMethod(String(m.id))}
                                                            className={`h-16 rounded-[14px] font-bold text-sm transition-all border-2 ${selMethod === String(m.id)
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-primary/40 active:scale-95'
                                                                }`}>
                                                            {m.name}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openPad('المبلغ', selAmount || (remaining > 0 ? remaining.toFixed(2) : ''), v => setSelAmount(v), remaining > 0 ? remaining : undefined)}
                                                        className="spatial-input flex-1 h-16 rounded-[14px] px-3 text-base font-black text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95">
                                                        {selAmount || (remaining > 0 ? remaining.toFixed(2) : '0.00')}
                                                    </button>
                                                    <button onClick={addPayment} disabled={!selMethod || (selAmount ? +selAmount <= 0 : remaining <= 0)}
                                                        className="spatial-button flex items-center justify-center w-16 h-16 disabled:opacity-40 active:scale-95">
                                                        <Plus className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment List */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الدفعات</label>
                                            {debtPayment && (
                                                <div className="flex items-center gap-2 px-3 h-[72px] rounded-[14px] bg-red-500/10 border-2 border-red-500/20">
                                                    <button onClick={() => openPad('مبلغ سداد الدين', debtPayment.amount, v => {
                                                        setDebtPayment(prev => prev ? { ...prev, amount: v } : null);
                                                    }, originalDebt)}
                                                        className="w-10 h-10 rounded-[12px] bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95" title="تعديل القيمة">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-bold text-red-600 dark:text-red-400 text-[10px] truncate">سداد الدين — {debtPayment.method_name}</span>
                                                        <span className="font-black text-slate-800 dark:text-white text-base truncate">{debtPayment.amount}</span>
                                                    </div>
                                                    <button onClick={() => setDebtPayment(null)}
                                                        className="w-10 h-10 rounded-[12px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-95" title="حذف">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            {payments.length === 0 && !debtPayment ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-white/20">
                                                    <CreditCard className="w-12 h-12 mb-2" />
                                                    <span className="font-bold text-sm">لا توجد دفعات</span>
                                                    <span className="text-xs mt-1">أضف دفعة من الأعلى</span>
                                                </div>
                                            ) : (
                                                payments.map((p, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 px-3 h-[72px] rounded-[14px] bg-emerald-500/10 border-2 border-emerald-500/20">
                                                        <button onClick={() => openPad(`تعديل مبلغ (${p.method_name})`, p.amount, v => {
                                                            setPayments(prev => prev.map((pay, i) => i === idx ? { ...pay, amount: v } : pay));
                                                            setPaymentManuallySet(true);
                                                        })} className="w-10 h-10 rounded-[12px] bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95" title="تعديل القيمة">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] truncate">{p.method_name}</span>
                                                            <span className="font-black text-slate-800 dark:text-white text-base truncate">{p.amount}</span>
                                                        </div>
                                                        <button onClick={() => { setPayments(prev => prev.filter((_, i) => i !== idx)); setPaymentManuallySet(false); }}
                                                            className="w-10 h-10 rounded-[12px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-95" title="حذف">
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
                            <div className="flex flex-col">
                                {/* Summary */}
                                <div className="px-3 py-3">
                                    <div className="flex flex-col gap-3">
                                        {/* Customer Info */}
                                        <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">العميل</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-800 dark:text-white">{selectedCustomerName}</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${customerType === 'vip'
                                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                    {customerType === 'vip' ? '⭐ VIP' : 'عادي'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Cart Summary */}
                                        <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShoppingCart className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المنتجات</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-800 dark:text-white">{cart.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)} قطعة</span>
                                                <span className="text-lg font-black text-primary">{total.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Payment Summary */}
                                        <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CreditCard className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الدفع</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {debtPayment && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-red-600 dark:text-red-400 font-bold">سداد الدين</span>
                                                        <span className="font-black text-red-600 dark:text-red-400">{debtPayment.amount}</span>
                                                    </div>
                                                )}
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

                                        {/* Total Summary */}
                                        <div className="p-4 rounded-[14px] bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-slate-600 dark:text-white/60">الإجمالي</span>
                                                <span className="text-2xl font-black text-primary">{grandTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-600 dark:text-white/60">المتبقي</span>
                                                <span className={`text-xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}>{remaining.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">ملاحظات</label>
                                            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                                rows={3} placeholder="ملاحظات على الفاتورة... (اختياري)"
                                                className="w-full spatial-input rounded-[14px] px-3 py-2.5 text-xs font-bold resize-none" />
                                        </div>

                                        {/* Warnings */}
                                        {isCashCustomer && remaining > 0.01 && (
                                            <div className="px-3 py-2.5 rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                    ⚠️ زبون نقدي — يجب الدفع الكامل قبل التأكيد
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="px-3 py-3 border-t border-black/5 dark:border-white/5 bg-white dark:bg-slate-900">
                                    <div className="flex flex-col gap-2">
                                        {/* Main Action */}
                                        <button onClick={submit}
                                            disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                                            className="spatial-button w-full flex items-center justify-center gap-2 h-14 text-lg font-black disabled:opacity-40 active:scale-95 transition-transform">
                                            <Check className="w-5 h-5" />
                                            <span>{isEditMode ? `حفظ التعديلات — ${grandTotal.toFixed(2)}` : `تأكيد البيع — ${grandTotal.toFixed(2)}`}</span>
                                        </button>

                                        {/* Secondary Actions */}
                                        {!isEditMode && cart.length > 0 && (
                                            <button onClick={holdCurrentInvoice}
                                                className="w-full flex items-center justify-center gap-2.5 h-16 rounded-[16px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 hover:from-amber-500/35 border-2 border-amber-500/50 text-amber-800 dark:text-amber-200 font-black text-lg transition-all active:scale-95 shadow-md">
                                                <Pause className="w-6 h-6 text-amber-600 dark:text-amber-300" />
                                                <span>تعليق الفاتورة (حفظ مؤقت)</span>
                                            </button>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            {!isEditMode && cart.length > 0 && (
                                                <button onClick={clearForm}
                                                    className="flex flex-row items-center justify-center gap-1.5 h-12 rounded-[12px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-bold text-xs transition-all active:scale-95">
                                                    <Trash2 className="w-4 h-4" />
                                                    <span>مسح</span>
                                                </button>
                                            )}
                                            <Link href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'}
                                                className={`flex flex-row items-center justify-center gap-1.5 h-12 rounded-[12px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 font-bold text-xs transition-all ${(!isEditMode && cart.length > 0) ? '' : 'col-span-2'}`}>
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
                {/* Hold invoices Drawer (درج جانبي عالي الأولوية z-[9999] لشاشات اللمس) */}
                {showHoldList && (
                    <div className="fixed inset-0 z-[9999] overflow-hidden" onClick={() => setShowHoldList(false)}>
                        {/* Backdrop with Fade Transition */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in" />

                        {/* Drawer Panel with Slide Transition */}
                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[9999]">
                            <div className="w-screen max-w-md sm:max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-black/10 dark:border-white/10 flex flex-col h-full transform transition-all duration-300 ease-out animate-in slide-in-from-right"
                                onClick={e => e.stopPropagation()}>

                                {/* Drawer Header */}
                                <div className="p-4 sm:p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-amber-500/5 dark:bg-slate-800/80 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[18px] bg-gradient-to-br from-amber-500/20 via-amber-500/15 to-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-sm">
                                            <Clock className="w-7 h-7 sm:w-8 sm:h-8" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 dark:text-white text-xl sm:text-2xl">الفواتير المعلقة</span>
                                            <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">إجمالي الفواتير: {holdInvoices.length}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowHoldList(false)}
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-[18px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
                                        title="إغلاق">
                                        <X className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </button>
                                </div>

                                {/* Drawer Content */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                    {holdInvoices.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-white/30 text-center py-16">
                                            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Clock className="w-10 h-10 opacity-60" />
                                            </div>
                                            <span className="font-black text-lg sm:text-xl text-slate-700 dark:text-slate-200">لا توجد فواتير معلقة حالياً</span>
                                            <span className="text-xs sm:text-sm opacity-70 max-w-xs leading-relaxed font-bold">يمكنك تعليق أي فاتورة بيع بالضغط على زر "تعليق الفاتورة" الكبير لاسترجاعها في أي وقت</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {holdInvoices.map(hold => (
                                                <div key={hold.id} className="flex flex-col gap-4 p-5 rounded-[22px] bg-slate-50 dark:bg-white/3 border-2 border-black/5 dark:border-white/5 hover:border-amber-500/40 transition-all shadow-md">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl truncate">{hold.customerName}</span>
                                                                <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full whitespace-nowrap">{hold.cart.length} منتجات</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-white/40">{new Date(hold.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {hold.notes && <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-white/30 truncate">— {hold.notes}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className="text-xs text-slate-400 font-bold">الإجمالي</span>
                                                            <span className="font-black text-primary text-xl sm:text-2xl">{hold.total.toFixed(2)} <span className="text-xs">د.ل</span></span>
                                                        </div>
                                                    </div>

                                                    {/* Touch Action Buttons (أزرار برُمّتها مخصصة للمس الفائق) */}
                                                    <div className="flex items-center gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                                                        <button onClick={() => restoreHoldInvoice(hold)}
                                                            className="flex-1 flex items-center justify-center gap-3 h-14 sm:h-16 rounded-[18px] bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-base sm:text-lg transition-all active:scale-95 shadow-lg hover:shadow-xl">
                                                            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                                                            <span>استرجاع الفاتورة</span>
                                                        </button>
                                                        <button onClick={() => deleteHoldInvoice(hold.id)}
                                                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-red-500/15 hover:bg-red-500 text-red-500 hover:text-white border-2 border-red-500/30 flex items-center justify-center transition-all active:scale-95 shadow-sm shrink-0"
                                                            title="حذف الفاتورة">
                                                            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Drawer Footer */}
                                {holdInvoices.length > 0 && (
                                    <div className="p-4 sm:p-6 border-t border-black/5 dark:border-white/5 bg-slate-50 dark:bg-slate-800/80 shrink-0">
                                        <button onClick={() => setHoldInvoices([])}
                                            className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 rounded-[18px] bg-red-500/15 hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-500/30 font-black text-base sm:text-lg transition-all active:scale-95 shadow-sm">
                                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                            <span>حذف جميع الفواتير المعلقة</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
            <ConfirmModal
                isOpen={showCreditConfirm}
                title="إتمام العملية بالآجل"
                description={`يوجد مبلغ متبقي (${fmt(remaining)})، هل أنت متأكد من حفظ المعاملة بالآجل؟`}
                confirmText="تأكيد وحفظ"
                onConfirm={executeSubmit}
                onCancel={() => setShowCreditConfirm(false)}
            />

            {/* ══ PAYMENT DRAWER (BOTTOM SHEET) ══ */}
            {showPaymentDrawer && createPortal(
                <div className="fixed inset-0 z-[9990] flex flex-col justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div onClick={() => setShowPaymentDrawer(false)} className="absolute inset-0 cursor-pointer" />

                    <div className="relative z-10 w-full max-w-5xl mx-auto bg-white dark:bg-slate-900 border-t-2 border-black/10 dark:border-white/10 rounded-t-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[20px] bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
                                    <Wallet className="w-7 h-7" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-black text-slate-800 dark:text-white text-xl sm:text-2xl">إتمام عملية السداد والحساب</h3>
                                    <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-white/40">
                                        العميل: <span className="text-primary font-black">{selectedCustomerName}</span> ({isCashCustomer ? 'زبون نقدي' : (customerType === 'vip' ? 'زبون VIP' : 'زبون آجل')})
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowPaymentDrawer(false)} className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 dark:text-white/40 transition-all active:scale-95">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Totals Summary Strip */}
                        <div className="px-6 sm:px-8 py-4 bg-primary/5 border-b border-primary/10 grid grid-cols-2 sm:flex sm:items-center justify-between gap-3 text-center sm:text-right">
                            <div className="flex flex-col">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">إجمالي الفاتورة</span>
                                <span className="text-base sm:text-lg font-black text-slate-700 dark:text-white/80">{total.toFixed(2)} د.ل</span>
                            </div>
                            {debtPayment && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] sm:text-xs font-bold text-red-500 uppercase tracking-widest">الدين السابق</span>
                                    <span className="text-base sm:text-lg font-black text-red-600 dark:text-red-400">{originalDebt.toFixed(2)} د.ل</span>
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الإجمالي النهائى</span>
                                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{grandTotal.toFixed(2)} د.ل</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">المدفوع</span>
                                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{totalPaid.toFixed(2)} د.ل</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">المتبقي</span>
                                <span className={`text-lg sm:text-xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>{remaining.toFixed(2)} د.ل</span>
                            </div>
                        </div>

                        {/* Body Grid */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
                            {/* Left Col — Select Payment Method */}
                            <div className="flex flex-col gap-4 w-full lg:w-1/2">
                                <label className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">اختر طريقة الدفع والمبلغ</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {paymentMethods.map(m => (
                                        <button key={m.id}
                                            onClick={() => handleSelectPaymentMethod(String(m.id))}
                                            className={`h-16 sm:h-20 rounded-[20px] font-black text-base sm:text-lg transition-all border-2 flex items-center justify-center ${selMethod === String(m.id)
                                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/25'
                                                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-primary/40 active:scale-95'
                                                }`}>
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-1">
                                    <button
                                        onClick={() => openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining)}
                                        className="spatial-input flex-1 h-16 sm:h-20 rounded-[22px] px-5 text-xl sm:text-[24px] font-black text-center cursor-pointer hover:border-primary/40 border-2 transition-all active:scale-95 shadow-sm">
                                        {selAmount || remaining.toFixed(2)}
                                    </button>
                                    <button onClick={addPayment} disabled={!selMethod || !selAmount}
                                        className="spatial-button flex items-center justify-center gap-2 px-6 sm:px-8 h-16 sm:h-20 rounded-[22px] text-lg font-black disabled:opacity-40 shrink-0 active:scale-95 shadow-md">
                                        <Plus className="w-6 h-6" /> إضافة دفعة
                                    </button>
                                </div>
                            </div>

                            {/* Right Col — Payments Cards List */}
                            <div className="flex flex-col gap-3 w-full lg:w-1/2">
                                <label className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">الدفعات المسجلة في الفاتورة</label>
                                {debtPayment && (
                                    <div className="flex items-center gap-3 px-4 sm:px-5 h-22 sm:h-24 rounded-[22px] sm:rounded-[24px] bg-red-500/10 border-2 border-red-500/30 shadow-sm">
                                        <button onClick={() => openPad('مبلغ سداد الدين', debtPayment.amount, v => {
                                            setDebtPayment(prev => prev ? { ...prev, amount: v } : null);
                                        }, originalDebt)}
                                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm" title="تعديل القيمة">
                                            <Edit className="w-6 h-6 sm:w-7 sm:h-7" />
                                        </button>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-black text-red-600 dark:text-red-400 text-xs sm:text-sm truncate">سداد الدين — {debtPayment.method_name}</span>
                                            <span className="font-black text-slate-800 dark:text-white text-xl sm:text-[24px] truncate">{debtPayment.amount}</span>
                                        </div>
                                        <button onClick={() => setDebtPayment(null)}
                                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm" title="حذف">
                                            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
                                        </button>
                                    </div>
                                )}

                                {payments.length === 0 && !debtPayment ? (
                                    <div className="flex-1 flex items-center justify-center min-h-[120px] text-slate-400 dark:text-white/30 font-black text-base border-2 border-dashed border-black/10 dark:border-white/10 rounded-[24px]">
                                        لم يتم إضافة أي دفعات بعد
                                    </div>
                                ) : (
                                    payments.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-3 px-4 sm:px-5 h-22 sm:h-24 rounded-[22px] sm:rounded-[24px] bg-emerald-500/10 border-2 border-emerald-500/30 shadow-sm">
                                            <button onClick={() => openPad(`تعديل مبلغ (${p.method_name})`, p.amount, v => {
                                                setPayments(prev => prev.map((pay, i) => i === idx ? { ...pay, amount: v } : pay));
                                                setPaymentManuallySet(true);
                                            })} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm" title="تعديل القيمة">
                                                <Edit className="w-6 h-6 sm:w-7 sm:h-7" />
                                            </button>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm truncate">{p.method_name}</span>
                                                <span className="font-black text-slate-800 dark:text-white text-xl sm:text-[24px] truncate">{p.amount}</span>
                                            </div>
                                            <button onClick={() => { setPayments(prev => prev.filter((_, i) => i !== idx)); setPaymentManuallySet(false); }}
                                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm" title="حذف">
                                                <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Drawer Footer / Submit */}
                        <div className="px-6 sm:px-8 pt-5 pb-16 sm:pb-24 border-t border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 flex flex-col gap-3 shrink-0">
                            {isCashCustomer && remaining > 0.01 && (
                                <div className="px-4 py-3 rounded-[16px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm text-center">
                                    ⚠️ زبون نقدي — يجب الدفع الكامل واستيفاء المبلغ المتبقي ({remaining.toFixed(2)} د.ل) قبل التأكيد
                                </div>
                            )}

                            <button onClick={submit}
                                disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                                className="spatial-button h-24 sm:h-28 rounded-[28px] text-2xl sm:text-[26px] font-black w-full flex items-center justify-center gap-4 shadow-2xl active:scale-95 hover:scale-[1.01] transition-all disabled:opacity-40">
                                <Check className="w-8 h-8 sm:w-10 sm:h-10" />
                                {isEditMode ? 'حفظ التعديلات النهائية للفاتورة' : 'تأكيد البيع وطباعة الفاتورة'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
