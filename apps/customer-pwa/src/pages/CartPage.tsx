import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Button, formatCurrency } from '@quickcommerce/ui';
import { FREE_DELIVERY_THRESHOLD } from '@quickcommerce/shared';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, ArrowLeft, ShieldAlert, Sparkles } from 'lucide-react';

export const CartPage: React.FC = () => {
  const { cart, updateQuantity, clearCart, selectedStore } = useCart();
  const navigate = useNavigate();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="h-20 w-20 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Your Cart is Empty</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Explore hundreds of fresh vegetables, dairy, snacks, and daily essentials from {selectedStore?.name}.
        </p>
        <div className="pt-2">
          <Button variant="emerald" onClick={() => navigate('/catalog')}>
            Explore Catalog
          </Button>
        </div>
      </div>
    );
  }

  const freeDeliveryDelta = Math.max(0, FREE_DELIVERY_THRESHOLD - cart.subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((cart.subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  return (
    <div className="pb-32 max-w-2xl mx-auto px-4 pt-3 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </button>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear Cart
        </button>
      </div>

      {/* Free Delivery Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          {freeDeliveryDelta > 0 ? (
            <span className="font-semibold text-slate-700">
              Add <span className="font-black text-emerald-700">{formatCurrency(freeDeliveryDelta)}</span> more for <span className="font-bold text-emerald-700">FREE delivery</span>
            </span>
          ) : (
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 fill-emerald-600" /> You unlocked FREE delivery!
            </span>
          )}
          <span className="text-[11px] font-bold text-slate-400">{freeDeliveryProgress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
            style={{ width: `${freeDeliveryProgress}%` }}
          />
        </div>
      </div>

      {/* Cart Items List */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Items from {selectedStore?.name}
        </h4>

        <div className="divide-y divide-slate-100">
          {cart.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden p-1">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-contain" />
                  ) : (
                    <ShoppingBag className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {item.product.name}
                  </h5>
                  <span className="text-[11px] text-slate-400">{item.product.unit}</span>
                  <div className="text-xs font-black text-slate-800 mt-0.5">
                    {formatCurrency(item.unitPrice)}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-2 py-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-xs hover:bg-emerald-100"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[18px] text-center text-xs font-black text-emerald-900">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Authoritative Server Bill Summary */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 space-y-2.5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Bill Details
        </h4>

        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Item Subtotal</span>
            <span className="font-semibold text-slate-900">{formatCurrency(cart.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>GST / Taxes (5%)</span>
            <span className="font-semibold text-slate-900">{formatCurrency(cart.tax)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Scheduled Delivery Fee</span>
            {cart.deliveryFee === 0 ? (
              <span className="font-bold text-emerald-600">FREE</span>
            ) : (
              <span className="font-semibold text-slate-900">{formatCurrency(cart.deliveryFee)}</span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-black text-slate-900">
            <span>To Pay (COD)</span>
            <span className="text-base text-emerald-800">{formatCurrency(cart.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Sticky Checkout CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Final Total</span>
            <span className="text-lg font-black text-slate-900">{formatCurrency(cart.grandTotal)}</span>
          </div>

          <Button
            variant="emerald"
            size="lg"
            className="px-8 shadow-md"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={() => navigate('/checkout')}
          >
            Select Slot & Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};
