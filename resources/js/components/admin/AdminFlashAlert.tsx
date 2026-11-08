import React from 'react';

export interface AdminFlashAlertProps {
    flash?: { success?: string; error?: string };
    className?: string;
}

export function AdminFlashAlert({ flash, className = '' }: AdminFlashAlertProps) {
    if (!flash?.success && !flash?.error) return null;

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {flash.success && (
                <div className="px-6 py-4 rounded-[22px] bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    {flash.success}
                </div>
            )}
            {flash.error && (
                <div className="px-6 py-4 rounded-[22px] bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-black text-base sm:text-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    {flash.error}
                </div>
            )}
        </div>
    );
}
