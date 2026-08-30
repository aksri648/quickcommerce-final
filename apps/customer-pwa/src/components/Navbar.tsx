import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { MapPin, ChevronDown, Search, ShoppingBag, Zap, Sparkles } from 'lucide-react';
import { formatCurrency } from '@quickcommerce/ui';
import { SearchModal } from './SearchModal';

export const Navbar: React.FC<{ onOpenStoreModal?: () => void }> = ({ onOpenStoreModal }) => {
  const { selectedStore, cart } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Brand & Store Selector */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-1.5 shrink-0">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-amber-300 font-black shadow-xs">
                <Zap className="h-5 w-5 fill-amber-400 text-amber-400" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-base font-black tracking-tight text-emerald-800">QuickBlink</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Scheduled Rapid</span>
              </div>
            </Link>

            {/* Store Location Chip */}
            <button
              onClick={onOpenStoreModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 transition-colors text-left truncate"
            >
              <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[11px] font-bold text-slate-900 truncate">
                  {selectedStore ? selectedStore.name : 'Select Store'}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {selectedStore ? `${selectedStore.city} • 3-hr slots` : 'Tap to change'}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-0.5" />
            </button>
          </div>

          {/* Search & Cart Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex h-9 w-9 sm:w-56 sm:px-3 items-center justify-center sm:justify-between gap-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 text-xs transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="hidden sm:inline truncate">Search groceries, &quot;dahi&quot;...</span>
              </div>
              <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            </button>

            <Link
              to="/cart"
              className="flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              {cart && cart.itemCount > 0 ? (
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] opacity-90">{cart.itemCount} items</span>
                  <span className="text-xs font-black">{formatCurrency(cart.grandTotal)}</span>
                </div>
              ) : (
                <span>Cart</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Instant Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        storeId={selectedStore?.id || ''}
      />
    </>
  );
};
