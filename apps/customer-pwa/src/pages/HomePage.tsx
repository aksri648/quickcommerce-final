import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CategoryDTO, ProductDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { useCart } from '../context/CartContext';
import { ProductCard, Skeleton } from '@quickcommerce/ui';
import { Clock, ShieldCheck, Zap, Sparkles, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { selectedStore, addToCart, cart, updateQuantity } = useCart();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductDTO[]>([]);
  const [popularProducts, setPopularProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const storeIdQuery = selectedStore ? `?storeId=${selectedStore.id}` : '';
        const [cats, products] = await Promise.all([
          apiRequest<CategoryDTO[]>('/products/categories'),
          apiRequest<ProductDTO[]>(`/products${storeIdQuery}&limit=20`),
        ]);

        setCategories(cats);
        setFeaturedProducts(products.slice(0, 8));
        setPopularProducts(products.slice(8, 16));
      } catch (err) {
        console.error('Home page data loading error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedStore]);

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
    <div className="pb-24 max-w-5xl mx-auto px-4 pt-4 space-y-6">
      {/* Quick Slot Schedule Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-900 text-white p-5 sm:p-6 shadow-md">
        <div className="relative z-10 max-w-md space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] tracking-wide uppercase">
            <Clock className="h-3.5 w-3.5" /> 3-Hour Batched Delivery
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Guaranteed Fresh Groceries at Scheduled Slots
          </h2>
          <p className="text-xs text-emerald-100 font-medium leading-relaxed">
            Consolidated batch delivery saves transit time & ensures 100% stock fulfillment from{' '}
            <span className="underline font-bold">{selectedStore?.name || 'Local Dark Store'}</span>.
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-emerald-100">
            <span className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-amber-300 fill-amber-300" /> 4 Daily Windows
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> Cash on Delivery Only
            </span>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-radial from-amber-400 to-transparent" />
      </div>

      {/* Category Icons Carousel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Shop by Category</h3>
          <Link to="/catalog" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 sm:gap-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
              ))
            : categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/catalog?category=${cat.id}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-xs transition-all duration-200 group text-center"
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center p-1 overflow-hidden">
                    <img
                      src={cat.imageUrl || ''}
                      alt={cat.name}
                      className="h-full w-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2">
                    {cat.name}
                  </span>
                </button>
              ))}
        </div>
      </section>

      {/* Featured Rapid Essentials */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400" />
            <h3 className="text-base font-bold text-slate-900">Featured Daily Essentials</h3>
          </div>
          <Link to="/catalog" className="text-xs font-bold text-emerald-700 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))
            : featuredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  quantityInCart={getQuantityInCart(p.id)}
                  onAddToCart={(prod) => addToCart(prod, 1)}
                  onUpdateQuantity={(prod, qty) => handleUpdateQty(prod, qty)}
                  onClick={(prod) => navigate(`/product/${prod.id}`)}
                />
              ))}
        </div>
      </section>

      {/* Popular in Indiranagar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600 fill-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Trending in Your Area</h3>
          </div>
          <Link to="/catalog" className="text-xs font-bold text-emerald-700 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))
            : popularProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  quantityInCart={getQuantityInCart(p.id)}
                  onAddToCart={(prod) => addToCart(prod, 1)}
                  onUpdateQuantity={(prod, qty) => handleUpdateQty(prod, qty)}
                  onClick={(prod) => navigate(`/product/${prod.id}`)}
                />
              ))}
        </div>
      </section>
    </div>
  );
};
