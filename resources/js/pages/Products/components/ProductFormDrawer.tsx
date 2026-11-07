import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from '@inertiajs/react';
import { Plus, Pencil, X, Check, AlertTriangle, Calculator, Star, QrCode } from 'lucide-react';
import { Product, Category, PriceTier, ProductFormData, emptyProductForm, unitLabels, resolveSellingType, generateQrCode, toAsciiDigits } from '../types';

interface ProductFormDrawerProps {
    show: boolean;
    editingProduct: Product | null;
    onClose: () => void;
    categories: Category[];
    tiers: PriceTier[];
    products?: Product[];
    defaultCatId: string | null;
    onSetDefaultCategory: (catId: number) => void;
    openPad: (title: string, initial: string, cb: (v: string) => void) => void;
}

export const ProductFormDrawer: React.FC<ProductFormDrawerProps> = ({
    show,
    editingProduct,
    onClose,
    categories,
    tiers,
    products,
    defaultCatId,
    onSetDefaultCategory,
    openPad,
}) => {
    const isEdit = editingProduct !== null;

    const form = useForm<ProductFormData>({ ...emptyProductForm });

    // Sync form state when drawer opens or editingProduct changes
    useEffect(() => {
        if (!show) return;

        if (editingProduct) {
            form.clearErrors();
            form.setData({
                name:                   editingProduct.name,
                category_id:            String(editingProduct.category.id),
                selling_type:           editingProduct.selling_type,
                price_tier_id:          editingProduct.price_tier ? String(editingProduct.price_tier.id) : (editingProduct.price_tier_id ? String(editingProduct.price_tier_id) : ''),
                min_stock:              editingProduct.min_stock,
                qrcode:                 editingProduct.qrcode ?? '',
                price_per_unit_regular: editingProduct.product_price?.price_per_unit_regular ?? '',
                price_per_unit_vip:     editingProduct.product_price?.price_per_unit_vip ?? '',
                full_bottle_regular:    editingProduct.product_price?.full_bottle_regular ?? '',
                full_bottle_vip:        editingProduct.product_price?.full_bottle_vip ?? '',
                bottle_volume:          editingProduct.original_perfume_detail?.bottle_volume ?? '',
            });
        } else {
            form.clearErrors();
            const defCat = categories.find(c => String(c.id) === String(defaultCatId)) || categories[0];
            if (defCat) {
                form.setData({
                    ...emptyProductForm,
                    category_id: String(defCat.id),
                    selling_type: resolveSellingType(defCat),
                    price_tier_id: '',
                });
            } else {
                form.reset();
            }
        }
    }, [show, editingProduct]);

    if (!show) return null;

    const selectedCat = categories.find(c => String(c.id) === String(form.data.category_id));
    const isOriginalPerfume = selectedCat?.unit === 'ml' && form.data.selling_type === 'unit_priced' && !selectedCat?.is_operational;

    const isDuplicateName = !!form.data.name?.trim() && (products || []).some(p =>
        p.name.trim().toLowerCase() === form.data.name.trim().toLowerCase() &&
        (!isEdit || p.id !== editingProduct?.id)
    );

    const onSelectCategory = (catName: string) => {
        const cat = categories.find(c => c.name === catName);
        if (!cat) return;
        form.setData(prev => ({
            ...prev,
            category_id: String(cat.id),
            selling_type: resolveSellingType(cat),
            price_tier_id: '',
        }));
    };

    const handleSubmit = () => {
        const trimmed = form.data.name?.trim() || '';
        const exists = (products || []).some(p =>
            p.name.trim().toLowerCase() === trimmed.toLowerCase() &&
            (!isEdit || p.id !== editingProduct?.id)
        );
        if (exists) {
            form.setError('name', 'اسم المنتج موجود مسبقاً في المنظومة، لا يمكن تكرار نفس الاسم.');
            return;
        }

        if (isEdit && editingProduct) {
            form.put(`/products/${editingProduct.id}`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => onClose(),
            });
        } else {
            form.post('/products', {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    const defCat = categories.find(c => String(c.id) === String(defaultCatId)) || categories[0];
                    form.setData({
                        ...emptyProductForm,
                        category_id: defCat ? String(defCat.id) : '',
                        selling_type: defCat ? resolveSellingType(defCat) : 'tier_based',
                        price_tier_id: '',
                    });
                    onClose();
                },
            });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl">
            <div
                className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
                onClick={onClose}
            />
            <div className="relative w-full sm:w-[840px] md:w-[1000px] lg:w-[1140px] max-w-[95vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l-2 border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300 cursor-default z-10">
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 py-6 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90">
                    <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-[18px] bg-primary/15 text-primary border-2 border-primary/30 flex items-center justify-center font-black p-3">
                            {isEdit ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl">
                                {isEdit ? `تعديل: ${editingProduct.name}` : 'إضافة منتج جديد'}
                            </h2>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                {isEdit ? 'تعديل التفاصيل، الأسعار، والحد الأدنى للمخزون' : 'أدخل بيانات المنتج الجديد وحد التنبيه والتسعير'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all border border-slate-300 dark:border-slate-600 cursor-pointer"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* العمود الأول: المعلومات الأساسية + QR Code */}
                        <div className="flex flex-col gap-6">
                            {/* حاوية 1: المعلومات الأساسية والتصنيف */}
                            <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-5 shadow-sm">
                                <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                    <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg shrink-0 border border-primary/30">📦</span>
                                    <span className="text-slate-900 dark:text-white tracking-wide">المعلومات الأساسية والتصنيف</span>
                                </h4>

                                {/* الاسم */}
                                <div className="flex flex-col gap-2.5">
                                    <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">اسم المنتج</label>
                                    <input
                                        type="text"
                                        inputMode="text"
                                        value={form.data.name}
                                        onChange={e => form.setData('name', e.target.value)}
                                        placeholder="مثال: Sauvage Elixir..."
                                        className={`spatial-input h-14 rounded-[18px] px-5 text-lg font-bold border-2 transition-all ${
                                            isDuplicateName ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5' : ''
                                        }`}
                                    />
                                    {isDuplicateName && (
                                        <p className="text-sm text-amber-600 dark:text-amber-400 font-black flex items-center gap-1.5 animate-in fade-in duration-200">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            هذا الاسم مسجل مسبقاً في المنظومة. يرجى اختيار اسم فريد.
                                        </p>
                                    )}
                                    {form.errors.name && <p className="text-sm text-red-500 font-black">{form.errors.name}</p>}
                                </div>

                                {/* اختيار التصنيف باللمس */}
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">التصنيف</label>
                                        {selectedCat && (
                                            <button
                                                type="button"
                                                onClick={() => onSetDefaultCategory(selectedCat.id)}
                                                className={`text-xs font-black flex items-center gap-1.5 px-3 py-1 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                                                    String(selectedCat.id) === String(defaultCatId)
                                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                        : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:text-amber-600 hover:border-amber-400'
                                                }`}
                                                title="جعل هذا التصنيف هو الخيار التلقائي عند فتح نافذة إضافة منتج جديد"
                                            >
                                                <Star className={`w-3.5 h-3.5 ${String(selectedCat.id) === String(defaultCatId) ? 'fill-amber-500 text-amber-500' : ''}`} />
                                                {String(selectedCat.id) === String(defaultCatId)
                                                    ? 'التصنيف الافتراضي للإضافة'
                                                    : 'تعيين كافتراضي'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {categories.map(c => {
                                            const selected = selectedCat?.id === c.id;
                                            const isDefault = String(c.id) === String(defaultCatId);
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => onSelectCategory(c.name)}
                                                    className={`relative flex flex-col items-start gap-1 p-4 rounded-[20px] border-2 transition-all active:scale-95 text-right cursor-pointer ${
                                                        selected
                                                            ? 'bg-primary/15 border-primary text-primary font-black shadow-md scale-[1.02]'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 font-bold'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-base sm:text-lg font-black">{c.name}</span>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSetDefaultCategory(c.id);
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-all ${
                                                                isDefault
                                                                    ? 'text-amber-500 bg-amber-500/20'
                                                                    : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-amber-500/10'
                                                            }`}
                                                            title={isDefault ? 'هذا هو التصنيف الافتراضي' : 'اضغط لتعيين هذا التصنيف كافتراضي'}
                                                        >
                                                            <Star className={`w-4 h-4 ${isDefault ? 'fill-amber-500 text-amber-500' : ''}`} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between w-full mt-0.5">
                                                        <span className="text-xs sm:text-sm font-bold opacity-75">الوحدة: {unitLabels[c.unit]}</span>
                                                        {isDefault && (
                                                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-400/20 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                                                افتراضي
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {form.errors.category_id && <p className="text-sm text-red-500 font-black">{form.errors.category_id}</p>}
                                </div>
                            </div>

                            {/* حاوية 4: QR Code Section */}
                            <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                    <span className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg shrink-0 border border-violet-500/30">📱</span>
                                    <span className="text-slate-900 dark:text-white tracking-wide">رمز QR Code والتتبع</span>
                                </h4>

                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                                        <QrCode className="w-5 h-5 text-violet-500" />
                                        رمز QR Code
                                    </label>

                                    <div className="flex items-center gap-2">
                                        {form.data.qrcode ? (
                                            <button
                                                type="button"
                                                onClick={() => form.setData('qrcode', '')}
                                                className="px-3 py-1.5 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white font-black text-xs transition-all border border-red-500/30 cursor-pointer"
                                            >
                                                إزالة الرمز
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => form.setData('qrcode', generateQrCode())}
                                                className="px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white font-black text-xs transition-all border border-violet-500/30 cursor-pointer"
                                            >
                                                توليد QR جديد ⚡
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="text"
                                        value={form.data.qrcode}
                                        onChange={e => form.setData('qrcode', e.target.value)}
                                        placeholder="أدخل كود الـ QR أو اضغط توليد تلقائي..."
                                        className="spatial-input h-14 rounded-[16px] px-4 text-base font-bold border-2 w-full font-mono dir-ltr"
                                    />
                                </div>
                                {form.errors.qrcode && <p className="text-sm text-red-500 font-black">{form.errors.qrcode}</p>}
                            </div>
                        </div>

                        {/* العمود الثاني: الأسعار والتسعير + المخزون */}
                        <div className="flex flex-col gap-6">
                            {/* حاوية 2: تفاصيل التسعير والأسعار */}
                            <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-5 shadow-sm">
                                <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                    <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 border border-emerald-500/30">💰</span>
                                    <span className="text-slate-900 dark:text-white tracking-wide">تفاصيل التسعير والأسعار</span>
                                </h4>

                                {/* تير إذا كان tier_based */}
                                {form.data.selling_type === 'tier_based' && (
                                    <div className="flex flex-col gap-2.5">
                                        <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">الفئة السعرية (التير)</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {tiers.map(t => {
                                                const selected = form.data.price_tier_id === String(t.id);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => form.setData('price_tier_id', String(t.id))}
                                                        className={`h-14 px-4 rounded-[16px] border-2 text-base font-black transition-all active:scale-95 cursor-pointer ${
                                                            selected
                                                                ? 'bg-primary text-white border-primary shadow-md'
                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold'
                                                        }`}
                                                    >
                                                        {t.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {form.errors.price_tier_id && <p className="text-sm text-red-500 font-black">{form.errors.price_tier_id}</p>}
                                    </div>
                                )}

                                {/* الأسعار إن كانت unit_priced وغير تشغيلية */}
                                {selectedCat && form.data.selling_type === 'unit_priced' && !selectedCat.is_operational && (
                                    <div className="flex flex-col gap-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر {unitLabels[selectedCat.unit]} — عادي</label>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        dir="ltr"
                                                        value={form.data.price_per_unit_regular}
                                                        onChange={e => form.setData('price_per_unit_regular', toAsciiDigits(e.target.value))}
                                                        className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full font-mono cursor-pointer"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => openPad(`سعر ${unitLabels[selectedCat.unit]} — عادي`, String(form.data.price_per_unit_regular || ''), v => form.setData('price_per_unit_regular', toAsciiDigits(v)))}
                                                        className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer"
                                                        title="فتح لوحة الأرقام اللمسية"
                                                    >
                                                        <Calculator className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر {unitLabels[selectedCat.unit]} — VIP</label>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        dir="ltr"
                                                        value={form.data.price_per_unit_vip}
                                                        onChange={e => form.setData('price_per_unit_vip', toAsciiDigits(e.target.value))}
                                                        className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full font-mono cursor-pointer"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => openPad(`سعر ${unitLabels[selectedCat.unit]} — VIP`, String(form.data.price_per_unit_vip || ''), v => form.setData('price_per_unit_vip', toAsciiDigits(v)))}
                                                        className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer"
                                                        title="فتح لوحة الأرقام اللمسية"
                                                    >
                                                        <Calculator className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {isOriginalPerfume && (
                                            <div className="flex flex-col gap-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">حجم العبوة الأصلية (مليلتر)</label>
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            dir="ltr"
                                                            value={form.data.bottle_volume}
                                                            onChange={e => form.setData('bottle_volume', toAsciiDigits(e.target.value))}
                                                            placeholder="200"
                                                            className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full font-mono cursor-pointer"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => openPad('حجم العبوة الأصلية (مليلتر)', String(form.data.bottle_volume || ''), v => form.setData('bottle_volume', toAsciiDigits(v)))}
                                                            className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer"
                                                            title="فتح لوحة الأرقام اللمسية"
                                                        >
                                                            <Calculator className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر العبوة كاملة — عادي</label>
                                                        <div className="relative flex items-center">
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                dir="ltr"
                                                                value={form.data.full_bottle_regular}
                                                                onChange={e => form.setData('full_bottle_regular', toAsciiDigits(e.target.value))}
                                                                className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full font-mono cursor-pointer"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => openPad('سعر العبوة كاملة — عادي', String(form.data.full_bottle_regular || ''), v => form.setData('full_bottle_regular', toAsciiDigits(v)))}
                                                                className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer"
                                                                title="فتح لوحة الأرقام اللمسية"
                                                            >
                                                                <Calculator className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">سعر العبوة كاملة — VIP</label>
                                                        <div className="relative flex items-center">
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                dir="ltr"
                                                                value={form.data.full_bottle_vip}
                                                                onChange={e => form.setData('full_bottle_vip', toAsciiDigits(e.target.value))}
                                                                className="spatial-input h-14 rounded-[16px] px-4 pl-12 text-lg font-bold border-2 w-full font-mono cursor-pointer"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => openPad('سعر العبوة كاملة — VIP', String(form.data.full_bottle_vip || ''), v => form.setData('full_bottle_vip', toAsciiDigits(v)))}
                                                                className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer"
                                                                title="فتح لوحة الأرقام اللمسية"
                                                            >
                                                                <Calculator className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* حاوية 3: حد تنبيه المخزون */}
                            <div className="p-6 rounded-[24px] bg-slate-100/90 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col gap-4 shadow-sm">
                                <h4 className="text-base sm:text-lg font-black flex items-center gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-3">
                                    <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-500/30">⚠️</span>
                                    <span className="text-slate-900 dark:text-white tracking-wide">إدارة المخزون والتنبيهات</span>
                                </h4>

                                <div className="flex flex-col gap-2.5">
                                    <label className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">حد تنبيه نقصان المخزون</label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            dir="ltr"
                                            value={form.data.min_stock}
                                            onChange={e => form.setData('min_stock', toAsciiDigits(e.target.value))}
                                            placeholder="0"
                                            className="spatial-input h-14 rounded-[18px] px-5 pl-12 text-lg font-bold border-2 w-full font-mono cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => openPad('حد تنبيه نقصان المخزون', String(form.data.min_stock || ''), v => form.setData('min_stock', toAsciiDigits(v)))}
                                            className="absolute left-2 w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer"
                                            title="فتح لوحة الأرقام اللمسية"
                                        >
                                            <Calculator className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-6 sm:p-8 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95 flex items-center gap-4">
                    <button
                        onClick={handleSubmit}
                        disabled={form.processing || isDuplicateName}
                        className="flex-1 spatial-button h-16 rounded-[22px] text-lg font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Check className="w-6 h-6" />
                        {isEdit ? 'تحديث بيانات المنتج' : 'إضافة المنتج إلى النظام'}
                    </button>
                    <button
                        onClick={onClose}
                        className="h-16 px-8 rounded-[22px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-lg active:scale-95 transition-all border-2 border-slate-300 dark:border-slate-600 cursor-pointer"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
