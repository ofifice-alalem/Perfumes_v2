import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DraggableOnScreenKeyboard } from './DraggableOnScreenKeyboard';
import { matchesSearchText } from '@/lib/textUtils';

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

// Virtual Keyboard and Text Utilities Re-exports
export { DraggableOnScreenKeyboard } from './DraggableOnScreenKeyboard';
export type { DraggableOnScreenKeyboardProps } from './DraggableOnScreenKeyboard';

export {
  normalizeSearchText,
  stripAl,
  levenshteinDistance,
  matchesSearchText,
} from '@/lib/textUtils';

export function ModernSelect({
  label,
  options,
  className = '',
  placeholder = 'اختر...',
  onSelect,
  defaultValue = '',
  value,
  allowFreeText = false,
  enableVirtualKeyboard = true,
}: {
  label: string;
  options: string[] | { label: string; meta?: string; badge?: string; price?: string; searchKey?: string }[];
  className?: string;
  placeholder?: string;
  onSelect?: (value: string) => void;
  defaultValue?: string;
  value?: string;
  allowFreeText?: boolean;
  enableVirtualKeyboard?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(value !== undefined ? value : defaultValue);
  const [search, setSearch] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelected(value);
    }
  }, [value]);

  const normalized = (options as (string | { label: string; meta?: string; badge?: string; price?: string; searchKey?: string })[]).map((o) =>
    typeof o === 'string' ? { label: o, meta: undefined, badge: undefined, price: undefined, searchKey: undefined } : o
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
        setIsOpen(false); setSearch(''); setShowKeyboard(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobile]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50);
    else { setSearch(''); setShowKeyboard(false); }
  }, [isOpen]);

  const filtered = normalized.filter((o) => {
    return matchesSearchText(search, o.label, o.searchKey);
  });

  const optionsList = (size: 'sm' | 'lg') => (
    <ul className={`overflow-y-auto p-2.5 notranslate ${size === 'sm' ? 'max-h-[520px] sm:max-h-[600px]' : 'flex-1'}`} translate="no">
      {allowFreeText && search && (
        <div key="freetext_entry">
          <li
            onClick={() => { setSelected(search); onSelect?.(search); setIsOpen(false); setSearch(''); setShowKeyboard(false); }}
            className={`flex items-center gap-3 px-4 rounded-[16px] cursor-pointer font-black transition-all duration-150 ${size === 'lg' ? 'py-4.5 text-[17px]' : 'py-4 text-[16px]'} text-primary dark:text-primary-light hover:bg-primary/10 dark:hover:bg-primary/20`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            البحث عن "{search}"
          </li>
          {filtered.length > 0 && <div className="h-px bg-slate-200 dark:bg-white/10 my-2 mx-3" />}
        </div>
      )}
      {filtered.length === 0 ? (
        (!allowFreeText || !search) ? <li className="px-4 py-6 text-center text-base font-bold text-slate-400 dark:text-white/40">لا توجد نتائج</li> : null
      ) : (
        filtered.map((opt, idx) => {
          const itemKey = `${opt.label}__${opt.searchKey ?? ''}__${idx}`;
          return (
            <div key={itemKey}>
              <li
                onClick={() => { setSelected(opt.label); onSelect?.(opt.label); setIsOpen(false); setSearch(''); setShowKeyboard(false); }}
                style={{ padding: '20px 24px' }}
                className={`flex items-center justify-between gap-4 rounded-[20px] cursor-pointer font-black transition-all duration-150 text-xl sm:text-2xl min-h-[76px] ${selected === opt.label ? 'bg-primary text-white shadow-lg' : 'text-slate-800 dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className={`shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${size === 'lg' ? 'w-7 h-7' : 'w-6 h-6'} ${selected === opt.label ? 'border-white bg-white/30' : 'border-slate-300 dark:border-white/30'}`}>
                    {selected === opt.label && (
                      <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {opt.badge && (
                    <span className={`text-sm sm:text-base font-bold shrink-0 px-3 py-1 rounded-xl ${selected === opt.label ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary dark:text-primary-light border border-primary/20'}`}>
                      {opt.badge}
                    </span>
                  )}
                  <span className="leading-snug truncate font-black text-xl sm:text-2xl">{opt.label}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {opt.price && (
                    <span className={`text-xl sm:text-3xl font-black px-4 py-2 rounded-2xl ${selected === opt.label ? 'bg-white/30 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'}`}>
                      {opt.price}
                    </span>
                  )}
                  {opt.meta && (
                    <span className={`text-lg sm:text-2xl font-black shrink-0 px-4 py-2 rounded-2xl ${selected === opt.label ? 'bg-white/25 text-white' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm'}`}>{opt.meta}</span>
                  )}
                </div>
              </li>
              {idx < filtered.length - 1 && <div className="h-[1.5px] bg-slate-200 dark:bg-white/15 my-2 mx-1" />}
            </div>
          );
        })
      )}
    </ul>
  );

  const searchInputHeader = (
    <div className="flex flex-col notranslate" translate="no">
      <div className="flex items-center gap-3 p-3.5">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث سريع..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            translate="no"
            className="notranslate w-full rounded-[18px] pr-12 pl-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all h-16 sm:h-20 text-base sm:text-lg"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (allowFreeText && search) {
                  setSelected(search);
                  onSelect?.(search);
                  setIsOpen(false);
                  setSearch('');
                  setShowKeyboard(false);
                } else if (filtered.length > 0) {
                  const s = search.toLowerCase().trim();
                  const sNorm = normalizeSearchText(search);
                  const exactMatch = filtered.find((o) => {
                    const sk = o.searchKey ? o.searchKey.toLowerCase().trim() : '';
                    const l = o.label.toLowerCase().trim();
                    const lNorm = normalizeSearchText(o.label);
                    return (sk && sk === s) || l === s || lNorm === sNorm;
                  });
                  const topMatch = exactMatch || (filtered.length === 1 ? filtered[0] : null);

                  if (topMatch) {
                    setSelected(topMatch.label);
                    onSelect?.(topMatch.label);
                    setIsOpen(false);
                    setSearch('');
                    setShowKeyboard(false);
                  }
                }
              }
            }}
          />
        </div>
        {enableVirtualKeyboard && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowKeyboard(!showKeyboard);
            }}
            className={`h-16 sm:h-20 px-5 sm:px-7 rounded-[18px] border-2 flex items-center gap-2.5 font-black text-base sm:text-lg transition-all shrink-0 cursor-pointer shadow-lg active:scale-95 ${
              showKeyboard
                ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
            }`}
            title="لوحة مفاتيح الشاشة"
          >
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
            </svg>
            <span className="inline">لوحة المفاتيح</span>
          </button>
        )}
      </div>

      {/* Virtual Touch Keyboard Component */}
      {showKeyboard && (
        <DraggableOnScreenKeyboard
          value={search}
          onKeyPress={(char) => setSearch((prev) => prev + char)}
          onBackspace={() => setSearch((prev) => prev.slice(0, -1))}
          onClear={() => setSearch('')}
          onSpace={() => setSearch((prev) => prev + ' ')}
          onClose={() => setShowKeyboard(false)}
        />
      )}
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
              const drawerEl = triggerRef.current.closest('[data-drawer], .max-w-lg, .shadow-2xl, [role="dialog"]');
              let width: number;
              let left: number;

              if (drawerEl) {
                const drawerRect = drawerEl.getBoundingClientRect();
                width = drawerRect.width - 40;
                left = drawerRect.left + 20;
              } else {
                width = Math.max(rect.width, 380);
                left = rect.left;
                if (left + width > window.innerWidth - 10) {
                  left = Math.max(10, window.innerWidth - width - 10);
                }
              }

              let top = rect.bottom + 8;
              if (top + 420 > window.innerHeight && rect.top > 300) {
                top = Math.max(10, rect.top - 430);
              }

              setDropdownPos({ top, left, width });
            }
            setIsOpen(!isOpen);
          }}
          className={`spatial-input h-16 sm:h-20 rounded-[22px] px-5 sm:px-6 text-base sm:text-lg font-black w-full flex items-center justify-between cursor-pointer select-none border-2 transition-all ${isOpen ? 'ring-2 ring-primary/40 border-primary/50 dark:border-primary/40 bg-white dark:bg-black/40 shadow-lg' : 'hover:border-primary/30'}`}
        >
          <span className={selected ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-white/50'}>{selected || placeholder}</span>
          <div className="text-slate-400 dark:text-white/50 transition-transform duration-300 shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>

        {isOpen && !isMobile && dropdownPos && createPortal(
          <div data-dropdown-portal style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 1000000 }}
            className="spatial-card rounded-[24px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="border-b border-black/5 dark:border-white/5">{searchInputHeader}</div>
            {optionsList('sm')}
          </div>,
          document.body
        )}

        {isOpen && isMobile && createPortal(
          <div className="fixed inset-0 z-[1000000] flex flex-col bg-white dark:bg-[#0f1428] animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
              <span className="text-base font-black text-slate-800 dark:text-white">{label || placeholder}</span>
              <button onClick={() => { setIsOpen(false); setSearch(''); setShowKeyboard(false); }} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="border-b border-black/5 dark:border-white/5 shrink-0">{searchInputHeader}</div>
            <div className="overflow-y-auto flex-1">{optionsList('lg')}</div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

export function ModernMultiSelect({
  label,
  options,
  className = '',
  placeholder = 'اختر...',
  onSelect,
  defaultValues = [],
  values,
  allowFreeText = false,
  enableVirtualKeyboard = true,
}: {
  label: string;
  options: { value: string; label: string; meta?: string; badge?: string; searchKey?: string }[];
  className?: string;
  placeholder?: string;
  onSelect?: (values: string[]) => void;
  defaultValues?: string[];
  values?: string[];
  allowFreeText?: boolean;
  enableVirtualKeyboard?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(values !== undefined ? values : defaultValues);
  const [search, setSearch] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (values !== undefined) {
      setSelected(values);
    }
  }, [values]);

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
        setIsOpen(false); setSearch(''); setShowKeyboard(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobile]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50);
    else { setSearch(''); setShowKeyboard(false); }
  }, [isOpen]);

  const filtered = options.filter((o) => {
    return matchesSearchText(search, o.label, o.searchKey);
  });

  const toggleOption = (val: string) => {
    const next = selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val];
    setSelected(next);
    onSelect?.(next);
  };

  const showFreeTextOption = allowFreeText && search.trim() && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase());

  const optionsList = (size: 'sm' | 'lg') => (
    <ul className={`overflow-y-auto p-2.5 notranslate ${size === 'sm' ? 'max-h-[380px] sm:max-h-[460px]' : 'flex-1'}`} translate="no">
      {filtered.length === 0 && !showFreeTextOption ? (
        <li className="px-4 py-6 text-center text-base font-bold text-slate-400 dark:text-white/40">لا توجد نتائج</li>
      ) : (
        <>
          {showFreeTextOption && (
            <div key="free-text-entry">
              <li
                onClick={() => { toggleOption(search.trim()); setSearch(''); searchRef.current?.focus(); }}
                className={`flex items-center justify-between gap-3 px-4 rounded-[16px] cursor-pointer font-black transition-all duration-150 ${size === 'lg' ? 'py-4 text-[17px]' : 'py-3.5 text-[16px]'} text-primary hover:bg-black/5 dark:hover:bg-white/8`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-[8px] border-2 border-slate-300 dark:border-white/20 flex items-center justify-center transition-all"></div>
                  إضافة "{search.trim()}"
                </div>
              </li>
              {filtered.length > 0 && <div className="h-px bg-black/5 dark:bg-white/5 my-1.5 mx-2" />}
            </div>
          )}
          {filtered.map((opt, idx) => {
          const isSelected = selected.includes(opt.value);
          const itemKey = `${opt.value}__${opt.searchKey ?? ''}__${idx}`;
          return (
            <div key={itemKey}>
              <li
                onClick={() => toggleOption(opt.value)}
                className={`flex items-center justify-between gap-3 px-4 rounded-[16px] cursor-pointer font-black transition-all duration-150 min-h-[56px] ${size === 'lg' ? 'py-4 text-lg' : 'py-3.5 text-base'} ${isSelected ? 'bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary-light border-2 border-primary/30' : 'text-slate-800 dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/8'}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {opt.badge && <span className="text-sm font-bold shrink-0 px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{opt.badge}</span>}
                  <span className="truncate font-black">{opt.label}</span>
                </div>
                {opt.meta && (
                  <span className={`text-base font-black shrink-0 px-3 py-1.5 rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/60'}`}>{opt.meta}</span>
                )}
              </li>
              {idx < filtered.length - 1 && <div className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2" />}
            </div>
          );
        })}
        </>
      )}
    </ul>
  );

  const searchInput = (
    <div className="flex flex-col notranslate" translate="no">
      <div className="flex items-center gap-3 p-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث سريع..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            translate="no"
            className="notranslate w-full rounded-[16px] pr-12 pl-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all h-14 sm:h-16 text-base sm:text-lg"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (showFreeTextOption && search.trim()) {
                  toggleOption(search.trim());
                  setSearch('');
                }
              }
            }}
          />
        </div>
        {enableVirtualKeyboard && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowKeyboard(!showKeyboard);
            }}
            className={`h-14 sm:h-16 px-4 sm:px-6 rounded-[16px] border-2 flex items-center gap-2 font-black text-sm sm:text-base transition-all shrink-0 cursor-pointer shadow-md active:scale-95 ${
              showKeyboard
                ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
            }`}
            title="لوحة مفاتيح الشاشة"
          >
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
            </svg>
            <span className="hidden sm:inline">الكيبورد</span>
          </button>
        )}
      </div>

      {showKeyboard && (
        <DraggableOnScreenKeyboard
          value={search}
          onKeyPress={(char) => setSearch((prev) => prev + char)}
          onBackspace={() => setSearch((prev) => prev.slice(0, -1))}
          onClear={() => setSearch('')}
          onSpace={() => setSearch((prev) => prev + ' ')}
          onClose={() => setShowKeyboard(false)}
        />
      )}
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
              const drawerEl = triggerRef.current.closest('[data-drawer], .max-w-lg, .shadow-2xl, [role="dialog"]');
              let width: number;
              let left: number;

              if (drawerEl) {
                const drawerRect = drawerEl.getBoundingClientRect();
                width = drawerRect.width - 40;
                left = drawerRect.left + 20;
              } else {
                width = Math.max(rect.width, 380);
                left = rect.left;
                if (left + width > window.innerWidth - 10) {
                  left = Math.max(10, window.innerWidth - width - 10);
                }
              }

              let top = rect.bottom + 8;
              if (top + 420 > window.innerHeight && rect.top > 300) {
                top = Math.max(10, rect.top - 430);
              }

              setDropdownPos({ top, left, width });
            }
            setIsOpen(!isOpen);
          }}
          className={`spatial-input min-h-[64px] sm:min-h-[80px] rounded-[22px] px-5 sm:px-6 py-3 text-base sm:text-lg font-black w-full flex items-center justify-between cursor-pointer select-none border-2 transition-all ${isOpen ? 'ring-2 ring-primary/40 border-primary/50 dark:border-primary/40 bg-white dark:bg-black/40 shadow-lg' : 'hover:border-primary/30'}`}
        >
          <div className="flex flex-wrap gap-2 flex-1 items-center">
            {selected.length === 0 ? (
              <span className="text-base sm:text-lg font-black text-slate-500 dark:text-white/50">{placeholder}</span>
            ) : (
              selected.map(val => {
                const opt = options.find(o => o.value === val);
                return (
                  <span key={val} className="flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary-light text-sm sm:text-base font-black border border-primary/30">
                    {opt?.label || val}
                    <button onClick={(e) => { e.stopPropagation(); toggleOption(val); }} className="hover:bg-primary/20 rounded-full p-1 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                )
              })
            )}
          </div>
          <div className="text-slate-400 dark:text-white/50 transition-transform duration-300 ml-1 shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>

        {isOpen && !isMobile && dropdownPos && createPortal(
          <div data-dropdown-portal style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 1000000 }}
            className="spatial-card rounded-[24px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="p-3 border-b border-black/5 dark:border-white/5">{searchInput}</div>
            {optionsList('sm')}
          </div>,
          document.body
        )}

        {isOpen && isMobile && createPortal(
          <div className="fixed inset-0 z-[1000000] flex flex-col bg-white dark:bg-[#0f1428] animate-in fade-in duration-200">
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


// Pagination Re-exports
export { Pagination } from './Pagination';
export type { PaginationProps, PaginationLink } from './Pagination';
