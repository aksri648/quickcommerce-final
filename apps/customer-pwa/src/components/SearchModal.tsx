import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, TrendingUp, ShoppingBag, ArrowRight } from 'lucide-react';
import { searchProductsApi, getSearchSuggestionsApi } from '../api/client';
import { useCart } from '../context/CartContext';
import { ProductCard } from '@quickcommerce/ui';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, storeId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [intentPills, setIntentPills] = useState<{ label: string; query: string }[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const { cart, addToCart, updateQuantity } = useCart();
  const items = cart?.items || [];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      loadInitialSuggestions();
    } else {
      setSearchTerm('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen, storeId]);

  const loadInitialSuggestions = async () => {
    try {
      const data = await getSearchSuggestionsApi('', storeId);
      setSuggestions(data.suggestions || []);
      setIntentPills(data.intentPills || []);
      setCategories(data.categories || []);
    } catch {
      // Ignore
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchProductsApi({
          q: searchTerm.trim(),
          storeId,
          limit: 12,
        });
        setResults(data || []);
        setHasSearched(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, storeId]);

  if (!isOpen) return null;

  const handleUpdateQty = (product: any, newQty: number) => {
    const cartItem = items.find((i) => i.productId === product.id);
    if (cartItem) {
      updateQuantity(cartItem.id, newQty);
    } else if (newQty > 0) {
      addToCart(product, newQty);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto sm:my-8 border border-slate-100">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 w-5 h-5 text-emerald-600" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='Search groceries, "healthy breakfast", "dahi", "atta"...'
              className="w-full pl-11 pr-10 py-3 text-base bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Semantic Intent Discovery Pills */}
        {!searchTerm && (
          <div className="p-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                AI Semantic Discovery
              </div>
              <div className="flex flex-wrap gap-2">
                {intentPills.map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSearchTerm(pill.query)}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70 rounded-full text-xs font-semibold transition active:scale-95"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Popular Items
                </div>
                <div className="space-y-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchTerm(s)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-lg flex items-center justify-between group transition"
                    >
                      <span>{s}</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results Area */}
        {searchTerm && (
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Searching catalog & semantic intents...</p>
              </div>
            ) : results.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                  <span className="font-semibold">{results.length} products found</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Orama Hybrid Search
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.map((product) => {
                    const cartItem = items.find((i) => i.productId === product.id);
                    const quantity = cartItem?.quantity || 0;

                    return (
                      <div key={product.id} className="relative">
                        <ProductCard
                          product={product}
                          quantityInCart={quantity}
                          onAddToCart={(p) => addToCart(p || product, 1)}
                          onUpdateQuantity={(p, qty) => handleUpdateQty(p || product, qty)}
                        />
                        {product.matchType === 'SEMANTIC' && (
                          <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 pointer-events-none">
                            <Sparkles className="w-2.5 h-2.5" />
                            Semantic
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : hasSearched ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-base font-semibold text-slate-700">No matching groceries found</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Try searching for general terms like &quot;milk&quot;, &quot;breakfast&quot;, &quot;atta&quot;, or &quot;snacks&quot;.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
