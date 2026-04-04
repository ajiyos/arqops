"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResponse, Role } from "@/types";
import { useAuth } from "@/lib/auth/auth-context";
import { Pencil, ShieldPlus, Trash2 } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { group: "CRM", perms: [{ value: "crm.read", label: "Read" }, { value: "crm.write", label: "Write" }, { value: "crm.delete", label: "Delete" }] },
  { group: "Vendor", perms: [{ value: "vendor.read", label: "Read" }, { value: "vendor.write", label: "Write" }, { value: "vendor.delete", label: "Delete" }, { value: "vendor.approve", label: "Approve" }] },
  { group: "Project", perms: [{ value: "project.read", label: "Read" }, { value: "project.write", label: "Write" }, { value: "project.delete", label: "Delete" }] },
  { group: "Finance", perms: [{ value: "finance.read", label: "Read" }, { value: "finance.write", label: "Write" }, { value: "finance.delete", label: "Delete" }] },
  { group: "HR", perms: [{ value: "hr.read", label: "Read" }, { value: "hr.write", label: "Write" }, { value: "hr.delete", label: "Delete" }, { value: "hr.approve", label: "Approve" }] },
  { group: "Reports", perms: [{ value: "report.read", label: "Read" }] },
  { group: "Contracts", perms: [{ value: "contract.read", label: "Read" }, { value: "contract.write", label: "Write" }] },
] as const;

type ModalMode = "create" | "edit";

export default function SettingsRolesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isTenantAdmin = (user?.roles ?? []).includes("TENANT_ADMIN");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

  const { data: roles, isLoading, isError } = useQuery({
    queryKey: ["tenant", "roles"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Role[]>>("/api/v1/tenant/roles");
      return res.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modalMode === "create") {
        await apiClient.post("/api/v1/tenant/roles", { name: name.trim(), permissions: selectedPerms });
      } else {
        await apiClient.put(`/api/v1/tenant/roles/${editRoleId}`, { name: name.trim(), permissions: selectedPerms });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "roles"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.delete(`/api/v1/tenant/roles/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "roles"] });
      setDeleteConfirm(null);
    },
  });

  function openCreate() {
    setModalMode("create");
    setEditRoleId(null);
    setName("");
    setSelectedPerms([]);
    setModalOpen(true);
  }

  function openEdit(role: Role) {
    setModalMode("edit");
    setEditRoleId(role.id);
    setName(role.name);
    setSelectedPerms(role.permissions ?? []);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditRoleId(null);
    setName("");
    setSelectedPerms([]);
  }

  function togglePerm(perm: string) {
    setSelectedPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  }

  function toggleGroup(group: typeof AVAILABLE_PERMISSIONS[number]) {
    const allGroupPerms: string[] = group.perms.map((p) => p.value);
    const allSelected = allGroupPerms.every((p) => selectedPerms.includes(p));
    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((p) => !allGroupPerms.includes(p)));
    } else {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...allGroupPerms])));
    }
  }

  function permLabel(perm: string): string {
    for (const group of AVAILABLE_PERMISSIONS) {
      for (const p of group.perms) {
        if (p.value === perm) return `${group.group} ${p.label}`;
      }
    }
    return perm;
  }

  return (
    <div className="space-y-6">
      {isTenantAdmin && (
        <div className="flex justify-end">
          <Button type="button" onClick={openCreate}>
            <ShieldPlus className="mr-2 h-4 w-4" />
            Create role
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All roles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading roles…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Could not load roles.</p>
          ) : !roles?.length ? (
            <p className="text-sm text-muted-foreground">No roles found.</p>
          ) : (
            <ul className="space-y-4">
              {roles.map((role) => (
                <li key={role.id} className="rounded-lg border border-border bg-card/50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {role.systemRole && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">System</span>
                      )}
                    </div>
                    {isTenantAdmin && !role.systemRole && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(role)} title="Edit role">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(role)} title="Delete role">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(role.permissions ?? []).length ? (
                      role.permissions.map((p) => (
                        <span key={p} className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                          {permLabel(p)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No permissions</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit modal */}
      {modalOpen && isTenantAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{modalMode === "create" ? "Create role" : "Edit role"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="role-name">Name</label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PROJECT_MANAGER"
                  disabled={modalMode === "edit"}
                />
              </div>

              <div className="space-y-3">
                <span className="text-sm font-medium">Permissions</span>
                <div className="max-h-64 space-y-4 overflow-y-auto rounded-md border p-3">
                  {AVAILABLE_PERMISSIONS.map((group) => {
                    const allGroupPerms = group.perms.map((p) => p.value);
                    const allSelected = allGroupPerms.every((p) => selectedPerms.includes(p));
                    const someSelected = allGroupPerms.some((p) => selectedPerms.includes(p));
                    return (
                      <div key={group.group}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={() => toggleGroup(group)}
                          />
                          {group.group}
                        </label>
                        <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {group.perms.map((p) => (
                            <label key={p.value} className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-input"
                                checked={selectedPerms.includes(p.value)}
                                onChange={() => togglePerm(p.value)}
                              />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{selectedPerms.length} permission{selectedPerms.length !== 1 ? "s" : ""} selected</p>
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-destructive">Could not save role.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="button" disabled={!name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? "Saving…" : modalMode === "create" ? "Create" : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Delete role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete <span className="font-medium text-foreground">{deleteConfirm.name}</span>? Users with this role will lose its permissions.
              </p>
              {deleteMutation.isError && <p className="text-sm text-destructive">Could not delete role.</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm.id)}>
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
