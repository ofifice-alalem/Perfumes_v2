import { useState } from 'react';
import { NumberPadModal } from '@/components/ui/NumberPadModal';

interface Props {
    label?:    string;
    valueFrom: string;
    valueTo:   string;
    onChange:  (from: string, to: string) => void;
}

export function AmountRangeInput({ label = 'المبلغ (من — إلى)', valueFrom, valueTo, onChange }: Props) {
    // null = مغلق، 'from' | 'to' = أي حقل مفتوح
    const [activePad, setActivePad] = useState<'from' | 'to' | null>(null);

    function fmt(v: string) {
        const n = parseFloat(v);
        return isNaN(n) ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-white/75 uppercase tracking-widest">
                {label}
            </label>
            <div className="flex items-center gap-2">
                {/* حقل من */}
                <button
                    type="button"
                    onClick={() => setActivePad('from')}
                    className={`spatial-input flex-1 min-w-0 h-14 sm:h-16 rounded-[18px] px-4 text-base sm:text-xl font-black text-center cursor-pointer hover:border-primary/40 transition-all shadow-sm active:scale-95 ${
                        valueFrom ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-white/30'
                    }`}
                >
                    {valueFrom ? fmt(valueFrom) : 'من'}
                </button>

                <span className="flex items-center text-slate-400 dark:text-white/40 font-black text-base sm:text-lg shrink-0">—</span>

                {/* حقل إلى */}
                <button
                    type="button"
                    onClick={() => setActivePad('to')}
                    className={`spatial-input flex-1 min-w-0 h-14 sm:h-16 rounded-[18px] px-4 text-base sm:text-xl font-black text-center cursor-pointer hover:border-primary/40 transition-all shadow-sm active:scale-95 ${
                        valueTo ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-white/30'
                    }`}
                >
                    {valueTo ? fmt(valueTo) : 'إلى'}
                </button>
            </div>

            <NumberPadModal
                isOpen={activePad === 'from'}
                title="من مبلغ"
                initialValue={valueFrom}
                onClose={() => setActivePad(null)}
                onConfirm={v => { onChange(v, valueTo); setActivePad(null); }}
            />
            <NumberPadModal
                isOpen={activePad === 'to'}
                title="إلى مبلغ"
                initialValue={valueTo}
                onClose={() => setActivePad(null)}
                onConfirm={v => { onChange(valueFrom, v); setActivePad(null); }}
            />
        </div>
    );
}
