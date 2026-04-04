"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useTenantProjectTypesQuery } from "@/lib/hooks/use-tenant-project-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, Client, Project } from "@/types";

const PAGE_SIZE = 20;
const STATUSES = ["all", "active", "completed", "on_hold"] as const;
type StatusFilter = (typeof STATUSES)[number];

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "completed":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "on_hold":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
};

interface ProjectForm {
  name: string;
  clientId: string;
  type: string;
  location: string;
  siteAddress: string;
  startDate: string;
  targetEndDate: string;
  value: string;
}

const emptyForm: ProjectForm = {
  name: "",
  clientId: "",
  type: "",
  location: "",
  siteAddress: "",
  startDate: "",
  targetEndDate: "",
  value: "",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function buildPayload(form: ProjectForm) {
  const valueNum = form.value.trim() === "" ? undefined : Number(form.value);
  return {
    name: form.name.trim(),
    clientId: form.clientId || undefined,
    type: form.type || undefined,
    location: form.location.trim() || undefined,
    siteAddress: form.siteAddress.trim() || undefined,
    startDate: form.startDate || undefined,
    targetEndDate: form.targetEndDate || undefined,
    value: Number.isFinite(valueNum) ? valueNum : undefined,
  };
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isTenantAdmin = user?.roles?.includes("TENANT_ADMIN") ?? false;

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Clients lookup ──────────────────────────────────────────────────
  const { data: clientsData } = useQuery({
    queryKey: ["clients", "lookup"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Client[]>>(
        "/api/v1/crm/clients",
        { params: { page: 0, size: 500 } },
      );
      return data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const clientById = useMemo(() => {
    const m = new Map<string, string>();
    (clientsData ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clientsData]);

  const { data: tenantProjectTypes } = useTenantProjectTypesQuery();
  const projectTypeSelectOptions = useMemo(() => {
    const base = tenantProjectTypes ?? [];
    const legacy = editingProject?.type?.trim();
    if (legacy && !base.some((t) => t.name === legacy)) {
      return [{ id: "__legacy__", name: legacy, displayOrder: -1 }, ...base];
    }
    return base;
  }, [tenantProjectTypes, editingProject?.type]);

  // ── Projects list ───────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["projects", page, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: PAGE_SIZE };
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await apiClient.get<ApiResponse<Project[]>>(
        "/api/v1/project/projects",
        { params },
      );
      return { list: data.data ?? [], meta: data.meta };
    },
  });

  const projects = data?.list ?? [];
  const meta = data?.meta;

  // ── Create / Update mutation ────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      if (editingProject) {
        const { data } = await apiClient.put<ApiResponse<Project>>(
          `/api/v1/project/projects/${editingProject.id}`,
          { ...payload, status: editingProject.status },
        );
        return data.data;
      }
      const { data } = await apiClient.post<ApiResponse<Project>>(
        "/api/v1/project/projects",
        { ...payload, status: "active" },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeModal();
    },
  });

  // ── Delete mutation ─────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/project/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
    },
  });

  // ── Modal helpers ───────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditingProject(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: Project) => {
    setEditingProject(p);
    setForm({
      name: p.name,
      clientId: p.clientId ?? "",
      type: p.type ?? "",
      location: p.location ?? "",
      siteAddress: p.siteAddress ?? "",
      startDate: p.startDate ?? "",
      targetEndDate: p.targetEndDate ?? "",
      value: p.value != null ? String(p.value) : "",
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingProject(null);
    setForm(emptyForm);
    saveMutation.reset();
  }, [saveMutation]);

  useEffect(() => {
    if (modalOpen) {
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [modalOpen]);

  const updateField = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Reset page on filter/search change ──────────────────────────────
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          {isTenantAdmin && (
            <Button variant="outline" size="icon" asChild title="Project defaults (tenant admin)">
              <Link href="/projects/settings" aria-label="Project settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            All projects
            {meta && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({meta.totalElements})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Start Date</th>
                  <th className="px-4 py-3 font-medium text-right">Value</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Loading projects…</p>
                    </td>
                  </tr>
                )}
                {isError && !isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <p className="text-destructive">Failed to load projects.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && projects.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      {debouncedSearch || statusFilter !== "all"
                        ? "No projects match your filters."
                        : "No projects yet. Create one to get started."}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !isError &&
                  projects.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/projects/${p.id}`} className="text-primary hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.clientId ? clientById.get(p.clientId) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3">{p.type ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.location ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            statusBadgeClass(p.status),
                          )}
                        >
                          {p.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.startDate ? formatDate(p.startDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {p.value != null ? formatCurrency(Number(p.value)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/projects/${p.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
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

      {/* ── Create / Edit Modal ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !saveMutation.isPending && closeModal()}
          />
          <Card className="relative z-10 w-full max-w-lg shadow-xl animate-in fade-in-0 zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">
                {editingProject ? "Edit Project" : "New Project"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={closeModal}
                disabled={saveMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (form.name.trim()) saveMutation.mutate();
                }}
              >
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="proj-name" className="text-sm font-medium">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="proj-name"
                    ref={nameInputRef}
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Project name"
                    required
                  />
                </div>

                {/* Client */}
                <div className="space-y-1.5">
                  <label htmlFor="proj-client" className="text-sm font-medium">
                    Client
                  </label>
                  <select
                    id="proj-client"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.clientId}
                    onChange={(e) => updateField("clientId", e.target.value)}
                  >
                    <option value="">— None —</option>
                    {(clientsData ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <label htmlFor="proj-type" className="text-sm font-medium">
                    Type
                  </label>
                  <select
                    id="proj-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.type}
                    onChange={(e) => updateField("type", e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {projectTypeSelectOptions.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location + Site Address */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="proj-location" className="text-sm font-medium">
                      Location
                    </label>
                    <Input
                      id="proj-location"
                      value={form.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="proj-site" className="text-sm font-medium">
                      Site Address
                    </label>
                    <Input
                      id="proj-site"
                      value={form.siteAddress}
                      onChange={(e) => updateField("siteAddress", e.target.value)}
                      placeholder="Full address"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="proj-start" className="text-sm font-medium">
                      Start Date
                    </label>
                    <Input
                      id="proj-start"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => updateField("startDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="proj-end" className="text-sm font-medium">
                      Target End Date
                    </label>
                    <Input
                      id="proj-end"
                      type="date"
                      value={form.targetEndDate}
                      onChange={(e) => updateField("targetEndDate", e.target.value)}
                    />
                  </div>
                </div>

                {/* Value */}
                <div className="space-y-1.5">
                  <label htmlFor="proj-value" className="text-sm font-medium">
                    Value (INR)
                  </label>
                  <Input
                    id="proj-value"
                    type="number"
                    min={0}
                    step="1"
                    value={form.value}
                    onChange={(e) => updateField("value", e.target.value)}
                    placeholder="0"
                  />
                </div>

                {saveMutation.isError && (
                  <p className="text-sm text-destructive">
                    {saveMutation.error instanceof Error
                      ? saveMutation.error.message
                      : "Something went wrong. Please try again."}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!form.name.trim() || saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProject && (saveMutation.isPending ? "Saving…" : "Save Changes")}
                    {!editingProject && (saveMutation.isPending ? "Creating…" : "Create Project")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
          />
          <Card className="relative z-10 w-full max-w-sm shadow-xl animate-in fade-in-0 zoom-in-95">
            <CardHeader>
              <CardTitle className="text-lg">Delete Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">{deleteTarget.name}</span>? This
                action cannot be undone.
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to delete project. Please try again.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                >
                  {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
