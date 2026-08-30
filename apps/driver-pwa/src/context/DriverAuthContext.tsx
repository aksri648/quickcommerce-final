import React, { createContext, useContext, useState, useEffect } from 'react';
import { DriverDTO, UserRole } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';

interface DriverAuthContextType {
  driver: DriverDTO | null;
  isLoading: boolean;
  loginAsDriver: () => Promise<void>;
  updateStatus: (status: 'AVAILABLE' | 'BUSY' | 'OFFLINE') => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const DriverAuthContext = createContext<DriverAuthContextType | undefined>(undefined);

export const DriverAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriver] = useState<DriverDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const profile = await apiRequest<DriverDTO>('/drivers/me');
      setDriver(profile);
    } catch {
      setDriver(null);
    }
  };

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('qc_driver_token');
      if (token) {
        await refreshProfile();
      } else {
        await loginAsDriver();
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const loginAsDriver = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string }>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ role: UserRole.DRIVER, email: 'driver@quickcommerce.dev' }),
      });
      localStorage.setItem('qc_driver_token', res.token);
      await refreshProfile();
    } catch (err) {
      console.error('Driver login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: 'AVAILABLE' | 'BUSY' | 'OFFLINE') => {
    try {
      const updated = await apiRequest<DriverDTO>('/drivers/me/status', {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setDriver((prev) => (prev ? { ...prev, status: updated.status, isAvailable: updated.isAvailable } : null));
    } catch (err) {
      console.error('Failed to update driver status:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('qc_driver_token');
    setDriver(null);
  };

  return (
    <DriverAuthContext.Provider
      value={{ driver, isLoading, loginAsDriver, updateStatus, refreshProfile, logout }}
    >
      {children}
    </DriverAuthContext.Provider>
  );
};

export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (!context) throw new Error('useDriverAuth must be used within DriverAuthProvider');
  return context;
};
