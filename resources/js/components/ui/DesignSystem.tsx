import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, ArrowDownRight, ArrowLeft } from 'lucide-react';

/* =========================================================================
   1. CIRCULAR PROGRESS GAUGE COMPONENT (دوائر تقدم تفاعلية)
   - Dynamic SVG Progress Ring with clockwise fill based on percentage
   - Inner Center Percentage display
   - Amount Value + Descriptive Label below
   - Signature Gold, Emerald Mint, Coral, and Cyan metallic gradients
   ========================================================================= */
export interface CircularGaugeProps {
  percentage: number;
  value: string | number;
  unit?: string;
  label: string;
  tone?: 'gold' | 'mint' | 'cyan' | 'coral' | 'purple';
  size?: number;
  strokeWidth?: number;
}

export function CircularProgressGauge({
  percentage,
  value,
  unit = 'د.ل',
  label,
  tone = 'gold',
  size = 44,
  strokeWidth = 4,
}: CircularGaugeProps) {
  const clampedPct = Math.max(0, Math.min(100, Math.round(percentage || 0)));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  const toneConfig = {
    gold: {
      gradientId: 'goldGaugeGrad',
      startColor: '#fde8a7',
      midColor: '#caa13a',
      endColor: '#9e7512',
      valueCls: 'text-[#caa13a] dark:text-[#ecd068]',
      ringGlow: 'drop-shadow-[0_0_5px_rgba(202,161,58,0.35)]',
    },
    mint: {
      gradientId: 'mintGaugeGrad',
      startColor: '#a7f3d0',
      midColor: '#10b981',
      endColor: '#047857',
      valueCls: 'text-emerald-600 dark:text-emerald-400',
      ringGlow: 'drop-shadow-[0_0_5px_rgba(16,185,129,0.35)]',
    },
    coral: {
      gradientId: 'coralGaugeGrad',
      startColor: '#fecdd3',
      midColor: '#f43f5e',
      endColor: '#be123c',
      valueCls: 'text-rose-600 dark:text-rose-400',
      ringGlow: 'drop-shadow-[0_0_5px_rgba(244,63,94,0.35)]',
    },
    cyan: {
      gradientId: 'cyanGaugeGrad',
      startColor: '#bae6fd',
      midColor: '#0284c7',
      endColor: '#0369a1',
      valueCls: 'text-sky-600 dark:text-sky-400',
      ringGlow: 'drop-shadow-[0_0_5px_rgba(2,132,199,0.35)]',
    },
    purple: {
      gradientId: 'purpleGaugeGrad',
      startColor: '#e9d5ff',
      midColor: '#a855f7',
      endColor: '#7e22ce',
      valueCls: 'text-purple-600 dark:text-purple-400',
      ringGlow: 'drop-shadow-[0_0_5px_rgba(168,85,247,0.35)]',
    },
  }[tone] || {
    gradientId: 'goldGaugeGrad',
    startColor: '#fde8a7',
    midColor: '#caa13a',
    endColor: '#9e7512',
    valueCls: 'text-[#caa13a] dark:text-[#ecd068]',
    ringGlow: 'drop-shadow-[0_0_5px_rgba(202,161,58,0.35)]',
  };

  const ringElement = (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`${toneConfig.gradientId}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={toneConfig.startColor} />
            <stop offset="50%" stopColor={toneConfig.midColor} />
            <stop offset="100%" stopColor={toneConfig.endColor} />
          </linearGradient>
        </defs>

        {/* Background circle track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="stroke-black/5 dark:stroke-white/10"
        />

        {/* Glowing Animated Progress Stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={`url(#${toneConfig.gradientId}-${size})`}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-700 ease-out ${toneConfig.ringGlow}`}
        />
      </svg>

      {/* Center Percentage Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[11px] font-black font-mono text-slate-900 dark:text-white tracking-tight">
          {clampedPct}%
        </span>
      </div>
    </div>
  );

  if (!value && !label) {
    return ringElement;
  }

  return (
    <div className="flex flex-col items-center justify-center p-1.5 flex-1 min-w-0">
      {ringElement}
      <div className="flex flex-col items-center text-center mt-1 w-full">
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-sm sm:text-base font-black ${toneConfig.valueCls} tracking-tight`}>
            {value}
          </span>
          {unit && (
            <span className="text-[10px] font-bold text-slate-400 dark:text-[#7d93a8]">
              {unit}
            </span>
          )}
        </div>
        {label && (
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-[#8ea2b8] mt-0.5 truncate max-w-full">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   2. METRIC KPI CARD (Precise 1:1 match with Orvexa Reference Image 1)
   - Icon Square + Status Dot on Top Row
   - Two Columns Below: (Label + Big Metric + Subtitle) & (5-6 Vertical Histogram Bars)
   - Signature Metallic Gold & High-Tech Accents
   ========================================================================= */
export interface MetricKpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: 'gold' | 'cyan' | 'mint' | 'coral' | 'purple';
  bars?: number[];
  className?: string;
  onClick?: () => void;
}

export function MetricKpiCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  tone = 'gold',
  bars = [25, 45, 60, 80, 100],
  className = '',
  onClick,
}: MetricKpiCardProps) {
  const toneConfigs = {
    gold: {
      iconBox: 'border-[#caa13a]/35 bg-[#caa13a]/10 text-[#caa13a] dark:text-[#ecd068]',
      statusDot: 'bg-[#caa13a] dark:bg-[#ecd068] shadow-[0_0_8px_rgba(202,161,58,0.9)]',
      barGradient: 'from-[#caa13a]/10 via-[#caa13a]/60 to-[#fde8a7] dark:from-[#caa13a]/5 dark:via-[#ecd068]/60 dark:to-[#fde8a7] drop-shadow-[0_0_8px_rgba(202,161,58,0.4)]',
      cardGlow: 'hover:border-[#caa13a]/40 hover:shadow-[0_14px_36px_rgba(202,161,58,0.18)]',
    },
    cyan: {
      iconBox: 'border-sky-500/30 bg-sky-500/10 text-sky-500 dark:text-sky-400',
      statusDot: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]',
      barGradient: 'from-sky-500/10 via-sky-400/60 to-sky-300 dark:from-sky-500/5 dark:via-sky-400/60 dark:to-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]',
      cardGlow: 'hover:border-sky-500/40 hover:shadow-[0_14px_36px_rgba(56,189,248,0.14)]',
    },
    mint: {
      iconBox: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
      statusDot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]',
      barGradient: 'from-emerald-500/10 via-emerald-400/60 to-emerald-300 dark:from-emerald-500/5 dark:via-emerald-400/60 dark:to-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]',
      cardGlow: 'hover:border-emerald-500/40 hover:shadow-[0_14px_36px_rgba(52,211,153,0.14)]',
    },
    coral: {
      iconBox: 'border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400',
      statusDot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.9)]',
      barGradient: 'from-rose-500/10 via-rose-400/60 to-rose-300 dark:from-rose-500/5 dark:via-rose-400/60 dark:to-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.35)]',
      cardGlow: 'hover:border-rose-500/40 hover:shadow-[0_14px_36px_rgba(244,63,94,0.14)]',
    },
    purple: {
      iconBox: 'border-purple-500/30 bg-purple-500/10 text-purple-500 dark:text-purple-400',
      statusDot: 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.9)]',
      barGradient: 'from-purple-500/10 via-purple-400/60 to-purple-300 dark:from-purple-500/5 dark:via-purple-400/60 dark:to-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.35)]',
      cardGlow: 'hover:border-purple-500/40 hover:shadow-[0_14px_36px_rgba(168,85,247,0.14)]',
    },
  };

  const currentTone = toneConfigs[tone] || toneConfigs.gold;

  return (
    <div
      onClick={onClick}
      className={`spatial-card p-5 sm:p-6 flex flex-col justify-between gap-4 transition-all duration-300 group hover:-translate-y-1 ${
        currentTone.cardGlow
      } ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
    >
      {/* ── Top Row: Icon Box + Glowing Status Dot ── */}
      <div className="flex items-center justify-between">
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${currentTone.iconBox}`}
        >
          {icon}
        </div>
        <div className={`w-2 h-2 rounded-full ${currentTone.statusDot}`} />
      </div>

      {/* ── Bottom Row: 2 Columns (Text Info & Micro-Histogram Bars) ── */}
      <div className="flex items-end justify-between gap-3 mt-1">
        {/* Text Info */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-slate-500 dark:text-[#8ea2b8] tracking-tight">
            {title}
          </span>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-[#7d93a8]">
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#6a7f96] truncate">
              {subtitle}
            </span>
          )}
        </div>

        {/* 5-6 glowing vertical bars */}
        <div className="flex items-end gap-1.5 h-12 sm:h-14 shrink-0 pb-0.5">
          {bars.slice(0, 6).map((h, idx) => (
            <div
              key={idx}
              style={{ height: `${Math.max(18, Math.min(100, h))}%` }}
              className={`w-2 sm:w-2.5 rounded-full bg-gradient-to-t ${currentTone.barGradient} transition-all duration-300 group-hover:scale-y-105`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. OVERVIEW METRIC CARD (Executive Compact Financial Section)
   - Integrated Header: Icon + Title (Right), Total Amount (Left) - NO AI badges
   - Horizontal Split: Received vs Due with inline 44px circular progress rings
   - Dual-Gradient Proportion Bar connecting the percentages
   - Crisp Golden Footer Action Link
   ========================================================================= */
export interface OverviewMetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  unit?: string;
  valueLabel?: string;
  periodBadge?: string;
  delta?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  gauges?: Array<{
    percentage: number;
    value: string | number;
    unit?: string;
    label: string;
    tone?: 'gold' | 'mint' | 'cyan' | 'coral' | 'purple';
  }>;
  insets?: Array<{
    label: string;
    value: string | number;
    unit?: string;
    tone?: 'default' | 'mint' | 'amber' | 'coral';
  }>;
  footerLink?: {
    href: string;
    label: string;
  };
  className?: string;
}

export function OverviewMetricCard({
  title,
  icon,
  value,
  unit = 'د.ل',
  valueLabel,
  gauges = [],
  insets = [],
  footerLink,
  className = '',
}: OverviewMetricCardProps) {
  return (
    <div
      className={`spatial-card p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-all duration-300 hover:-translate-y-0.5 ${className}`}
    >
      {/* ── 1. Top Bar: Icon + Title (Right), Total Amount (Left) ── */}
      <div className="flex items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#caa13a]/15 border border-[#caa13a]/30 text-[#caa13a] dark:text-[#ecd068] flex items-center justify-center shrink-0 shadow-sm">
            {icon}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
              {title}
            </h3>
            {valueLabel && (
              <span className="text-[11px] font-medium text-slate-400 dark:text-[#8ea2b8] truncate">
                {valueLabel}
              </span>
            )}
          </div>
        </div>

        {/* Total Value directly opposite Title - Clean & Executive */}
        <div className="flex items-baseline gap-1 shrink-0 text-left">
          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-bold text-slate-400 dark:text-[#7d93a8]">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Breakdown Section: Compact Side-by-Side with Circular Progress Rings ── */}
      {gauges && gauges.length > 0 && (
        <div className="flex flex-col gap-2.5 my-0.5">
          <div className="grid grid-cols-2 gap-3 items-center">
            {gauges.map((gauge, idx) => {
              const valToneCls =
                gauge.tone === 'mint'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : gauge.tone === 'coral'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-[#caa13a] dark:text-[#ecd068]';

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 min-w-0 ${
                    idx === 0
                      ? 'border-l border-black/5 dark:border-white/10 pl-2'
                      : 'pr-1'
                  }`}
                >
                  <CircularProgressGauge
                    percentage={gauge.percentage}
                    tone={gauge.tone}
                    size={44}
                    strokeWidth={4}
                  />

                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-[#8ea2b8] truncate">
                      {gauge.label}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-base sm:text-lg font-black font-mono tracking-tight truncate ${valToneCls}`}>
                        {gauge.value}
                      </span>
                      {gauge.unit && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {gauge.unit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sleek Dual Proportion Bar (Connecting the two percentages) */}
          <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex">
            <div
              style={{ width: `${Math.max(0, Math.min(100, gauges[0]?.percentage || 0))}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
            />
            <div
              style={{ width: `${Math.max(0, Math.min(100, gauges[1]?.percentage || 0))}%` }}
              className={`h-full transition-all duration-700 ${
                gauges[1]?.tone === 'coral'
                  ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                  : 'bg-gradient-to-r from-[#caa13a] to-[#ecd068]'
              }`}
            />
          </div>
        </div>
      )}

      {/* ── Insets Fallback (If provided and no gauges) ── */}
      {(!gauges || gauges.length === 0) && insets.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 my-0.5">
          {insets.slice(0, 2).map((inset, idx) => {
            const toneCls =
              inset.tone === 'mint'
                ? 'text-emerald-600 dark:text-emerald-400'
                : inset.tone === 'amber'
                ? 'text-[#caa13a] dark:text-[#ecd068]'
                : inset.tone === 'coral'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white';

            return (
              <div
                key={idx}
                className="rounded-xl border border-black/5 dark:border-[rgba(65,96,128,0.35)] bg-black/[0.02] dark:bg-[#111c28]/70 p-2.5 flex flex-col gap-0.5"
              >
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#8ea2b8] truncate">
                  {inset.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-base sm:text-lg font-black ${toneCls}`}>
                    {inset.value}
                  </span>
                  {inset.unit && (
                    <span className="text-[10px] font-bold text-slate-400">{inset.unit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Footer Link ── */}
      {footerLink && (
        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <Link
            href={footerLink.href}
            className="inline-flex items-center gap-1.5 font-bold text-xs text-[#caa13a] dark:text-[#ecd068] hover:text-[#b38a25] transition-all group"
          >
            <span>{footerLink.label}</span>
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. STATUS BADGE COMPONENT
   ========================================================================= */
export interface StatusBadgeProps {
  status: 'paid' | 'partial' | 'unpaid' | 'high' | 'medium' | 'low' | 'live' | 'good' | 'warn' | 'danger';
  label?: string;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, pulse = false, className = '' }: StatusBadgeProps) {
  const configs: Record<string, { defaultLabel: string; cls: string; dotCls: string }> = {
    paid: {
      defaultLabel: 'مدفوعة',
      cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
      dotCls: 'bg-emerald-500',
    },
    good: {
      defaultLabel: 'ممتاز',
      cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
      dotCls: 'bg-emerald-500',
    },
    live: {
      defaultLabel: 'مباشر',
      cls: 'text-[#caa13a] dark:text-[#ecd068] bg-[#caa13a]/15 border-[#caa13a]/30',
      dotCls: 'bg-[#caa13a]',
    },
    partial: {
      defaultLabel: 'جزئي',
      cls: 'text-[#caa13a] dark:text-[#ecd068] bg-[#caa13a]/15 border-[#caa13a]/30',
      dotCls: 'bg-[#caa13a]',
    },
    warn: {
      defaultLabel: 'تنبيه',
      cls: 'text-[#caa13a] dark:text-[#ecd068] bg-[#caa13a]/15 border-[#caa13a]/30',
      dotCls: 'bg-[#caa13a]',
    },
    medium: {
      defaultLabel: 'متوسط',
      cls: 'text-[#caa13a] dark:text-[#ecd068] bg-[#caa13a]/15 border-[#caa13a]/30',
      dotCls: 'bg-[#caa13a]',
    },
    unpaid: {
      defaultLabel: 'غير مدفوع',
      cls: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30',
      dotCls: 'bg-rose-500',
    },
    danger: {
      defaultLabel: 'حرج',
      cls: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30',
      dotCls: 'bg-rose-500',
    },
    high: {
      defaultLabel: 'مرتفع',
      cls: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30',
      dotCls: 'bg-rose-500',
    },
    low: {
      defaultLabel: 'منخفض',
      cls: 'text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
      dotCls: 'bg-cyan-500',
    },
  };

  const config = configs[status] || configs.paid;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 text-xs font-black shadow-sm ${config.cls} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotCls} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{label || config.defaultLabel}</span>
    </span>
  );
}

/* =========================================================================
   5. SECTION HEADER COMPONENT
   ========================================================================= */
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ${className}`}>
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="w-12 h-12 rounded-[18px] bg-[#caa13a]/15 border-2 border-[#caa13a]/30 text-[#caa13a] dark:text-[#ecd068] flex items-center justify-center shrink-0 shadow-sm">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#caa13a]/15 text-[#caa13a] dark:text-[#ecd068] border border-[#caa13a]/30">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-white/50 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

/* =========================================================================
   6. SPATIAL BUTTON (Signature Metallic Gold Primary & Outlines)
   ========================================================================= */
export interface SpatialButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SpatialButton({
  variant = 'primary',
  icon,
  children,
  href,
  onClick,
  className = '',
  disabled = false,
}: SpatialButtonProps) {
  const baseClasses =
    'h-12 sm:h-14 px-5 sm:px-6 rounded-[20px] font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation cursor-pointer shrink-0 disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary:
      'spatial-button text-slate-950 font-black shadow-lg border border-[#fce49b]/50',
    secondary:
      'bg-slate-200/90 dark:bg-white/[0.06] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-slate-800 dark:text-white border-2 border-slate-300/80 dark:border-white/10 shadow-sm',
    outline:
      'border-2 border-[#caa13a]/40 bg-[#caa13a]/10 hover:bg-[#caa13a] hover:text-slate-950 text-[#caa13a] dark:text-[#ecd068] shadow-sm',
    danger:
      'border-2 border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 shadow-sm',
  };

  const finalClass = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={finalClass}>
        {icon}
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={finalClass}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
