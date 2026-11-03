import React from 'react';
import { X, Layers } from 'lucide-react';

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
  title?: string;
}

export function SaleTypeModal({ isOpen, onClose, onSelect, options, title = 'اختر نوع البيع' }: SaleTypeModalProps) {
  if (!isOpen) return null;

  const handleSelect = (badge: string) => {
    onSelect(badge);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1421] rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/80 dark:bg-[#09111c]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] hover:bg-slate-100 dark:hover:bg-[#152238] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 sm:p-5 flex flex-col gap-2.5">
          {options.map((option) => (
            <button
              key={option.badge}
              type="button"
              onClick={() => handleSelect(option.badge)}
              className="w-full p-3.5 rounded-[2px] border border-slate-200/90 dark:border-[#1d2d42] bg-slate-50/50 dark:bg-[#09111c] hover:bg-sky-50/50 dark:hover:bg-sky-950/20 hover:border-sky-500/40 dark:hover:border-sky-500/30 transition-all text-right group cursor-pointer active:scale-[0.99] flex items-center gap-3.5"
            >
              {option.icon && (
                <div className="w-10 h-10 rounded-[2px] bg-slate-100 dark:bg-[#121c2d] border border-slate-200/80 dark:border-[#1d2d42] flex items-center justify-center text-xl shrink-0 group-hover:border-brand/40">
                  {option.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-brand transition-colors">
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {option.description}
                  </div>
                )}
              </div>
              <div className="w-4 h-4 rounded-[2px] border border-slate-300 dark:border-slate-600 group-hover:border-brand flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-[1px] bg-brand opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
