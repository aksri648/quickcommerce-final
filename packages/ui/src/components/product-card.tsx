import React from 'react';
import { cn, formatCurrency } from '../lib/utils';
import { ProductDTO } from '@quickcommerce/shared';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from './button';

export interface ProductCardProps {
  product?: ProductDTO | any;
  id?: string;
  name?: string;
  brand?: string;
  unit?: string;
  price?: number;
  mrp?: number;
  imageUrl?: string;
  inStock?: boolean;
  availableQuantity?: number;
  lowStockThreshold?: number;
  storePrice?: number;
  basePrice?: number;
  quantityInCart?: number;
  onAddToCart?: (product?: any) => void;
  onUpdateQuantity?: (product: any, newQty: number) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onClick?: (product?: any) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = (props) => {
  const {
    product: rawProduct,
    quantityInCart = 0,
    onAddToCart,
    onUpdateQuantity,
    onIncrement,
    onDecrement,
    onClick,
    className,
  } = props;

  // Normalize product object from either product prop or flat props
  const product: any = rawProduct || {
    id: props.id || '',
    name: props.name || '',
    brand: props.brand || '',
    unit: props.unit || '',
    mrp: props.mrp ?? props.price ?? 0,
    storePrice: props.price ?? props.storePrice ?? props.basePrice ?? 0,
    basePrice: props.basePrice ?? props.price ?? 0,
    imageUrl: props.imageUrl || '',
    availableQuantity: props.availableQuantity ?? (props.inStock === false ? 0 : 10),
    lowStockThreshold: props.lowStockThreshold ?? 5,
  };

  if (!product.id && !props.id && !product.name && !props.name) return null;

  const isOutOfStock = props.inStock === false || (product.availableQuantity ?? 10) <= 0;
  const isLowStock = !isOutOfStock && (product.availableQuantity ?? 10) <= (product.lowStockThreshold ?? 5);
  const effectivePrice = props.price ?? product.storePrice ?? product.basePrice ?? 0;
  const mrpPrice = props.mrp ?? product.mrp ?? effectivePrice;
  const discountPercent = mrpPrice > effectivePrice ? Math.round(((mrpPrice - effectivePrice) / mrpPrice) * 100) : 0;

  const handleAdd = () => {
    if (onAddToCart) onAddToCart(product);
    else if (onIncrement) onIncrement();
  };

  const handleDecrement = () => {
    if (onUpdateQuantity) onUpdateQuantity(product, quantityInCart - 1);
    else if (onDecrement) onDecrement();
  };

  const handleIncrement = () => {
    if (onUpdateQuantity) onUpdateQuantity(product, quantityInCart + 1);
    else if (onIncrement) onIncrement();
  };

  return (
    <div
      className={cn(
        'group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs hover:shadow-md transition-all duration-200 hover:border-emerald-200 relative overflow-hidden',
        isOutOfStock && 'opacity-75',
        className
      )}
    >
      {discountPercent > 0 && (
        <div className="absolute top-2.5 left-2.5 z-10 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
          {discountPercent}% OFF
        </div>
      )}

      {/* Image container */}
      <div
        className="relative mb-2 flex h-32 w-full items-center justify-center rounded-xl bg-slate-50 overflow-hidden cursor-pointer"
        onClick={() => onClick?.(product)}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center text-slate-300">
            <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
            <span className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-col flex-1 cursor-pointer" onClick={() => onClick?.(product)}>
        {product.brand && (
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {product.brand}
          </span>
        )}
        <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 mt-0.5 leading-snug">
          {product.name}
        </h4>
        {product.unit && <span className="text-[11px] text-slate-500 mt-1">{product.unit}</span>}

        {isLowStock && (
          <span className="text-[10px] font-semibold text-amber-600 mt-1">
            Only {product.availableQuantity} left!
          </span>
        )}
      </div>

      {/* Price & Action Row */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900">
            {formatCurrency(effectivePrice)}
          </span>
          {mrpPrice > effectivePrice && (
            <span className="text-[11px] text-slate-400 line-through">
              {formatCurrency(mrpPrice)}
            </span>
          )}
        </div>

        <div>
          {isOutOfStock ? (
            <Button size="sm" variant="outline" disabled className="text-xs h-8 px-2.5">
              Unavailable
            </Button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-1 py-0.5">
              <button
                type="button"
                onClick={handleDecrement}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-xs hover:bg-emerald-100 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[18px] text-center text-xs font-bold text-emerald-800">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAdd}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-700 font-semibold h-8 px-3 rounded-xl"
            >
              ADD
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
