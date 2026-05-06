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
            <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">
                {label}
            </label>
            <div className="flex gap-2">
                {/* حقل من */}
                <button
                    type="button"
                    onClick={() => setActivePad('from')}
                    className={`spatial-input flex-1 min-w-0 h-11 rounded-[14px] px-3 text-[14px] font-bold text-center cursor-pointer hover:border-primary/40 transition-all ${
                        valueFrom ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-white/30'
                    }`}
                >
                    {valueFrom ? fmt(valueFrom) : 'من'}
                </button>

                <span className="flex items-center text-slate-400 dark:text-white/30 font-bold text-sm shrink-0">—</span>

                {/* حقل إلى */}
                <button
                    type="button"
                    onClick={() => setActivePad('to')}
                    className={`spatial-input flex-1 min-w-0 h-11 rounded-[14px] px-3 text-[14px] font-bold text-center cursor-pointer hover:border-primary/40 transition-all ${
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
