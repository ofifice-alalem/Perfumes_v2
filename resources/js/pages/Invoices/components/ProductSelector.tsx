import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SizeSelect } from '@/components/ui/SizeSelect';
import { SaleTypeModal } from '@/components/ui/SaleTypeModal';
import { Plus, X, AlertCircle, RefreshCw, ChevronDown, Search, Layers, Check, Trash2 } from 'lucide-react';

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
    onRefreshCatalog?: () => void;
    isRefreshing?: boolean;
}

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function norm(s: string) {
    return (s || '')
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .trim();
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
    onRefreshCatalog,
    isRefreshing = false,
}) => {
    const isVip = customerType === 'vip';

    // Form Selections State
    const [selProduct, setSelProduct] = useState('');
    const [selSaleType, setSelSaleType] = useState('');
    const [selSize, setSelSize] = useState('');
    const [selQty, setSelQty] = useState('1');
    const [selUnitPrice, setSelUnitPrice] = useState('');
    const [selMinPrice, setSelMinPrice] = useState(0);
    const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);

    // Product Search Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Click outside handler for product dropdown
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isDropdownOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setSearchQuery('');
        }
    }, [isDropdownOpen]);

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
                    const scanned = products.find(p => p.qrcode && (
                        p.qrcode.toLowerCase() === buffer.toLowerCase() ||
                        buffer.toLowerCase().includes(p.qrcode.toLowerCase())
                    ));
                    if (scanned) {
                        e.preventDefault();
                        setSelProduct(String(scanned.id));
                        setSelSaleType(''); setSelSize(''); setSelQty('1');
                        setSelUnitPrice(''); setSelMinPrice(0);
                        setIsDropdownOpen(false);
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

    // Filtered products list
    const filteredProducts = products.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = norm(searchQuery);
        const nameMatch = norm(p.name).includes(q);
        const catMatch = norm(p.category?.name || '').includes(q);
        const qrMatch = p.qrcode && norm(p.qrcode).includes(q);
        return nameMatch || catMatch || qrMatch;
    });

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
        setSelUnitPrice(''); setSelMinPrice(0);
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

    if (products.length === 0) {
        return (
            <div className="p-6 rounded-[2px] bg-amber-500/10 border border-amber-500/25 flex flex-col items-center justify-center text-center gap-3">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                        لا توجد منتجات متوفرة حالياً في القائمة
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        إذا قمت للتو بشراء منتجات أو إضافة مخزون جديد، اضغط على زر التحديث لمزامنة المخزون فوراً.
                    </span>
                </div>
                {onRefreshCatalog && (
                    <button
                        type="button"
                        onClick={onRefreshCatalog}
                        disabled={isRefreshing}
                        className="mt-2 px-4 py-2 rounded-[2px] bg-brand text-white font-bold text-xs flex items-center gap-2 hover:bg-brand/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>تحديث ومزامنة المنتجات الآن</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5 sm:gap-3">
            {/* Row 1: Workstation Searchable Product Selector + Sale Type + Qty */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center">
                
                {/* Product Dropdown Container */}
                <div className="flex-1 min-w-0 relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`h-11 sm:h-12 w-full px-3.5 rounded-[2px] border text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                            isDropdownOpen
                                ? 'border-brand bg-brand/5 dark:bg-brand/10 text-slate-900 dark:text-white shadow-2xs'
                                : selectedProduct
                                    ? 'border-slate-300 dark:border-[#22354e] bg-white dark:bg-[#0c1421] text-slate-900 dark:text-white'
                                    : 'border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-slate-400 hover:border-slate-300 dark:hover:border-[#283e58]'
                        }`}
                    >
                        <span className="truncate">
                            {selectedProduct ? selectedProduct.name : 'ابحث أو اختر المنتج...'}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 mr-1.5">
                            {selectedProduct && (
                                <span className="text-[11px] font-number font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 dark:bg-sky-950/40 px-2 py-0.5 rounded-[2px]">
                                    {getProductDisplayPrice(selectedProduct, isVip)}
                                </span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-brand' : ''}`} />
                        </div>
                    </button>

                    {/* Search Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-[1000] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xl rounded-[2px] overflow-hidden animate-in fade-in duration-100 min-w-[280px]">
                            {/* Search input inside dropdown */}
                            <div className="p-2 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/80 dark:bg-[#09111c] flex items-center gap-2">
                                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="اكتب اسم المنتج أو الصنف أو امسح الباركود..."
                                    className="w-full bg-transparent border-none text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && filteredProducts.length > 0) {
                                            const p = filteredProducts[0];
                                            setSelProduct(String(p.id));
                                            setSelSaleType(''); setSelSize(''); setSelQty('1');
                                            setSelUnitPrice(''); setSelMinPrice(0);
                                            setIsDropdownOpen(false);
                                        }
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Results list */}
                            <ul className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1.5">
                                {filteredProducts.length === 0 ? (
                                    <li className="px-4 py-4 text-center text-xs font-semibold text-slate-400">
                                        لا توجد منتجات مطابقة للبحث
                                    </li>
                                ) : (
                                    filteredProducts.map(p => {
                                        const isSelected = p.id === +selProduct;
                                        const priceStr = getProductDisplayPrice(p, isVip);
                                        return (
                                            <li
                                                key={p.id}
                                                onClick={() => {
                                                    setSelProduct(String(p.id));
                                                    setSelSaleType(''); setSelSize(''); setSelQty('1');
                                                    setSelUnitPrice(''); setSelMinPrice(0);
                                                    setIsDropdownOpen(false);
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
                                                    {priceStr && (
                                                        <span className="text-xs font-number font-bold text-sky-600 dark:text-sky-400">
                                                            {priceStr}
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] font-number text-slate-400 dark:text-slate-500">
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

                {/* Sale type button for non-tier with multiple options */}
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

                {/* Dedicated Touchscreen Clear / Reset Button */}
                {selectedProduct && (
                    <button
                        type="button"
                        onClick={resetSelection}
                        title="تفريغ الصنف المختار والبدء من جديد"
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
                        isVip={isVip}
                    />
                </div>
            )}

            {/* Row 3: Unit price field & Count & Add button */}
            {showPriceField && (
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end p-3.5 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42]">
                    <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                سعر الوحدة
                            </span>
                            {selMinPrice > 0 && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[11px] font-number font-bold">
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
                            className={`h-11 sm:h-12 rounded-[2px] px-4 font-number font-bold text-sm sm:text-base flex items-center justify-start cursor-pointer transition-colors border ${
                                selUnitPrice && +selUnitPrice < selMinPrice
                                    ? 'border-rose-500 text-rose-500 bg-rose-500/5'
                                    : 'border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] text-slate-900 dark:text-white hover:border-brand'
                            }`}
                        >
                            <span>{selUnitPrice ? `${selUnitPrice} د.ل` : '0.00 د.ل'}</span>
                        </button>
                    </div>

                    {/* Qty / Count input (replaces cancel button next to price) */}
                    {selectedProduct && (isTier || selSaleType) && (
                        <div className="flex flex-col gap-1 w-full sm:w-28 shrink-0">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {needsQty ? 'الكمية' : 'العدد'}
                            </span>
                            <button
                                type="button"
                                onClick={() => openPad(needsQty ? 'الكمية' : 'العدد', selQty || '1', v => setSelQty(v), maxCount)}
                                className="h-11 sm:h-12 w-full px-3 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand text-sm sm:text-base font-number font-black text-slate-900 dark:text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                title={needsQty ? 'الكمية' : 'العدد'}
                            >
                                {selQty || '1'}
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!canAdd || (!!selUnitPrice && +selUnitPrice < selMinPrice)}
                        className="h-11 sm:h-12 px-6 sm:px-8 rounded-[2px] bg-brand hover:bg-brand/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span>إضافة للفاتورة</span>
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
                        <span className="text-base sm:text-lg font-number font-black text-sky-600 dark:text-sky-400">
                            {fmt(previewTotal)}
                        </span>
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">د.ل</span>
                    </div>
                </div>
            )}

            {/* Stock warning */}
            {selectedProduct && maxCount !== undefined && maxCount === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[2px] bg-rose-500/10 border border-rose-500/25">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        المخزون غير كافٍ — المتاح حالياً: {availableStock} {selectedProduct.category.unit}
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
