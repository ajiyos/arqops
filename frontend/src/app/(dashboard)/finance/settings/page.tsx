"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse } from "@/types";

type FinanceSettingsTab = "sac" | "expense_categories";

type SacCodeDto = {
  id: string;
  code: string;
  description: string;
  displayOrder: number;
};

type SacDraft = { code: string; description: string };

function sacServerToDrafts(rows: SacCodeDto[] | undefined): SacDraft[] {
  const sorted = [...(rows ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  if (sorted.length === 0) {
    return [{ code: "", description: "" }];
  }
  return sorted.map((r) => ({
    code: r.code,
    description: r.description ?? "",
  }));
}

function sacNormalizeForCompare(drafts: SacDraft[]) {
  return drafts
    .map((d) => ({
      code: d.code.trim(),
      description: d.description.trim(),
    }))
    .filter((d) => d.code);
}

function sacDraftsEqual(a: SacDraft[], b: SacDraft[]) {
  return JSON.stringify(sacNormalizeForCompare(a)) === JSON.stringify(sacNormalizeForCompare(b));
}

type ExpenseCategoryDto = {
  id: string;
  name: string;
  displayOrder: number;
};

type ExpenseCatDraft = { name: string };

function expenseServerToDrafts(rows: ExpenseCategoryDto[] | undefined): ExpenseCatDraft[] {
  const sorted = [...(rows ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  if (sorted.length === 0) {
    return [{ name: "" }];
  }
  return sorted.map((r) => ({ name: r.name }));
}

function expenseNormalizeForCompare(drafts: ExpenseCatDraft[]) {
  return drafts
    .map((d) => ({ name: d.name.trim() }))
    .filter((d) => d.name);
}

function expenseDraftsEqual(a: ExpenseCatDraft[], b: ExpenseCatDraft[]) {
  return (
    JSON.stringify(expenseNormalizeForCompare(a)) === JSON.stringify(expenseNormalizeForCompare(b))
  );
}

export default function FinanceSettingsPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isTenantAdmin = user?.roles?.includes("TENANT_ADMIN") ?? false;

  const [settingsTab, setSettingsTab] = useState<FinanceSettingsTab>("sac");
  const [sacDrafts, setSacDrafts] = useState<SacDraft[]>([{ code: "", description: "" }]);
  const [expenseDrafts, setExpenseDrafts] = useState<ExpenseCatDraft[]>([{ name: "" }]);

  const { data: sacRows, isLoading: sacLoading } = useQuery({
    queryKey: ["finance", "sac-codes"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SacCodeDto[]>>("/api/v1/finance/sac-codes");
      return data.data ?? [];
    },
    enabled: isTenantAdmin,
  });

  const { data: expenseRows, isLoading: expenseLoading } = useQuery({
    queryKey: ["finance", "expense-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ExpenseCategoryDto[]>>(
        "/api/v1/finance/expense-categories",
      );
      return data.data ?? [];
    },
    enabled: isTenantAdmin,
  });

  const sacServerDrafts = useMemo(() => sacServerToDrafts(sacRows), [sacRows]);
  const sacServerSnapshot = useMemo(
    () => JSON.stringify(sacNormalizeForCompare(sacServerDrafts)),
    [sacServerDrafts],
  );

  useEffect(() => {
    setSacDrafts(sacServerToDrafts(sacRows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacServerSnapshot]);

  const expenseServerDrafts = useMemo(() => expenseServerToDrafts(expenseRows), [expenseRows]);
  const expenseServerSnapshot = useMemo(
    () => JSON.stringify(expenseNormalizeForCompare(expenseServerDrafts)),
    [expenseServerDrafts],
  );

  useEffect(() => {
    setExpenseDrafts(expenseServerToDrafts(expenseRows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseServerSnapshot]);

  const saveSacMutation = useMutation({
    mutationFn: async () => {
      const codes = sacNormalizeForCompare(sacDrafts).map((d) => ({
        code: d.code,
        description: d.description || "",
      }));
      await apiClient.put("/api/v1/finance/sac-codes", { codes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "sac-codes"] });
    },
  });

  const saveExpenseMutation = useMutation({
    mutationFn: async () => {
      const categories = expenseNormalizeForCompare(expenseDrafts).map((d) => ({ name: d.name }));
      await apiClient.put("/api/v1/finance/expense-categories", { categories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expense-categories"] });
    },
  });

  const sacDirty = useMemo(() => !sacDraftsEqual(sacDrafts, sacServerDrafts), [sacDrafts, sacServerDrafts]);
  const expenseDirty = useMemo(
    () => !expenseDraftsEqual(expenseDrafts, expenseServerDrafts),
    [expenseDrafts, expenseServerDrafts],
  );

  const moveSacRow = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sacDrafts.length) return;
    setSacDrafts((r) => {
      const next = [...r];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const moveExpenseRow = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= expenseDrafts.length) return;
    setExpenseDrafts((r) => {
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

  if (!isTenantAdmin) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Finance settings</h1>
        <p className="text-muted-foreground">
          Only tenant administrators can configure SAC codes and expense categories.
        </p>
        <Button asChild variant="outline">
          <Link href="/finance/invoices">Back to finance</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/finance/invoices" aria-label="Back to finance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finance settings</h2>
          <p className="text-sm text-muted-foreground">
            Workspace-wide defaults for invoicing and expense reporting. Visible only to tenant administrators.
          </p>
        </div>
      </div>

      <div
        className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
        role="tablist"
        aria-label="Finance settings section"
      >
        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === "sac"}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            settingsTab === "sac"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setSettingsTab("sac")}
        >
          SAC codes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === "expense_categories"}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            settingsTab === "expense_categories"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setSettingsTab("expense_categories")}
        >
          Expense categories
        </button>
      </div>

      {settingsTab === "sac" && (
        <Card>
          <CardHeader>
            <CardTitle>SAC codes</CardTitle>
            <CardDescription>
              Service Accounting Codes for GST invoices (typically six digits). Order controls how they appear in the
              invoice form dropdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sacLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {sacDrafts.map((row, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-card/50 p-3"
                    >
                      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,140px)_1fr]">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground" htmlFor={`sac-code-${i}`}>
                            Code
                          </label>
                          <Input
                            id={`sac-code-${i}`}
                            value={row.code}
                            onChange={(e) =>
                              setSacDrafts((d) => {
                                const next = [...d];
                                next[i] = { ...next[i], code: e.target.value };
                                return next;
                              })
                            }
                            placeholder="e.g. 998361"
                            maxLength={10}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground" htmlFor={`sac-desc-${i}`}>
                            Description
                          </label>
                          <Input
                            id={`sac-desc-${i}`}
                            value={row.description}
                            onChange={(e) =>
                              setSacDrafts((d) => {
                                const next = [...d];
                                next[i] = { ...next[i], description: e.target.value };
                                return next;
                              })
                            }
                            placeholder="Short label (optional)"
                            maxLength={255}
                          />
                        </div>
                      </div>
                      <div className="ml-auto flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={i === 0}
                          onClick={() => moveSacRow(i, -1)}
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={i === sacDrafts.length - 1}
                          onClick={() => moveSacRow(i, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          onClick={() =>
                            setSacDrafts((d) => {
                              const next = d.filter((_, idx) => idx !== i);
                              return next.length > 0 ? next : [{ code: "", description: "" }];
                            })
                          }
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSacDrafts((d) => [...d, { code: "", description: "" }])}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add SAC code
                </Button>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    type="button"
                    disabled={saveSacMutation.isPending || !sacDirty}
                    onClick={() => saveSacMutation.mutate()}
                  >
                    {saveSacMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  {saveSacMutation.isError && (
                    <p className="text-sm text-destructive">
                      Could not save. Check for duplicates or invalid values.
                    </p>
                  )}
                  {saveSacMutation.isSuccess && !sacDirty && (
                    <p className="text-sm text-muted-foreground">Saved.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {settingsTab === "expense_categories" && (
        <Card>
          <CardHeader>
            <CardTitle>Expense categories</CardTitle>
            <CardDescription>
              Labels users pick when logging expenses. New workspaces start with a standard set; you can rename, reorder,
              add, or remove entries (names must be unique, max 50 characters).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {expenseLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {expenseDrafts.map((row, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-card/50 p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground" htmlFor={`exp-cat-${i}`}>
                          Category name
                        </label>
                        <Input
                          id={`exp-cat-${i}`}
                          value={row.name}
                          onChange={(e) =>
                            setExpenseDrafts((d) => {
                              const next = [...d];
                              next[i] = { ...next[i], name: e.target.value };
                              return next;
                            })
                          }
                          placeholder="e.g. Travel"
                          maxLength={50}
                        />
                      </div>
                      <div className="ml-auto flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={i === 0}
                          onClick={() => moveExpenseRow(i, -1)}
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={i === expenseDrafts.length - 1}
                          onClick={() => moveExpenseRow(i, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          onClick={() =>
                            setExpenseDrafts((d) => {
                              const next = d.filter((_, idx) => idx !== i);
                              return next.length > 0 ? next : [{ name: "" }];
                            })
                          }
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setExpenseDrafts((d) => [...d, { name: "" }])}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add category
                </Button>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    type="button"
                    disabled={saveExpenseMutation.isPending || !expenseDirty}
                    onClick={() => saveExpenseMutation.mutate()}
                  >
                    {saveExpenseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  {saveExpenseMutation.isError && (
                    <p className="text-sm text-destructive">
                      Could not save. Check for duplicate names or values over 50 characters.
                    </p>
                  )}
                  {saveExpenseMutation.isSuccess && !expenseDirty && (
                    <p className="text-sm text-muted-foreground">Saved.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
