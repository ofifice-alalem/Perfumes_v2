import React from 'react';

interface Size { id: number; label: string; value: string; }

interface SizeSelectProps {
  sizes: Size[];
  selectedSizeId: string;
  onSizeSelect: (sizeId: string) => void;
  onPriceResolved?: (defaultPrice: number, minPrice: number) => void;
  placeholder?: string;
  className?: string;
  product?: any;
  isVip?: boolean;
}

export function SizeSelect({ sizes, selectedSizeId, onSizeSelect, onPriceResolved, className = '', product, isVip = false }: SizeSelectProps) {
  const availableSizes = sizes.filter(size => {
    if (!product) return false;
    try {
      if (product.selling_type === 'tier_based') {
        const tp = product.price_tier?.tier_prices?.find((t: any) => t.size_id === size.id);
        if (!tp) return false;
        return +(isVip ? tp.price_vip : tp.price_regular) > 0;
      }
      const unitPrice = isVip ? product.product_price?.price_per_unit_vip : product.product_price?.price_per_unit_regular;
      return unitPrice && +unitPrice > 0;
    } catch { return false; }
  });

  function getPrice(size: Size): number {
    const range = getPriceRange(size);
    return isVip ? range.vip : range.regular;
  }

  function getPriceRange(size: Size): { regular: number; vip: number } {
    try {
      if (product?.selling_type === 'tier_based') {
        const tp = product.price_tier?.tier_prices?.find((t: any) => t.size_id === size.id);
        return tp ? { regular: +tp.price_regular, vip: +tp.price_vip } : { regular: 0, vip: 0 };
      }
      // للعطور الأصلية (unit_decant): السعر هو سعر الوحدة (per ml) وليس × الحجم
      const r = +product?.product_price?.price_per_unit_regular || 0;
      const v = +product?.product_price?.price_per_unit_vip || 0;
      return { regular: r, vip: v };
    } catch { return { regular: 0, vip: 0 }; }
  }

  function handleSelect(sizeId: string, size?: Size) {
    onSizeSelect(sizeId);
    if (onPriceResolved && size) {
      const range = getPriceRange(size);
      const defaultPrice = isVip ? range.vip : range.regular;
      onPriceResolved(defaultPrice, range.vip);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
        اختر الحجم
      </span>
      {/* Workstation Size Selector Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
        {availableSizes.map(size => {
          const price = getPrice(size);
          const isTier = product?.selling_type === 'tier_based';
          const displayPrice = isTier ? price : price * +size.value;
          const isSelected = selectedSizeId === String(size.id);

          return (
            <button
              key={size.id}
              type="button"
              onClick={() => handleSelect(String(size.id), size)}
              className={`flex items-center justify-between px-3.5 h-12 rounded-[2px] border transition-all cursor-pointer select-none sm:flex-col sm:justify-center sm:px-5 sm:h-13 sm:min-w-[95px] ${
                isSelected
                  ? 'border-brand bg-brand text-white shadow-xs'
                  : 'border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-[#2a3e59] hover:bg-slate-50 dark:hover:bg-[#121c2c]'
              }`}
            >
              <span className="font-bold text-xs sm:text-sm leading-tight">
                {size.label}
              </span>
              <span
                className={`text-[11px] sm:text-xs font-number font-bold sm:mt-0.5 ${
                  isSelected ? 'text-white/90' : 'text-sky-600 dark:text-sky-400'
                }`}
              >
                {displayPrice > 0 ? `${displayPrice.toFixed(2)} د.ل` : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
