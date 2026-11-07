import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CartItem,
    Customer,
    EditInvoice,
    HoldInvoice,
    PaymentEntry,
    PaymentMethod,
} from '@/types/pos';

interface UsePosCartProps {
    customers: Customer[];
    paymentMethods: PaymentMethod[];
    editInvoice?: EditInvoice;
    onResetKey?: () => void;
}

export function usePosCart({
    customers,
    paymentMethods,
    editInvoice,
    onResetKey,
}: UsePosCartProps) {
    const isEditMode = !!editInvoice;

    // Active payment methods
    const activePaymentMethods = useMemo(() => {
        return (paymentMethods || []).filter(
            m => m.is_active === undefined || m.is_active
        );
    }, [paymentMethods]);

    // Initial cart builder
    const initialCart = useMemo<CartItem[]>(() => {
        if (!editInvoice) return [];
        return editInvoice.items.map(item => ({
            product_id: item.product_id,
            product_name: item.product?.name ?? '',
            sale_type: item.sale_type,
            size_id: item.size_id ? String(item.size_id) : '',
            size_label: item.size?.label ?? '',
            quantity: String(item.quantity),
            unit_price: +item.unit_price,
            line_total: +item.line_total,
        }));
    }, [editInvoice]);

    // Initial payments builder
    const initialPayments = useMemo<PaymentEntry[]>(() => {
        if (!editInvoice) return [];
        return editInvoice.payments.map(p => ({
            payment_method_id: String(p.payment_method.id),
            method_name: p.payment_method.name,
            amount: (+p.amount).toFixed(2),
        }));
    }, [editInvoice]);

    // Core States
    const [customerId, setCustomerId] = useState<string>(
        editInvoice && editInvoice.customer_id !== 1 ? String(editInvoice.customer_id) : ''
    );
    const [customerType, setCustomerType] = useState<'regular' | 'vip'>(
        editInvoice?.customer_type === 'vip' ? 'vip' : 'regular'
    );
    const [notes, setNotes] = useState<string>(editInvoice?.notes ?? '');
    const [cart, setCart] = useState<CartItem[]>(initialCart);
    const [payments, setPayments] = useState<PaymentEntry[]>(initialPayments);
    const [debtPayment, setDebtPayment] = useState<PaymentEntry | null>(null);
    const [paymentManuallySet, setPaymentManuallySet] = useState(isEditMode);

    // Default payment method from local storage
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string>('');

    useEffect(() => {
        const loadDefaultPayment = () => {
            const saved = localStorage.getItem('defaultPaymentMethodId');
            if (saved && activePaymentMethods.find(m => String(m.id) === saved)) {
                setDefaultPaymentMethodId(saved);
            } else if (activePaymentMethods.length > 0) {
                setDefaultPaymentMethodId(String(activePaymentMethods[0].id));
            }
        };

        loadDefaultPayment();
        window.addEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
        return () => window.removeEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
    }, [activePaymentMethods]);

    // Drawer inputs
    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');

    // Hold invoices state
    const [holdInvoices, setHoldInvoices] = useState<HoldInvoice[]>(() => {
        try {
            const saved = localStorage.getItem('holdInvoices');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('holdInvoices', JSON.stringify(holdInvoices));
        } catch (e) {
            console.error('Failed to save hold invoices to localStorage', e);
        }
    }, [holdInvoices]);

    // Derived values
    const selectedCustomer = useMemo(() => {
        return customerId ? customers.find(c => c.id === +customerId) : null;
    }, [customerId, customers]);

    const isCashCustomer = !customerId;
    const originalDebt = +(selectedCustomer?.total_debt ?? 0);
    const total = useMemo(() => cart.reduce((s, i) => s + i.line_total, 0), [cart]);
    const debtAmount = debtPayment ? (+debtPayment.amount || 0) : 0;
    const grandTotal = debtPayment ? total + originalDebt : total;
    const totalPaid = useMemo(() => {
        return payments.reduce((s, p) => s + (+p.amount || 0), 0) + debtAmount;
    }, [payments, debtAmount]);
    const remaining = grandTotal - totalPaid;

    // Cart Actions
    const handleAddToCart = useCallback((newItem: CartItem) => {
        setCart(prev => {
            const newCart = [...prev, newItem];
            const newTotal = newCart.reduce((s, i) => s + i.line_total, 0);

            if (!paymentManuallySet) {
                if (prev.length === 0 && activePaymentMethods.length > 0) {
                    const def = activePaymentMethods.find(m => String(m.id) === defaultPaymentMethodId) || activePaymentMethods[0];
                    setPayments([{ payment_method_id: String(def.id), method_name: def.name, amount: newTotal.toFixed(2) }]);
                } else if (payments.length === 1) {
                    setPayments(prevPay => [{ ...prevPay[0], amount: newTotal.toFixed(2) }]);
                }
            }
            return newCart;
        });
    }, [paymentManuallySet, activePaymentMethods, defaultPaymentMethodId, payments.length]);

    const removeGroup = useCallback((indices: number[]) => {
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
    }, [payments.length]);

    const handleSelectPaymentMethod = useCallback((methodId: string) => {
        if (selMethod === methodId) {
            setSelMethod('');
            setSelAmount('');
        } else {
            setSelMethod(methodId);
            setSelAmount(remaining > 0 ? remaining.toFixed(2) : '');
        }
    }, [selMethod, remaining]);

    const addPayment = useCallback(() => {
        const amountToAdd = selAmount || (remaining > 0 ? remaining.toFixed(2) : '');
        if (!selMethod || !amountToAdd || +amountToAdd <= 0) return;
        const currentPaid = payments.reduce((s, p) => s + (+p.amount || 0), 0) + debtAmount;
        if (currentPaid + +amountToAdd > grandTotal + 0.001) return;
        const method = activePaymentMethods.find(m => m.id === +selMethod);
        if (!method) return;

        setPayments(prev => {
            const existing = prev.findIndex(p => p.payment_method_id === selMethod);
            if (existing !== -1) {
                return prev.map((p, i) => i === existing
                    ? { ...p, amount: (+p.amount + +amountToAdd).toFixed(2) }
                    : p
                );
            }
            return [...prev, { payment_method_id: selMethod, method_name: method.name, amount: amountToAdd }];
        });

        setPaymentManuallySet(true);
        setSelMethod('');
        setSelAmount('');
    }, [selAmount, remaining, selMethod, payments, debtAmount, grandTotal, activePaymentMethods]);

    const clearForm = useCallback(() => {
        setCustomerId('');
        setCustomerType('regular');
        setNotes('');
        setCart([]);
        setPayments([]);
        setDebtPayment(null);
        setSelMethod('');
        setSelAmount('');
        setPaymentManuallySet(false);
        onResetKey?.();
    }, [onResetKey]);

    // Hold Invoices Actions
    const holdCurrentInvoice = useCallback(() => {
        if (cart.length === 0) return;

        const holdItem: HoldInvoice = {
            id: Date.now().toString(),
            customerId,
            customerType,
            customerName: selectedCustomer?.name ?? 'زبون نقدي',
            notes,
            cart: [...cart],
            payments: [...payments],
            debtPayment: debtPayment ? { ...debtPayment } : null,
            timestamp: Date.now(),
            total,
        };

        setHoldInvoices(prev => [...prev, holdItem]);
        clearForm();
    }, [cart, customerId, customerType, selectedCustomer?.name, notes, payments, debtPayment, total, clearForm]);

    const restoreHoldInvoice = useCallback((holdInvoice: HoldInvoice) => {
        setCustomerId(holdInvoice.customerId);
        setCustomerType(holdInvoice.customerType);
        setNotes(holdInvoice.notes);
        setCart([...holdInvoice.cart]);
        setPayments([...holdInvoice.payments]);
        setDebtPayment(holdInvoice.debtPayment ? { ...holdInvoice.debtPayment } : null);

        setHoldInvoices(prev => prev.filter(h => h.id !== holdInvoice.id));
        onResetKey?.();
    }, [onResetKey]);

    const deleteHoldInvoice = useCallback((holdId: string) => {
        setHoldInvoices(prev => prev.filter(h => h.id !== holdId));
    }, []);

    const getCartConsumed = useCallback((productId: number): number => {
        return cart.filter(i => i.product_id === productId).reduce((s, i) => s + +i.quantity, 0);
    }, [cart]);

    const getOriginalInvoiceQty = useCallback((productId: number): number => {
        if (!editInvoice) return 0;
        return editInvoice.items.filter(i => i.product_id === productId).reduce((s, i) => s + +i.quantity, 0);
    }, [editInvoice]);

    return {
        // Mode & Methods
        isEditMode,
        activePaymentMethods,
        // State
        customerId,
        setCustomerId,
        customerType,
        setCustomerType,
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
        // Hold invoices
        holdInvoices,
        setHoldInvoices,
        holdCurrentInvoice,
        restoreHoldInvoice,
        deleteHoldInvoice,
        // Calculations
        selectedCustomer,
        isCashCustomer,
        originalDebt,
        total,
        debtAmount,
        grandTotal,
        totalPaid,
        remaining,
        getCartConsumed,
        getOriginalInvoiceQty,
        // Actions
        handleAddToCart,
        removeGroup,
        handleSelectPaymentMethod,
        addPayment,
        clearForm,
    };
}
