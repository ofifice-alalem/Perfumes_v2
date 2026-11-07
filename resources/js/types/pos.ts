export interface Customer {
    id: number;
    name: string;
    total_debt?: string;
    is_active?: boolean;
}

export interface Size {
    id: number;
    label: string;
    value: string;
    unit?: string;
}

export interface Category {
    id: number;
    name: string;
    unit: string;
    is_operational?: boolean;
}

export interface ProductPrice {
    price_per_unit_regular: string;
    price_per_unit_vip: string;
    full_bottle_regular: string | null;
    full_bottle_vip: string | null;
}

export interface OriginalDetail {
    bottle_volume: string;
}

export interface TierPrice {
    id?: number;
    size_id: number;
    price_regular: string;
    price_vip: string;
    size?: Size;
}

export interface PriceTier {
    id: number;
    name: string;
    tier_prices?: TierPrice[];
}

export interface Product {
    id: number;
    name: string;
    stock: string;
    selling_type: string;
    qrcode?: string | null;
    category: Category;
    price_tier: PriceTier | null;
    product_price: ProductPrice | null;
    original_perfume_detail: OriginalDetail | null;
}

export interface PaymentMethod {
    id: number;
    name: string;
    is_active?: boolean;
}

export interface InvoiceItemData {
    id: number;
    product_id: number;
    size_id: number | null;
    sale_type: string;
    quantity: string;
    unit_price: string;
    line_total: string;
    product: { id: number; name: string; category?: Category };
    size: { id: number; label: string; value: string } | null;
}

export interface InvoicePaymentData {
    id: number;
    amount: string;
    payment_method: { id: number; name: string };
}

export interface EditInvoice {
    id: number;
    customer_id: number;
    customer_type: string;
    notes: string | null;
    customer: { id: number; name: string; total_debt?: string } | null;
    items: InvoiceItemData[];
    payments: InvoicePaymentData[];
}

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

export interface PaymentEntry {
    payment_method_id: string;
    method_name: string;
    amount: string;
}

export interface HoldInvoice {
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

export interface RecentInvoiceItem {
    id: number;
    invoice_number?: string;
    customer_name?: string;
    user_name?: string;
    total: number;
    paid_amount: number;
    created_at: string;
    items_count?: number;
    items_summary?: string;
}

export interface PosPageProps {
    customers: Customer[];
    products: Product[];
    sizes: Size[];
    paymentMethods: PaymentMethod[];
    flash?: {
        success?: string;
        error?: string;
        created_invoice_id?: number;
        created_invoice_number?: string | number;
        updated_stocks?: Record<string | number, string | number>;
    };
    editInvoice?: EditInvoice;
    recentInvoices?: RecentInvoiceItem[];
}
