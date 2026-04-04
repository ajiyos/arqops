"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, PageMeta, Vendor } from "@/types";
import { Plus, Pencil, Trash2, ExternalLink, Search } from "lucide-react";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  name: "",
  category: "",
  specialty: "",
  gstin: "",
  pan: "",
  address: "",
  phone: "",
  email: "",
};

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (s === "inactive") return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  if (s === "suspended") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  return "bg-muted text-muted-foreground";
}

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor", "vendors", page, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: PAGE_SIZE };
      if (debouncedSearch) params.q = debouncedSearch;
      const { data: res } = await apiClient.get<ApiResponse<Vendor[]>>("/api/v1/vendor/vendors", { params });
      return { items: res.data ?? [], meta: res.meta };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        specialty: form.specialty.trim() || null,
        gstin: form.gstin.trim() || null,
        pan: form.pan.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      };
      if (editingVendor) {
        await apiClient.put(`/api/v1/vendor/vendors/${editingVendor.id}`, payload);
      } else {
        await apiClient.post("/api/v1/vendor/vendors", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "vendors"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/vendor/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "vendors"] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingVendor(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      category: vendor.category || "",
      specialty: vendor.specialty || "",
      gstin: vendor.gstin || "",
      pan: vendor.pan || "",
      address: vendor.address || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingVendor(null);
    setForm(EMPTY_FORM);
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
            placeholder="Search vendors…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Vendor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading vendors…</p>
          ) : isError ? (
            <p className="p-6 text-sm text-destructive">Failed to load vendors.</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No vendors found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Specialty</th>
                    <th className="px-4 py-3 font-medium">GSTIN</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/vendors/${v.id}`} className="font-medium text-primary hover:underline">
                          {v.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{v.category || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.specialty || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.gstin || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            statusBadgeClass(v.status)
                          )}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/vendors/${v.id}`}>
                            <Button variant="ghost" size="sm" title="View details">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" title="Edit" onClick={() => openEdit(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete" onClick={() => setDeleteTarget(v)} className="text-destructive hover:text-destructive">
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
              <h2 className="text-xl font-semibold">{editingVendor ? "Edit Vendor" : "New Vendor"}</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Vendor name" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Contractor" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specialty</label>
                  <Input value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Electrical" />
                </div>
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
                <label className="text-sm font-medium">Address</label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Full address" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 ..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" />
                </div>
              </div>
              {saveMutation.isError && <p className="text-sm text-destructive">Save failed. Please check the fields.</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button disabled={!form.name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? "Saving…" : editingVendor ? "Update" : "Create"}
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
              <h2 className="text-lg font-semibold">Delete vendor?</h2>
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
