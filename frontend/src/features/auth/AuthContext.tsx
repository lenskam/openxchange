import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../../services/api';
import { useAppDispatch } from '../../store';
import { setUser } from './authSlice';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'editor' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        setUserState(response.data);
        dispatch(setUser(response.data));
      } catch (error) {
        // Not authenticated
        setUserState(null);
        dispatch(setUser(null));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    await api.post('/auth/login', { email, password });
    // User data will be fetched by /me endpoint, but we can set it from response if available
    const userResponse = await api.get('/auth/me');
    setUserState(userResponse.data);
    dispatch(setUser(userResponse.data));
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUserState(null);
    dispatch(setUser(null));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
