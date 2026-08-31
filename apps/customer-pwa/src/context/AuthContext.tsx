import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDTO, UserRole } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { signIn, signOut as neonSignOut } from '../api/auth';

interface AuthContextType {
  user: UserDTO | null;
  token: string | null;
  isLoading: boolean;
  loginAsDemo: (role?: UserRole, email?: string) => Promise<void>;
  loginWithNeonAuth: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('qc_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const profile = await apiRequest<UserDTO>('/auth/me');
          setUser(profile);
        } catch {
          logout();
        }
      } else {
        // Auto-login as demo customer on first customer visit
        await loginAsDemo(UserRole.CUSTOMER);
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const loginAsDemo = async (role: UserRole = UserRole.CUSTOMER, email?: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserDTO }>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ role, email }),
      });
      localStorage.setItem('qc_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithNeonAuth = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await signIn.email({ email, password });
      if (res && !res.error) {
        const profile = await apiRequest<UserDTO>('/auth/me');
        setUser(profile);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Neon Auth error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      neonSignOut();
    } catch {}
    localStorage.removeItem('qc_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginAsDemo, loginWithNeonAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
