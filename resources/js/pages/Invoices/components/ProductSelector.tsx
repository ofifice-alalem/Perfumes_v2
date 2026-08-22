import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import { Plus, X, AlertCircle } from 'lucide-react';

export interface Category { id: number; name: string; unit: string; }
export interface ProductPrice {
    price_per_unit_regular: string; price_per_unit_vip: string;
    full_bottle_regular: string | null; full_bottle_vip: string | null;
}
export interface OriginalDetail { bottle_volume: string; }
export interface TierPrice { size_id: number; price_regular: string; price_vip: string; }
export interface PriceTier { id: number; name: string; tier_prices?: TierPrice[]; }
export interface Product {
    id: number; name: string; stock: string; selling_type: string; qrcode?: string | null;
    category: Category;
    price_tier: PriceTier | null;
    product_price: ProductPrice | null;
    original_perfume_detail: OriginalDetail | null;
}
export interface Size { id: number; label: string; value: string; }

export interface CartItem {
    product_id: number;
    product_name: string;
    sale_type: string;
    size_id: string;
    size_label: string;
    quantity: string;
    unit_price: number;
    line_total: number;
}

export interface ProductSelectorProps {
    products?: Product[];
    sizes: Size[];
    customerType: 'regular' | 'vip';
    isEditMode: boolean;
    editInvoiceQtyForProduct: (productId: number) => number;
    getCartConsumed: (productId: number) => number;
    onAddToCart: (item: CartItem) => void;
    openPad: (title: string, initial: string, cb: (v: string) => void, max?: number) => void;
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

export const ProductSelector: React.FC<ProductSelectorProps> = ({
    products = [],
    sizes,
    customerType,
    isEditMode,
    editInvoiceQtyForProduct,
    getCartConsumed,
    onAddToCart,
    openPad,
}) => {
    const isVip = customerType === 'vip';

    // State
    const [resetKey, setResetKey] = useState(0);

    // Form Selections State
    const [selProduct, setSelProduct] = useState('');
    const [selSaleType, setSelSaleType] = useState('');
    const [selSize, setSelSize] = useState('');
    const [selQty, setSelQty] = useState('1');
    const [selUnitPrice, setSelUnitPrice] = useState('');
    const [selMinPrice, setSelMinPrice] = useState(0);
    const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);

    // Barcode Scanner Listener
    useEffect(() => {
        let buffer = '';
        let lastTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const now = Date.now();
            if (now - lastTime > 100) buffer = '';
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

    // Selected product derived info
    const selectedProduct = products.find(p => p.id === +selProduct);
    const isTier = selectedProduct?.selling_type === 'tier_based';
    const isOriginal = selectedProduct?.category?.unit === 'ml' && !isTier;
    const needsSize = isTier || selSaleType === 'unit_decant';
    const needsQty = selSaleType === 'unit_based';
    const effectiveST = isTier ? 'tier_decant' : selSaleType;

    // Available stock calculation
    const availableStock = selectedProduct
        ? +selectedProduct.stock + editInvoiceQtyForProduct(selectedProduct.id) - getCartConsumed(selectedProduct.id)
        : 0;

    // Sale type options
    const saleTypeOptions = useCallback(() => {
        if (!selectedProduct || isTier) return [];
        if (isOriginal) return [
            { label: 'أصلي - تقسيم', badge: 'unit_decant', description: 'بيع بالمليلتر حسب الحجم المطلوب', icon: '📊' },
            { label: 'عبوة كاملة', badge: 'full_bottle', description: 'بيع العبوة بالكامل بحجمها الأصلي', icon: '🎁' },
        ];
        return [{ label: 'بالوحدة', badge: 'unit_based', description: 'بيع بالقطعة أو بالجرام', icon: '⚖️' }];
    }, [selectedProduct, isTier, isOriginal]);

    // Auto-select sale type when product changes
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
    }, [selectedProduct, isTier, selSaleType, isOriginal, saleTypeOptions]);

