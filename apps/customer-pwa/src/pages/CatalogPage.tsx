import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CategoryDTO, ProductDTO } from '@quickcommerce/shared';
import { apiRequest, searchProductsApi } from '../api/client';
import { useCart } from '../context/CartContext';
import { ProductCard, Skeleton, Input } from '@quickcommerce/ui';
import { Search, Sparkles } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedStore, addToCart, cart, updateQuantity } = useCart();

  const selectedCatId = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSemanticSearch, setIsSemanticSearch] = useState<boolean>(false);

  useEffect(() => {
    apiRequest<CategoryDTO[]>('/products/categories').then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        if (searchTerm.trim()) {
          // Use Orama Hybrid & Semantic Search
          const data = await searchProductsApi({
            q: searchTerm.trim(),
            storeId: selectedStore?.id,
            categoryId: selectedCatId || undefined,
            limit: 50,
          });
          setProducts(data as any[]);
          setIsSemanticSearch(true);
        } else {
          // Standard Category Catalog
          const storeIdParam = selectedStore ? `&storeId=${selectedStore.id}` : '';
          const catParam = selectedCatId ? `&categoryId=${selectedCatId}` : '';
          const data = await apiRequest<ProductDTO[]>(
            `/products?limit=50${storeIdParam}${catParam}`
          );
          setProducts(data);
          setIsSemanticSearch(false);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [selectedCatId, searchTerm, selectedStore]);

  const handleCategoryClick = (catId: string) => {
    if (selectedCatId === catId) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  const getQuantityInCart = (productId: string) => {
    const item = cart?.items.find((i) => i.productId === productId);
    return item ? item.quantity : 0;
  };

  const handleUpdateQty = (product: ProductDTO, qty: number) => {
    const item = cart?.items.find((i) => i.productId === product.id);
    if (item) {
      updateQuantity(item.id, qty);
    } else if (qty > 0) {
      addToCart(product, qty);
    }
  };

  return (
    <div className="pb-24 max-w-5xl mx-auto px-4 pt-4 space-y-4">
      {/* Search Input with AI Pill */}
      <div className="relative">
        <Input
          placeholder='Search "healthy breakfast", "dahi", "atta", milk...'
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value) {
              searchParams.set('search', e.target.value);
            } else {
              searchParams.delete('search');
            }
            setSearchParams(searchParams);
          }}
          leftIcon={<Search className="h-4 w-4 text-emerald-700" />}
          className="h-11 rounded-2xl bg-white shadow-xs pr-20"
        />
        {searchTerm && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Hybrid AI
          </div>
        )}
      </div>

      {/* Semantic Intent Discovery Shortcuts */}
      {!searchTerm && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick Discovery:
          </span>
          {[
            { label: '🥣 Quick Breakfast', q: 'healthy breakfast' },
            { label: '🍿 Midnight Snacks', q: 'midnight snacks' },
            { label: '🥤 Summer Coolers', q: 'summer coolers' },
            { label: '💪 Protein Rich', q: 'protein rich' },
          ].map((intent, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSearchTerm(intent.q);
                searchParams.set('search', intent.q);
                setSearchParams(searchParams);
              }}
              className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 transition active:scale-95"
            >
              {intent.label}
            </button>
          ))}
        </div>
      )}

      {/* Horizontal Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            searchParams.delete('category');
            setSearchParams(searchParams);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
            !selectedCatId
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          All Items
        </button>
        {categories.map((cat) => {
          const isSelected = selectedCatId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      <div className="pt-2">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80 p-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No products found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find items matching &quot;{searchTerm}&quot; in {selectedStore?.name || 'this store'}. Try searching for general terms like &quot;milk&quot; or &quot;snacks&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {isSemanticSearch && (
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Showing {products.length} results for &quot;<strong className="text-slate-800">{searchTerm}</strong>&quot;</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Ranked with Orama Hybrid Search
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {products.map((p: any) => (
                <div key={p.id} className="relative">
                  <ProductCard
                    product={p}
                    quantityInCart={getQuantityInCart(p.id)}
                    onAddToCart={(prod) => addToCart(prod || p, 1)}
                    onUpdateQuantity={(prod, qty) => handleUpdateQty(prod || p, qty)}
                    onClick={(prod) => navigate(`/product/${(prod || p).id}`)}
                  />
                  {p.matchType === 'SEMANTIC' && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      Semantic
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
