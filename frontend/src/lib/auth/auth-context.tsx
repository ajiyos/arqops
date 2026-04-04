"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api/client";
import type { AuthResponse } from "@/types";

interface AuthState {
  user: AuthResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post("/api/v1/auth/login", { email, password });
    const authData: AuthResponse = data.data;
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken);
    localStorage.setItem("user", JSON.stringify(authData));
    setUser(authData);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      apiClient.post("/api/v1/auth/logout", { refreshToken }).catch(() => {});
    }
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
