import { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Trash2, Check, ArrowRight, ShoppingCart } from 'lucide-react';

interface Supplier      { id: number; name: string; }
interface Product       { id: number; name: string; stock: string; }
interface PaymentMethod { id: number; name: string; }

interface Props {
    suppliers:      Supplier[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface ItemRow {
    product_id: string;
    quantity:   string;
    line_total: string;
}

const emptyItem = (): ItemRow => ({ product_id: '', quantity: '', line_total: '' });

export default function PurchasesCreate({ suppliers, products, paymentMethods, flash }: Props) {
    const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

    const form = useForm({
        supplier_id:       '1',
        notes:             '',
        paid_amount:       '',
        payment_method_id: '',
        items:             [] as ItemRow[],
    });

    const isCash = form.data.supplier_id === '1';

    const grandTotal = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);

    // supplier options for ModernSelect
    const supplierOptions = [
        { label: 'مورد نقدي', badge: 'نقدي' },
        ...suppliers.map(s => ({ label: s.name, badge: String(s.id) })),
    ];

    // payment method options
    const paymentOptions = paymentMethods.map(m => ({ label: m.name }));

    // product options
    const productOptions = products.map(p => ({
        label: p.name,
        meta: p.stock,
    }));

    function resolveSupplierIdFromLabel(label: string): string {
        if (label === 'مورد نقدي') return '1';
        const s = suppliers.find(s => s.name === label);
        return s ? String(s.id) : '1';
    }

    function resolvePaymentMethodIdFromLabel(label: string): string {
        const m = paymentMethods.find(m => m.name === label);
        return m ? String(m.id) : '';
    }

    function resolveProductIdFromLabel(label: string): string {
        const p = products.find(p => p.name === label);
        return p ? String(p.id) : '';
    }

    function setItem(idx: number, field: keyof ItemRow, val: string) {
        setItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function setItemProduct(idx: number, label: string) {
        setItems(prev => prev.map((r, i) => i === idx ? { ...r, product_id: resolveProductIdFromLabel(label) } : r));
    }

    function removeItem(idx: number) {
        setItems(prev => prev.filter((_, i) => i !== idx));
    }

    function submit() {
        form.transform(data => ({ ...data, items }));
        form.post('/purchases', { preserveScroll: true });
    }

    const selectedSupplierLabel = form.data.supplier_id === '1'
        ? 'مورد نقدي'
        : (suppliers.find(s => String(s.id) === form.data.supplier_id)?.name ?? '');

    const selectedPaymentLabel = paymentMethods.find(m => String(m.id) === form.data.payment_method_id)?.name ?? '';

    return (
        <AppShell pageTitle="فاتورة شراء جديدة">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

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

                {/* Supplier & Notes */}
                <SpatialCard title="بيانات الفاتورة" icon={<ShoppingCart className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ModernSelect
                            label="المورد"
                            options={supplierOptions}
                            defaultValue={selectedSupplierLabel}
                            onSelect={val => form.setData('supplier_id', resolveSupplierIdFromLabel(val))}
                        />
                        {form.errors.supplier_id && <p className="text-xs text-red-500 font-bold -mt-2">{form.errors.supplier_id}</p>}

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

                    {/* Cash supplier: require payment */}
                    {isCash && (
                        <div className="mt-4 p-4 rounded-[16px] bg-amber-500/10 border border-amber-500/20">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">⚠️ المورد النقدي يتطلب دفعاً فورياً كاملاً</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ModernSelect
                                    label="وسيلة الدفع"
                                    options={paymentOptions}
                                    defaultValue={selectedPaymentLabel}
                                    onSelect={val => form.setData('payment_method_id', resolvePaymentMethodIdFromLabel(val))}
                                />
                                {form.errors.payment_method_id && <p className="text-xs text-red-500 font-bold">{form.errors.payment_method_id}</p>}

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">المبلغ المدفوع</label>
                                    <input
                                        type="number"
                                        value={grandTotal.toFixed(2)}
                                        readOnly
                                        className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </SpatialCard>

                {/* Items */}
                <SpatialCard title="المنتجات" icon={<Plus className="w-4 h-4" />}
                    action={
                        <button onClick={() => setItems(p => [...p, emptyItem()])}
                            className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm border border-primary/20">
                            <Plus className="w-3.5 h-3.5" /> إضافة سطر
                        </button>
                    }
                >
                    <div className="flex flex-col gap-3">
                        {items.map((item, idx) => {
                            const selectedProductLabel = products.find(p => String(p.id) === item.product_id)?.name ?? '';
                            return (
                                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                    <ModernSelect
                                        label="المنتج"
                                        options={productOptions}
                                        defaultValue={selectedProductLabel}
                                        onSelect={val => setItemProduct(idx, val)}
                                        placeholder="اختر منتجاً..."
                                    />
                                    <div className="flex flex-col gap-1.5 w-28">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الكمية</label>
                                        <input
                                            type="number" min="0.01" step="0.01"
                                            value={item.quantity}
                                            onChange={e => setItem(idx, 'quantity', e.target.value)}
                                            placeholder="0"
                                            className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 w-32">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الإجمالي</label>
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={item.line_total}
                                            onChange={e => setItem(idx, 'line_total', e.target.value)}
                                            placeholder="0.00"
                                            className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeItem(idx)}
                                        disabled={items.length === 1}
                                        className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}

                        {form.errors.items && (
                            <p className="text-xs text-red-500 font-bold">{form.errors.items}</p>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                            <span className="font-bold text-slate-500 dark:text-white/50">الإجمالي الكلي</span>
                            <span className="text-2xl font-black text-slate-800 dark:text-white">
                                {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </SpatialCard>

                <div className="flex items-center gap-3">
                    <button
                        onClick={submit}
                        disabled={form.processing || items.every(i => !i.product_id)}
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
