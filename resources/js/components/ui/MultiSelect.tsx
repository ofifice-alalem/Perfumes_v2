import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Option { label: string; value: string; }

interface Props {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ label, options, selected, onChange, placeholder = 'الكل' }: Props) {
  const [isOpen, setIsOpen]   = useState(false);
  const [search, setSearch]   = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref        = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isMobile) return;
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest('[data-ms-portal]')) {
        setIsOpen(false); setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobile]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch('');
  }, [isOpen]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  }

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const triggerLabel = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} منتجات`;

  const searchInput = (
    <div className="relative">
      <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40 pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="بحث سريع..."
        className="w-full rounded-[14px] pr-11 pl-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all h-11 text-[14px]"
        onClick={e => e.stopPropagation()} />
    </div>
  );

  const list = (size: 'sm' | 'lg') => (
    <ul className={`overflow-y-auto p-2 ${size === 'sm' ? 'max-h-52' : 'flex-1'}`}>
      {filtered.length === 0 ? (
        <li className="px-4 py-4 text-center text-sm font-bold text-slate-400 dark:text-white/30">لا توجد نتائج</li>
      ) : filtered.map((opt, idx) => {
        const checked = selected.includes(opt.value);
        return (
          <div key={opt.value}>
            <li onMouseDown={e => e.preventDefault()}
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-3 px-4 rounded-[14px] cursor-pointer font-bold transition-all duration-150 ${size === 'lg' ? 'py-4 text-[16px]' : 'py-3 text-[15px]'} ${checked ? 'bg-primary/10 text-primary dark:text-primary' : 'text-slate-700 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/8'}`}>
              <span className={`shrink-0 w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                {checked && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt.label}
            </li>
            {idx < filtered.length - 1 && <div className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2" />}
          </div>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col gap-2" ref={ref}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">{label}</label>
        {selected.length > 0 && (
          <button onClick={() => onChange([])}
            className="text-[11px] font-bold text-primary hover:text-primary/70 transition-colors">
            مسح الكل
          </button>
        )}
      </div>
      <div className="relative">
        <div ref={triggerRef}
          onClick={() => {
            if (!isOpen && !isMobile && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
            }
            setIsOpen(!isOpen);
          }}
          className={`spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold w-full flex items-center justify-between cursor-pointer select-none ${isOpen ? 'ring-2 ring-primary/40 border-primary/50 dark:border-primary/40' : ''}`}>
          <span className={selected.length > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-white/60'}>
            {triggerLabel}
          </span>
          <div className="text-slate-400 dark:text-white/50 transition-transform duration-300"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {isOpen && !isMobile && dropdownPos && createPortal(
          <div data-ms-portal
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
            className="spatial-card rounded-[24px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-black/5 dark:border-white/5">{searchInput}</div>
            {list('sm')}
          </div>,
          document.body
        )}

        {isOpen && isMobile && createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-[#0f1428] animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
              <span className="text-base font-black text-slate-800 dark:text-white">{label}</span>
              <button onClick={() => { setIsOpen(false); setSearch(''); }}
                className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-black/5 dark:border-white/5 shrink-0">{searchInput}</div>
            <div className="overflow-y-auto flex-1">{list('lg')}</div>
          </div>,
          document.body
        )}
      </div>

      {/* Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selected.map(v => {
            const opt = options.find(o => o.value === v);
            if (!opt) return null;
            return (
              <span key={v} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-primary/10 border border-primary/20 text-primary font-bold text-[12px]">
                {opt.label}
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => onChange(selected.filter(s => s !== v))}
                  className="flex items-center justify-center hover:opacity-60 transition-opacity">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
