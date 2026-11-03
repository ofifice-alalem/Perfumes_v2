import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, User, AlertCircle, Clock, Play, Pause, Edit,
    ChevronUp, Wallet, CheckCircle2, History, RefreshCw, Search, ChevronDown,
} from 'lucide-react';
import { ProductSelector } from './components/ProductSelector';
import { Cart } from './components/Cart';
import { PaymentDrawer } from './components/PaymentDrawer';
import { HoldInvoices } from './components/HoldInvoices';
import { RecentInvoicesDrawer, RecentInvoiceItem } from './components/RecentInvoicesDrawer';

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
    flash?: {
        success?: string;
        error?: string;
        created_invoice_id?: number;
        updated_stocks?: Record<string | number, string | number>;
    };
    editInvoice?: EditInvoice;
    recentInvoices?: RecentInvoiceItem[];
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

export default function InvoicesCreate({ customers, products, sizes, paymentMethods, flash, editInvoice, recentInvoices = [] }: Props) {
    const isEditMode = !!editInvoice;
    const activePaymentMethods = (paymentMethods || []).filter(m => (m as any).is_active === undefined || (m as any).is_active);

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
    const [productsList, setProductsList] = useState<Product[]>(products);
    const [productSelectorKey, setProductSelectorKey] = useState(0);

    // Sync products when initial props change
    useEffect(() => {
        setProductsList(products);
    }, [products]);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshProductsCatalog = async () => {
        setIsRefreshing(true);
        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content
                || (window as any).csrfToken || '';
            const res = await fetch('/invoices/refresh-catalog', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                setProductsList(data.products);
                setProductSelectorKey(k => k + 1);
                setToastMessage(`تم تحديث قائمة المنتجات والمخزون بنجاح (${data.products.length} منتج متوفر)`);
                setTimeout(() => setToastMessage(null), 4000);
            } else {
                router.reload({ only: ['products'] });
            }
        } catch (e) {
            console.error('Failed to refresh catalog:', e);
            router.reload({ only: ['products'] });
        } finally {
            setIsRefreshing(false);
        }
    };

    // Server-Authoritative Delta Stock Sync: Update only sold items when server responds with updated_stocks
    useEffect(() => {
        if (flash?.updated_stocks && typeof flash.updated_stocks === 'object') {
            const delta = flash.updated_stocks as Record<string, string | number>;
            const deltaKeys = Object.keys(delta);
            if (deltaKeys.length > 0) {
                setProductsList(prev => prev.map(p => {
                    const updatedVal = delta[p.id] ?? delta[String(p.id)];
                    if (updatedVal !== undefined) {
                        return { ...p, stock: String(updatedVal) };
                    }
                    return p;
                }));
                setProductSelectorKey(k => k + 1);
            }
        }
    }, [flash?.updated_stocks]);

    // Flash Toast Notifications
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [createdInvId, setCreatedInvId] = useState<number | null>(null);

    useEffect(() => {
        if (flash?.success) {
            setToastMessage(flash.success);
            setCreatedInvId(flash.created_invoice_id ?? null);
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success, flash?.created_invoice_id]);

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

    const [autoPrintNode, setAutoPrintNodeState] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('pos_auto_print_node');
            return saved !== 'false';
        } catch (e) {
            return true;
        }
    });

    const setAutoPrintNode = (val: boolean) => {
        setAutoPrintNodeState(val);
        try {
            localStorage.setItem('pos_auto_print_node', val ? 'true' : 'false');
        } catch (e) { }
    };

    const [reprintingToast, setReprintingToast] = useState(false);

    const triggerNodePrint = async (invId: number | string) => {
        if (!invId) return;
        setReprintingToast(true);

        try {
            const res = await fetch('/settings/node-printer/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ invoice_id: invId, multi: true }),
            });
            const resData = await res.json();
            if (!resData.success) {
                alert('تنبيه الطباعة: ' + (resData.message || 'تعذر إرسال الفاتورة إلى الطابعة'));
            }
        } catch (err) {
            console.error('Node print error:', err);
            alert('تعذر الاتصال بمحرك الطباعة الحرارية');
        } finally {
            setReprintingToast(false);
        }
    };



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
    const [showRecentDrawer, setShowRecentDrawer] = useState<boolean>(false);
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
            if (saved && activePaymentMethods.find(m => String(m.id) === saved)) {
                setDefaultPaymentMethodId(saved);
            } else if (activePaymentMethods.length > 0) {
                setDefaultPaymentMethodId(String(activePaymentMethods[0].id));
            }
        };

        loadDefaultPayment();
        window.addEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
        return () => window.removeEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
    }, [activePaymentMethods]);

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
                    const scanned = products.find(p => p.qrcode && (
                        p.qrcode.toLowerCase() === buffer.toLowerCase() ||
                        buffer.toLowerCase().includes(p.qrcode.toLowerCase())
                    ));
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

    function handleAddToCart(newItem: CartItem) {
        setCart(prev => {
            const newCart = [...prev, newItem];
            const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);

            if (!paymentManuallySet) {
                if (prev.length === 0 && activePaymentMethods.length > 0) {
                    const def = activePaymentMethods.find(m => String(m.id) === defaultPaymentMethodId) || activePaymentMethods[0];
                    setPayments([{ payment_method_id: String(def.id), method_name: def.name, amount: newTotal.toFixed(2) }]);
                } else if (payments.length === 1) {
                    setPayments(prevPay => [{ ...prevPay[0], amount: newTotal.toFixed(2) }]);
                }
            }
            return newCart;
        });
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

                if (!paymentManuallySet) {
                    if (prev.length === 0 && activePaymentMethods.length > 0) {
                        const def = activePaymentMethods.find(m => String(m.id) === defaultPaymentMethodId) || activePaymentMethods[0];
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
                    if (prev.length === 0 && activePaymentMethods.length > 0) {
                        const def = activePaymentMethods.find(m => String(m.id) === defaultPaymentMethodId) || activePaymentMethods[0];
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
        if (processing) return;
        if (cart.length === 0 || (isCashCustomer && Math.abs(remaining) > 0.01)) return;
        if (!isCashCustomer && remaining > 0.01) {
            setShowCreditConfirm(true);
            return;
        }
        executeSubmit();
    }

    function executeSubmit() {
        if (processing) return;
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
            auto_print_node: autoPrintNode,
        };

        if (isEditMode) {
            router.put(`/invoices/${editInvoice!.id}`, payload, {
                preserveScroll: true,
                preserveState: true,
                only: ['flash', 'recentInvoices'],
                onSuccess: () => {
                    clearForm();
                },
                onFinish: () => setProcessing(false),
            });
        } else {
            router.post('/invoices', payload, {
                preserveScroll: true,
                preserveState: true,
                only: ['flash', 'recentInvoices'],
                onSuccess: () => {
                    clearForm();
                },
                onFinish: () => setProcessing(false),
            });
        }
    }

    const selectedCustomerName = selectedCustomer?.name ?? 'زبون نقدي';

    // ── Workstation Customer Select Component ──────────────────────────────
    function WorkstationCustomerSelect({
        selectedId,
        onSelect,
    }: {
        selectedId: string;
        onSelect: (id: string) => void;
    }) {
        const [isOpen, setIsOpen] = useState(false);
        const [search, setSearch] = useState('');
        const ref = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
            function handleClickOutside(e: MouseEvent) {
                if (ref.current && !ref.current.contains(e.target as Node)) {
                    setIsOpen(false);
                }
            }
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        useEffect(() => {
            if (isOpen) {
                setTimeout(() => inputRef.current?.focus(), 50);
            } else {
                setSearch('');
            }
        }, [isOpen]);

        const cashCustomer = customers.find(c => c.id === 1) || { id: 1, name: 'زبون نقدي' };
        const otherCustomers = customers.filter(c => c.id !== 1);

        const filtered = otherCustomers.filter(c => {
            if (!search.trim()) return true;
            return (c.name || '').toLowerCase().includes(search.toLowerCase().trim());
        });

        const currentCustomer = selectedId ? customers.find(c => String(c.id) === selectedId) : cashCustomer;

        return (
            <div className="relative flex-1 min-w-0" ref={ref}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`h-11 sm:h-12 w-full px-3 rounded-[2px] border text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        isOpen
                            ? 'border-brand bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs'
                            : selectedId
                                ? 'border-slate-300 dark:border-[#22354e] bg-white dark:bg-[#0c1421] text-slate-900 dark:text-white'
                                : 'border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center gap-2 truncate">
                        <User className="w-4 h-4 text-brand shrink-0" />
                        <span className="truncate">{currentCustomer ? currentCustomer.name : 'زبون نقدي'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-1.5">
                        {selectedId && currentCustomer?.total_debt && +currentCustomer.total_debt > 0 && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded-[2px] font-number font-bold">
                                دين: {fmt(+currentCustomer.total_debt)}
                            </span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-brand' : ''}`} />
                    </div>
                </button>

                {isOpen && (
                    <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[260px]">
                        <div className="p-2 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/80 dark:bg-[#09111c] flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="بحث عن عميل..."
                                className="w-full bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                            />
                        </div>
                        <ul className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-1">
                            {(!search || 'زبون نقدي'.includes(search.trim())) && (
                                <li
                                    onClick={() => { setCustomerId(''); setIsOpen(false); }}
                                    className={`px-3 py-2 rounded-[2px] text-xs font-bold cursor-pointer flex items-center justify-between border ${
                                        !selectedId
                                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                            : 'bg-slate-50/50 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100'
                                    }`}
                                >
                                    <span>زبون نقدي (افتراضي)</span>
                                    {!selectedId && <Check className="w-3.5 h-3.5 text-brand" />}
                                </li>
                            )}
                            {filtered.map(c => {
                                const isSelected = selectedId === String(c.id);
                                return (
                                    <li
                                        key={c.id}
                                        onClick={() => { setCustomerId(String(c.id)); setIsOpen(false); }}
                                        className={`px-3 py-2 rounded-[2px] text-xs font-bold cursor-pointer flex items-center justify-between border ${
                                            isSelected
                                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                                : 'bg-slate-50/50 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="truncate">{c.name}</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {c.total_debt && +c.total_debt > 0 && (
                                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-number font-bold">
                                                    دين: {fmt(+c.total_debt)}
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
        );
    }

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <>
            <AppShell pageTitle={isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة بيع جديدة'}>
                {/* 🌟 Workstation Floating Toast */}
                {toastMessage && (
                    <div className="fixed top-5 left-5 z-[9999] animate-in fade-in slide-in-from-left-4 duration-200">
                        <div className="bg-white dark:bg-[#0c1421] text-slate-800 dark:text-white px-3.5 py-2.5 rounded-[2px] shadow-xl border border-emerald-500/30 dark:border-emerald-500/25 flex items-center gap-3 max-w-md">
                            <div className="w-7 h-7 rounded-[2px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white leading-tight">
                                    {toastMessage}
                                </p>
                            </div>
                            {createdInvId && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        disabled={reprintingToast}
                                        onClick={() => triggerNodePrint(createdInvId)}
                                        className="px-2 py-1 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-[#121c2c] dark:hover:bg-[#18263b] disabled:opacity-50 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-[#1d2d42]"
                                        title="إعادة طباعة نسخة إضافية من الإيصال الحراري"
                                    >
                                        {reprintingToast ? 'جاري...' : 'طباعة 🖨️'}
                                    </button>
                                    <Link
                                        href={`/invoices/${createdInvId}`}
                                        className="px-2 py-1 rounded-[2px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs transition-colors border border-sky-500/25"
                                    >
                                        عرض
                                    </Link>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setToastMessage(null)}
                                className="w-6 h-6 rounded-[2px] hover:bg-slate-100 dark:hover:bg-[#152238] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                title="إغلاق"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Desktop Layout */}
                <div className="hidden lg:flex flex-row gap-0 -m-4 lg:-m-10 h-[calc(100dvh-155px)] overflow-hidden">

                    {/* ══ LEFT PANEL ══ */}
                    <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200/90 dark:border-[#1d2d42]">

                        {/* Top bar */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <Link href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-xs">
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>{isEditMode ? 'عرض الفاتورة' : 'فواتير البيع'}</span>
                                </Link>
                                <span className="text-slate-300 dark:text-slate-700">/</span>
                                <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                    {isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة جديدة'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Refresh / Sync Products Catalog Button */}
                                <button
                                    type="button"
                                    onClick={refreshProductsCatalog}
                                    disabled={isRefreshing}
                                    className="h-9 px-3 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/70 dark:bg-[#101a29] hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs disabled:opacity-50"
                                    title="تحديث المنتجات ومزامنة المخزون اللحظي"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 text-brand ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span>تحديث المنتجات</span>
                                    <span className="text-[10px] font-number text-slate-500 mr-0.5">({productsList.length})</span>
                                </button>

                                {/* Hold invoices button */}
                                {!isEditMode && (
                                    <button
                                        type="button"
                                        onClick={() => setShowHoldList(!showHoldList)}
                                        className="h-9 px-3 rounded-[2px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                                        title="الفواتير المعلقة"
                                    >
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        <span>معلقة</span>
                                        {holdInvoices.length > 0 && (
                                            <span className="min-w-[18px] h-[18px] px-1 rounded-[2px] bg-amber-500 text-white font-number font-bold text-[10px] flex items-center justify-center">
                                                {holdInvoices.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {flash?.error && <span className="text-xs font-bold text-rose-500 max-w-[140px] truncate">{flash.error}</span>}
                            </div>
                        </div>

                        {/* Add product form */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 bg-slate-50/30 dark:bg-[#080e18]/40">
                            <ProductSelector
                                key={`desktop-ps-${productSelectorKey}`}
                                products={productsList}
                                sizes={sizes}
                                customerType={customerType}
                                isEditMode={isEditMode}
                                editInvoiceQtyForProduct={getOriginalInvoiceQty}
                                getCartConsumed={getCartConsumed}
                                onAddToCart={handleAddToCart}
                                openPad={openPad}
                                onRefreshCatalog={refreshProductsCatalog}
                                isRefreshing={isRefreshing}
                            />
                        </div>

                        {/* Submit Action Bar */}
                        <div className="px-4 py-3 border-t border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0 flex items-stretch gap-2.5">
                            <Link
                                href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'}
                                className="h-11 px-4 flex items-center justify-center gap-1.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                                <span>إلغاء</span>
                            </Link>
                            {!isEditMode && (
                                <button
                                    type="button"
                                    onClick={clearForm}
                                    disabled={cart.length === 0}
                                    className="h-11 px-4 flex items-center justify-center gap-1.5 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-bold text-xs transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>مسح الفاتورة</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowPaymentDrawer(true)}
                                disabled={cart.length === 0}
                                className="flex-1 h-11 flex items-center justify-between px-5 rounded-[2px] bg-brand hover:bg-brand/90 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    <span>{isEditMode ? 'تأكيد الفاتورة والسداد' : 'تأكيد الفاتورة والانتقال للدفع'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-[2px]">
                                        {cart.length} أصناف
                                    </span>
                                    <span className="text-sm sm:text-base font-number font-black">
                                        {grandTotal.toFixed(2)} د.ل
                                    </span>
                                    <ChevronUp className="w-4 h-4" />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* ══ RIGHT PANEL ══ */}
                    <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col overflow-hidden bg-white dark:bg-[#0c1421] shrink-0 border-r border-slate-200/90 dark:border-[#1d2d42]">

                        {/* Customer bar */}
                        <div className="p-3 border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">العميل</span>
                                <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                    customerType === 'vip'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}>
                                    {customerType === 'vip' ? '⭐ عميل مميز VIP' : 'عميل عادي'}
                                </span>
                            </div>

                            <WorkstationCustomerSelect
                                selectedId={customerId}
                                onSelect={id => setCustomerId(id)}
                            />

                            {/* Debt warning if any */}
                            {customerId && originalDebt > 0 && (
                                <div className="p-2 rounded-[2px] bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate">
                                            الدين السابق: {originalDebt.toFixed(2)} د.ل
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const m = activePaymentMethods[0];
                                            if (!m) return;
                                            setDebtPayment({ payment_method_id: String(m.id), method_name: m.name, amount: originalDebt.toFixed(2) });
                                        }}
                                        className="h-7 px-2.5 rounded-[2px] bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-600 transition-colors cursor-pointer shrink-0"
                                    >
                                        سداد الدين
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Panel header */}
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

                        {/* Cart items */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-3">
                            <Cart
                                cart={cart}
                                products={productsList}
                                sizes={sizes}
                                paymentMethods={activePaymentMethods}
                                payments={payments}
                                paymentManuallySet={paymentManuallySet}
                                setCart={setCart}
                                setPayments={setPayments}
                                openPad={openPad}
                                resolveQuantity={resolveQuantity}
                                resolveLineTotal={resolveLineTotal}
                            />
                        </div>

                        {/* Action Bar: Hold Invoice + Recent Invoices Quick Print */}
                        <div className="p-3 border-t border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0 flex gap-2">
                            {!isEditMode && cart.length > 0 && (
                                <button
                                    type="button"
                                    onClick={holdCurrentInvoice}
                                    className="flex-1 h-10 px-3 rounded-[2px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <Pause className="w-4 h-4" />
                                    <span>تعليق الفاتورة</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowRecentDrawer(true)}
                                className="flex-1 h-10 px-3 rounded-[2px] border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                            >
                                <History className="w-4 h-4" />
                                <span>آخر 4 فواتير</span>
                                {recentInvoices && recentInvoices.length > 0 && (
                                    <span className="text-[10px] font-number font-bold bg-sky-500 text-white px-1.5 py-0.2 rounded-[2px]">
                                        {recentInvoices.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout with Tabs */}
                <div className="lg:hidden flex flex-col -m-4 h-[calc(100vh-80px)] overflow-hidden">

                    {/* Top Bar - Customer Selection */}
                    <div className="flex flex-col border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/90 dark:border-[#1d2d42]">
                            <Link href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'} className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-brand transition-colors font-bold text-xs">
                                <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                            </Link>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة جديدة'}</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={refreshProductsCatalog}
                                    disabled={isRefreshing}
                                    className="h-8 px-2 rounded-[2px] bg-slate-50 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 transition-colors disabled:opacity-50 text-xs"
                                    title="تحديث المنتجات والمخزون"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 text-brand ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span className="text-[11px] font-number font-bold">{productsList.length}</span>
                                </button>

                                {!isEditMode && (
                                    <button
                                        type="button"
                                        onClick={() => setShowHoldList(!showHoldList)}
                                        className="h-8 px-2 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-xs"
                                        title="الفواتير المعلقة"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        {holdInvoices.length > 0 && (
                                            <span className="min-w-[16px] h-[16px] px-1 rounded-[2px] bg-amber-500 text-white font-number text-[10px] flex items-center justify-center font-bold">
                                                {holdInvoices.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-2.5">
                            <WorkstationCustomerSelect
                                selectedId={customerId}
                                onSelect={id => setCustomerId(id)}
                            />
                        </div>

                        {customerId && originalDebt > 0 && (
                            <div className="mx-2.5 mb-2 px-2.5 py-1.5 rounded-[2px] bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate">دين: {originalDebt.toFixed(2)} د.ل</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const m = activePaymentMethods[0];
                                        if (!m) return;
                                        setDebtPayment({ payment_method_id: String(m.id), method_name: m.name, amount: originalDebt.toFixed(2) });
                                        setActiveTab('payment');
                                    }}
                                    className="flex items-center gap-1 px-2 h-6 rounded-[2px] bg-rose-500 text-white font-bold text-[10px] transition-colors shrink-0"
                                >
                                    <CreditCard className="w-3 h-3" /> سداد
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('products')}
                            className={`flex-1 flex items-center justify-center gap-1.5 h-11 font-bold text-xs transition-colors relative ${
                                activeTab === 'products' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <Package className="w-4 h-4" />
                            <span>المنتجات</span>
                            {cart.length > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-[2px] bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {cart.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)}
                                </span>
                            )}
                            {activeTab === 'products' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                            )}
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
                            {activeTab === 'payment' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                            )}
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
                            {activeTab === 'confirm' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Products Tab */}
                        {activeTab === 'products' && (
                            <div className="flex flex-col">
                                <div className="p-3 border-b border-slate-200/90 dark:border-[#1d2d42]">
                                    <ProductSelector
                                        key={`mobile-ps-${productSelectorKey}`}
                                        products={productsList}
                                        sizes={sizes}
                                        customerType={customerType}
                                        isEditMode={isEditMode}
                                        editInvoiceQtyForProduct={getOriginalInvoiceQty}
                                        getCartConsumed={getCartConsumed}
                                        onAddToCart={handleAddToCart}
                                        openPad={openPad}
                                        onRefreshCatalog={refreshProductsCatalog}
                                        isRefreshing={isRefreshing}
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto p-3">
                                    <Cart
                                        cart={cart}
                                        products={productsList}
                                        sizes={sizes}
                                        paymentMethods={activePaymentMethods}
                                        payments={payments}
                                        paymentManuallySet={paymentManuallySet}
                                        setCart={setCart}
                                        setPayments={setPayments}
                                        openPad={openPad}
                                        resolveQuantity={resolveQuantity}
                                        resolveLineTotal={resolveLineTotal}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Payment Tab */}
                        {activeTab === 'payment' && (
                            <div className="flex flex-col">
                                {/* Totals Summary */}
                                <div className="p-3 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#0c1421]/50">
                                    <div className="flex flex-col gap-2 p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#142033]">
                                            <span className="text-xs font-bold text-slate-500">الفاتورة</span>
                                            <span className="text-base font-number font-bold text-slate-800 dark:text-white">{fmt(total)} د.ل</span>
                                        </div>
                                        {debtPayment && (
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#142033]">
                                                <span className="text-xs font-bold text-rose-500">الدين السابق</span>
                                                <span className="text-base font-number font-bold text-rose-600 dark:text-rose-400">{fmt(originalDebt)} د.ل</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">الإجمالي الكلي</span>
                                            <span className="text-lg font-number font-black text-sky-600 dark:text-sky-400">{fmt(grandTotal)} د.ل</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">المدفوع</span>
                                            <span className="text-base font-number font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalPaid)} د.ل</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#142033]">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">المتبقي</span>
                                            <span className={`text-lg font-number font-black ${remaining > 0.01 ? 'text-rose-500' : 'text-slate-400'}`}>{fmt(remaining)} د.ل</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Methods */}
                                <div className="p-3">
                                    <div className="flex flex-col gap-3">
                                        {/* Add Payment Section */}
                                        {cart.length > 0 && (
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">إضافة دفعة جديدة</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {activePaymentMethods.map(m => (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onClick={() => handleSelectPaymentMethod(String(m.id))}
                                                            className={`h-11 rounded-[2px] font-bold text-xs transition-colors border ${
                                                                selMethod === String(m.id)
                                                                    ? 'bg-brand border-brand text-white'
                                                                    : 'bg-white dark:bg-[#0c1421] border-slate-200 dark:border-[#1d2d42] text-slate-700 dark:text-slate-200 hover:border-brand'
                                                            }`}
                                                        >
                                                            {m.name}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openPad('المبلغ', selAmount || (remaining > 0 ? remaining.toFixed(2) : ''), v => setSelAmount(v), remaining > 0 ? remaining : undefined)}
                                                        className="flex-1 h-11 rounded-[2px] px-3 font-number font-bold text-sm text-center border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] cursor-pointer"
                                                    >
                                                        {selAmount || (remaining > 0 ? remaining.toFixed(2) : '0.00')} د.ل
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={addPayment}
                                                        disabled={!selMethod || (selAmount ? +selAmount <= 0 : remaining <= 0)}
                                                        className="flex items-center justify-center w-11 h-11 rounded-[2px] bg-brand text-white disabled:opacity-40 cursor-pointer"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment List */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">سجل الدفعات</label>
                                            {debtPayment && (
                                                <div className="flex items-center gap-2 p-2.5 rounded-[2px] bg-rose-500/10 border border-rose-500/25">
                                                    <button
                                                        type="button"
                                                        onClick={() => openPad('مبلغ سداد الدين', debtPayment.amount, v => {
                                                            setDebtPayment(prev => prev ? { ...prev, amount: v } : null);
                                                        }, originalDebt)}
                                                        className="w-8 h-8 rounded-[2px] bg-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                                                        title="تعديل القيمة"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] truncate">سداد الدين — {debtPayment.method_name}</span>
                                                        <span className="font-number font-bold text-slate-800 dark:text-white text-sm truncate">{debtPayment.amount} د.ل</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDebtPayment(null)}
                                                        className="w-8 h-8 rounded-[2px] bg-rose-500 text-white hover:bg-rose-600 flex items-center justify-center transition-colors shrink-0"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                            {payments.length === 0 && !debtPayment ? (
                                                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500">
                                                    <CreditCard className="w-8 h-8 mb-1.5 stroke-[1.5]" />
                                                    <span className="font-bold text-xs">لا توجد دفعات مسجلة</span>
                                                </div>
                                            ) : (
                                                payments.map((p, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/25">
                                                        <button
                                                            type="button"
                                                            onClick={() => openPad(`تعديل مبلغ (${p.method_name})`, p.amount, v => {
                                                                setPayments(prev => prev.map((pay, i) => i === idx ? { ...pay, amount: v } : pay));
                                                                setPaymentManuallySet(true);
                                                            })}
                                                            className="w-8 h-8 rounded-[2px] bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                                                            title="تعديل القيمة"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] truncate">{p.method_name}</span>
                                                            <span className="font-number font-bold text-slate-800 dark:text-white text-sm truncate">{p.amount} د.ل</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setPayments(prev => prev.filter((_, i) => i !== idx)); setPaymentManuallySet(false); }}
                                                            className="w-8 h-8 rounded-[2px] bg-rose-500 text-white hover:bg-rose-600 flex items-center justify-center transition-colors shrink-0"
                                                            title="حذف"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
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
                                <div className="p-3">
                                    <div className="flex flex-col gap-2.5">
                                        {/* Customer Info */}
                                        <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <User className="w-3.5 h-3.5 text-brand" />
                                                <span className="text-[11px] font-bold text-slate-500">العميل</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-900 dark:text-white text-xs">{selectedCustomerName}</span>
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                                    customerType === 'vip'
                                                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/25'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                }`}>
                                                    {customerType === 'vip' ? '⭐ VIP' : 'عادي'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Cart Summary */}
                                        <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <ShoppingCart className="w-3.5 h-3.5 text-brand" />
                                                <span className="text-[11px] font-bold text-slate-500">المنتجات</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                    {cart.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)} قطعة
                                                </span>
                                                <span className="font-number font-black text-sky-600 dark:text-sky-400 text-sm">
                                                    {total.toFixed(2)} د.ل
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment Summary */}
                                        <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <CreditCard className="w-3.5 h-3.5 text-brand" />
                                                <span className="text-[11px] font-bold text-slate-500">الدفع المسجل</span>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {debtPayment && (
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-rose-600 font-bold">سداد الدين</span>
                                                        <span className="font-number font-bold text-rose-600">{debtPayment.amount} د.ل</span>
                                                    </div>
                                                )}
                                                {payments.map((p, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-600 dark:text-slate-400">{p.method_name}</span>
                                                        <span className="font-number font-bold text-slate-900 dark:text-white">{p.amount} د.ل</span>
                                                    </div>
                                                ))}
                                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-[#142033]">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">المجموع المدفوع</span>
                                                    <span className="font-number font-black text-emerald-600 dark:text-emerald-400 text-sm">{totalPaid.toFixed(2)} د.ل</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Total Summary */}
                                        <div className="p-3 rounded-[2px] bg-sky-500/10 border border-sky-500/25">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الإجمالي الكلي</span>
                                                <span className="font-number font-black text-sky-600 dark:text-sky-400 text-base">{grandTotal.toFixed(2)} د.ل</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">المتبقي</span>
                                                <span className={`font-number font-black text-sm ${remaining > 0.01 ? 'text-rose-500' : 'text-emerald-500'}`}>{remaining.toFixed(2)} د.ل</span>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">ملاحظات</label>
                                            <textarea
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                rows={2}
                                                placeholder="ملاحظات على الفاتورة... (اختياري)"
                                                className="w-full rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] px-3 py-2 text-xs font-bold resize-none outline-none focus:border-brand"
                                            />
                                        </div>

                                        {/* Cash customer warning */}
                                        {isCashCustomer && remaining > 0.01 && (
                                            <div className="p-2.5 rounded-[2px] bg-amber-500/10 border border-amber-500/25 flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                    زبون نقدي — يجب الدفع الكامل قبل التأكيد
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="p-3 border-t border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421]">
                                    <div className="flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={submit}
                                            disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                                            className="w-full h-11 rounded-[2px] bg-brand text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                                        >
                                            {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            <span>{processing ? 'جاري الحفظ والطباعة...' : (isEditMode ? `حفظ التعديلات — ${grandTotal.toFixed(2)} د.ل` : `تأكيد البيع — ${grandTotal.toFixed(2)} د.ل`)}</span>
                                        </button>

                                        {!isEditMode && cart.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={holdCurrentInvoice}
                                                className="w-full h-10 rounded-[2px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Pause className="w-4 h-4" />
                                                <span>تعليق الفاتورة (حفظ مؤقت)</span>
                                            </button>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            {!isEditMode && cart.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={clearForm}
                                                    className="h-9 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>مسح</span>
                                                </button>
                                            )}
                                            <Link
                                                href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'}
                                                className={`h-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 ${
                                                    (!isEditMode && cart.length > 0) ? '' : 'col-span-2'
                                                }`}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                <span>إلغاء</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Stage 4 Hold Invoices Drawer */}
                <HoldInvoices
                    showHoldList={showHoldList}
                    setShowHoldList={setShowHoldList}
                    holdInvoices={holdInvoices}
                    setHoldInvoices={setHoldInvoices}
                    restoreHoldInvoice={restoreHoldInvoice}
                    deleteHoldInvoice={deleteHoldInvoice}
                />
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

            {/* Stage 3 Payment Drawer */}
            <PaymentDrawer
                showPaymentDrawer={showPaymentDrawer}
                setShowPaymentDrawer={setShowPaymentDrawer}
                cart={cart}
                payments={payments}
                debtPayment={debtPayment}
                paymentMethods={activePaymentMethods}
                customerId={customerId}
                selectedCustomer={selectedCustomer}
                originalDebt={originalDebt}
                isCashCustomer={isCashCustomer}
                customerType={customerType}
                isEditMode={isEditMode}
                editInvoice={editInvoice}
                total={total}
                grandTotal={grandTotal}
                totalPaid={totalPaid}
                remaining={remaining}
                processing={processing}
                selMethod={selMethod}
                selAmount={selAmount}
                autoPrintNode={autoPrintNode}
                setAutoPrintNode={setAutoPrintNode}
                setSelMethod={setSelMethod}
                setSelAmount={setSelAmount}
                setPayments={setPayments}
                setDebtPayment={setDebtPayment}
                setPaymentManuallySet={setPaymentManuallySet}
                handleSelectPaymentMethod={handleSelectPaymentMethod}
                addPayment={addPayment}
                submit={submit}
                openPad={openPad}
            />

            <RecentInvoicesDrawer
                isOpen={showRecentDrawer}
                onClose={() => setShowRecentDrawer(false)}
                recentInvoices={recentInvoices || []}
                onPrintNode={triggerNodePrint}
            />
        </>
    );
}
