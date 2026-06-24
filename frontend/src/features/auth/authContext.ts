import { createContext } from "react";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "analyst" | "editor" | "viewer";
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
