import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface DraggableOnScreenKeyboardProps {
  value?: string;
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSpace: () => void;
  onClose: () => void;
}

export function DraggableOnScreenKeyboard({
  value,
  onKeyPress,
  onBackspace,
  onClear,
  onSpace,
  onClose,
}: DraggableOnScreenKeyboardProps) {
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
            <span className="inline-block w-[3px] h-6 sm:h-7 bg-amber-500 dark:amber-400 rounded-full mx-1.5 animate-pulse shrink-0" />
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
