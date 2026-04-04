"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, Client, Invoice, Payment, PageMeta, Project } from "@/types";

type SacCodeOption = {
  id: string;
  code: string;
  description: string;
  displayOrder: number;
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["all", "draft", "sent", "paid", "overdue", "partial"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const PAYMENT_MODES = ["bank_transfer", "cheque", "cash", "upi", "neft", "rtgs"] as const;

const EMPTY_FORM = {
  clientId: "",
  projectId: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  sacCode: "",
  cgst: "",
  sgst: "",
  igst: "",
  total: "",
  status: "draft",
};

const EMPTY_PAYMENT_FORM = {
  amount: "",
  paymentDate: "",
  mode: "",
  reference: "",
  notes: "",
};

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "draft") return "bg-slate-500/15 text-slate-700 dark:text-slate-300";
  if (s === "sent") return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  if (s === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "overdue") return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (s === "partial") return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

export default function FinanceInvoicesPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ ...EMPTY_PAYMENT_FORM });

  // ── Lookup queries ──

  const { data: clientsData } = useQuery({
    queryKey: ["clients", "finance-invoice-lookup"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Client[]>>("/api/v1/crm/clients", {
        params: { page: 0, size: 500 },
      });
      return data.data ?? [];
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects", "finance-invoice-lookup"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Project[]>>("/api/v1/project/projects", {
        params: { page: 0, size: 200 },
      });
      return data.data ?? [];
    },
  });

  const { data: sacCodeCatalog } = useQuery({
    queryKey: ["finance", "sac-codes"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SacCodeOption[]>>("/api/v1/finance/sac-codes");
      return data.data ?? [];
    },
  });

  const sacSelectOptions = useMemo(() => {
    const list = [...(sacCodeCatalog ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    return list;
  }, [sacCodeCatalog]);

  const sacOptionsForForm = useMemo(() => {
    const base = sacSelectOptions;
    if (form.sacCode && !base.some((o) => o.code === form.sacCode)) {
      return [
        {
          id: "__legacy__",
          code: form.sacCode,
          description: "Current invoice value",
          displayOrder: -1,
        },
        ...base,
      ];
    }
    return base;
  }, [sacSelectOptions, form.sacCode]);

  const useSacCatalog = sacSelectOptions.length > 0;

  const clientById = useMemo(() => {
    const m = new Map<string, string>();
    (clientsData ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clientsData]);

  // ── Invoice list ──

  const { data, isLoading, isError } = useQuery({
    queryKey: ["finance", "invoices", page, statusFilter],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Invoice[]>>("/api/v1/finance/invoices", {
        params: {
          page,
          size: PAGE_SIZE,
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        },
      });
      return { list: res.data ?? [], meta: res.meta as PageMeta | undefined };
    },
  });

  const filtered = useMemo(() => {
    const list = data?.list ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((inv) => {
      const clientName = clientById.get(inv.clientId) ?? "";
      return inv.invoiceNumber.toLowerCase().includes(q) || clientName.toLowerCase().includes(q);
    });
  }, [data?.list, search, clientById]);

  const meta = data?.meta;

  // ── Payments for expanded invoice ──

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["finance", "invoices", expandedId, "payments"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Payment[]>>(
        `/api/v1/finance/invoices/${expandedId}/payments`,
      );
      return res.data ?? [];
    },
    enabled: !!expandedId,
  });

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.post<ApiResponse<Invoice>>("/api/v1/finance/invoices", {
        clientId: form.clientId,
        projectId: form.projectId.trim() || undefined,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        sacCode: form.sacCode.trim() || undefined,
        cgst: Number(form.cgst) || 0,
        sgst: Number(form.sgst) || 0,
        igst: Number(form.igst) || 0,
        total: Number(form.total),
        status: form.status,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] });
      closeFormModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.put<ApiResponse<Invoice>>(
        `/api/v1/finance/invoices/${editingId}`,
        {
          clientId: form.clientId,
          projectId: form.projectId.trim() || undefined,
          invoiceNumber: form.invoiceNumber.trim(),
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate,
          sacCode: form.sacCode.trim() || undefined,
          cgst: Number(form.cgst) || 0,
          sgst: Number(form.sgst) || 0,
          igst: Number(form.igst) || 0,
          total: Number(form.total),
          status: form.status,
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] });
      closeFormModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/finance/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] });
      setDeleteTarget(null);
      if (expandedId === deleteTarget?.id) setExpandedId(null);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.post<ApiResponse<Payment>>(
        `/api/v1/finance/invoices/${paymentInvoiceId}/payments`,
        {
          amount: Number(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          mode: paymentForm.mode || undefined,
          reference: paymentForm.reference.trim() || undefined,
          notes: paymentForm.notes.trim() || undefined,
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices", paymentInvoiceId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "invoices"] });
      closePaymentModal();
    },
  });

  // ── Helpers ──

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setModalMode("create");
  }

  function openEdit(inv: Invoice) {
    setForm({
      clientId: inv.clientId,
      projectId: inv.projectId ?? "",
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      sacCode: inv.sacCode ?? "",
      cgst: String(inv.cgst),
      sgst: String(inv.sgst),
      igst: String(inv.igst),
      total: String(inv.total),
      status: inv.status,
    });
    setEditingId(inv.id);
    setModalMode("edit");
  }

  function closeFormModal() {
    setModalMode(null);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function openPayment(invoiceId: string) {
    setPaymentInvoiceId(invoiceId);
    setPaymentForm({ ...EMPTY_PAYMENT_FORM });
    setPaymentOpen(true);
  }

  function closePaymentModal() {
    setPaymentOpen(false);
    setPaymentInvoiceId(null);
    setPaymentForm({ ...EMPTY_PAYMENT_FORM });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const baseFormValid =
    !!form.clientId &&
    !!form.invoiceDate &&
    !!form.dueDate &&
    form.total.trim() !== "" &&
    Number.isFinite(Number(form.total));

  const formValid =
    baseFormValid &&
    (modalMode === "create" || !!form.invoiceNumber.trim());

  const paymentValid =
    paymentForm.amount.trim() !== "" &&
    Number.isFinite(Number(paymentForm.amount)) &&
    Number(paymentForm.amount) > 0 &&
    !!paymentForm.paymentDate;

  const COL_SPAN = 8;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 w-56 pl-9"
              placeholder="Search invoices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(0);
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium text-right">Total (INR)</th>
                  <th className="px-4 py-3 font-medium text-right">GST</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={COL_SPAN + 1} className="px-4 py-12 text-center text-muted-foreground">
                      Loading invoices…
                    </td>
                  </tr>
                )}
                {isError && !isLoading && (
                  <tr>
                    <td colSpan={COL_SPAN + 1} className="px-4 py-12 text-center text-destructive">
                      Could not load invoices.
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && filtered.length === 0 && (
                  <tr>
                    <td colSpan={COL_SPAN + 1} className="px-4 py-12 text-center text-muted-foreground">
                      {search.trim() ? "No invoices match your search." : "No invoices match this filter."}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !isError &&
                  filtered.map((inv) => {
                    const isExpanded = expandedId === inv.id;
                    const gstTotal = Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst);
                    return (
                      <>
                        <tr
                          key={inv.id}
                          className={cn(
                            "border-b last:border-0 hover:bg-muted/40 cursor-pointer",
                            isExpanded && "bg-muted/30",
                          )}
                          onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                        >
                          <td className="px-2 py-3 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : inv.id);
                              }}
                            >
                              {inv.invoiceNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {clientById.get(inv.clientId) ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(Number(inv.total))}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {gstTotal > 0 ? formatCurrency(gstTotal) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                statusBadgeClass(inv.status),
                              )}
                            >
                              {inv.status.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(inv);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(inv);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr key={`${inv.id}-detail`} className="border-b bg-muted/20">
                            <td colSpan={COL_SPAN + 1} className="px-6 py-5">
                              <InvoiceDetail
                                invoice={inv}
                                clientName={clientById.get(inv.clientId) ?? "—"}
                                payments={payments ?? []}
                                paymentsLoading={paymentsLoading}
                                onRecordPayment={() => openPayment(inv.id)}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
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

      {/* ── Create / Edit Modal ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            onClick={() => !isSaving && closeFormModal()}
          />
          <Card className="relative z-10 w-full max-w-lg shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                {modalMode === "create" ? "New invoice" : "Edit invoice"}
              </CardTitle>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => !isSaving && closeFormModal()}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client *</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.clientId}
                    onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  >
                    <option value="">Select client</option>
                    {(clientsData ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <select
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
              </div>

              {modalMode === "create" ? (
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Invoice number is assigned automatically in the form{" "}
                  <span className="font-mono text-foreground">INV-YYYY-####</span> (example{" "}
                  <span className="font-mono text-foreground">INV-2026-0001</span>) using the{" "}
                  <strong className="text-foreground">invoice date</strong> and a per-year counter for your
                  workspace.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice # *</label>
                  <Input
                    value={form.invoiceNumber}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Date *</label>
                  <Input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date *</label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">SAC Code</label>
                {useSacCatalog ? (
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.sacCode}
                    onChange={(e) => setForm((f) => ({ ...f, sacCode: e.target.value }))}
                  >
                    <option value="">None</option>
                    {sacOptionsForForm.map((o) => (
                      <option key={o.id} value={o.code}>
                        {o.description ? `${o.code} — ${o.description}` : o.code}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={form.sacCode}
                    onChange={(e) => setForm((f) => ({ ...f, sacCode: e.target.value }))}
                    placeholder="e.g. 998361 (configure list under Finance settings)"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CGST</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.cgst}
                    onChange={(e) => setForm((f) => ({ ...f, cgst: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SGST</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.sgst}
                    onChange={(e) => setForm((f) => ({ ...f, sgst: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">IGST</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.igst}
                    onChange={(e) => setForm((f) => ({ ...f, igst: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total (INR) *</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.total}
                    onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={closeFormModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!formValid || isSaving}
                  onClick={() =>
                    modalMode === "create" ? createMutation.mutate() : updateMutation.mutate()
                  }
                >
                  {isSaving && modalMode === "create" && "Creating…"}
                  {isSaving && modalMode === "edit" && "Saving…"}
                  {!isSaving && modalMode === "create" && "Create"}
                  {!isSaving && modalMode === "edit" && "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
          />
          <Card className="relative z-10 w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Delete invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete invoice{" "}
                <span className="font-medium text-foreground">{deleteTarget.invoiceNumber}</span>? This
                action cannot be undone.
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
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            onClick={() => !paymentMutation.isPending && closePaymentModal()}
          />
          <Card className="relative z-10 w-full max-w-md shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Record payment</CardTitle>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => !paymentMutation.isPending && closePaymentModal()}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount *</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={paymentForm.mode}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, mode: e.target.value }))}
                >
                  <option value="">Select mode</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference</label>
                <Input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="Transaction ref / cheque no."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={closePaymentModal}
                  disabled={paymentMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!paymentValid || paymentMutation.isPending}
                  onClick={() => paymentMutation.mutate()}
                >
                  {paymentMutation.isPending ? "Recording…" : "Record Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Inline detail component ──

function InvoiceDetail({
  invoice,
  clientName,
  payments,
  paymentsLoading,
  onRecordPayment,
}: Readonly<{
  invoice: Invoice;
  clientName: string;
  payments: Payment[];
  paymentsLoading: boolean;
  onRecordPayment: () => void;
}>) {
  const gstTotal = Number(invoice.cgst) + Number(invoice.sgst) + Number(invoice.igst);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      {/* Overview grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        <DetailField label="Client" value={clientName} />
        <DetailField label="Invoice #" value={invoice.invoiceNumber} mono />
        <DetailField label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
        <DetailField label="Due Date" value={formatDate(invoice.dueDate)} />
        <DetailField label="SAC Code" value={invoice.sacCode ?? "—"} />
        <DetailField label="CGST" value={formatCurrency(Number(invoice.cgst))} />
        <DetailField label="SGST" value={formatCurrency(Number(invoice.sgst))} />
        <DetailField label="IGST" value={formatCurrency(Number(invoice.igst))} />
        <DetailField label="GST Total" value={formatCurrency(gstTotal)} />
        <DetailField label="Invoice Total" value={formatCurrency(Number(invoice.total))} bold />
        <DetailField label="Paid" value={formatCurrency(totalPaid)} />
        <DetailField
          label="Outstanding"
          value={formatCurrency(Number(invoice.total) - totalPaid)}
          bold
        />
      </div>

      {/* Payments section */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Payments</h4>
          <Button type="button" size="sm" variant="outline" onClick={onRecordPayment}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Record Payment
          </Button>
        </div>

        {paymentsLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading payments…</p>
        ) : payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">
                      {p.mode?.replaceAll("_", " ") ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  bold,
}: Readonly<{
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}>) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm",
          mono && "font-mono",
          bold && "font-semibold",
        )}
      >
        {value}
      </p>
    </div>
  );
}
