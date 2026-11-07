import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AppShell } from '@/components/layout/AppShell';
import { SpatialCard, Pagination, matchesSearchText } from '@/components/ui/SpatialComponents';
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
} from 'lucide-react';
import { Product, ProductsIndexProps, fmt, unitLabels, generateQrCode } from './types';
import { QrModal } from './components/QrModal';
import { ExcelCatalogModal } from './components/ExcelCatalogModal';
import { ProductFilterDrawer } from './components/ProductFilterDrawer';
import { ProductFormDrawer } from './components/ProductFormDrawer';

export default function ProductsIndex({ products, categories, tiers, flash }: ProductsIndexProps) {
    // Form Drawer State
    const [showCreate, setShowCreate] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Filter State
    const [filterCat, setFilterCat] = useState<number | null>(null);
    const [filterTier, setFilterTier] = useState<number | null>(null);
    const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
    const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // Modal State
    const [qrProduct, setQrProduct] = useState<Product | null>(null);
    const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
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

    // Single QR code generation
    const handleGenerate = (p: Product) => {
        const newQr = generateQrCode();
        router.patch(`/products/${p.id}/qrcode`, { qrcode: newQr }, { preserveScroll: true, preserveState: true });
    };

    // Bulk QR code generation for missing products
    const handleGenerateAll = () => {
        const missingCount = products.filter(p => !p.qrcode).length;
        if (missingCount === 0) return;
        setGeneratingAll(true);
        router.post('/products/generate-all-qrcodes', {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setGeneratingAll(false),
        });
    };

    const deleteProduct = (id: number) => {
        router.delete(`/products/${id}`, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const matchesSearchKeywords = (p: Product, kws: string[]) => {
        if (!kws || kws.length === 0) return true;
        return kws.some(kw => {
            const trimmed = kw.trim();
            if (!trimmed) return false;

            if (!isNaN(Number(trimmed))) {
                const numId = Number(trimmed);
                if (products.some(prod => prod.id === numId)) {
                    return p.id === numId;
                }
            }

            if (p.qrcode && p.qrcode.toLowerCase() === trimmed.toLowerCase()) {
                return true;
            }

            const extraKey = p.qrcode ? `${p.qrcode}` : '';
            return matchesSearchText(trimmed, p.name, extraKey);
        });
    };

    const filtered = products.filter(p => {
        if (!matchesSearchKeywords(p, searchKeywords)) return false;
        if (filterCat && p.category.id !== filterCat) return false;
        if (filterTier && (p.price_tier?.id !== filterTier && p.price_tier_id !== filterTier)) return false;
        if (lowStockOnly && !(Number(p.stock) <= Number(p.min_stock) && Number(p.min_stock) > 0)) return false;
        return true;
    });

    const handleExportExcel = () => {
        if (filtered.length === 0) return;

        if (hasActiveFilter && filtered.length < products.length) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/products/export/excel';
            form.style.display = 'none';

            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);

            const idsInput = document.createElement('input');
            idsInput.type = 'hidden';
            idsInput.name = 'ids';
            idsInput.value = filtered.map(p => p.id).join(',');
            form.appendChild(idsInput);

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        } else {
            window.location.href = '/products/export/excel';
        }
    };

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedProducts = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

    const paginationLinks = [
        { url: safeCurrentPage > 1 ? '#' : null, label: 'السابق', active: false, page: safeCurrentPage - 1 },
        ...Array.from({ length: totalPages }, (_, i) => ({
            url: '#',
            label: String(i + 1),
            active: i + 1 === safeCurrentPage,
            page: i + 1,
        })),
        { url: safeCurrentPage < totalPages ? '#' : null, label: 'التالي', active: false, page: safeCurrentPage + 1 },
    ];

    return (
        <AppShell title="إدارة المنتجات">
            <div className="flex flex-col gap-6 pb-32 lg:pb-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">إدارة المنتجات</h1>
                        <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                            إدارة منتجات العطور والتسعير والتصنيفات بأحدث واجهة باللمس
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setFilterDrawerOpen(true)}
                            className={`flex items-center justify-center gap-3 px-6 h-14 rounded-[20px] font-black text-base transition-all active:scale-95 border-2 cursor-pointer shrink-0 shadow-md touch-manipulation select-none ${
                                hasActiveFilter
                                    ? 'bg-primary text-white border-primary shadow-primary/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                            <span>تصفية المنتجات</span>
                            {hasActiveFilter && <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />}
                        </button>

                        {hasActiveFilter && (
                            <button
                                onClick={() => {
                                    setSearchKeywords([]);
                                    setFilterCat(null);
                                    setFilterTier(null);
                                    setLowStockOnly(false);
                                }}
                                className="flex items-center justify-center gap-2.5 px-5 h-14 rounded-[20px] bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white active:scale-95 transition-all font-black text-base border-2 border-red-500/30 shrink-0 shadow-sm touch-manipulation select-none cursor-pointer"
                                title="إعادة تعيين الفلاتر"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>إعادة تعيين</span>
                            </button>
                        )}

                        {products.some(p => !p.qrcode) && (
                            <button
                                onClick={handleGenerateAll}
                                disabled={generatingAll}
                                className="flex items-center justify-center gap-2.5 px-6 h-14 rounded-[20px] border-2 border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white active:scale-95 transition-all font-black text-base disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                                <QrCode className="w-5 h-5" />
                                {generatingAll ? 'جاري التوليد...' : `توليد QR للكل (${products.filter(p => !p.qrcode).length})`}
                            </button>
                        )}

                        {/* زر طباعة جماعية */}
                        <button
                            type="button"
                            onClick={() => setBulkPrintOpen(true)}
                            disabled={filtered.length === 0}
                            className="flex items-center justify-center gap-2.5 px-5 h-14 rounded-[20px] bg-primary/15 border-2 border-primary/30 text-primary dark:text-primary-foreground hover:bg-primary hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm touch-manipulation select-none disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
                            title={filtered.length > 0 ? `طباعة جماعية لملصقات النتائج المعروضة (${filtered.length} منتج)` : 'لا توجد منتجات مطابقة لطباعتها'}
                        >
                            <Printer className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                            <span>طباعة جماعية</span>
                            {filtered.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/25 text-xs font-mono font-black group-hover:bg-white group-hover:text-primary transition-all">
                                    {filtered.length}
                                </span>
                            )}
                        </button>

                        {/* زر تصدير Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={filtered.length === 0}
                            className="flex items-center justify-center gap-2.5 px-5 h-14 rounded-[20px] bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white active:scale-95 transition-all font-black text-base shrink-0 shadow-sm touch-manipulation select-none disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
                            title={
                                hasActiveFilter && filtered.length < products.length
                                    ? `تصدير شيت إكسل للمنتجات المفلترة حالياً (${filtered.length} منتج)`
                                    : 'تصدير شيت إكسل كامل يشمل المنتجات والتصنيفات والأحجام والتيرات والأسعار'
                            }
                        >
                            <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                            <span>تصدير Excel</span>
                            {hasActiveFilter && filtered.length < products.length && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-xs font-mono font-black group-hover:bg-white group-hover:text-emerald-700 transition-all">
                                    {filtered.length}
                                </span>
                            )}
                        </button>

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

                {/* الشريط السريع للفلاتر النشطة */}
                {hasActiveFilter && (
                    <div className="p-4 rounded-[22px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2.5 text-sm font-black">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-primary" /> الفلاتر المفعلة:
                            </span>
                            {searchKeywords.map((kw) => {
                                const prod = !isNaN(Number(kw)) ? products.find(p => p.id === Number(kw)) : null;
                                const displayText = prod ? prod.name : `بحث: "${kw}"`;
                                return (
                                    <span key={kw} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                                        <span>{displayText}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSearchKeywords(prev => prev.filter(k => k !== kw))}
                                            className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer"
                                            title="إزالة هذا البحث"
                                        >
                                            <X className="w-3.5 h-3.5 hover:text-red-500" />
                                        </button>
                                    </span>
                                );
                            })}
                            {filterCat && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                    التصنيف: {categories.find(c => c.id === filterCat)?.name}
                                    <button onClick={() => { setFilterCat(null); setFilterTier(null); }} className="cursor-pointer">
                                        <X className="w-3.5 h-3.5 hover:text-red-500" />
                                    </button>
                                </span>
                            )}
                            {filterTier && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30">
                                    التير: {tiers.find(t => t.id === filterTier)?.name}
                                    <button onClick={() => setFilterTier(null)} className="cursor-pointer">
                                        <X className="w-3.5 h-3.5 hover:text-red-500" />
                                    </button>
                                </span>
                            )}
                            {lowStockOnly && (
                                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                    أوشكت على النفاد
                                    <button onClick={() => setLowStockOnly(false)} className="cursor-pointer">
                                        <X className="w-3.5 h-3.5 hover:text-red-500" />
                                    </button>
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setSearchKeywords([]);
                                setFilterCat(null);
                                setFilterTier(null);
                                setLowStockOnly(false);
                            }}
                            className="text-xs font-black text-red-500 hover:underline shrink-0 cursor-pointer"
                        >
                            إلغاء الكل
                        </button>
                    </div>
                )}

                {/* القائمة والجدول */}
                <SpatialCard title={`المنتجات (${filtered.length})`} icon={<Package className="w-5 h-5" />}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
                            <span className="text-4xl">📦</span>
                            <span className="font-black text-base">لا توجد منتجات مطابقة</span>
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
                                        {paginatedProducts.map((product) => (
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
                                {paginatedProducts.map(product => {
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
                                                            <span className="font-black text-xl text-slate-900 dark:text-white">
                                                                {fmt(product.stock)} <span className="text-base font-black text-slate-500 dark:text-slate-400">{unitLabels[product.category.unit]}</span>
                                                            </span>
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

                            {/* الترقيم */}
                            <Pagination
                                links={paginationLinks}
                                currentPage={safeCurrentPage}
                                lastPage={totalPages}
                                onPageChange={(p) => {
                                    setCurrentPage(p);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        </>
                    )}
                </SpatialCard>
            </div>

            {/* QR Modal (منتج مفرد) */}
            {qrProduct && (
                <QrModal product={qrProduct} onClose={() => setQrProduct(null)} />
            )}

            {/* QR Modal (طباعة جماعية) */}
            {bulkPrintOpen && filtered.length > 0 && (
                <QrModal productsList={filtered} onClose={() => setBulkPrintOpen(false)} />
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
                products={products}
                defaultCatId={defaultCatId}
                onSetDefaultCategory={handleSetDefaultCategory}
                openPad={(title, initial, cb) => setPadConfig({ title, initial, cb })}
            />

            {/* Spatial Filter Drawer — تصفية المنتجات المتقدمة */}
            <ProductFilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                products={products}
                categories={categories}
                tiers={tiers}
                appliedCat={filterCat}
                appliedTier={filterTier}
                appliedKeywords={searchKeywords}
                appliedLowStock={lowStockOnly}
                onApply={(cat, tier, keywords, lowStock) => {
                    setFilterCat(cat);
                    setFilterTier(tier);
                    setSearchKeywords(keywords);
                    setLowStockOnly(lowStock);
                    setCurrentPage(1);
                }}
            />
        </AppShell>
    );
}
