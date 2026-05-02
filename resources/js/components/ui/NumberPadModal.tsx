import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete, RotateCcw } from 'lucide-react';

interface NumberPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  initialValue?: string;
  title: string;
}

export function NumberPadModal({ isOpen, onClose, onConfirm, initialValue = '', title }: NumberPadModalProps) {
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
      if (/^[0-9]$/.test(e.key) || ['Backspace', 'Delete', 'Enter', 'Escape'].includes(e.key)) e.preventDefault();
      switch (e.key) {
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          handleNumberClick(e.key); break;
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

  function handleNumberClick(num: string) { setValue(prev => prev + num); setHasStartedTyping(true); }
  function handleDelete() { setValue(prev => prev.slice(0, -1)); }
  function handleClear() { setValue(''); setHasStartedTyping(false); }
  function handleConfirm() {
    const finalValue = hasStartedTyping ? value : (initialValue || '1');
    onConfirm(finalValue);
    onClose();
  }

  const nums = ['1','2','3','4','5','6','7','8','9'];
  const btnBase = 'rounded-[20px] flex items-center justify-center font-black transition-all active:scale-[0.93]';

  // ── Desktop (original design) ─────────────────────────────────────────────
  if (!isMobile) return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-black/10 dark:border-white/10 shadow-2xl w-[500px] max-w-[95vw] overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 dark:border-white/5">
          <h3 className="font-black text-slate-800 dark:text-white text-2xl">{title}</h3>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 dark:text-white/40 transition-all active:scale-[0.95]">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="px-8 py-6">
          <div className="w-full h-24 rounded-[20px] bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 flex items-center justify-center">
            {hasStartedTyping
              ? <span className="font-black text-4xl text-slate-800 dark:text-white">{value || '0'}</span>
              : <span className="font-bold text-2xl text-slate-400 dark:text-white/30">{initialValue || 'ابدأ الكتابة...'}</span>
            }
          </div>
        </div>
        <div className="px-8 pb-4 text-sm text-slate-400 dark:text-white/30 text-center">
          {!hasStartedTyping && initialValue
            ? <span>القيمة الحالية: <strong>{initialValue}</strong> • ابدأ الكتابة للتغيير أو اضغط تأكيد للاحتفاظ</span>
            : <span>الأرقام • Backspace للمسح • Enter للتأكيد</span>
          }
        </div>
        <div className="px-8 pb-8">
          <div className="grid grid-cols-3 gap-6 mb-6">
            {nums.map(n => (
              <button key={n} onClick={() => handleNumberClick(n)}
                className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 hover:bg-primary/10 hover:border-primary/20 border border-transparent text-slate-800 dark:text-white font-black text-2xl transition-all active:scale-[0.95] hover:scale-[1.05] mx-auto">
                {n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <button onClick={handleClear} disabled={!hasStartedTyping}
              className="w-20 h-20 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 font-bold transition-all active:scale-[0.95] hover:scale-[1.05] flex items-center justify-center disabled:opacity-40 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </button>
            <button onClick={() => handleNumberClick('0')}
              className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 hover:bg-primary/10 hover:border-primary/20 border border-transparent text-slate-800 dark:text-white font-black text-2xl transition-all active:scale-[0.95] hover:scale-[1.05] mx-auto">
              0
            </button>
            <button onClick={handleDelete} disabled={!hasStartedTyping || !value}
              className="w-20 h-20 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold transition-all active:scale-[0.95] hover:scale-[1.05] flex items-center justify-center disabled:opacity-40 mx-auto">
              <Delete className="w-6 h-6" />
            </button>
          </div>
          <button onClick={handleConfirm}
            className="w-full h-20 rounded-[24px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-black text-xl transition-all active:scale-[0.98] shadow-lg border-2 border-primary/20">
            <div className="flex items-center justify-center gap-3">
              <span>✓</span><span>تأكيد</span><span className="text-sm opacity-75">(Enter)</span>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  // ── Mobile (bottom sheet) ─────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full bg-white dark:bg-[#1a1f35] rounded-t-[28px] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <h3 className="font-black text-slate-800 dark:text-white text-xl">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/40">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pt-4 pb-3">
          <div className="w-full h-16 rounded-[18px] bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center">
            {hasStartedTyping
              ? <span className="font-black text-4xl text-slate-800 dark:text-white">{value || '0'}</span>
              : <span className="font-bold text-lg text-slate-400 dark:text-white/30">{initialValue || 'ابدأ الكتابة...'}</span>
            }
          </div>
        </div>
        <div className="px-6 pb-8 pt-2 grid grid-cols-3 gap-2">
          {nums.map(n => (
            <button key={n} onClick={() => handleNumberClick(n)}
              className={`${btnBase} h-16 bg-black/5 dark:bg-white/5 hover:bg-primary/10 border border-transparent text-slate-800 dark:text-white text-2xl`}>
              {n}
            </button>
          ))}
          <button onClick={handleClear} disabled={!hasStartedTyping}
            className={`${btnBase} h-16 bg-red-500/10 border border-red-500/20 text-red-500 disabled:opacity-30`}>
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={() => handleNumberClick('0')}
            className={`${btnBase} h-16 bg-black/5 dark:bg-white/5 hover:bg-primary/10 border border-transparent text-slate-800 dark:text-white text-2xl`}>
            0
          </button>
          <button onClick={handleDelete} disabled={!hasStartedTyping || !value}
            className={`${btnBase} h-16 bg-orange-500/10 border border-orange-500/20 text-orange-500 disabled:opacity-30`}>
            <Delete className="w-5 h-5" />
          </button>
          <button onClick={handleConfirm}
            className={`${btnBase} col-span-3 h-16 bg-primary hover:bg-primary/90 text-white text-lg font-black shadow-lg`}>
            ✓ تأكيد
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
