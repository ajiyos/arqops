"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { ApiResponse, Lead, Client, LeadStage, PageMeta } from "@/types";
import { useTenantProjectTypesQuery } from "@/lib/hooks/use-tenant-project-types";

const PAGE_SIZE = 20;

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  contacted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  "proposal sent":
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  negotiation:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  won: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function stageBadgeClass(stage: string): string {
  return (
    STAGE_COLORS[stage.toLowerCase()] ?? "bg-muted text-muted-foreground"
  );
}

interface LeadFormData {
  title: string;
  clientId: string;
  source: string;
  projectType: string;
  estimatedValue: string;
  location: string;
  stage: string;
  notes: string;
}

const emptyForm: LeadFormData = {
  title: "",
  clientId: "",
  source: "",
  projectType: "",
  estimatedValue: "",
  location: "",
  stage: "",
  notes: "",
};

export default function CrmLeadsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const stagesQuery = useQuery({
    queryKey: ["crm", "lead-stages"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<LeadStage[]>>(
        "/api/v1/crm/leads/stages"
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const clientsQuery = useQuery({
    queryKey: ["crm", "clients", "all"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Client[]>>(
        "/api/v1/crm/clients",
        { params: { page: 0, size: 100 } }
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clientsQuery.data ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [clientsQuery.data]);

  const { data: tenantProjectTypes } = useTenantProjectTypesQuery();
  const projectTypeSelectOptions = useMemo(() => {
    const base = tenantProjectTypes ?? [];
    const legacy = editingLead?.projectType?.trim();
    if (legacy && !base.some((t) => t.name === legacy)) {
      return [{ id: "__legacy__", name: legacy, displayOrder: -1 }, ...base];
    }
    return base;
  }, [tenantProjectTypes, editingLead?.projectType]);

  const leadsQuery = useQuery({
    queryKey: ["crm", "leads", page, stageFilter],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Lead[]>>(
        "/api/v1/crm/leads",
        {
          params: {
            page,
            size: PAGE_SIZE,
            stage: stageFilter || undefined,
          },
        }
      );
      return { items: res.data ?? [], meta: res.meta };
    },
  });

  const filteredLeads = useMemo(() => {
    const items = leadsQuery.data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((l) => l.title.toLowerCase().includes(q));
  }, [leadsQuery.data?.items, search]);

  const meta: PageMeta | undefined = leadsQuery.data?.meta;
  const stages = stagesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      body: Record<string, unknown>;
    }) => {
      if (data.id) {
        await apiClient.put(`/api/v1/crm/leads/${data.id}`, data.body);
      } else {
        await apiClient.post("/api/v1/crm/leads", data.body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/crm/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingLead(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setForm({
      title: lead.title,
      clientId: lead.clientId ?? "",
      source: lead.source ?? "",
      projectType: lead.projectType ?? "",
      estimatedValue:
        lead.estimatedValue != null ? String(lead.estimatedValue) : "",
      location: lead.location ?? "",
      stage: lead.stage,
      notes: lead.notes ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingLead(null);
    setForm(emptyForm);
    saveMutation.reset();
  }

  function handleSave() {
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      clientId: form.clientId || undefined,
      source: form.source.trim() || undefined,
      projectType: form.projectType.trim() || undefined,
      estimatedValue: form.estimatedValue
        ? Number(form.estimatedValue)
        : undefined,
      location: form.location.trim() || undefined,
      stage: form.stage || undefined,
      notes: form.notes.trim() || undefined,
    };
    saveMutation.mutate({ id: editingLead?.id, body });
  }

  const setField = (key: keyof LeadFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full max-w-xs">
              <label
                htmlFor="lead-search"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lead-search"
                  className="pl-9"
                  placeholder="Search by title…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full max-w-xs">
              <label
                htmlFor="lead-stage-filter"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Stage
              </label>
              <select
                id="lead-stage-filter"
                className={selectClass}
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All stages</option>
                {stages
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leadsQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      <span className="mt-2 block">Loading…</span>
                    </td>
                  </tr>
                ) : leadsQuery.isError ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-destructive"
                    >
                      Failed to load leads.
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="text-primary hover:underline"
                        >
                          {lead.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.clientId
                          ? clientMap.get(lead.clientId) ?? "—"
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            stageBadgeClass(lead.stage)
                          )}
                        >
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.estimatedValue != null
                          ? formatCurrency(Number(lead.estimatedValue))
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.source ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(lead)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(lead)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {meta.page + 1} of {meta.totalPages} (
                {meta.totalElements} total)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
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
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle id="lead-modal-title" className="text-xl">
                {editingLead ? "Edit Lead" : "New Lead"}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Lead title"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Client
                  </label>
                  <select
                    className={selectClass}
                    value={form.clientId}
                    onChange={(e) => setField("clientId", e.target.value)}
                  >
                    <option value="">None</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Stage
                  </label>
                  <select
                    className={selectClass}
                    value={form.stage}
                    onChange={(e) => setField("stage", e.target.value)}
                  >
                    <option value="">Default</option>
                    {stages
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Source
                  </label>
                  <Input
                    value={form.source}
                    onChange={(e) => setField("source", e.target.value)}
                    placeholder="e.g. Referral"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Project Type
                  </label>
                  <select
                    className={selectClass}
                    value={form.projectType}
                    onChange={(e) => setField("projectType", e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {projectTypeSelectOptions.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Estimated Value (₹)
                  </label>
                  <Input
                    type="number"
                    value={form.estimatedValue}
                    onChange={(e) =>
                      setField("estimatedValue", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Location
                  </label>
                  <Input
                    value={form.location}
                    onChange={(e) => setField("location", e.target.value)}
                    placeholder="City / Area"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Additional notes…"
                />
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to save lead. Please check the fields and try again.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!form.title.trim() || saveMutation.isPending}
                  onClick={handleSave}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : editingLead ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Delete Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {deleteTarget.title}
                </span>
                ? This action cannot be undone.
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to delete. Please try again.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
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
