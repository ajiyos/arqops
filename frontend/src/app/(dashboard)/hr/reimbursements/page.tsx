"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, Employee, PageMeta, ReimbursementRecord } from "@/types";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2, Plus } from "lucide-react";

const PAGE_SIZE = 20;

const MANAGER_ROLES = new Set(["TENANT_ADMIN", "HR_ADMIN"]);

const SELECT_TRIGGER_CLASS = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const TEXTAREA_CLASS = cn(
  "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

type ReimbursementStatusFilter = "all" | "pending" | "approved" | "rejected";

function useIsHrManager(): boolean {
  const { user } = useAuth();
  return (user?.roles ?? []).some((r) => MANAGER_ROLES.has(r));
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (s === "rejected") {
    return "bg-red-500/10 text-red-700 dark:text-red-400";
  }
  if (s === "pending") {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
  }
  return "bg-muted text-muted-foreground";
}

export default function HrReimbursementsPage() {
  const queryClient = useQueryClient();
  const isManager = useIsHrManager();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReimbursementStatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    category: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "reimbursements", page, statusFilter],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<ReimbursementRecord[]>>("/api/v1/hr/reimbursements", {
        params: {
          page,
          size: PAGE_SIZE,
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        },
      });
      return { items: res.data ?? [], meta: res.meta };
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["hr", "employees", "reimbursement-names"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Employee[]>>("/api/v1/hr/employees", {
        params: { page: 0, size: 500 },
      });
      return res.data ?? [];
    },
  });

  const employeesSorted = useMemo(() => {
    return [...(employees ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    (employees ?? []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [employees]);

  const items = data?.items ?? [];
  const meta: PageMeta | undefined = data?.meta;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const amountNum = Number(form.amount);
      await apiClient.post("/api/v1/hr/reimbursements", {
        employeeId: form.employeeId,
        category: form.category.trim(),
        amount: amountNum,
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "reimbursements"] });
      setModalOpen(false);
      setForm({ employeeId: "", category: "", amount: "", description: "" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/hr/reimbursements/${id}/approve`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr", "reimbursements"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/hr/reimbursements/${id}/reject`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr", "reimbursements"] }),
  });

  const canSubmit =
    Boolean(form.employeeId) && form.category.trim().length > 0 && form.amount.trim().length > 0 && !Number.isNaN(Number(form.amount));

  const colCount = isManager ? 7 : 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold">Reimbursements</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="reimburse-status" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Status
            </label>
            <select
              id="reimburse-status"
              className={cn(SELECT_TRIGGER_CLASS, "w-full min-w-[140px] sm:w-[160px]")}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReimbursementStatusFilter)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Claim
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount (INR)</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  {isManager && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-12 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading reimbursements…
                      </span>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-12 text-center text-destructive">
                      Failed to load reimbursements.
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-12 text-center text-muted-foreground">
                      {statusFilter === "all"
                        ? "No reimbursement claims yet."
                        : "No reimbursement claims match this filter."}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const pending = row.status.toLowerCase() === "pending";
                    const desc = row.description?.trim() ?? "";
                    const rowBusy =
                      (rejectMutation.isPending && rejectMutation.variables === row.id) ||
                      (approveMutation.isPending && approveMutation.variables === row.id);
                    return (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {employeeNameById.get(row.employeeId) ?? `${row.employeeId.slice(0, 8)}…`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {formatCurrency(Number(row.amount))}
                        </td>
                        <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                          {desc ? (
                            <span className="line-clamp-2" title={desc}>
                              {desc}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              statusBadgeClass(row.status)
                            )}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                        {isManager && (
                          <td className="px-4 py-3 text-right">
                            {pending ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={rowBusy}
                                  onClick={() => rejectMutation.mutate(row.id)}
                                >
                                  {rejectMutation.isPending && rejectMutation.variables === row.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Reject"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={rowBusy}
                                  onClick={() => approveMutation.mutate(row.id)}
                                >
                                  {approveMutation.isPending && approveMutation.variables === row.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Approve"
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
              <span>
                Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total)
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
                  disabled={page >= meta.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Submit claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reimburse-employee">
                  Employee <span className="text-destructive">*</span>
                </label>
                <select
                  id="reimburse-employee"
                  className={SELECT_TRIGGER_CLASS}
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select employee</option>
                  {employeesSorted.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reimburse-category">
                  Category <span className="text-destructive">*</span>
                </label>
                <Input
                  id="reimburse-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Travel, Meals"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reimburse-amount">
                  Amount (INR) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="reimburse-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reimburse-desc">
                  Description
                </label>
                <textarea
                  id="reimburse-desc"
                  className={TEXTAREA_CLASS}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details"
                  rows={4}
                />
              </div>
              {submitMutation.isError && (
                <p className="text-sm text-destructive">Could not submit claim. Check required fields and try again.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false);
                    setForm({ employeeId: "", category: "", amount: "", description: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!canSubmit || submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit"
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
