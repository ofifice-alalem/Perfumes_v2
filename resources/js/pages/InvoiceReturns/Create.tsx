import { useState, useEffect } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, User, AlertCircle,
} from 'lucide-react';

interface Customer      { id: number; name: string; total_debt: string; }
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

const emptySettlement = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

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

export default function InvoiceReturnsCreate({ customers, products, sizes, paymentMethods, selected_customer_id, selected_invoice_id, invoice_items, flash }: Props) {
    const [items,       setItems]       = useState<ItemRow[]>([]);
    const [settlements, setSettlements] = useState<SettlementRow[]>([]);
    const [resetKey,    setResetKey]    = useState(0);

    // product selection state
    const [selProduct,   setSelProduct]   = useState('');
    const [selSaleType,  setSelSaleType]  = useState('');
    const [selSize,      setSelSize]      = useState('');
    const [selQty,       setSelQty]       = useState('1');
    const [selUnitPrice, setSelUnitPrice] = useState('');
    const [selMinPrice,  setSelMinPrice]  = useState(0);

    // modals
    const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);
    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    // payment state
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

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max);
        setPadCallback(() => cb); setShowPad(true);
    }

    // تحميل عناصر الفاتورة الأصلية عند وجودها
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

    // ── derived ──────────────────────────────────────────────────────────────
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

    // auto-select sale type
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

    function getCartConsumed(productId: number) {
        return items.filter(i => +i.product_id === productId).reduce((s, i) => s + +i.quantity, 0);
    }
    const availableStock = selectedProduct ? +selectedProduct.stock + getCartConsumed(selectedProduct.id) : 0;

    const maxCount: number | undefined = undefined;

    const previewQty   = selectedProduct && (isTier ? selSize : selSaleType)
        ? resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes) : null;
    const previewCount = effectiveST === 'unit_based' ? (+selQty || 1) : (parseInt(selQty) || 1);
    const previewPrice = selUnitPrice && +selUnitPrice >= selMinPrice ? +selUnitPrice : null;
    const previewTotal = previewPrice !== null && previewQty !== null && previewQty > 0
        ? resolveLineTotal(effectiveST, previewPrice, previewQty) * (effectiveST === 'unit_based' ? 1 : previewCount)
        : null;

    const canAdd = !!(selectedProduct
        && (isTier ? (!needsSize || selSize) : selSaleType)
        && (!needsSize || selSize)
        && (!needsQty || selQty)
        && selUnitPrice && +selUnitPrice >= selMinPrice);

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
        setResetKey(k => k + 1);
    }
    
    const isCash        = form.data.customer_id === '1';
    const customer       = customers.find(c => String(c.id) === form.data.customer_id);
    const grandTotal     = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);
    const totalRecovered = settlements.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const originalDebt   = customer ? parseFloat(customer.total_debt) || 0 : 0;
    const debtAfterReturn = !isCash ? originalDebt - grandTotal + totalRecovered : 0;

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

    // تحديث قيمة التسوية تلقائياً
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

    const customerOptions = customers.map(c => ({
        label: c.name,
        badge: c.id === 1 ? 'نقدي' : undefined,
        meta:  c.id !== 1 && c.total_debt ? `دين: ${parseFloat(c.total_debt).toFixed(2)}` : undefined,
    }));
    const productOptions = products.map(p => ({ label: p.name, badge: p.category.name, meta: `${p.stock}` }));

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

    return (
        <>
        <AppShell pageTitle="مرتجع جديد">
            {/* Desktop Layout */}
            <div className="hidden lg:flex flex-row gap-0 -m-4 lg:-m-10 h-[calc(100dvh-120px)] overflow-hidden">

                {/* ══ LEFT PANEL ══ */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">

                    {/* Top bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <Link href="/invoice-returns" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
                                <ChevronLeft className="w-4 h-4" /> مرتجعات الفواتير
                            </Link>
                            <span className="text-slate-300 dark:text-white/10">/</span>
                            <span className="font-black text-slate-800 dark:text-white text-sm">مرتجع جديد</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {flash?.error && <span className="text-xs font-bold text-red-500">{flash.error}</span>}
                        </div>
                    </div>

                    {/* Customer & Invoice bar */}
                    <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <ModernSelect label="" options={customerOptions} defaultValue={selectedCustomerLabel}
                                        onSelect={val => {
                                            const c = customers.find(c => c.name === val);
                                            const id = c ? String(c.id) : '1';
                                            router.get('/invoice-returns/create', { customer_id: id }, { preserveScroll: true, replace: true });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[160px]">
                                <input type="number" min="1"
                                    value={form.data.invoice_id}
                                    onChange={e => form.setData('invoice_id', e.target.value)}
                                    placeholder="رقم الفاتورة (اختياري)"
                                    className="spatial-input h-11 rounded-[14px] px-4 text-sm font-bold w-full" />
                            </div>
                        </div>
                    </div>

                    {/* Add product form */}
                    <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج للمرتجع</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Row 1: product + sale type toggle + qty + preview */}
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[180px]">
                                    <ModernSelect key={`p-${resetKey}`} label="" placeholder="اختر المنتج..."
                                        options={productOptions}
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
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[16px] font-bold w-44 cursor-pointer hover:border-primary/40 transition-all flex items-center justify-between">
                                        <span className="truncate">{saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}</span>
                                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                )}

                                {/* qty / count input */}
                                {selectedProduct && (isTier || selSaleType) && (
                                    <button onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v))}
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[18px] font-black w-24 text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95">
                                        {selQty || '1'}
                                    </button>
                                )}

                                {/* preview chips */}
                                {previewTotal !== null && previewQty !== null && previewQty > 0 && (
                                    <div className="flex gap-2">
                                        <div className="flex items-center justify-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">سعر</span>
                                            <span className="font-black text-primary text-sm mr-1">{previewPrice?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">إجمالي</span>
                                            <span className="font-black text-primary text-sm mr-1">{fmt(previewTotal)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Row 2: sizes */}
                            {needsSize && (
                                <div className="w-full">
                                    <SizeSelect sizes={sizes} selectedSizeId={selSize}
                                        onSizeSelect={id => { setSelSize(id); setSelUnitPrice(''); }}
                                        onPriceResolved={(def, min) => { setSelUnitPrice(def.toFixed(2)); setSelMinPrice(min); }}
                                        product={selectedProduct} isVip={false} />
                                </div>
                            )}

                            {/* Row 3: unit price + add button */}
                            {showPriceField && (
                                <div className="flex flex-wrap gap-3 items-end">
                                    <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                            سعر الوحدة
                                            {selMinPrice > 0 && (
                                                <span className="mr-1 text-slate-400 dark:text-white/30 normal-case font-bold">
                                                    (حد أدنى: {selMinPrice.toFixed(2)})
                                                </span>
                                            )}
                                        </label>
                                        <button
                                            onClick={() => openPad(`سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`, selUnitPrice, v => setSelUnitPrice(v))}
                                            className={`h-14 rounded-[20px] px-5 text-[18px] font-black w-full text-center cursor-pointer transition-all spatial-input active:scale-95 ${
                                                selUnitPrice && +selUnitPrice < selMinPrice
                                                    ? 'border-red-500/60 text-red-500'
                                                    : 'hover:border-primary/40'
                                            }`}>
                                            {selUnitPrice || '0.00'}
                                        </button>
                                        {selUnitPrice && +selUnitPrice < selMinPrice && (
                                            <span className="text-[10px] font-bold text-red-500">أقل من الحد الأدنى</span>
                                        )}
                                    </div>
                                    <button onClick={addToCart} disabled={!canAdd}
                                        className="spatial-button flex items-center justify-center gap-3 px-8 h-14 text-lg font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                                        <Plus className="w-6 h-6" /> إضافة
                                    </button>
                                </div>
                            )}

                            {/* Stock warning removed — returns add to stock */}
                        </div>
                    </div>
                    {/* Totals + Payment section */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                        {/* Totals */}
                        <div className="flex flex-col gap-2 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                            {[
                                { label: 'إجمالي المرتجع', value: grandTotal.toFixed(2), cls: 'text-slate-800 dark:text-white text-lg font-black' },
                                { label: 'التسوية', value: totalRecovered.toFixed(2), cls: 'text-emerald-600 dark:text-emerald-400 font-bold' },
                                { label: 'المتبقي', value: (grandTotal - totalRecovered).toFixed(2), cls: (grandTotal - totalRecovered) > 0.01 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-white/30 font-bold' },
                            ].map(({ label, value, cls }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500 dark:text-white/40">{label}</span>
                                    <span className={cls}>{value}</span>
                                </div>
                            ))}
                            {!isCash && grandTotal > 0 && originalDebt > 0 && (
                                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                    <span className="text-sm font-bold text-slate-500 dark:text-white/40">الدين الأصلي</span>
                                    <span className="font-bold text-slate-600 dark:text-white/60">
                                        {originalDebt.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {!isCash && grandTotal > 0 && originalDebt > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500 dark:text-white/40">الدين بعد الإرجاع</span>
                                    <span className={`font-bold ${debtAfterReturn > originalDebt ? 'text-red-500' : debtAfterReturn < originalDebt ? 'text-emerald-500' : 'text-slate-600'}`}>
                                        {debtAfterReturn.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {/* Payment section */}
                        {grandTotal > 0 && (
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
                                            onClick={() => {
                                                const remaining = grandTotal - totalRecovered;
                                                openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining);
                                            }}
                                            className="spatial-input flex-1 h-16 rounded-[20px] px-4 text-[18px] font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                                            {selAmount || (grandTotal - totalRecovered).toFixed(2)}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!selMethod || !selAmount || +selAmount <= 0) return;
                                                const remaining = grandTotal - totalRecovered;
                                                if (+selAmount > remaining) {
                                                    alert(`المبلغ يتجاوز المتبقي (${remaining.toFixed(2)})`);
                                                    return;
                                                }
                                                const method = paymentMethods.find(m => m.id === +selMethod);
                                                if (!method) return;
                                                setSettlements(prev => {
                                                    const existing = prev.findIndex(p => p.payment_method_id === selMethod);
                                                    if (existing !== -1) {
                                                        return prev.map((p, i) => i === existing
                                                            ? { ...p, amount: (+p.amount + +selAmount).toFixed(2) }
                                                            : p
                                                        );
                                                    }
                                                    return [...prev.filter(p => p.payment_method_id), { payment_method_id: selMethod, amount: selAmount, notes: '' }];
                                                });
                                                setSelMethod('');
                                                setSelAmount('');
                                            }}
                                            disabled={!selMethod || !selAmount}
                                            className="spatial-button flex items-center justify-center w-20 h-16 disabled:opacity-40 shrink-0">
                                            <Plus className="w-7 h-7" />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* يمين — كاردات الدفعات */}
                                <div className="flex flex-col gap-2 w-1/2">
                                    {settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center h-full text-slate-300 dark:text-white/20 font-bold text-sm">لا توجد تسويات</div>
                                    ) : (
                                        settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).map((p, idx) => {
                                            const method = paymentMethods.find(m => String(m.id) === p.payment_method_id);
                                            const originalIndex = settlements.findIndex(s => s === p);
                                            return (
                                                <div key={idx} className="flex items-center gap-3 px-4 h-[70px] rounded-[18px] bg-emerald-500/10 border-2 border-emerald-500/20">
                                                    <CreditCard className="w-5 h-5 text-emerald-500 shrink-0" />
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{method?.name}</span>
                                                        <span className="font-black text-slate-800 dark:text-white text-lg">{p.amount}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSettlements(prev => prev.filter((_, i) => i !== originalIndex))}
                                                        className="w-12 h-12 rounded-[14px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit buttons */}
                    <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0">
                        {isCash && grandTotal > 0 && settlements.filter(s => s.payment_method_id).length === 0 && (
                            <div className="px-4 py-2 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs mb-2">
                                ⚠️ زبون نقدي — يجب إضافة تسوية قبل التأكيد
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Link href="/invoice-returns" className="h-[68px] flex items-center justify-center gap-2 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/10 dark:border-white/20 w-1/4">
                                <X className="w-4 h-4" /> إلغاء
                            </Link>
                            <button onClick={submit}
                                disabled={form.processing || items.every(i => !i.product_id) || !form.data.customer_id || (isCash && settlements.filter(s => s.payment_method_id).length === 0)}
                                className="spatial-button flex-1 flex items-center justify-center gap-2 text-lg font-black disabled:opacity-40 h-[68px]">
                                <Check className="w-6 h-6" />
                                {grandTotal > 0 ? `تأكيد المرتجع — ${grandTotal.toFixed(2)}` : 'تأكيد المرتجع'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT PANEL ══ */}
                <div className="w-full lg:w-[600px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-primary" />
                            <span className="font-black text-slate-800 dark:text-white text-sm">
                                عناصر المرتجع
                                {items.filter(i => parseFloat(i.line_total) > 0).length > 0 && (
                                    <span className="mr-2 text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        {items.filter(i => parseFloat(i.line_total) > 0).length}
                                    </span>
                                )}
                            </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-white/30">{selectedCustomerLabel}</span>
                    </div>

                    {/* Cart items */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                                <Package className="w-12 h-12" />
                                <span className="font-bold text-sm">لا توجد منتجات</span>
                                <span className="text-xs">أضف منتجات للمرتجع</span>
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
                                        const displayCount = g.sale_type === 'unit_based' ? g.quantity : g.count;
                                        return (
                                        <div key={idx} className="grid grid-cols-[60px_2fr_70px_80px_90px_50px] gap-2 px-3 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-sm">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => {
                                                        const p = products.find(p => p.id === +g.product_id);
                                                        const cartMax = g.sale_type === 'unit_based' ? undefined
                                                            : (() => {
                                                                const consumed = items.filter((_, i) => !g.indices.includes(i)).filter(i => i.product_id === g.product_id).reduce((s, i) => s + +i.quantity, 0);
                                                                const stock = p ? +p.stock + consumed + (parseFloat(g.quantity) * g.count) : 0;
                                                                return parseFloat(g.quantity) > 0 ? Math.floor(stock / parseFloat(g.quantity)) : 0;
                                                            })();
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
                                                        }, cartMax);
                                                    }}
                                                    className="w-14 h-12 rounded-[12px] bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-primary/50 font-black text-base text-slate-800 dark:text-white transition-all cursor-pointer active:scale-95">
                                                    {displayCount}
                                                </button>
                                            </div>
                                            <div className="min-w-0 flex flex-col justify-center">
                                                <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{g.product_name}</span>
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{saleTypeLabels[g.sale_type] ?? g.sale_type}</span>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                {g.size_label
                                                    ? <span className="text-xs font-black text-white bg-primary px-2 py-1 rounded-full">{g.size_label}</span>
                                                    : g.sale_type === 'full_bottle'
                                                        ? <span className="text-xs font-black text-white bg-emerald-500 px-2 py-1 rounded-full">
                                                            {products.find(p => p.id === +g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                                          </span>
                                                        : <span className="text-slate-400 text-sm">—</span>}
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => openPad('السعر', g.unit_price, newVal => {
                                                        const p = products.find(p => p.id === +g.product_id);
                                                        const newPrice = parseFloat(newVal);
                                                        if (!p || newPrice <= 0) return;
                                                        setItems(prev => prev.map((item, i) =>
                                                            g.indices.includes(i)
                                                                ? { ...item, unit_price: newPrice.toFixed(2), line_total: resolveLineTotal(item.sale_type, newPrice, parseFloat(item.quantity)).toFixed(2) }
                                                                : item
                                                        ));
                                                    })}
                                                    className="w-full h-12 rounded-[12px] bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-primary/50 font-black text-sm text-slate-800 dark:text-white transition-all cursor-pointer active:scale-95">
                                                    {g.unit_price}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <span className="font-black text-slate-800 dark:text-white text-base">{g.totalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => setItems(prev => prev.filter((_, i) => !g.indices.includes(i)))}
                                                    className="w-10 h-10 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-95">
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

                    {/* Notes section */}
                    <div className="px-4 pb-3 border-t border-black/5 dark:border-white/5 shrink-0 pt-3">
                        <textarea
                            value={form.data.notes}
                            onChange={e => form.setData('notes', e.target.value)}
                            rows={3}
                            placeholder="ملاحظات على المرتجع... (اختياري)"
                            className="w-full spatial-input rounded-[16px] px-4 py-3 text-sm font-bold resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Layout with Tabs */}
            <div className="lg:hidden flex flex-col -m-4 h-[calc(100vh-80px)] overflow-hidden">

                {/* Top Bar */}
                <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
                        <Link href="/invoice-returns" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-xs">
                            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                        </Link>
                        <span className="font-black text-slate-800 dark:text-white text-xs">مرتجع جديد</span>
                        <div className="w-10" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <ModernSelect label="" options={customerOptions} defaultValue={selectedCustomerLabel}
                                onSelect={val => {
                                    const c = customers.find(c => c.name === val);
                                    const id = c ? String(c.id) : '1';
                                    router.get('/invoice-returns/create', { customer_id: id }, { preserveScroll: true, replace: true });
                                }}
                            />
                        </div>
                        <div className="w-32">
                            <input type="number" min="1"
                                value={form.data.invoice_id}
                                onChange={e => form.setData('invoice_id', e.target.value)}
                                placeholder="رقم الفاتورة"
                                className="spatial-input h-9 rounded-[10px] px-3 text-xs font-bold w-full" />
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 shrink-0">
                    <button onClick={() => setActiveTab('products')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${activeTab === 'products' ? 'text-primary' : 'text-slate-400 dark:text-white/40'}`}>
                        <Package className="w-4 h-4" />
                        <span>المنتجات</span>
                        {items.length > 0 && (
                            <span className="absolute top-2 left-1/2 -translate-x-1/2 translate-x-6 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                                {items.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)}
                            </span>
                        )}
                        {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                    <button onClick={() => setActiveTab('payment')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${activeTab === 'payment' ? 'text-primary' : 'text-slate-400 dark:text-white/40'}`}>
                        <CreditCard className="w-4 h-4" />
                        <span>التسوية</span>
                        {activeTab === 'payment' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                    <button onClick={() => setActiveTab('confirm')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${activeTab === 'confirm' ? 'text-primary' : 'text-slate-400 dark:text-white/40'}`}>
                        <Check className="w-4 h-4" />
                        <span>تأكيد</span>
                        {activeTab === 'confirm' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <div className="flex flex-col">
                            <div className="px-3 py-3 border-b border-black/5 dark:border-white/5">
                                <div className="flex flex-col gap-2.5">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">المنتج</label>
                                        <ModernSelect key={`p-mob-${resetKey}`} label="" placeholder="اختر المنتج..."
                                            options={productOptions} defaultValue=""
                                            onSelect={val => {
                                                const p = products.find(p => p.name === val);
                                                setSelProduct(p ? String(p.id) : '');
                                                setSelSaleType(''); setSelSize(''); setSelQty('1');
                                            }}
                                        />
                                    </div>
                                    {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">نوع البيع</label>
                                            <button onClick={() => setShowSaleTypeModal(true)}
                                                className="spatial-input h-12 rounded-[14px] px-3 text-sm font-bold w-full cursor-pointer flex items-center justify-between">
                                                <span>{saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}</span>
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </button>
                                        </div>
                                    )}
                                    {needsSize && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">الحجم</label>
                                            <SizeSelect sizes={sizes} selectedSizeId={selSize}
                                                onSizeSelect={id => { setSelSize(id); setSelUnitPrice(''); }}
                                                onPriceResolved={(def, min) => { setSelUnitPrice(def.toFixed(2)); setSelMinPrice(min); }}
                                                product={selectedProduct} isVip={false} />
                                        </div>
                                    )}
                                    {selectedProduct && (isTier || selSaleType) && (
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">{needsQty ? 'الكمية' : 'العدد'}</label>
                                                <button onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v))}
                                                    className="spatial-input h-12 rounded-[14px] px-3 text-base font-black w-full text-center cursor-pointer active:scale-95">
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
                                    {showPriceField && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1.5 block">
                                                سعر الوحدة{selMinPrice > 0 && <span className="mr-1 text-slate-400 normal-case"> (حد أدنى: {selMinPrice.toFixed(2)})</span>}
                                            </label>
                                            <button onClick={() => openPad(`سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`, selUnitPrice, v => setSelUnitPrice(v))}
                                                className={`h-12 rounded-[14px] px-4 text-base font-black w-full text-center cursor-pointer transition-all spatial-input active:scale-95 ${
                                                    selUnitPrice && +selUnitPrice < selMinPrice ? 'border-red-500/60 text-red-500' : 'hover:border-primary/40'
                                                }`}>
                                                {selUnitPrice || '0.00'}
                                            </button>
                                            {selUnitPrice && +selUnitPrice < selMinPrice && (
                                                <span className="text-[10px] font-bold text-red-500 mt-1 block">أقل من الحد الأدنى</span>
                                            )}
                                        </div>
                                    )}
                                    <button onClick={() => { addToCart(); setActiveTab('payment'); }}
                                        disabled={!canAdd}
                                        className="spatial-button w-full flex items-center justify-center gap-2 h-14 text-lg font-black disabled:opacity-40 active:scale-95 mt-2">
                                        <Plus className="w-5 h-5" /> إضافة للمرتجع
                                    </button>
                                </div>
                            </div>
                            {/* Items list */}
                            <div className="px-3 py-3">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-300 dark:text-white/20">
                                        <ShoppingCart className="w-12 h-12" />
                                        <span className="font-bold text-sm">لا توجد منتجات</span>
                                    </div>
                                ) : (() => {
                                    const groups = items.reduce((acc, item, idx) => {
                                        const key = `${item.product_id}-${item.size_id ?? 'null'}-${item.sale_type}-${item.unit_price}`;
                                        if (!acc[key]) acc[key] = { ...item, count: 1, quantity: parseFloat(item.quantity), totalAmount: parseFloat(item.line_total), indices: [idx] };
                                        else { acc[key].count++; acc[key].quantity += parseFloat(item.quantity); acc[key].totalAmount += parseFloat(item.line_total); acc[key].indices.push(idx); }
                                        return acc;
                                    }, {} as Record<string, any>);
                                    return (
                                        <div className="flex flex-col gap-2">
                                            {Object.values(groups).map((g: any, idx) => {
                                                const displayCount = g.sale_type === 'unit_based' ? g.quantity : g.count;
                                                return (
                                                    <div key={idx} className="flex flex-col gap-2 p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">{g.product_name}</h3>
                                                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{saleTypeLabels[g.sale_type] ?? g.sale_type}</p>
                                                            </div>
                                                            <button onClick={() => setItems(prev => prev.filter((_, i) => !g.indices.includes(i)))}
                                                                className="w-9 h-9 rounded-[10px] bg-red-500 text-white flex items-center justify-center active:scale-95 shrink-0">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700">
                                                                <span className="text-[10px] font-bold text-slate-500">عدد:</span>
                                                                <span className="font-black text-sm text-slate-800 dark:text-white">{displayCount}</span>
                                                            </div>
                                                            {g.size_label ? <span className="text-[10px] font-black text-white bg-primary px-2 py-1 rounded-full">{g.size_label}</span> : null}
                                                            <button onClick={() => openPad('السعر', g.unit_price, newVal => {
                                                                const newPrice = parseFloat(newVal);
                                                                if (newPrice <= 0) return;
                                                                setItems(prev => prev.map((item, i) => g.indices.includes(i)
                                                                    ? { ...item, unit_price: newPrice.toFixed(2), line_total: resolveLineTotal(item.sale_type, newPrice, parseFloat(item.quantity)).toFixed(2) }
                                                                    : item
                                                                ));
                                                            })} className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-primary/50 active:scale-95">
                                                                <span className="text-[10px] font-bold text-slate-500">سعر:</span>
                                                                <span className="font-bold text-sm text-slate-800 dark:text-white">{g.unit_price}</span>
                                                            </button>
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
                            <div className="px-3 py-3 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                                <div className="flex flex-col gap-2 p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                    <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                                        <span className="text-xs font-bold text-slate-500 dark:text-white/40">إجمالي المرتجع</span>
                                        <span className="text-2xl font-black text-primary">{grandTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">التسوية</span>
                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalRecovered.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                        <span className="text-sm font-bold text-slate-600 dark:text-white/60">المتبقي</span>
                                        <span className={`text-2xl font-black ${(grandTotal - totalRecovered) > 0.01 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>{(grandTotal - totalRecovered).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-3 py-3">
                                <div className="flex flex-col gap-3">
                                    {grandTotal > 0 && (
                                        <div className="flex flex-col gap-2.5">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة تسوية</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {paymentMethods.map(m => (
                                                    <button key={m.id} onClick={() => setSelMethod(selMethod === String(m.id) ? '' : String(m.id))}
                                                        className={`h-14 rounded-[14px] font-bold text-sm transition-all border-2 ${
                                                            selMethod === String(m.id) ? 'bg-primary border-primary text-white' : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 active:scale-95'
                                                        }`}>{m.name}</button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openPad('المبلغ', selAmount || (grandTotal - totalRecovered).toFixed(2), v => setSelAmount(v), grandTotal - totalRecovered)}
                                                    className="spatial-input flex-1 h-14 rounded-[14px] px-3 text-base font-black text-center cursor-pointer active:scale-95">
                                                    {selAmount || (grandTotal - totalRecovered).toFixed(2)}
                                                </button>
                                                <button onClick={() => {
                                                    if (!selMethod || !selAmount || +selAmount <= 0) return;
                                                    if (+selAmount > grandTotal - totalRecovered) return;
                                                    const method = paymentMethods.find(m => m.id === +selMethod);
                                                    if (!method) return;
                                                    setSettlements(prev => {
                                                        const existing = prev.findIndex(p => p.payment_method_id === selMethod);
                                                        if (existing !== -1) return prev.map((p, i) => i === existing ? { ...p, amount: (+p.amount + +selAmount).toFixed(2) } : p);
                                                        return [...prev.filter(p => p.payment_method_id), { payment_method_id: selMethod, amount: selAmount, notes: '' }];
                                                    });
                                                    setSelMethod(''); setSelAmount('');
                                                }} disabled={!selMethod || !selAmount}
                                                    className="spatial-button flex items-center justify-center w-16 h-14 disabled:opacity-40 active:scale-95">
                                                    <Plus className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">التسويات</label>
                                        {settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-white/20">
                                                <CreditCard className="w-12 h-12 mb-2" />
                                                <span className="font-bold text-sm">لا توجد تسويات</span>
                                            </div>
                                        ) : settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).map((p, idx) => {
                                            const method = paymentMethods.find(m => String(m.id) === p.payment_method_id);
                                            const origIdx = settlements.findIndex(s => s === p);
                                            return (
                                                <div key={idx} className="flex items-center gap-2 px-3 h-16 rounded-[14px] bg-emerald-500/10 border-2 border-emerald-500/20">
                                                    <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] truncate">{method?.name}</span>
                                                        <span className="font-black text-slate-800 dark:text-white text-base">{p.amount}</span>
                                                    </div>
                                                    <button onClick={() => setSettlements(prev => prev.filter((_, i) => i !== origIdx))}
                                                        className="w-10 h-10 rounded-[12px] bg-red-500 text-white flex items-center justify-center active:scale-95 shrink-0">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Confirm Tab */}
                    {activeTab === 'confirm' && (
                        <div className="flex flex-col">
                            <div className="px-3 py-3">
                                <div className="flex flex-col gap-3">
                                    <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-primary" /><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">العميل</span></div>
                                        <span className="font-bold text-slate-800 dark:text-white">{selectedCustomerLabel}</span>
                                    </div>
                                    <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-2"><ShoppingCart className="w-4 h-4 text-primary" /><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">المنتجات</span></div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 dark:text-white">{items.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)} قطعة</span>
                                            <span className="text-lg font-black text-primary">{grandTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-primary" /><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">التسوية</span></div>
                                        {settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-slate-600 dark:text-slate-400 font-bold">{paymentMethods.find(m => String(m.id) === p.payment_method_id)?.name}</span>
                                                <span className="font-black text-slate-800 dark:text-white">{p.amount}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 mt-1">
                                            <span className="font-bold text-slate-600 dark:text-white/60">المجموع</span>
                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{totalRecovered.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    {!isCash && grandTotal > 0 && originalDebt > 0 && (
                                        <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-500 dark:text-white/40">الدين بعد الإرجاع</span>
                                                <span className={`font-black text-lg ${debtAfterReturn < originalDebt ? 'text-emerald-500' : 'text-red-500'}`}>{debtAfterReturn.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">ملاحظات</label>
                                        <textarea value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                            rows={3} placeholder="ملاحظات... (اختياري)"
                                            className="w-full spatial-input rounded-[14px] px-3 py-2.5 text-xs font-bold resize-none" />
                                    </div>
                                    {isCash && grandTotal > 0 && settlements.filter(s => s.payment_method_id).length === 0 && (
                                        <div className="px-3 py-2.5 rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">⚠️ يجب إضافة تسوية قبل التأكيد</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-3 py-3 border-t border-black/5 dark:border-white/5 bg-white dark:bg-slate-900">
                                <div className="flex flex-col gap-2">
                                    <button onClick={submit}
                                        disabled={form.processing || items.every(i => !i.product_id) || !form.data.customer_id || (isCash && settlements.filter(s => s.payment_method_id).length === 0)}
                                        className="spatial-button w-full flex items-center justify-center gap-2 h-14 text-lg font-black disabled:opacity-40 active:scale-95">
                                        <Check className="w-5 h-5" />
                                        {grandTotal > 0 ? `تأكيد المرتجع — ${grandTotal.toFixed(2)}` : 'تأكيد المرتجع'}
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => { setItems([]); setSettlements([]); setActiveTab('products'); }}
                                            className="flex flex-col items-center justify-center gap-1 h-14 rounded-[12px] bg-red-500/15 border-2 border-red-500/30 text-red-500 font-bold text-xs active:scale-95">
                                            <Trash2 className="w-4 h-4" /><span>مسح</span>
                                        </button>
                                        <Link href="/invoice-returns"
                                            className="flex flex-col items-center justify-center gap-1 h-14 rounded-[12px] bg-black/5 dark:bg-white/10 border-2 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 font-bold text-xs">
                                            <X className="w-4 h-4" /><span>إلغاء</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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
            onConfirm={v => {
                padCallback?.(v);
                setShowPad(false);
            }}
        />
        <ConfirmModal
            isOpen={showCreditConfirm}
            title="إتمام العملية بالآجل"
            description={`يوجد مبلغ متبقي (${(grandTotal - totalRecovered).toFixed(2)})، هل أنت متأكد من حفظ المعاملة بالآجل؟`}
            confirmText="تأكيد وحفظ"
            onConfirm={executeSubmit}
            onCancel={() => setShowCreditConfirm(false)}
        />
        </>
    );
}
