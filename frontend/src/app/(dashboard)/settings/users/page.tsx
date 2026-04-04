"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, PageMeta, Role, User } from "@/types";
import { useAuth } from "@/lib/auth/auth-context";
import { Pencil, Trash2, UserPlus } from "lucide-react";

const PAGE_SIZE = 20;

type ModalMode = "create" | "edit";

export default function SettingsUsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isTenantAdmin = (user?.roles ?? []).includes("TENANT_ADMIN");
  const [page, setPage] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", status: "active", roleNames: [] as string[] });

  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant", "users", page],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<User[]>>("/api/v1/tenant/users", {
        params: { page, size: PAGE_SIZE },
      });
      return { items: res.data ?? [], meta: res.meta };
    },
    enabled: isTenantAdmin,
  });

  const { data: roles } = useQuery({
    queryKey: ["tenant", "roles"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Role[]>>("/api/v1/tenant/roles");
      return res.data ?? [];
    },
    enabled: isTenantAdmin && modalOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modalMode === "create") {
        await apiClient.post("/api/v1/tenant/users", {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          roleNames: form.roleNames.length ? form.roleNames : undefined,
        });
      } else {
        await apiClient.put(`/api/v1/tenant/users/${editUserId}`, {
          name: form.name.trim(),
          status: form.status,
          roleNames: form.roleNames,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/tenant/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
      setDeleteConfirm(null);
    },
  });

  function openCreate() {
    setModalMode("create");
    setEditUserId(null);
    setForm({ name: "", email: "", password: "", status: "active", roleNames: [] });
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setModalMode("edit");
    setEditUserId(u.id);
    setForm({ name: u.name, email: u.email, password: "", status: u.status, roleNames: u.roles ?? [] });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditUserId(null);
    setForm({ name: "", email: "", password: "", status: "active", roleNames: [] });
  }

  function toggleRole(name: string) {
    setForm((f) => ({
      ...f,
      roleNames: f.roleNames.includes(name) ? f.roleNames.filter((r) => r !== name) : [...f.roleNames, name],
    }));
  }

  const items = data?.items ?? [];
  const meta: PageMeta | undefined = data?.meta;

  const canSave = modalMode === "create"
    ? form.name.trim() && form.email.trim() && form.password
    : form.name.trim();

  return (
    <div className="space-y-6">
      {isTenantAdmin && (
        <div className="flex justify-end">
          <Button type="button" onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite user
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {!isTenantAdmin ? (
            <p className="text-sm text-muted-foreground">You need TENANT_ADMIN to view and manage users.</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Could not load users.</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Roles</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(u.roles ?? []).map((r) => (
                              <span key={r} className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {r}
                              </span>
                            ))}
                            {!(u.roles ?? []).length && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            u.status?.toLowerCase() === "active"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-700 dark:text-red-400",
                          )}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit user">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(u)}
                              title="Deactivate user"
                              disabled={u.id === user?.userId}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Page {meta.page + 1} of {meta.totalPages} ({meta.totalElements} total)</span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
                    <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit modal */}
      {modalOpen && isTenantAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{modalMode === "create" ? "Invite user" : "Edit user"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="u-name">Name</label>
                <Input id="u-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              {modalMode === "create" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="u-email">Email</label>
                    <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="u-pass">Initial password</label>
                    <Input id="u-pass" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                  </div>
                </>
              )}
              {modalMode === "edit" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="u-status">Status</label>
                  <select
                    id="u-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <span className="text-sm font-medium">Roles</span>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                  {(roles ?? []).map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={form.roleNames.includes(r.name)}
                        onChange={() => toggleRole(r.name)}
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                  {roles && roles.length === 0 && <p className="text-xs text-muted-foreground">No roles found.</p>}
                </div>
              </div>
              {saveMutation.isError && (
                <p className="text-sm text-destructive">Could not save user. Check fields and permissions.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="button" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? "Saving…" : modalMode === "create" ? "Create" : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Deactivate user</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to deactivate <span className="font-medium text-foreground">{deleteConfirm.name}</span> ({deleteConfirm.email})? They will no longer be able to log in.
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">Could not deactivate user.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                >
                  {deleteMutation.isPending ? "Deactivating…" : "Deactivate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
