import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, router } from '@inertiajs/react';
import { NumberPadModal } from '@/components/ui/NumberPadModal';

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

export function DraggableOnScreenKeyboard({
  value,
  onKeyPress,
  onBackspace,
  onClear,
  onSpace,
  onClose,
}: {
  value?: string;
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSpace: () => void;
  onClose: () => void;
}) {
  const [layout, setLayout] = useState<'ar' | 'en'>('ar');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const currentX = pos ? pos.x : rect.left;
    const currentY = pos ? pos.y : rect.top;
    dragStartRef.current = { x: clientX - currentX, y: clientY - currentY };
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const newX = Math.max(10, Math.min(window.innerWidth - 300, clientX - dragStartRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 200, clientY - dragStartRef.current.y));
      setPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [pos]);

  const arRow1 = ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'];
  const arRow2 = ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'];
  const arRow3 = ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'];

  const enRow1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const enRow2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const enRow3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  const numRow1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const renderKey = (key: string) => (
    <button
      type="button"
      key={key}
      onClick={(e) => {
        e.stopPropagation();
        onKeyPress(key);
      }}
      className="shrink-0 w-[60px] sm:w-[90px] h-[60px] sm:h-[80px] rounded-[16px] sm:rounded-[20px] bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white border-2 border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-black text-xl sm:text-3xl shadow-md hover:shadow-xl active:scale-90 transition-all flex items-center justify-center select-none cursor-pointer"
    >
      {key}
    </button>
  );

  const style: React.CSSProperties = pos
    ? { position: 'fixed', left: `${pos.x}px`, top: `${pos.y}px`, zIndex: 99999 }
    : { position: 'fixed', bottom: '16px', left: '16px', zIndex: 99999 };

  return createPortal(
    <div
      ref={cardRef}
      style={style}
      data-dropdown-portal
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="w-max max-w-[96vw] bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-amber-500/50 rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-3.5 sm:p-6 flex flex-col gap-3 select-none animate-in slide-in-from-bottom-5 duration-200"
    >
      {/* Draggable Header */}
      <div
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-amber-500/15 rounded-[18px] border border-amber-500/30 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs sm:text-sm">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/><circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/>
            </svg>
            <span>اسحب لتحريك الكيبورد</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLayout(layout === 'ar' ? 'en' : 'ar'); }}
            className="px-3.5 sm:px-5 h-10 sm:h-12 rounded-[14px] bg-primary text-white font-black text-xs sm:text-sm hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-md"
          >
            {layout === 'ar' ? 'English (EN)' : 'عربي (AR)'}
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] bg-black/10 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-600 dark:text-white/70 font-black flex items-center justify-center text-base sm:text-lg transition-all cursor-pointer active:scale-95"
            title="إغلاق"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Live Written Text Preview Box */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-[20px] border-2 border-amber-500/40 shadow-inner">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 shrink-0 select-none">
            النص المكتوب:
          </span>
          <span className="font-black text-lg sm:text-2xl text-slate-900 dark:text-white truncate dir-auto inline-flex items-center">
            {value !== undefined && value !== '' ? (
              <span>{value}</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-sm sm:text-base font-bold italic">
                اكتب هنا...
              </span>
            )}
            <span className="inline-block w-[3px] h-6 sm:h-7 bg-amber-500 dark:bg-amber-400 rounded-full mx-1.5 animate-pulse shrink-0" />
          </span>
        </div>
        {value !== undefined && value !== '' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-[12px] bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shrink-0 cursor-pointer active:scale-95"
          >
            مسح الكل
          </button>
        )}
      </div>

      {/* Numbers & Backspace Bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex gap-1.5 overflow-x-auto">
          {numRow1.map((num) => (
            <button
              type="button"
              key={num}
              onClick={(e) => { e.stopPropagation(); onKeyPress(num); }}
              className="flex-1 min-w-[34px] sm:min-w-[48px] h-11 sm:h-14 rounded-[14px] bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white border-2 border-black/10 dark:border-white/10 text-slate-800 dark:text-white font-black text-base sm:text-xl shadow-sm active:scale-90 transition-all flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBackspace(); }}
          className="px-5 sm:px-7 h-12 sm:h-16 rounded-[16px] bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white font-black text-base sm:text-xl border-2 border-amber-500/30 transition-all shrink-0 flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-sm"
          title="تراجع"
        >
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
          </svg>
          <span className="hidden sm:inline">تراجع</span>
        </button>
      </div>

      {/* Main Keys Rows */}
      {layout === 'ar' ? (
        <div className="flex flex-col gap-2 overflow-x-auto max-w-full pb-1">
          <div className="flex gap-2 justify-center min-w-max">{arRow1.map(renderKey)}</div>
          <div className="flex gap-2 justify-center min-w-max">{arRow2.map(renderKey)}</div>
          <div className="flex gap-2 justify-center min-w-max">{arRow3.map(renderKey)}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-x-auto max-w-full pb-1">
          <div className="flex gap-2 justify-center min-w-max">{enRow1.map(renderKey)}</div>
          <div className="flex gap-2 justify-center min-w-max">{enRow2.map(renderKey)}</div>
          <div className="flex gap-2 justify-center min-w-max">{enRow3.map(renderKey)}</div>
        </div>
      )}

      {/* Control Actions Row */}
      <div className="flex items-center gap-2.5 mt-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="px-6 sm:px-8 h-14 sm:h-20 rounded-[18px] sm:rounded-[22px] bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white border-2 border-red-500/30 font-black text-base sm:text-xl transition-all shrink-0 active:scale-95 cursor-pointer shadow-md"
        >
          مسح (Clear)
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSpace(); }}
          className="flex-1 h-14 sm:h-20 rounded-[18px] sm:rounded-[22px] bg-white dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-900 dark:text-white font-black text-lg sm:text-2xl border-2 border-black/10 dark:border-white/10 transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>مسافة (Space)</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="px-8 sm:px-12 h-14 sm:h-20 rounded-[18px] sm:rounded-[22px] bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg sm:text-2xl transition-all shrink-0 active:scale-95 cursor-pointer shadow-lg"
        >
          تم
        </button>
      </div>
    </div>,
    document.body
  );
}

