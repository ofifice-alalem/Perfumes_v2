import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ModernMultiSelect } from '@/components/ui/SpatialComponents';
import { SlidersHorizontal, X, AlertTriangle, Check } from 'lucide-react';
import { Category, PriceTier, CatalogNameItem } from '../types';

interface ProductFilterDrawerProps {
    open: boolean;
    onClose: () => void;
    catalogNames?: CatalogNameItem[];
    categories: Category[];
    tiers: PriceTier[];
    appliedCat: number | null;
    appliedTier: number | null;
    appliedKeywords: string[];
    appliedLowStock: boolean;
    onApply: (cat: number | null, tier: number | null, keywords: string[], lowStock: boolean) => void;
}

export const ProductFilterDrawer: React.FC<ProductFilterDrawerProps> = ({
    open,
    onClose,
    catalogNames = [],
    categories,
    tiers,
    appliedCat,
    appliedTier,
    appliedKeywords,
    appliedLowStock,
    onApply,
}) => {
    const [draftCat, setDraftCat] = useState<number | null>(appliedCat);
    const [draftTier, setDraftTier] = useState<number | null>(appliedTier);
    const [draftSearchKeywords, setDraftSearchKeywords] = useState<string[]>(appliedKeywords);
    const [draftLowStockOnly, setDraftLowStockOnly] = useState<boolean>(appliedLowStock);

    useEffect(() => {
        if (open) {
            setDraftCat(appliedCat);
            setDraftTier(appliedTier);
            setDraftSearchKeywords([...appliedKeywords]);
            setDraftLowStockOnly(appliedLowStock);
        }
    }, [open, appliedCat, appliedTier, appliedKeywords, appliedLowStock]);

    if (!open) return null;

    const hasDraftFilter = !!draftCat || !!draftTier || draftSearchKeywords.length > 0 || draftLowStockOnly;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
            <div
                className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
                onClick={onClose}
            />
            <div className="relative w-full sm:w-[600px] md:w-[680px] max-w-[95vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300 overflow-hidden cursor-default">
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 select-none shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[20px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-3 shadow-md">
                            <SlidersHorizontal className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">تصفية المنتجات المتقدمة</h2>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">تحديد خيارات البحث والفرز والتصنيف بكفاءة عالية</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all border border-slate-300 dark:border-slate-600 touch-manipulation cursor-pointer"
                        aria-label="إغلاق"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-7 flex flex-col gap-6 scrollbar-none">
                    {/* حاوية 1: البحث بالمنتج والأسماء المطابقة */}
                    <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                        <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3 select-none">
                            <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg shrink-0 border border-primary/30">🔍</span>
                            <span className="text-slate-900 dark:text-white tracking-wide">البحث بالمنتج (اختيار متعدد / تطابق ذكي / كود QR)</span>
                        </h4>

                        <div className="flex flex-col gap-3">
                            <ModernMultiSelect
                                label=""
                                placeholder="ابحث باسم العطر، كود الـ QR، أو اكتب أي كلمة..."
                                values={draftSearchKeywords}
                                options={catalogNames.map(p => ({
                                    value: p.name,
                                    label: p.name,
                                    badge: p.category?.name,
                                    searchKey: p.qrcode ? `${p.name} ${p.qrcode} ${p.id}` : `${p.name} ${p.id}`,
                                }))}
                                onSelect={setDraftSearchKeywords}
                                allowFreeText={true}
                            />

                            {draftSearchKeywords.length > 0 && (
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                        تم تحديد {draftSearchKeywords.length} محدد للبحث
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setDraftSearchKeywords([])}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all font-black text-xs border border-red-500/30 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" /> مسح محددات البحث
                                    </button>
                                </div>
                            )}

                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 select-none">
                                💡 يدعم التطابق الذكي للأخطاء الإملائية (الهمزات أ/إ/آ، التاء المربوطة والهاء، الياء والألف المقصورة، وأل التعريف).
                            </p>
                        </div>
                    </div>

                    {/* حاوية 2: تصنيف المنتجات */}
                    <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                        <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3 select-none">
                            <span className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shrink-0 border border-purple-500/30">🏷️</span>
                            <span className="text-slate-900 dark:text-white tracking-wide">تصنيف المنتجات</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => { setDraftCat(null); setDraftTier(null); }}
                                className={`flex items-center justify-between px-5 h-16 sm:h-18 rounded-[20px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation shadow-sm ${
                                    !draftCat
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>جميع التصنيفات</span>
                            </button>
                            {categories.map(cat => {
                                const active = draftCat === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            setDraftCat(cat.id);
                                            if (!cat.name.includes('زيت')) {
                                                setDraftTier(null);
                                            }
                                        }}
                                        className={`flex items-center justify-between px-5 h-16 sm:h-18 rounded-[20px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation shadow-sm ${
                                            active
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <span className="truncate">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* حاوية فرعية: اختيار فئة السعر (Tier) */}
                    {(() => {
                        const selectedDraftCat = categories.find(c => c.id === draftCat);
                        const isOilOrTierCat = !!selectedDraftCat && selectedDraftCat.name.includes('زيت');
                        if (!isOilOrTierCat) return null;

                        return (
                            <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-violet-500/30 dark:border-violet-500/30 flex flex-col gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                <h4 className="text-base sm:text-lg font-black flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700/80 pb-3 select-none">
                                    <div className="flex items-center gap-3">
                                        <span className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg shrink-0 border border-violet-500/30">💎</span>
                                        <span className="text-slate-900 dark:text-white tracking-wide">فئة السعر (Tier)</span>
                                    </div>
                                    {draftTier && (
                                        <button
                                            type="button"
                                            onClick={() => setDraftTier(null)}
                                            className="text-xs font-black text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                                        >
                                            عرض كل التيرات
                                        </button>
                                    )}
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDraftTier(null)}
                                        className={`flex items-center justify-between px-5 h-16 sm:h-18 rounded-[20px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation shadow-sm ${
                                            !draftTier
                                                ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-600/30'
                                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <span>جميع التيرات</span>
                                    </button>
                                    {tiers.map(tier => {
                                        const active = draftTier === tier.id;
                                        return (
                                            <button
                                                key={tier.id}
                                                type="button"
                                                onClick={() => setDraftTier(tier.id)}
                                                className={`flex items-center justify-between px-5 h-16 sm:h-18 rounded-[20px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation shadow-sm ${
                                                    active
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-600/30'
                                                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <span className="truncate">{tier.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* حاوية 3: حالة المخزون والتنبيهات */}
                    <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                        <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3 select-none">
                            <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-500/30">⚠️</span>
                            <span className="text-slate-900 dark:text-white tracking-wide">حالة المخزون والتنبيهات</span>
                        </h4>

                        <button
                            type="button"
                            onClick={() => setDraftLowStockOnly(!draftLowStockOnly)}
                            className={`flex items-center justify-between px-6 h-18 sm:h-20 rounded-[22px] font-black text-base sm:text-lg transition-all active:scale-[0.98] border-2 cursor-pointer select-none touch-manipulation ${
                                draftLowStockOnly
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-xl shadow-amber-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-3.5">
                                <AlertTriangle className={`w-6 h-6 ${draftLowStockOnly ? 'text-white' : 'text-amber-500'}`} />
                                <span>المنتجات التي أوشكت على النفاد</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-6 sm:p-7 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 flex items-center gap-4 select-none shrink-0">
                    <button
                        onClick={() => {
                            onApply(draftCat, draftTier, [...draftSearchKeywords], draftLowStockOnly);
                            onClose();
                        }}
                        className="flex-1 spatial-button h-16 sm:h-18 rounded-[22px] text-lg sm:text-xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/30 touch-manipulation cursor-pointer"
                    >
                        <Check className="w-6 h-6" />
                        تطبيق الفلتر وعرض النتائج
                    </button>
                    {hasDraftFilter && (
                        <button
                            onClick={() => {
                                setDraftSearchKeywords([]);
                                setDraftCat(null);
                                setDraftTier(null);
                                setDraftLowStockOnly(false);
                            }}
                            className="h-16 sm:h-18 px-6 sm:px-8 rounded-[22px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white font-black text-base sm:text-lg active:scale-95 transition-all border-2 border-red-500/30 flex items-center gap-2 shrink-0 touch-manipulation cursor-pointer"
                        >
                            <X className="w-5 h-5" /> مسح الفلاتر
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
