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
    title = 'تأكيد',
    description = 'هل أنت متأكد؟',
    onConfirm,
    onCancel,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    icon = <AlertCircle className="w-6 h-6 text-amber-500" />
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative w-full sm:max-w-sm rounded-[28px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200
                border border-black/10 dark:border-white/[0.12]
                bg-gradient-to-br from-white to-slate-100
                dark:[background:linear-gradient(145deg,rgba(40,60,120,0.45)_0%,rgba(20,25,55,0.35)_100%)]
                backdrop-blur-3xl shadow-2xl shadow-black/10 dark:shadow-black/50">

                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-amber-500/12 border border-amber-500/15 flex items-center justify-center">
                        {icon}
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-9 h-9 rounded-full bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 flex items-center justify-center transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">{description}</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-11 rounded-[14px] bg-black/6 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-600 dark:text-white/70 font-bold text-sm transition-all border border-black/8 dark:border-white/10"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 h-11 rounded-[14px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-amber-500/30"
                    >
                        <Check className="w-4 h-4" /> {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
