"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import platformApi from "./platform-api";

export interface PlatformUser {
  userId: string;
  name: string;
  email: string;
}

interface SiteAdminAuthState {
  user: PlatformUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const SiteAdminAuthContext = createContext<SiteAdminAuthState | undefined>(undefined);

function clearPlatformSession() {
  localStorage.removeItem("platformAccessToken");
  localStorage.removeItem("platformRefreshToken");
  localStorage.removeItem("platformUser");
}

export function SiteAdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("platformAccessToken");
    const stored = localStorage.getItem("platformUser");
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clearPlatformSession();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await platformApi.post("/api/v1/platform/auth/login", { email, password });
    const resp = data.data;
    const platformUser: PlatformUser = {
      userId: resp.userId,
      name: resp.name,
      email: resp.email,
    };
    localStorage.setItem("platformAccessToken", resp.accessToken);
    localStorage.setItem("platformRefreshToken", resp.refreshToken);
    localStorage.setItem("platformUser", JSON.stringify(platformUser));
    setUser(platformUser);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("platformRefreshToken");
    if (refreshToken) {
      platformApi.post("/api/v1/platform/auth/logout", { refreshToken }).catch(() => {});
    }
    clearPlatformSession();
    setUser(null);
  }, []);

  return (
    <SiteAdminAuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </SiteAdminAuthContext.Provider>
  );
}

export function useSiteAdminAuth() {
  const ctx = useContext(SiteAdminAuthContext);
  if (!ctx) throw new Error("useSiteAdminAuth must be used within SiteAdminAuthProvider");
  return ctx;
}
