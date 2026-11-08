import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, Pagination } from '@/components/ui/SpatialComponents';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { DeleteModal } from '@/components/ui/DeleteModal';
import {
    Plus,
    Pencil,
    Trash2,
    X,
    Package,
    QrCode,
    Printer,
    SlidersHorizontal,
    RotateCcw,
    Download,
    FileUp,
    RefreshCw,
} from 'lucide-react';
import { Product, ProductsIndexProps, fmt, unitLabels, generateQrCode } from './types';
import { QrModal } from './components/QrModal';
import { ExcelCatalogModal } from './components/ExcelCatalogModal';
import { ProductFilterDrawer } from './components/ProductFilterDrawer';
import { ProductFormDrawer } from './components/ProductFormDrawer';

export default function ProductsIndex({ products, catalogNames = [], categories, tiers, missingQrCount = 0, flash }: ProductsIndexProps) {
    // Form Drawer State
    const [showCreate, setShowCreate] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Initial Filter Parsing from URL
    const parseUrlFilters = () => {
        if (typeof window === 'undefined') return { cat: null, tier: null, keywords: [], lowStock: false };
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('filter[category_id]') ? Number(params.get('filter[category_id]')) : null;
        const tier = params.get('filter[price_tier_id]') ? Number(params.get('filter[price_tier_id]')) : null;
        const lowStock = params.get('filter[low_stock]') === '1';
        const rawSearch = params.get('filter[search]') || '';
        const keywords = rawSearch ? rawSearch.split(',').map(s => s.trim()).filter(Boolean) : [];
        return { cat, tier, keywords, lowStock };
    };

    const initialFilters = parseUrlFilters();
    const [filterCat, setFilterCat] = useState<number | null>(initialFilters.cat);
    const [filterTier, setFilterTier] = useState<number | null>(initialFilters.tier);
    const [searchKeywords, setSearchKeywords] = useState<string[]>(initialFilters.keywords);
    const [lowStockOnly, setLowStockOnly] = useState<boolean>(initialFilters.lowStock);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // Modal State
    const [qrProduct, setQrProduct] = useState<Product | null>(null);
    const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
    const [bulkPrintItems, setBulkPrintItems] = useState<Product[]>([]);
    const [loadingBulkPrint, setLoadingBulkPrint] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);

    // Number Pad State
    const [padConfig, setPadConfig] = useState<{ title: string; initial: string; cb: (val: string) => void } | null>(null);

    // Default Category Memory
    const [defaultCatId, setDefaultCatId] = useState<string>(() => {
        return typeof window !== 'undefined' ? (localStorage.getItem('default_product_category_id') || '') : '';
    });

    const handleSetDefaultCategory = (catId: number) => {
        const idStr = String(catId);
        localStorage.setItem('default_product_category_id', idStr);
        setDefaultCatId(idStr);
    };

    const hasActiveFilter = searchKeywords.length > 0 || !!filterCat || !!filterTier || lowStockOnly;

    // Apply Filters to Server via Inertia Visit
    const applyFiltersToServer = (cat: number | null, tier: number | null, keywords: string[], lowStock: boolean) => {
        setFilterCat(cat);
        setFilterTier(tier);
        setSearchKeywords(keywords);
        setLowStockOnly(lowStock);

        const filterObj: Record<string, any> = {};
        if (cat) filterObj.category_id = cat;
        if (tier) filterObj.price_tier_id = tier;
        if (lowStock) filterObj.low_stock = 1;
        if (keywords.length > 0) filterObj.search = keywords.join(',');

        router.get('/products', Object.keys(filterObj).length > 0 ? { filter: filterObj } : {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearAllFilters = () => {
        setFilterCat(null);
        setFilterTier(null);
        setSearchKeywords([]);
        setLowStockOnly(false);

        router.get('/products', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const removeSingleKeyword = (kwToRemove: string) => {
        const nextKeywords = searchKeywords.filter(k => k !== kwToRemove);
        applyFiltersToServer(filterCat, filterTier, nextKeywords, lowStockOnly);
    };

    // Single QR code generation
    const handleGenerate = (p: Product) => {
        const newQr = generateQrCode();
        router.patch(`/products/${p.id}/qrcode`, { qrcode: newQr }, { preserveScroll: true, preserveState: true });
    };

    // Bulk QR code generation for missing products
    const handleGenerateAll = () => {
        if (missingQrCount === 0) return;
        setGeneratingAll(true);
        router.post('/products/generate-all-qrcodes', {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setGeneratingAll(false),
        });
    };

    // Bulk Label Printing: Fetch minimal fields for all matching filter items
    const handleBulkPrint = async () => {
        setLoadingBulkPrint(true);
        try {
            const query = typeof window !== 'undefined' ? window.location.search : '';
            const res = await fetch(`/products/print-list${query}`);
            const data = await res.json();
            if (data.products && data.products.length > 0) {
                setBulkPrintItems(data.products);
                setBulkPrintOpen(true);
            } else {
                alert('لا توجد منتجات مطابقة لطباعة ملصقاتها');
            }
        } catch (e) {
            console.error('Failed to fetch print list', e);
        } finally {
            setLoadingBulkPrint(false);
        }
    };

    // Excel Export: Respects active filters
    const handleExportExcel = () => {
        const query = typeof window !== 'undefined' ? window.location.search : '';
        window.location.href = `/products/export/excel${query}`;
    };

    const deleteProduct = (id: number) => {
        router.delete(`/products/${id}`, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const productItems = products.data || [];

    return (
        <AppShell title="إدارة المنتجات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">إدارة المنتجات</h1>
                        <span className="px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-black text-sm border border-primary/20 flex items-center gap-1.5">
                            {hasActiveFilter ? (
                                <>
                                    <span>نتائج الفلترة:</span>
                                    <strong className="text-base font-mono">{products.total}</strong>
                                    <span className="text-xs opacity-75">منتج مطابِق</span>
                                </>
                            ) : (
                                <>
                                    <span>إجمالي المنتجات:</span>
                                    <strong className="text-base font-mono">{products.total}</strong>
                                </>
                            )}
                        </span>
                    </div>

                    {/* أزرار العمليات الرئيسية مرتبة: استيراد ثم تصدير ثم طباعة جماعية ثم إضافة منتج (وتوليد QR إن وجد) */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* زر استيراد Excel */}
                        <button
                            type="button"
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center justify-center gap-2.5 px-5 h-14 rounded-[20px] bg-amber-500/15 border-2 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm touch-manipulation select-none cursor-pointer"
                            title="استيراد وتحديث البيانات من ملف إكسل"
                        >
                            <FileUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <span>استيراد Excel</span>
                        </button>

                        {/* زر تصدير Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={products.total === 0}
                            className="flex items-center justify-center gap-2.5 px-5 h-14 rounded-[20px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm touch-manipulation select-none disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
                            title="تصدير شيت إكسل للمنتجات المفلترة حالياً"
                        >
                            <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                            <span>تصدير Excel</span>
                        </button>

                        {/* زر طباعة جماعية يجلب بيانات كل المنتجات المفلترة للطباعة فقط */}
                        <button
                            type="button"
                            onClick={handleBulkPrint}
                            disabled={products.total === 0 || loadingBulkPrint}
                            className="flex items-center justify-center gap-2.5 px-5 h-14 rounded-[20px] bg-primary/15 border-2 border-primary/30 text-primary dark:text-primary-foreground hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm touch-manipulation select-none disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
                            title={products.total > 0 ? `طباعة جماعية لملصقات النتائج (${products.total} منتج)` : 'لا توجد منتجات مطابقة لطباعتها'}
                        >
                            {loadingBulkPrint ? (
                                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                            ) : (
                                <Printer className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                            )}
                            <span>{loadingBulkPrint ? 'جاري الجلب...' : 'طباعة جماعية'}</span>
                            {products.total > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/25 text-xs font-mono font-black group-hover:bg-white group-hover:text-primary transition-all">
                                    {products.total}
                                </span>
                            )}
                        </button>

                        {missingQrCount > 0 && (
                            <button
                                onClick={handleGenerateAll}
                                disabled={generatingAll}
                                className="flex items-center justify-center gap-2.5 px-6 h-14 rounded-[20px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                                <QrCode className="w-5 h-5" />
                                {generatingAll ? 'جاري التوليد...' : `توليد QR للكل (${missingQrCount})`}
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setEditingProduct(null);
                                setShowCreate(true);
                            }}
                            className="spatial-button flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 h-14 text-lg font-black rounded-[20px] active:scale-95 shadow-xl shadow-primary/30 shrink-0 cursor-pointer"
                        >
                            <Plus className="w-6 h-6" /> إضافة منتج
                        </button>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="px-5 py-4 rounded-[20px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="px-5 py-4 rounded-[20px] bg-red-500/15 border-2 border-red-500/30 text-red-700 dark:text-red-300 font-black text-sm">
                        {flash.error}
                    </div>
                )}

                {/* سطر قسم التصفية والفلاتر المفعلة في سطر مخصص وثابت دائماً */}
                <div className="p-4 rounded-[22px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setFilterDrawerOpen(true)}
                            className={`flex items-center justify-center gap-2.5 px-5 h-12 rounded-[16px] font-black text-base transition-all active:scale-95 border-2 cursor-pointer shrink-0 shadow-sm touch-manipulation select-none ${
                                hasActiveFilter
                                    ? 'bg-primary text-white border-primary shadow-primary/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>تصفية المنتجات</span>
                            {hasActiveFilter && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
                        </button>

                        {hasActiveFilter && (
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center justify-center gap-2 px-4 h-12 rounded-[16px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-sm border-2 border-red-500/30 shrink-0 shadow-sm touch-manipulation select-none cursor-pointer"
                                title="إعادة تعيين الفلاتر"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>إعادة تعيين</span>
                            </button>
                        )}

                        {hasActiveFilter && (
                            <div className="flex flex-wrap items-center gap-2 text-sm font-black border-r-2 border-slate-300 dark:border-slate-600 pr-3 mr-1">
                                {searchKeywords.map((kw) => (
                                    <span key={kw} className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs sm:text-sm">
                                        <span>بحث: "{kw}"</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSingleKeyword(kw)}
                                            className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer"
                                            title="إزالة هذا البحث"
                                        >
                                            <X className="w-3.5 h-3.5 hover:text-red-500" />
                                        </button>
                                    </span>
                                ))}
                                {filterCat && (
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs sm:text-sm">
                                        التصنيف: {categories.find(c => c.id === filterCat)?.name}
                                        <button onClick={() => applyFiltersToServer(null, filterTier, searchKeywords, lowStockOnly)} className="cursor-pointer">
                                            <X className="w-3.5 h-3.5 hover:text-red-500" />
                                        </button>
                                    </span>
                                )}
                                {filterTier && (
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30 text-xs sm:text-sm">
                                        التير: {tiers.find(t => t.id === filterTier)?.name}
                                        <button onClick={() => applyFiltersToServer(filterCat, null, searchKeywords, lowStockOnly)} className="cursor-pointer">
                                            <X className="w-3.5 h-3.5 hover:text-red-500" />
                                        </button>
                                    </span>
                                )}
                                {lowStockOnly && (
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs sm:text-sm">
                                        أوشكت على النفاد
                                        <button onClick={() => applyFiltersToServer(filterCat, filterTier, searchKeywords, false)} className="cursor-pointer">
                                            <X className="w-3.5 h-3.5 hover:text-red-500" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* القائمة والجدول بنظام 20 عنصر فقط للصفحة */}
                <SpatialCard
                    title={`المنتجات المعروضة (${productItems.length} من إجمالي ${products.total})`}
                    icon={<Package className="w-5 h-5" />}
                >
                    {productItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
                            <span className="text-4xl">📦</span>
                            <span className="font-black text-base">لا توجد منتجات مطابقة في هذه الصفحة</span>
                        </div>
                    ) : (
                        <>
                            {/* جدول — PC */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-base">
                                    <thead>
                                        <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700">
                                            {['الاسم', 'التصنيف', 'مدى السعر', 'سعر العبوة', 'المخزون', 'الحد الأدنى', 'الإجراءات'].map(h => (
                                                <th key={h} className="text-right px-5 py-4 text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide whitespace-nowrap first:rounded-r-[16px] last:rounded-l-[16px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-200/80 dark:divide-slate-700/60">
                                        {productItems.map((product) => (
                                            <tr key={product.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group">
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">{product.name}</span>
                                                        {product.category.is_operational && (
                                                            <span className="text-xs font-black px-2.5 py-1 rounded-[8px] bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">تشغيلي</span>
                                                        )}
                                                        {product.qrcode && (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-[8px] bg-violet-500/15 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                                                <QrCode className="w-3.5 h-3.5" /> QR
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5 font-black text-slate-800 dark:text-slate-200 text-base whitespace-nowrap">{product.category.name}</td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {product.selling_type === 'tier_based' ? (
                                                        <span className="inline-flex items-center px-4 py-1.5 rounded-[12px] bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-300 font-black text-base border border-primary/25">{product.price_tier?.name}</span>
                                                    ) : product.product_price ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-base sm:text-lg">{fmt(product.product_price.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black text-base">—</span>
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-base sm:text-lg">{fmt(product.product_price.price_per_unit_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-black text-base">--</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {product.product_price?.full_bottle_regular ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-base sm:text-lg">{fmt(product.product_price.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black">—</span>
                                                            <span className="px-3 py-1.5 rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-base sm:text-lg">{fmt(product.product_price.full_bottle_regular)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 font-black text-base">--</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    {Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 font-black px-3 py-1.5 rounded-[10px] bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-lg">
                                                            ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                        </span>
                                                    ) : (
                                                        <span className="font-black text-xl text-slate-900 dark:text-white">
                                                            {fmt(product.stock)} <span className="text-sm font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 whitespace-nowrap">
                                                    <span className="font-black text-lg text-slate-800 dark:text-slate-200">{fmt(product.min_stock)} <span className="text-sm font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                </td>
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        {!product.qrcode && (
                                                            <button
                                                                onClick={() => handleGenerate(product)}
                                                                title="إنشاء QR Code"
                                                                className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm cursor-pointer"
                                                            >
                                                                <QrCode className="w-5 h-5" /> إنشاء
                                                            </button>
                                                        )}
                                                        {product.qrcode && (
                                                            <button
                                                                onClick={() => setQrProduct(product)}
                                                                title="عرض وطباعة الملصق"
                                                                className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm cursor-pointer"
                                                            >
                                                                <QrCode className="w-5 h-5" /> ملصق
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setEditingProduct(product);
                                                                setShowCreate(true);
                                                            }}
                                                            className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shadow-sm cursor-pointer"
                                                        >
                                                            <Pencil className="w-5 h-5" /> تعديل
                                                        </button>
                                                        <DeleteModal
                                                            onConfirm={() => deleteProduct(product.id)}
                                                            trigger={
                                                                <button className="flex items-center gap-2 px-4 h-12 rounded-[16px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm cursor-pointer">
                                                                    <Trash2 className="w-5 h-5" /> حذف
                                                                </button>
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* كاردات — Mobile Touch */}
                            <div className="flex flex-col gap-5 lg:hidden">
                                {productItems.map(product => {
                                    const hasPrice = product.selling_type === 'unit_priced' && product.product_price;
                                    const hasBottle = !!product.product_price?.full_bottle_regular;
                                    const lowStock = Number(product.stock) <= Number(product.min_stock) && Number(product.min_stock) > 0;

                                    return (
                                        <div key={product.id} className="rounded-[26px] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 overflow-hidden shadow-sm">
                                            {/* رأس الكارت */}
                                            <div className="px-6 py-5 bg-slate-100/90 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl leading-tight">{product.name}</span>
                                                    {product.qrcode && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-[8px] bg-violet-500/15 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                                            <QrCode className="w-4 h-4" /> QR
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap mt-2">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-200">{product.category.name}</span>
                                                    {product.selling_type === 'tier_based' && (
                                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-primary/15 dark:bg-primary/25 text-primary dark:text-blue-300 border border-primary/25">{product.price_tier?.name}</span>
                                                    )}
                                                    {product.category.is_operational && (
                                                        <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">تشغيلي</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* بيانات */}
                                            <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700/60 px-6">
                                                {hasPrice && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-black text-slate-700 dark:text-slate-300">مدى السعر</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-lg">{fmt(product.product_price!.price_per_unit_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black">—</span>
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-lg">{fmt(product.product_price!.price_per_unit_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {hasBottle && (
                                                    <div className="flex items-center justify-between py-4">
                                                        <span className="text-base font-black text-slate-700 dark:text-slate-300">سعر العبوة</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black text-lg">{fmt(product.product_price!.full_bottle_vip)}</span>
                                                            <span className="text-slate-400 dark:text-slate-500 font-black">—</span>
                                                            <span className="px-3.5 py-1.5 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 font-black text-lg">{fmt(product.product_price!.full_bottle_regular)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-300">المخزون</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        {lowStock ? (
                                                            <span className="inline-flex items-center gap-1.5 font-black px-3 py-1 rounded-[10px] bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-lg">
                                                                ⚠️ {fmt(product.stock)} {unitLabels[product.category.unit]}
                                                            </span>
                                                        ) : (
                                                            <span className="font-black text-xl text-slate-900 dark:text-white">{fmt(product.stock)} <span className="text-base font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span></span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-4">
                                                    <span className="text-base font-black text-slate-700 dark:text-slate-300">الحد الأدنى</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="font-black text-lg text-slate-800 dark:text-slate-200">{fmt(product.min_stock)}</span>
                                                        <span className="text-base font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* الإجراءات باللمس */}
                                            <div className="flex items-center gap-3 px-6 py-4 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                                {!product.qrcode && (
                                                    <button
                                                        onClick={() => handleGenerate(product)}
                                                        className="flex items-center justify-center gap-2 h-13 px-5 rounded-[18px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm cursor-pointer"
                                                    >
                                                        <QrCode className="w-5 h-5" /> إنشاء
                                                    </button>
                                                )}
                                                {product.qrcode && (
                                                    <button
                                                        onClick={() => setQrProduct(product)}
                                                        className="flex items-center justify-center gap-2 h-13 px-5 rounded-[18px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm cursor-pointer"
                                                    >
                                                        <QrCode className="w-5 h-5" /> ملصق
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setEditingProduct(product);
                                                        setShowCreate(true);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 h-13 rounded-[18px] border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shadow-sm cursor-pointer"
                                                >
                                                    <Pencil className="w-5 h-5" /> تعديل
                                                </button>
                                                <DeleteModal
                                                    onConfirm={() => deleteProduct(product.id)}
                                                    wrapperClassName="flex-1"
                                                    trigger={
                                                        <button className="w-full flex items-center justify-center gap-2 h-13 rounded-[18px] border-2 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base shadow-sm cursor-pointer">
                                                            <Trash2 className="w-5 h-5" /> حذف
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* الترقيم الحقيقي من السيرفر */}
                            <Pagination
                                links={products.links}
                                currentPage={products.current_page}
                                lastPage={products.last_page}
                            />
                        </>
                    )}
                </SpatialCard>
            </div>

            {/* QR Modal (منتج مفرد) */}
            {qrProduct && (
                <QrModal product={qrProduct} onClose={() => setQrProduct(null)} />
            )}

            {/* QR Modal (طباعة جماعية لكل نتائج الفلترة المجلوبة) */}
            {bulkPrintOpen && bulkPrintItems.length > 0 && (
                <QrModal productsList={bulkPrintItems} onClose={() => setBulkPrintOpen(false)} />
            )}

            {/* NumberPad Modal للأرقام والأسعار اللمسية */}
            {padConfig && (
                <NumberPadModal
                    isOpen={!!padConfig}
                    title={padConfig.title}
                    initialValue={padConfig.initial}
                    onConfirm={(val) => {
                        padConfig.cb(val);
                        setPadConfig(null);
                    }}
                    onClose={() => setPadConfig(null)}
                />
            )}

            {/* Modal استيراد Excel */}
            <ExcelCatalogModal
                show={showImportModal}
                onClose={() => setShowImportModal(false)}
            />

            {/* Spatial Touch Drawer — إنشاء وتعديل المنتجات */}
            <ProductFormDrawer
                show={showCreate}
                editingProduct={editingProduct}
                onClose={() => {
                    setShowCreate(false);
                    setEditingProduct(null);
                }}
                categories={categories}
                tiers={tiers}
                products={productItems}
                defaultCatId={defaultCatId}
                onSetDefaultCategory={handleSetDefaultCategory}
                openPad={(title, initial, cb) => setPadConfig({ title, initial, cb })}
            />

            {/* Spatial Filter Drawer — تصفية المنتجات المتقدمة */}
            <ProductFilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                catalogNames={catalogNames}
                categories={categories}
                tiers={tiers}
                appliedCat={filterCat}
                appliedTier={filterTier}
                appliedKeywords={searchKeywords}
                appliedLowStock={lowStockOnly}
                onApply={applyFiltersToServer}
            />
        </AppShell>
    );
}
