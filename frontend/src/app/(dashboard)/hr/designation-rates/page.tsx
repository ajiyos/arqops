"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiResponse } from "@/types";

type RateDto = {
  id: string;
  designation: string;
  hourlyRate: number;
  displayOrder: number;
};

type RateDraft = { designation: string; hourlyRate: string };

function serverToDrafts(rows: RateDto[] | undefined): RateDraft[] {
  const sorted = [...(rows ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  if (sorted.length === 0) {
    return [{ designation: "", hourlyRate: "0" }];
  }
  return sorted.map((r) => ({
    designation: r.designation,
    hourlyRate: String(r.hourlyRate),
  }));
}

function normalizeDrafts(drafts: RateDraft[]) {
  return drafts
    .map((d) => ({
      designation: d.designation.trim(),
      hourlyRate: d.hourlyRate.trim(),
    }))
    .filter((d) => d.designation);
}

function draftsEqual(a: RateDraft[], b: RateDraft[]) {
  return JSON.stringify(normalizeDrafts(a)) === JSON.stringify(normalizeDrafts(b));
}

export default function DesignationRatesPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const canEdit =
    (user?.roles?.includes("TENANT_ADMIN") ?? false) || (user?.roles?.includes("HR_ADMIN") ?? false);

  const [drafts, setDrafts] = useState<RateDraft[]>([{ designation: "", hourlyRate: "0" }]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["hr", "designation-rates"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RateDto[]>>("/api/v1/hr/designation-rates");
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
      const normalized = normalizeDrafts(drafts);
      const rates = normalized.map((d) => ({
        designation: d.designation,
        hourlyRate: Number(d.hourlyRate),
      }));
      for (const r of rates) {
        if (Number.isNaN(r.hourlyRate) || r.hourlyRate < 0) {
          throw new Error("Each hourly rate must be a number ≥ 0");
        }
      }
      await apiClient.put("/api/v1/hr/designation-rates", { rates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "designation-rates"] });
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Designation rates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Hourly rates by job title for billable labor on projects. Employees must use one of these designations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hourly rates</CardTitle>
          <CardDescription>
            Order matches the employee designation dropdown. Used when rolling up billable timesheet hours into project
            budget actuals.
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
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Designation"
                        value={row.designation}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setDrafts((d) => d.map((x, i) => (i === index ? { ...x, designation: e.target.value } : x)))
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Hourly rate"
                        value={row.hourlyRate}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setDrafts((d) => d.map((x, i) => (i === index ? { ...x, hourlyRate: e.target.value } : x)))
                        }
                      />
                    </div>
                    {canEdit && (
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
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDrafts((d) => [...d, { designation: "", hourlyRate: "0" }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add designation
                </Button>
              )}
              {canEdit && (
                <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                  <Button
                    type="button"
                    disabled={!dirty || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save changes
                  </Button>
                  {!dirty && <span className="text-sm text-muted-foreground">All changes saved.</span>}
                  {saveMutation.isError && (
                    <span className="text-sm text-destructive">
                      {saveMutation.error instanceof Error ? saveMutation.error.message : "Save failed"}
                    </span>
                  )}
                </div>
              )}
              {!canEdit && (
                <p className="text-sm text-muted-foreground">
                  Only tenant administrators and HR admins can edit designation rates. You can still view this list when
                  adding employees.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
