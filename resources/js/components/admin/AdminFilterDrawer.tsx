import React from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, Search, Check, RotateCcw } from 'lucide-react';

export interface AdminFilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    searchPlaceholder?: string;
    searchLabel?: string;
    children?: React.ReactNode;
    onApply: () => void;
    onReset: () => void;
}

export function AdminFilterDrawer({
    isOpen,
    onClose,
    title = 'فلترة وتصفية البيانات',
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'ابحث هنا...',
    searchLabel = 'بحث بالاسم أو الكلمات المفتاحية',
    children,
    onApply,
    onReset,
}: AdminFilterDrawerProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-start dir-rtl select-none">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full sm:w-[560px] max-w-[95vw] bg-white dark:bg-slate-900 h-full shadow-[-24px_0_60px_rgba(0,0,0,0.4)] flex flex-col z-10 border-l-2 border-black/10 dark:border-white/10 animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-black/5 dark:border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[16px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <SlidersHorizontal className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-[16px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-500 dark:text-white/70 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                    {/* Search Input */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs sm:text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">
                            {searchLabel}
                        </label>
                        <div className="relative">
                            <input
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 pl-14 text-lg sm:text-xl font-bold border-2 w-full"
                            />
                            <Search className="w-6 h-6 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Additional Filters */}
                    {children}
                </div>

                {/* Footer Actions */}
                <div className="p-6 sm:p-8 border-t border-black/5 dark:border-white/10 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    <button
                        type="button"
                        onClick={onApply}
                        className="spatial-button flex-1 h-16 sm:h-20 rounded-[22px] text-lg sm:text-xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 cursor-pointer"
                    >
                        <Check className="w-6 h-6" /> تطبيق الفلتر
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        className="h-16 sm:h-20 px-6 sm:px-8 rounded-[22px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black text-base sm:text-lg transition-all border-2 border-red-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <RotateCcw className="w-5 h-5" /> إعادة تعيين
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
