"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { downloadAuthenticatedBlob, uploadFileToGoogleDrive } from "@/lib/google-drive-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, Expense, Project } from "@/types";

type ExpenseCategoryOption = {
  id: string;
  name: string;
  displayOrder: number;
};

const PAGE_SIZE = 20;
const SEARCH_FETCH_SIZE = 500;

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const emptyForm = () => ({
  projectId: "",
  category: "",
  amount: "",
  expenseDate: "",
  description: "",
  receiptStorageKey: undefined as string | undefined,
});

export default function FinanceExpensesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const trimmedSearch = search.trim().toLowerCase();

  useEffect(() => {
    if (trimmedSearch) setPage(0);
  }, [trimmedSearch]);

  const { data: projectsData } = useQuery({
    queryKey: ["projects", "expenses-lookup"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Project[]>>("/api/v1/project/projects", {
        params: { page: 0, size: 500 },
      });
      return data.data ?? [];
    },
  });

  const projectById = useMemo(() => {
    const m = new Map<string, string>();
    (projectsData ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projectsData]);

  const { data: expenseCategoryCatalog } = useQuery({
    queryKey: ["finance", "expense-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ExpenseCategoryOption[]>>(
        "/api/v1/finance/expense-categories",
      );
      return data.data ?? [];
    },
  });

  const categorySelectOptions = useMemo(() => {
    return [...(expenseCategoryCatalog ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [expenseCategoryCatalog]);

  const categoryOptionsForForm = useMemo(() => {
    const base = categorySelectOptions;
    if (form.category && !base.some((o) => o.name === form.category)) {
      return [
        { id: "__legacy__", name: form.category, displayOrder: -1 },
        ...base,
      ];
    }
    return base;
  }, [categorySelectOptions, form.category]);

  const useCategoryCatalog = categorySelectOptions.length > 0;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["finance", "expenses", trimmedSearch || null, trimmedSearch ? 0 : page],
    queryFn: async () => {
      const useSearchFetch = Boolean(trimmedSearch);
      const { data: res } = await apiClient.get<ApiResponse<Expense[]>>("/api/v1/finance/expenses", {
        params: {
          page: useSearchFetch ? 0 : page,
          size: useSearchFetch ? SEARCH_FETCH_SIZE : PAGE_SIZE,
        },
      });
      return { list: res.data ?? [], meta: res.meta };
    },
  });

  const list = data?.list ?? [];
  const meta = data?.meta;

  const displayList = useMemo(() => {
    if (!trimmedSearch) return list;
    return list.filter((row) => {
      const cat = (row.category ?? "").toLowerCase();
      const desc = (row.description ?? "").toLowerCase();
      return cat.includes(trimmedSearch) || desc.includes(trimmedSearch);
    });
  }, [list, trimmedSearch]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amountNum = Number(form.amount);
      let receiptStorageKey = form.receiptStorageKey?.trim() || undefined;
      if (receiptFile) {
        receiptStorageKey = await uploadFileToGoogleDrive(receiptFile, "finance/expenses");
      }
      const body = {
        projectId: form.projectId.trim() ? form.projectId.trim() : undefined,
        category: form.category.trim(),
        amount: amountNum,
        expenseDate: form.expenseDate,
        description: form.description.trim() || undefined,
        receiptStorageKey,
      };
      if (editingId) {
        const { data: res } = await apiClient.put<ApiResponse<Expense>>(
          `/api/v1/finance/expenses/${editingId}`,
          body
        );
        return res.data;
      }
      const { data: res } = await apiClient.post<ApiResponse<Expense>>("/api/v1/finance/expenses", body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      setFormModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setReceiptFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/finance/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setReceiptFile(null);
    setFormModalOpen(true);
  }

  function openEdit(row: Expense) {
    setEditingId(row.id);
    setReceiptFile(null);
    setForm({
      projectId: row.projectId ?? "",
      category: row.category,
      amount: String(row.amount),
      expenseDate: toDateInputValue(row.expenseDate),
      description: row.description ?? "",
      receiptStorageKey: row.receiptStorageKey,
    });
    setFormModalOpen(true);
  }

  async function downloadReceipt(expenseId: string) {
    try {
      const blob = await downloadAuthenticatedBlob(`/api/v1/finance/expenses/${expenseId}/receipt/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch {
      // axios error — user sees network failure
    }
  }

  const showPagination = !trimmedSearch && meta && meta.totalPages > 1;
  const formPending = saveMutation.isPending;
  const deletePending = deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="shrink-0 text-3xl font-bold">Expenses</h1>
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search by category or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search expenses"
            />
          </div>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          New Expense
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Amount (INR)</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 w-[140px] font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Loading expenses…
                      </span>
                    </td>
                  </tr>
                )}
                {isError && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-destructive">
                      Could not load expenses.
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && displayList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      {trimmedSearch ? "No expenses match your search." : "No expenses yet."}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !isError &&
                  displayList.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(row.expenseDate)}</td>
                      <td className="px-4 py-3 font-medium">{row.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(row.amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.projectId ? projectById.get(row.projectId) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={row.description}>
                        {row.description ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {row.receiptStorageKey ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Download receipt for ${row.category}`}
                              onClick={() => void downloadReceipt(row.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit expense ${row.category}`}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Delete expense ${row.category}`}
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {showPagination && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {meta!.page + 1} of {meta!.totalPages} ({meta!.totalElements} total)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= meta!.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            onClick={() => {
              if (!formPending) {
                setFormModalOpen(false);
                setEditingId(null);
                setForm(emptyForm());
                setReceiptFile(null);
              }
            }}
          />
          <Card className="relative z-10 w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{editingId ? "Edit expense" : "New expense"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="expense-form-project" className="text-sm font-medium">
                  Project (optional)
                </label>
                <select
                  id="expense-form-project"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                >
                  <option value="">None</option>
                  {(projectsData ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="expense-form-category" className="text-sm font-medium">
                  Category
                </label>
                {useCategoryCatalog ? (
                  <select
                    id="expense-form-category"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    required
                  >
                    <option value="">Select category</option>
                    {categoryOptionsForForm.map((o) => (
                      <option key={o.id} value={o.name}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="expense-form-category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Travel (configure list under Finance settings)"
                    required
                  />
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="expense-form-amount" className="text-sm font-medium">
                  Amount (INR)
                </label>
                <Input
                  id="expense-form-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="expense-form-date" className="text-sm font-medium">
                  Date
                </label>
                <Input
                  id="expense-form-date"
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="expense-form-description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="expense-form-description"
                  className={cn(
                    "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="expense-form-receipt" className="text-sm font-medium">
                  Receipt (optional)
                </label>
                <Input
                  id="expense-form-receipt"
                  type="file"
                  className="cursor-pointer"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                {receiptFile ? (
                  <p className="text-xs text-muted-foreground">New file: {receiptFile.name}</p>
                ) : editingId && form.receiptStorageKey ? (
                  <p className="text-xs text-muted-foreground">Existing receipt on file. Choose a file to replace it.</p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (!formPending) {
                      setFormModalOpen(false);
                      setEditingId(null);
                      setForm(emptyForm());
                      setReceiptFile(null);
                    }
                  }}
                  disabled={formPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    !form.category.trim() ||
                    form.amount.trim() === "" ||
                    !Number.isFinite(Number(form.amount)) ||
                    !form.expenseDate ||
                    formPending
                  }
                  onClick={() => saveMutation.mutate()}
                >
                  {formPending && (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving…
                    </span>
                  )}
                  {!formPending && (editingId ? "Save" : "Create")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cancel delete"
            onClick={() => !deletePending && setDeleteTarget(null)}
          />
          <Card className="relative z-10 w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Delete expense?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will remove{" "}
                <span className="font-medium text-foreground">{deleteTarget.category}</span>
                {deleteTarget.description ? (
                  <>
                    {" "}
                    <span className="text-foreground">({deleteTarget.description})</span>
                  </>
                ) : null}{" "}
                from the list. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setDeleteTarget(null)} disabled={deletePending}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletePending}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                >
                  {deletePending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Deleting…
                    </span>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
