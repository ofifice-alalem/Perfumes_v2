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
      {/* Responsive Workstation Grid with full size & price display without any truncation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
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
              className={`flex flex-col items-center justify-center px-3 py-2.5 h-16 rounded-[2px] border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-brand bg-brand text-white shadow-xs'
                  : 'border-slate-200/90 dark:border-[#1d2d42] bg-white dark:bg-[#0c1421] text-slate-800 dark:text-slate-200 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-[#121c2c]'
              }`}
            >
              <span className="font-bold text-xs sm:text-sm leading-tight text-center whitespace-nowrap">
                {size.label}
              </span>
              <span
                className={`text-xs font-number font-bold mt-1 text-center whitespace-nowrap ${
                  isSelected ? 'text-white/95' : 'text-sky-600 dark:text-sky-400'
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
