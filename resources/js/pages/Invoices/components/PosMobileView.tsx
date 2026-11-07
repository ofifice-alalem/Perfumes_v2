import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ChevronLeft,
    RefreshCw,
    Clock,
    User,
    AlertCircle,
    CreditCard,
    Package,
    Check,
    ShoppingCart,
    Plus,
    Edit,
    Trash2,
    Pause,
    X,
} from 'lucide-react';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { ProductSelector } from './ProductSelector';
import { Cart } from './Cart';
import {
    CartItem,
    Customer,
    EditInvoice,
    HoldInvoice,
    PaymentEntry,
    PaymentMethod,
    Product,
    Size,
} from '@/types/pos';
import { resolveQuantity, resolveLineTotal } from '@/lib/posMath';

interface PosMobileViewProps {
    isEditMode: boolean;
    editInvoice?: EditInvoice;
    customerId: string;
    setCustomerId: (id: string) => void;
    customerType: 'regular' | 'vip';
    notes: string;
    setNotes: (n: string) => void;
    customers: Customer[];
    customerOptions: { label: string; badge: string }[];
    selectedCustomerName: string;
    originalDebt: number;
    productsList: Product[];
    sizes: Size[];
    activePaymentMethods: PaymentMethod[];
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    payments: PaymentEntry[];
    setPayments: React.Dispatch<React.SetStateAction<PaymentEntry[]>>;
    debtPayment: PaymentEntry | null;
    setDebtPayment: React.Dispatch<React.SetStateAction<PaymentEntry | null>>;
    total: number;
    grandTotal: number;
    totalPaid: number;
    remaining: number;
    isCashCustomer: boolean;
    productSelectorKey: number;
    resetKey: number;
    refreshProductsCatalog: () => void;
    isRefreshing: boolean;
    holdInvoices: HoldInvoice[];
    showHoldList: boolean;
    setShowHoldList: (v: boolean) => void;
    holdCurrentInvoice: () => void;
    getOriginalInvoiceQty: (id: number) => number;
    getCartConsumed: (id: number) => number;
    handleAddToCart: (item: CartItem) => void;
    openPad: (title: string, initial: string, cb: (v: string) => void, max?: number) => void;
    paymentManuallySet: boolean;
    setPaymentManuallySet: (v: boolean) => void;
    selMethod: string;
    selAmount: string;
    handleSelectPaymentMethod: (id: string) => void;
    addPayment: () => void;
    processing: boolean;
    submit: () => void;
    clearForm: () => void;
}

