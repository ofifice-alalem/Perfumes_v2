import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, User, AlertCircle, Wallet, Edit,
    Search, ChevronDown, FileText, RotateCcw
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

interface InvoiceItem {
    id: number;
    product_id: number;
    product_name: string;
    sale_type: string;
    size_id: number | null;
    size_label: string | null;
    quantity: string;
    unit_price: string;
    line_total: string;
}

interface Props {
    customers:             Customer[];
    products:              Product[];
    sizes:                 Size[];
    paymentMethods:        PaymentMethod[];
    selected_customer_id?: number;
    selected_invoice_id?:  number | null;
    invoice_items?:        InvoiceItem[];
    flash?: { success?: string; error?: string };
}

interface ItemRow {
    product_id: string;
    product_name: string;
    sale_type: string;
    size_id: number | null;
    size_label: string;
    quantity: string;
    unit_price: string;
    line_total: string;
}
interface SettlementRow { payment_method_id: string; amount: string; notes: string; }

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const saleTypeLabels: Record<string, string> = {
    tier_decant: 'زيتي',
    unit_decant: 'أصلي - تقسيم',
    full_bottle: 'عبوة كاملة',
    unit_based:  'بالوحدة',
};

function resolveQuantity(product: Product, saleType: string, sizeId: string, manualQty: string, sizes: Size[]): number {
    switch (saleType) {
        case 'tier_decant':
        case 'unit_decant':
            if (sizeId.startsWith('-custom-')) return +(sizeId.replace('-custom-', '')) || 0;
            return +(sizes.find(s => s.id === +sizeId)?.value ?? 0);
        case 'full_bottle':
            return product.original_perfume_detail ? +product.original_perfume_detail.bottle_volume : 0;
        case 'unit_based':
            return +manualQty || 0;
        default: return 0;
    }
}

function resolveLineTotal(saleType: string, price: number, quantity: number): number {
    return (saleType === 'full_bottle' || saleType === 'tier_decant') ? price : price * quantity;
}

