"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, Vendor, VendorBill } from "@/types";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

const PAGE_SIZE = 20;
const FETCH_SIZE = 500;

const STATUS_FILTER_OPTIONS = ["all", "pending", "approved", "paid", "overdue"] as const;
const BILL_STATUS_OPTIONS = ["pending", "approved", "paid", "overdue"] as const;

type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

function payableStatusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "pending" || s === "approved") return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  if (s === "overdue") return "bg-red-500/15 text-red-700 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

function emptyForm() {
  return {
    vendorId: "",
    billNumber: "",
    amount: "",
    gstAmount: "",
    tdsSection: "",
    tdsRate: "",
    tdsAmount: "",
    dueDate: "",
    status: "pending" as (typeof BILL_STATUS_OPTIONS)[number],
  };
}

function billToForm(b: VendorBill) {
  const due =
    typeof b.dueDate === "string" && b.dueDate.length >= 10 ? b.dueDate.slice(0, 10) : b.dueDate;
  const st = b.status?.toLowerCase() ?? "";
  const status: (typeof BILL_STATUS_OPTIONS)[number] =
    BILL_STATUS_OPTIONS.find((x) => x === st) ?? "pending";
  return {
    vendorId: b.vendorId,
    billNumber: b.billNumber,
    amount: String(b.amount),
    gstAmount: b.gstAmount == null ? "" : String(b.gstAmount),
    tdsSection: b.tdsSection ?? "",
    tdsRate: b.tdsRate == null ? "" : String(b.tdsRate),
    tdsAmount: b.tdsAmount == null ? "" : String(b.tdsAmount),
    dueDate: due,
    status,
  };
}

type BillForm = ReturnType<typeof emptyForm>;

function buildRequestBody(form: BillForm) {
  return {
    vendorId: form.vendorId.trim(),
    billNumber: form.billNumber.trim(),
    amount: Number(form.amount),
    gstAmount: form.gstAmount.trim() === "" ? undefined : Number(form.gstAmount),
    tdsSection: form.tdsSection.trim() === "" ? undefined : form.tdsSection.trim(),
    tdsRate: form.tdsRate.trim() === "" ? undefined : Number(form.tdsRate),
    tdsAmount: form.tdsAmount.trim() === "" ? undefined : Number(form.tdsAmount),
    dueDate: form.dueDate,
    status: form.status,
  };
}

