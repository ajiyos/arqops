"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Trash2, Link2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, Employee, PageMeta, User } from "@/types";

const PAGE_SIZE = 20;

const EMPLOYEE_STATUSES = ["active", "inactive", "on_notice", "terminated"] as const;
type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

interface EmployeeForm {
  userId: string;
  name: string;
  employeeCode: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  phone: string;
  personalEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  status: EmployeeStatus;
}

const emptyForm: EmployeeForm = {
  userId: "",
  name: "",
  employeeCode: "",
  designation: "",
  department: "",
  dateOfJoining: "",
  phone: "",
  personalEmail: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  status: "active",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function normalizeStatus(status: string): EmployeeStatus {
  return EMPLOYEE_STATUSES.includes(status as EmployeeStatus)
    ? (status as EmployeeStatus)
    : "active";
}

type DesignationRateRow = { id: string; designation: string; hourlyRate: number; displayOrder: number };

function buildPayload(form: EmployeeForm) {
  return {
    userId: form.userId || undefined,
    name: form.name.trim(),
    employeeCode: form.employeeCode.trim() || undefined,
    designation: form.designation.trim(),
    department: form.department.trim() || undefined,
    dateOfJoining: form.dateOfJoining || undefined,
    phone: form.phone.trim() || undefined,
    personalEmail: form.personalEmail.trim() || undefined,
    emergencyContactName: form.emergencyContactName.trim() || undefined,
    emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
    emergencyContactRelation: form.emergencyContactRelation.trim() || undefined,
    status: form.status,
  };
}

export default function HrEmployeesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["hr", "employees", page],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Employee[]>>("/api/v1/hr/employees", {
        params: { page, size: PAGE_SIZE },
      });
      return { list: data.data ?? [], meta: data.meta };
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["tenant", "users", "all"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<User[]>>("/api/v1/tenant/users", {
        params: { page: 0, size: 200 },
      });
      return res.data ?? [];
    },
    enabled: modalOpen,
  });

  const { data: designationRates } = useQuery({
    queryKey: ["hr", "designation-rates"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<DesignationRateRow[]>>("/api/v1/hr/designation-rates");
      return res.data ?? [];
    },
    enabled: modalOpen,
  });

  const designationOptions = useMemo(() => {
    return [...(designationRates ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [designationRates]);

  const designationSelectOptions = useMemo(() => {
    const base = designationOptions;
    const legacy = editingEmployee?.designation?.trim();
    if (legacy && !base.some((d) => d.designation === legacy)) {
      return [{ id: "__legacy__", designation: legacy, hourlyRate: 0, displayOrder: -1 }, ...base];
    }
    return base;
  }, [designationOptions, editingEmployee]);

  const employees = data?.list ?? [];
  const meta: PageMeta | undefined = data?.meta;

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeCode?.toLowerCase().includes(q) ?? false) ||
        (e.designation?.toLowerCase().includes(q) ?? false) ||
        (e.department?.toLowerCase().includes(q) ?? false) ||
        (e.emergencyContactName?.toLowerCase().includes(q) ?? false) ||
        (e.emergencyContactPhone?.toLowerCase().includes(q) ?? false),
    );
  }, [employees, debouncedSearch]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      if (editingEmployee) {
        await apiClient.put(`/api/v1/hr/employees/${editingEmployee.id}`, payload);
      } else {
        await apiClient.post("/api/v1/hr/employees", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
      setModalOpen(false);
      setEditingEmployee(null);
      setForm(emptyForm);
      saveMutation.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/hr/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    saveMutation.reset();
    setModalOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditingEmployee(e);
    setForm({
      userId: e.userId ?? "",
      name: e.name,
      employeeCode: e.employeeCode ?? "",
      designation: e.designation ?? "",
      department: e.department ?? "",
      dateOfJoining: e.dateOfJoining ? e.dateOfJoining.slice(0, 10) : "",
      phone: e.phone ?? "",
      personalEmail: e.personalEmail ?? "",
      emergencyContactName: e.emergencyContactName ?? "",
      emergencyContactPhone: e.emergencyContactPhone ?? "",
      emergencyContactRelation: e.emergencyContactRelation ?? "",
      status: normalizeStatus(e.status),
    });
    saveMutation.reset();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saveMutation.isPending) return;
    setModalOpen(false);
    setEditingEmployee(null);
    setForm(emptyForm);
    saveMutation.reset();
  };

  const updateField = <K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  let saveActionLabel = "Create";
  if (saveMutation.isPending) {
    saveActionLabel = editingEmployee ? "Saving…" : "Creating…";
  } else if (editingEmployee) {
    saveActionLabel = "Save changes";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:flex-1 lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, code, department, designation…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            Directory
            {meta != null && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({meta.totalElements})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Linked User</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Loading employees…</p>
                    </td>
                  </tr>
                )}
                {isError && !isLoading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <p className="text-destructive">Could not load employees.</p>
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                      {debouncedSearch.trim()
                        ? "No employees match your search on this page."
                        : "No employees yet."}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !isError &&
                  filtered.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.employeeCode ?? "—"}</td>
                      <td className="px-4 py-3">
                        {row.userEmail ? (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground">{row.userName ?? row.userEmail}</span>
                            <span className="text-xs text-muted-foreground">({row.userEmail})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.designation ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.department ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            row.status === "active"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {row.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.dateOfJoining ? formatDate(row.dateOfJoining) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <Card className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl animate-in fade-in-0 zoom-in-95">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{editingEmployee ? "Edit Employee" : "Add Employee"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name.trim() || !form.designation.trim()) return;
                  saveMutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <label htmlFor="emp-name" className="text-sm font-medium">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="emp-name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-user" className="text-sm font-medium">
                    Linked user account
                  </label>
                  <select
                    id="emp-user"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.userId}
                    onChange={(e) => updateField("userId", e.target.value)}
                  >
                    <option value="">— No linked user —</option>
                    {(usersData ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Link this employee to a login user account
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-code" className="text-sm font-medium">
                    Employee code
                  </label>
                  <Input
                    id="emp-code"
                    value={form.employeeCode}
                    onChange={(e) => updateField("employeeCode", e.target.value)}
                    placeholder="e.g. EMP-1024"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-desig" className="text-sm font-medium">
                    Designation <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="emp-desig"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.designation}
                    onChange={(e) => updateField("designation", e.target.value)}
                    required={!editingEmployee}
                  >
                    <option value="">Select designation…</option>
                    {designationSelectOptions.map((d) => (
                      <option key={d.id} value={d.designation}>
                        {d.designation}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Configure titles and hourly rates under Designation rates in HR.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-dept" className="text-sm font-medium">
                    Department
                  </label>
                  <Input
                    id="emp-dept"
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                    placeholder="Department"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-doj" className="text-sm font-medium">
                    Date of joining
                  </label>
                  <Input
                    id="emp-doj"
                    type="date"
                    value={form.dateOfJoining}
                    onChange={(e) => updateField("dateOfJoining", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="emp-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-email" className="text-sm font-medium">
                    Personal email
                  </label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={form.personalEmail}
                    onChange={(e) => updateField("personalEmail", e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-semibold">Emergency contact</p>
                  <div className="space-y-1.5">
                    <label htmlFor="emp-ec-name" className="text-sm font-medium">
                      Emergency contact name
                    </label>
                    <Input
                      id="emp-ec-name"
                      value={form.emergencyContactName}
                      onChange={(e) => updateField("emergencyContactName", e.target.value)}
                      placeholder="Full name"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="emp-ec-phone" className="text-sm font-medium">
                      Emergency contact phone
                    </label>
                    <Input
                      id="emp-ec-phone"
                      type="tel"
                      value={form.emergencyContactPhone}
                      onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                      placeholder="Phone number"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="emp-ec-relation" className="text-sm font-medium">
                      Relation
                    </label>
                    <Input
                      id="emp-ec-relation"
                      value={form.emergencyContactRelation}
                      onChange={(e) => updateField("emergencyContactRelation", e.target.value)}
                      placeholder="e.g. Spouse, Parent, Sibling"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-status" className="text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="emp-status"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value as EmployeeStatus)}
                  >
                    {EMPLOYEE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {saveMutation.isError && (
                  <p className="text-sm text-destructive">
                    {saveMutation.error instanceof Error
                      ? saveMutation.error.message
                      : "Could not save employee. Please try again."}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeModal} disabled={saveMutation.isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!form.name.trim() || !form.designation.trim() || saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {saveActionLabel}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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
              <CardTitle className="text-lg">Delete employee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove{" "}
                <span className="font-medium text-foreground">{deleteTarget.name}</span>? They will be hidden from
                the directory (soft delete).
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">Failed to delete employee. Please try again.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
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
