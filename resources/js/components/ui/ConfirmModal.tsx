import { AlertCircle, X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    description?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    icon?: React.ReactNode;
}

export function ConfirmModal({
    isOpen,
    title = 'تأكيد العملية',
    description = 'هل أنت متأكد من الاستمرار؟',
    onConfirm,
    onCancel,
    confirmText = 'تأكيد وحفظ',
    cancelText = 'إلغاء',
    icon = <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
            {/* Touch Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
                onClick={onCancel}
            />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-md rounded-[2px] p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150
                border border-slate-200 dark:border-[#1d2d42]
                bg-white dark:bg-[#0c1421]
                shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#19273b] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[2px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                            {icon}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-8 h-8 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] hover:bg-slate-100 dark:hover:bg-[#19273b] text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                        title="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Description */}
                <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-500/10 dark:bg-amber-500/15 p-3.5 rounded-[2px] border border-amber-500/25">
                    {description}
                </div>

                {/* Touch-optimized Buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 h-11 sm:h-12 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-[#152238] dark:hover:bg-[#1c2e4c] text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-colors border border-slate-200 dark:border-[#223654] cursor-pointer"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 h-11 sm:h-12 rounded-[2px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                        <Check className="w-4 h-4" /> {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
