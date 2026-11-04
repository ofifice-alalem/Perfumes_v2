import { useState } from 'react';
import { NumberPadModal } from '@/components/ui/NumberPadModal';
import { X, DollarSign } from 'lucide-react';

interface Props {
    label?:    string;
    valueFrom: string;
    valueTo:   string;
    onChange:  (from: string, to: string) => void;
}

export function AmountRangeInput({ label = 'المبلغ (من — إلى)', valueFrom, valueTo, onChange }: Props) {
    const [activePad, setActivePad] = useState<'from' | 'to' | null>(null);

    function fmt(v: string) {
        const n = parseFloat(v);
        return isNaN(n) ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    const fieldCls = `h-11 sm:h-12 px-3.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] hover:border-brand/60 dark:hover:border-brand/60 transition-colors font-number font-bold text-sm sm:text-base text-center cursor-pointer flex items-center justify-between select-none shadow-2xs active:scale-[0.98] w-full text-slate-800 dark:text-slate-100`;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-brand" />
                    <span>{label}</span>
                </span>
                {(valueFrom || valueTo) && (
                    <button
                        type="button"
                        onClick={() => onChange('', '')}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 px-2 py-0.5 rounded-[2px] border border-rose-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                        title="مسح النطاق"
                    >
                        <X className="w-3.5 h-3.5" />
                        <span>مسح</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {/* حقل من */}
                <button
                    type="button"
                    onClick={() => setActivePad('from')}
                    className={fieldCls}
                >
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">من:</span>
                    <span className={valueFrom ? 'text-slate-900 dark:text-white font-bold text-sm sm:text-base' : 'text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm'}>
                        {valueFrom ? `${fmt(valueFrom)} د.ل` : 'الحد الأدنى'}
                    </span>
                </button>

                {/* حقل إلى */}
                <button
                    type="button"
                    onClick={() => setActivePad('to')}
                    className={fieldCls}
                >
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">إلى:</span>
                    <span className={valueTo ? 'text-slate-900 dark:text-white font-bold text-sm sm:text-base' : 'text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm'}>
                        {valueTo ? `${fmt(valueTo)} د.ل` : 'الحد الأقصى'}
                    </span>
                </button>
            </div>

            <NumberPadModal
                isOpen={activePad === 'from'}
                title="الحد الأدنى للمبلغ (من)"
                initialValue={valueFrom}
                onClose={() => setActivePad(null)}
                onConfirm={v => { onChange(v, valueTo); setActivePad(null); }}
            />
            <NumberPadModal
                isOpen={activePad === 'to'}
                title="الحد الأقصى للمبلغ (إلى)"
                initialValue={valueTo}
                onClose={() => setActivePad(null)}
                onConfirm={v => { onChange(valueFrom, v); setActivePad(null); }}
            />
        </div>
    );
}
