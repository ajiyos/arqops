"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { ApiResponse, TenantProfileResponse } from "@/types";
import {
  applyTenantThemeToDocument,
  parseThemeFromSettings,
  resetTenantThemeToDefault,
  type TenantThemeSettings,
} from "./tenant-theme";

const TenantBrandingContext = createContext<TenantProfileResponse | undefined>(undefined);

export function useTenantBrandingProfile(): TenantProfileResponse | undefined {
  return useContext(TenantBrandingContext);
}

export function TenantBrandingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<TenantProfileResponse>>("/api/v1/tenant/profile");
      return res.data ?? null;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const theme = useMemo(() => parseThemeFromSettings(data?.settings ?? null), [data?.settings]);

  useEffect(() => {
    if (!isAuthenticated || !data) {
      resetTenantThemeToDefault();
      document.title = "ArqOps";
      return;
    }
    applyTenantThemeToDocument(theme);
    const firm = data.name?.trim();
    document.title = firm ? `${firm} · ArqOps` : "ArqOps";
  }, [isAuthenticated, data, theme]);

  return <TenantBrandingContext.Provider value={data ?? undefined}>{children}</TenantBrandingContext.Provider>;
}

export type { TenantThemeSettings };
