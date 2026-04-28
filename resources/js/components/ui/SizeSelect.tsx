import { useState } from 'react';
import { NumberPadModal } from './NumberPadModal';
import { X } from 'lucide-react';

interface Size {
  id: number;
  label: string;
  value: string;
}

interface SizeSelectProps {
  sizes: Size[];
  selectedSizeId: string;
  onSizeSelect: (sizeId: string) => void;
  placeholder?: string;
  className?: string;
  product?: any; // Add product to check prices
  isVip?: boolean; // Add VIP status to check correct price
}

export function SizeSelect({ sizes, selectedSizeId, onSizeSelect, placeholder = "الحجم", className = "", product, isVip = false }: SizeSelectProps) {
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [customSizes, setCustomSizes] = useState<{[key: string]: string}>({});
  
  // Filter sizes that have valid prices
  const availableSizes = sizes.filter(size => {
    if (!product) return false;
    
    try {
      // For tier_based products, check tier_prices
      if (product.selling_type === 'tier_based') {
        if (!product.price_tier || !product.price_tier.tier_prices) return false;
        
        const tierPrice = product.price_tier.tier_prices.find((tp: any) => tp.size_id === size.id);
        if (!tierPrice) return false;
        
        const price = isVip ? tierPrice.price_vip : tierPrice.price_regular;
        return price && +price > 0;
      }
      
      // For unit_decant products (original perfumes), all sizes are available if product has unit pricing
      if (product.selling_type !== 'tier_based') {
        if (!product.product_price) return false;
        
        const unitPrice = isVip ? product.product_price.price_per_unit_vip : product.product_price.price_per_unit_regular;
        return unitPrice && +unitPrice > 0;
      }
      
      return false;
    } catch (error) {
      console.error('Error filtering sizes:', error);
      return false;
    }
  });
  
  const selectedSize = availableSizes.find(s => s.id === +selectedSizeId);
  const isCustomSize = selectedSizeId.startsWith('-');
  const customSizeValue = isCustomSize ? customSizes[selectedSizeId] : null;
  
  const handleCustomSize = (value: string) => {
    if (!value || value === '0') return;
    
    // Check if this exact size already exists in predefined sizes
    const existingSize = availableSizes.find(s => s.value === value);
    if (existingSize) {
      onSizeSelect(String(existingSize.id));
      return;
    }
    
    // Create a custom size ID
    const customId = `-custom-${value}`;
    
    // Store the custom size value
    setCustomSizes(prev => ({ ...prev, [customId]: value }));
    
    // Select the custom size
    onSizeSelect(customId);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Predefined sizes only */}
      <div className="flex gap-2 flex-wrap">
        {availableSizes.map(size => {
          let price = 0;
          
          try {
            // Calculate price based on product type
            if (product?.selling_type === 'tier_based') {
              // For tier_based products, use tier_prices
              if (product.price_tier?.tier_prices) {
                const tierPrice = product.price_tier.tier_prices.find((tp: any) => tp.size_id === size.id);
                price = tierPrice ? +(isVip ? tierPrice.price_vip : tierPrice.price_regular) : 0;
              }
            } else if (product?.product_price) {
              // For unit_decant products, calculate price = unit_price * size_value
              const unitPrice = isVip ? product.product_price.price_per_unit_vip : product.product_price.price_per_unit_regular;
              price = (+unitPrice) * (+size.value);
            }
          } catch (error) {
            console.error('Error calculating price:', error);
            price = 0;
          }
          
          return (
            <button
              key={size.id}
              onClick={() => onSizeSelect(String(size.id))}
              className={`px-3 h-14 rounded-[16px] border-2 transition-all font-bold text-sm whitespace-nowrap min-w-[80px] ${
                selectedSizeId === String(size.id)
                  ? 'border-primary bg-primary text-white'
                  : 'border-black/10 dark:border-white/10 text-slate-700 dark:text-white/70 hover:border-primary/40 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="text-center">
                <div className="font-black text-xs">{size.label}</div>
                <div className="text-xs opacity-70">{price.toFixed(2)} د</div>
              </div>
            </button>
          );
        })}
        
        {/* Custom size display if selected */}
        {isCustomSize && customSizeValue && (
          <button
            onClick={() => onSizeSelect('')}
            className="px-3 h-14 rounded-[16px] border-2 border-primary bg-primary text-white transition-all font-bold text-sm whitespace-nowrap min-w-[80px] relative group"
          >
            <div className="text-center">
              <div className="font-black text-xs">مخصص</div>
              <div className="text-xs opacity-90">{customSizeValue} مل</div>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3 text-white" />
            </div>
          </button>
        )}
      </div>
      
      {/* Number pad modal for custom size */}
      <NumberPadModal
        isOpen={showNumberPad}
        onClose={() => setShowNumberPad(false)}
        onConfirm={handleCustomSize}
        title="حجم مخصص (مل)"
        initialValue=""
      />
    </div>
  );
}