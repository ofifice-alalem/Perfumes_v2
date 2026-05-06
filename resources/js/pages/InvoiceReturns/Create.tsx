import { useState, useEffect } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { Plus, Trash2, Check, ArrowRight, RotateCcw, RefreshCw } from 'lucide-react';

interface Customer      { id: number; name: string; total_debt: string; }
interface Product       { id: number; name: string; stock: string; }
interface PaymentMethod { id: number; name: string; }

interface InvoiceItem {
    id: number;
    product_id: number;
    product_name: string;
    sale_type: string;
    size_id: number | null;
    size_label: string | null;
    quantity: string;
    unit_price: string;
    line_total: string;
}

interface Props {
    customers:             Customer[];
    products:              Product[];
    paymentMethods:        PaymentMethod[];
    selected_customer_id?: number;
    selected_invoice_id?:  number | null;
    invoice_items?:        InvoiceItem[];
    flash?: { success?: string; error?: string };
}

interface ItemRow {
    invoice_item_id?: number;  // معرف عنصر الفاتورة الأصلي
    product_id: string;
    product_name?: string;
    sale_type?: string;
    size_label?: string;
    quantity: string;
    unit_price: string;
    line_total: string;
    max_quantity?: number;  // الحد الأقصى من الفاتورة الأصلية
}
interface SettlementRow { payment_method_id: string; amount: string; notes: string; }

const emptyItem       = (): ItemRow       => ({ product_id: '', quantity: '', unit_price: '', line_total: '' });
const emptySettlement = (): SettlementRow => ({ payment_method_id: '', amount: '', notes: '' });

