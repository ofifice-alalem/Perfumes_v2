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
    icon = <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            {/* Touch Backdrop */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
                onClick={onCancel}
            />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-lg rounded-[32px] sm:rounded-[36px] p-6 sm:p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200
                border-2 border-amber-500/40 dark:border-amber-400/50
                bg-white dark:bg-slate-900
                shadow-[0_25px_70px_rgba(0,0,0,0.6)]">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                        {icon}
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-slate-100 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90 shadow-sm"
                        title="إغلاق"
                    >
                        <X className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                </div>

                {/* Title & Description */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
                    <div className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200 leading-relaxed bg-amber-500/10 dark:bg-amber-500/20 p-4 sm:p-5 rounded-[22px] border-2 border-amber-500/20">
                        {description}
                    </div>
                </div>

                {/* Touch-optimized Buttons */}
                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-16 sm:h-20 rounded-[24px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg sm:text-xl transition-all border-2 border-slate-300 dark:border-slate-700 active:scale-95 shadow-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 h-16 sm:h-20 rounded-[24px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-lg sm:text-xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/35 active:scale-95"
                    >
                        <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" /> {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
