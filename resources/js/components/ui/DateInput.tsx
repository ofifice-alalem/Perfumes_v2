import { useRef, useState } from 'react';

interface DateInputProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

export function DateInput({ label, value, onChange }: DateInputProps) {
  const [day, setDay]     = useState(value ? value.split('-')[2] : '');
  const [month, setMonth] = useState(value ? value.split('-')[1] : '');
  const [year, setYear]   = useState(value ? value.split('-')[0] : '');

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef  = useRef<HTMLInputElement>(null);

  function emit(d: string, m: string, y: string) {
    if (d && m && y && y.length === 4) {
      onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    } else {
      onChange('');
    }
  }

  function handleDay(v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setDay(clean);
    emit(clean, month, year);
    if (clean.length === 2 || (clean.length === 1 && Number(clean) > 3))
      monthRef.current?.focus();
  }

  function handleMonth(v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setMonth(clean);
    emit(day, clean, year);
    if (clean.length === 2 || (clean.length === 1 && Number(clean) > 1))
      yearRef.current?.focus();
  }

  function handleYear(v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    setYear(clean);
    emit(day, month, clean);
  }

  function clear() {
    setDay(''); setMonth(''); setYear('');
    onChange('');
  }

  const fieldClass = `
    bg-transparent outline-none text-center font-black text-[15px]
    text-slate-800 dark:text-white
    placeholder:text-slate-400 dark:placeholder:text-white/30
    w-full
  `;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 text-center uppercase tracking-widest">يوم</span>
          <div className="spatial-input h-12 rounded-[16px] flex items-center justify-center">
            <input type="text" inputMode="numeric" placeholder="--"
              value={day} onChange={(e) => handleDay(e.target.value)}
              className={fieldClass} />
          </div>
        </div>
        <span className="text-slate-300 dark:text-white/20 font-black text-lg">/</span>
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 text-center uppercase tracking-widest">شهر</span>
          <div className="spatial-input h-12 rounded-[16px] flex items-center justify-center">
            <input ref={monthRef} type="text" inputMode="numeric" placeholder="--"
              value={month} onChange={(e) => handleMonth(e.target.value)}
              className={fieldClass} />
          </div>
        </div>
        <span className="text-slate-300 dark:text-white/20 font-black text-lg">/</span>
        <div className="flex flex-col gap-1" style={{ flex: '1.6' }}>
          <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 text-center uppercase tracking-widest">سنة</span>
          <div className="spatial-input h-12 rounded-[16px] flex items-center justify-center">
            <input ref={yearRef} type="text" inputMode="numeric" placeholder="----"
              value={year} onChange={(e) => handleYear(e.target.value)}
              className={fieldClass} />
          </div>
        </div>
        {(day || month || year) && (
          <button onClick={clear}
            className="text-slate-400 dark:text-white/30 hover:text-red-500 transition-colors text-lg font-black leading-none mt-5">
            ×
          </button>
        )}
      </div>
    </div>
  );
}
