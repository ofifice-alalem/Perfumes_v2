import React from 'react';
import { Trash2, Package } from 'lucide-react';
import { Product } from './ProductSelector';

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

export interface Size { id: number; label: string; value: string; }

interface CartProps {
    cart: CartItem[];
    products: Product[];
    sizes: Size[];
    paymentMethods: any[];
    payments: any[];
    paymentManuallySet: boolean;
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    setPayments: React.Dispatch<React.SetStateAction<any[]>>;
    openPad: (title: string, initial: string, cb: (v: string) => void, max?: number) => void;
    resolveQuantity: (product: Product, saleType: string, sizeId: string, manualQty: string, sizes: Size[]) => number;
    resolveLineTotal: (saleType: string, price: number, quantity: number) => number;
}

const saleTypeLabels: Record<string, string> = {
    tier_decant: 'زيتي',
    unit_decant: 'أصلي - تقسيم',
    full_bottle: 'عبوة كاملة',
    unit_based: 'بالوحدة',
};

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const Cart: React.FC<CartProps> = ({
    cart,
    products,
    sizes,
    paymentMethods,
    payments,
    paymentManuallySet,
    setCart,
    setPayments,
    openPad,
    resolveQuantity,
    resolveLineTotal,
}) => {
    function removeGroup(indices: number[]) {
        setCart(prev => {
            const newCart = prev.filter((_, i) => !indices.includes(i));
            const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);

            if (payments.length === 1) {
                if (newTotal > 0) {
                    setPayments(prevPay => [{ ...prevPay[0], amount: newTotal.toFixed(2) }]);
                } else {
                    setPayments([]);
                }
            }

            return newCart;
        });
    }

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500 py-12 rounded-[2px] border border-dashed border-slate-200 dark:border-[#1d2d42] bg-slate-50/30 dark:bg-[#0c1421]/30">
                <Package className="w-8 h-8 stroke-[1.5]" />
                <span className="font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-400">سلة المشتريات فارغة</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">اختر أو امسح صنفاً لإضافته للفاتورة</span>
            </div>
        );
    }

    // Group identical items
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
            {/* Desktop Workstation Table View */}
            <div className="hidden lg:block rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] overflow-hidden bg-white dark:bg-[#0c1421]">
                {/* Header */}
                <div className="grid grid-cols-[48px_1fr_68px_74px_84px_46px] gap-2 px-3 py-2.5 bg-slate-100/75 dark:bg-[#0e1726] border-b border-slate-200/90 dark:border-[#19273b] text-slate-600 dark:text-slate-400 font-bold text-[11px] items-center">
                    <span className="text-center">العدد</span>
                    <span>المنتج والصنف</span>
                    <span className="text-center">الحجم</span>
                    <span className="text-center">السعر</span>
                    <span className="text-center">الإجمالي</span>
                    <span className="text-center">إجراء</span>
                </div>

                {/* Body Rows */}
                <div className="divide-y divide-slate-200/90 dark:divide-[#1d2d42]">
                    {Object.values(groups).map((g: any, idx) => {
                        const product = products.find(p => p.id === g.product_id);
                        const singleQty = g.sale_type !== 'unit_based' && product
                            ? resolveQuantity(product, g.sale_type, g.size_id || '', '1', sizes)
                            : 1;
                        const displayCount = g.sale_type === 'unit_based' ? g.totalQty : (singleQty > 0 ? Math.round(g.totalQty / singleQty) : g.count);

                        return (
                            <div
                                key={idx}
                                className="grid grid-cols-[48px_1fr_68px_74px_84px_46px] gap-2 px-3 py-2 items-center hover:bg-slate-50/80 dark:hover:bg-[#0e1828] transition-colors"
                            >
                                {/* Count - Clickable to edit via keypad */}
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const p = products.find(pr => pr.id === g.product_id);
                                            const consumed = cart.filter((_, i) => !g.indices.includes(i)).filter(i => i.product_id === g.product_id).reduce((s, i) => s + +i.quantity, 0);
                                            const stockLeft = p ? +p.stock - consumed : 0;
                                            const cartMax = g.sale_type === 'unit_based' ? stockLeft : (singleQty > 0 ? Math.floor(stockLeft / singleQty) : 0);
                                            openPad(g.sale_type === 'unit_based' ? 'الكمية' : 'العدد', String(displayCount), newVal => {
                                                const newCount = parseInt(newVal) || 1;
                                                setCart(prev => {
                                                    const without = prev.filter((_, i) => !g.indices.includes(i));
                                                    const price = g.unit_price;
                                                    if (g.sale_type === 'unit_based') {
                                                        const newCart = [...without, { ...prev[g.indices[0]], quantity: String(newCount), line_total: resolveLineTotal('unit_based', price, newCount) }];
                                                        const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                        if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prevPay => [{ ...prevPay[0], amount: newTotal.toFixed(2) }]), 0);
                                                        return newCart;
                                                    }
                                                    const pr = products.find(p => p.id === g.product_id);
                                                    if (!pr) return prev;
                                                    const qty = resolveQuantity(pr, g.sale_type, g.size_id, '1', sizes);
                                                    const singleLT = resolveLineTotal(g.sale_type, price, qty);
                                                    const newCart = [...without, { ...prev[g.indices[0]], quantity: String(qty * newCount), line_total: singleLT * newCount }];
                                                    const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                    if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prevPay => [{ ...prevPay[0], amount: newTotal.toFixed(2) }]), 0);
                                                    return newCart;
                                                });
                                            }, cartMax);
                                        }}
                                        className="h-8.5 w-10.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-slate-50 dark:bg-[#101a29] hover:border-brand font-number font-bold text-xs text-slate-900 dark:text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                        title="تعديل الكمية"
                                    >
                                        {displayCount}
                                    </button>
                                </div>

                                {/* Product details */}
                                <div className="min-w-0 flex flex-col justify-center py-0.5">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                                        {g.product_name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {saleTypeLabels[g.sale_type] ?? g.sale_type}
                                    </span>
                                </div>

                                {/* Size */}
                                <div className="flex items-center justify-center">
                                    {g.size_label ? (
                                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-300/40 dark:border-sky-800/60 dark:bg-sky-950/40 px-1.5 py-0.5 rounded-[2px] truncate max-w-full">
                                            {g.size_label}
                                        </span>
                                    ) : g.sale_type === 'full_bottle' ? (
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-[2px] truncate max-w-full">
                                            {products.find(p => p.id === g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 text-xs">—</span>
                                    )}
                                </div>

                                {/* Unit Price */}
                                <div className="flex items-center justify-center">
                                    <span className="font-number font-bold text-slate-700 dark:text-slate-300 text-xs">
                                        {fmt(g.unit_price)}
                                    </span>
                                </div>

                                {/* Line Total */}
                                <div className="flex items-center justify-center">
                                    <span className="font-number font-black text-sky-600 dark:text-sky-400 text-xs">
                                        {fmt(g.totalAmount)}
                                    </span>
                                </div>

                                {/* Delete Action - Enlarged and easily clickable */}
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeGroup(g.indices)}
                                        title="حذف الصنف من السلة"
                                        className="w-9.5 h-9.5 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                    >
                                        <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Workstation Cards View */}
            <div className="lg:hidden flex flex-col gap-2">
                {Object.values(groups).map((g: any, idx) => {
                    const product = products.find(p => p.id === g.product_id);
                    const singleQty = g.sale_type !== 'unit_based' && product
                        ? resolveQuantity(product, g.sale_type, g.size_id || '', '1', sizes)
                        : 1;
                    const displayCount = g.sale_type === 'unit_based' ? g.totalQty : (singleQty > 0 ? Math.round(g.totalQty / singleQty) : g.count);

                    return (
                        <div
                            key={idx}
                            className="p-3 rounded-[2px] bg-white dark:bg-[#0c1421] border border-slate-200/90 dark:border-[#1d2d42] flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                        {g.product_name}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {saleTypeLabels[g.sale_type] ?? g.sale_type}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeGroup(g.indices)}
                                    title="حذف"
                                    className="w-9 h-9 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                >
                                    <Trash2 className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-100 dark:border-[#142033]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const p = products.find(pr => pr.id === g.product_id);
                                        const consumed = cart.filter((_, i) => !g.indices.includes(i)).filter(i => i.product_id === g.product_id).reduce((s, i) => s + +i.quantity, 0);
                                        const stockLeft = p ? +p.stock - consumed : 0;
                                        const cartMax = g.sale_type === 'unit_based' ? stockLeft : (singleQty > 0 ? Math.floor(stockLeft / singleQty) : 0);
                                        openPad(g.sale_type === 'unit_based' ? 'الكمية' : 'العدد', String(displayCount), newVal => {
                                            const newCount = parseInt(newVal) || 1;
                                            setCart(prev => {
                                                const without = prev.filter((_, i) => !g.indices.includes(i));
                                                const price = g.unit_price;
                                                if (g.sale_type === 'unit_based') {
                                                    const newCart = [...without, { ...prev[g.indices[0]], quantity: String(newCount), line_total: resolveLineTotal('unit_based', price, newCount) }];
                                                    const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                    if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prevPay => [{ ...prevPay[0], amount: newTotal.toFixed(2) }]), 0);
                                                    return newCart;
                                                }
                                                const pr = products.find(p => p.id === g.product_id);
                                                if (!pr) return prev;
                                                const qty = resolveQuantity(pr, g.sale_type, g.size_id, '1', sizes);
                                                const singleLT = resolveLineTotal(g.sale_type, price, qty);
                                                const newCart = [...without, { ...prev[g.indices[0]], quantity: String(qty * newCount), line_total: singleLT * newCount }];
                                                const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);
                                                if (!paymentManuallySet && payments.length === 1) setTimeout(() => setPayments(prevPay => [{ ...prevPay[0], amount: newTotal.toFixed(2) }]), 0);
                                                return newCart;
                                            });
                                        }, cartMax);
                                    }}
                                    className="flex items-center gap-1 px-2 h-7 rounded-[2px] bg-slate-100 dark:bg-[#121c2c] border border-slate-200 dark:border-[#1d2d42] font-number font-bold"
                                >
                                    <span className="text-[10px] text-slate-500">العدد:</span>
                                    <span>{displayCount}</span>
                                </button>

                                {g.size_label && (
                                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 px-1.5 py-0.5 rounded-[2px]">
                                        {g.size_label}
                                    </span>
                                )}

                                <div className="flex items-center gap-1 text-[11px] font-number text-slate-600 dark:text-slate-400 mr-auto">
                                    <span>{fmt(g.unit_price)} × {displayCount} =</span>
                                    <span className="font-bold text-sky-600 dark:text-sky-400">{fmt(g.totalAmount)} د.ل</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
