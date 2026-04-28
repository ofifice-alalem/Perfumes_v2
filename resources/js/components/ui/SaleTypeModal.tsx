import { X } from 'lucide-react';

interface SaleTypeOption {
  label: string;
  badge: string;
  description?: string;
  icon?: string;
}

interface SaleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (saleType: string) => void;
  options: SaleTypeOption[];
  title: string;
}

export function SaleTypeModal({ isOpen, onClose, onSelect, options, title }: SaleTypeModalProps) {
  if (!isOpen) return null;

  const handleSelect = (badge: string) => {
    onSelect(badge);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-black/10 dark:border-white/10 shadow-2xl w-96 max-w-[90vw] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <h3 className="font-black text-slate-800 dark:text-white text-lg">{title}</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 dark:text-white/40 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6">
          <div className="flex flex-col gap-3">
            {options.map((option) => (
              <button
                key={option.badge}
                onClick={() => handleSelect(option.badge)}
                className="w-full p-4 rounded-[16px] border-2 border-black/10 dark:border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  {option.icon && (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                      {option.icon}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-black text-slate-800 dark:text-white text-base mb-1">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-sm text-slate-500 dark:text-white/60">
                        {option.description}
                      </div>
                    )}
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-white/20 group-hover:border-primary transition-all flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all"></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}