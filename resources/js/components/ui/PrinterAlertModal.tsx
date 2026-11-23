import { Printer, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';

interface PrinterAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

export function PrinterAlertModal({
    isOpen,
    onClose,
    title = 'تنبيه طابعة الفواتير',
    message = 'قم بفحص سيرفر الطباعة',
}: PrinterAlertModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 dir-rtl select-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-md rounded-[32px] p-6 sm:p-7 flex flex-col gap-6 animate-in zoom-in-95 duration-200
                border-2 border-amber-500/40 dark:border-amber-400/30
                bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl
                shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

                {/* Header Icon + Close Button */}
                <div className="flex items-start justify-between">
                    <div className="relative flex items-center justify-center">
                        <div className="w-16 h-16 rounded-[24px] bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                            <Printer className="w-8 h-8" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow">
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-[18px] bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-500 hover:text-white text-slate-400 dark:text-slate-400 flex items-center justify-center transition-all active:scale-90 border border-slate-200 dark:border-slate-700/60 shadow-sm"
                        title="إغلاق"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {title}
                    </h3>
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-700 dark:text-slate-200">
                        <p className="text-base sm:text-lg font-bold leading-relaxed">
                            {message}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1.5">
                            يرجى التأكد من تشغيل تطبيق الوسيط (printer_bridge) على المنفذ 9124
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center gap-3 pt-1">
                    <button
                        onClick={onClose}
                        className="w-full h-14 rounded-[20px] bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black text-base transition-all active:scale-95 shadow-lg shadow-slate-900/20 dark:shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                        <span>حسناً، فهمت</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