export function ModernSelect({
  label,
  options,
  className = '',
  placeholder = 'اختر...',
  onSelect,
  defaultValue = '',
  allowFreeText = false,
  enableVirtualKeyboard = true,
}: {
  label: string;
  options: string[] | { label: string; meta?: string; badge?: string; price?: string; searchKey?: string }[];
  className?: string;
  placeholder?: string;
  onSelect?: (value: string) => void;
  defaultValue?: string;
  allowFreeText?: boolean;
  enableVirtualKeyboard?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
  const [search, setSearch] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const filtered = normalized.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()) || (o.searchKey && o.searchKey.toLowerCase().includes(search.toLowerCase())));

  const optionsList = (size: 'sm' | 'lg') => (
    <ul className={`overflow-y-auto p-2.5 ${size === 'sm' ? 'max-h-[520px] sm:max-h-[600px]' : 'flex-1'}`}>
      {allowFreeText && search && (
        <div key="freetext">
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
        filtered.map((opt, idx) => (
          <div key={opt.label}>
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
        ))
      )}
    </ul>
  );

  const searchInputHeader = (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 p-3.5">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع..."
            className="w-full rounded-[18px] pr-12 pl-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all h-16 sm:h-20 text-base sm:text-lg"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && allowFreeText && search) {
                    setSelected(search);
                    onSelect?.(search);
                    setIsOpen(false);
                    setSearch('');
                    setShowKeyboard(false);
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
              const width = Math.max(rect.width, 380);
              let left = rect.left;
              if (left + width > window.innerWidth - 10) {
                left = Math.max(10, window.innerWidth - width - 10);
              }
              setDropdownPos({ top: rect.bottom + 8, left: left, width: width });
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
  allowFreeText = false,
  enableVirtualKeyboard = true,
}: {
  label: string;
  options: { value: string; label: string; meta?: string; badge?: string; searchKey?: string }[];
  className?: string;
  placeholder?: string;
  onSelect?: (values: string[]) => void;
  defaultValues?: string[];
  allowFreeText?: boolean;
  enableVirtualKeyboard?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [search, setSearch] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()) || (o.searchKey && o.searchKey.toLowerCase().includes(search.toLowerCase())));

  const toggleOption = (val: string) => {
    const next = selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val];
    setSelected(next);
    onSelect?.(next);
  };

  const showFreeTextOption = allowFreeText && search.trim() && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase());

  const optionsList = (size: 'sm' | 'lg') => (
    <ul className={`overflow-y-auto p-2.5 ${size === 'sm' ? 'max-h-[380px] sm:max-h-[460px]' : 'flex-1'}`}>
      {filtered.length === 0 && !showFreeTextOption ? (
        <li className="px-4 py-6 text-center text-base font-bold text-slate-400 dark:text-white/40">لا توجد نتائج</li>
      ) : (
        <>
          {showFreeTextOption && (
            <div key="free-text">
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
          return (
            <div key={opt.value}>
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
    <div className="flex flex-col">
      <div className="flex items-center gap-3 p-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع..."
            className="w-full rounded-[16px] pr-12 pl-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all h-14 sm:h-16 text-base sm:text-lg"
            onClick={(e) => e.stopPropagation()}
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
              const width = Math.max(rect.width, 320);
              let left = rect.left;
              if (left + width > window.innerWidth - 10) {
                left = Math.max(10, window.innerWidth - width - 10);
              }
              setDropdownPos({ top: rect.bottom + 8, left: left, width: width });
            }
            setIsOpen(!isOpen);
          }}
          className={`spatial-input min-h-[56px] rounded-[20px] px-4 py-2 flex items-center justify-between cursor-pointer ${isOpen ? 'ring-2 ring-primary/40 border-primary/50 dark:border-primary/40 bg-white dark:bg-black/40' : ''}`}
        >
          <div className="flex flex-wrap gap-2 flex-1">
            {selected.length === 0 ? (
              <span className="text-[15px] font-bold text-slate-400 dark:text-white/50 mt-1.5 ml-2">{placeholder}</span>
            ) : (
              selected.map(val => {
                const opt = options.find(o => o.value === val);
                return (
                  <span key={val} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-[13px] font-bold">
                    {opt?.label || val}
                    <button onClick={(e) => { e.stopPropagation(); toggleOption(val); }} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                )
              })
            )}
          </div>
          <div className="text-slate-400 dark:text-white/50 transition-transform duration-300 ml-1" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
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

export function Pagination({
    links,
    currentPage,
    lastPage,
    onPageChange,
}: {
    links: { url: string | null; label: string; active: boolean; page?: number }[];
    currentPage?: number;
    lastPage?: number;
    onPageChange?: (page: number) => void;
}) {
    const [showJumpPad, setShowJumpPad] = useState(false);

    if (!links || links.length <= 1) return null;

    function formatLabel(label: string) {
        let text = label.replace(/&laquo;/g, '').replace(/&raquo;/g, '').replace(/«/g, '').replace(/»/g, '').trim();
        if (text.toLowerCase().includes('previous') || text === 'Previous') return 'السابق';
        if (text.toLowerCase().includes('next') || text === 'Next') return 'التالي';
        return text;
    }

    const prevLink = links.find(l => formatLabel(l.label) === 'السابق');
    const nextLink = links.find(l => formatLabel(l.label) === 'التالي');
    const pageLinks = links.filter(l => {
        const lbl = formatLabel(l.label);
        return lbl !== 'السابق' && lbl !== 'التالي';
    });

    const activeLink = links.find(l => l.active);
    const curPage = currentPage ?? (activeLink ? (parseInt(activeLink.label) || 1) : 1);

    const numericLabels = links.map(l => parseInt(l.label.replace(/[^0-9]/g, ''))).filter(n => !isNaN(n));
    const maxPage = lastPage ?? (numericLabels.length > 0 ? Math.max(...numericLabels) : 1);

    // Extract numeric page buttons only (excluding "Previous", "Next", "...")
    const numericPageLinks = pageLinks.filter(l => {
        const lbl = formatLabel(l.label);
        return lbl !== '...' && !isNaN(parseInt(lbl));
    });

    // Window to exactly 10 pages max around curPage
    let startIdx = 0;
    if (numericPageLinks.length > 10) {
        const activeIdx = numericPageLinks.findIndex(l => l.active);
        if (activeIdx >= 0) {
            startIdx = Math.max(0, activeIdx - 4);
            if (startIdx + 10 > numericPageLinks.length) {
                startIdx = Math.max(0, numericPageLinks.length - 10);
            }
        }
    }
    const max10PageLinks = numericPageLinks.slice(startIdx, startIdx + 10);

    function handleJumpConfirm(val: string) {
        const target = parseInt(val);
        if (isNaN(target) || target < 1) return;
        const validPage = Math.min(target, maxPage);
        if (onPageChange) {
            onPageChange(validPage);
        } else {
            const params = new URLSearchParams(window.location.search);
            params.set('page', String(validPage));
            router.get(window.location.pathname + '?' + params.toString(), {}, { preserveScroll: true });
        }
    }

    const renderNavBtn = (link: { url: string | null; label: string; active: boolean; page?: number } | undefined, isPrevious: boolean) => {
        const text = isPrevious ? 'السابق →' : '← التالي';
        const targetPage = isPrevious ? curPage - 1 : curPage + 1;
        const isDisabled = isPrevious ? curPage <= 1 : curPage >= maxPage;

        if (isDisabled) {
            return (
                <span className="h-16 sm:h-20 px-5 sm:px-8 rounded-[22px] font-black text-lg sm:text-2xl flex items-center justify-center text-slate-300 dark:text-white/20 bg-black/5 dark:bg-white/5 border-2 border-black/5 dark:border-white/5 cursor-not-allowed text-center shrink-0">
                    {text}
                </span>
            );
        }

        if (onPageChange) {
            return (
                <button
                    type="button"
                    onClick={() => onPageChange(targetPage)}
                    className="spatial-input h-16 sm:h-20 px-5 sm:px-8 rounded-[22px] font-black text-lg sm:text-2xl flex items-center justify-center transition-all shadow-md active:scale-95 border-2 bg-primary/10 text-primary border-primary/30 hover:bg-primary hover:text-white hover:border-primary text-center shrink-0"
                >
                    {text}
                </button>
            );
        }

        if (!link || !link.url) {
            return (
                <span className="h-16 sm:h-20 px-5 sm:px-8 rounded-[22px] font-black text-lg sm:text-2xl flex items-center justify-center text-slate-300 dark:text-white/20 bg-black/5 dark:bg-white/5 border-2 border-black/5 dark:border-white/5 cursor-not-allowed text-center shrink-0">
                    {text}
                </span>
            );
        }

        return (
            <Link
                href={link.url}
                className="spatial-input h-16 sm:h-20 px-5 sm:px-8 rounded-[22px] font-black text-lg sm:text-2xl flex items-center justify-center transition-all shadow-md active:scale-95 border-2 bg-primary/10 text-primary border-primary/30 hover:bg-primary hover:text-white hover:border-primary text-center shrink-0"
            >
                {text}
            </Link>
        );
    };

    return (
        <div className="flex flex-col items-center gap-5 pt-6 select-none w-full max-w-full overflow-hidden dir-rtl">
            {/* Top Row: Previous (Right) | Exactly 10 Page Numbers (Scrollable container) | Next (Left) */}
            <div className="flex items-center justify-between gap-2.5 sm:gap-4 w-full max-w-full">
                {/* Previous Button (Start of Line - RTL Right) */}
                {renderNavBtn(prevLink, true)}

                {/* Exactly Max 10 Page Numbers */}
                <div className="flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto overflow-y-hidden max-w-full flex-1 min-w-0 py-1.5 px-1 scrollbar-thin">
                    {max10PageLinks.map((link, i) => {
                        const label = formatLabel(link.label);
                        const pageNum = link.page ?? parseInt(label);

                        if (link.active) {
                            return (
                                <span
                                    key={i}
                                    className="h-16 sm:h-20 min-w-[60px] sm:min-w-[72px] px-3.5 rounded-[22px] font-black text-xl sm:text-2xl flex items-center justify-center bg-primary text-white shadow-xl border-2 border-primary shrink-0"
                                >
                                    {label}
                                </span>
                            );
                        }

                        if (onPageChange && !isNaN(pageNum)) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => onPageChange(pageNum)}
                                    className="spatial-input h-16 sm:h-20 min-w-[60px] sm:min-w-[72px] px-3.5 rounded-[22px] font-black text-xl sm:text-2xl flex items-center justify-center text-slate-800 dark:text-white hover:border-primary/40 transition-all shadow-md active:scale-95 border-2 shrink-0"
                                >
                                    {label}
                                </button>
                            );
                        }

                        if (!link.url) {
                            return (
                                <span
                                    key={i}
                                    className="h-16 sm:h-20 min-w-[60px] sm:min-w-[72px] px-3.5 rounded-[22px] font-black text-xl sm:text-2xl flex items-center justify-center text-slate-300 dark:text-white/20 bg-black/5 dark:bg-white/5 border-2 border-black/5 dark:border-white/5 cursor-not-allowed shrink-0"
                                >
                                    {label}
                                </span>
                            );
                        }

                        return (
                            <Link
                                key={i}
                                href={link.url}
                                className="spatial-input h-16 sm:h-20 min-w-[60px] sm:min-w-[72px] px-3.5 rounded-[22px] font-black text-xl sm:text-2xl flex items-center justify-center text-slate-800 dark:text-white hover:border-primary/40 transition-all shadow-md active:scale-95 border-2 shrink-0"
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>

                {/* Next Button (End of Line - RTL Left) */}
                {renderNavBtn(nextLink, false)}
            </div>

            {/* Bottom Row: Quick Page Jump Input */}
            <div className="flex items-center justify-center gap-3 w-full pt-1">
                <button
                    type="button"
                    onClick={() => setShowJumpPad(true)}
                    className="spatial-input h-16 sm:h-20 rounded-[22px] px-6 text-base sm:text-xl font-black text-slate-800 dark:text-white hover:border-primary/50 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 border-2 border-primary/20 bg-primary/5 dark:bg-white/5 max-w-md w-full"
                >
                    <span className="text-primary text-xl sm:text-2xl">⚡</span>
                    <span>الانتقال السريع للصفحة: <strong className="text-primary font-black dir-ltr inline-block">({curPage} من {maxPage})</strong></span>
                </button>
            </div>

            <NumberPadModal
                isOpen={showJumpPad}
                title={`الانتقال للصفحة (من 1 إلى ${maxPage})`}
                initialValue={String(curPage)}
                maxValue={maxPage}
                onClose={() => setShowJumpPad(false)}
                onConfirm={handleJumpConfirm}
            />
        </div>
    );
}
