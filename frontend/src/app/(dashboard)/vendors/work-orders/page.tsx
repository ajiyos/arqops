"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, PageMeta, WorkOrder, Vendor } from "@/types";
import { useState } from "react";
import { Pencil, Trash2, CheckCircle2, Plus, X } from "lucide-react";

const PAGE_SIZE = 20;
const WO_STATUSES = ["draft", "pending", "approved", "completed", "rejected"] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function statusClass(status: string) {
  return STATUS_STYLES[status.toLowerCase()] ?? "bg-muted text-muted-foreground";
}

const selectCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const textareaCls =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y";

interface WoFormState {
  vendorId: string;
  woNumber: string;
  scope: string;
  value: string;
  paymentTerms: string;
  startDate: string;
  endDate: string;
}

const emptyForm: WoFormState = {
  vendorId: "",
  woNumber: "",
  scope: "",
  value: "",
  paymentTerms: "",
  startDate: "",
  endDate: "",
};

export default function VendorWorkOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WoFormState>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);

  const vendorsQuery = useQuery({
    queryKey: ["vendor", "vendors-dropdown"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Vendor[]>>(
        "/api/v1/vendor/vendors",
        { params: { page: 0, size: 100 } },
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const vendors = vendorsQuery.data ?? [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor", "work-orders", page, vendorFilter, statusFilter],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<WorkOrder[]>>(
        "/api/v1/vendor/work-orders",
        {
          params: {
            page,
            size: PAGE_SIZE,
            vendorId: vendorFilter || undefined,
            status: statusFilter || undefined,
          },
        },
      );
      return { items: res.data ?? [], meta: res.meta };
    },
  });
  const orders = data?.items ?? [];
  const meta: PageMeta | undefined = data?.meta;

  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (editingId) {
        await apiClient.put(`/api/v1/vendor/work-orders/${editingId}`, body);
      } else {
        await apiClient.post("/api/v1/vendor/work-orders", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "work-orders"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/vendor/work-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "work-orders"] });
      setDeleteTarget(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/vendor/work-orders/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "work-orders"] });
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(wo: WorkOrder) {
    setEditingId(wo.id);
    setForm({
      vendorId: wo.vendorId,
      woNumber: wo.woNumber,
      scope: wo.scope ?? "",
      value: wo.value != null ? String(wo.value) : "",
      paymentTerms: wo.paymentTerms ?? "",
      startDate: wo.startDate ?? "",
      endDate: wo.endDate ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSave() {
    saveMutation.mutate({
      vendorId: form.vendorId || undefined,
      woNumber: form.woNumber,
      scope: form.scope || undefined,
      value: form.value ? Number(form.value) : undefined,
      paymentTerms: form.paymentTerms || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    });
  }

  function patch(field: keyof WoFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Work Orders</h1>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Work Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All work orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="w-full sm:w-56">
              <label htmlFor="wo-vendor-filter" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Vendor
              </label>
              <select
                id="wo-vendor-filter"
                className={selectCls}
                value={vendorFilter}
                onChange={(e) => { setVendorFilter(e.target.value); setPage(0); }}
              >
                <option value="">All vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-44">
              <label htmlFor="wo-status-filter" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Status
              </label>
              <select
                id="wo-status-filter"
                className={selectCls}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <option value="">All statuses</option>
                {WO_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">WO Number</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Scope</th>
                  <th className="px-4 py-3 font-medium text-right">Value (INR)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Start Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-destructive">Failed to load work orders.</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No work orders found.</td>
                  </tr>
                ) : (
                  orders.map((wo) => (
                    <tr key={wo.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{wo.woNumber}</td>
                      <td className="px-4 py-3">{wo.vendorName}</td>
                      <td className="px-4 py-3 text-muted-foreground" title={wo.scope ?? ""}>
                        {wo.scope ? (wo.scope.length > 60 ? wo.scope.slice(0, 60) + "…" : wo.scope) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {wo.value != null ? formatCurrency(Number(wo.value)) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusClass(wo.status))}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {wo.startDate ? formatDate(wo.startDate) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {(wo.status.toLowerCase() === "draft" || wo.status.toLowerCase() === "pending") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Approve"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(wo.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button type="button" variant="ghost" size="sm" title="Edit" onClick={() => openEdit(wo)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" title="Delete" onClick={() => setDeleteTarget(wo)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total)
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Previous
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="wo-modal-title">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle id="wo-modal-title" className="text-xl">
                {editingId ? "Edit Work Order" : "New Work Order"}
              </CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="wo-vendor" className="mb-1.5 block text-sm font-medium">
                  Vendor <span className="text-destructive">*</span>
                </label>
                <select id="wo-vendor" className={selectCls} value={form.vendorId} onChange={(e) => patch("vendorId", e.target.value)}>
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="wo-number" className="mb-1.5 block text-sm font-medium">
                  WO Number <span className="text-destructive">*</span>
                </label>
                <Input id="wo-number" value={form.woNumber} onChange={(e) => patch("woNumber", e.target.value)} placeholder="WO-001" />
              </div>
              <div>
                <label htmlFor="wo-scope" className="mb-1.5 block text-sm font-medium">Scope</label>
                <textarea id="wo-scope" className={textareaCls} rows={3} value={form.scope} onChange={(e) => patch("scope", e.target.value)} placeholder="Describe the scope of work…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wo-value" className="mb-1.5 block text-sm font-medium">Value (INR)</label>
                  <Input id="wo-value" type="number" min={0} step="0.01" value={form.value} onChange={(e) => patch("value", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label htmlFor="wo-payment-terms" className="mb-1.5 block text-sm font-medium">Payment Terms</label>
                  <Input id="wo-payment-terms" value={form.paymentTerms} onChange={(e) => patch("paymentTerms", e.target.value)} placeholder="Net 30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wo-start" className="mb-1.5 block text-sm font-medium">Start Date</label>
                  <Input id="wo-start" type="date" value={form.startDate} onChange={(e) => patch("startDate", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="wo-end" className="mb-1.5 block text-sm font-medium">End Date</label>
                  <Input id="wo-end" type="date" value={form.endDate} onChange={(e) => patch("endDate", e.target.value)} />
                </div>
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-destructive">Failed to save work order. Please check all required fields.</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button
                  type="button"
                  disabled={!form.vendorId || !form.woNumber.trim() || saveMutation.isPending}
                  onClick={handleSave}
                >
                  {saveMutation.isPending ? "Saving…" : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="wo-delete-title">
          <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle id="wo-delete-title" className="text-lg">Delete Work Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget.woNumber}</span>? This action cannot be undone.
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">Failed to delete work order.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
