import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete, Check } from 'lucide-react';

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
    if (isOpen) {
      setValue('');
      setHasStartedTyping(false);
    }
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
        case 'Backspace': case 'Delete': handleDelete(); break;
        case 'Enter': handleConfirm(); break;
        case 'Escape': onClose(); break;
        case 'c': case 'C':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); return; }
          handleClear(); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, hasStartedTyping, initialValue]);

  if (!isOpen) return null;

  function handleNumberClick(num: string) {
    if (num === '.') {
      if ((hasStartedTyping ? value : (initialValue || '')).includes('.')) return;
      setValue(prev => (hasStartedTyping ? prev : '0') + '.');
      setHasStartedTyping(true);
      return;
    }
    const next = (hasStartedTyping ? value : '') + num;
    if (maxValue !== undefined && +next > maxValue) return;
    setValue(next);
    setHasStartedTyping(true);
  }

  function handleDelete() {
    if (!hasStartedTyping) {
      const next = (initialValue || '').slice(0, -1);
      setValue(next);
      setHasStartedTyping(true);
    } else {
      setValue(prev => prev.slice(0, -1));
    }
  }

  function handleClear() {
    setValue('');
    setHasStartedTyping(true);
  }

  function handleConfirm() {
    const finalValue = hasStartedTyping ? value : initialValue;
    if (finalValue === undefined || finalValue === null || finalValue === '') return;
    onConfirm(finalValue);
    onClose();
  }

  const currentNum = hasStartedTyping ? +value : +(initialValue || 0);
  const isOverMax = maxValue !== undefined && currentNum > maxValue;
  const nums = ['1','2','3','4','5','6','7','8','9'];
  const displayVal = hasStartedTyping ? value : initialValue;
  const canDelete = Boolean(displayVal && displayVal.length > 0);

  // ── Desktop Modal (نمط Workstation بحواف هندسية مستقيمة بدون Radius دائري) ──
  if (!isMobile) return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs cursor-pointer p-4">
      <div 
        onClick={e => e.stopPropagation()} 
        className="bg-white dark:bg-[#0c1421] rounded-[3px] border border-slate-200 dark:border-[#1d2d42] shadow-2xl w-[350px] max-w-[95vw] cursor-default flex flex-col overflow-hidden animate-in fade-in duration-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-[#172437] bg-slate-50 dark:bg-[#0a121e]">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-6 h-6 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] bg-white dark:bg-[#121c2c] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Display Box */}
        <div className="px-3.5 pt-3 pb-1.5">
          <div className={`w-full h-12 rounded-[2px] border flex items-center justify-between px-3.5 transition-colors ${
            isOverMax 
              ? 'bg-rose-500/10 border-rose-500/40' 
              : 'bg-slate-50 dark:bg-[#070d18] border-slate-200 dark:border-[#1d2d42]'
          }`}>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0">القيمة</span>
            {hasStartedTyping || initialValue ? (
              <span className={`font-number font-black text-2xl tracking-tight tabular-nums truncate ${
                isOverMax ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              }`}>
                {hasStartedTyping ? (value || '0') : initialValue}
              </span>
            ) : (
              <span className="font-medium text-xs text-slate-400 dark:text-slate-500">ابدأ الإدخال...</span>
            )}
          </div>
          {maxValue !== undefined && (
            <p className={`text-center text-[10px] font-bold mt-1 ${isOverMax ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {isOverMax ? `⚠️ يتجاوز الحد المتاح (${maxValue})` : `الحد المتاح: ${maxValue}`}
            </p>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="px-3.5 pb-3.5 pt-1 flex flex-col gap-1.5">
          <div className="grid grid-cols-3 gap-1.5" dir="ltr">
            {nums.map(n => (
              <button 
                key={n} 
                onClick={() => handleNumberClick(n)}
                className="w-full h-11 rounded-[2px] bg-slate-50 hover:bg-slate-100 dark:bg-[#101a29] dark:hover:bg-[#152338] border border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-100 font-number font-bold text-xl transition-all active:scale-[0.97] shadow-2xs cursor-pointer flex items-center justify-center"
              >
                {n}
              </button>
            ))}
            <button 
              onClick={() => handleNumberClick('.')}
              disabled={(hasStartedTyping ? value : (initialValue || '')).includes('.')}
              className="w-full h-11 rounded-[2px] bg-slate-50 hover:bg-slate-100 dark:bg-[#101a29] dark:hover:bg-[#152338] border border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-100 font-number font-bold text-xl transition-all active:scale-[0.97] disabled:opacity-30 shadow-2xs cursor-pointer flex items-center justify-center"
            >
              .
            </button>
            <button 
              onClick={() => handleNumberClick('0')}
              className="w-full h-11 rounded-[2px] bg-slate-50 hover:bg-slate-100 dark:bg-[#101a29] dark:hover:bg-[#152338] border border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-100 font-number font-bold text-xl transition-all active:scale-[0.97] shadow-2xs cursor-pointer flex items-center justify-center"
            >
              0
            </button>
            <button 
              onClick={handleDelete} 
              disabled={!canDelete}
              className="w-full h-11 rounded-[2px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold transition-all active:scale-[0.97] flex items-center justify-center disabled:opacity-30 shadow-2xs cursor-pointer"
            >
              <Delete className="w-4.5 h-4.5 stroke-[2]" />
            </button>
          </div>

          <button 
            onClick={handleConfirm} 
            disabled={isOverMax}
            className="w-full h-10 rounded-[2px] bg-brand hover:opacity-95 text-white font-bold text-xs sm:text-sm transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mt-0.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>تأكيد القيمة</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  // ── Mobile Bottom Sheet (نمط Workstation) ──────────────────────────────────
  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[100000] flex flex-col justify-end bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs cursor-pointer">
      <div 
        onClick={e => e.stopPropagation()} 
        className="w-full bg-white dark:bg-[#0c1421] rounded-t-[3px] border-t border-slate-200 dark:border-[#1d2d42] shadow-2xl overflow-hidden cursor-default pb-safe"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-[#172437] bg-slate-50 dark:bg-[#0a121e]">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{title}</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-[2px] border border-slate-200 dark:border-[#1d2d42] flex items-center justify-center text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-3.5 pt-3 pb-1.5">
          <div className={`w-full h-11 rounded-[2px] border flex items-center justify-between px-3 transition-colors ${
            isOverMax 
              ? 'bg-rose-500/10 border-rose-500/40' 
              : 'bg-slate-50 dark:bg-[#070d18] border-slate-200 dark:border-[#1d2d42]'
          }`}>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">القيمة</span>
            {hasStartedTyping || initialValue ? (
              <span className={`font-number font-black text-xl tabular-nums ${isOverMax ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                {hasStartedTyping ? (value || '0') : initialValue}
              </span>
            ) : (
              <span className="font-medium text-xs text-slate-400 dark:text-slate-500">ابدأ الإدخال...</span>
            )}
          </div>
          {maxValue !== undefined && (
            <p className={`text-center text-[10px] font-bold mt-1 ${isOverMax ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>
              {isOverMax ? `⚠️ يتجاوز الحد المتاح (${maxValue})` : `الحد المتاح: ${maxValue}`}
            </p>
          )}
        </div>
        <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-3 gap-1.5" dir="ltr">
          {nums.map(n => (
            <button 
              key={n} 
              onClick={() => handleNumberClick(n)}
              className="w-full h-11 rounded-[2px] bg-slate-50 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-100 text-xl font-number font-bold flex items-center justify-center active:scale-[0.97]"
            >
              {n}
            </button>
          ))}
          <button 
            onClick={() => handleNumberClick('.')}
            disabled={(hasStartedTyping ? value : (initialValue || '')).includes('.')}
            className="w-full h-11 rounded-[2px] bg-slate-50 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-100 text-xl font-number font-bold disabled:opacity-30 flex items-center justify-center"
          >
            .
          </button>
          <button 
            onClick={() => handleNumberClick('0')}
            className="w-full h-11 rounded-[2px] bg-slate-50 dark:bg-[#101a29] border border-slate-200 dark:border-[#1d2d42] text-slate-800 dark:text-slate-100 text-xl font-number font-bold flex items-center justify-center"
          >
            0
          </button>
          <button 
            onClick={handleDelete} 
            disabled={!canDelete}
            className="w-full h-11 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold disabled:opacity-30 flex items-center justify-center"
          >
            <Delete className="w-4.5 h-4.5 stroke-[2]" />
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isOverMax}
            className="col-span-3 h-10 rounded-[2px] bg-brand hover:opacity-95 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed mt-0.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>تأكيد القيمة</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
