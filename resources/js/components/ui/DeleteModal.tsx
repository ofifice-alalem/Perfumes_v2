import { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DeleteModalProps {
    title?: string;
    description?: string;
    onConfirm: () => void;
    trigger?: React.ReactNode;
    triggerClassName?: string;
    wrapperClassName?: string;
}

export function DeleteModal({
    title = 'تأكيد الحذف',
    description = 'هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.',
    onConfirm,
    trigger,
    triggerClassName,
    wrapperClassName,
}: DeleteModalProps) {
    const [open, setOpen] = useState(false);

    function handleConfirm() {
        setOpen(false);
        onConfirm();
    }

    return (
        <>
            {trigger ? (
                <div className={wrapperClassName} onClick={() => setOpen(true)}>{trigger}</div>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className={triggerClassName ?? 'flex items-center justify-center gap-2 px-5 h-11 sm:h-12 rounded-[2px] border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all font-bold text-sm shadow-sm active:scale-95 cursor-pointer'}
                >
                    <Trash2 className="w-4 h-4" /> حذف
                </button>
            )}

            {open && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
                        onClick={() => setOpen(false)}
                    />

                    {/* Modal */}
                    <div className="relative z-10 w-full max-w-md rounded-[2px] p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150
                        border border-slate-200 dark:border-[#1d2d42]
                        bg-white dark:bg-[#0c1421]
                        shadow-2xl">

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#19273b] pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-[2px] bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="w-7 h-7 rounded-[2px] hover:bg-slate-100 dark:hover:bg-[#152238] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="py-1">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{description}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-[#19273b]">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex-1 h-11 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-[#121c2c] dark:hover:bg-[#18263b] text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer border border-slate-200 dark:border-[#1d2d42]"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="flex-1 h-11 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>تأكيد الحذف</span>
                            </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
