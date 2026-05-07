import { useState } from 'react';
import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, AlertTriangle, Package } from 'lucide-react';

interface Category { id: number; name: string; unit: string; }
interface Product { id: number; name: string; stock: string; category: Category; }

interface Props {
    products: Product[];
    flash?: { success?: string; error?: string };
}

interface WasteItem {
    product_id: number;
    product_name: string;
    category_name: string;
    unit: string;
    quantity: string;
    reason: string;
    notes: string;
}

const reasonOptions = [
    { label: 'كسر', value: 'broken' },
    { label: 'انسكاب', value: 'spilled' },
    { label: 'منتهي الصلاحية', value: 'expired' },
    { label: 'مفقود', value: 'lost' },
    { label: 'أخرى', value: 'other' },
];

export default function WasteLogsCreate({ products, flash }: Props) {
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<WasteItem[]>([]);
    const [processing, setProcessing] = useState(false);

    const [selProduct, setSelProduct] = useState('');
    const [selQty, setSelQty] = useState('');
    const [selReason, setSelReason] = useState('other');
    const [selNotes, setSelNotes] = useState('');
    const [productKey, setProductKey] = useState(0);

    const [showPad, setShowPad] = useState(false);
    const [padTitle, setPadTitle] = useState('');
    const [padInitial, setPadInitial] = useState('');
    const [padMax, setPadMax] = useState<number | undefined>(undefined);
    const [padCallback, setPadCallback] = useState<((v: string) => void) | null>(null);

    function openPad(title: string, initial: string, cb: (v: string) => void, max?: number) {
        setPadTitle(title);
        setPadInitial(initial);
        setPadCallback(() => cb);
        setPadMax(max);
        setShowPad(true);
    }

    const selectedProduct = products.find(p => p.id === +selProduct);
    const qtyNum = parseFloat(selQty) || 0;
    const availableStock = selectedProduct ? parseFloat(selectedProduct.stock) : 0;
    const canAdd = selectedProduct && selQty && qtyNum > 0 && qtyNum <= availableStock;

    function addToItems() {
        if (!selectedProduct || !selQty) return;
        const qty = parseFloat(selQty);

        if (isNaN(qty) || qty <= 0) {
            alert('الرجاء إدخال كمية صحيحة');
            return;
        }

        if (qty > +selectedProduct.stock) {
            alert(`الكمية المطلوبة (${qty}) أكبر من المخزون المتاح (${selectedProduct.stock})`);
            return;
        }

        setItems(prev => [...prev, {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            category_name: selectedProduct.category.name,
            unit: selectedProduct.category.unit,
            quantity: String(qty),
            reason: selReason,
            notes: selNotes,
        }]);

        setSelProduct('');
        setSelQty('');
        setSelReason('other');
        setSelNotes('');
        setProductKey(k => k + 1);
    }

    function removeItem(idx: number) {
        setItems(prev => prev.filter((_, i) => i !== idx));
    }

    function submit() {
        if (items.length === 0) {
            alert('يجب إضافة منتج واحد على الأقل');
            return;
        }

        setProcessing(true);
        router.post('/waste-logs', {
            notes,
            items: items.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity,
                reason: i.reason,
                notes: i.notes || null,
            })),
        }, {
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <AppShell pageTitle="تسجيل تالف جديد">
            <div className="flex flex-col gap-6 pb-32 lg:pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">تسجيل تالف جديد</h1>
                        <p className="text-sm font-bold text-slate-400 dark:text-white/40 mt-1">إضافة منتجات تالفة وخصمها من المخزون</p>
                    </div>
                </div>

                {flash?.error && <div className="px-5 py-3 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">{flash.error}</div>}

                <div className="grid lg:grid-cols-[1fr_480px] gap-6">
                    {/* Left: Add Product Form */}
                    <div className="spatial-card p-6 flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Package className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white">إضافة منتج تالف</h2>
                        </div>

                        <ModernSelect
                            key={productKey}
                            label="المنتج"
                            placeholder="اختر المنتج"
                            options={products.map(p => ({ label: `${p.name} (${p.stock} ${p.category.unit})` }))}
                            onSelect={val => {
                                const p = products.find(pr => `${pr.name} (${pr.stock} ${pr.category.unit})` === val);
                                setSelProduct(p ? String(p.id) : '');
                            }}
                        />

                        {selectedProduct && (
                            <div className={`px-4 py-3 rounded-[14px] border font-bold text-sm ${
                                qtyNum > availableStock
                                    ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}>
                                {qtyNum > availableStock
                                    ? `⚠️ الكمية المطلوبة (${qtyNum}) أكبر من المخزون المتاح (${selectedProduct.stock})`
                                    : `المخزون المتاح: ${selectedProduct.stock} ${selectedProduct.category.unit}`
                                }
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-white/60 mb-2">الكمية التالفة</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={selQty}
                                    onChange={e => setSelQty(e.target.value)}
                                    step="0.01"
                                    min="0"
                                    max={selectedProduct ? selectedProduct.stock : undefined}
                                    className="w-full h-12 rounded-[14px] spatial-input text-right font-black text-slate-800 dark:text-white pr-4"
                                    placeholder="0"
                                />
                                <button
                                    onClick={() => openPad('الكمية التالفة', selQty, setSelQty, selectedProduct ? +selectedProduct.stock : undefined)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[10px] bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all"
                                    title="فتح لوحة الأرقام"
                                >
                                    <span className="text-lg font-bold">#</span>
                                </button>
                            </div>
                        </div>

                        <ModernSelect
                            label="سبب التلف"
                            placeholder="اختر السبب"
                            options={reasonOptions.map(r => ({ label: r.label }))}
                            defaultValue={reasonOptions.find(r => r.value === selReason)?.label ?? 'أخرى'}
                            onSelect={val => {
                                const r = reasonOptions.find(ro => ro.label === val);
                                setSelReason(r?.value ?? 'other');
                            }}
                        />

                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-white/60 mb-2">ملاحظات (اختياري)</label>
                            <input type="text" value={selNotes} onChange={e => setSelNotes(e.target.value)}
                                className="w-full h-12 rounded-[14px] spatial-input text-right font-bold text-slate-800 dark:text-white"
                                placeholder="ملاحظة إضافية..." />
                        </div>

                        <button onClick={addToItems} disabled={!canAdd}
                            className="w-full h-12 rounded-[14px] bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" /> إضافة للقائمة
                        </button>
                    </div>

                    {/* Right: Items List */}
                    <div className="spatial-card p-6 flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white">المنتجات التالفة ({items.length})</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[500px] -mx-6 px-6">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30 gap-2">
                                    <span className="text-3xl">📦</span>
                                    <span className="font-bold text-sm">لم تتم إضافة أي منتج بعد</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="rounded-[18px] border border-black/8 dark:border-white/12 overflow-hidden">
                                            <div className="px-4 py-3 bg-black/3 dark:bg-white/6 flex items-center justify-between">
                                                <span className="font-black text-slate-800 dark:text-white text-sm">{item.product_name}</span>
                                                <button onClick={() => removeItem(idx)}
                                                    className="w-8 h-8 rounded-[10px] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="px-4 py-2 flex flex-col gap-1 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">الكمية</span>
                                                    <span className="font-black text-slate-700 dark:text-white/80">{item.quantity} {item.unit}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-400 dark:text-white/40">السبب</span>
                                                    <span className="font-bold text-slate-600 dark:text-white/60">{reasonOptions.find(r => r.value === item.reason)?.label}</span>
                                                </div>
                                                {item.notes && (
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-slate-400 dark:text-white/40">ملاحظة</span>
                                                        <span className="font-bold text-slate-600 dark:text-white/60">{item.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-white/60 mb-2">ملاحظات عامة (اختياري)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                className="w-full h-20 rounded-[14px] spatial-input text-right font-bold text-slate-800 dark:text-white resize-none"
                                placeholder="ملاحظات عامة عن السجل..." />
                        </div>

                        <button onClick={submit} disabled={items.length === 0 || processing}
                            className="w-full h-12 rounded-[14px] bg-red-500 text-white font-bold hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <Check className="w-5 h-5" /> {processing ? 'جاري التسجيل...' : 'تأكيد التسجيل'}
                        </button>
                    </div>
                </div>
            </div>

            {showPad && padCallback && (
                <NumberPadModal
                    title={padTitle}
                    initialValue={padInitial}
                    maxValue={padMax}
                    onConfirm={val => { padCallback(val); setShowPad(false); }}
                    onClose={() => setShowPad(false)}
                />
            )}
        </AppShell>
    );
}
