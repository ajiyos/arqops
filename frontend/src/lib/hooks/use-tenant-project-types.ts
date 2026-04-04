"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";

export type TenantProjectTypeRow = { id: string; name: string; displayOrder: number };

export const TENANT_PROJECT_TYPES_QUERY_KEY = ["project", "project-types"] as const;

export function useTenantProjectTypesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: TENANT_PROJECT_TYPES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TenantProjectTypeRow[]>>("/api/v1/project/project-types");
      const rows = data.data ?? [];
      return [...rows].sort((a, b) => a.displayOrder - b.displayOrder);
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}
