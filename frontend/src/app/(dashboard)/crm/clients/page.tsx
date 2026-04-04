"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiResponse, Client, PageMeta } from "@/types";
import { Plus, Pencil, Trash2, ExternalLink, Search } from "lucide-react";

const PAGE_SIZE = 20;

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", type: "company", gstin: "", pan: "", industrySegment: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["crm", "clients", page, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data: res } = await apiClient.get<ApiResponse<Client[]>>("/api/v1/crm/clients", { params });
      return { items: res.data ?? [], meta: res.meta };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        type: form.type || "company",
        gstin: form.gstin.trim() || null,
        pan: form.pan.trim() || null,
        industrySegment: form.industrySegment.trim() || null,
      };
      if (editingClient) {
        await apiClient.put(`/api/v1/crm/clients/${editingClient.id}`, payload);
      } else {
        await apiClient.post("/api/v1/crm/clients", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "clients"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/crm/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "clients"] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingClient(null);
    setForm({ name: "", type: "company", gstin: "", pan: "", industrySegment: "" });
    setDialogOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      type: client.type || "company",
      gstin: client.gstin || "",
      pan: client.pan || "",
      industrySegment: client.industrySegment || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingClient(null);
    setForm({ name: "", type: "company", gstin: "", pan: "", industrySegment: "" });
  }

  const items = data?.items ?? [];
  const meta: PageMeta | undefined = data?.meta;

  let searchTimeout: ReturnType<typeof setTimeout>;
  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading clients…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No clients found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">GSTIN</th>
                    <th className="px-4 py-3 font-medium">Industry</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/crm/clients/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{c.type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.gstin || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.industrySegment || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/crm/clients/${c.id}`}>
                            <Button variant="ghost" size="sm" title="View details">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" title="Edit" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete" onClick={() => setDeleteTarget(c)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-xl font-semibold">{editingClient ? "Edit Client" : "New Client"}</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="company">Company</option>
                  <option value="individual">Individual</option>
                  <option value="government">Government</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">GSTIN</label>
                  <Input value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PAN</label>
                  <Input value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))} placeholder="ABCDE1234F" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Industry segment</label>
                <Input value={form.industrySegment} onChange={(e) => setForm((f) => ({ ...f, industrySegment: e.target.value }))} placeholder="e.g. Residential, Commercial" />
              </div>
              {saveMutation.isError && <p className="text-sm text-destructive">Save failed. Please check the fields.</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button disabled={!form.name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? "Saving…" : editingClient ? "Update" : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-lg">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-lg font-semibold">Delete client?</h2>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
              </p>
              {deleteMutation.isError && <p className="text-sm text-destructive">Delete failed.</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>
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