    // Default & Min price calculation
    const resolveDefaultAndMin = useCallback((): { defaultPrice: number; minPrice: number } => {
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
    }, [selectedProduct, effectiveST, selSize, isVip]);

    const showPriceField = !!(selectedProduct && effectiveST && (!needsSize || selSize));

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
    }, [selProduct, selSaleType, selSize, isVip, showPriceField, resolveDefaultAndMin]);

    const maxCount: number | undefined = selectedProduct && (isTier || selSaleType)
        ? (() => {
            if (effectiveST === 'unit_based') return availableStock;
            if (needsSize && !selSize) return undefined;
            const qty = resolveQuantity(selectedProduct, effectiveST, selSize, '1', sizes);
            return qty > 0 ? Math.floor(availableStock / qty) : 0;
        })()
        : undefined;

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

    const canAdd = !!(selectedProduct
        && (isTier ? (!needsSize || selSize) : selSaleType)
        && (!needsSize || selSize)
        && (!needsQty || selQty)
        && (maxCount === undefined || maxCount > 0));

    const resetSelection = () => {
        setSelProduct(''); setSelSaleType(''); setSelSize(''); setSelQty('1');
        setSelUnitPrice(''); setSelMinPrice(0); setResetKey(k => k + 1);
    };

    const handleAddToCart = () => {
        if (!selectedProduct || (!isTier && !selSaleType)) return;
        const unitPrice = selUnitPrice && +selUnitPrice >= selMinPrice
            ? +selUnitPrice
            : resolvePrice(selectedProduct, effectiveST, selSize, isVip);

        if (effectiveST === 'unit_based') {
            const qty = +selQty || 0;
            if (!qty || !unitPrice) return;
            onAddToCart({
                product_id: selectedProduct.id, product_name: selectedProduct.name,
                sale_type: effectiveST, size_id: selSize, size_label: '',
                quantity: String(qty), unit_price: unitPrice,
                line_total: resolveLineTotal(effectiveST, unitPrice, qty),
            });
        } else {
            const qty = resolveQuantity(selectedProduct, effectiveST, selSize, selQty, sizes);
            if (!qty || !unitPrice) return;
            const sizeLabel = selSize.startsWith('-custom-')
                ? `${selSize.replace('-custom-', '')} مل`
                : (sizes.find(s => s.id === +selSize)?.label ?? '');
            const count = parseInt(selQty) || 1;
            const singleLineTotal = resolveLineTotal(effectiveST, unitPrice, qty);

            onAddToCart({
                product_id: selectedProduct.id, product_name: selectedProduct.name,
                sale_type: effectiveST, size_id: selSize.startsWith('-custom-') ? '' : selSize,
                size_label: sizeLabel, quantity: String(qty * count),
                unit_price: unitPrice, line_total: singleLineTotal * count,
            });
        }

        resetSelection();
    };

    return (
        <div className="flex flex-col gap-2.5 sm:gap-3">
            {/* Row 1: product + sale type + qty */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 items-stretch sm:items-end">
                <div className="flex items-center gap-2 flex-1 min-w-full sm:min-w-[180px]">
                    <div className="flex-1 min-w-0">
                        <ModernSelect
                            key={`p-${resetKey}`}
                            label=""
                            placeholder="اختر المنتج..."
                            options={products.map(p => ({
                                label: p.name,
                                badge: p.category.name,
                                price: getProductDisplayPrice(p, isVip),
                                meta: `المخزون: ${p.stock}`,
                                searchKey: p.qrcode ?? undefined,
                            }))}
                            defaultValue={selectedProduct?.name ?? ""}
                            onSelect={val => {
                                const p = products.find(pr => pr.name === val);
                                setSelProduct(p ? String(p.id) : '');
                                setSelSaleType(''); setSelSize(''); setSelQty('1');
                            }}
                        />
                    </div>
                    {selectedProduct && (
                        <button
                            type="button"
                            onClick={resetSelection}
                            title="إلغاء الاختيار وتفريغ الحقول"
                            className="h-16 sm:h-20 w-16 sm:w-20 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border-2 border-red-500/30 text-red-500 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm"
                        >
                            <X className="w-6 h-6 stroke-[2.5]" />
                        </button>
                    )}
                </div>

                {/* sale type toggle for non-tier with multiple options */}
                {selectedProduct && !isTier && saleTypeOptions().length > 1 && selSaleType && (
                    <button
                        type="button"
                        onClick={() => setShowSaleTypeModal(true)}
                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-4 sm:px-5 text-base sm:text-lg font-black w-full sm:w-48 cursor-pointer hover:border-primary/40 border-2 transition-all flex items-center justify-between shadow-sm"
                    >
                        <span className="truncate">{saleTypeOptions().find(o => o.badge === selSaleType)?.label ?? 'نوع البيع'}</span>
                        <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                )}

                {/* qty / count input */}
                {selectedProduct && (isTier || selSaleType) && (
                    <button
                        type="button"
                        onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v), maxCount)}
                        className="spatial-input h-16 sm:h-20 rounded-[22px] px-4 sm:px-6 text-xl sm:text-[24px] font-black w-full sm:w-32 text-center cursor-pointer hover:border-primary/40 border-2 transition-all active:scale-95 shadow-sm"
                    >
                        {selQty || '1'}
                    </button>
                )}
            </div>

            {/* Row 2: sizes (if needed) */}
            {needsSize && selectedProduct && (
                <div className="w-full">
                    <SizeSelect
                        sizes={sizes}
                        selectedSizeId={selSize}
                        onSizeSelect={id => { setSelSize(id); setSelUnitPrice(''); }}
                        onPriceResolved={(def, min) => { setSelUnitPrice(def.toFixed(2)); setSelMinPrice(min); }}
                        product={selectedProduct}
                        isVip={isVip}
                    />
                </div>
            )}

            {/* Row 3: Unit price field & add button */}
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
                            type="button"
                            onClick={() => openPad(
                                `سعر الوحدة (حد أدنى: ${selMinPrice.toFixed(2)})`,
                                selUnitPrice,
                                v => setSelUnitPrice(v),
                            )}
                            className={`h-16 sm:h-20 rounded-[20px] px-5 sm:px-6 text-xl sm:text-[24px] font-black flex-1 text-center cursor-pointer transition-all border-2 spatial-input active:scale-95 shadow-sm ${
                                selUnitPrice && +selUnitPrice < selMinPrice
                                    ? 'border-red-500/60 text-red-500 bg-red-500/5'
                                    : 'hover:border-primary/40'
                            }`}
                        >
                            {selUnitPrice || '0.00'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {selectedProduct && (
                            <button
                                type="button"
                                onClick={resetSelection}
                                title="إلغاء الاختيار وتفريغ الحقول"
                                className="h-16 sm:h-20 px-4 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border-2 border-red-500/30 text-red-500 font-black text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer shadow-sm"
                            >
                                <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                                <span>إلغاء</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={!canAdd || (!!selUnitPrice && +selUnitPrice < selMinPrice)}
                            className="spatial-button flex-1 sm:flex-initial min-w-[140px] flex items-center justify-center gap-2.5 sm:gap-3 px-8 sm:px-12 h-16 sm:h-20 rounded-[22px] text-xl sm:text-[22px] font-black disabled:opacity-40 shrink-0 active:scale-95 hover:scale-[1.02] transition-transform shadow-lg"
                        >
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

            {/* Sale Type Modal */}
            <SaleTypeModal
                isOpen={showSaleTypeModal}
                onClose={() => setShowSaleTypeModal(false)}
                onSelect={(badge) => {
                    setSelSaleType(badge);
                    setSelSize('');
                    setShowSaleTypeModal(false);
                }}
                options={saleTypeOptions()}
            />
        </div>
    );
};
