export interface Category {
    id: number;
    name: string;
    unit: 'ml' | 'pcs' | 'g';
    is_operational: boolean;
}

export interface PriceTier {
    id: number;
    name: string;
    description: string | null;
}

export interface ProductPrice {
    price_per_unit_regular: string;
    price_per_unit_vip: string;
    full_bottle_regular: string | null;
    full_bottle_vip: string | null;
}

export interface OriginalPerfumeDetail {
    bottle_volume: string;
}

export interface Product {
    id: number;
    name: string;
    selling_type: 'tier_based' | 'unit_priced';
    stock: string;
    min_stock: string;
    qrcode: string | null;
    category: Category;
    price_tier: PriceTier | null;
    price_tier_id?: number | null;
    product_price: ProductPrice | null;
    original_perfume_detail: OriginalPerfumeDetail | null;
}

export interface ProductsIndexProps {
    products: Product[];
    categories: Category[];
    tiers: PriceTier[];
    flash?: { success?: string; error?: string; info?: string };
}

export interface ProductFormData {
    name: string;
    category_id: string;
    selling_type: 'tier_based' | 'unit_priced';
    price_tier_id: string;
    min_stock: string;
    qrcode: string;
    price_per_unit_regular: string;
    price_per_unit_vip: string;
    full_bottle_regular: string;
    full_bottle_vip: string;
    bottle_volume: string;
}

export const emptyProductForm: ProductFormData = {
    name: '',
    category_id: '',
    selling_type: 'tier_based',
    price_tier_id: '',
    min_stock: '',
    qrcode: '',
    price_per_unit_regular: '',
    price_per_unit_vip: '',
    full_bottle_regular: '',
    full_bottle_vip: '',
    bottle_volume: '',
};

export const unitLabels = { ml: 'مليلتر', pcs: 'قطعة', g: 'غرام' };

export function fmt(val: string | null | undefined): string {
    if (!val) return '';
    const n = parseFloat(val);
    return Number.isInteger(n) ? String(n) : n.toString();
}

export function resolveSellingType(cat: Category): 'tier_based' | 'unit_priced' {
    if (cat.is_operational) return 'unit_priced';
    return cat.unit === 'ml' && cat.name.includes('زيت') ? 'tier_based' : 'unit_priced';
}

export function generateQrCode(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}
