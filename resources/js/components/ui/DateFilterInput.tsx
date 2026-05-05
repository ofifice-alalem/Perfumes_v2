import { useState } from 'react';
import { NumberPadModal } from './NumberPadModal';

interface Props {
    label: string;
    value: string; // YYYY-MM-DD أو ''
    onChange: (v: string) => void;
}

function pad(n: string) {
    return n.length === 1 ? '0' + n : n;
}

function clamp(val: string, max: number): string {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) return '';
    return String(Math.min(n, max));
}

export function DateFilterInput({ label, value, onChange }: Props) {
    const parts  = value ? value.split('-') : ['', '', ''];
    const year   = parts[0] ?? '';
    const month  = parts[1] ? String(parseInt(parts[1], 10)) : '';
    const day    = parts[2] ? String(parseInt(parts[2], 10)) : '';

    const [pad_open, setPadOpen]   = useState<'day' | 'month' | 'year' | null>(null);

    function update(d: string, m: string, y: string) {
        if (!d && !m && !y) { onChange(''); return; }
        const dd = d ? pad(d) : '01';
        const mm = m ? pad(m) : '01';
        const yy = y || new Date().getFullYear().toString();
        onChange(`${yy}-${mm}-${dd}`);
    }

    function handleDay(v: string) {
        const c = clamp(v, 31);
        update(c, month, year);
    }
    function handleMonth(v: string) {
        const c = clamp(v, 12);
        update(day, c, year);
    }
    function handleYear(v: string) {
        update(day, month, v);
    }

    const fieldCls = `spatial-input h-11 rounded-[14px] text-[14px] font-black text-center cursor-pointer hover:border-primary/40 transition-all flex items-center justify-center select-none`;
    const placeholder = 'text-slate-400 dark:text-white/30 font-bold text-[13px]';

    return (
        <>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">
                    {label}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                    {/* اليوم */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 text-center uppercase tracking-widest">يوم</span>
                        <button onClick={() => setPadOpen('day')} className={fieldCls}>
                            {day
                                ? <span className="text-slate-800 dark:text-white">{pad(day)}</span>
                                : <span className={placeholder}>--</span>
                            }
                        </button>
                    </div>
                    {/* الشهر */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 text-center uppercase tracking-widest">شهر</span>
                        <button onClick={() => setPadOpen('month')} className={fieldCls}>
                            {month
                                ? <span className="text-slate-800 dark:text-white">{pad(month)}</span>
                                : <span className={placeholder}>--</span>
                            }
                        </button>
                    </div>
                    {/* السنة */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 text-center uppercase tracking-widest">سنة</span>
                        <button onClick={() => setPadOpen('year')} className={fieldCls}>
                            {year
                                ? <span className="text-slate-800 dark:text-white">{year}</span>
                                : <span className={placeholder}>----</span>
                            }
                        </button>
                    </div>
                </div>
            </div>

            <NumberPadModal
                isOpen={pad_open === 'day'}
                title="اليوم"
                initialValue={day}
                maxValue={31}
                onClose={() => setPadOpen(null)}
                onConfirm={v => { handleDay(v); setPadOpen(null); }}
            />
            <NumberPadModal
                isOpen={pad_open === 'month'}
                title="الشهر"
                initialValue={month}
                maxValue={12}
                onClose={() => setPadOpen(null)}
                onConfirm={v => { handleMonth(v); setPadOpen(null); }}
            />
            <NumberPadModal
                isOpen={pad_open === 'year'}
                title="السنة"
                initialValue={year}
                onClose={() => setPadOpen(null)}
                onConfirm={v => { handleYear(v); setPadOpen(null); }}
            />
        </>
    );
}