function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceReturnsCreate({ customers, products, paymentMethods, selected_customer_id, selected_invoice_id, invoice_items, flash }: Props) {
    const [items,       setItems]       = useState<ItemRow[]>([emptyItem()]);
    const [settlements, setSettlements] = useState<SettlementRow[]>([emptySettlement()]);
    const [createSettlement, setCreateSettlement] = useState(false);

    const form = useForm({
        customer_id: String(selected_customer_id ?? 1),
        invoice_id:  selected_invoice_id ? String(selected_invoice_id) : '',
        notes:       '',
    });
    
    // تحويل عناصر الفاتورة إلى صفوف قابلة للتعديل
    useEffect(() => {
        if (invoice_items && invoice_items.length > 0) {
            const invoiceRows: ItemRow[] = invoice_items.map(item => ({
                invoice_item_id: item.id,
                product_id: String(item.product_id),
                product_name: item.product_name,
                sale_type: item.sale_type,
                size_label: item.size_label ?? undefined,
                quantity: '0',
                unit_price: item.unit_price,
                line_total: '0',
                max_quantity: parseFloat(item.quantity),
            }));
            setItems(invoiceRows);
        }
    }, [invoice_items]);

    const saleTypeLabels: Record<string, string> = {
        tier_decant: 'زيتي',
        unit_decant: 'أصلي/تقسيم',
        full_bottle: 'عبوة كاملة',
        unit_based: 'بالوحدة',
    };
    
    const isCash      = form.data.customer_id === '1';
    const customer    = customers.find(c => String(c.id) === form.data.customer_id);
    const grandTotal  = items.reduce((s, r) => s + (parseFloat(r.line_total) || 0), 0);
    const totalRecovered = settlements.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const debtAfterReturn = customer ? parseFloat(customer.total_debt) - grandTotal : 0;
    const showSettlementOption = !isCash && debtAfterReturn <= 0 && grandTotal > 0;

    useEffect(() => {
        if (isCash || showSettlementOption) {
            setSettlements(prev => {
                if (prev.length === 1 && prev[0].payment_method_id === '') {
                    return [{ ...prev[0], amount: grandTotal > 0 ? fmt(grandTotal) : '' }];
                }
                return prev;
            });
        }
    }, [grandTotal, isCash, showSettlementOption]);

    const customerOptions = customers.map(c => ({
        label: c.name,
        badge: c.id === 1 ? 'نقدي' : undefined,
        meta:  c.id !== 1 ? `دين: ${parseFloat(c.total_debt).toFixed(2)}` : undefined,
    }));
    const productOptions = products.map(p => ({ label: p.name, meta: `مخزون: ${p.stock}` }));
    const methodOptions  = paymentMethods.map(m => ({ label: m.name }));

    function resolveProduct(label: string) { return String(products.find(p => p.name === label)?.id ?? ''); }
    function resolveMethod(label: string)  { return String(paymentMethods.find(m => m.name === label)?.id ?? ''); }

    function setItem(idx: number, field: keyof ItemRow, val: string) {
        setItems(prev => prev.map((r, i) => {
            if (i !== idx) return r;
            const updated = { ...r, [field]: val };
            
            if (field === 'quantity' || field === 'unit_price') {
                const qty   = parseFloat(field === 'quantity' ? val : updated.quantity) || 0;
                const price = parseFloat(field === 'unit_price' ? val : updated.unit_price) || 0;
                
                // فحص الحد الأقصى
                if (field === 'quantity' && updated.max_quantity !== undefined && qty > updated.max_quantity) {
                    updated.quantity = updated.max_quantity.toString();
                    const limitedQty = updated.max_quantity;
                    updated.line_total = limitedQty > 0 && price > 0 ? (limitedQty * price).toFixed(2) : updated.line_total;
                    return updated;
                }
                
                updated.line_total = qty > 0 && price > 0 ? (qty * price).toFixed(2) : updated.line_total;
            }
            return updated;
        }));
    }

    function setSettlement(idx: number, field: keyof SettlementRow, val: string) {
        setSettlements(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    }

    function submit() {
        const shouldCreateSettlement = isCash || (showSettlementOption && createSettlement);
        const validSettlements = shouldCreateSettlement
            ? settlements.filter(r => r.payment_method_id && parseFloat(r.amount) > 0)
            : [];

        form.transform(data => ({
            ...data,
            items,
            create_settlement: shouldCreateSettlement && validSettlements.length > 0,
            settlement: validSettlements.length > 0 ? validSettlements[0] : null,
        }));
        form.post('/invoice-returns', { preserveScroll: true });
    }

    const selectedCustomerLabel = form.data.customer_id === '1'
        ? 'زبون نقدي'
        : (customers.find(c => String(c.id) === form.data.customer_id)?.name ?? 'زبون نقدي');

    return (
        <AppShell pageTitle="مرتجع جديد">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                <div className="flex items-center gap-3">
                    <Link href="/invoice-returns" className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-black/10 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">مرتجع جديد</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-0.5">إرجاع بضاعة من العميل</p>
                    </div>
                </div>

                {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                {/* بيانات المرتجع */}
                <SpatialCard title="بيانات المرتجع" icon={<RotateCcw className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <ModernSelect label="العميل" options={customerOptions} defaultValue={selectedCustomerLabel}
                                onSelect={val => {
                                    const c = customers.find(c => c.name === val);
                                    const id = c ? String(c.id) : '1';
                                    router.get('/invoice-returns/create', { customer_id: id }, { preserveScroll: true, replace: true });
                                }}
                            />
                            {form.errors.customer_id && <p className="text-xs text-red-500 font-bold mt-1">{form.errors.customer_id}</p>}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">رقم الفاتورة (اختياري)</label>
                            <input type="number" min="1"
                                value={form.data.invoice_id}
                                onChange={e => form.setData('invoice_id', e.target.value)}
                                placeholder="اتركه فارغاً للمرتجع المستقل"
                                className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                        </div>
                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">ملاحظات (اختياري)</label>
                            <input value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold" />
                        </div>
                    </div>
                </SpatialCard>

                {/* المنتجات المرتجعة */}
                <SpatialCard title="المنتجات المرتجعة" icon={<Plus className="w-4 h-4" />}
                    action={
                        !form.data.invoice_id && (
                            <button onClick={() => setItems(p => [...p, emptyItem()])}
                                className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold text-sm border border-primary/20">
                                <Plus className="w-3.5 h-3.5" /> إضافة سطر
                            </button>
                        )
                    }
                >
                    <div className="flex flex-col gap-3">
                        {form.data.invoice_id && invoice_items && invoice_items.length > 0 ? (
                            // عرض عناصر الفاتورة الأصلية
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
                                            <th className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">المنتج</th>
                                            <th className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">النوع</th>
                                            <th className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">الحجم</th>
                                            <th className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">الكمية</th>
                                            <th className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">سعر الوحدة</th>
                                            <th className="text-right px-4 py-3 text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                                                {/* اسم المنتج */}
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{item.product_name}</td>
                                                
                                                {/* نوع البيع */}
                                                <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/50 text-xs">
                                                    {item.sale_type ? saleTypeLabels[item.sale_type] : '—'}
                                                </td>
                                                
                                                {/* الحجم */}
                                                <td className="px-4 py-3 font-bold text-slate-500 dark:text-white/50">
                                                    {item.size_label ?? '—'}
                                                </td>
                                                
                                                {/* الكمية */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <input type="number" min="0" max={item.max_quantity} step="0.01" 
                                                            value={item.quantity}
                                                            onChange={e => setItem(idx, 'quantity', e.target.value)}
                                                            placeholder="0" 
                                                            className="w-24 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm text-center focus:border-primary focus:outline-none transition-all" />
                                                        {item.max_quantity !== undefined && (
                                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                                ماكس: {item.max_quantity}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                {/* سعر الوحدة */}
                                                <td className="px-4 py-3">
                                                    <input type="number" min="0" step="0.01" 
                                                        value={item.unit_price}
                                                        onChange={e => setItem(idx, 'unit_price', e.target.value)}
                                                        placeholder="0.00" 
                                                        className="w-28 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm text-center focus:border-primary focus:outline-none transition-all" />
                                                </td>
                                                
                                                {/* الإجمالي */}
                                                <td className="px-4 py-3 font-black text-slate-800 dark:text-white">
                                                    {parseFloat(item.line_total || '0').toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            // الوضع العادي - إضافة منتجات يدوياً
                            items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end p-3 rounded-[16px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                                    <ModernSelect label="المنتج" options={productOptions}
                                        defaultValue={products.find(p => String(p.id) === item.product_id)?.name ?? ''}
                                        onSelect={val => setItem(idx, 'product_id', resolveProduct(val))}
                                        placeholder="اختر منتجاً..." />
                                    <div className="flex flex-col gap-1.5 w-24">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الكمية</label>
                                        <input type="number" min="0.01" step="0.01" value={item.quantity}
                                            onChange={e => setItem(idx, 'quantity', e.target.value)}
                                            placeholder="0" className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1.5 w-28">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">سعر الوحدة</label>
                                        <input type="number" min="0" step="0.01" value={item.unit_price}
                                            onChange={e => setItem(idx, 'unit_price', e.target.value)}
                                            placeholder="0.00" className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1.5 w-28">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">الإجمالي</label>
                                        <input type="number" min="0" step="0.01" value={item.line_total}
                                            onChange={e => setItem(idx, 'line_total', e.target.value)}
                                            placeholder="0.00" className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                                        disabled={items.length === 1}
                                        className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                        {form.errors.items && <p className="text-xs text-red-500 font-bold">{form.errors.items}</p>}
                        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                            <span className="font-bold text-slate-500 dark:text-white/50">إجمالي المرتجع</span>
                            <span className="text-2xl font-black text-orange-500">{fmt(grandTotal)}</span>
                        </div>
                        {!isCash && grandTotal > 0 && (
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm font-bold text-slate-500 dark:text-white/50">الدين بعد الإرجاع</span>
                                <span className={`font-black ${debtAfterReturn > 0 ? 'text-amber-500' : debtAfterReturn < 0 ? 'text-purple-500' : 'text-slate-400'}`}>
                                    {debtAfterReturn.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                </SpatialCard>

                {/* التسوية */}
                {(isCash || showSettlementOption) && grandTotal > 0 && (
                    <SpatialCard title="التسوية" icon={<RefreshCw className="w-4 h-4" />}
                        action={
                            !isCash && settlements.length < 3 && (
                                <button onClick={() => setSettlements(p => [...p, emptySettlement()])}
                                    className="flex items-center gap-1.5 px-4 h-9 rounded-[14px] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-bold text-sm border border-purple-500/20">
                                    <Plus className="w-3.5 h-3.5" /> إضافة وسيلة
                                </button>
                            )
                        }
                    >
                        <div className="flex flex-col gap-4">
                            {isCash ? (
                                <div className="px-4 py-3 rounded-[14px] bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">⚠️ زبون نقدي — تسوية تلقائية بقيمة المرتجع</p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 rounded-[14px] bg-purple-500/5 border border-purple-500/15">
                                    <label className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setCreateSettlement(p => !p)}>
                                        <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${createSettlement ? 'border-purple-500 bg-purple-500' : 'border-slate-300 dark:border-white/30'}`}>
                                            {createSettlement && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-white/80 text-sm">إنشاء تسوية الآن (الدين أصبح ≤ 0)</span>
                                    </label>
                                </div>
                            )}

                            {(isCash || createSettlement) && settlements.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end p-3 rounded-[16px] bg-purple-500/5 border border-purple-500/15">
                                    <ModernSelect label="وسيلة التسوية" options={methodOptions}
                                        defaultValue={paymentMethods.find(m => String(m.id) === row.payment_method_id)?.name ?? ''}
                                        onSelect={val => setSettlement(idx, 'payment_method_id', resolveMethod(val))} />
                                    <div className="flex flex-col gap-1.5 w-36">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">المبلغ</label>
                                        <input type="number" min="0.01" step="0.01" value={row.amount}
                                            onChange={e => setSettlement(idx, 'amount', e.target.value)}
                                            placeholder={fmt(grandTotal)} className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">ملاحظة (اختياري)</label>
                                        <input value={row.notes} onChange={e => setSettlement(idx, 'notes', e.target.value)}
                                            placeholder="اختياري..." className="spatial-input h-14 rounded-[20px] px-4 text-[15px] font-bold" />
                                    </div>
                                    {!isCash && (
                                        <button onClick={() => setSettlements(p => p.filter((_, i) => i !== idx))}
                                            className="w-14 h-14 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </SpatialCard>
                )}

                <div className="flex items-center gap-3">
                    <button onClick={submit}
                        disabled={form.processing || items.every(i => !i.product_id) || !form.data.customer_id}
                        className="spatial-button flex items-center gap-2 px-6 h-12 text-sm disabled:opacity-50">
                        <Check className="w-4 h-4" /> حفظ المرتجع
                    </button>
                    <Link href="/invoice-returns" className="h-12 px-5 rounded-[20px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all flex items-center">
                        إلغاء
                    </Link>
                </div>
            </div>
        </AppShell>
    );
}