export default function InvoiceReturnsCreate({
    customers,
    products,
    sizes,
    paymentMethods,
    selected_customer_id,
    selected_invoice_id,
    invoice_items,
    flash,
}: Props) {
    const [items,       setItems]       = useState<ItemRow[]>([]);
    const [settlements, setSettlements] = useState<SettlementRow[]>([]);

    // Product selection state
    const [selProduct,   setSelProduct]   = useState('');
    const [selSaleType,  setSelSaleType]  = useState('');
    const [selSize,      setSelSize]      = useState('');
    const [selQty,       setSelQty]       = useState('1');
    const [selUnitPrice, setSelUnitPrice] = useState('');
    const [selMinPrice,  setSelMinPrice]  = useState(0);

    // Product dropdown search & state
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const productDropdownRef = useRef<HTMLDivElement>(null);
    const productSearchInputRef = useRef<HTMLInputElement>(null);

    // Modals & NumberPad
    const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);
    const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    // Payment state
    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string>('');

    // Mobile tabs state
    const [activeTab, setActiveTab] = useState<'products' | 'payment' | 'confirm'>('products');
    const [showCreditConfirm, setShowCreditConfirm] = useState(false);

    const form = useForm({
        customer_id: String(selected_customer_id ?? 1),
        invoice_id:  selected_invoice_id ? String(selected_invoice_id) : '',
        notes:       '',
    });

    const isCash          = form.data.customer_id === '1';
    const customer        = customers.find(c => String(c.id) === form.data.customer_id);
    const grandTotal      = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);
    const totalRecovered  = settlements.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const originalDebt    = customer ? parseFloat(customer.total_debt || '0') || 0 : 0;
    const debtAfterReturn = !isCash ? originalDebt - grandTotal + totalRecovered : 0;

    // Close product dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
                setIsProductDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isProductDropdownOpen && productSearchInputRef.current) {
            setTimeout(() => productSearchInputRef.current?.focus(), 50);
        } else {
            setProductSearch('');
        }
    }, [isProductDropdownOpen]);

    useEffect(() => {
        if (showPaymentDrawer) {
            const rem = grandTotal - totalRecovered;
            if (!selMethod && paymentMethods.length > 0) {
                setSelMethod(String(paymentMethods[0].id));
                setSelAmount(rem > 0 ? rem.toFixed(2) : '');
            } else if (!selAmount && rem > 0) {
                setSelAmount(rem.toFixed(2));
            }
        }
    }, [showPaymentDrawer]);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title);
        setPadInitial(initial);
        setPadMax(max);
        setPadCallback(() => cb);
        setShowPad(true);
    }

    // Load items from reference invoice if provided
    useEffect(() => {
        if (invoice_items && invoice_items.length > 0) {
            const rows: ItemRow[] = invoice_items.map(item => ({
                product_id:   String(item.product_id),
                product_name: item.product_name,
                sale_type:    item.sale_type,
                size_id:      item.size_id ?? null,
                size_label:   item.size_label ?? '',
                quantity:     item.quantity,
                unit_price:   item.unit_price,
                line_total:   item.line_total,
            }));
            setItems(rows);
        }
    }, [invoice_items]);

    // Derived product states
    const selectedProduct = products.find(p => p.id === +selProduct);
    const isTier          = selectedProduct?.selling_type === 'tier_based';
    const isOriginal      = selectedProduct?.category?.unit === 'ml' && !isTier;
    const needsSize       = isTier || selSaleType === 'unit_decant';
    const needsQty        = selSaleType === 'unit_based';
    const effectiveST     = isTier ? 'tier_decant' : selSaleType;

    function saleTypeOptions() {
        if (!selectedProduct || isTier) return [];
        if (isOriginal) return [
            { label: 'أصلي - تقسيم', badge: 'unit_decant', description: 'بيع بالمليلتر حسب الحجم المطلوب', icon: '📊' },
            { label: 'عبوة كاملة',   badge: 'full_bottle', description: 'بيع العبوة بالكامل بحجمها الأصلي', icon: '🎁' },
        ];
        return [{ label: 'بالوحدة', badge: 'unit_based', description: 'بيع بالقطعة أو بالجرام', icon: '⚖️' }];
    }

    // Auto-select sale type
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

    function resolveDefaultAndMin(): { defaultPrice: number; minPrice: number } {
        if (!selectedProduct || !effectiveST) return { defaultPrice: 0, minPrice: 0 };
        const pp = selectedProduct.product_price;
        const pt = selectedProduct.price_tier;
        switch (effectiveST) {
            case 'tier_decant': {
                if (!selSize) return { defaultPrice: 0, minPrice: 0 };
                if (selSize.startsWith('-custom-')) return {
                    defaultPrice: pp ? +pp.price_per_unit_regular : 0,
                    minPrice:     pp ? +pp.price_per_unit_vip : 0,
                };
                const tp = pt?.tier_prices?.find(t => t.size_id === +selSize);
                return tp ? { defaultPrice: +tp.price_regular, minPrice: +tp.price_vip } : { defaultPrice: 0, minPrice: 0 };
            }
            case 'unit_decant':
            case 'unit_based':
                return pp ? { defaultPrice: +pp.price_per_unit_regular, minPrice: +pp.price_per_unit_vip } : { defaultPrice: 0, minPrice: 0 };
            case 'full_bottle':
                return pp ? { defaultPrice: +(pp.full_bottle_regular ?? 0), minPrice: +(pp.full_bottle_vip ?? 0) } : { defaultPrice: 0, minPrice: 0 };
            default: return { defaultPrice: 0, minPrice: 0 };
        }
    }

    const showPriceField = !!(selectedProduct && effectiveST && (!needsSize || selSize));

    useEffect(() => {
        if (showPriceField) {
            const { defaultPrice, minPrice } = resolveDefaultAndMin();
            setSelUnitPrice(defaultPrice > 0 ? defaultPrice.toFixed(2) : '');
            setSelMinPrice(minPrice);
        }
    }, [selProduct, selSaleType, selSize]);

    const previewQty   = selectedProduct && (isTier ? selSize : selSaleType)
        ? resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes) : null;
    const previewCount = effectiveST === 'unit_based' ? (+selQty || 1) : (parseInt(selQty) || 1);
    const previewPrice = selUnitPrice && +selUnitPrice > 0 ? +selUnitPrice : null;
    const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0
        ? resolveLineTotal(effectiveST, previewPrice, previewQty) * (effectiveST === 'unit_based' ? 1 : previewCount)
        : null;

    const canAdd = !!(selectedProduct
        && (isTier ? (!needsSize || selSize) : selSaleType)
        && (!needsSize || selSize)
        && (!needsQty || selQty)
        && selUnitPrice && +selUnitPrice > 0);

    function addToCart() {
        if (!selectedProduct || (!isTier && !selSaleType)) return;
        const unitPrice = +selUnitPrice;
        if (!unitPrice) return;

        if (effectiveST === 'unit_based') {
            const qty = +selQty || 0;
            if (!qty) return;
            setItems(prev => [...prev, {
                product_id:   String(selectedProduct.id),
                product_name: selectedProduct.name,
                sale_type:    effectiveST,
                size_id:      null,
                size_label:   '',
                quantity:     String(qty),
                unit_price:   unitPrice.toFixed(2),
                line_total:   resolveLineTotal(effectiveST, unitPrice, qty).toFixed(2),
            }]);
        } else {
            const qty = resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes);
            if (!qty) return;
            const sizeLabel = selSize.startsWith('-custom-')
                ? `${selSize.replace('-custom-', '')} مل`
                : (sizes.find(s => s.id === +selSize)?.label ?? '');
            const count = parseInt(selQty) || 1;
            const newRows: ItemRow[] = Array.from({ length: count }, () => ({
                product_id:   String(selectedProduct.id),
                product_name: selectedProduct.name,
                sale_type:    effectiveST,
                size_id:      selSize && !selSize.startsWith('-custom-') ? +selSize : null,
                size_label:   sizeLabel,
                quantity:     String(qty),
                unit_price:   unitPrice.toFixed(2),
                line_total:   resolveLineTotal(effectiveST, unitPrice, qty).toFixed(2),
            }));
            setItems(prev => [...prev, ...newRows]);
        }

        setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1');
        setSelUnitPrice(''); setSelMinPrice(0);
    }

    // Default payment method logic
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

    // Update auto settlement amount
    useEffect(() => {
        if (grandTotal <= 0) { setSettlements([]); return; }
        setSettlements(prev => {
            if (prev.length === 0) {
                const defId = defaultPaymentMethodId || (paymentMethods[0] ? String(paymentMethods[0].id) : '');
                return defId ? [{ payment_method_id: defId, amount: grandTotal.toFixed(2), notes: '' }] : [];
            }
            return prev.map((s, i) => i === 0 ? { ...s, amount: grandTotal.toFixed(2) } : s);
        });
    }, [grandTotal, defaultPaymentMethodId, paymentMethods]);

    function submit() {
        const remaining = grandTotal - totalRecovered;
        if (!isCash && remaining > 0.01) {
            setShowCreditConfirm(true);
            return;
        }
        executeSubmit();
    }

    function executeSubmit() {
        setShowCreditConfirm(false);
        const validSettlements = settlements.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        form.transform(data => ({
            ...data,
            items: items.map(item => ({
                product_id: item.product_id,
                size_id:    item.size_id ?? null,
                count:      1,
                quantity:   item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total,
            })),
            settlements: validSettlements,
        }));
        form.post('/invoice-returns', { preserveScroll: true });
    }

    const selectedCustomerLabel = form.data.customer_id === '1'
        ? 'زبون نقدي'
        : (customers.find(c => String(c.id) === form.data.customer_id)?.name ?? 'زبون نقدي');

    // Filter products for dropdown search
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase().trim()) ||
        (p.category?.name && p.category.name.toLowerCase().includes(productSearch.toLowerCase().trim()))
    );

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

        const selectedCust = customers.find(c => String(c.id) === selectedId) || customers.find(c => c.id === 1);
        const filteredCusts = customers.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase().trim())
        );

        return (
            <div className="relative w-full" ref={ref}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="h-11 sm:h-12 w-full px-3.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-brand shadow-2xs transition-colors"
                >
                    <div className="flex items-center gap-2 truncate">
                        <User className="w-4 h-4 text-brand shrink-0" />
                        <span className="truncate">{selectedCust ? selectedCust.name : 'زبون نقدي'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-1.5">
                        {selectedCust && selectedCust.id !== 1 && selectedCust.total_debt && +selectedCust.total_debt > 0 && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded-[2px] border border-rose-500/20">
                                دين: {parseFloat(selectedCust.total_debt).toFixed(2)} د.ل
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-brand' : ''}`} />
                    </div>
                </button>

                {isOpen && (
                    <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[260px]">
                        <div className="p-2 border-b border-slate-100 dark:border-[#172437] bg-slate-50 dark:bg-[#0a121e]">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="بحث باسم العميل..."
                                    className="w-full h-9 pr-9 pl-3 text-xs rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#070d18] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-brand font-medium"
                                />
                            </div>
                        </div>

                        <ul className="max-h-64 overflow-y-auto custom-scroll p-1.5 space-y-1">
                            {filteredCusts.map(c => {
                                const isSelected = String(c.id) === selectedId;
                                return (
                                    <li key={c.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelect(String(c.id));
                                                setIsOpen(false);
                                            }}
                                            className={`w-full text-right px-3 py-2 rounded-[2px] text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                                                isSelected
                                                    ? 'bg-brand/10 border-brand text-brand dark:text-white'
                                                    : 'bg-white dark:bg-[#111a29] border-slate-200/80 dark:border-[#1c2a3f] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#162338]'
                                            }`}
                                        >
                                            <span className="truncate">{c.name}</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {c.id !== 1 && c.total_debt && +c.total_debt > 0 && (
                                                    <span className="text-[10px] text-rose-600 dark:text-rose-400">
                                                        دين: {parseFloat(c.total_debt).toFixed(2)} د.ل
                                                    </span>
                                                )}
                                                {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
        <AppShell pageTitle="مرتجع بيع جديد">
            {/* Desktop Layout - Exact Workstation Matching Invoices/Create.tsx */}
            <div className="hidden lg:flex flex-row gap-0 flex-1 min-h-0 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] overflow-hidden bg-white dark:bg-[#0c1421] mt-0.5">

                {/* ══ LEFT WORKSTATION PANEL (لوحة المنتجات وجهة العمل - مساحة أوسع) ══ */}
                <div className="flex-1 flex flex-col overflow-hidden border-l border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421]">

                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link href="/invoice-returns" className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-xs">
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>مرتجعات الفواتير</span>
                            </Link>
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                مرتجع مبيعات جديد
                            </span>
                        </div>
                        {flash?.error && (
                            <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-[2px] border border-rose-500/20">
                                {flash.error}
                            </span>
                        )}
                    </div>

                    {/* Product Selector Work Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 bg-slate-50/30 dark:bg-[#080e18]/40 custom-scroll">
                        <div className="flex flex-col gap-3 sm:gap-3.5">
                            {/* Row 1: Searchable Product Selector + Sale Type + Clear Button */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center">
                                {/* Product Searchable Dropdown */}
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
                                            {selectedProduct ? selectedProduct.name : 'ابحث أو اختر المنتج للمرتجع...'}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0 mr-1.5">
                                            {selectedProduct && (
                                                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 dark:bg-sky-950/40 px-2 py-0.5 rounded-[2px]">
                                                    المخزون: {selectedProduct.stock}
                                                </span>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180 text-brand' : ''}`} />
                                        </div>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isProductDropdownOpen && (
                                        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[280px]">
                                            <div className="p-2 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/80 dark:bg-[#09111c] flex items-center gap-2">
                                                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                                <input
                                                    ref={productSearchInputRef}
                                                    type="text"
                                                    value={productSearch}
                                                    onChange={e => setProductSearch(e.target.value)}
                                                    placeholder="اكتب اسم المنتج أو الصنف..."
                                                    className="w-full bg-transparent border-none text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && filteredProducts.length > 0) {
                                                            const p = filteredProducts[0];
                                                            setSelProduct(String(p.id));
                                                            setSelSaleType(''); setSelSize(''); setSelQty('1');
                                                            setSelUnitPrice(''); setSelMinPrice(0);
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
                                                                    setSelSaleType(''); setSelSize(''); setSelQty('1');
                                                                    setSelUnitPrice(''); setSelMinPrice(0);
                                                                    setIsProductDropdownOpen(false);
                                                                }}
                                                                className={`px-3 py-2.5 rounded-[2px] text-xs font-bold cursor-pointer flex items-center justify-between transition-all border ${
                                                                    isSelected
                                                                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800/60 dark:bg-sky-950/40 shadow-2xs'
                                                                        : 'bg-slate-50/50 dark:bg-[#09111c] text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-[#1a273b] hover:bg-slate-100 dark:hover:bg-[#131f32]'
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
                                                                <div className="flex items-center gap-2.5 shrink-0 mr-2">
                                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                                        المخزون: {p.stock}
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

                                {/* Sale type toggle */}
                                {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
                                    <div className="w-full sm:w-44 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowSaleTypeModal(true)}
                                            className="h-11 sm:h-12 w-full px-3.5 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] hover:border-brand text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center justify-between cursor-pointer transition-colors"
                                        >
                                            <span className="truncate">
                                                {saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}
                                            </span>
                                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
                                        </button>
                                    </div>
                                )}

                                {/* Dedicated Touchscreen Clear Button */}
                                {selectedProduct && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1');
                                            setSelUnitPrice(''); setSelMinPrice(0);
                                        }}
                                        title="تفريغ الصنف المختار"
                                        className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>تفريغ</span>
                                    </button>
                                )}
                            </div>

                            {/* Row 2: Sizes (if needed) */}
                            {needsSize && selectedProduct && (
                                <div className="w-full p-3 sm:p-4 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                                    <SizeSelect
                                        sizes={sizes}
                                        selectedSizeId={selSize}
                                        onSizeSelect={id => { setSelSize(id); setSelUnitPrice(''); }}
                                        onPriceResolved={(def, min) => { setSelUnitPrice(def.toFixed(2)); setSelMinPrice(min); }}
                                        product={selectedProduct}
                                        isVip={false}
                                    />
                                </div>
                            )}

                            {/* Row 3: Unit Price + COUNT NEXT TO PRICE + Add Button */}
                            {showPriceField && (
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end p-3.5 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                                    {/* Unit Price */}
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                سعر استرجاع الوحدة
                                            </span>
                                            {selMinPrice > 0 && (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[11px] font-bold">
                                                    <span>حد أدنى:</span>
                                                    <span>{selMinPrice.toFixed(2)} د.ل</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openPad(
                                                `سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`,
                                                selUnitPrice,
                                                v => setSelUnitPrice(v),
                                            )}
                                            className="h-11 sm:h-12 rounded-[2px] px-4 font-bold text-sm sm:text-base flex items-center justify-start cursor-pointer transition-colors border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] text-slate-900 dark:text-white hover:border-brand shadow-2xs"
                                        >
                                            <span>{selUnitPrice ? `${selUnitPrice} د.ل` : '0.00 د.ل'}</span>
                                        </button>
                                    </div>

                                    {/* Count / Quantity Input - DIRECTLY NEXT TO UNIT PRICE */}
                                    {selectedProduct && (isTier || selSaleType) && (
                                        <div className="flex flex-col gap-1 w-full sm:w-28 shrink-0">
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                {needsQty ? 'الكمية' : 'العدد'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v))}
                                                className="h-11 sm:h-12 w-full px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                                title={needsQty ? 'الكمية' : 'العدد'}
                                            >
                                                {selQty || '1'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Add Button */}
                                    <button
                                        type="button"
                                        onClick={addToCart}
                                        disabled={!canAdd}
                                        className="h-11 sm:h-12 px-6 sm:px-8 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>إضافة للمرتجع</span>
                                    </button>
                                </div>
                            )}

                            {/* Row 4: Dedicated Item Total preview row */}
                            {previewTotal !== null && previewQty !== null && previewQty > 0 && (
                                <div className="flex items-center justify-between px-4 py-2.5 rounded-[2px] bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/25">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        إجمالي العنصر المتوقع
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400">
                                            {fmt(previewTotal)}
                                        </span>
                                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">د.ل</span>
                                    </div>
                                </div>
                            )}
                            {/* Empty Selection State Guide */}
                            {!selectedProduct && (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-200 dark:border-[#1d2d42] rounded-[2px] bg-white/60 dark:bg-[#0c1421]/40">
                                    <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2.5 stroke-[1.5]" />
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        ابحث أو اختر المنتج المراد إرجاعه من القائمة أعلاه
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                                        عند اختيار الصنف، ستظهر لك أزرار تحديد الحجم، سعر الإرجاع، والكمية لإضافتها إلى السلة فوراً
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Bar - Exact Workstation Matching Invoices/Create.tsx */}
                    <div className="p-3 sm:p-4 border-t border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0 flex items-center gap-2 sm:gap-3">
                        {/* Cancel link button */}
                        <Link
                            href="/invoice-returns"
                            className="h-20 sm:h-24 px-3.5 sm:px-4.5 rounded-[2px] border border-slate-300 dark:border-[#22354e] bg-slate-100 hover:bg-slate-200 dark:bg-[#121c2c] dark:hover:bg-[#18263b] text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm transition-colors shrink-0 flex items-center justify-center shadow-sm"
                        >
                            <span>إلغاء</span>
                        </Link>

                        {/* Clear Return Items button */}
                        {items.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setItems([])}
                                disabled={items.length === 0}
                                className="h-20 sm:h-24 px-3.5 sm:px-4.5 rounded-[2px] border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-500 dark:text-rose-400 font-bold text-xs sm:text-sm transition-colors shrink-0 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center shadow-sm"
                            >
                                <span>مسح المرتجع</span>
                            </button>
                        )}

                        {/* Empty or Pay Button */}
                        {items.length === 0 ? (
                            <div className="flex-1 h-20 sm:h-24 flex items-center justify-center gap-2 px-4 rounded-[2px] bg-slate-100 dark:bg-[#101a29] border border-slate-300 dark:border-[#22354e] text-slate-500 dark:text-slate-400 select-none shadow-sm">
                                <ShoppingCart className="w-5 h-5 opacity-60" />
                                <span className="text-base sm:text-lg font-bold">
                                    السلة فارغة
                                </span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowPaymentDrawer(true)}
                                className="flex-1 h-20 sm:h-24 flex items-center justify-center gap-2.5 px-6 rounded-[2px] bg-brand hover:opacity-95 text-white font-black cursor-pointer shadow-lg active:scale-[0.99] transition-all"
                            >
                                <CreditCard className="w-6 h-6 stroke-[2.2]" />
                                <span className="text-xl sm:text-2xl font-black tracking-wide">
                                    إتمام الترجيع
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ══ RIGHT WORKSTATION PANEL (CUSTOMER, INVOICE & CART - عرض مريح ومضغوط) ══ */}
                <div className="w-full lg:w-[350px] xl:w-[370px] 2xl:w-[390px] flex flex-col overflow-hidden bg-white dark:bg-[#0c1421] shrink-0 border-r border-slate-200/90 dark:border-[#1d2d42]">

                    {/* Customer & Reference Invoice Bar */}
                    <div className="p-3 border-b border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0 flex flex-col gap-2">
                        {/* Customer Section */}
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">العميل</span>
                            <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                isCash
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                            }`}>
                                {isCash ? 'زبون نقدي' : 'زبون آجل'}
                            </span>
                        </div>

                        <WorkstationCustomerSelect
                            selectedId={form.data.customer_id}
                            onSelect={id => {
                                form.setData('customer_id', id);
                                router.get('/invoice-returns/create', { customer_id: id, invoice_id: form.data.invoice_id }, { preserveScroll: true, replace: true });
                            }}
                        />

                        {/* Reference Invoice Section */}
                        <div className="flex flex-col gap-1 pt-0.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    رقم الفاتورة الأصلية (اختياري)
                                </span>
                                {form.data.invoice_id && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            form.setData('invoice_id', '');
                                            router.get('/invoice-returns/create', { customer_id: form.data.customer_id }, { preserveScroll: true, replace: true });
                                        }}
                                        className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                                    >
                                        إلغاء الربط
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => openPad('رقم الفاتورة الأصلية', form.data.invoice_id, v => {
                                        form.setData('invoice_id', v);
                                        if (v) {
                                            router.get('/invoice-returns/create', { customer_id: form.data.customer_id, invoice_id: v }, { preserveScroll: true, replace: true });
                                        }
                                    })}
                                    className="h-10 px-3 flex-1 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#111a29] text-slate-900 dark:text-white font-bold text-xs flex items-center justify-between hover:border-brand cursor-pointer transition-colors shadow-2xs"
                                >
                                    <span className={form.data.invoice_id ? 'font-mono font-bold' : 'text-slate-400'}>
                                        {form.data.invoice_id ? `#${form.data.invoice_id}` : 'اضغط لإدخال رقم الفاتورة...'}
                                    </span>
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                </button>
                                {form.data.invoice_id && (
                                    <button
                                        type="button"
                                        title="إعادة تحميل عناصر الفاتورة"
                                        onClick={() => router.get('/invoice-returns/create', { customer_id: form.data.customer_id, invoice_id: form.data.invoice_id }, { preserveScroll: true, replace: true })}
                                        className="h-10 w-10 rounded-[2px] border border-brand/40 bg-brand/10 hover:bg-brand/20 text-brand flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Customer Debt info if any */}
                        {!isCash && originalDebt > 0 && (
                            <div className="p-2 rounded-[2px] bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate">
                                        الدين الحالي: {fmt(originalDebt)} د.ل
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cart Header with prominent Total Display */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/75 dark:bg-[#0e1726] shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-brand" />
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                                عناصر المرتجع
                            </span>
                            {items.length > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-[2px] bg-brand text-white font-bold text-[10px] flex items-center justify-center">
                                    {items.length}
                                </span>
                            )}
                        </div>
                        {/* Prominent Total Header Display */}
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span className="text-slate-500 dark:text-slate-400">الإجمالي:</span>
                            <span className="text-brand font-black text-sm">{fmt(grandTotal)} د.ل</span>
                        </div>
                    </div>

                    {/* Cart Items List / Table */}
                    <div className="flex-1 overflow-y-auto p-2.5 custom-scroll">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500 py-12 rounded-[2px] border border-dashed border-slate-200 dark:border-[#1d2d42] bg-slate-50/30 dark:bg-[#0c1421]/30">
                                <Package className="w-8 h-8 stroke-[1.5]" />
                                <span className="font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-400">سلة المرتجع فارغة</span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">اختر صنفاً من لوحة المنتجات لإضافته للمرتجع</span>
                            </div>
                        ) : (() => {
                            const groups = items.reduce((acc, item, idx) => {
                                const key = `${item.product_id}-${item.size_id ?? 'null'}-${item.sale_type}-${item.unit_price}`;
                                if (!acc[key]) {
                                    acc[key] = { ...item, count: 1, quantity: parseFloat(item.quantity), totalAmount: parseFloat(item.line_total), indices: [idx] };
                                } else {
                                    acc[key].count++;
                                    acc[key].quantity += parseFloat(item.quantity);
                                    acc[key].totalAmount += parseFloat(item.line_total);
                                    acc[key].indices.push(idx);
                                }
                                return acc;
                            }, {} as Record<string, any>);

                            return (
                                <div className="rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] overflow-hidden bg-white dark:bg-[#0c1421]">
                                    {/* Table Grid Header */}
                                    <div className="grid grid-cols-[48px_1fr_95px_70px_42px] gap-1.5 px-2.5 py-2 bg-slate-100/75 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-400 font-bold text-[11px] items-center">
                                        <span className="text-center">العدد</span>
                                        <span>المنتج</span>
                                        <span className="text-center">الحجم والسعر</span>
                                        <span className="text-center">الإجمالي</span>
                                        <span className="text-center">إجراء</span>
                                    </div>

                                    {/* Table Rows */}
                                    <div className="divide-y divide-slate-200/90 dark:divide-[#1d2d42]">
                                        {Object.values(groups).map((g: any, idx) => {
                                            const displayCount = g.sale_type === 'unit_based' ? g.quantity : g.count;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="grid grid-cols-[48px_1fr_95px_70px_42px] gap-1.5 px-2.5 py-2.5 items-center hover:bg-slate-50/80 dark:hover:bg-[#0e1828] transition-colors"
                                                >
                                                    {/* Count keypad button */}
                                                    <div className="flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                openPad(g.sale_type === 'unit_based' ? 'الكمية' : 'العدد', String(displayCount), newVal => {
                                                                    const newCount = parseInt(newVal) || 1;
                                                                    setItems(prev => {
                                                                        const without = prev.filter((_, i) => !g.indices.includes(i));
                                                                        const template = prev[g.indices[0]];
                                                                        if (g.sale_type === 'unit_based') {
                                                                            return [...without, { ...template, quantity: String(newCount), line_total: (parseFloat(template.unit_price) * newCount).toFixed(2) }];
                                                                        }
                                                                        return [...without, ...Array.from({ length: newCount }, () => ({ ...template }))];
                                                                    });
                                                                });
                                                            }}
                                                            className="h-9 w-10 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs active:scale-95"
                                                            title="تعديل العدد"
                                                        >
                                                            {displayCount}
                                                        </button>
                                                    </div>

                                                    {/* Product Details */}
                                                    <div className="min-w-0 flex flex-col justify-center py-0.5">
                                                        <span className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate">
                                                            {g.product_name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                            {saleTypeLabels[g.sale_type] ?? g.sale_type}
                                                        </span>
                                                    </div>

                                                    {/* Size & Price */}
                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                        {g.size_label ? (
                                                            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 px-1 py-0.2 rounded-[2px] truncate max-w-full">
                                                                {g.size_label}
                                                            </span>
                                                        ) : g.sale_type === 'full_bottle' ? (
                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1 py-0.2 rounded-[2px] truncate max-w-full">
                                                                {products.find(p => p.id === +g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                                            </span>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => openPad('السعر', g.unit_price, newVal => {
                                                                const newPrice = parseFloat(newVal);
                                                                if (newPrice <= 0) return;
                                                                setItems(prev => prev.map((item, i) =>
                                                                    g.indices.includes(i)
                                                                        ? { ...item, unit_price: newPrice.toFixed(2), line_total: resolveLineTotal(item.sale_type, newPrice, parseFloat(item.quantity)).toFixed(2) }
                                                                        : item
                                                                ));
                                                            })}
                                                            className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-brand cursor-pointer"
                                                        >
                                                            {g.unit_price} د.ل
                                                        </button>
                                                    </div>

                                                    {/* Total Amount */}
                                                    <div className="flex items-center justify-center">
                                                        <span className="font-black text-brand text-xs sm:text-sm">
                                                            {fmt(g.totalAmount)}
                                                        </span>
                                                    </div>

                                                    {/* Correct Sized Trash Action Button */}
                                                    <div className="flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setItems(prev => prev.filter((_, i) => !g.indices.includes(i)))}
                                                            title="حذف الصنف"
                                                            className="h-8 w-8 sm:h-9 sm:w-9 rounded-[2px] bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Notes Section at bottom of Right Panel */}
                    <div className="p-3 border-t border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                            ملاحظات على المرتجع
                        </label>
                        <textarea
                            value={form.data.notes}
                            onChange={e => form.setData('notes', e.target.value)}
                            rows={2}
                            placeholder="اكتب أي ملاحظات متعلقة بحالة البضاعة المرتجعة..."
                            className="w-full rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#111a29] px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-brand resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Layout with Tabs */}
            <div className="lg:hidden flex flex-col -m-4 h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-[#070d18]">
                {/* Mobile Top Bar */}
                <div className="flex flex-col border-b border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-[#1d2d42]">
                        <Link href="/invoice-returns" className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-brand font-bold text-xs transition-colors">
                            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                        </Link>
                        <span className="font-black text-slate-800 dark:text-white text-xs">مرتجع جديد</span>
                        <div className="w-8" />
                    </div>

                    {/* Customer & Invoice Inputs */}
                    <div className="p-3 flex flex-col gap-2">
                        <WorkstationCustomerSelect
                            selectedId={form.data.customer_id}
                            onSelect={id => {
                                form.setData('customer_id', id);
                                router.get('/invoice-returns/create', { customer_id: id, invoice_id: form.data.invoice_id }, { preserveScroll: true, replace: true });
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => openPad('رقم الفاتورة الأصلية', form.data.invoice_id, v => {
                                form.setData('invoice_id', v);
                                if (v) {
                                    router.get('/invoice-returns/create', { customer_id: form.data.customer_id, invoice_id: v }, { preserveScroll: true, replace: true });
                                }
                            })}
                            className="h-10 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between"
                        >
                            <span className={form.data.invoice_id ? 'font-mono' : 'text-slate-400'}>
                                {form.data.invoice_id ? `فاتورة مرجعية #${form.data.invoice_id}` : 'رقم الفاتورة الأصلية (اختياري)'}
                            </span>
                            <FileText className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Mobile Tabs */}
                <div className="flex border-b border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('products')}
                        className={`flex-1 flex items-center justify-center gap-2 h-11 font-bold text-xs transition-all relative ${activeTab === 'products' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <Package className="w-4 h-4" />
                        <span>المنتجات</span>
                        {items.length > 0 && (
                            <span className="w-4 h-4 rounded-[2px] bg-brand text-white text-[10px] font-black flex items-center justify-center">
                                {items.length}
                            </span>
                        )}
                        {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('payment')}
                        className={`flex-1 flex items-center justify-center gap-2 h-11 font-bold text-xs transition-all relative ${activeTab === 'payment' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <CreditCard className="w-4 h-4" />
                        <span>التسوية</span>
                        {activeTab === 'payment' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('confirm')}
                        className={`flex-1 flex items-center justify-center gap-2 h-11 font-bold text-xs transition-all relative ${activeTab === 'confirm' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <Check className="w-4 h-4" />
                        <span>تأكيد</span>
                        {activeTab === 'confirm' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                    </button>
                </div>

                {/* Mobile Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scroll">
                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <div className="flex flex-col p-3 gap-3">
                            {/* Product Selector */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">المنتج المراد إرجاعه</label>
                                <button
                                    type="button"
                                    onClick={() => setIsProductDropdownOpen(true)}
                                    className="h-11 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between"
                                >
                                    <span className="truncate">{selectedProduct ? selectedProduct.name : 'اختر المنتج...'}</span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>

                            {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
                                <button
                                    type="button"
                                    onClick={() => setShowSaleTypeModal(true)}
                                    className="h-11 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-xs font-bold flex items-center justify-between"
                                >
                                    <span>{saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}</span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </button>
                            )}

                            {needsSize && (
                                <SizeSelect
                                    sizes={sizes}
                                    selectedSizeId={selSize}
                                    onSizeSelect={id => { setSelSize(id); setSelUnitPrice(''); }}
                                    onPriceResolved={(def, min) => { setSelUnitPrice(def.toFixed(2)); setSelMinPrice(min); }}
                                    product={selectedProduct}
                                    isVip={false}
                                />
                            )}

                            {selectedProduct && (isTier || selSaleType) && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v))}
                                        className="h-11 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-sm font-black text-center"
                                    >
                                        العدد: {selQty || '1'}
                                    </button>
                                    {showPriceField && (
                                        <button
                                            type="button"
                                            onClick={() => openPad('سعر الوحدة', selUnitPrice, v => setSelUnitPrice(v))}
                                            className="h-11 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#111a29] text-sm font-black text-center"
                                        >
                                            السعر: {selUnitPrice || '0.00'}
                                        </button>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => { addToCart(); setActiveTab('payment'); }}
                                disabled={!canAdd}
                                className="h-12 rounded-[2px] bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                <Plus className="w-4 h-4" /> إضافة للمرتجع
                            </button>

                            {/* Mobile Items List */}
                            <div className="flex flex-col gap-2 pt-2">
                                {items.map((it, idx) => (
                                    <div key={idx} className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 dark:text-white text-xs">{it.product_name}</span>
                                            <span className="text-[10px] text-slate-500">{it.size_label || it.sale_type} • عدد: {it.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-brand text-xs">{it.line_total} د.ل</span>
                                            <button
                                                type="button"
                                                onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                                className="w-7 h-7 rounded-[2px] bg-rose-500/10 text-rose-600 flex items-center justify-center"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment Tab */}
                    {activeTab === 'payment' && (
                        <div className="p-3 flex flex-col gap-3">
                            <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-2">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                    <span>إجمالي المرتجع</span>
                                    <span className="font-black text-slate-900 dark:text-white text-sm">{fmt(grandTotal)} د.ل</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <span>التسوية (المدفوع)</span>
                                    <span className="font-black text-sm">{fmt(totalRecovered)} د.ل</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-100 dark:border-[#172437]">
                                    <span>المتبقي</span>
                                    <span className={`font-black text-sm ${(grandTotal - totalRecovered) > 0.01 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {fmt(grandTotal - totalRecovered)} د.ل
                                    </span>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="grid grid-cols-2 gap-2">
                                {paymentMethods.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setSelMethod(selMethod === String(m.id) ? '' : String(m.id))}
                                        className={`h-11 rounded-[2px] text-xs font-bold border transition-colors ${
                                            selMethod === String(m.id)
                                                ? 'bg-brand text-white border-brand'
                                                : 'bg-white dark:bg-[#0c1421] border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        {m.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => openPad('المبلغ', selAmount || (grandTotal - totalRecovered).toFixed(2), v => setSelAmount(v), grandTotal - totalRecovered)}
                                    className="h-11 flex-1 px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-sm font-black text-center"
                                >
                                    {selAmount || (grandTotal - totalRecovered).toFixed(2)} د.ل
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selMethod || !selAmount || +selAmount <= 0) return;
                                        setSettlements(prev => {
                                            const existing = prev.findIndex(p => p.payment_method_id === selMethod);
                                            if (existing !== -1) return prev.map((p, i) => i === existing ? { ...p, amount: (+p.amount + +selAmount).toFixed(2) } : p);
                                            return [...prev.filter(p => p.payment_method_id), { payment_method_id: selMethod, amount: selAmount, notes: '' }];
                                        });
                                        setSelMethod('');
                                        setSelAmount('');
                                    }}
                                    disabled={!selMethod || !selAmount}
                                    className="h-11 px-4 rounded-[2px] bg-brand text-white font-bold text-xs disabled:opacity-40"
                                >
                                    إضافة تسوية
                                </button>
                            </div>

                            {/* Settlements list */}
                            <div className="flex flex-col gap-1.5">
                                {settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).map((s, idx) => (
                                    <div key={idx} className="p-2.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {paymentMethods.find(m => String(m.id) === s.payment_method_id)?.name}: {s.amount} د.ل
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSettlements(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-rose-500 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Confirm Tab */}
                    {activeTab === 'confirm' && (
                        <div className="p-3 flex flex-col gap-3">
                            <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-[#1d2d42] flex flex-col gap-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500">العميل:</span>
                                    <span className="text-slate-800 dark:text-white">{selectedCustomerLabel}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500">الأصناف:</span>
                                    <span className="text-slate-800 dark:text-white">{items.length} صنف</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500">إجمالي المرتجع:</span>
                                    <span className="text-brand font-black">{fmt(grandTotal)} د.ل</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500">المبلغ المسوى:</span>
                                    <span className="text-emerald-600 font-black">{fmt(totalRecovered)} د.ل</span>
                                </div>
                            </div>

                            <textarea
                                value={form.data.notes}
                                onChange={e => form.setData('notes', e.target.value)}
                                rows={2}
                                placeholder="ملاحظات..."
                                className="w-full rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] p-2 text-xs"
                            />

                            <button
                                type="button"
                                onClick={submit}
                                disabled={form.processing || items.length === 0 || (isCash && settlements.filter(s => s.payment_method_id).length === 0)}
                                className="h-12 rounded-[2px] bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                <Check className="w-4 h-4" /> حفظ وتأكيد المرتجع
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>

        {/* Modals */}
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
            onConfirm={v => {
                padCallback?.(v);
                setShowPad(false);
            }}
        />

        <ConfirmModal
            isOpen={showCreditConfirm}
            title="إتمام العملية بالآجل"
            description={`يوجد مبلغ متبقي (${fmt(grandTotal - totalRecovered)} د.ل)، هل أنت متأكد من حفظ المعاملة بالآجل؟`}
            confirmText="تأكيد وحفظ"
            onConfirm={executeSubmit}
            onCancel={() => setShowCreditConfirm(false)}
        />

        {/* ══ WORKSTATION PAYMENT / SETTLEMENT DRAWER (طِبق الأصل من صفحة إنشاء الفاتورة) ══ */}
        {showPaymentDrawer && createPortal(
            <div className="fixed inset-0 z-[9990] flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                <div onClick={() => setShowPaymentDrawer(false)} className="absolute inset-0 cursor-pointer" />

                {/* Workstation Sheet Container */}
                <div className="relative z-10 w-full max-w-5xl mx-auto bg-white dark:bg-[#0c1421] border-t border-x border-slate-200/90 dark:border-[#1d2d42] rounded-t-[2px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom duration-200">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-[2px] bg-brand/10 border border-brand/25 text-brand flex items-center justify-center shrink-0">
                                <Wallet className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">إتمام عملية تسوية المرتجع والسداد</h3>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    العميل: <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCustomerLabel}</span> ({isCash ? 'زبون نقدي' : 'زبون آجل'})
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

                    {/* Totals Summary Strip - 4 Cards Matching Invoice */}
                    <div className="px-5 py-3.5 border-b border-slate-200/90 dark:border-[#19273b] bg-slate-100/70 dark:bg-[#09111c] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xs flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">إجمالي المرتجع</span>
                            <span className="text-sm sm:text-base font-number font-black text-slate-900 dark:text-white tabular-nums">{fmt(grandTotal)} د.ل</span>
                        </div>

                        <div className="p-3 rounded-[2px] bg-brand/10 border border-brand/25 shadow-2xs flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-brand uppercase tracking-wider">التسوية (المدفوع)</span>
                            <span className="text-sm sm:text-base font-number font-black text-brand tabular-nums">{fmt(totalRecovered)} د.ل</span>
                        </div>

                        <div className={`p-3 rounded-[2px] border shadow-2xs flex flex-col gap-0.5 ${
                            (grandTotal - totalRecovered) > 0.01
                                ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                : 'bg-white dark:bg-[#0c1421] border-slate-200/90 dark:border-[#1d2d42] text-slate-500 dark:text-slate-400'
                        }`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider">المتبقي</span>
                            <span className={`text-sm sm:text-base font-number font-black tabular-nums ${(grandTotal - totalRecovered) > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                {(grandTotal - totalRecovered) > 0.01 ? `${fmt(grandTotal - totalRecovered)} د.ل` : '0.00 د.ل (خالص)'}
                            </span>
                        </div>

                        {!isCash && grandTotal > 0 && originalDebt > 0 && (
                            <div className="p-3 rounded-[2px] bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30 shadow-2xs flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">الدين بعد الإرجاع</span>
                                <span className={`text-sm sm:text-base font-number font-black tabular-nums ${debtAfterReturn > originalDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {fmt(debtAfterReturn)} د.ل
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Body Grid */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col lg:flex-row gap-5 sm:gap-6 custom-scroll">
                        {/* Left Col — Select Payment Method */}
                        <div className="flex flex-col gap-3.5 w-full lg:w-1/2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                اختر طريقة التسوية والمبلغ المسترد
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {paymentMethods.map(m => {
                                    const methodId = String(m.id);
                                    const isSelected = selMethod === methodId;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                                const rem = grandTotal - totalRecovered;
                                                if (isSelected) {
                                                    setSelMethod('');
                                                    setSelAmount('');
                                                } else {
                                                    setSelMethod(methodId);
                                                    setSelAmount(rem > 0 ? rem.toFixed(2) : '');
                                                }
                                            }}
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
                                    onClick={() => {
                                        const rem = grandTotal - totalRecovered;
                                        openPad('المبلغ المسترد', selAmount || (rem > 0 ? rem.toFixed(2) : '0.00'), v => setSelAmount(v), rem > 0 ? rem : undefined);
                                    }}
                                    className="flex-1 h-13 sm:h-14 rounded-[2px] px-4 font-number font-black text-base sm:text-lg flex items-center justify-between cursor-pointer border border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] text-slate-900 dark:text-white hover:border-brand transition-colors shadow-2xs"
                                >
                                    <span className="text-slate-900 dark:text-white">{selAmount || (grandTotal - totalRecovered > 0 ? (grandTotal - totalRecovered).toFixed(2) : '0.00')} د.ل</span>
                                    <span className="text-[10px] font-sans font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 px-2 py-0.5 rounded-[2px]">لوحة الأرقام</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selMethod || !selAmount || +selAmount <= 0) return;
                                        const rem = grandTotal - totalRecovered;
                                        if (+selAmount > rem + 0.001) {
                                            alert(`المبلغ يتجاوز المتبقي (${rem.toFixed(2)} د.ل)`);
                                            return;
                                        }
                                        const method = paymentMethods.find(m => m.id === +selMethod);
                                        if (!method) return;
                                        setSettlements(prev => {
                                            const existing = prev.findIndex(p => p.payment_method_id === selMethod);
                                            if (existing !== -1) {
                                                return prev.map((p, i) => i === existing ? { ...p, amount: (+p.amount + +selAmount).toFixed(2) } : p);
                                            }
                                            return [...prev.filter(p => p.payment_method_id), { payment_method_id: selMethod, amount: selAmount, notes: '' }];
                                        });
                                        setSelMethod('');
                                        setSelAmount('');
                                    }}
                                    disabled={!selMethod || !selAmount}
                                    className="h-13 sm:h-14 px-5 sm:px-6 rounded-[2px] bg-brand hover:bg-brand/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs cursor-pointer transition-all shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>إضافة تسوية</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Col — Registered Settlements Cards */}
                        <div className="flex flex-col gap-2.5 w-full lg:w-1/2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                التسويات المسجلة في المرتجع
                            </label>

                            {settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center min-h-[140px] text-slate-400 dark:text-slate-500 text-xs font-bold border border-dashed border-slate-200 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#09111c] rounded-[2px] p-6 text-center">
                                    لم يتم تسجيل أي تسوية بعد — حدد طريقة التسوية والمبلغ ثم اضغط «إضافة تسوية»
                                </div>
                            ) : (
                                settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).map((p, idx) => {
                                    const method = paymentMethods.find(m => String(m.id) === p.payment_method_id);
                                    const originalIndex = settlements.findIndex(s => s === p);
                                    return (
                                        <div key={idx} className="p-3.5 rounded-[2px] bg-slate-50/80 dark:bg-[#0a121e] border border-slate-200/90 dark:border-[#1d2d42] flex items-center justify-between gap-3 shadow-2xs">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openPad(`تعديل مبلغ (${method?.name})`, p.amount, v => {
                                                        setSettlements(prev => prev.map((s, i) => i === originalIndex ? { ...s, amount: v } : s));
                                                    })}
                                                    className="w-9 h-9 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                                                    title="تعديل القيمة"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="font-bold text-sky-600 dark:text-sky-400 text-xs px-2 py-0.5 rounded-[2px] bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 shrink-0">
                                                        {method?.name}
                                                    </span>
                                                    <span className="font-number font-black text-slate-900 dark:text-white text-base sm:text-lg truncate">
                                                        {p.amount} د.ل
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSettlements(prev => prev.filter((_, i) => i !== originalIndex))}
                                                className="w-11 h-11 rounded-[2px] border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                                                title="حذف التسوية"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Footer / Submit CTA Matching Invoices/PaymentDrawer */}
                    <div className="px-5 pt-3.5 pb-5 sm:pb-6 border-t border-slate-200/90 dark:border-[#19273b] bg-slate-50 dark:bg-[#0a121e] flex flex-col gap-2.5 shrink-0">
                        {isCash && (grandTotal - totalRecovered) > 0.01 && (
                            <div className="px-3.5 py-2 rounded-[2px] bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 font-bold text-xs text-center">
                                ⚠️ زبون نقدي — يجب تسوية المبلغ بالكامل ({fmt(grandTotal - totalRecovered)} د.ل) قبل تأكيد المرتجع
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => { setShowPaymentDrawer(false); submit(); }}
                            disabled={form.processing || items.length === 0 || (isCash && settlements.filter(s => s.payment_method_id).length === 0)}
                            className="h-20 sm:h-22 mb-2 sm:mb-3 rounded-[2px] bg-brand hover:opacity-95 text-white font-black text-lg sm:text-xl w-full flex items-center justify-between px-8 shadow-md transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <Wallet className="w-6 h-6" />
                                <span>تأكيد وحفظ المرتجع</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm sm:text-base font-bold bg-white/20 px-3.5 py-1.5 rounded-[2px]">
                                    المسوى: {fmt(totalRecovered)} د.ل
                                </span>
                                <Check className="w-6 h-6" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        </>
    );
}
