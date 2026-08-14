import React, { useState } from 'react';
import { Download, AlertTriangle, FileSpreadsheet, X, Layers } from 'lucide-react';

interface PdfExportButtonProps {
    href: string;
    excelHref?: string;
    className?: string;
    title?: string;
    totalCount?: number;
}

export function PdfExportButton({ href, excelHref, className, title = "تصدير PDF", totalCount }: PdfExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<number>(1);

    const batchSize = 500;
    const totalBatches = totalCount && totalCount > 0 ? Math.ceil(totalCount / batchSize) : 1;

    const handleConfirm = () => {
        setIsOpen(false);
        let finalUrl = href;
        if (totalBatches > 1) {
            const offset = (selectedBatch - 1) * batchSize;
            const separator = href.includes('?') ? '&' : '?';
            finalUrl = `${href}${separator}offset=${offset}&limit=${batchSize}`;
        }
        window.open(finalUrl, '_blank', 'noreferrer');
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={className || "h-12 px-5 rounded-[16px] bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500 hover:text-white border-2 border-rose-500/30 font-black text-base flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"}
                title={title}
            >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">{title}</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200 dir-rtl">
                    <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/30 rounded-[28px] p-6 max-w-lg w-full shadow-2xl flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0 border border-rose-500/30">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900 dark:text-white">نظام تصدير ملفات PDF</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">تقسيم التصدير على دفعات ميسرة لضمان الأداء</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-rose-500/10 dark:bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 text-slate-700 dark:text-slate-300 text-sm font-bold leading-relaxed space-y-2">
                            <div className="flex items-start gap-2">
                                <Layers className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-black text-rose-700 dark:text-rose-300">نظام الدفعات (500 فاتورة لكل دفعة):</span>
                                    <br />
                                    حفاظاً على أداء السيرفر وسرعة التنزيل وتفادي انقطاع الشبكة، يتم تصدير الـ PDF على دفعات بواقع <span className="font-black underline text-rose-600 dark:text-rose-400">500 فاتورة لكل دفعة</span> (مثلاً: الدفعات من 1 إلى 10 لإجمالي 5,000 فاتورة).
                                </div>
                            </div>

                            {excelHref && (
                                <div className="pt-2 border-t border-rose-500/20 text-xs">
                                    📌 <span className="font-black text-emerald-600 dark:text-emerald-400">تنبيه:</span> للحصول على <span className="font-black">كافة السجلات الشاملة في ملف واحد بضغطة واحدة</span>، يفضل استخدام <span className="font-black text-emerald-600 underline">تصدير الإكسيل (Excel)</span>.
                                </div>
                            )}
                        </div>

                        {totalBatches > 1 && (
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                                    اختر رقم الدفعة المراد تصديرها (إجمالي الدفعات: {totalBatches}):
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                                    {Array.from({ length: totalBatches }, (_, i) => i + 1).map((bNum) => {
                                        const startItem = (bNum - 1) * batchSize + 1;
                                        const endItem = Math.min(bNum * batchSize, totalCount || bNum * batchSize);
                                        const isSelected = selectedBatch === bNum;
                                        return (
                                            <button
                                                key={bNum}
                                                type="button"
                                                onClick={() => setSelectedBatch(bNum)}
                                                className={`p-2 rounded-xl border-2 text-xs font-bold transition-all text-center cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-rose-600 border-rose-600 text-white shadow-md scale-95'
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                                                }`}
                                            >
                                                <div>الدفعة {bNum}</div>
                                                <div className="text-[10px] opacity-80">({startItem} - {endItem})</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>تصدير PDF {totalBatches > 1 ? `(الدفعة ${selectedBatch})` : ''}</span>
                            </button>

                            {excelHref && (
                                <a
                                    href={excelHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>تصدير الإكسيل الشامل</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
