import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete, RotateCcw } from 'lucide-react';

interface NumberPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  initialValue?: string;
  title: string;
  maxValue?: number;
}

export function NumberPadModal({ isOpen, onClose, onConfirm, initialValue = '', title, maxValue }: NumberPadModalProps) {
  const [value, setValue] = useState('');
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isOpen) { setValue(''); setHasStartedTyping(false); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9.]$/.test(e.key) || ['Backspace', 'Delete', 'Enter', 'Escape'].includes(e.key)) e.preventDefault();
      switch (e.key) {
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          handleNumberClick(e.key); break;
        case '.': case ',': handleNumberClick('.'); break;
        case 'Backspace': case 'Delete': if (hasStartedTyping) handleDelete(); break;
        case 'Enter': handleConfirm(); break;
        case 'Escape': onClose(); break;
        case 'c': case 'C':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); return; }
          if (hasStartedTyping) handleClear(); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, hasStartedTyping, initialValue]);

  if (!isOpen) return null;

  function handleNumberClick(num: string) {
    if (num === '.') {
      if (value.includes('.')) return;
      setValue(prev => (hasStartedTyping ? prev : '0') + '.');
      setHasStartedTyping(true);
      return;
    }
    const next = (hasStartedTyping ? value : '') + num;
    if (maxValue !== undefined && +next > maxValue) return;
    setValue(next);
    setHasStartedTyping(true);
  }
  function handleDelete() { setValue(prev => prev.slice(0, -1)); }
  function handleClear() { setValue(''); setHasStartedTyping(false); }
  function handleConfirm() {
    const finalValue = hasStartedTyping ? value : (initialValue || '1');
    if (!finalValue || finalValue === '0') return;
    onConfirm(finalValue);
    onClose();
  }

  const currentNum = hasStartedTyping ? +value : +(initialValue || 0);
  const isOverMax = maxValue !== undefined && currentNum > maxValue;
  const nums = ['1','2','3','4','5','6','7','8','9'];
  const btnBase = 'rounded-[20px] flex items-center justify-center font-black transition-all active:scale-[0.93]';

  // ── Desktop ───────────────────────────────────────────────────────────────
  if (!isMobile) return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-md cursor-pointer p-4">
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-[32px] border-2 border-black/10 dark:border-white/12 shadow-2xl w-[460px] max-w-[95vw] max-h-[92vh] overflow-y-auto cursor-default flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black/5 dark:border-white/5 shrink-0">
          <h3 className="font-black text-slate-800 dark:text-white text-xl sm:text-2xl">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95 border border-black/5 dark:border-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Box */}
        <div className="px-6 pt-5 pb-2 shrink-0">
          <div className={`w-full h-18 sm:h-20 rounded-[22px] border-2 flex items-center justify-between px-6 transition-colors ${
            isOverMax ? 'bg-red-500/10 border-red-500/30' : 'bg-black/3 dark:bg-white/4 border-black/8 dark:border-white/10'
          }`}>
            <span className="text-xs sm:text-sm font-black text-slate-500 dark:text-white/50 uppercase tracking-wider">القيمة</span>
            {hasStartedTyping
              ? <span className={`font-black text-3xl sm:text-4xl ${isOverMax ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>{value || '0'}</span>
              : <span className="font-black text-xl text-slate-400 dark:text-white/30">{initialValue || 'ابدأ الكتابة...'}</span>
            }
          </div>
          {maxValue !== undefined && (
            <p className={`text-center text-xs sm:text-sm font-black mt-2 ${isOverMax ? 'text-red-500' : 'text-slate-500 dark:text-white/40'}`}>
              {isOverMax ? `⚠️ يتجاوز المتاح (${maxValue})` : `المتاح: ${maxValue}`}
            </p>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-3.5 shrink-0">
          <div className="grid grid-cols-3 gap-3.5" dir="ltr">
            {nums.map(n => (
              <button key={n} onClick={() => handleNumberClick(n)}
                className="w-full h-18 sm:h-20 rounded-[22px] bg-black/5 dark:bg-white/6 hover:bg-primary/15 hover:border-primary/40 border-2 border-transparent text-slate-800 dark:text-white font-black text-4xl sm:text-5xl transition-all active:scale-95 shadow-sm">
                {n}
              </button>
            ))}
            <button onClick={() => handleNumberClick('.')}
              disabled={value.includes('.')}
              className="w-full h-18 sm:h-20 rounded-[22px] bg-black/5 dark:bg-white/6 hover:bg-primary/15 hover:border-primary/40 border-2 border-transparent text-slate-800 dark:text-white font-black text-4xl sm:text-5xl transition-all active:scale-95 disabled:opacity-30 shadow-sm">
              .
            </button>
            <button onClick={() => handleNumberClick('0')}
              className="w-full h-18 sm:h-20 rounded-[22px] bg-black/5 dark:bg-white/6 hover:bg-primary/15 hover:border-primary/40 border-2 border-transparent text-slate-800 dark:text-white font-black text-4xl sm:text-5xl transition-all active:scale-95 shadow-sm">
              0
            </button>
            <button onClick={handleDelete} disabled={!hasStartedTyping || !value}
              className="w-full h-18 sm:h-20 rounded-[22px] bg-orange-500/10 hover:bg-orange-500/20 border-2 border-orange-500/20 text-orange-600 dark:text-orange-400 font-black transition-all active:scale-95 flex items-center justify-center disabled:opacity-30 shadow-sm">
              <Delete className="w-8 h-8 sm:w-9 sm:h-9" />
            </button>
          </div>

          <button onClick={handleConfirm} disabled={isOverMax}
            className="w-full h-18 sm:h-20 rounded-[24px] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-2xl sm:text-3xl transition-all active:scale-95 shadow-xl shadow-emerald-600/25 border-2 border-emerald-400/30 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-2xl sm:text-3xl">✓</span><span>تأكيد القيمة</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  // ── Mobile (bottom sheet) ─────────────────────────────────────────────────
  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[100000] flex flex-col justify-end bg-black/60 backdrop-blur-md cursor-pointer">
      <div onClick={e => e.stopPropagation()} className="w-full bg-white dark:bg-[#1a1f35] rounded-t-[32px] border-t-2 border-black/10 dark:border-white/12 shadow-2xl overflow-hidden cursor-default">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black/5 dark:border-white/5">
          <h3 className="font-black text-slate-800 dark:text-white text-xl">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pt-4 pb-2">
          <div className={`w-full h-18 rounded-[20px] border-2 flex items-center justify-between px-5 transition-colors ${
            isOverMax ? 'bg-red-500/10 border-red-500/30' : 'bg-black/3 dark:bg-white/5 border-black/8 dark:border-white/10'
          }`}>
            <span className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-wider">القيمة</span>
            {hasStartedTyping
              ? <span className={`font-black text-3xl ${isOverMax ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>{value || '0'}</span>
              : <span className="font-black text-lg text-slate-400 dark:text-white/30">{initialValue || 'ابدأ الكتابة...'}</span>
            }
          </div>
          {maxValue !== undefined && (
            <p className={`text-center text-xs font-black mt-1.5 ${isOverMax ? 'text-red-500' : 'text-slate-500 dark:text-white/40'}`}>
              {isOverMax ? `⚠️ يتجاوز المتاح (${maxValue})` : `المتاح: ${maxValue}`}
            </p>
          )}
        </div>
        <div className="px-6 pb-6 pt-2 grid grid-cols-3 gap-3.5" dir="ltr">
          {nums.map(n => (
            <button key={n} onClick={() => handleNumberClick(n)}
              className={`${btnBase} h-18 rounded-[20px] bg-black/5 dark:bg-white/6 hover:bg-primary/10 border-2 border-transparent text-slate-800 dark:text-white text-4xl font-black`}>
              {n}
            </button>
          ))}
          <button onClick={() => handleNumberClick('.')}
            disabled={value.includes('.')}
            className={`${btnBase} h-18 rounded-[20px] bg-black/5 dark:bg-white/6 hover:bg-primary/10 border-2 border-transparent text-slate-800 dark:text-white text-4xl font-black disabled:opacity-30`}>
            .
          </button>
          <button onClick={() => handleNumberClick('0')}
            className={`${btnBase} h-18 rounded-[20px] bg-black/5 dark:bg-white/6 hover:bg-primary/10 border-2 border-transparent text-slate-800 dark:text-white text-4xl font-black`}>
            0
          </button>
          <button onClick={handleDelete} disabled={!hasStartedTyping || !value}
            className={`${btnBase} h-18 rounded-[20px] bg-orange-500/10 border-2 border-orange-500/20 text-orange-500 font-black disabled:opacity-30`}>
            <Delete className="w-8 h-8" />
          </button>
          <button onClick={handleConfirm} disabled={isOverMax}
            className={`${btnBase} col-span-3 h-18 rounded-[22px] bg-emerald-600 hover:bg-emerald-500 text-white text-2xl font-black shadow-lg shadow-emerald-600/25 border-2 border-emerald-400/30 disabled:opacity-40 disabled:cursor-not-allowed`}>
            ✓ تأكيد القيمة
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
