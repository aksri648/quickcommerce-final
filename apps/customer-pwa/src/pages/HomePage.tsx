import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CategoryDTO, ProductDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { useCart } from '../context/CartContext';
import { ProductCard, Skeleton, Button, formatCurrency } from '@quickcommerce/ui';
import {
  Clock,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  Truck,
  Leaf,
  CheckCircle2,
  KeyRound,
  MapPin,
  ShoppingBag,
  Star,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  Smartphone,
  Check,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { selectedStore, addToCart, cart, updateQuantity } = useCart();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSlotTab, setActiveSlotTab] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const storeIdQuery = selectedStore ? `&storeId=${selectedStore.id}` : '';
        const [cats, products] = await Promise.all([
          apiRequest<CategoryDTO[]>('/products/categories'),
          apiRequest<ProductDTO[]>(`/products?limit=12${storeIdQuery}`),
        ]);

        setCategories(cats);
        setFeaturedProducts(products.slice(0, 8));
      } catch (err) {
        console.error('Marketing Home page data loading error:', err);
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

  const slots = [
    {
      id: 'morning',
      name: 'Morning Slot',
      time: '09:00 AM – 12:00 PM',
      cutoff: 'Order before 08:30 AM',
      icon: '🌅',
      tag: 'Breakfast & Fresh Dairy',
      description: 'Farm-fresh milk, bread, farm eggs, curd, and breakfast cereals delivered right to your morning table.',
      items: ['Amul Taaza Milk', 'Brown Bread', 'Farm Eggs', 'Fresh Curd'],
    },
    {
      id: 'afternoon',
      name: 'Afternoon Slot',
      time: '12:00 PM – 03:00 PM',
      cutoff: 'Order before 11:30 AM',
      icon: '☀️',
      tag: 'Lunch & Daily Staples',
      description: 'Aashirvaad atta, basmati rice, lentils, spices, and fresh cooking vegetables for wholesome midday meals.',
      items: ['Aashirvaad Atta', 'Basmati Rice', 'Toor Dal', 'Potatoes & Onions'],
    },
    {
      id: 'evening',
      name: 'Evening Slot',
      time: '03:00 PM – 06:00 PM',
      cutoff: 'Order before 02:30 PM',
      icon: '🌇',
      tag: 'Tea Time & Snacks',
      description: 'Premium Tata tea, gourmet cookies, evening snacks, cold juices, and fresh fruits for your family tea time.',
      items: ['Tata Tea Gold', 'Biscuits & Cookies', 'Potato Chips', 'Fresh Apples'],
    },
    {
      id: 'night',
      name: 'Night Slot',
      time: '06:00 PM – 09:00 PM',
      cutoff: 'Order before 05:30 PM',
      icon: '🌙',
      tag: 'Dinner & Essentials',
      description: 'Dinner ingredients, packaged dairy, personal hygiene, and midnight pantry restock before the day ends.',
      items: ['Paneer 200g', 'Cooking Oil', 'Instant Noodles', 'Ice Cream'],
    },
  ];

  return (
    <div className="pb-28 space-y-16 animate-fade-in">
      {/* 🚀 HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 text-white pt-8 pb-16 px-4 sm:px-6">
        {/* Glow circles */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-8 relative z-10">
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>The Smarter, Greener Quick Commerce Model for India</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Groceries Delivered on <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">Schedule</span>, Not in Haste.
            </h1>
            <p className="text-sm sm:text-lg text-slate-300 leading-relaxed font-medium">
              Say goodbye to missing items, expired produce, and reckless delivery rush. QuickBlink delivers fresh groceries in <strong>4 daily 3-hour scheduled batch windows</strong> directly from your neighborhood dark store.
            </p>
          </div>

          {/* Primary CTA Group */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="emerald"
              size="lg"
              className="h-12 px-6 text-sm sm:text-base font-black shadow-lg shadow-emerald-600/30"
              onClick={() => navigate('/catalog')}
              leftIcon={<ShoppingBag className="w-5 h-5" />}
            >
              Start Shopping Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-5 text-sm sm:text-base font-bold bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              onClick={() => {
                const el = document.getElementById('slots-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              leftIcon={<Clock className="w-4 h-4 text-amber-400" />}
            >
              View 4 Delivery Slots
            </Button>
          </div>

          {/* 4 Key Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-white block font-bold">4 Scheduled Slots</strong>
                <span className="text-slate-400 text-[11px]">Morning to Night</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <Leaf className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="text-white block font-bold">68% Less Carbon</strong>
                <span className="text-slate-400 text-[11px]">Batch consolidated</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <strong className="text-white block font-bold">Cash on Delivery</strong>
                <span className="text-slate-400 text-[11px]">Pay at doorstep</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-white block font-bold">6-Digit Doorstep OTP</strong>
                <span className="text-slate-400 text-[11px]">100% secure handover</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ⏰ 4-SLOT INTERACTIVE DELIVERY SCHEDULE SHOWCASE */}
      <section id="slots-section" className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Predictable & Batch-Optimized
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Choose from 4 Fixed 3-Hour Windows
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            We pool orders into consolidated delivery runs. Pick the exact slot that fits your day:
          </p>
        </div>

        {/* Slot Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {slots.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveSlotTab(idx)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                activeSlotTab === idx
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-black text-sm">{s.name}</div>
              <div className={`text-[11px] font-semibold ${activeSlotTab === idx ? 'text-emerald-200' : 'text-slate-500'}`}>
                {s.time}
              </div>
            </button>
          ))}
        </div>

        {/* Active Slot Detailed Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 shadow-xs flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="space-y-3 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-200/70 text-emerald-900 font-black text-xs">
              <span>{slots[activeSlotTab].icon}</span>
              <span>{slots[activeSlotTab].tag}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {slots[activeSlotTab].name} ({slots[activeSlotTab].time})
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {slots[activeSlotTab].description}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-100/80 px-3 py-1.5 rounded-xl w-fit">
              <Clock className="w-3.5 h-3.5" />
              <span>{slots[activeSlotTab].cutoff}</span>
            </div>
          </div>

          <div className="w-full md:w-72 bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Popular for this slot
            </span>
            <div className="space-y-2">
              {slots[activeSlotTab].items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Button
              variant="emerald"
              size="sm"
              className="w-full font-bold text-xs"
              onClick={() => navigate('/catalog')}
            >
              Order for {slots[activeSlotTab].name}
            </Button>
          </div>
        </div>
      </section>

      {/* 🛍️ BROWSE POPULAR CATEGORIES */}
      <section className="max-w-5xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Explore Fresh Categories</h3>
            <p className="text-xs text-slate-500">Sourced fresh daily from your local dark store</p>
          </div>
          <Link to="/catalog" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
            All Products <ArrowRight className="h-3.5 w-3.5" />
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

      {/* 🌟 FEATURED ESSENTIALS GRID */}
      <section className="max-w-5xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400" />
            <div>
              <h3 className="text-xl font-black text-slate-900">Featured Daily Essentials</h3>
              <p className="text-xs text-slate-500">In stock at {selectedStore?.name || 'Local Dark Store'}</p>
            </div>
          </div>
          <Link to="/catalog" className="text-xs font-bold text-emerald-700 hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)
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

      {/* ⚖️ WHY SCHEDULED BATCH IS BETTER (10-Min vs QuickBlink) */}
      <section className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" /> Better Economics • Better Ethics
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Why Scheduled Batch Wins Over 10-Minute Rush
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Rushed 10-minute delivery burns fuel, exploits gig workers, and results in stockouts. Here is how QuickBlink fixes it:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-black text-slate-900 text-base">100% Full Order Fulfillment</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Because orders are batched 30 mins before dispatch, dark store pickers pack orders accurately without missing items or forced substitutions.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-black">
              <Leaf className="w-5 h-5" />
            </div>
            <h4 className="font-black text-slate-900 text-base">68% Lower Vehicle Emissions</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instead of 10 individual motorbikes racing for 10 separate items, 1 driver delivers 10 orders in an optimized neighborhood route.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-black text-slate-900 text-base">Zero Payment Disputes (COD)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              No failed online transactions or stuck bank refunds. Pay via Cash on Delivery and verify your handover with a secure 6-digit OTP code.
            </p>
          </div>
        </div>
      </section>

      {/* 🧭 HOW IT WORKS (3 SIMPLE STEPS) */}
      <section className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="p-8 rounded-3xl bg-slate-900 text-white space-y-8">
          <div className="text-center space-y-2 max-w-md mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Simple 3-Step Process
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">How QuickBlink Works</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mx-auto md:mx-0">
                1
              </div>
              <h4 className="font-bold text-base text-white">Search & Fill Cart</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Use our AI hybrid search in English or Hinglish (*"dahi"*, *"atta"*, *"healthy breakfast"*).
              </p>
            </div>

            <div className="space-y-2 text-center md:text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mx-auto md:mx-0">
                2
              </div>
              <h4 className="font-bold text-base text-white">Pick Delivery Slot</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose from Morning, Afternoon, Evening, or Night 3-hour consolidated delivery windows.
              </p>
            </div>

            <div className="space-y-2 text-center md:text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mx-auto md:mx-0">
                3
              </div>
              <h4 className="font-bold text-base text-white">Doorstep Verification</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive your fresh groceries, pay Cash on Delivery, and share your 6-digit OTP with the driver.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <Button
              variant="emerald"
              size="lg"
              className="font-black px-8 text-sm"
              onClick={() => navigate('/catalog')}
            >
              Start Your First Order
            </Button>
          </div>
        </div>
      </section>

      {/* 📊 PLATFORM IMPACT METRICS */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="pt-2 md:pt-0">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 block">50+</span>
            <span className="text-xs text-slate-500 font-medium">Dark Stores in Network</span>
          </div>
          <div className="pt-2 md:pt-0">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 block">1.2M+</span>
            <span className="text-xs text-slate-500 font-medium">Batched Deliveries</span>
          </div>
          <div className="pt-2 md:pt-0">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 block">68%</span>
            <span className="text-xs text-slate-500 font-medium">CO2 Emissions Saved</span>
          </div>
          <div className="pt-2 md:pt-0">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 block">99.8%</span>
            <span className="text-xs text-slate-500 font-medium">On-Time Slot Delivery</span>
          </div>
        </div>
      </section>

      {/* 📍 FOOTER WITH STORE LOCATIONS & PWA CTA */}
      <footer className="max-w-5xl mx-auto px-4 pt-8 border-t border-slate-200 text-xs text-slate-500 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-black text-slate-900 text-base flex items-center justify-center md:justify-start gap-1.5">
              <span>⚡</span> QuickBlink Commerce
            </h4>
            <p className="text-slate-400">Scheduled batch grocery delivery across Bengaluru & NCR.</p>
          </div>
          <div className="flex items-center gap-4 font-bold text-slate-700">
            <Link to="/catalog" className="hover:text-emerald-700">Catalog</Link>
            <Link to="/orders" className="hover:text-emerald-700">My Orders</Link>
            <Link to="/profile" className="hover:text-emerald-700">Profile</Link>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} QuickBlink Commerce Pvt Ltd. All rights reserved. 100% Cash on Delivery & Scheduled Slots.
        </p>
      </footer>
    </div>
  );
};
