"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, Employee, LeaveRequestRecord, LeaveType, PageMeta } from "@/types";
import { useAuth } from "@/lib/auth/auth-context";
import { Loader2, Plus, Settings } from "lucide-react";

const PAGE_SIZE = 20;
const FILTER_FETCH_SIZE = 500;

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

const MANAGER_ROLES = new Set(["TENANT_ADMIN", "HR_ADMIN"]);

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const textareaClassName =
  "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function useIsHrManager(): boolean {
  const { user } = useAuth();
  return (user?.roles ?? []).some((r) => MANAGER_ROLES.has(r));
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (s === "rejected") return "bg-destructive/10 text-destructive";
  return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
}

export default function HrLeavesPage() {
  const queryClient = useQueryClient();
  const isManager = useIsHrManager();
  const [page, setPage] = useState(0);
  const [filterPage, setFilterPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    days: "",
    reason: "",
  });

  const [typesOpen, setTypesOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({
    name: "",
    annualQuota: "",
    carryForwardLimit: "",
  });

  const listQueryPage = statusFilter ? 0 : page;
  const listQuerySize = statusFilter ? FILTER_FETCH_SIZE : PAGE_SIZE;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "leave-requests", listQueryPage, listQuerySize],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<LeaveRequestRecord[]>>("/api/v1/hr/leave-requests", {
        params: { page: listQueryPage, size: listQuerySize },
      });
      return { items: res.data ?? [], meta: res.meta };
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["hr", "employees", "leaves"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Employee[]>>("/api/v1/hr/employees", {
        params: { page: 0, size: 500 },
      });
      return res.data ?? [];
    },
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ["hr", "leave-types"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<LeaveType[]>>("/api/v1/hr/leave-types");
      return res.data ?? [];
    },
  });

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    (employees ?? []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [employees]);

  const leaveTypeNameById = useMemo(() => {
    const m = new Map<string, string>();
    (leaveTypes ?? []).forEach((t) => m.set(t.id, t.name));
    return m;
  }, [leaveTypes]);

  const filteredAll = useMemo(() => {
    const items = data?.items ?? [];
    if (!statusFilter) return items;
    return items.filter((r) => r.status.toLowerCase() === statusFilter);
  }, [data?.items, statusFilter]);

  const displayedRows = useMemo(() => {
    if (!statusFilter) return filteredAll;
    const start = filterPage * PAGE_SIZE;
    return filteredAll.slice(start, start + PAGE_SIZE);
  }, [filteredAll, filterPage, statusFilter]);

  const paginationMeta: PageMeta | undefined = useMemo(() => {
    if (!statusFilter) return data?.meta;
    const total = filteredAll.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return {
      page: filterPage,
      size: PAGE_SIZE,
      totalElements: total,
      totalPages,
    };
  }, [data?.meta, filteredAll.length, filterPage, statusFilter]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const daysNum = Number(applyForm.days);
      if (!Number.isFinite(daysNum)) throw new Error("Invalid days");
      const body: Record<string, unknown> = {
        employeeId: applyForm.employeeId,
        leaveTypeId: applyForm.leaveTypeId,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        days: daysNum,
      };
      const r = applyForm.reason.trim();
      if (r) body.reason = r;
      await apiClient.post("/api/v1/hr/leave-requests", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
      setApplyOpen(false);
      setApplyForm({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", days: "", reason: "" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/hr/leave-requests/${id}/approve`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/hr/leave-requests/${id}/reject`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] }),
  });

  const createLeaveTypeMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: typeForm.name.trim() };
      const aq = typeForm.annualQuota.trim();
      const cf = typeForm.carryForwardLimit.trim();
      if (aq !== "") {
        const n = Number(aq);
        if (!Number.isInteger(n) || n < 0) throw new Error("Invalid annual quota");
        body.annualQuota = n;
      }
      if (cf !== "") {
        const n = Number(cf);
        if (!Number.isInteger(n) || n < 0) throw new Error("Invalid carry forward limit");
        body.carryForwardLimit = n;
      }
      await apiClient.post("/api/v1/hr/leave-types", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "leave-types"] });
      setTypeForm({ name: "", annualQuota: "", carryForwardLimit: "" });
    },
  });

  const employeeOptions = employees ?? [];
  const typeOptions = leaveTypes ?? [];

  const openApplyModal = () => {
    setApplyForm((f) => ({
      ...f,
      employeeId: f.employeeId || employeeOptions[0]?.id || "",
      leaveTypeId: f.leaveTypeId || typeOptions[0]?.id || "",
    }));
    setApplyOpen(true);
  };

  const actionColCount = isManager ? 1 : 0;
  const colSpan = 8 + actionColCount;

  const onStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
    setFilterPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold">Leave Requests</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-[160px]">
            <label htmlFor="leave-status" className="sr-only">
              Status filter
            </label>
            <select
              id="leave-status"
              className={selectClassName}
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={openApplyModal} disabled={!employeeOptions.length || !typeOptions.length}>
            <Plus className="mr-2 h-4 w-4" />
            Apply Leave
          </Button>
          <Button type="button" variant="outline" onClick={() => setTypesOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Types
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Leave Type</th>
                  <th className="px-4 py-3 font-medium">Start Date</th>
                  <th className="px-4 py-3 font-medium">End Date</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isManager && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (isLoading) {
                    return (
                      <tr>
                        <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading…
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  if (isError) {
                    return (
                      <tr>
                        <td colSpan={colSpan} className="px-4 py-12 text-center text-destructive">
                          Failed to load leave requests.
                        </td>
                      </tr>
                    );
                  }
                  if (displayedRows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                          No leave requests in this view.
                        </td>
                      </tr>
                    );
                  }
                  return displayedRows.map((row) => {
                    const pending = row.status.toLowerCase() === "pending";
                    const empName = employeeNameById.get(row.employeeId);
                    const typeName = leaveTypeNameById.get(row.leaveTypeId);
                    const approvingThis =
                      approveMutation.isPending && approveMutation.variables === row.id;
                    const rejectingThis =
                      rejectMutation.isPending && rejectMutation.variables === row.id;
                    return (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {empName ?? `${row.employeeId.slice(0, 8)}…`}
                        </td>
                        <td className="px-4 py-3">{typeName ?? `${row.leaveTypeId.slice(0, 8)}…`}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(row.startDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(row.endDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{String(row.days)}</td>
                        <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
                          {row.reason?.trim() ? (
                            <span className="line-clamp-2" title={row.reason}>
                              {row.reason}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              statusBadgeClass(row.status),
                            )}
                          >
                            {row.status}
                          </span>
                        </td>
                        {isManager && (
                          <td className="px-4 py-3 text-right">
                            {pending ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  onClick={() => approveMutation.mutate(row.id)}
                                >
                                  {approvingThis ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    "Approve"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  onClick={() => rejectMutation.mutate(row.id)}
                                >
                                  {rejectingThis ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    "Reject"
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
                  });
                })()}
              </tbody>
            </table>
          </div>

          {paginationMeta && paginationMeta.totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
              <span>
                Page {(statusFilter ? filterPage : page) + 1} of {paginationMeta.totalPages} (
                {paginationMeta.totalElements} total)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={statusFilter ? filterPage <= 0 : page <= 0}
                  onClick={() =>
                    statusFilter ? setFilterPage((p) => Math.max(0, p - 1)) : setPage((p) => Math.max(0, p - 1))
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    statusFilter
                      ? filterPage >= paginationMeta.totalPages - 1
                      : page >= paginationMeta.totalPages - 1
                  }
                  onClick={() => (statusFilter ? setFilterPage((p) => p + 1) : setPage((p) => p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {statusFilter && data?.meta && (data.meta.totalElements ?? 0) >= FILTER_FETCH_SIZE && (
            <p className="mt-3 text-xs text-muted-foreground">
              Status filter shows up to {FILTER_FETCH_SIZE} most recent requests. Choose &quot;All&quot; to browse the
              full paginated list.
            </p>
          )}
        </CardContent>
      </Card>

      {applyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Apply leave</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="leave-emp">
                  Employee <span className="text-destructive">*</span>
                </label>
                <select
                  id="leave-emp"
                  className={selectClassName}
                  value={applyForm.employeeId}
                  onChange={(e) => setApplyForm((f) => ({ ...f, employeeId: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {employeeOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="leave-type">
                  Leave type <span className="text-destructive">*</span>
                </label>
                <select
                  id="leave-type"
                  className={selectClassName}
                  value={applyForm.leaveTypeId}
                  onChange={(e) => setApplyForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {typeOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="leave-start">
                    Start date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="leave-start"
                    type="date"
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="leave-end">
                    End date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="leave-end"
                    type="date"
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="leave-days">
                  Days <span className="text-destructive">*</span>
                </label>
                <Input
                  id="leave-days"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={applyForm.days}
                  onChange={(e) => setApplyForm((f) => ({ ...f, days: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="leave-reason">
                  Reason
                </label>
                <textarea
                  id="leave-reason"
                  className={textareaClassName}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              {applyMutation.isError && (
                <p className="text-sm text-destructive">Could not submit leave request. Check the fields and try again.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setApplyOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    !applyForm.employeeId ||
                    !applyForm.leaveTypeId ||
                    !applyForm.startDate ||
                    !applyForm.endDate ||
                    applyForm.days === "" ||
                    applyMutation.isPending
                  }
                  onClick={() => applyMutation.mutate()}
                >
                  {applyMutation.isPending ? (
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

      {typesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Manage leave types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Annual quota</th>
                      <th className="px-4 py-3 text-left font-medium">Carry forward limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeOptions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          No leave types yet. Add one below.
                        </td>
                      </tr>
                    ) : (
                      typeOptions.map((t) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{t.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.annualQuota ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.carryForwardLimit ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">Add type</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-3">
                    <label className="text-sm font-medium" htmlFor="type-name">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="type-name"
                      value={typeForm.name}
                      onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Annual"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="type-quota">
                      Annual quota
                    </label>
                    <Input
                      id="type-quota"
                      type="number"
                      min={0}
                      value={typeForm.annualQuota}
                      onChange={(e) => setTypeForm((f) => ({ ...f, annualQuota: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium" htmlFor="type-cf">
                      Carry forward limit
                    </label>
                    <Input
                      id="type-cf"
                      type="number"
                      min={0}
                      value={typeForm.carryForwardLimit}
                      onChange={(e) => setTypeForm((f) => ({ ...f, carryForwardLimit: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                {createLeaveTypeMutation.isError && (
                  <p className="mt-2 text-sm text-destructive">Could not create leave type.</p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setTypesOpen(false)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    disabled={!typeForm.name.trim() || createLeaveTypeMutation.isPending}
                    onClick={() => createLeaveTypeMutation.mutate()}
                  >
                    {createLeaveTypeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Add type"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
