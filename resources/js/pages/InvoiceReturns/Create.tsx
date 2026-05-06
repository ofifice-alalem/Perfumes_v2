import { useState, useEffect } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { SizeSelect } from '@/components/ui/SizeSelect';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, User, AlertCircle, RotateCcw
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
    invoice_item_id?: number;  // معرف عنصر الفاتورة الأصلي
    product_id: string;
    product_name?: string;
    sale_type?: string;
    size_label?: string;
    quantity: string;
    unit_price: string;
    line_total: string;
    max_quantity?: number;  // الحد الأقصى من الفاتورة الأصلية
}
interface SettlementRow { payment_method_id: string; amount: string; notes: string; }

const emptyItem       = (): ItemRow       => ({ product_id: '', quantity: '', unit_price: '', line_total: '' });
const emptySettlement = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceReturnsCreate({ customers, products, sizes, paymentMethods, selected_customer_id, selected_invoice_id, invoice_items, flash }: Props) {
    const [items,       setItems]       = useState<ItemRow[]>([]);
    const [settlements, setSettlements] = useState<SettlementRow[]>([emptySettlement()]);
    const [createSettlement, setCreateSettlement] = useState(false);
    
    // Product selection state
    const [selProduct, setSelProduct] = useState('');
    const [selSize, setSelSize] = useState('');
    const [selQuantity, setSelQuantity] = useState('1');
    const [selUnitPrice, setSelUnitPrice] = useState('');
    const [selMinPrice, setSelMinPrice] = useState(0);
    
    // NumberPad state
    const [showPad, setShowPad] = useState(false);
    const [padTitle, setPadTitle] = useState('');
    const [padInitial, setPadInitial] = useState('');
    const [padMax, setPadMax] = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);
    
    // Payment state
    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');

    const form = useForm({
        customer_id: String(selected_customer_id ?? 1),
        invoice_id:  selected_invoice_id ? String(selected_invoice_id) : '',
        notes:       '',
    });
    
    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title);
        setPadInitial(initial);
        setPadMax(max);
        setPadCallback(() => cb);
        setShowPad(true);
    }
    
    // تحويل عناصر الفاتورة إلى صفوف قابلة للتعديل
    useEffect(() => {
        if (invoice_items && invoice_items.length > 0) {
            const invoiceRows: ItemRow[] = invoice_items.map(item => ({
                invoice_item_id: item.id,
                product_id: String(item.product_id),
                product_name: item.product_name,
                sale_type: item.sale_type,
                size_label: item.size_label ?? undefined,
                quantity: '0',
                unit_price: item.unit_price,
                line_total: '0',
                max_quantity: parseFloat(item.quantity),
            }));
            setItems(invoiceRows);
        }
    }, [invoice_items]);

    const saleTypeLabels: Record<string, string> = {
        tier_decant: 'زيتي',
        unit_decant: 'أصلي/تقسيم',
        full_bottle: 'عبوة كاملة',
        unit_based: 'بالوحدة',
    };
    
    const selectedProduct = products.find(p => String(p.id) === selProduct);
    const availableStock = selectedProduct ? parseFloat(selectedProduct.stock) : 0;
    const isTier = selectedProduct?.selling_type === 'tier_based';
    const isOriginal = selectedProduct?.category?.unit === 'ml' && !isTier;
    const needsSize = isTier || isOriginal;
    
    // حساب السعر الافتراضي والحد الأدنى
    function resolveDefaultAndMin(): { defaultPrice: number; minPrice: number } {
        if (!selectedProduct) return { defaultPrice: 0, minPrice: 0 };
        
        const pp = selectedProduct.product_price;
        const pt = selectedProduct.price_tier;
        
        if (isTier) {
            if (!selSize) return { defaultPrice: 0, minPrice: 0 };
            if (selSize.startsWith('-custom-')) {
                return {
                    defaultPrice: pp ? +pp.price_per_unit_regular : 0,
                    minPrice: pp ? +pp.price_per_unit_vip : 0,
                };
            }
            const tp = pt?.tier_prices?.find(t => t.size_id === +selSize);
            return tp ? {
                defaultPrice: +tp.price_regular,
                minPrice: +tp.price_vip
            } : { defaultPrice: 0, minPrice: 0 };
        }
        
        if (isOriginal) {
            return pp ? {
                defaultPrice: +pp.price_per_unit_regular,
                minPrice: +pp.price_per_unit_vip,
            } : { defaultPrice: 0, minPrice: 0 };
        }
        
        // منتجات عادية
        return pp ? {
            defaultPrice: +pp.price_per_unit_regular,
            minPrice: +pp.price_per_unit_vip,
        } : { defaultPrice: 0, minPrice: 0 };
    }
    
    // تحديث السعر عند تغيير المنتج أو الحجم
    useEffect(() => {
        if (!selectedProduct) {
            setSelUnitPrice('');
            setSelMinPrice(0);
            return;
        }
        
        if (needsSize && !selSize) {
            setSelUnitPrice('');
            setSelMinPrice(0);
            return;
        }
        
        const { defaultPrice, minPrice } = resolveDefaultAndMin();
        if (defaultPrice > 0) {
            setSelUnitPrice(defaultPrice.toFixed(2));
            setSelMinPrice(minPrice);
        } else {
            setSelUnitPrice('');
            setSelMinPrice(0);
        }
    }, [selectedProduct, selSize, needsSize]);
    
    // Preview calculations
    const previewQty = parseFloat(selQuantity) || 0;
    const previewPrice = parseFloat(selUnitPrice) || 0;
    const previewTotal = previewQty > 0 && previewPrice > 0 ? previewQty * previewPrice : null;
    
    const canAddProduct = !!(selProduct && (!needsSize || selSize) && selQuantity && parseFloat(selQuantity) > 0 && selUnitPrice && parseFloat(selUnitPrice) >= selMinPrice);
    
    function addProductToCart() {
        if (!selectedProduct || !selQuantity || !selUnitPrice) return;
        if (needsSize && !selSize) return;
        
        const qty = parseFloat(selQuantity);
        const price = parseFloat(selUnitPrice);
        
        if (qty <= 0 || price <= 0) return;
        
        const sizeLabel = selSize && !selSize.startsWith('-custom-')
            ? (sizes.find(s => s.id === +selSize)?.label ?? '')
            : selSize.startsWith('-custom-') ? `${selSize.replace('-custom-', '')} مل` : '';
        
        const newItem: ItemRow = {
            product_id: String(selectedProduct.id),
            product_name: selectedProduct.name,
            size_label: sizeLabel || undefined,
            quantity: qty.toString(),
            unit_price: price.toFixed(2),
            line_total: (qty * price).toFixed(2),
        };
        
        setItems(prev => [...prev, newItem]);
        
        // Reset selection
        setSelProduct('');
        setSelSize('');
        setSelQuantity('1');
        setSelUnitPrice('');
    }
    
    const isCash      = form.data.customer_id === '1';
    const customer    = customers.find(c => String(c.id) === form.data.customer_id);
    const grandTotal  = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);
    const totalRecovered = settlements.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const debtAfterReturn = customer ? parseFloat(customer.total_debt) - grandTotal : 0;
    const showSettlementOption = !isCash && debtAfterReturn <= 0 && grandTotal > 0;

    useEffect(() => {
        if (isCash || showSettlementOption) {
            setSettlements(prev => {
                if (prev.length === 1 && prev[0].payment_method_id === '') {
                    return [{ ...prev[0], amount: grandTotal > 0 ? fmt(grandTotal) : '' }];
                }
                return prev;
            });
        }
    }, [grandTotal, isCash, showSettlementOption]);

    const customerOptions = customers.map(c => ({
        label: c.name,
        badge: c.id === 1 ? 'نقدي' : undefined,
        meta:  c.id !== 1 ? `دين: ${parseFloat(c.total_debt).toFixed(2)}` : undefined,
    }));
    const productOptions = products.map(p => ({ label: p.name, badge: '', meta: `${p.stock}` }));
    const methodOptions  = paymentMethods.map(m => ({ label: m.name }));

    function resolveProduct(label: string) { return String(products.find(p => p.name === label)?.id ?? ''); }
    function resolveMethod(label: string)  { return String(paymentMethods.find(m => m.name === label)?.id ?? ''); }

    function setItem(idx: number, field: keyof ItemRow, val: string) {
        setItems(prev => prev.map((r, i) => {
            if (i !== idx) return r;
            const updated = { ...r, [field]: val };
            
            if (field === 'quantity' || field === 'unit_price') {
                const qty   = parseFloat(field === 'quantity' ? val : updated.quantity) || 0;
                const price = parseFloat(field === 'unit_price' ? val : updated.unit_price) || 0;
                
                // فحص الحد الأقصى
                if (field === 'quantity' && updated.max_quantity !== undefined && qty > updated.max_quantity) {
                    updated.quantity = updated.max_quantity.toString();
                    const limitedQty = updated.max_quantity;
                    updated.line_total = limitedQty > 0 && price > 0 ? (limitedQty * price).toFixed(2) : updated.line_total;
                    return updated;
                }
                
                updated.line_total = qty > 0 && price > 0 ? (qty * price).toFixed(2) : updated.line_total;
            }
            return updated;
        }));
    }

    function setSettlement(idx: number, field: keyof SettlementRow, val: string) {
        setSettlements(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function submit() {
        const shouldCreateSettlement = isCash || (showSettlementOption && createSettlement);
        const validSettlements = shouldCreateSettlement
            ? settlements.filter(r => r.payment_method_id && parseFloat(r.amount) > 0)
            : [];

        form.transform(data => ({
            ...data,
            items,
            create_settlement: shouldCreateSettlement && validSettlements.length > 0,
            settlement: validSettlements.length > 0 ? validSettlements[0] : null,
        }));
        form.post('/invoice-returns', { preserveScroll: true });
    }

    const selectedCustomerLabel = form.data.customer_id === '1'
        ? 'زبون نقدي'
        : (customers.find(c => String(c.id) === form.data.customer_id)?.name ?? 'زبون نقدي');

    return (
        <>
        <AppShell pageTitle="مرتجع جديد">
            <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-10 h-[calc(100vh-80px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

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
                            {/* Row 1: product + quantity + price + preview */}
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[180px]">
                                    <ModernSelect
                                        label=""
                                        placeholder="اختر المنتج..."
                                        options={productOptions}
                                        defaultValue={selectedProduct?.name ?? ''}
                                        onSelect={val => {
                                            const p = products.find(p => p.name === val);
                                            setSelProduct(p ? String(p.id) : '');
                                            setSelSize('');
                                            setSelQuantity('1');
                                        }}
                                    />
                                </div>

                                {/* quantity input */}
                                {selectedProduct && (
                                    <button
                                        onClick={() => openPad('الكمية', selQuantity || '1', v => setSelQuantity(v), availableStock)}
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[18px] font-black w-24 text-center cursor-pointer hover:border-primary/40 transition-all">
                                        {selQuantity || '1'}
                                    </button>
                                )}

                                {/* unit price input */}
                                {selectedProduct && (
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => openPad(`سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`, selUnitPrice, v => setSelUnitPrice(v))}
                                            className={`spatial-input h-14 rounded-[20px] px-4 text-[18px] font-black w-28 text-center cursor-pointer transition-all ${
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
                                )}

                                {/* preview chips */}
                                {previewTotal !== null && (
                                    <div className="flex items-center gap-1 px-3 h-14 rounded-[16px] bg-primary/5 border border-primary/20">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">إجمالي</span>
                                        <span className="font-black text-primary text-sm mr-1">{fmt(previewTotal)}</span>
                                    </div>
                                )}

                                {/* add button */}
                                {selectedProduct && (
                                    <button
                                        onClick={addProductToCart}
                                        disabled={!canAddProduct}
                                        className="spatial-button w-full sm:w-auto flex items-center justify-center gap-3 px-8 h-14 text-lg font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                                        <Plus className="w-6 h-6" /> إضافة
                                    </button>
                                )}
                            </div>

                            {/* Row 2: sizes (if needed) */}
                            {selectedProduct && needsSize && (
                                <div className="w-full">
                                    <SizeSelect
                                        sizes={sizes}
                                        selectedSizeId={selSize}
                                        onSizeSelect={id => setSelSize(id)}
                                        onPriceResolved={() => {}}
                                        product={selectedProduct}
                                        isVip={false}
                                    />
                                </div>
                            )}

                            {/* Stock warning */}
                            {selectedProduct && availableStock === 0 && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-red-500/10 border border-red-500/20">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                        المخزون غير كافٍ — المتاح: {availableStock}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Totals + Payment section */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                        {/* Totals */}
                        <div className="flex flex-col gap-2 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-500 dark:text-white/40">إجمالي المرتجع</span>
                                <span className="text-lg font-black text-slate-800 dark:text-white">{fmt(grandTotal)}</span>
                            </div>
                            {!isCash && grandTotal > 0 && (
                                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                    <span className="text-sm font-bold text-slate-500 dark:text-white/40">الدين بعد الإرجاع</span>
                                    <span className={`font-bold ${debtAfterReturn > 0 ? 'text-amber-500' : debtAfterReturn < 0 ? 'text-purple-500' : 'text-slate-400'}`}>
                                        {debtAfterReturn.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {/* Payment section */}
                        {(isCash || showSettlementOption) && (
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
                                            onClick={() => openPad('المبلغ', selAmount || grandTotal.toFixed(2), v => setSelAmount(v), grandTotal)}
                                            className="spatial-input flex-1 h-16 rounded-[20px] px-4 text-[18px] font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                                            {selAmount || grandTotal.toFixed(2)}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!selMethod || !selAmount || +selAmount <= 0) return;
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
                                    {settlements.filter(s => s.payment_method_id).length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center h-full text-slate-300 dark:text-white/20 font-bold text-sm">لا توجد تسويات</div>
                                    ) : (
                                        settlements.filter(s => s.payment_method_id).map((p, idx) => {
                                            const method = paymentMethods.find(m => String(m.id) === p.payment_method_id);
                                            return (
                                                <div key={idx} className="flex items-center gap-3 px-4 h-[70px] rounded-[18px] bg-emerald-500/10 border-2 border-emerald-500/20">
                                                    <CreditCard className="w-5 h-5 text-emerald-500 shrink-0" />
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{method?.name}</span>
                                                        <span className="font-black text-slate-800 dark:text-white text-lg">{p.amount}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSettlements(prev => prev.filter((_, i) => i !== idx))}
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
                        {items.filter(i => parseFloat(i.line_total) > 0).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                                <Package className="w-12 h-12" />
                                <span className="font-bold text-sm">لا توجد منتجات</span>
                                <span className="text-xs">أضف منتجات للمرتجع</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="hidden sm:grid grid-cols-[2fr_80px_90px_50px] gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                                    <span>المنتج</span>
                                    <span className="text-center">الكمية</span>
                                    <span className="text-center">الإجمالي</span>
                                    <span className="text-center">حذف</span>
                                </div>
                                {items.filter(i => parseFloat(i.line_total) > 0).map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-[2fr_80px_90px_50px] gap-2 px-3 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-sm">
                                        <div className="min-w-0 flex flex-col justify-center">
                                            <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product_name}</span>
                                            {item.size_label && (
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.size_label}</span>
                                            )}
                                            {item.sale_type && (
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{saleTypeLabels[item.sale_type]}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => openPad('الكمية', item.quantity, v => setItem(idx, 'quantity', v), item.max_quantity)}
                                                className="w-full h-12 rounded-[12px] bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-primary/50 font-black text-base text-slate-800 dark:text-white transition-all cursor-pointer active:scale-[0.95]">
                                                {item.quantity}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="font-black text-slate-800 dark:text-white text-base">{parseFloat(item.line_total).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                                                className="w-10 h-10 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-[0.95]">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
        </AppShell>
        
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
        </>
    );
}
