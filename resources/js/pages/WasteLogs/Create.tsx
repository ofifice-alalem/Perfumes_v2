import { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, AlertTriangle, Package, ChevronRight, Hash } from 'lucide-react';

interface Category { id: number; name: string; unit: string; }
interface Product { id: number; name: string; stock: string; category: Category; qrcode?: string | null; }

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
    { label: 'كسر 🔨', value: 'broken', color: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400' },
    { label: 'انسكاب 🧪', value: 'spilled', color: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'منتهي الصلاحية ⏳', value: 'expired', color: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: 'مفقود ❓', value: 'lost', color: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { label: 'أخرى 📝', value: 'other', color: 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400' },
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

    // Barcode Scanner Listener
    useEffect(() => {
        let buffer = '';
        let lastTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            
            const now = Date.now();
            if (now - lastTime > 100) {
                buffer = '';
            }
            lastTime = now;

            if (e.key === 'Enter') {
                if (buffer.length > 3) {
                    const scanned = products.find(p => p.qrcode && p.qrcode.toLowerCase() === buffer.toLowerCase());
                    if (scanned) {
                        e.preventDefault();
                        setSelProduct(String(scanned.id));
                        setSelQty(''); 
                        setSelReason('other');
                        setSelNotes('');
                        setProductKey(k => k + 1);
                    }
                }
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [products]);

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
            <div className="flex flex-col gap-6 pb-32 lg:pb-6 select-none">
                
                {/* Touch Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/waste-logs"
                            className="w-16 h-16 rounded-[22px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-white flex items-center justify-center transition-all active:scale-90 border-2 border-black/5 dark:border-white/5 shadow-sm">
                            <ChevronRight className="w-8 h-8" />
                        </Link>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">تسجيل تالف جديد</h1>
                            <p className="text-base font-bold text-slate-400 dark:text-white/40 mt-1">واجهة لمسية متطورة لخصم التالف فورياً من المخزون</p>
                        </div>
                    </div>
                </div>

                {flash?.error && <div className="px-6 py-4 rounded-[20px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg">{flash.error}</div>}

                <div className="grid lg:grid-cols-[1fr_480px] gap-6">
                    {/* Left: Add Product Form */}
                    <SpatialCard title="بيانات المنتج التالف" icon={<Package className="w-6 h-6 text-primary" />}>
                        <div className="flex flex-col gap-6 p-2">
                            {/* Product Select */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">المنتج *</label>
                                <ModernSelect
                                    key={productKey}
                                    label=""
                                    placeholder="اختر المنتج أو امسح الباركود..."
                                    options={products.map(p => ({ label: `${p.name} (${p.stock} ${p.category.unit})`, searchKey: p.qrcode ?? undefined }))}
                                    defaultValue={selectedProduct ? `${selectedProduct.name} (${selectedProduct.stock} ${selectedProduct.category.unit})` : ""}
                                    onSelect={val => {
                                        const p = products.find(pr => `${pr.name} (${pr.stock} ${pr.category.unit})` === val);
                                        setSelProduct(p ? String(p.id) : '');
                                    }}
                                />
                            </div>

                            {/* Stock Indicator */}
                            {selectedProduct && (
                                <div className={`px-6 py-4 rounded-[20px] border-2 font-black text-lg flex items-center justify-between shadow-sm ${
                                    qtyNum > availableStock
                                        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    <span>المخزون المتاح</span>
                                    <span className="text-2xl font-black">{selectedProduct.stock} {selectedProduct.category.unit}</span>
                                </div>
                            )}

                            {/* Tall Quantity Input + Tall Number Pad Trigger Button */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">الكمية التالفة *</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={selQty}
                                            onChange={e => setSelQty(e.target.value)}
                                            step="0.01"
                                            min="0"
                                            max={selectedProduct ? selectedProduct.stock : undefined}
                                            className="spatial-input w-full h-20 rounded-[22px] px-6 text-3xl sm:text-4xl font-black text-slate-800 dark:text-white border-2 text-center"
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Tall Touch Pad Trigger Button */}
                                    <button
                                        type="button"
                                        onClick={() => openPad('الكمية التالفة', selQty, setSelQty, selectedProduct ? +selectedProduct.stock : undefined)}
                                        className="h-20 px-8 sm:px-10 rounded-[22px] bg-primary text-white font-black text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all shrink-0"
                                        title="فتح لوحة الأرقام اللمسية"
                                    >
                                        <Hash className="w-8 h-8" /> لوحة الأرقام
                                    </button>
                                </div>
                            </div>

                            {/* Reason Pills in Single Line with Tall Height */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">سبب التلف (اختر باللمس) *</label>
                                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                                    {reasonOptions.map(r => {
                                        const isSelected = selReason === r.value;
                                        return (
                                            <button
                                                key={r.value}
                                                type="button"
                                                onClick={() => setSelReason(r.value)}
                                                className={`h-20 px-6 rounded-[22px] border-2 font-black text-lg sm:text-xl transition-all flex items-center justify-center whitespace-nowrap shrink-0 active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-xl shadow-primary/25 scale-[1.03]'
                                                        : `${r.color} hover:opacity-90`
                                                }`}
                                            >
                                                {r.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">ملاحظات (اختياري)</label>
                                <input type="text" value={selNotes} onChange={e => setSelNotes(e.target.value)}
                                    className="spatial-input w-full h-16 rounded-[20px] px-5 text-lg font-bold border-2"
                                    placeholder="ملاحظة إضافية عن حالة التلف..." />
                            </div>

                            {/* Add Button */}
                            <button onClick={addToItems} disabled={!canAdd}
                                className="w-full h-20 rounded-[22px] bg-primary text-white font-black text-2xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-primary/25 active:scale-95 mt-2">
                                <Plus className="w-8 h-8" /> إضافة لقائمة التالف
                            </button>
                        </div>
                    </SpatialCard>

                    {/* Right: Items List */}
                    <SpatialCard title={`قائمة التالف المعروض للتأكيد (${items.length})`} icon={<AlertTriangle className="w-6 h-6 text-red-500" />}>
                        <div className="flex flex-col gap-6 p-2">
                            <div className="flex-1 overflow-y-auto max-h-[450px] flex flex-col gap-3">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30 gap-4">
                                        <span className="text-6xl">📦</span>
                                        <span className="font-black text-xl">لم تتم إضافة أي منتج تالف للقائمة بعد</span>
                                    </div>
                                ) : (
                                    items.map((item, idx) => (
                                        <div key={idx} className="p-5 rounded-[24px] bg-black/3 dark:bg-white/3 border-2 border-black/5 dark:border-white/10 flex flex-col gap-3 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 dark:text-white text-2xl">{item.product_name}</span>
                                                    <span className="text-xs font-bold text-slate-400 dark:text-white/40">{item.category_name}</span>
                                                </div>
                                                {/* Enlarged Touch Delete Button */}
                                                <button onClick={() => removeItem(idx)}
                                                    className="w-16 h-16 rounded-[20px] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center border-2 border-red-500/30 active:scale-90 shrink-0 shadow-md"
                                                    title="حذف من القائمة">
                                                    <Trash2 className="w-8 h-8" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-base pt-1 border-t border-black/5 dark:border-white/5">
                                                <div>
                                                    <span className="font-bold text-slate-400 text-xs uppercase tracking-widest block">الكمية</span>
                                                    <span className="font-black text-red-500 text-2xl">{item.quantity} {item.unit}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-400 text-xs uppercase tracking-widest block">السبب</span>
                                                    <span className="font-black text-slate-700 dark:text-white/90 text-lg">{reasonOptions.find(r => r.value === item.reason)?.label}</span>
                                                </div>
                                            </div>
                                            {item.notes && (
                                                <div className="text-sm font-bold text-slate-500 dark:text-white/60 pt-1">
                                                    ملاحظة: {item.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">ملاحظات عامة عن السجل</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    className="spatial-input w-full h-28 rounded-[20px] p-4 text-lg font-bold border-2 resize-none"
                                    placeholder="ملاحظات عامة عن عملية التلف..." />
                            </div>

                            <button onClick={submit} disabled={items.length === 0 || processing}
                                className="w-full h-20 rounded-[22px] bg-red-500 text-white font-black text-2xl hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-red-500/25 active:scale-95">
                                <Check className="w-8 h-8" /> {processing ? 'جاري التسجيل...' : 'تأكيد التسجيل وتخفيض المخزون'}
                            </button>
                        </div>
                    </SpatialCard>
                </div>
            </div>

            {/* Fixed Number Pad Modal */}
            {showPad && padCallback && (
                <NumberPadModal
                    isOpen={showPad}
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
