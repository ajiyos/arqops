"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, PageMeta, PurchaseOrder, WorkOrder } from "@/types";
import { useState } from "react";
import { Pencil, Trash2, CheckCircle2, Plus, X } from "lucide-react";

const PAGE_SIZE = 20;
const PO_STATUSES = ["draft", "pending", "approved", "completed", "rejected"] as const;

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

interface PoFormState {
  workOrderId: string;
  poNumber: string;
  total: string;
  gstAmount: string;
}

const emptyForm: PoFormState = {
  workOrderId: "",
  poNumber: "",
  total: "",
  gstAmount: "",
};

export default function VendorPurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [woFilter, setWoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PoFormState>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);

  const workOrdersQuery = useQuery({
    queryKey: ["vendor", "work-orders-dropdown"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<WorkOrder[]>>(
        "/api/v1/vendor/work-orders",
        { params: { page: 0, size: 100 } },
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const workOrders = workOrdersQuery.data ?? [];

  const woLookup = new Map(workOrders.map((wo) => [wo.id, wo.woNumber]));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor", "purchase-orders", page, woFilter, statusFilter],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<PurchaseOrder[]>>(
        "/api/v1/vendor/purchase-orders",
        {
          params: {
            page,
            size: PAGE_SIZE,
            workOrderId: woFilter || undefined,
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
        await apiClient.put(`/api/v1/vendor/purchase-orders/${editingId}`, body);
      } else {
        await apiClient.post("/api/v1/vendor/purchase-orders", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "purchase-orders"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/vendor/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "purchase-orders"] });
      setDeleteTarget(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/v1/vendor/purchase-orders/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "purchase-orders"] });
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(po: PurchaseOrder) {
    setEditingId(po.id);
    setForm({
      workOrderId: po.workOrderId ?? "",
      poNumber: po.poNumber,
      total: String(po.total),
      gstAmount: po.gstAmount != null ? String(po.gstAmount) : "",
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
      workOrderId: form.workOrderId || undefined,
      poNumber: form.poNumber,
      total: Number(form.total),
      gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
    });
  }

  function patch(field: keyof PoFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New PO
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All purchase orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="w-full sm:w-56">
              <label htmlFor="po-wo-filter" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Work Order
              </label>
              <select
                id="po-wo-filter"
                className={selectCls}
                value={woFilter}
                onChange={(e) => { setWoFilter(e.target.value); setPage(0); }}
              >
                <option value="">All work orders</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>{wo.woNumber}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-44">
              <label htmlFor="po-status-filter" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Status
              </label>
              <select
                id="po-status-filter"
                className={selectCls}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <option value="">All statuses</option>
                {PO_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">PO Number</th>
                  <th className="px-4 py-3 font-medium">Work Order</th>
                  <th className="px-4 py-3 font-medium text-right">Total (INR)</th>
                  <th className="px-4 py-3 font-medium text-right">GST (INR)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-destructive">Failed to load purchase orders.</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No purchase orders found.</td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{po.poNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {po.workOrderId ? (woLookup.get(po.workOrderId) ?? po.workOrderId) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(po.total))}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {po.gstAmount != null ? formatCurrency(Number(po.gstAmount)) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusClass(po.status))}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {(po.status.toLowerCase() === "draft" || po.status.toLowerCase() === "pending") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Approve"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(po.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button type="button" variant="ghost" size="sm" title="Edit" onClick={() => openEdit(po)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" title="Delete" onClick={() => setDeleteTarget(po)}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="po-modal-title">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle id="po-modal-title" className="text-xl">
                {editingId ? "Edit Purchase Order" : "New Purchase Order"}
              </CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="po-wo" className="mb-1.5 block text-sm font-medium">Work Order</label>
                <select id="po-wo" className={selectCls} value={form.workOrderId} onChange={(e) => patch("workOrderId", e.target.value)}>
                  <option value="">None</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>{wo.woNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="po-number" className="mb-1.5 block text-sm font-medium">
                  PO Number <span className="text-destructive">*</span>
                </label>
                <Input id="po-number" value={form.poNumber} onChange={(e) => patch("poNumber", e.target.value)} placeholder="PO-001" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="po-total" className="mb-1.5 block text-sm font-medium">
                    Total (INR) <span className="text-destructive">*</span>
                  </label>
                  <Input id="po-total" type="number" min={0} step="0.01" value={form.total} onChange={(e) => patch("total", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label htmlFor="po-gst" className="mb-1.5 block text-sm font-medium">GST Amount</label>
                  <Input id="po-gst" type="number" min={0} step="0.01" value={form.gstAmount} onChange={(e) => patch("gstAmount", e.target.value)} placeholder="0" />
                </div>
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-destructive">Failed to save purchase order. Please check all required fields.</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button
                  type="button"
                  disabled={!form.poNumber.trim() || !form.total || saveMutation.isPending}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="po-delete-title">
          <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle id="po-delete-title" className="text-lg">Delete Purchase Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget.poNumber}</span>? This action cannot be undone.
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">Failed to delete purchase order.</p>
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
