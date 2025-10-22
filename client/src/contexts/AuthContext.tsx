import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@shared/types';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Načtení uživatele při mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await api.get<User>('/auth/user');
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      localStorage.setItem('auth_token', response.token);
      await refreshUser();
      toast({
        title: 'Přihlášení úspěšné',
        description: 'Vítejte zpět!',
      });
    } catch (error: any) {
      toast({
        title: 'Chyba přihlášení',
        description: error.response?.data?.message || 'Nepodařilo se přihlásit',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      localStorage.setItem('auth_token', response.token);
      await refreshUser();
      toast({
        title: 'Registrace úspěšná',
        description: 'Váš účet byl vytvořen',
      });
    } catch (error: any) {
      toast({
        title: 'Chyba registrace',
        description: error.response?.data?.message || 'Nepodařilo se zaregistrovat',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
      toast({
        title: 'Odhlášení',
        description: 'Byli jste úspěšně odhlášeni',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
