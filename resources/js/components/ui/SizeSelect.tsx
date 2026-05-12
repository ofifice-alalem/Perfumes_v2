import { useState } from 'react';
import { NumberPadModal } from './NumberPadModal';
import { Plus } from 'lucide-react';

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
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [customSizes, setCustomSizes] = useState<Record<string, string>>({});

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

  const isCustom = selectedSizeId.startsWith('-custom-');

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

  function handleCustomSize(val: string) {
    if (!val || val === '0') return;
    const existing = availableSizes.find(s => s.value === val);
    if (existing) { handleSelect(String(existing.id), existing); return; }
    const customId = `-custom-${val}`;
    setCustomSizes(prev => ({ ...prev, [customId]: val }));
    onSizeSelect(customId);
    // للأحجام المخصصة نستخدم سعر الوحدة مباشرة
    if (onPriceResolved && product?.product_price) {
      const r = +product.product_price.price_per_unit_regular || 0;
      const v = +product.product_price.price_per_unit_vip || 0;
      onPriceResolved(isVip ? v : r, v);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الحجم</label>

      {/* Mobile: grid 2 cols — Desktop: flex wrap */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
        {availableSizes.map(size => {
          const price = getPrice(size);
          const isTier = product?.selling_type === 'tier_based';
          // للعطور الأصلية: نعرض السعر الإجمالي للحجم كمعلومة للمستخدم
          const displayPrice = isTier ? price : price * +size.value;
          const isSelected = selectedSizeId === String(size.id);
          return (
            <button key={size.id} onClick={() => handleSelect(String(size.id), size)}
              className={`flex items-center justify-between px-4 h-12 rounded-[14px] border-2 transition-all active:scale-[0.97] sm:flex-col sm:justify-center sm:px-4 sm:h-[72px] sm:min-w-[80px] sm:rounded-[18px] ${
                isSelected
                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
                  : 'border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 hover:border-primary/40 hover:bg-primary/5'
              }`}>
              <span className="font-black text-[14px] sm:text-[15px] leading-tight">{size.label}</span>
              <span className={`text-[12px] font-bold sm:mt-0.5 ${
                isSelected ? 'text-white/80' : 'text-primary/70 dark:text-primary/60'
              }`}>
                {displayPrice > 0 ? `${displayPrice.toFixed(2)} د` : '—'}
              </span>
            </button>
          );
        })}

        {/* Custom size */}
        {isCustom && customSizes[selectedSizeId] && (
          <button onClick={() => onSizeSelect('')}
            className="flex items-center justify-between px-4 h-12 rounded-[14px] border-2 border-primary bg-primary text-white shadow-md shadow-primary/25 relative active:scale-[0.97] sm:flex-col sm:justify-center sm:px-4 sm:h-[72px] sm:min-w-[80px] sm:rounded-[18px]">
            <span className="font-black text-[14px] sm:text-[15px] leading-tight">مخصص</span>
            <span className="text-[12px] font-bold sm:mt-0.5 text-white/80">{customSizes[selectedSizeId]} مل</span>
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">×</span>
          </button>
        )}

        {/* Add custom */}
        <button onClick={() => setShowNumberPad(true)}
          className="flex items-center justify-center gap-2 h-12 rounded-[14px] border-2 border-dashed border-black/15 dark:border-white/15 text-slate-400 dark:text-white/30 hover:border-primary/40 hover:text-primary transition-all active:scale-[0.97] sm:flex-col sm:px-4 sm:h-[72px] sm:min-w-[80px] sm:rounded-[18px] sm:gap-0">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[12px] font-bold sm:mt-0.5">حجم مخصص</span>
        </button>
      </div>

      <NumberPadModal isOpen={showNumberPad} onClose={() => setShowNumberPad(false)}
        onConfirm={handleCustomSize} title="حجم مخصص (مل)" initialValue="" />
    </div>
  );
}
