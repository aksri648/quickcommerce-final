import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDTO, UserRole } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';

interface GodAdminAuthContextType {
  user: UserDTO | null;
  isLoading: boolean;
  loginAsGodAdmin: () => Promise<void>;
  logout: () => void;
}

const GodAdminAuthContext = createContext<GodAdminAuthContextType | undefined>(undefined);

export const GodAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const init = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('qc_godadmin_token');
      if (token) {
        const profile = await apiRequest<UserDTO>('/auth/me');
        setUser(profile);
      } else {
        await loginAsGodAdmin();
      }
    } catch {
      await loginAsGodAdmin();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const loginAsGodAdmin = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserDTO }>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ role: UserRole.SUPER_ADMIN, email: 'god@quickcommerce.dev' }),
      });
      localStorage.setItem('qc_godadmin_token', res.token);
      setUser(res.user);
    } catch (err) {
      console.error('God Admin login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('qc_godadmin_token');
    setUser(null);
  };

  return (
    <GodAdminAuthContext.Provider value={{ user, isLoading, loginAsGodAdmin, logout }}>
      {children}
    </GodAdminAuthContext.Provider>
  );
};

export const useGodAdminAuth = () => {
  const context = useContext(GodAdminAuthContext);
  if (!context) throw new Error('useGodAdminAuth must be used within GodAdminAuthProvider');
  return context;
};