export const PosMobileView: React.FC<PosMobileViewProps> = ({
    isEditMode,
    editInvoice,
    customerId,
    setCustomerId,
    customerType,
    notes,
    setNotes,
    customers,
    customerOptions,
    selectedCustomerName,
    originalDebt,
    productsList,
    sizes,
    activePaymentMethods,
    cart,
    setCart,
    payments,
    setPayments,
    debtPayment,
    setDebtPayment,
    total,
    grandTotal,
    totalPaid,
    remaining,
    isCashCustomer,
    productSelectorKey,
    resetKey,
    refreshProductsCatalog,
    isRefreshing,
    holdInvoices,
    showHoldList,
    setShowHoldList,
    holdCurrentInvoice,
    getOriginalInvoiceQty,
    getCartConsumed,
    handleAddToCart,
    openPad,
    paymentManuallySet,
    setPaymentManuallySet,
    selMethod,
    selAmount,
    handleSelectPaymentMethod,
    addPayment,
    processing,
    submit,
    clearForm,
}) => {
    const [activeTab, setActiveTab] = useState<'products' | 'payment' | 'confirm'>('products');

    return (
        <div className="lg:hidden flex flex-col -m-4 h-[calc(100vh-80px)] overflow-hidden">
            {/* Top Bar - Customer Selection */}
            <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
                    <Link
                        href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'}
                        className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-xs"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                    </Link>
                    <span className="font-black text-slate-800 dark:text-white text-xs">
                        {isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة جديدة'}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={refreshProductsCatalog}
                            disabled={isRefreshing}
                            className="h-10 px-2.5 rounded-[12px] bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 text-slate-700 dark:text-white/80 font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                            title="تحديث المنتجات والمخزون"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="text-[11px] font-black">{productsList.length}</span>
                        </button>

                        {!isEditMode && (
                            <button
                                onClick={() => setShowHoldList(!showHoldList)}
                                className="relative w-14 h-14 rounded-[18px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 border-2 border-amber-500/50 text-amber-800 dark:text-amber-200 font-black flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
                                title="الفواتير المعلقة"
                            >
                                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-300" />
                                <span className="text-[10px] font-black leading-none">معلقة</span>
                                {holdInvoices.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-pulse">
                                        {holdInvoices.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <ModernSelect
                            key={`customer-mobile-${resetKey}`}
                            label=""
                            options={customerOptions}
                            defaultValue={
                                customerId
                                    ? customers.find(c => c.id === +customerId)?.name ?? 'زبون نقدي'
                                    : 'زبون نقدي'
                            }
                            placeholder="اختر العميل"
                            onSelect={val => {
                                const c = customers.find(cust => cust.name === val);
                                setCustomerId(c && c.id !== 1 ? String(c.id) : '');
                            }}
                        />
                    </div>
                </div>

                {customerId && originalDebt > 0 && (
                    <div className="mx-3 mb-2 px-3 py-2 rounded-[12px] bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 truncate">
                                دين: {originalDebt.toFixed(2)}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const m = activePaymentMethods[0];
                                if (!m) return;
                                setDebtPayment({
                                    payment_method_id: String(m.id),
                                    method_name: m.name,
                                    amount: originalDebt.toFixed(2),
                                });
                                setActiveTab('payment');
                            }}
                            className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white font-bold text-[10px] transition-all shrink-0 whitespace-nowrap"
                        >
                            <CreditCard className="w-3 h-3" /> سداد
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 shrink-0">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${
                        activeTab === 'products' ? 'text-primary' : 'text-slate-400 dark:text-white/40'
                    }`}
                >
                    <Package className="w-4 h-4" />
                    <span>المنتجات</span>
                    {cart.length > 0 && (
                        <span className="absolute top-2 left-1/2 -translate-x-1/2 translate-x-6 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                            {cart.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)}
                        </span>
                    )}
                    {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab('payment')}
                    className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${
                        activeTab === 'payment' ? 'text-primary' : 'text-slate-400 dark:text-white/40'
                    }`}
                >
                    <CreditCard className="w-4 h-4" />
                    <span>الدفع</span>
                    {activeTab === 'payment' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab('confirm')}
                    className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${
                        activeTab === 'confirm' ? 'text-primary' : 'text-slate-400 dark:text-white/40'
                    }`}
                >
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
                            <ProductSelector
                                key={`mobile-ps-${productSelectorKey}`}
                                products={productsList}
                                sizes={sizes}
                                customerType={customerType}
                                isEditMode={isEditMode}
                                editInvoiceQtyForProduct={getOriginalInvoiceQty}
                                getCartConsumed={getCartConsumed}
                                onAddToCart={handleAddToCart}
                                openPad={openPad}
                                onRefreshCatalog={refreshProductsCatalog}
                                isRefreshing={isRefreshing}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-3">
                            <Cart
                                cart={cart}
                                products={productsList}
                                sizes={sizes}
                                paymentMethods={activePaymentMethods}
                                payments={payments}
                                paymentManuallySet={paymentManuallySet}
                                setCart={setCart}
                                setPayments={setPayments}
                                openPad={openPad}
                                resolveQuantity={resolveQuantity}
                                resolveLineTotal={resolveLineTotal}
                            />
                        </div>
                    </div>
                )}

                {/* Payment Tab */}
                {activeTab === 'payment' && (
                    <div className="flex flex-col">
                        <div className="px-3 py-3 border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                            <div className="flex flex-col gap-2 p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                                    <span className="text-xs font-bold text-slate-500 dark:text-white/40">الفاتورة</span>
                                    <span className="text-lg font-black text-slate-800 dark:text-white">{total.toFixed(2)}</span>
                                </div>
                                {debtPayment && (
                                    <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                                        <span className="text-xs font-bold text-red-500">الدين السابق</span>
                                        <span className="text-lg font-black text-red-600 dark:text-red-400">{originalDebt.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-600 dark:text-white/60">الإجمالي</span>
                                    <span className="text-2xl font-black text-primary">{grandTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">المدفوع</span>
                                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalPaid.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                    <span className="text-sm font-bold text-slate-600 dark:text-white/60">المتبقي</span>
                                    <span className={`text-2xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`}>
                                        {remaining.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="px-3 py-3">
                            <div className="flex flex-col gap-3">
                                {cart.length > 0 && (
                                    <div className="flex flex-col gap-2.5">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                            إضافة دفعة
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {activePaymentMethods.map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => handleSelectPaymentMethod(String(m.id))}
                                                    className={`h-16 rounded-[14px] font-bold text-sm transition-all border-2 ${
                                                        selMethod === String(m.id)
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-primary/40 active:scale-95'
                                                    }`}
                                                >
                                                    {m.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    openPad(
                                                        'المبلغ',
                                                        selAmount || (remaining > 0 ? remaining.toFixed(2) : ''),
                                                        v => setSelAmount(v),
                                                        remaining > 0 ? remaining : undefined
                                                    )
                                                }
                                                className="spatial-input flex-1 h-16 rounded-[14px] px-3 text-base font-black text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95"
                                            >
                                                {selAmount || (remaining > 0 ? remaining.toFixed(2) : '0.00')}
                                            </button>
                                            <button
                                                onClick={addPayment}
                                                disabled={!selMethod || (selAmount ? +selAmount <= 0 : remaining <= 0)}
                                                className="spatial-button flex items-center justify-center w-16 h-16 disabled:opacity-40 active:scale-95"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                        الدفعات
                                    </label>
                                    {debtPayment && (
                                        <div className="flex items-center gap-2 px-3 h-[72px] rounded-[14px] bg-red-500/10 border-2 border-red-500/20">
                                            <button
                                                onClick={() =>
                                                    openPad('مبلغ سداد الدين', debtPayment.amount, v => {
                                                        setDebtPayment(prev => (prev ? { ...prev, amount: v } : null));
                                                    }, originalDebt)
                                                }
                                                className="w-10 h-10 rounded-[12px] bg-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                                                title="تعديل القيمة"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-bold text-red-600 dark:text-red-400 text-[10px] truncate">
                                                    سداد الدين — {debtPayment.method_name}
                                                </span>
                                                <span className="font-black text-slate-800 dark:text-white text-base truncate">
                                                    {debtPayment.amount}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setDebtPayment(null)}
                                                className="w-10 h-10 rounded-[12px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-95"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    {payments.length === 0 && !debtPayment ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-white/20">
                                            <CreditCard className="w-12 h-12 mb-2" />
                                            <span className="font-bold text-sm">لا توجد دفعات</span>
                                            <span className="text-xs mt-1">أضف دفعة من الأعلى</span>
                                        </div>
                                    ) : (
                                        payments.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 px-3 h-[72px] rounded-[14px] bg-emerald-500/10 border-2 border-emerald-500/20"
                                            >
                                                <button
                                                    onClick={() =>
                                                        openPad(`تعديل مبلغ (${p.method_name})`, p.amount, v => {
                                                            setPayments(prev =>
                                                                prev.map((pay, i) => (i === idx ? { ...pay, amount: v } : pay))
                                                            );
                                                            setPaymentManuallySet(true);
                                                        })
                                                    }
                                                    className="w-10 h-10 rounded-[12px] bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                                                    title="تعديل القيمة"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] truncate">
                                                        {p.method_name}
                                                    </span>
                                                    <span className="font-black text-slate-800 dark:text-white text-base truncate">
                                                        {p.amount}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setPayments(prev => prev.filter((_, i) => i !== idx));
                                                        setPaymentManuallySet(false);
                                                    }}
                                                    className="w-10 h-10 rounded-[12px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0 active:scale-95"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
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
                                {/* Customer Info */}
                                <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                            العميل
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800 dark:text-white">{selectedCustomerName}</span>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                customerType === 'vip'
                                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {customerType === 'vip' ? '⭐ VIP' : 'عادي'}
                                        </span>
                                    </div>
                                </div>

                                {/* Cart Summary */}
                                <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingCart className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                            المنتجات
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800 dark:text-white">
                                            {cart.reduce((s, i) => s + (i.sale_type === 'unit_based' ? +i.quantity : 1), 0)} قطعة
                                        </span>
                                        <span className="text-lg font-black text-primary">{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Payment Summary */}
                                <div className="p-3 rounded-[14px] bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                                            الدفع
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {debtPayment && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-red-600 dark:text-red-400 font-bold">سداد الدين</span>
                                                <span className="font-black text-red-600 dark:text-red-400">{debtPayment.amount}</span>
                                            </div>
                                        )}
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400 font-bold">{p.method_name}</span>
                                                <span className="font-black text-slate-800 dark:text-white">{p.amount}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                            <span className="font-bold text-slate-600 dark:text-white/60">المجموع</span>
                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                                {totalPaid.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Summary */}
                                <div className="p-4 rounded-[14px] bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-slate-600 dark:text-white/60">الإجمالي</span>
                                        <span className="text-2xl font-black text-primary">{grandTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-600 dark:text-white/60">المتبقي</span>
                                        <span className={`text-xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {remaining.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2 block">
                                        ملاحظات
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="ملاحظات على الفاتورة... (اختياري)"
                                        className="w-full spatial-input rounded-[14px] px-3 py-2.5 text-xs font-bold resize-none"
                                    />
                                </div>

                                {/* Warnings */}
                                {isCashCustomer && remaining > 0.01 && (
                                    <div className="px-3 py-2.5 rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                            ⚠️ زبون نقدي — يجب الدفع الكامل قبل التأكيد
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-3 py-3 border-t border-black/5 dark:border-white/5 bg-white dark:bg-slate-900">
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={submit}
                                    disabled={processing || cart.length === 0 || (isCashCustomer && remaining > 0.01)}
                                    className="spatial-button w-full flex items-center justify-center gap-2 h-14 text-lg font-black disabled:opacity-40 active:scale-95 transition-transform cursor-pointer"
                                >
                                    {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    <span>
                                        {processing
                                            ? 'جاري الحفظ والطباعة...'
                                            : isEditMode
                                            ? `حفظ التعديلات — ${grandTotal.toFixed(2)}`
                                            : `تأكيد البيع — ${grandTotal.toFixed(2)}`}
                                    </span>
                                </button>

                                {!isEditMode && cart.length > 0 && (
                                    <button
                                        onClick={holdCurrentInvoice}
                                        className="w-full flex items-center justify-center gap-2.5 h-16 rounded-[16px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 hover:from-amber-500/35 border-2 border-amber-500/50 text-amber-800 dark:text-amber-200 font-black text-lg transition-all active:scale-95 shadow-md"
                                    >
                                        <Pause className="w-6 h-6 text-amber-600 dark:text-amber-300" />
                                        <span>تعليق الفاتورة (حفظ مؤقت)</span>
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {!isEditMode && cart.length > 0 && (
                                        <button
                                            onClick={clearForm}
                                            className="flex flex-row items-center justify-center gap-1.5 h-12 rounded-[12px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-bold text-xs transition-all active:scale-95"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span>مسح</span>
                                        </button>
                                    )}
                                    <Link
                                        href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'}
                                        className={`flex flex-row items-center justify-center gap-1.5 h-12 rounded-[12px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 font-bold text-xs transition-all ${
                                            !isEditMode && cart.length > 0 ? '' : 'col-span-2'
                                        }`}
                                    >
                                        <X className="w-4 h-4" />
                                        <span>إلغاء</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
