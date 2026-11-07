import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import {
    X,
    ShoppingCart,
    CreditCard,
    ChevronLeft,
    User,
    AlertCircle,
    Clock,
    Pause,
    Trash2,
    ChevronUp,
    Wallet,
    CheckCircle2,
    History,
    RefreshCw,
} from 'lucide-react';
import { ProductSelector } from './components/ProductSelector';
import { Cart } from './components/Cart';
import { PaymentDrawer } from './components/PaymentDrawer';
import { HoldInvoices } from './components/HoldInvoices';
import { RecentInvoicesDrawer } from './components/RecentInvoicesDrawer';
import { PosMobileView } from './components/PosMobileView';
import { PosPageProps, Product } from '@/types/pos';
import { usePosCart } from '@/hooks/usePosCart';
import { fmt, resolveQuantity, resolveLineTotal } from '@/lib/posMath';

export default function InvoicesCreate({
    customers = [],
    products = [],
    sizes = [],
    paymentMethods = [],
    flash,
    editInvoice,
    recentInvoices = [],
}: PosPageProps) {
    const [resetKey, setResetKey] = useState(0);
    const triggerResetKey = useCallback(() => setResetKey(k => k + 1), []);

    // ── Cart & POS State (Custom Hook) ──────────────────────────────────────────
    const pos = usePosCart({
        customers,
        paymentMethods,
        editInvoice,
        onResetKey: triggerResetKey,
    });

    const {
        isEditMode,
        activePaymentMethods,
        customerId,
        setCustomerId,
        customerType,
        notes,
        setNotes,
        cart,
        setCart,
        payments,
        setPayments,
        debtPayment,
        setDebtPayment,
        paymentManuallySet,
        setPaymentManuallySet,
        selMethod,
        setSelMethod,
        selAmount,
        setSelAmount,
        holdInvoices,
        setHoldInvoices,
        holdCurrentInvoice,
        restoreHoldInvoice,
        deleteHoldInvoice,
        selectedCustomer,
        isCashCustomer,
        originalDebt,
        total,
        grandTotal,
        totalPaid,
        remaining,
        getCartConsumed,
        getOriginalInvoiceQty,
        handleAddToCart,
        handleSelectPaymentMethod,
        addPayment,
        clearForm,
    } = pos;

    // ── Products List & Dynamic Stock Sync ──────────────────────────────────────
    const [productsList, setProductsList] = useState<Product[]>(products);
    const [productSelectorKey, setProductSelectorKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        setProductsList(products);
    }, [products]);

    // Server-Authoritative Delta Stock Sync
    useEffect(() => {
        if (flash?.updated_stocks && typeof flash.updated_stocks === 'object') {
            const delta = flash.updated_stocks as Record<string, string | number>;
            const deltaKeys = Object.keys(delta);
            if (deltaKeys.length > 0) {
                setProductsList(prev =>
                    prev.map(p => {
                        const updatedVal = delta[p.id] ?? delta[String(p.id)];
                        if (updatedVal !== undefined) {
                            return { ...p, stock: String(updatedVal) };
                        }
                        return p;
                    })
                );
                setProductSelectorKey(k => k + 1);
            }
        }
    }, [flash?.updated_stocks]);

    const refreshProductsCatalog = async () => {
        setIsRefreshing(true);
        try {
            const token =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ||
                (window as any).csrfToken ||
                '';
            const res = await fetch('/invoices/refresh-catalog', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                setProductsList(data.products);
                setProductSelectorKey(k => k + 1);
                setToastMessage(`تم تحديث قائمة المنتجات والمخزون بنجاح (${data.products.length} منتج متوفر)`);
                setTimeout(() => setToastMessage(null), 4000);
            } else {
                router.reload({ only: ['products'] });
            }
        } catch (e) {
            console.error('Failed to refresh catalog:', e);
            router.reload({ only: ['products'] });
        } finally {
            setIsRefreshing(false);
        }
    };

    // ── Toast Notifications & Thermal Print ─────────────────────────────────────
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [createdInvId, setCreatedInvId] = useState<number | null>(null);
    const [reprintingToast, setReprintingToast] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            setToastMessage(flash.success);
            setCreatedInvId(flash.created_invoice_id ?? null);
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success, flash?.created_invoice_id]);

    const triggerNodePrint = async (invId: number | string) => {
        if (!invId) return;
        setReprintingToast(true);
        try {
            const res = await fetch('/settings/node-printer/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ invoice_id: invId, multi: true }),
            });
            const resData = await res.json();
            if (!resData.success) {
                alert('تنبيه الطباعة: ' + (resData.message || 'تعذر إرسال الفاتورة إلى الطابعة'));
            }
        } catch (err) {
            console.error('Node print error:', err);
            alert('تعذر الاتصال بمحرك الطباعة الحرارية');
        } finally {
            setReprintingToast(false);
        }
    };

    // ── Auto-print Toggle ───────────────────────────────────────────────────────
    const [autoPrintNode, setAutoPrintNodeState] = useState<boolean>(() => {
        try {
            return localStorage.getItem('pos_auto_print_node') !== 'false';
        } catch {
            return true;
        }
    });

    const setAutoPrintNode = (val: boolean) => {
        setAutoPrintNodeState(val);
        try {
            localStorage.setItem('pos_auto_print_node', val ? 'true' : 'false');
        } catch {}
    };

    // ── Modals & Drawers States ─────────────────────────────────────────────────
    const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
    const [showRecentDrawer, setShowRecentDrawer] = useState(false);
    const [showHoldList, setShowHoldList] = useState(false);
    const [showCreditConfirm, setShowCreditConfirm] = useState(false);
    const [processing, setProcessing] = useState(false);

    // NumberPad Modal
    const [showPad, setShowPad] = useState(false);
    const [padTitle, setPadTitle] = useState('');
    const [padInitial, setPadInitial] = useState('');
    const [padMax, setPadMax] = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    const openPad = (title: string, initial: string, cb: (v: string) => void, max?: number) => {
        setPadTitle(title);
        setPadInitial(initial);
        setPadMax(max);
        setPadCallback(() => cb);
        setShowPad(true);
    };

    // F10 Shortcut for Payment Drawer
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F10') {
                e.preventDefault();
                if (!showPaymentDrawer && cart.length > 0) {
                    setShowPaymentDrawer(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPaymentDrawer, cart.length]);

    // ── Invoice Submission ──────────────────────────────────────────────────────
    const submit = () => {
        if (processing) return;
        if (cart.length === 0 || (isCashCustomer && Math.abs(remaining) > 0.01)) return;
        if (!isCashCustomer && remaining > 0.01) {
            setShowCreditConfirm(true);
            return;
        }
        executeSubmit();
    };

    const executeSubmit = () => {
        if (processing) return;
        setShowCreditConfirm(false);
        setShowPaymentDrawer(false);
        setProcessing(true);

        const payload = {
            customer_id: customerId || null,
            customer_type: customerType,
            notes,
            items: cart.map(i => ({
                product_id: i.product_id,
                size_id: i.size_id && !i.size_id.startsWith('-custom-') ? i.size_id : null,
                sale_type: i.sale_type,
                quantity: i.quantity,
                unit_price: i.unit_price,
                line_total: i.line_total,
            })),
            payments: payments.map(p => ({
                payment_method_id: p.payment_method_id,
                amount: p.amount,
                notes: null,
            })),
            ...(isEditMode
                ? {}
                : {
                      debt_payment: debtPayment
                          ? {
                                payment_method_id: debtPayment.payment_method_id,
                                amount: debtPayment.amount,
                            }
                          : null,
                  }),
            auto_print_node: autoPrintNode,
        };

        const options = {
            preserveScroll: true,
            preserveState: true,
            only: ['flash', 'recentInvoices'],
            onSuccess: () => {
                clearForm();
            },
            onFinish: () => setProcessing(false),
        };

        if (isEditMode) {
            router.put(`/invoices/${editInvoice!.id}`, payload, options);
        } else {
            router.post('/invoices', payload, options);
        }
    };

    // ── Customer Select Options ─────────────────────────────────────────────────
    const customerOptions = useMemo(() => {
        return [
            { label: 'زبون نقدي', badge: 'نقدي' },
            ...customers.filter(c => c.id !== 1).map(c => ({ label: c.name, badge: '' })),
        ];
    }, [customers]);

    const selectedCustomerName = selectedCustomer?.name ?? 'زبون نقدي';

    return (
        <>
            <AppShell pageTitle={isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة بيع جديدة'}>
                {/* 🌟 Compact Floating Spatial Toast */}
                {toastMessage && (
                    <div className="fixed top-5 left-5 z-[9999] animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="spatial-card backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white px-3.5 py-2.5 rounded-[20px] shadow-2xl border border-emerald-500/30 dark:border-emerald-500/25 flex items-center gap-3 max-w-md">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-xs sm:text-sm text-slate-800 dark:text-white leading-tight">
                                    {toastMessage}
                                </p>
                            </div>
                            {createdInvId && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        disabled={reprintingToast}
                                        onClick={() => triggerNodePrint(createdInvId)}
                                        className="px-2 py-1 rounded-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 border border-black/5 dark:border-white/10"
                                        title="إعادة طباعة نسخة إضافية من الإيصال الحراري"
                                    >
                                        {reprintingToast ? 'جاري...' : 'طباعة 🖨️'}
                                    </button>
                                    <Link
                                        href={`/invoices/${createdInvId}`}
                                        className="px-2 py-1 rounded-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-black text-xs transition-all active:scale-95 border border-primary/20"
                                    >
                                        عرض
                                    </Link>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setToastMessage(null)}
                                className="w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
                                title="إغلاق"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ Desktop Layout ══ */}
                <div className="hidden lg:flex flex-row gap-0 -m-4 lg:-m-10 h-[calc(100dvh-155px)] overflow-hidden">
                    {/* ══ LEFT PANEL: Catalog & Product Selector ══ */}
                    <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <Link
                                    href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'}
                                    className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-xs sm:text-sm shrink-0"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">
                                        {isEditMode ? 'عرض الفاتورة' : 'فواتير البيع'}
                                    </span>
                                    <span className="sm:hidden">رجوع</span>
                                </Link>
                                <span className="text-slate-300 dark:text-white/10 hidden sm:inline">/</span>
                                <span className="font-black text-slate-800 dark:text-white text-xs sm:text-sm truncate">
                                    {isEditMode ? `تعديل فاتورة #${editInvoice!.id}` : 'فاتورة جديدة'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={refreshProductsCatalog}
                                    disabled={isRefreshing}
                                    className="h-10 sm:h-12 px-3 sm:px-4 rounded-[14px] sm:rounded-[18px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/20 text-slate-700 dark:text-white/80 font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                                    title="تحديث قائمة المنتجات ومزامنة المخزون اللحظي"
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 sm:w-5 sm:h-5 text-primary ${
                                            isRefreshing ? 'animate-spin' : ''
                                        }`}
                                    />
                                    <span className="text-xs sm:text-sm font-black hidden md:inline">
                                        تحديث المنتجات
                                    </span>
                                    <span className="text-[10px] sm:text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {productsList.length}
                                    </span>
                                </button>

                                {!isEditMode && (
                                    <button
                                        onClick={() => setShowHoldList(!showHoldList)}
                                        className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-[18px] sm:rounded-[24px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-600/35 border-2 border-amber-500/50 hover:border-amber-500/80 text-amber-800 dark:text-amber-200 font-black flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all shadow-md hover:shadow-xl active:scale-95 shrink-0 cursor-pointer"
                                        title="الفواتير المعلقة"
                                    >
                                        <Clock className="w-6 h-6 sm:w-9 sm:h-9 text-amber-600 dark:text-amber-300" />
                                        <span className="text-[10px] sm:text-xs font-black leading-none">معلقة</span>
                                        {holdInvoices.length > 0 && (
                                            <span className="absolute -top-2 -right-2 min-w-[24px] sm:min-w-[30px] h-[24px] sm:h-[30px] px-1 rounded-full bg-amber-500 text-white font-black text-xs sm:text-base flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg animate-pulse">
                                                {holdInvoices.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {flash?.error && (
                                    <span className="text-[10px] sm:text-xs font-bold text-red-500 max-w-[100px] sm:max-w-none truncate">
                                        {flash.error}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Product Selector Form */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4 border-b border-black/5 dark:border-white/5">
                            <ProductSelector
                                key={`desktop-ps-${productSelectorKey}`}
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

                        {/* Submit Action Bar */}
                        <div className="px-3 sm:px-5 pt-2.5 sm:pt-3 pb-2 sm:pb-2.5 border-t border-black/5 dark:border-white/5 shrink-0 flex items-stretch gap-2 sm:gap-3">
                            <div className="flex flex-col gap-2 shrink-0">
                                <Link
                                    href={isEditMode ? `/invoices/${editInvoice!.id}` : '/invoices'}
                                    className="h-16 sm:h-20 w-36 sm:w-48 flex items-center justify-center gap-2.5 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-black text-base sm:text-lg transition-all border border-black/10 dark:border-white/20 shrink-0 shadow-sm active:scale-95"
                                >
                                    <X className="w-6 h-6" /> إلغاء
                                </Link>
                                {!isEditMode && (
                                    <button
                                        onClick={clearForm}
                                        disabled={cart.length === 0}
                                        className="h-16 sm:h-20 w-36 sm:w-48 flex items-center justify-center gap-2.5 rounded-[22px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-black text-base sm:text-lg transition-all shrink-0 shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                        <Trash2 className="w-6 h-6" /> مسح
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowPaymentDrawer(true)}
                                disabled={cart.length === 0}
                                className="spatial-button flex-1 flex items-center justify-between px-6 sm:px-10 rounded-[28px] text-xl sm:text-[24px] font-black shadow-2xl disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-3.5">
                                    <Wallet className="w-8 h-8 sm:w-10 sm:h-10" />
                                    <span>
                                        {isEditMode ? 'تأكيد الفاتورة والسداد' : 'تأكيد الفاتورة والانتقال للدفع'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3.5">
                                    <span className="text-xs sm:text-sm font-black bg-white/20 dark:bg-black/20 px-3.5 py-2 rounded-full">
                                        {cart.length} أصناف
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-black">{grandTotal.toFixed(2)} د.ل</span>
                                    <ChevronUp className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* ══ RIGHT PANEL: Customer Bar & Cart ══ */}
                    <div className="w-full lg:w-[600px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">
                        {/* Customer bar */}
                        <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
                                <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                                    <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <ModernSelect
                                            key={`customer-${resetKey}`}
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
                            </div>

                            {/* Debt warning */}
                            {customerId && originalDebt > 0 && (
                                <div className="mx-3 sm:mx-5 mb-2.5 sm:mb-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-[12px] sm:rounded-[14px] bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                                            الدين السابق: {originalDebt.toFixed(2)}
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
                                        }}
                                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 h-9 sm:h-8 rounded-[10px] bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white font-bold text-xs transition-all shrink-0 active:scale-95 cursor-pointer"
                                    >
                                        <CreditCard className="w-3.5 h-3.5" /> سداد الدين
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Cart Header */}
                        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                <span className="font-black text-slate-800 dark:text-white text-xs sm:text-sm">
                                    عناصر الفاتورة
                                    {cart.length > 0 && (
                                        <span className="mr-1.5 sm:mr-2 text-[10px] sm:text-xs font-black text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-full">
                                            {cart.length}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2.5 sm:py-3">
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

                        {/* Action Bar: Hold Invoice + Recent Invoices Quick Print */}
                        <div className="px-3 sm:px-4 pb-1.5 sm:pb-2 border-t border-black/5 dark:border-white/5 shrink-0 pt-2 sm:pt-2.5">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                {!isEditMode && cart.length > 0 && (
                                    <button
                                        onClick={holdCurrentInvoice}
                                        className="flex-1 sm:flex-none sm:w-56 flex flex-col items-center justify-center gap-1.5 rounded-[18px] sm:rounded-[22px] bg-gradient-to-br from-amber-500/25 via-amber-500/20 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-600/35 border-2 border-amber-500/50 hover:border-amber-500/80 text-amber-800 dark:text-amber-200 font-black transition-all duration-200 shrink-0 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] min-h-[90px] sm:min-h-[110px] px-4 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-300" />
                                            <span className="text-base sm:text-lg font-black">تعليق الفاتورة</span>
                                        </div>
                                        <span className="text-xs opacity-85 font-bold">حفظ مؤقت واسترجاع لاحقاً</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowRecentDrawer(true)}
                                    className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-[18px] sm:rounded-[22px] bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border-2 border-blue-500/40 hover:border-blue-500/70 text-slate-900 dark:text-white font-black transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-[1.01] active:scale-[0.98] min-h-[90px] sm:min-h-[110px] px-5 group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 group-hover:rotate-[-12deg] transition-transform" />
                                        <span className="text-base sm:text-lg font-black">آخر 4 فواتير</span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-black shadow-sm">
                                            {recentInvoices?.length || 0}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-300 font-bold">
                                        عرض الفواتير السابقة وإعادة طباعتها فورياً ⚡
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ Mobile Layout (Tabs) ══ */}
                <PosMobileView
                    isEditMode={isEditMode}
                    editInvoice={editInvoice}
                    customerId={customerId}
                    setCustomerId={setCustomerId}
                    customerType={customerType}
                    notes={notes}
                    setNotes={setNotes}
                    customers={customers}
                    customerOptions={customerOptions}
                    selectedCustomerName={selectedCustomerName}
                    originalDebt={originalDebt}
                    productsList={productsList}
                    sizes={sizes}
                    activePaymentMethods={activePaymentMethods}
                    cart={cart}
                    setCart={setCart}
                    payments={payments}
                    setPayments={setPayments}
                    debtPayment={debtPayment}
                    setDebtPayment={setDebtPayment}
                    total={total}
                    grandTotal={grandTotal}
                    totalPaid={totalPaid}
                    remaining={remaining}
                    isCashCustomer={isCashCustomer}
                    productSelectorKey={productSelectorKey}
                    resetKey={resetKey}
                    refreshProductsCatalog={refreshProductsCatalog}
                    isRefreshing={isRefreshing}
                    holdInvoices={holdInvoices}
                    showHoldList={showHoldList}
                    setShowHoldList={setShowHoldList}
                    holdCurrentInvoice={holdCurrentInvoice}
                    getOriginalInvoiceQty={getOriginalInvoiceQty}
                    getCartConsumed={getCartConsumed}
                    handleAddToCart={handleAddToCart}
                    openPad={openPad}
                    paymentManuallySet={paymentManuallySet}
                    setPaymentManuallySet={setPaymentManuallySet}
                    selMethod={selMethod}
                    selAmount={selAmount}
                    handleSelectPaymentMethod={handleSelectPaymentMethod}
                    addPayment={addPayment}
                    processing={processing}
                    submit={submit}
                    clearForm={clearForm}
                />

                {/* ══ Drawers & Modals ══ */}
                <HoldInvoices
                    showHoldList={showHoldList}
                    setShowHoldList={setShowHoldList}
                    holdInvoices={holdInvoices}
                    setHoldInvoices={setHoldInvoices}
                    restoreHoldInvoice={restoreHoldInvoice}
                    deleteHoldInvoice={deleteHoldInvoice}
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
                    description={`يوجد مبلغ متبقي (${fmt(remaining)})، هل أنت متأكد من حفظ المعاملة بالآجل؟`}
                    confirmText="تأكيد وحفظ"
                    onConfirm={executeSubmit}
                    onCancel={() => setShowCreditConfirm(false)}
                />

                <PaymentDrawer
                    showPaymentDrawer={showPaymentDrawer}
                    setShowPaymentDrawer={setShowPaymentDrawer}
                    cart={cart}
                    payments={payments}
                    debtPayment={debtPayment}
                    paymentMethods={activePaymentMethods}
                    customerId={customerId}
                    selectedCustomer={selectedCustomer}
                    originalDebt={originalDebt}
                    isCashCustomer={isCashCustomer}
                    customerType={customerType}
                    isEditMode={isEditMode}
                    editInvoice={editInvoice}
                    total={total}
                    grandTotal={grandTotal}
                    totalPaid={totalPaid}
                    remaining={remaining}
                    processing={processing}
                    selMethod={selMethod}
                    selAmount={selAmount}
                    autoPrintNode={autoPrintNode}
                    setAutoPrintNode={setAutoPrintNode}
                    setSelMethod={setSelMethod}
                    setSelAmount={setSelAmount}
                    setPayments={setPayments}
                    setDebtPayment={setDebtPayment}
                    setPaymentManuallySet={setPaymentManuallySet}
                    handleSelectPaymentMethod={handleSelectPaymentMethod}
                    addPayment={addPayment}
                    submit={submit}
                    openPad={openPad}
                />

                <RecentInvoicesDrawer
                    isOpen={showRecentDrawer}
                    onClose={() => setShowRecentDrawer(false)}
                    recentInvoices={recentInvoices || []}
                    onPrintNode={triggerNodePrint}
                />
            </AppShell>
        </>
    );
}
