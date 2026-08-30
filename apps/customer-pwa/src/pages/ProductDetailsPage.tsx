import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { useCart } from '../context/CartContext';
import { Button, Skeleton, formatCurrency } from '@quickcommerce/ui';
import { ArrowLeft, ShoppingBag, Plus, Minus, ShieldCheck, Clock, Truck } from 'lucide-react';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedStore, addToCart, cart, updateQuantity } = useCart();

  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const storeIdParam = selectedStore ? `?storeId=${selectedStore.id}` : '';
        const data = await apiRequest<ProductDTO>(`/products/${id}${storeIdParam}`);
        setProduct(data);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, selectedStore]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-6 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700">Product not found</p>
        <Button onClick={() => navigate('/catalog')}>Back to Catalog</Button>
      </div>
    );
  }

  const effectivePrice = product.storePrice ?? product.basePrice;
  const isOutOfStock = (product.availableQuantity ?? 10) <= 0;
  const cartItem = cart?.items.find((i) => i.productId === product.id);
  const qtyInCart = cartItem ? cartItem.quantity : 0;
  const discountPercent = product.mrp > effectivePrice ? Math.round(((product.mrp - effectivePrice) / product.mrp) * 100) : 0;

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4 pt-3 space-y-5">
      {/* Top back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white p-2 rounded-xl border border-slate-200 shadow-xs"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero Product Image */}
      <div className="relative rounded-3xl bg-white border border-slate-200/80 p-6 flex items-center justify-center min-h-[280px] shadow-xs">
        {discountPercent > 0 && (
          <div className="absolute top-4 left-4 z-10 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm">
            {discountPercent}% OFF
          </div>
        )}
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="max-h-64 object-contain" />
        ) : (
          <ShoppingBag className="h-24 w-24 text-slate-300 stroke-[1.5]" />
        )}
      </div>

      {/* Main Details Card */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 space-y-4 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            {product.brand}
          </span>
          <h2 className="text-lg font-black text-slate-900 mt-0.5 leading-snug">{product.name}</h2>
          <span className="inline-block text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md mt-2">
            {product.unit}
          </span>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-3 pt-2 border-t border-slate-100">
          <span className="text-2xl font-black text-slate-900">{formatCurrency(effectivePrice)}</span>
          {product.mrp > effectivePrice && (
            <span className="text-sm font-semibold text-slate-400 line-through">
              {formatCurrency(product.mrp)}
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium">(Inclusive of all taxes)</span>
        </div>

        {/* Delivery Guarantee Notes */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-emerald-700 shrink-0" />
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-emerald-950">Scheduled 3-Hr Slot</p>
              <p className="text-emerald-700">Choose your delivery window</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-amber-950">Pay on Delivery</p>
              <p className="text-amber-700">Cash on delivery only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 space-y-2 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900">Product Description</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {product.description ||
            `Freshly sourced ${product.name} from trusted suppliers. Packaged hygienically to preserve freshness and nutrition.`}
        </p>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">Total Price</span>
            <span className="text-lg font-black text-slate-900">{formatCurrency(effectivePrice * (qtyInCart || 1))}</span>
          </div>

          {isOutOfStock ? (
            <Button disabled variant="outline" className="px-8">
              Out of Stock
            </Button>
          ) : qtyInCart > 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-600 bg-emerald-50 px-3 py-1.5">
              <button
                onClick={() => updateQuantity(cartItem!.id, qtyInCart - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-xs hover:bg-emerald-100"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[24px] text-center text-sm font-black text-emerald-900">
                {qtyInCart}
              </span>
              <button
                onClick={() => updateQuantity(cartItem!.id, qtyInCart + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="emerald"
              size="lg"
              className="px-8"
              onClick={() => addToCart(product, 1)}
            >
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
