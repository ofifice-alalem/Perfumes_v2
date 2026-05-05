import { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Trash2, Check, ArrowRight, RotateCcw } from 'lucide-react';

interface Supplier      { id: number; name: string; total_debt: string; }
interface Product       { id: number; name: string; stock: string; }
interface PaymentMethod { id: number; name: string; }

interface Props {
    suppliers:      Supplier[];
    products:       Product[];
    paymentMethods: PaymentMethod[];
    flash?: { success?: string; error?: string };
}

interface ItemRow { product_id: string; quantity: string; line_total: string; }
const emptyItem = (): ItemRow => ({ product_id: '', quantity: '', line_total: '' });

export default function PurchaseReturnsCreate({ suppliers, products, paymentMethods, flash }: Props) {
    const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

    const form = useForm({
        supplier_id:       '',
        purchase_id:       '',
        notes:             '',
        create_settlement: false,
        payment_method_id: '',
        items:             [] as ItemRow[],
    });

    const isCash = form.data.supplier_id === '1';
    const selectedSupplier = suppliers.find(s => String(s.id) === form.data.supplier_id);
    const grandTotal = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);

    const currentDebt      = selectedSupplier ? parseFloat(selectedSupplier.total_debt) : 0;
    const debtAfterReturn  = currentDebt - grandTotal;
    const showSettlementOption = !isCash && form.data.supplier_id && debtAfterReturn <= 0 && grandTotal > 0;

    // options
    const supplierOptions = [
        { label: 'مورد نقدي', badge: 'نقدي' },
        ...suppliers.map(s => ({ label: s.name })),
    ];
    const productOptions       = products.map(p => ({ label: p.name, meta: p.stock }));
    const paymentMethodOptions = paymentMethods.map(m => ({ label: m.name }));

    function resolveSupplierIdFromLabel(label: string): string {
        if (label === 'مورد نقدي') return '1';
        return String(suppliers.find(s => s.name === label)?.id ?? '');
    }
    function resolveProductIdFromLabel(label: string): string {
        return String(products.find(p => p.name === label)?.id ?? '');
    }
    function resolveMethodIdFromLabel(label: string): string {
        return String(paymentMethods.find(m => m.name === label)?.id ?? '');
    }

    function setItemProduct(idx: number, label: string) {
        setItems(prev => prev.map((r, i) => i === idx ? { ...r, product_id: resolveProductIdFromLabel(label) } : r));
    }
    function setItem(idx: number, field: keyof ItemRow, val: string) {
        setItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function submit() {
        form.transform(data => ({ ...data, items }));
        form.post('/purchase-returns', { preserveScroll: true });
    }

    const selectedSupplierLabel = form.data.supplier_id === '1'
        ? 'مورد نقدي'
        : (suppliers.find(s => String(s.id) === form.data.supplier_id)?.name ?? '');

    const selectedPaymentLabel = paymentMethods.find(m => String(m.id) === form.data.payment_method_id)?.name ?? '';

    return (
        <AppShell pageTitle="مرتجع جديد">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">

                <div className="flex items-center gap-3">
                    <Link href="/purchase-returns" className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">مرتجع جديد</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">إرجاع بضاعة للمورد</p>
                    </div>
                </div>

                {flash?.error && (
                    <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>
                )}

                {/* Header */}
                <SpatialCard title="بيانات المرتجع" icon={<RotateCcw className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <ModernSelect
                                label="المورد"
                                options={supplierOptions}
                                defaultValue={selectedSupplierLabel}
                                onSelect={val => form.setData('supplier_id', resolveSupplierIdFromLabel(val))}
                            />
                            {form.errors.supplier_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.supplier_id}</p>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">رقم الفاتورة (اختياري)</label>
                            <input type="number" min="1" value={form.data.purchase_id}
                                onChange={e => form.setData('purchase_id', e.target.value)}
                                placeholder="اتركه فارغاً للمرتجع المستقل"
                                className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                        </div>

                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات (اختياري)</label>
                            <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                        </div>
                    </div>

                    {/* Cash supplier notice */}
                    {isCash && (
                        <div className="mt-4 p-4 rounded-[16px] bg-amber-500/10 border border-amber-500/20">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">
                                ⚠️ المورد النقدي — سيتم إنشاء تسوية تلقائية بقيمة المرتجع
                            </p>
                            <ModernSelect
                                label="وسيلة الدفع للتسوية"
                                options={paymentMethodOptions}
                                defaultValue={selectedPaymentLabel}
                                onSelect={val => form.setData('payment_method_id', resolveMethodIdFromLabel(val))}
                            />
                        </div>
                    )}

                    {/* Settlement option for regular supplier */}
                    {showSettlementOption && (
                        <div className="mt-4 p-4 rounded-[16px] bg-purple-500/10 border border-purple-500/20">
                            <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-3">
                                بعد هذا المرتجع، سيصبح رصيد المورد:{' '}
                                <span className="font-black">{debtAfterReturn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                {debtAfterReturn < 0 ? ' (المورد دائن)' : ' (صفر)'}
                            </p>
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <div onClick={() => form.setData('create_settlement', !form.data.create_settlement)}
                                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${form.data.create_settlement ? 'bg-purple-500' : 'bg-black/10 dark:bg-white/10'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.data.create_settlement ? '-translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <span className="font-bold text-slate-700 dark:text-white/80 text-sm">إنشاء تسوية الآن</span>
                            </label>
                            {form.data.create_settlement && (
                                <ModernSelect
                                    label="وسيلة الدفع"
                                    options={paymentMethodOptions}
                                    defaultValue={selectedPaymentLabel}
                                    onSelect={val => form.setData('payment_method_id', resolveMethodIdFromLabel(val))}
                                />
                            )}
                        </div>
                    )}
                </SpatialCard>

                {/* Items */}
                <SpatialCard title="المنتجات المرتجعة" icon={<Plus className="w-4 h-4" />}
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
                                        <input type="number" min="0.01" step="0.01" value={item.quantity}
                                            onChange={e => setItem(idx, 'quantity', e.target.value)}
                                            placeholder="0"
                                            className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1.5 w-32">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الإجمالي</label>
                                        <input type="number" min="0" step="0.01" value={item.line_total}
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
                            );
                        })}

                        {form.errors.items && <p className="text-xs text-red-500 font-bold">{form.errors.items}</p>}

                        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                            <span className="font-bold text-slate-500 dark:text-white/50">إجمالي المرتجع</span>
                            <span className="text-2xl font-black text-orange-500">
                                {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </SpatialCard>

                <div className="flex items-center gap-3">
                    <button onClick={submit} disabled={form.processing || items.every(i => !i.product_id)}
                        className="spatial-button flex items-center gap-2 px-6 h-12 text-sm disabled:opacity-50">
                        <Check className="w-4 h-4" /> حفظ المرتجع
                    </button>
                    <Link href="/purchase-returns"
                        className="h-12 px-5 rounded-[20px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all flex items-center">
                        إلغاء
                    </Link>
                </div>
            </div>
        </AppShell>
    );
}
