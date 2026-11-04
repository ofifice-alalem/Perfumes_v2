import { useState } from 'react';
import { NumberPadModal } from './NumberPadModal';
import { X, Calendar } from 'lucide-react';

interface Props {
    label: string;
    value: string; // YYYY-MM-DD أو ''
    onChange: (v: string) => void;
}

function pad(n: string) {
    if (!n) return '';
    return n.length === 1 ? '0' + n : n;
}

function clamp(val: string, max: number): string {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) return '';
    return String(Math.min(n, max));
}

export function DateFilterInput({ label, value, onChange }: Props) {
    const parts = value ? value.split('-') : ['', '', ''];
    const year  = parts[0] ?? '';
    const month = parts[1] ? String(parseInt(parts[1], 10)) : '';
    const day   = parts[2] ? String(parseInt(parts[2], 10)) : '';

    const [padOpen, setPadOpen] = useState<'day' | 'month' | 'year' | null>(null);

    function update(d: string, m: string, y: string) {
        if (!d && !m && !y) { onChange(''); return; }
        const now = new Date();
        const currentYear = String(now.getFullYear());
        const currentMonth = pad(String(now.getMonth() + 1));
        const dd = d ? pad(d) : '01';
        const mm = m ? pad(m) : currentMonth;
        const yy = y || currentYear;
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

    const fieldCls = `h-11 sm:h-12 px-2.5 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#101a29] hover:border-brand/60 dark:hover:border-brand/60 transition-colors font-number font-bold text-sm sm:text-base text-center cursor-pointer flex items-center justify-center select-none shadow-2xs active:scale-[0.98] w-full text-slate-800 dark:text-slate-100`;
    const placeholderCls = 'text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm tracking-wider';

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand" />
                    <span>{label}</span>
                </span>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 px-2 py-0.5 rounded-[2px] border border-rose-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                        title="مسح التاريخ"
                    >
                        <X className="w-3.5 h-3.5" />
                        <span>مسح</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
                {/* حقل اليوم */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">يوم</span>
                    <button type="button" onClick={() => setPadOpen('day')} className={fieldCls}>
                        {day ? <span>{pad(day)}</span> : <span className={placeholderCls}>--</span>}
                    </button>
                </div>

                {/* حقل الشهر */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">شهر</span>
                    <button type="button" onClick={() => setPadOpen('month')} className={fieldCls}>
                        {month ? <span>{pad(month)}</span> : <span className={placeholderCls}>--</span>}
                    </button>
                </div>

                {/* حقل السنة */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">سنة</span>
                    <button type="button" onClick={() => setPadOpen('year')} className={fieldCls}>
                        {year ? <span>{year}</span> : <span className={placeholderCls}>----</span>}
                    </button>
                </div>
            </div>

            <NumberPadModal
                isOpen={padOpen === 'day'}
                title="إدخال اليوم (1 - 31)"
                initialValue={day}
                maxValue={31}
                onClose={() => setPadOpen(null)}
                onConfirm={v => { handleDay(v); setPadOpen(null); }}
            />
            <NumberPadModal
                isOpen={padOpen === 'month'}
                title="إدخال الشهر (1 - 12)"
                initialValue={month}
                maxValue={12}
                onClose={() => setPadOpen(null)}
                onConfirm={v => { handleMonth(v); setPadOpen(null); }}
            />
            <NumberPadModal
                isOpen={padOpen === 'year'}
                title="إدخال السنة"
                initialValue={year}
                maxValue={2099}
                onClose={() => setPadOpen(null)}
                onConfirm={v => { handleYear(v); setPadOpen(null); }}
            />
        </div>
    );
}