export default function FinancePayablesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<VendorBill | null>(null);

  const { data: vendorsData } = useQuery({
    queryKey: ["vendor", "payables-lookup"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Vendor[]>>("/api/v1/vendor/vendors", {
        params: { page: 0, size: 500 },
      });
      return data.data ?? [];
    },
  });

  const vendorById = useMemo(() => {
    const m = new Map<string, string>();
    (vendorsData ?? []).forEach((v) => m.set(v.id, v.name));
    return m;
  }, [vendorsData]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["finance", "vendor-bills"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<VendorBill[]>>("/api/v1/finance/vendor-bills", {
        params: { page: 0, size: FETCH_SIZE },
      });
      return { list: res.data ?? [], meta: res.meta };
    },
  });

  const filtered = useMemo(() => {
    const list = data?.list ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((bill) => {
      if (statusFilter !== "all" && bill.status?.toLowerCase() !== statusFilter) return false;
      if (!q) return true;
      const vendorName = (vendorById.get(bill.vendorId) ?? "").toLowerCase();
      const num = (bill.billNumber ?? "").toLowerCase();
      return num.includes(q) || vendorName.includes(q);
    });
  }, [data?.list, search, statusFilter, vendorById]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: async (body: ReturnType<typeof buildRequestBody>) => {
      const { data: res } = await apiClient.post<ApiResponse<VendorBill>>("/api/v1/finance/vendor-bills", body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "vendor-bills"] });
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ReturnType<typeof buildRequestBody> }) => {
      const { data: res } = await apiClient.put<ApiResponse<VendorBill>>(
        `/api/v1/finance/vendor-bills/${id}`,
        body
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "vendor-bills"] });
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete<ApiResponse<void>>(`/api/v1/finance/vendor-bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "vendor-bills"] });
      setDeleteTarget(null);
    },
  });

  const savePending = createMutation.isPending || updateMutation.isPending;
  const formValid =
    form.vendorId.trim() !== "" &&
    form.billNumber.trim() !== "" &&
    form.amount.trim() !== "" &&
    Number.isFinite(Number(form.amount)) &&
    form.dueDate !== "";

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(bill: VendorBill) {
    setEditingId(bill.id);
    setForm(billToForm(bill));
    setModalOpen(true);
  }

  function closeModal() {
    if (savePending) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function submitForm() {
    if (!formValid || savePending) return;
    const body = buildRequestBody(form);
    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const saveButtonLabel = editingId ? "Save changes" : "Create";
  const deleteVendorLabel = deleteTarget ? vendorById.get(deleteTarget.vendorId) : undefined;
  const tableReady = isLoading === false && isError === false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold">Vendor Bills</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search bill # or vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search by bill number or vendor name"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <Button type="button" onClick={openCreate} className="sm:shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            New Bill
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payables</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Bill #</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium text-right">Amount (INR)</th>
                  <th className="px-4 py-3 font-medium text-right">GST</th>
                  <th className="px-4 py-3 font-medium text-right">TDS</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Loading vendor bills…
                    </td>
                  </tr>
                )}
                {isError && isLoading === false && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-destructive">
                      Could not load vendor bills.
                    </td>
                  </tr>
                )}
                {tableReady && paged.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No vendor bills match your filters.
                    </td>
                  </tr>
                )}
                {tableReady &&
                  paged.map((bill) => (
                    <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{bill.billNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {vendorById.get(bill.vendorId) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(bill.amount))}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {bill.gstAmount == null ? "—" : formatCurrency(Number(bill.gstAmount))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {bill.tdsAmount == null ? "—" : formatCurrency(Number(bill.tdsAmount))}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(bill.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            payableStatusBadgeClass(bill.status)
                          )}
                        >
                          {bill.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit bill ${bill.billNumber}`}
                            onClick={() => openEdit(bill)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Delete bill ${bill.billNumber}`}
                            onClick={() => setDeleteTarget(bill)}
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
          {totalFiltered > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {safePage + 1} of {totalPages} ({totalFiltered} shown
                {search.trim() || statusFilter !== "all" ? ` filtered` : ""})
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages - 1}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <Card className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{editingId ? "Edit vendor bill" : "New vendor bill"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="payables-vendor" className="text-sm font-medium">
                  Vendor <span className="text-destructive">*</span>
                </label>
                <select
                  id="payables-vendor"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.vendorId}
                  onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
                  required
                >
                  <option value="">Select vendor</option>
                  {(vendorsData ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="payables-bill-number" className="text-sm font-medium">
                  Bill number
                </label>
                <Input
                  id="payables-bill-number"
                  value={form.billNumber}
                  onChange={(e) => setForm((f) => ({ ...f, billNumber: e.target.value }))}
                  placeholder="e.g. VB-2024-001"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="payables-amount" className="text-sm font-medium">
                  Amount (INR) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="payables-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="payables-gst" className="text-sm font-medium">
                  GST amount
                </label>
                <Input
                  id="payables-gst"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.gstAmount}
                  onChange={(e) => setForm((f) => ({ ...f, gstAmount: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="payables-tds-section" className="text-sm font-medium">
                    TDS section
                  </label>
                  <Input
                    id="payables-tds-section"
                    value={form.tdsSection}
                    onChange={(e) => setForm((f) => ({ ...f, tdsSection: e.target.value }))}
                    placeholder="e.g. 194C, 194J"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="payables-tds-rate" className="text-sm font-medium">
                    TDS rate (%)
                  </label>
                  <Input
                    id="payables-tds-rate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.tdsRate}
                    onChange={(e) => setForm((f) => ({ ...f, tdsRate: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="payables-tds-amount" className="text-sm font-medium">
                  TDS amount
                </label>
                <Input
                  id="payables-tds-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.tdsAmount}
                  onChange={(e) => setForm((f) => ({ ...f, tdsAmount: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="payables-due-date" className="text-sm font-medium">
                  Due date <span className="text-destructive">*</span>
                </label>
                <Input
                  id="payables-due-date"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="payables-status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="payables-status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as (typeof BILL_STATUS_OPTIONS)[number],
                    }))
                  }
                >
                  {BILL_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={closeModal} disabled={savePending}>
                  Cancel
                </Button>
                <Button type="button" disabled={!formValid || savePending} onClick={submitForm}>
                  {savePending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    saveButtonLabel
                  )}
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
            aria-label="Close dialog"
            onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
          />
          <Card className="relative z-10 w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Delete vendor bill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete bill <span className="font-mono font-medium text-foreground">{deleteTarget.billNumber}</span>
                {deleteVendorLabel ? (
                  <>
                    {" "}
                    for <span className="font-medium text-foreground">{deleteVendorLabel}</span>
                  </>
                ) : null}
                ? This action marks the bill as deleted.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting…
                    </>
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
