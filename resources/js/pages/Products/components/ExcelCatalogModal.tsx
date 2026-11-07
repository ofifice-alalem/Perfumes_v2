import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from '@inertiajs/react';
import { FileSpreadsheet, X, Plus, Trash2, Upload } from 'lucide-react';

interface ExcelCatalogModalProps {
    show: boolean;
    onClose: () => void;
}

export const ExcelCatalogModal: React.FC<ExcelCatalogModalProps> = ({ show, onClose }) => {
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const importForm = useForm<{ file: File | null; import_mode: 'add_only' | 'wipe_and_replace' }>({
        file: null,
        import_mode: 'add_only',
    });

    if (!show) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 dir-rtl">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in cursor-pointer"
                onClick={() => !importForm.processing && onClose()}
            />
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-[28px] shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">استيراد البيانات من Excel</h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">رفع شيت إكسل يتضمن المنتجات والتصنيفات والأحجام والتيرات</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={importForm.processing}
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!importForm.data.file) return;
                        importForm.post('/products/import/excel', {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                onClose();
                                importForm.reset();
                            },
                        });
                    }}
                    className="p-6 space-y-5"
                >
                    {/* تعليمات وتنبيهات */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed space-y-1">
                        <p className="font-black text-sm">💡 تنبيه وتعليمات الاستيراد:</p>
                        <p>• يُفضّل دائماً تصدير نسخة من المنتجات كإجراء احتياطي قبل الاستيراد.</p>
                        <p>• حدد أدناه كيفية معالجة البيانات السابقة (التصنيفات، الأحجام، التيرات، المنتجات).</p>
                    </div>

                    {/* خيارات طريقة الاستيراد */}
                    <div className="space-y-2.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                            طريقة معالجة البيانات:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Option 1: إضافة المنتجات الجديدة فقط */}
                            <div
                                onClick={() => importForm.setData('import_mode', 'add_only')}
                                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col justify-between gap-3 ${
                                    importForm.data.import_mode === 'add_only'
                                        ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                            importForm.data.import_mode === 'add_only'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                            <Plus className="w-4 h-4 stroke-[3]" />
                                        </div>
                                        <span className="font-black text-sm text-slate-900 dark:text-white">
                                            إضافة الجديد فقط
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                        موصى به
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    تخطي البيانات والمنتجات المشتركة وإبقاء بياناتها كما هي، وإضافة البيانات الجديدة فقط الواردة في الملف.
                                </p>
                            </div>

                            {/* Option 2: مسح البيانات السابقة ثم وضع البيانات الجديدة */}
                            <div
                                onClick={() => importForm.setData('import_mode', 'wipe_and_replace')}
                                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col justify-between gap-3 ${
                                    importForm.data.import_mode === 'wipe_and_replace'
                                        ? 'border-rose-500 bg-rose-500/10 shadow-md shadow-rose-500/10'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                            importForm.data.import_mode === 'wipe_and_replace'
                                                ? 'bg-rose-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                            <Trash2 className="w-4 h-4" />
                                        </div>
                                        <span className="font-black text-sm text-slate-900 dark:text-white">
                                            مسح الكل واستبدال
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
                                        حذف شامل
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    مسح كافة البيانات السابقة بالكامل (المنتجات، التصنيفات، الأحجام، التيرات والأسعار)، وتنزيل بيانات الملف كنسخة جديدة كلياً.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* منطقة اختيار الملف */}
                    <div>
                        <input
                            ref={importFileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                importForm.setData('file', file);
                            }}
                        />

                        <div
                            onClick={() => importFileInputRef.current?.click()}
                            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                                importForm.data.file
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-amber-500/5'
                            }`}
                        >
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 mb-3">
                                {importForm.data.file ? (
                                    <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                                ) : (
                                    <Upload className="w-7 h-7 text-amber-500" />
                                )}
                            </div>
                            {importForm.data.file ? (
                                <div className="space-y-1">
                                    <p className="font-black text-sm text-emerald-700 dark:text-emerald-300 truncate max-w-xs mx-auto">
                                        {importForm.data.file.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        الحجم: {(importForm.data.file.size / 1024).toFixed(1)} ك.ب (اضغط للتغيير)
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                        انقر هنا لاختيار ملف Excel (.xlsx)
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        الحد الأقصى للحجم 20 ميغابايت
                                    </p>
                                </div>
                            )}
                        </div>

                        {importForm.errors.file && (
                            <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                                {importForm.errors.file}
                            </p>
                        )}
                    </div>

                    {/* أزرار الإجراء */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            disabled={importForm.processing}
                            onClick={onClose}
                            className="px-5 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-sm transition-all disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={!importForm.data.file || importForm.processing}
                            className={`flex items-center gap-2 px-6 h-12 rounded-xl text-white font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none ${
                                importForm.data.import_mode === 'wipe_and_replace'
                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                            }`}
                        >
                            {importForm.data.import_mode === 'wipe_and_replace' ? (
                                <Trash2 className="w-4 h-4" />
                            ) : (
                                <Plus className="w-4 h-4 stroke-[3]" />
                            )}
                            <span>{importForm.processing ? 'جاري المعالجة...' : 'بدء الاستيراد الآن'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
