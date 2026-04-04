"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiResponse, ContractDetail, ContractSummary, PageMeta, Project } from "@/types";
import { Plus, Search, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const PAGE_SIZE = 20;
const STATUSES = ["", "draft", "review", "sent", "signed", "archived"] as const;

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContractSummary | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["contracts", "projects-lookup"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Project[]>>("/api/v1/project/projects", {
        params: { page: 0, size: 200, sort: "name,asc" },
      });
      return data.data ?? [];
    },
  });

  const listQuery = useQuery({
    queryKey: ["contracts", page, debouncedQ, status, projectId],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: PAGE_SIZE,
        sort: "updatedAt,desc",
      };
      if (debouncedQ.trim()) params.q = debouncedQ.trim();
      if (status) params.status = status;
      if (projectId) params.projectId = projectId;
      const { data } = await apiClient.get<ApiResponse<ContractSummary[]>>("/api/v1/contracts", { params });
      return { items: data.data ?? [], meta: data.meta };
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<ContractDetail>>("/api/v1/contracts", {
        title: title.trim(),
        projectId: newProjectId || undefined,
        status: "draft",
      });
      return data.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setModalOpen(false);
      setTitle("");
      setNewProjectId("");
      if (created?.id) {
        window.location.href = `/contracts/${created.id}`;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setDeleteTarget(null);
    },
  });

  let searchTimeout: ReturnType<typeof setTimeout>;
  function onSearchChange(value: string) {
    setQ(value);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setDebouncedQ(value);
      setPage(0);
    }, 300);
  }

  const items = listQuery.data?.items ?? [];
  const meta: PageMeta | undefined = listQuery.data?.meta;
  const projects = projectsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-sm text-muted-foreground">Client agreements, revisions, and signed documents.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New contract
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-10 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading contracts…</p>
          ) : listQuery.isError ? (
            <p className="p-6 text-sm text-destructive">Could not load contracts.</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No contracts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Rev</th>
                    <th className="p-3 font-medium">Updated</th>
                    <th className="p-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b border-border/60">
                      <td className="p-3">
                        <Link href={`/contracts/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.title}
                        </Link>
                      </td>
                      <td className="p-3 capitalize">{c.status}</td>
                      <td className="p-3">{c.latestRevisionNumber ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} aria-label="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => !createMutation.isPending && setModalOpen(false)}
          />
          <Card className="relative z-10 w-full max-w-md shadow-lg">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">New contract</h2>
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Agreement title" autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Project (optional)</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                >
                  <option value="">Firm-level (no project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">Could not create contract. Check title and permissions.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={createMutation.isPending}>
                  Cancel
                </Button>
                <Button type="button" disabled={!title.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => setDeleteTarget(null)} />
          <Card className="relative z-10 w-full max-w-sm shadow-lg">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm">Delete contract &quot;{deleteTarget.title}&quot;?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
