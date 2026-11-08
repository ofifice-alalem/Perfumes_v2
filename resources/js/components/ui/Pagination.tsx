import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { NumberPadModal } from '@/components/ui/NumberPadModal';

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
  page?: number;
}

export interface PaginationProps {
  links: PaginationLink[];
  currentPage?: number;
  lastPage?: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({
  links,
  currentPage,
  lastPage,
  onPageChange,
}: PaginationProps) {
  const [showJumpPad, setShowJumpPad] = useState(false);

  if (!links || links.length <= 1) return null;

  function formatLabel(label: string) {
    const text = label.replace(/&laquo;/g, '').replace(/&raquo;/g, '').replace(/«/g, '').replace(/»/g, '').trim();
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

  const renderNavBtn = (link: PaginationLink | undefined, isPrevious: boolean) => {
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
