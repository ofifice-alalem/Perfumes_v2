import React from 'react';
import { ShoppingCart, Trash2, Package } from 'lucide-react';
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
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20 py-12">
                <Package className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="font-bold text-xs sm:text-sm">لا توجد منتجات</span>
                <span className="text-[10px] sm:text-xs">أضف منتجاً لبدء الفاتورة</span>
            </div>
        );
    }

    // group identical items
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
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-[70px_2fr_80px_90px_100px_76px] gap-2.5 px-4 py-2.5 text-xs font-black text-slate-500 dark:text-white/40 bg-slate-100/70 dark:bg-slate-800/70 rounded-[14px] border border-black/5 dark:border-white/10">
                <span className="text-center">عدد</span>
                <span>المنتج</span>
                <span className="text-center">حجم</span>
                <span className="text-center">سعر</span>
                <span className="text-center">الإجمالي</span>
                <span className="text-center">حذف</span>
            </div>

            {Object.values(groups).map((g: any, idx) => {
                const product = products.find(p => p.id === g.product_id);
                const singleQty = g.sale_type !== 'unit_based' && product
                    ? resolveQuantity(product, g.sale_type, g.size_id || '', '1', sizes)
                    : 1;
                const displayCount = g.sale_type === 'unit_based' ? g.totalQty : (singleQty > 0 ? Math.round(g.totalQty / singleQty) : g.count);

                return (
                    <div key={idx}>
                        {/* Desktop view - Grid */}
                        <div className="hidden lg:grid grid-cols-[70px_2fr_80px_90px_100px_76px] gap-2.5 px-4 py-3.5 rounded-[20px] bg-white dark:bg-slate-800 border-2 border-black/5 dark:border-white/10 hover:border-primary/40 transition-all shadow-sm items-center">
                            {/* count — clickable to edit */}
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
                                    className="w-16 h-14 rounded-[14px] bg-black/5 dark:bg-white/10 border-2 border-black/10 dark:border-white/20 hover:border-primary/50 font-black text-lg text-slate-800 dark:text-white transition-all cursor-pointer active:scale-95 shadow-xs flex items-center justify-center"
                                >
                                    {displayCount}
                                </button>
                            </div>

                            <div className="min-w-0 flex flex-col justify-center gap-0.5">
                                <span className="font-black text-slate-900 dark:text-white text-base truncate">{g.product_name}</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{saleTypeLabels[g.sale_type] ?? g.sale_type}</span>
                            </div>

                            <div className="flex items-center justify-center">
                                {g.size_label ? (
                                    <span className="text-xs font-black text-white bg-primary px-3 py-1.5 rounded-full shadow-xs">{g.size_label}</span>
                                ) : g.sale_type === 'full_bottle' ? (
                                    <span className="text-xs font-black text-white bg-emerald-500 px-3 py-1.5 rounded-full shadow-xs">
                                        {products.find(p => p.id === g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                    </span>
                                ) : <span className="text-slate-400 text-sm font-bold">—</span>}
                            </div>

                            <div className="flex items-center justify-center">
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-base">{g.unit_price}</span>
                            </div>

                            <div className="flex items-center justify-center">
                                <span className="font-black text-primary dark:text-primary-light text-lg">{g.totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => removeGroup(g.indices)}
                                    title="حذف العنصر"
                                    className="w-16 h-16 rounded-[20px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/25 cursor-pointer shrink-0"
                                >
                                    <Trash2 className="w-8 h-8 stroke-[2.5]" />
                                </button>
                            </div>
                        </div>

                        {/* Mobile view - Card */}
                        <div className="lg:hidden flex flex-col gap-2.5 p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-black/5 dark:border-white/10 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-slate-900 dark:text-white text-base truncate">{g.product_name}</h3>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{saleTypeLabels[g.sale_type] ?? g.sale_type}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeGroup(g.indices)}
                                    title="حذف العنصر"
                                    className="w-14 h-14 rounded-[16px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-lg shadow-red-500/25 cursor-pointer"
                                >
                                    <Trash2 className="w-7 h-7 stroke-[2.5]" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
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
                                    className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-primary/50 transition-all active:scale-95"
                                >
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">عدد:</span>
                                    <span className="font-black text-sm text-slate-800 dark:text-white">{displayCount}</span>
                                </button>

                                {g.size_label ? (
                                    <span className="text-[10px] font-black text-white bg-primary px-2 py-1 rounded-full">{g.size_label}</span>
                                ) : g.sale_type === 'full_bottle' ? (
                                    <span className="text-[10px] font-black text-white bg-emerald-500 px-2 py-1 rounded-full">
                                        {products.find(p => p.id === g.product_id)?.original_perfume_detail?.bottle_volume} مل
                                    </span>
                                ) : null}

                                <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-slate-100 dark:bg-slate-700">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">سعر:</span>
                                    <span className="font-bold text-sm text-slate-800 dark:text-white">{g.unit_price}</span>
                                </div>

                                <div className="flex items-center gap-1 px-2.5 h-9 rounded-[10px] bg-primary/10 border border-primary/20">
                                    <span className="text-[10px] font-bold text-primary">إجمالي:</span>
                                    <span className="font-black text-sm text-primary">{g.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
