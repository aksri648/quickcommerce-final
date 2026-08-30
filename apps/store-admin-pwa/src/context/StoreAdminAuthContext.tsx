import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDTO, UserRole, StoreDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';

interface StoreAdminAuthContextType {
  user: UserDTO | null;
  store: StoreDTO | null;
  isLoading: boolean;
  loginAsStoreAdmin: () => Promise<void>;
  logout: () => void;
}

const StoreAdminAuthContext = createContext<StoreAdminAuthContextType | undefined>(undefined);

export const StoreAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [store, setStore] = useState<StoreDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const init = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('qc_storeadmin_token');
      if (token) {
        const profile = await apiRequest<any>('/auth/me');
        setUser(profile);
        if (profile.storeStaff?.[0]?.store) {
          setStore(profile.storeStaff[0].store);
        } else {
          const stores = await apiRequest<StoreDTO[]>('/stores?limit=1');
          setStore(stores[0]);
        }
      } else {
        await loginAsStoreAdmin();
      }
    } catch {
      await loginAsStoreAdmin();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const loginAsStoreAdmin = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: any }>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ role: UserRole.STORE_ADMIN, email: 'storeadmin@quickcommerce.dev' }),
      });
      localStorage.setItem('qc_storeadmin_token', res.token);
      setUser(res.user);

      // Load assigned store
      const stores = await apiRequest<StoreDTO[]>('/stores?limit=1');
      if (stores.length > 0) {
        setStore(stores[0]);
      }
    } catch (err) {
      console.error('Store Admin login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('qc_storeadmin_token');
    setUser(null);
    setStore(null);
  };

  return (
    <StoreAdminAuthContext.Provider value={{ user, store, isLoading, loginAsStoreAdmin, logout }}>
      {children}
    </StoreAdminAuthContext.Provider>
  );
};

export const useStoreAdminAuth = () => {
  const context = useContext(StoreAdminAuthContext);
  if (!context) throw new Error('useStoreAdminAuth must be used within StoreAdminAuthProvider');
  return context;
};
