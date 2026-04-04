"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiResponse } from "@/types";
import {
  TENANT_PROJECT_TYPES_QUERY_KEY,
  type TenantProjectTypeRow,
} from "@/lib/hooks/use-tenant-project-types";

type TypeDraft = { name: string };

function serverToDrafts(rows: TenantProjectTypeRow[] | undefined): TypeDraft[] {
  const sorted = [...(rows ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  if (sorted.length === 0) {
    return [{ name: "" }];
  }
  return sorted.map((r) => ({ name: r.name }));
}

function normalizeDrafts(drafts: TypeDraft[]) {
  return drafts
    .map((d) => ({ name: d.name.trim() }))
    .filter((d) => d.name);
}

function draftsEqual(a: TypeDraft[], b: TypeDraft[]) {
  return JSON.stringify(normalizeDrafts(a)) === JSON.stringify(normalizeDrafts(b));
}

export default function SettingsProjectTypesPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isTenantAdmin = user?.roles?.includes("TENANT_ADMIN") ?? false;

  const [drafts, setDrafts] = useState<TypeDraft[]>([{ name: "" }]);

  const { data: rows, isLoading } = useQuery({
    queryKey: TENANT_PROJECT_TYPES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TenantProjectTypeRow[]>>("/api/v1/project/project-types");
      return data.data ?? [];
    },
  });

  const serverDrafts = useMemo(() => serverToDrafts(rows), [rows]);
  const serverSnapshot = useMemo(() => JSON.stringify(normalizeDrafts(serverDrafts)), [serverDrafts]);

  useEffect(() => {
    setDrafts(serverToDrafts(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSnapshot]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const types = normalizeDrafts(drafts).map((d) => ({ name: d.name }));
      await apiClient.put("/api/v1/project/project-types", { types });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_PROJECT_TYPES_QUERY_KEY });
    },
  });

  const dirty = useMemo(() => !draftsEqual(drafts, serverDrafts), [drafts, serverDrafts]);

  const moveRow = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= drafts.length) return;
    setDrafts((r) => {
      const next = [...r];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Project types</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Types of work your firm delivers. Used when creating leads and projects, and for phase/task templates under{" "}
            <Link href="/projects/settings" className="text-primary underline-offset-4 hover:underline">
              Project defaults
            </Link>
            .
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured types</CardTitle>
          <CardDescription>
            Order matches dropdowns across the app. Names must be unique (case-insensitive). Seeded defaults: Residential,
            Commercial, Interior, Landscape.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {drafts.map((row, index) => (
                  <li
                    key={index}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center"
                  >
                    <Input
                      placeholder="e.g. Residential"
                      value={row.name}
                      disabled={!isTenantAdmin}
                      onChange={(e) =>
                        setDrafts((d) => d.map((x, i) => (i === index ? { ...x, name: e.target.value } : x)))
                      }
                      className="max-w-md"
                    />
                    {isTenantAdmin && (
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => moveRow(index, -1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Move down"
                          disabled={index === drafts.length - 1}
                          onClick={() => moveRow(index, 1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Remove row"
                          onClick={() => setDrafts((d) => d.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {isTenantAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDrafts((d) => [...d, { name: "" }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add type
                </Button>
              )}
              {isTenantAdmin && (
                <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                  <Button type="button" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save changes
                  </Button>
                  {!dirty && <span className="text-sm text-muted-foreground">All changes saved.</span>}
                  {saveMutation.isError && (
                    <span className="text-sm text-destructive">Save failed. Check for duplicates or blank rows.</span>
                  )}
                </div>
              )}
              {!isTenantAdmin && (
                <p className="text-sm text-muted-foreground">
                  Only tenant administrators can edit project types. You can still use them when creating leads and
                  projects.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
