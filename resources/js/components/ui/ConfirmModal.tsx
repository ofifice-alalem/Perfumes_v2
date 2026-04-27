import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.',
  confirmText = 'حذف',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative spatial-card w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">

        {/* Icon */}
        <div className="w-14 h-14 rounded-[20px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">{title}</h3>
          <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[16px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 font-bold text-sm transition-all"
          >
            <X className="w-4 h-4" />
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[16px] bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
