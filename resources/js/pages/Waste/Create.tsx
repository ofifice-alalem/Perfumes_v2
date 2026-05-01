import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { ModernSelect } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { Plus, Trash2, Check, X, Package, ChevronLeft, AlertTriangle } from 'lucide-react';

interface Category { id: number; name: string; unit: string; }
interface Product  { id: number; name: string; stock: string; category: Category; }

interface Props {
  products: Product[];
  flash?: { success?: string; error?: string };
}

interface CartItem {
  product_id:    number;
  product_name:  string;
  category_name: string;
  unit:          string;
  quantity:      string;
  reason:        string;
  notes:         string;
}

const reasonLabels: Record<string, string> = {
  broken:  'كسر',
  spilled: 'انسكاب',
  expired: 'فساد',
  lost:    'مفقود',
  other:   'أخرى',
};

const reasonColors: Record<string, string> = {
  broken:  'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  spilled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  expired: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  lost:    'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  other:   'bg-black/5 text-slate-600 dark:text-white/60 border-black/10 dark:border-white/10',
};

export default function WasteCreate({ products, flash }: Props) {
  const [notes,      setNotes]      = useState('');
  const [cart,       setCart]       = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [productKey, setProductKey] = useState(0);

  const [selProduct, setSelProduct] = useState('');
  const [selQty,     setSelQty]     = useState('');
  const [selReason,  setSelReason]  = useState('other');
  const [selNotes,   setSelNotes]   = useState('');

  const [showNumberPad,     setShowNumberPad]     = useState(false);
  const [numberPadTitle,    setNumberPadTitle]    = useState('');
  const [numberPadInitial,  setNumberPadInitial]  = useState('');
  const [numberPadCallback, setNumberPadCallback] = useState<((v: string) => void) | null>(null);

  function openNumberPad(title: string, initial: string, cb: (v: string) => void) {
    setNumberPadTitle(title);
    setNumberPadInitial(initial);
    setNumberPadCallback(() => cb);
    setShowNumberPad(true);
  }

  const selectedProduct = products.find(p => p.id === +selProduct);
  const canAdd = selectedProduct && selQty && +selQty > 0;

  function addToCart() {
    if (!selectedProduct || !selQty) return;
    setCart(prev => [...prev, {
      product_id:    selectedProduct.id,
      product_name:  selectedProduct.name,
      category_name: selectedProduct.category.name,
      unit:          selectedProduct.category.unit,
      quantity:      selQty,
      reason:        selReason,
      notes:         selNotes,
    }]);
    setSelProduct(''); setSelQty(''); setSelReason('other'); setSelNotes('');
    setProductKey(k => k + 1);
  }

  function submit() {
    if (cart.length === 0) return;
    setProcessing(true);
    router.post('/waste/store-with-items', { notes, items: cart }, { onFinish: () => setProcessing(false) });
  }

  return (
    <>
      <AppShell pageTitle="تسجيل تالف جديد">
        <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-10 h-[calc(100vh-80px)] lg:h-[calc(100dvh-120px)] overflow-hidden">

          {/* LEFT PANEL */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-black/5 dark:border-white/5">

            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
              <Link href="/waste" className="flex items-center gap-1 text-slate-400 dark:text-white/40 hover:text-primary transition-all font-bold text-sm">
                <ChevronLeft className="w-4 h-4" /> التالف
              </Link>
              <span className="text-slate-300 dark:text-white/10">/</span>
              <span className="font-black text-slate-800 dark:text-white text-sm">تسجيل تالف جديد</span>
              {flash?.error && <span className="text-xs font-bold text-red-500 mr-auto">{flash.error}</span>}
            </div>

            {/* Add product form */}
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">إضافة منتج تالف</span>
              </div>

              {/* المنتج */}
              <div className="w-full mb-4">
                <ModernSelect key={productKey} label="" placeholder="اختر المنتج..."
                  options={products.map(p => ({ label: p.name, badge: p.category.name, meta: `مخزون: ${p.stock}` }))}
                  defaultValue=""
                  onSelect={val => {
                    const p = products.find(p => p.name === val);
                    setSelProduct(p ? String(p.id) : '');
                    setSelQty('');
                  }}
                />
              </div>

              {selectedProduct && (
                <div className="flex flex-wrap items-end gap-3 pt-2">
                  {/* الكمية */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      الكمية ({selectedProduct.category.unit})
                    </label>
                    <button onClick={() => openNumberPad(`الكمية (${selectedProduct.category.unit})`, selQty, setSelQty)}
                      className="spatial-input h-16 rounded-[20px] px-5 text-[18px] font-black w-36 text-center cursor-pointer hover:border-primary/40 transition-all">
                      {selQty || '0'}
                    </button>
                  </div>

                  {/* السبب */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">السبب</label>
                    <div className="flex gap-2">
                      {Object.entries(reasonLabels).map(([key, label]) => (
                        <button key={key} onClick={() => setSelReason(key)}
                          className={`h-16 px-4 rounded-[16px] font-bold text-sm border-2 transition-all ${
                            selReason === key ? 'bg-primary border-primary text-white' : `${reasonColors[key]} border`
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* زر الإضافة */}
                  <button onClick={addToCart} disabled={!canAdd}
                    className="spatial-button flex items-center gap-2 px-8 h-16 text-base font-black disabled:opacity-40 shrink-0 active:scale-[0.95]">
                    <Plus className="w-5 h-5" /> إضافة
                  </button>
                </div>
              )}
            </div>

            {/* Notes + Submit */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">ملاحظات عامة</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3} placeholder="ملاحظات على سجل التالف... (اختياري)"
                  className="w-full spatial-input rounded-[16px] px-4 py-3 text-sm font-bold resize-none" />
              </div>
            </div>

            {/* Submit */}
            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex gap-2">
              <Link href="/waste"
                className="w-1/4 flex items-center justify-center gap-2 h-16 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 font-bold text-sm border border-black/10 dark:border-white/20 transition-all">
                <X className="w-4 h-4" /> إلغاء
              </Link>
              <button onClick={submit} disabled={processing || cart.length === 0}
                className="flex-1 spatial-button flex items-center justify-center gap-2 h-16 text-base font-black disabled:opacity-40">
                <Check className="w-5 h-5" />
                {cart.length > 0 ? `تأكيد التسجيل — ${cart.length} منتج` : 'تأكيد التسجيل'}
              </button>
            </div>
          </div>

          {/* RIGHT PANEL — عناصر التالف */}
          <div className="w-full lg:w-[600px] flex flex-col overflow-hidden bg-black/2 dark:bg-white/[0.02] shrink-0 border-r border-black/5 dark:border-white/5">

            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-black text-slate-800 dark:text-white text-sm">
                  المنتجات التالفة
                  {cart.length > 0 && <span className="mr-2 text-xs font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{cart.length}</span>}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300 dark:text-white/20">
                  <Package className="w-12 h-12" />
                  <span className="font-bold text-sm">لا توجد منتجات</span>
                  <span className="text-xs">أضف منتجاً من اليسار</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[2fr_80px_100px_50px] gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-slate-800/50 rounded-[12px] border border-slate-200/50 dark:border-slate-700/50">
                    <span>المنتج</span>
                    <span className="text-center">الكمية</span>
                    <span className="text-center">السبب</span>
                    <span className="text-center">حذف</span>
                  </div>
                  {cart.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[2fr_80px_100px_50px] gap-3 px-4 py-3 rounded-[16px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/30 transition-all shadow-sm">
                      <div className="min-w-0 flex flex-col justify-center">
                        <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product_name}</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.category_name}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{item.quantity}{item.unit}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-[8px] border ${reasonColors[item.reason]}`}>
                          {reasonLabels[item.reason]}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                          className="w-9 h-9 rounded-[10px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all active:scale-[0.95]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>

      <NumberPadModal
        isOpen={showNumberPad}
        onClose={() => setShowNumberPad(false)}
        onConfirm={v => { numberPadCallback?.(v); }}
        initialValue={numberPadInitial}
        title={numberPadTitle}
      />
    </>
  );
}
