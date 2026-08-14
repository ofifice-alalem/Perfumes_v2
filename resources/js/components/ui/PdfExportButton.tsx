import React, { useState } from 'react';
import { Download, AlertTriangle, FileSpreadsheet, X } from 'lucide-react';

interface PdfExportButtonProps {
    href: string;
    excelHref?: string;
    className?: string;
    title?: string;
}

export function PdfExportButton({ href, excelHref, className, title = "تصدير PDF" }: PdfExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleConfirm = () => {
        setIsOpen(false);
        window.open(href, '_blank', 'noreferrer');
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
                    <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/30 rounded-[28px] p-6 max-w-md w-full shadow-2xl flex flex-col gap-5">
                        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0 border border-rose-500/30">
                                <AlertTriangle className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-white">تنبيه تصدير ملفات PDF</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">حفاظاً على سرعة وأداء السيرفر</p>
                            </div>
                        </div>

                        <div className="bg-rose-500/10 dark:bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 text-slate-700 dark:text-slate-300 text-sm font-bold leading-relaxed">
                            حفاظاً على أداء السيرفر واستقرار النظام وتفادي الانقطاع، قد لا يتم تحميل كافّة البيانات والملفات الأرشيفية الضخمة جداً في مستند الـ PDF، وسيرفق أحدث السجلات المتاحة أو المفلترة.
                            <br /><br />
                            📌 <span className="font-black text-rose-600 dark:text-rose-400">تنويه:</span> للحصول على كافّة البيانات والأرشيف الشامل بدون أي حد، يفضل استخدام <span className="font-black underline">تصدير إكسيل (Excel)</span>.
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>متابعة التحميل</span>
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
                                    <span>تحميل الإكسيل الشامل</span>
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-bold flex items-center justify-center shrink-0 cursor-pointer"
                                title="إلغاء"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
