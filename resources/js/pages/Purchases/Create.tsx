import { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Trash2, Check, ArrowRight, ShoppingCart, CreditCard } from 'lucide-react';

interface Supplier      { id: number; name: string; }
interface Product       { id: number; name: string; stock: string; }
interface PaymentMethod { id: number; name: string; }

interface Props {
    suppliers:      Supplier[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface ItemRow    { product_id: string; quantity: string; line_total: string; }
interface PaymentRow { payment_method_id: string; amount: string; notes: string; }

const emptyItem    = (): ItemRow    => ({ product_id: '', quantity: '', line_total: '' });
const emptyPayment = (): PaymentRow => ({ payment_method_id: '', amount: '', notes: '' });

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchasesCreate({ suppliers, products, paymentMethods, flash }: Props) {
    const [items,    setItems]    = useState<ItemRow[]>([emptyItem()]);
    const [payments, setPayments] = useState<PaymentRow[]>([]);

    const form = useForm({
        supplier_id: '1',
        notes:       '',
        items:       [] as ItemRow[],
        payments:    [] as PaymentRow[],
    });

    const isCash     = form.data.supplier_id === '1';
    const grandTotal = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);
    const totalPaid  = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const remaining  = grandTotal - totalPaid;

    // ── options ──────────────────────────────────────────────
    const supplierOptions = [
        { label: 'مورد نقدي', badge: 'نقدي' },
        ...suppliers.map(s => ({ label: s.name })),
    ];
    const productOptions = products.map(p => ({ label: p.name, meta: p.stock }));
    const methodOptions  = paymentMethods.map(m => ({ label: m.name }));

    function resolveSupplier(label: string) {
        if (label === 'مورد نقدي') return '1';
        return String(suppliers.find(s => s.name === label)?.id ?? '1');
    }
    function resolveProduct(label: string) {
        return String(products.find(p => p.name === label)?.id ?? '');
    }
    function resolveMethod(label: string) {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    // ── items helpers ─────────────────────────────────────────
    function setItem(idx: number, field: keyof ItemRow, val: string) {
        setItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    // ── payments helpers ──────────────────────────────────────
    function setPayment(idx: number, field: keyof PaymentRow, val: string) {
        setPayments(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }
    function addPayment() {
        // Pre-fill amount with remaining if only one payment row
        const amount = payments.length === 0 && remaining > 0 ? fmt(remaining) : '';
        setPayments(prev => [...prev, { ...emptyPayment(), amount }]);
    }
    function removePayment(idx: number) {
        setPayments(prev => prev.filter((_, i) => i !== idx));
    }

    // ── submit ────────────────────────────────────────────────
    function submit() {
        form.transform(data => ({ ...data, items, payments }));
        form.post('/purchases', { preserveScroll: true });
    }

    const selectedSupplierLabel = form.data.supplier_id === '1'
        ? 'مورد نقدي'
        : (suppliers.find(s => String(s.id) === form.data.supplier_id)?.name ?? '');

    return (
        <AppShell pageTitle="فاتورة شراء جديدة">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/purchases" className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">فاتورة شراء جديدة</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">أضف المنتجات وحدد المورد</p>
                    </div>
                </div>

                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                {/* ── بيانات الفاتورة ── */}
                <SpatialCard title="بيانات الفاتورة" icon={<ShoppingCart className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <ModernSelect
                                label="المورد"
                                options={supplierOptions}
                                defaultValue={selectedSupplierLabel}
                                onSelect={val => {
                                    form.setData('supplier_id', resolveSupplier(val));
                                    // Reset payments when switching supplier type
                                    setPayments([]);
                                }}
                            />
                            {form.errors.supplier_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.supplier_id}</p>}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات (اختياري)</label>
                            <input
                                value={form.data.notes}
                                onChange={e => form.setData('notes', e.target.value)}
                                placeholder="ملاحظات الفاتورة..."
                                className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold"
                            />
                        </div>
                    </div>
                </SpatialCard>

                {/* ── المنتجات ── */}
                <SpatialCard title="المنتجات" icon={<Plus className="w-4 h-4" />}
                    action={
                        <button onClick={() => setItems(p => [...p, emptyItem()])}
                            className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm border border-primary/20">
                            <Plus className="w-3.5 h-3.5" /> إضافة سطر
                        </button>
                    }
                >
                    <div className="flex flex-col gap-3">
                        {items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                <ModernSelect
                                    label="المنتج"
                                    options={productOptions}
                                    defaultValue={products.find(p => String(p.id) === item.product_id)?.name ?? ''}
                                    onSelect={val => setItem(idx, 'product_id', resolveProduct(val))}
                                    placeholder="اختر منتجاً..."
                                />
                                <div className="flex flex-col gap-1.5 w-28">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الكمية</label>
                                    <input type="number" min="0.01" step="0.01"
                                        value={item.quantity}
                                        onChange={e => setItem(idx, 'quantity', e.target.value)}
                                        placeholder="0"
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                </div>
                                <div className="flex flex-col gap-1.5 w-32">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الإجمالي</label>
                                    <input type="number" min="0" step="0.01"
                                        value={item.line_total}
                                        onChange={e => setItem(idx, 'line_total', e.target.value)}
                                        placeholder="0.00"
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                </div>
                                <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                                    disabled={items.length === 1}
                                    className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {form.errors.items && <p className="text-xs text-red-500 font-bold">{form.errors.items}</p>}

                        {/* إجمالي */}
                        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                            <span className="font-bold text-slate-500 dark:text-white/50">إجمالي الفاتورة</span>
                            <span className="text-2xl font-black text-slate-800 dark:text-white">{fmt(grandTotal)}</span>
                        </div>
                    </div>
                </SpatialCard>

                {/* ── الدفع ── */}
                <SpatialCard title="الدفع" icon={<CreditCard className="w-4 h-4" />}
                    action={
                        <button onClick={addPayment}
                            className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm border border-emerald-500/20">
                            <Plus className="w-3.5 h-3.5" /> إضافة دفعة
                        </button>
                    }
                >
                    <div className="flex flex-col gap-3">

                        {/* تنبيه المورد النقدي */}
                        {isCash && payments.length === 0 && (
                            <div className="px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20">
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                    ⚠️ المورد النقدي يتطلب دفعاً فورياً — أضف دفعة واحدة على الأقل
                                </p>
                            </div>
                        )}

                        {payments.length === 0 && !isCash && (
                            <p className="text-sm font-bold text-slate-400 dark:text-white/30 py-2 text-center">
                                لا توجد دفعات — الفاتورة ستُسجَّل كدين على المورد
                            </p>
                        )}

                        {payments.map((pay, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end p-3 rounded-[16px] bg-emerald-500/5 border border-emerald-500/15">
                                <ModernSelect
                                    label="وسيلة الدفع"
                                    options={methodOptions}
                                    defaultValue={paymentMethods.find(m => String(m.id) === pay.payment_method_id)?.name ?? ''}
                                    onSelect={val => setPayment(idx, 'payment_method_id', resolveMethod(val))}
                                />
                                <div className="flex flex-col gap-1.5 w-36">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                    <input type="number" min="0.01" step="0.01"
                                        value={pay.amount}
                                        onChange={e => setPayment(idx, 'amount', e.target.value)}
                                        placeholder="0.00"
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة (اختياري)</label>
                                    <input
                                        value={pay.notes}
                                        onChange={e => setPayment(idx, 'notes', e.target.value)}
                                        placeholder="مثال: نقدي، حوالة..."
                                        className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                </div>
                                <button onClick={() => removePayment(idx)}
                                    className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {/* ملخص الدفع */}
                        {payments.length > 0 && (
                            <div className="flex flex-col gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-500 dark:text-white/50">إجمالي المدفوع</span>
                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{fmt(totalPaid)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-500 dark:text-white/50">المتبقي (دين)</span>
                                    <span className={`text-lg font-black ${remaining > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {fmt(Math.max(0, remaining))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </SpatialCard>

                {/* ── أزرار الحفظ ── */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={submit}
                        disabled={form.processing || items.every(i => !i.product_id) || (isCash && payments.length === 0)}
                        className="spatial-button flex items-center gap-2 px-6 h-12 text-sm disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" /> حفظ الفاتورة
                    </button>
                    <Link href="/purchases"
                        className="h-12 px-5 rounded-[20px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all flex items-center">
                        إلغاء
                    </Link>
                </div>
            </div>
        </AppShell>
    );
}
