import { Product, Size } from '@/types/pos';

export const saleTypeLabels: Record<string, string> = {
    tier_decant: 'زيتي',
    unit_decant: 'أصلي - تقسيم',
    full_bottle: 'عبوة كاملة',
    unit_based: 'بالوحدة',
};

export function fmt(n: number): string {
    return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function resolvePrice(product: Product, saleType: string, sizeId: string, isVip: boolean): number {
    const pp = product.product_price;
    switch (saleType) {
        case 'tier_decant': {
            if (sizeId.startsWith('-custom-')) {
                return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
            }
            const tp = product.price_tier?.tier_prices?.find(t => t.size_id === +sizeId);
            return tp ? +(isVip ? tp.price_vip : tp.price_regular) : 0;
        }
        case 'unit_decant':
            return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
        case 'full_bottle':
            return pp ? +(isVip ? (pp.full_bottle_vip ?? 0) : (pp.full_bottle_regular ?? 0)) : 0;
        case 'unit_based':
            return pp ? +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular) : 0;
        default:
            return 0;
    }
}

export function resolveQuantity(
    product: Product,
    saleType: string,
    sizeId: string,
    manualQty: string,
    sizes: Size[]
): number {
    switch (saleType) {
        case 'tier_decant':
        case 'unit_decant': {
            if (sizeId.startsWith('-custom-')) return +(sizeId.replace('-custom-', '')) || 0;
            return +(sizes.find(s => s.id === +sizeId)?.value ?? 0);
        }
        case 'full_bottle':
            return product.original_perfume_detail ? +product.original_perfume_detail.bottle_volume : 0;
        case 'unit_based':
            return +manualQty || 0;
        default:
            return 0;
    }
}

export function resolveLineTotal(saleType: string, price: number, quantity: number): number {
    return (saleType === 'full_bottle' || saleType === 'tier_decant') ? price : price * quantity;
}

export function getProductDisplayPrice(p: Product, isVip: boolean): string {
    const pp = p.product_price;
    if (!pp) return '';
    const unitPrice = parseFloat(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular);
    const fullPrice = pp.full_bottle_regular ? parseFloat(isVip ? (pp.full_bottle_vip ?? '0') : pp.full_bottle_regular) : 0;

    if (unitPrice > 0) return `${fmt(unitPrice)} د.ل`;
    if (fullPrice > 0) return `${fmt(fullPrice)} د.ل`;
    if (p.price_tier?.tier_prices?.length) {
        const prices = p.price_tier.tier_prices
            .map(t => parseFloat(isVip ? t.price_vip : t.price_regular))
            .filter(n => !isNaN(n) && n > 0);
        if (prices.length > 0) {
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return min === max ? `${fmt(min)} د.ل` : `${fmt(min)} - ${fmt(max)} د.ل`;
        }
    }
    return '';
}

export function resolveDefaultAndMin(
    product: Product | null | undefined,
    effectiveST: string,
    selSize: string,
    isVip: boolean
): { defaultPrice: number; minPrice: number } {
    if (!product || !effectiveST) return { defaultPrice: 0, minPrice: 0 };
    const pp = product.product_price;
    const pt = product.price_tier;

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
            return tp
                ? { defaultPrice: +(isVip ? tp.price_vip : tp.price_regular), minPrice: +tp.price_vip }
                : { defaultPrice: 0, minPrice: 0 };
        }
        case 'unit_decant':
        case 'unit_based':
            return pp
                ? {
                    defaultPrice: +(isVip ? pp.price_per_unit_vip : pp.price_per_unit_regular),
                    minPrice: +pp.price_per_unit_vip,
                }
                : { defaultPrice: 0, minPrice: 0 };
        case 'full_bottle':
            return pp
                ? {
                    defaultPrice: +(isVip ? (pp.full_bottle_vip ?? 0) : (pp.full_bottle_regular ?? 0)),
                    minPrice: +(pp.full_bottle_vip ?? 0),
                }
                : { defaultPrice: 0, minPrice: 0 };
        default:
            return { defaultPrice: 0, minPrice: 0 };
    }
}
