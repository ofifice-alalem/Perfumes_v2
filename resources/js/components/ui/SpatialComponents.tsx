import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function SpatialCard({
  title,
  icon,
  children,
  action,
  headerDot = true,
  hideHeader = false,
  transparent = false,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  headerDot?: boolean;
  hideHeader?: boolean;
  transparent?: boolean;
  className?: string;
}) {
  return (
    <div className={`spatial-card ${transparent ? 'transparent' : ''} ${className}`}>
      <div className="p-4 lg:p-6 flex flex-col h-full">
        {!hideHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {headerDot && <span className="w-2 h-2 rounded-full bg-primary" />}
              {icon && <div className="text-slate-500 dark:text-white/70">{icon}</div>}
              <h2 className="text-[17px] font-bold text-slate-800 dark:text-white tracking-wide transition-colors">
                {title}
              </h2>
            </div>
            {action && <div>{action}</div>}
          </div>
        )}
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

export function ModernInput({
  label,
  type = 'text',
  placeholder,
  className = '',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        {...(value !== undefined ? { value } : {})}
        onChange={(e) => onChange?.(e.target.value)}
        className="spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold w-full"
      />
    </div>
  );
}

export function ModernSelect({
  label,
  options,
  className = '',
  placeholder = 'اختر...',
  onSelect,
  defaultValue = '',
}: {
  label: string;
  options: string[] | { label: string; meta?: string; badge?: string }[];
  className?: string;
  placeholder?: string;
  onSelect?: (value: string) => void;
  defaultValue?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalized = (options as (string | { label: string; meta?: string; badge?: string })[]).map((o) =>
    typeof o === 'string' ? { label: o, meta: undefined, badge: undefined } : o
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isMobile) return;
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest('[data-dropdown-portal]')) {
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

  const filtered = normalized.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  const optionsList = (size: 'sm' | 'lg') => (
    <ul className={`overflow-y-auto p-2 ${size === 'sm' ? 'max-h-52' : 'flex-1'}`}>
      {filtered.length === 0 ? (
        <li className="px-4 py-4 text-center text-sm font-bold text-slate-400 dark:text-white/30">لا توجد نتائج</li>
      ) : (
        filtered.map((opt, idx) => (
          <div key={opt.label}>
            <li
              onClick={() => { setSelected(opt.label); onSelect?.(opt.label); setIsOpen(false); setSearch(''); }}
              className={`flex items-center justify-between gap-3 px-4 rounded-[14px] cursor-pointer font-bold transition-all duration-150 ${size === 'lg' ? 'py-4 text-[16px]' : 'py-3 text-[15px]'} ${selected === opt.label ? 'bg-primary text-white' : 'text-slate-700 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} ${selected === opt.label ? 'border-white bg-white/30' : 'border-slate-300 dark:border-white/20'}`}>
                  {selected === opt.label && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {opt.badge && <span className="text-[13px]">{opt.badge}</span>}
                {opt.label}
              </div>
              {opt.meta && (
                <span className={`text-[14px] font-black shrink-0 px-3 py-1.5 rounded-xl ${selected === opt.label ? 'bg-white/25 text-white' : 'bg-primary text-white'}`}>{opt.meta}</span>
              )}
            </li>
            {idx < filtered.length - 1 && <div className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2" />}
          </div>
        ))
      )}
    </ul>
  );

  const searchInput = (
    <div className="relative">
      <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع..."
        className="w-full rounded-[14px] pr-11 pl-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all h-11 text-[14px]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`} ref={ref}>
      {label && <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">{label}</label>}
      <div className="relative">
        <div ref={triggerRef}
          onClick={() => {
            if (!isOpen && !isMobile && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
            }
            setIsOpen(!isOpen);
          }}
          className={`spatial-input h-14 rounded-[20px] px-5 text-[15px] font-bold w-full flex items-center justify-between cursor-pointer select-none ${isOpen ? 'ring-2 ring-primary/40 border-primary/50 dark:border-primary/40 bg-white dark:bg-black/40' : ''}`}
        >
          <span className={selected ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-white/60'}>{selected || placeholder}</span>
          <div className="text-slate-400 dark:text-white/50 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>

        {isOpen && !isMobile && dropdownPos && createPortal(
          <div data-dropdown-portal style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
            className="spatial-card rounded-[24px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="p-3 border-b border-black/5 dark:border-white/5">{searchInput}</div>
            {optionsList('sm')}
          </div>,
          document.body
        )}

        {isOpen && isMobile && createPortal(
          <div className="fixed inset-0 z-[500] flex flex-col bg-white dark:bg-[#0f1428] animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
              <span className="text-base font-black text-slate-800 dark:text-white">{label}</span>
              <button onClick={() => { setIsOpen(false); setSearch(''); }} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 border-b border-black/5 dark:border-white/5 shrink-0">{searchInput}</div>
            <div className="overflow-y-auto flex-1">{optionsList('lg')}</div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
