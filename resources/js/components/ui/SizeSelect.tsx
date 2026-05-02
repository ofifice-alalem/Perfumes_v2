import { useState } from 'react';
import { NumberPadModal } from './NumberPadModal';
import { Plus } from 'lucide-react';

interface Size { id: number; label: string; value: string; }

interface SizeSelectProps {
  sizes: Size[];
  selectedSizeId: string;
  onSizeSelect: (sizeId: string) => void;
  placeholder?: string;
  className?: string;
  product?: any;
  isVip?: boolean;
}

export function SizeSelect({ sizes, selectedSizeId, onSizeSelect, className = '', product, isVip = false }: SizeSelectProps) {
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
    try {
      if (product?.selling_type === 'tier_based') {
        const tp = product.price_tier?.tier_prices?.find((t: any) => t.size_id === size.id);
        return tp ? +(isVip ? tp.price_vip : tp.price_regular) : 0;
      }
      const unitPrice = isVip ? product?.product_price?.price_per_unit_vip : product?.product_price?.price_per_unit_regular;
      return (+unitPrice) * (+size.value);
    } catch { return 0; }
  }

  function handleCustomSize(val: string) {
    if (!val || val === '0') return;
    const existing = availableSizes.find(s => s.value === val);
    if (existing) { onSizeSelect(String(existing.id)); return; }
    const customId = `-custom-${val}`;
    setCustomSizes(prev => ({ ...prev, [customId]: val }));
    onSizeSelect(customId);
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs font-bold text-slate-700 dark:text-white/75 uppercase tracking-widest">الحجم</label>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map(size => {
          const price = getPrice(size);
          const isSelected = selectedSizeId === String(size.id);
          return (
            <button key={size.id} onClick={() => onSizeSelect(String(size.id))}
              className={`flex flex-col items-center justify-center px-4 h-[72px] min-w-[80px] rounded-[18px] border-2 transition-all active:scale-[0.95] ${
                isSelected
                  ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                  : 'border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 hover:border-primary/50 hover:bg-primary/5'
              }`}>
              <span className="font-black text-[15px] leading-tight">{size.label}</span>
              <span className={`text-[12px] font-bold mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-white/40'}`}>
                {price > 0 ? `${price.toFixed(2)} د` : '—'}
              </span>
            </button>
          );
        })}

        {/* Custom size */}
        {isCustom && customSizes[selectedSizeId] && (
          <button onClick={() => onSizeSelect('')}
            className="flex flex-col items-center justify-center px-4 h-[72px] min-w-[80px] rounded-[18px] border-2 border-primary bg-primary text-white shadow-lg shadow-primary/20 relative active:scale-[0.95]">
            <span className="font-black text-[15px] leading-tight">مخصص</span>
            <span className="text-[12px] font-bold mt-0.5 text-white/80">{customSizes[selectedSizeId]} مل</span>
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">×</span>
          </button>
        )}

        {/* Add custom */}
        <button onClick={() => setShowNumberPad(true)}
          className="flex flex-col items-center justify-center px-4 h-[72px] min-w-[80px] rounded-[18px] border-2 border-dashed border-black/15 dark:border-white/15 text-slate-400 dark:text-white/30 hover:border-primary/40 hover:text-primary transition-all active:scale-[0.95]">
          <Plus className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-0.5">مخصص</span>
        </button>
      </div>

      <NumberPadModal isOpen={showNumberPad} onClose={() => setShowNumberPad(false)}
        onConfirm={handleCustomSize} title="حجم مخصص (مل)" initialValue="" />
    </div>
  );
}
