import React from 'react';

export interface AdminKpiCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon?: React.ReactNode;
    subtitle?: string;
    highlightColor?: string;
    className?: string;
}

export function AdminKpiCard({
    title,
    value,
    unit,
    icon,
    subtitle,
    highlightColor,
    className = '',
}: AdminKpiCardProps) {
    return (
        <div className={`spatial-card p-5 sm:p-6 flex flex-col justify-between gap-2.5 rounded-[26px] sm:rounded-[28px] transition-all duration-200 hover:shadow-xl ${className}`}>
            <span className="text-xs sm:text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider flex items-center gap-2">
                {icon && <span className="shrink-0">{icon}</span>}
                <span className="truncate">{title}</span>
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`text-2xl sm:text-4xl font-black tracking-tight ${highlightColor ?? 'text-slate-800 dark:text-white'}`}>
                    {value}
                </span>
                {unit && (
                    <span className="text-xs sm:text-sm font-bold opacity-75 text-slate-400 dark:text-white/60">
                        {unit}
                    </span>
                )}
            </div>
            {subtitle && (
                <span className="text-xs font-bold text-slate-400 dark:text-white/40 truncate">
                    {subtitle}
                </span>
            )}
        </div>
    );
}
