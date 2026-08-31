import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartDTO, StoreDTO, ProductDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartDTO | null;
  selectedStore: StoreDTO | null;
  isLoading: boolean;
  selectStore: (store: StoreDTO, forceClearCart?: boolean) => Promise<void>;
  addToCart: (product: ProductDTO, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreDTO | null>(() => {
    const saved = localStorage.getItem('qc_selected_store');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedStore) {
      // Fetch default store
      apiRequest<StoreDTO[]>('/stores?limit=1').then((stores) => {
        if (stores && stores.length > 0) {
          setSelectedStore(stores[0]);
          localStorage.setItem('qc_selected_store', JSON.stringify(stores[0]));
        }
      }).catch(() => {});
    }
  }, [selectedStore]);

  const refreshCart = async () => {
    if (!user) return;
    try {
      const currentCart = await apiRequest<CartDTO>('/cart');
      setCart(currentCart);
    } catch {
      setCart(null);
    }
  };

  useEffect(() => {
    if (user) {
      refreshCart();
    }
  }, [user]);

  const selectStore = async (store: StoreDTO, forceClearCart: boolean = false) => {
    if (cart && cart.storeId !== store.id && !forceClearCart) {
      throw new Error('Changing store will clear your cart.');
    }
    if (forceClearCart && cart) {
      await apiRequest('/cart', { method: 'DELETE' });
      setCart(null);
    }
    setSelectedStore(store);
    localStorage.setItem('qc_selected_store', JSON.stringify(store));
  };

  const updateQueue = useRef<Promise<void>>(Promise.resolve());

  const addToCart = async (product: ProductDTO, quantity: number = 1) => {
    if (!selectedStore) return;
    if (quantity < 1) throw new Error('Quantity must be greater than zero');
    setIsLoading(true);
    try {
      const updated = await apiRequest<CartDTO>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          storeId: selectedStore.id,
          productId: product.id,
          quantity,
        }),
      });
      setCart(updated);
    } catch (err) {
      console.error('Failed to add to cart:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;
    updateQueue.current = updateQueue.current.then(async () => {
      setIsLoading(true);
      try {
        const updated = await apiRequest<CartDTO>(`/cart/items/${cartItemId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        });
        setCart(updated);
      } catch (err) {
        console.error('Failed to update quantity:', err);
      } finally {
        setIsLoading(false);
      }
    });
    return updateQueue.current;
  };

  const clearCart = async () => {
    try {
      await apiRequest('/cart', { method: 'DELETE' });
      setCart(null);
    } catch (err) {
      console.error('Failed to clear cart:', err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        selectedStore,
        isLoading,
        selectStore,
        addToCart,
        updateQuantity,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
