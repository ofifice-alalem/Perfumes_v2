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
                    className={triggerClassName ?? 'flex items-center justify-center gap-3 px-7 h-16 sm:h-20 rounded-[22px] border-2 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-xl sm:text-2xl shadow-md active:scale-95'}
                >
                    <Trash2 className="w-8 h-8 sm:w-9 sm:h-9" /> حذف
                </button>
            )}

            {open && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md"
                        onClick={() => setOpen(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full sm:max-w-md rounded-[32px] p-7 sm:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200
                        border-2 border-black/10 dark:border-white/[0.15]
                        bg-gradient-to-br from-white to-slate-100
                        dark:[background:linear-gradient(145deg,rgba(35,45,85,0.95)_0%,rgba(15,20,45,0.95)_100%)]
                        backdrop-blur-3xl shadow-2xl shadow-black/20">

                        {/* أيقونة التحذير */}
                        <div className="flex items-center justify-between">
                            <div className="w-20 h-20 rounded-[24px] bg-red-500/15 border-2 border-red-500/25 flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 sm:w-11 sm:h-11 text-red-500" />
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-12 h-12 rounded-full bg-black/6 dark:bg-white/10 hover:bg-black/12 dark:hover:bg-white/20 text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all border border-black/5 dark:border-white/10 active:scale-95"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* النص */}
                        <div className="flex flex-col gap-2">
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">{title}</h3>
                            <p className="text-base sm:text-xl font-bold text-slate-600 dark:text-white/60 leading-relaxed">{description}</p>
                        </div>

                        {/* الأزرار */}
                        <div className="flex items-center gap-4 mt-2">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 h-16 sm:h-18 rounded-[22px] bg-black/6 dark:bg-white/10 hover:bg-black/12 dark:hover:bg-white/20 text-slate-700 dark:text-white/80 font-black text-lg sm:text-2xl transition-all border-2 border-black/8 dark:border-white/12 active:scale-95"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 h-16 sm:h-18 rounded-[22px] bg-red-500 hover:bg-red-600 text-white font-black text-lg sm:text-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/30 active:scale-95 border-2 border-red-400/30"
                            >
                                <Trash2 className="w-8 h-8 sm:w-9 sm:h-9" /> حذف
                            </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
