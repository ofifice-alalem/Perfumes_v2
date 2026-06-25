import { useState, useEffect } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import {
    Plus, Trash2, Check, X, Package, ShoppingCart,
    CreditCard, ChevronLeft, User
} from 'lucide-react';

interface Supplier      { id: number; name: string; total_debt?: string; }
interface Product       { id: number; name: string; stock: string; }
interface PaymentMethod { id: number; name: string; }

interface Props {
    suppliers:             Supplier[];
    products:              Product[];
    paymentMethods:        PaymentMethod[];
    selected_supplier_id?: number;
    flash?: { success?: string; error?: string };
}

interface ItemRow {
    product_id: string;
    product_name: string;
    quantity: string;
    unit_price: string;
    line_total: string;
}
interface SettlementRow { payment_method_id: string; amount: string; notes: string; }

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchaseReturnsCreate({ suppliers, products, paymentMethods, selected_supplier_id, flash }: Props) {
    const [items,       setItems]       = useState<ItemRow[]>([]);
    const [settlements, setSettlements] = useState<SettlementRow[]>([]);
    const [resetKey,    setResetKey]    = useState(0);

    const [selProduct,    setSelProduct]    = useState('');
    const [selQty,        setSelQty]        = useState('1');
    const [selTotalPrice, setSelTotalPrice] = useState('');

    const [showPad,     setShowPad]     = useState(false);
    const [padTitle,    setPadTitle]    = useState('');
    const [padInitial,  setPadInitial]  = useState('');
    const [padMax,      setPadMax]      = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    const [selMethod, setSelMethod] = useState('');
    const [selAmount, setSelAmount] = useState('');
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string>('');

    const [activeTab, setActiveTab] = useState<'products' | 'payment' | 'confirm'>('products');
    const [showCreditConfirm, setShowCreditConfirm] = useState(false);

    const form = useForm({
        supplier_id: String(selected_supplier_id ?? 1),
        purchase_id: '',
        notes:       '',
    });

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title); setPadInitial(initial); setPadMax(max);
        setPadCallback(() => cb); setShowPad(true);
    }

    const selectedProduct = products.find(p => p.id === +selProduct);

    const unitPricePreview = selQty && selTotalPrice && +selQty > 0 ? (+selTotalPrice / +selQty) : null;

    function addToCart() {
        if (!selectedProduct) return;
        const qty = parseFloat(selQty) || 0;
        const lineTotal = parseFloat(selTotalPrice) || 0;
        const price = qty > 0 ? lineTotal / qty : 0;
        if (qty <= 0 || price <= 0) return;
        if (qty > parseFloat(selectedProduct.stock)) {
            alert(`لا يمكن إرجاع كمية أكبر من المخزون (${selectedProduct.stock})`);
            return;
        }

        setItems(prev => {
            const existingIdx = prev.findIndex(i => i.product_id === String(selectedProduct.id) && i.unit_price === price.toFixed(2));
            if (existingIdx !== -1) {
                const newQty = parseFloat(prev[existingIdx].quantity) + qty;
                return prev.map((item, i) => i === existingIdx
                    ? { ...item, quantity: newQty.toString(), line_total: (newQty * price).toFixed(2) }
                    : item
                );
            }
            return [...prev, {
                product_id: String(selectedProduct.id),
                product_name: selectedProduct.name,
                quantity: qty.toString(),
                unit_price: price.toFixed(2),
                line_total: (qty * price).toFixed(2),
            }];
        });

        setSelProduct(''); setSelQty('1'); setSelTotalPrice('');
        setResetKey(k => k + 1);
    }

    const isCash         = form.data.supplier_id === '1';
    const supplier       = suppliers.find(s => String(s.id) === form.data.supplier_id);
    const grandTotal     = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);
    const totalRecovered = settlements.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const originalDebt   = supplier ? parseFloat(supplier.total_debt || '0') || 0 : 0;
    const debtAfterReturn = !isCash ? originalDebt - grandTotal + totalRecovered : 0;

    // Default payment method logic
    useEffect(() => {
        const loadDefaultPayment = () => {
            const saved = localStorage.getItem('defaultPaymentMethodId');
            if (saved && paymentMethods.find(m => String(m.id) === saved)) {
                setDefaultPaymentMethodId(saved);
            } else if (paymentMethods.length > 0) {
                setDefaultPaymentMethodId(String(paymentMethods[0].id));
            }
        };

        loadDefaultPayment();
        window.addEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
        return () => window.removeEventListener('defaultPaymentMethodChanged', loadDefaultPayment);
    }, [paymentMethods]);

    useEffect(() => {
        if (grandTotal <= 0) { setSettlements([]); return; }
        setSettlements(prev => {
            if (prev.length === 0) {
                const defId = defaultPaymentMethodId || (paymentMethods[0] ? String(paymentMethods[0].id) : '');
                return defId ? [{ payment_method_id: defId, amount: grandTotal.toFixed(2), notes: '' }] : [];
            }
            return prev.map((s, i) => i === 0 ? { ...s, amount: grandTotal.toFixed(2) } : s);
        });
    }, [grandTotal, defaultPaymentMethodId, paymentMethods]);

    const supplierOptions = suppliers.map(s => ({
        label: s.name,
        badge: s.id === 1 ? 'نقدي' : undefined,
        meta:  s.id !== 1 && s.total_debt ? `مطلوب: ${parseFloat(s.total_debt).toFixed(2)}` : undefined,
    }));
    const productOptions = products.map(p => ({ label: p.name, meta: `المخزون: ${p.stock}` }));

    function submit() {
        const remaining = grandTotal - totalRecovered;
        if (!isCash && remaining > 0.01) {
            setShowCreditConfirm(true);
            return;
        }
        executeSubmit();
    }

    function executeSubmit() {
        setShowCreditConfirm(false);
        const validSettlements = settlements.filter(r => r.payment_method_id && parseFloat(r.amount) > 0);
        form.transform(data => ({
            ...data,
            items: items.map(item => ({
                product_id: item.product_id,
                quantity:   item.quantity,
                line_total: item.line_total,
            })),
            settlements: validSettlements,
        }));
        form.post('/purchase-returns', { preserveScroll: true });
    }

    const selectedSupplierLabel = form.data.supplier_id === '1'
        ? 'مورد نقدي'
        : (suppliers.find(s => String(s.id) === form.data.supplier_id)?.name ?? 'مورد نقدي');

    return (
        <>
        <AppShell pageTitle="مرتجع مشتريات جديد">
            {/* Desktop Layout */}
            <div className="hidden lg:flex flex-row gap-0 -m-4 lg:-m-10 h-[calc(100dvh-120px)] overflow-hidden">
                {/* ══ LEFT PANEL ══ */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <Link href="/purchase-returns" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
                                <ChevronLeft className="w-4 h-4" /> مرتجعات المشتريات
                            </Link>
                            <span className="text-slate-300 dark:text-white/10">/</span>
                            <span className="font-black text-slate-800 dark:text-white text-sm">مرتجع جديد</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {flash?.error && <span className="text-xs font-bold text-red-500">{flash.error}</span>}
                        </div>
                    </div>

                    {/* Supplier & Purchase bar */}
                    <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <ModernSelect label="" options={supplierOptions} defaultValue={selectedSupplierLabel}
                                        onSelect={val => {
                                            const s = suppliers.find(s => s.name === val);
                                            const id = s ? String(s.id) : '1';
                                            router.get('/purchase-returns/create', { supplier_id: id }, { preserveScroll: true, replace: true });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[160px]">
                                <input type="number" min="1"
                                    value={form.data.purchase_id}
                                    onChange={e => form.setData('purchase_id', e.target.value)}
                                    placeholder="رقم الفاتورة (اختياري)"
                                    className="spatial-input h-11 rounded-[14px] px-4 text-sm font-bold w-full" />
                            </div>
                        </div>
                    </div>

                    {/* Add product form */}
                    <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إرجاع منتج للمورد</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[180px]">
                                    <ModernSelect key={`p-${resetKey}`} label="" placeholder="اختر المنتج..."
                                        options={productOptions}
                                        defaultValue=""
                                        onSelect={val => {
                                            const p = products.find(p => p.name === val);
                                            setSelProduct(p ? String(p.id) : '');
                                            setSelQty('1');
                                            setSelTotalPrice('');
                                        }}
                                    />
                                </div>
                                {selectedProduct && (
                                    <>
                                        <button onClick={() => openPad('الكمية', selQty || '1', v => setSelQty(v), selectedProduct ? parseFloat(selectedProduct.stock) : undefined)}
                                            className="spatial-input h-14 rounded-[20px] px-4 text-[18px] font-black w-24 text-center cursor-pointer hover:border-primary/40 transition-all active:scale-95">
                                            {selQty || '1'}
                                        </button>
                                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                                            <button
                                                onClick={() => openPad('السعر الإجمالي', selTotalPrice, v => setSelTotalPrice(v))}
                                                className="h-14 rounded-[20px] px-5 text-[18px] font-black w-full text-center cursor-pointer transition-all spatial-input active:scale-95 hover:border-primary/40">
                                                {selTotalPrice || 'الإجمالي'}
                                            </button>
                                        </div>
                                        {unitPricePreview !== null && (
                                            <div className="flex items-center h-14 px-4 rounded-[20px] bg-primary/5 border border-primary/20 min-w-[100px] justify-center">
                                                <span className="font-black text-primary text-[18px]">{unitPricePreview.toFixed(3)}</span>
                                            </div>
                                        )}
                                        <button onClick={addToCart} disabled={!selProduct || !selQty || !selTotalPrice || +selQty <= 0 || +selTotalPrice <= 0}
                                            className="spatial-button flex items-center justify-center gap-3 px-8 h-14 text-lg font-black disabled:opacity-40 shrink-0 active:scale-[0.95] hover:scale-[1.02]">
                                            <Plus className="w-6 h-6" /> إضافة
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Totals + Payment section */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                        <div className="flex flex-col gap-2 p-4 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                            {[
                                { label: 'إجمالي المرتجع', value: grandTotal.toFixed(2), cls: 'text-slate-800 dark:text-white text-lg font-black' },
                                { label: 'المسترد (استرداد)', value: totalRecovered.toFixed(2), cls: 'text-purple-500 font-bold' },
                                { label: 'المتبقي', value: (grandTotal - totalRecovered).toFixed(2), cls: (grandTotal - totalRecovered) > 0.01 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-white/30 font-bold' },
                            ].map(({ label, value, cls }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500 dark:text-white/40">{label}</span>
                                    <span className={cls}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Payment section */}
                        {grandTotal > 0 && (
                            <div className="flex gap-3">
                                <div className="flex flex-col gap-2 w-1/2">
                                    <div className="flex flex-wrap gap-2">
                                        {paymentMethods.map(m => (
                                            <button key={m.id}
                                                onClick={() => setSelMethod(selMethod === String(m.id) ? '' : String(m.id))}
                                                className={`flex-1 min-w-[70px] h-16 rounded-[16px] font-bold text-base transition-all border-2 ${
                                                    selMethod === String(m.id)
                                                        ? 'bg-purple-500 border-purple-500 text-white'
                                                        : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-purple-500/40'
                                                }`}>
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const remaining = grandTotal - totalRecovered;
                                                openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining);
                                            }}
                                            className="spatial-input flex-1 h-16 rounded-[20px] px-4 text-[18px] font-black text-center cursor-pointer hover:border-primary/40 transition-all">
                                            {selAmount || (grandTotal - totalRecovered).toFixed(2)}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!selMethod || !selAmount || +selAmount <= 0) return;
                                                const remaining = grandTotal - totalRecovered;
                                                if (+selAmount > remaining) {
                                                    alert(`المبلغ يتجاوز المتبقي (${remaining.toFixed(2)})`);
                                                    return;
                                                }
                                                const method = paymentMethods.find(m => m.id === +selMethod);
                                                if (!method) return;
                                                setSettlements(prev => {
                                                    const existing = prev.findIndex(p => p.payment_method_id === selMethod);
                                                    if (existing !== -1) {
                                                        return prev.map((p, i) => i === existing
                                                            ? { ...p, amount: (+p.amount + +selAmount).toFixed(2) }
                                                            : p
                                                        );
                                                    }
                                                    return [...prev.filter(p => p.payment_method_id), { payment_method_id: selMethod, amount: selAmount, notes: '' }];
                                                });
                                                setSelMethod('');
                                                setSelAmount('');
                                            }}
                                            disabled={!selMethod || !selAmount}
                                            className="h-16 w-20 rounded-[20px] bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition-all disabled:opacity-40 shrink-0">
                                            <Plus className="w-7 h-7" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-1/2">
                                    {settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center h-full text-slate-300 dark:text-white/20 font-bold text-sm">لا توجد استردادات</div>
                                    ) : (
                                        settlements.filter(s => s.payment_method_id && parseFloat(s.amount || '0') > 0).map((p, idx) => {
                                            const method = paymentMethods.find(m => String(m.id) === p.payment_method_id);
                                            const originalIndex = settlements.findIndex(s => s === p);
                                            return (
                                                <div key={idx} className="flex items-center gap-3 px-4 h-[70px] rounded-[18px] bg-purple-500/10 border-2 border-purple-500/20">
                                                    <CreditCard className="w-5 h-5 text-purple-500 shrink-0" />
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-bold text-purple-600 dark:text-purple-400 text-xs">{method?.name}</span>
                                                        <span className="font-black text-slate-800 dark:text-white text-lg">{p.amount}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSettlements(prev => prev.filter((_, i) => i !== originalIndex))}
                                                        className="w-12 h-12 rounded-[14px] bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shrink-0">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0">
                        {isCash && grandTotal > 0 && settlements.filter(s => s.payment_method_id).length === 0 && (
                            <div className="px-4 py-2 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs mb-2">
                                ⚠️ مورد نقدي — يجب إضافة استرداد قبل التأكيد
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Link href="/purchase-returns" className="h-[68px] flex items-center justify-center gap-2 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/10 dark:border-white/20 w-1/4">
                                <X className="w-4 h-4" /> إلغاء
                            </Link>
                            <button onClick={submit}
                                disabled={form.processing || items.length === 0 || !form.data.supplier_id || (isCash && settlements.filter(s => s.payment_method_id).length === 0)}
                                className="spatial-button flex-1 flex items-center justify-center gap-2 text-lg font-black disabled:opacity-40 h-[68px]">
                                <Check className="w-6 h-6" />
                                {grandTotal > 0 ? `تأكيد المرتجع — ${grandTotal.toFixed(2)}` : 'تأكيد المرتجع'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT PANEL ══ */}
                <div className="w-full lg:w-[500px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-primary" />
                            <span className="font-black text-slate-800 dark:text-white text-sm">
                                عناصر المرتجع
                                {items.length > 0 && (
                                    <span className="mr-2 text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        {items.length}
                                    </span>
                                )}
                            </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-white/30">{selectedSupplierLabel}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                                <Package className="w-12 h-12" />
                                <span className="font-bold text-sm">لا توجد منتجات</span>
                                <span className="text-xs">أضف منتجات للمرتجع</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="hidden sm:grid grid-cols-[60px_2fr_80px_90px_50px] gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                                    <span className="text-center">كمية</span>
                                    <span>المنتج</span>
                                    <span className="text-center">سعر</span>
                                    <span className="text-center">الإجمالي</span>
                                    <span className="text-center">حذف</span>
                                </div>
                                {items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-[60px_2fr_80px_90px_50px] gap-2 px-3 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-sm">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => openPad('الكمية', item.quantity, newVal => {
                                                    const newQty = parseFloat(newVal);
                                                    if (newQty > 0) {
                                                        setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty.toString(), line_total: (newQty * parseFloat(it.unit_price)).toFixed(2) } : it));
                                                    }
                                                }, products.find(p => String(p.id) === item.product_id) ? parseFloat(products.find(p => String(p.id) === item.product_id)!.stock) : undefined)}
                                                className="w-14 h-12 rounded-[12px] bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-primary/50 font-black text-base text-slate-800 dark:text-white transition-all cursor-pointer active:scale-95">
                                                {item.quantity}
                                            </button>
                                        </div>
                                        <div className="min-w-0 flex items-center">
                                            <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product_name}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => openPad('السعر', item.unit_price, newVal => {
                                                    const newPrice = parseFloat(newVal);
                                                    if (newPrice > 0) {
                                                        setItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: newPrice.toFixed(2), line_total: (parseFloat(it.quantity) * newPrice).toFixed(2) } : it));
                                                    }
                                                })}
                                                className="w-full h-12 rounded-[12px] bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-primary/50 font-black text-sm text-slate-800 dark:text-white transition-all cursor-pointer active:scale-95">
                                                {item.unit_price}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="font-black text-slate-800 dark:text-white text-base">{item.line_total}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                                className="w-10 h-10 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-95">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-4 pb-3 border-t border-black/5 dark:border-white/5 shrink-0 pt-3">
                        <textarea
                            value={form.data.notes}
                            onChange={e => form.setData('notes', e.target.value)}
                            rows={3}
                            placeholder="ملاحظات على المرتجع... (اختياري)"
                            className="w-full spatial-input rounded-[16px] px-4 py-3 text-sm font-bold resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Layout with Tabs */}
            <div className="lg:hidden flex flex-col -m-4 h-[calc(100vh-80px)] overflow-hidden">
                <div className="flex flex-col border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 shrink-0">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
                        <Link href="/purchase-returns" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-xs">
                            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                        </Link>
                        <span className="font-black text-slate-800 dark:text-white text-xs">مرتجع جديد</span>
                        <div className="w-10" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <ModernSelect label="" options={supplierOptions} defaultValue={selectedSupplierLabel}
                                onSelect={val => {
                                    const s = suppliers.find(s => s.name === val);
                                    const id = s ? String(s.id) : '1';
                                    router.get('/purchase-returns/create', { supplier_id: id }, { preserveScroll: true, replace: true });
                                }}
                            />
                        </div>
                        <div className="w-32">
                            <input type="number" min="1"
                                value={form.data.purchase_id}
                                onChange={e => form.setData('purchase_id', e.target.value)}
                                placeholder="رقم الفاتورة"
                                className="spatial-input h-9 rounded-[10px] px-3 text-xs font-bold w-full" />
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-black/5 dark:border-white/5 bg-white dark:bg-slate-900 shrink-0">
                    <button onClick={() => setActiveTab('products')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all relative ${activeTab === 'products' ? 'text-primary' : 'text-slate-400 dark:text-white/40'}`}>
                        <Package className="w-4 h-4" />
                        <span>المنتجات</span>
                        {items.length > 0 && (
                            <span className="absolute top-2 left-2 w-4 h-4 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center">
                                {items.length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('payment')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all ${activeTab === 'payment' ? 'text-primary' : 'text-slate-400 dark:text-white/40'}`}>
                        <CreditCard className="w-4 h-4" />
                        <span>الاسترداد</span>
                    </button>
                    <button onClick={() => setActiveTab('confirm')}
                        className={`flex-1 flex items-center justify-center gap-2 h-12 font-bold text-sm transition-all ${activeTab === 'confirm' ? 'text-primary' : 'text-slate-400 dark:text-white/40'}`}>
                        <Check className="w-4 h-4" />
                        <span>تأكيد</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-black/[0.02] dark:bg-white/[0.02]">
                    {activeTab === 'products' && (
                        <div className="p-4 flex flex-col gap-4 pb-32">
                            <div className="flex flex-col gap-3 p-4 rounded-[20px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <ModernSelect key={`m-p-${resetKey}`} label="اختر المنتج" placeholder="ابحث عن منتج..."
                                    options={productOptions}
                                    defaultValue=""
                                    onSelect={val => {
                                        const p = products.find(p => p.name === val);
                                        setSelProduct(p ? String(p.id) : '');
                                        setSelQty('1'); setSelTotalPrice('');
                                    }}
                                />
                                {selectedProduct && (
                                    <div className="flex gap-2">
                                        <button onClick={() => openPad('الكمية', selQty || '1', v => setSelQty(v), selectedProduct ? parseFloat(selectedProduct.stock) : undefined)}
                                            className="spatial-input flex-1 h-12 rounded-[14px] text-base font-black text-center">
                                            الكمية: {selQty || '1'}
                                        </button>
                                        <button onClick={() => openPad('السعر الإجمالي', selTotalPrice, v => setSelTotalPrice(v))}
                                            className="spatial-input flex-1 h-12 rounded-[14px] text-base font-black text-center">
                                            الإجمالي: {selTotalPrice || '0'}
                                        </button>
                                    </div>
                                )}
                                {unitPricePreview !== null && (
                                    <div className="flex gap-2">
                                        <div className="flex-1 h-12 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary">
                                            سعر الوحدة: {unitPricePreview.toFixed(3)}
                                        </div>
                                    </div>
                                )}
                                <button onClick={addToCart} disabled={!selProduct || !selQty || !selTotalPrice || +selQty <= 0 || +selTotalPrice <= 0}
                                    className="spatial-button h-12 w-full flex items-center justify-center gap-2 disabled:opacity-40 mt-2">
                                    <Plus className="w-5 h-5" /> أضف للمرتجع
                                </button>
                            </div>

                            {items.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <h3 className="font-bold text-sm text-slate-500 dark:text-white/40 mx-2">عناصر المرتجع</h3>
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 p-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                            <div className="flex justify-between items-start pr-1">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 dark:text-white text-sm">{item.product_name}</span>
                                                    <span className="font-black text-primary text-base mt-1">{item.line_total}</span>
                                                </div>
                                                <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <button onClick={() => openPad('الكمية', item.quantity, v => {
                                                    const n = parseFloat(v);
                                                    if(n > 0) setItems(prev => prev.map((it, i) => i === idx ? {...it, quantity: n.toString(), line_total: (n * parseFloat(it.unit_price)).toFixed(2)} : it));
                                                }, products.find(p => String(p.id) === item.product_id) ? parseFloat(products.find(p => String(p.id) === item.product_id)!.stock) : undefined)} className="flex-1 h-9 rounded-[10px] bg-black/5 dark:bg-white/5 font-bold text-xs text-center leading-9">
                                                    كمية: {item.quantity}
                                                </button>
                                                <button onClick={() => openPad('السعر', item.unit_price, v => {
                                                    const n = parseFloat(v);
                                                    if(n > 0) setItems(prev => prev.map((it, i) => i === idx ? {...it, unit_price: n.toFixed(2), line_total: (parseFloat(it.quantity) * n).toFixed(2)} : it));
                                                })} className="flex-1 h-9 rounded-[10px] bg-black/5 dark:bg-white/5 font-bold text-xs text-center leading-9">
                                                    سعر: {item.unit_price}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="p-4 flex flex-col gap-4 pb-32">
                            <div className="p-4 rounded-[20px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-500 text-sm">الإجمالي</span>
                                    <span className="font-black text-slate-800 dark:text-white text-lg">{grandTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-500 text-sm">الاسترداد</span>
                                    <span className="font-black text-purple-500">{totalRecovered.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <span className="font-bold text-slate-500 text-sm">المتبقي</span>
                                    <span className={`font-black ${(grandTotal - totalRecovered) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {(grandTotal - totalRecovered).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h3 className="font-bold text-sm text-slate-500 dark:text-white/40 mx-2">وسيلة الاسترداد</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {paymentMethods.map(m => (
                                        <button key={m.id} onClick={() => setSelMethod(String(m.id))}
                                            className={`h-12 rounded-[14px] font-bold text-xs transition-all border-2 ${
                                                selMethod === String(m.id) ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white/70'
                                            }`}>
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => {
                                        const remaining = grandTotal - totalRecovered;
                                        openPad('المبلغ', selAmount || remaining.toFixed(2), v => setSelAmount(v), remaining);
                                    }} className="spatial-input flex-1 h-14 rounded-[16px] text-lg font-black text-center">
                                        {selAmount || (grandTotal - totalRecovered).toFixed(2)}
                                    </button>
                                    <button onClick={() => {
                                        if (!selMethod || !selAmount || +selAmount <= 0) return;
                                        setSettlements(prev => [...prev.filter(p => p.payment_method_id), { payment_method_id: selMethod, amount: selAmount, notes: '' }]);
                                        setSelMethod(''); setSelAmount('');
                                    }} disabled={!selMethod || !selAmount} className="spatial-button bg-purple-500 hover:bg-purple-600 w-14 h-14 rounded-[16px] flex items-center justify-center disabled:opacity-40">
                                        <Plus className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {settlements.filter(s => s.payment_method_id).map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-[14px] bg-purple-500/10 border border-purple-500/20">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-purple-600 text-xs">{paymentMethods.find(m => String(m.id) === s.payment_method_id)?.name}</span>
                                        <span className="font-black text-purple-700 text-sm">{s.amount}</span>
                                    </div>
                                    <button onClick={() => setSettlements(prev => prev.filter((_, i) => i !== idx))} className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'confirm' && (
                        <div className="p-4 flex flex-col gap-4 pb-32">
                            <textarea
                                value={form.data.notes}
                                onChange={e => form.setData('notes', e.target.value)}
                                rows={4}
                                placeholder="ملاحظات (اختياري)..."
                                className="w-full spatial-input rounded-[20px] px-4 py-3 text-sm font-bold resize-none"
                            />

                            <button onClick={submit}
                                disabled={form.processing || items.length === 0 || !form.data.supplier_id || (isCash && settlements.filter(s => s.payment_method_id).length === 0)}
                                className="spatial-button h-14 w-full flex items-center justify-center gap-2 text-lg font-black disabled:opacity-40">
                                <Check className="w-6 h-6" />
                                تأكيد المرتجع
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
        
        <NumberPadModal isOpen={showPad} title={padTitle} initialValue={padInitial} maxValue={padMax}
            onClose={() => setShowPad(false)} onConfirm={v => { padCallback?.(v); setShowPad(false); }} />
        <ConfirmModal
            isOpen={showCreditConfirm}
            title="إتمام العملية بالآجل"
            description={`يوجد مبلغ متبقي (${(grandTotal - totalRecovered).toFixed(2)})، هل أنت متأكد من حفظ المعاملة بالآجل؟`}
            confirmText="تأكيد وحفظ"
            onConfirm={executeSubmit}
            onCancel={() => setShowCreditConfirm(false)}
        />
        </>
    );
}
