import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../../services/api";
import { useAppDispatch } from "../../store";
import { setUser } from "./authSlice";
import { AuthContext, type User } from "./authContext";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        setUserState(response.data);
        dispatch(setUser(response.data));
      } catch {
        setUserState(null);
        dispatch(setUser(null));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    await api.post("/auth/login", { email, password });
    const userResponse = await api.get("/auth/me");
    setUserState(userResponse.data);
    dispatch(setUser(userResponse.data));
  };

  const logout = async () => {
    await api.post("/auth/logout");
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
