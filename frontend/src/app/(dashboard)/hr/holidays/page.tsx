"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import type { ApiResponse, Holiday } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const HOLIDAY_TYPES = [
  { value: "national", label: "National" },
  { value: "regional", label: "Regional" },
  { value: "optional", label: "Optional" },
] as const;

type ModalMode = "create" | "edit";

export default function HrHolidaysPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(2026);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", date: "", type: "national" });

  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const years = useMemo(() => {
    const cy = new Date().getFullYear();
    const low = Math.min(year, cy) - 5;
    const high = Math.max(year, cy) + 5;
    const list: number[] = [];
    for (let y = low; y <= high; y++) list.push(y);
    return list;
  }, [year]);

  const { data: holidays, isLoading, isError } = useQuery({
    queryKey: ["hr", "holidays", year],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Holiday[]>>("/api/v1/hr/holidays", {
        params: { year },
      });
      return res.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name: form.name.trim(), date: form.date, type: form.type };
      if (modalMode === "create") {
        await apiClient.post("/api/v1/hr/holidays", body);
      } else if (editId) {
        await apiClient.put(`/api/v1/hr/holidays/${editId}`, body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "holidays"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/hr/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "holidays"] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setModalMode("create");
    setEditId(null);
    setForm({ name: "", date: `${year}-01-01`, type: "national" });
    setModalOpen(true);
  }

  function openEdit(h: Holiday) {
    setModalMode("edit");
    setEditId(h.id);
    setForm({ name: h.name, date: h.date.slice(0, 10), type: h.type });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setForm({ name: "", date: "", type: "national" });
  }

  const rows = holidays ?? [];
  const canSave = form.name.trim() && form.date && form.type;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="holiday-year">
            Year
          </label>
          <select
            id="holiday-year"
            className={selectClassName + " w-[140px]"}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add holiday
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Holiday calendar</CardTitle>
          <p className="text-sm text-muted-foreground">Public and optional holidays for the selected year.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading holidays…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Could not load holidays.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holidays for {year}.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{h.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(h.date)}</td>
                      <td className="px-4 py-3 capitalize">{h.type}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" type="button" title="Edit holiday" onClick={() => openEdit(h)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" type="button" title="Delete holiday" onClick={() => setDeleteTarget(h)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{modalMode === "create" ? "Add holiday" : "Edit holiday"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="h-name">
                  Name
                </label>
                <Input id="h-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Holiday name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="h-date">
                  Date
                </label>
                <Input id="h-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="h-type">
                  Type
                </label>
                <select
                  id="h-type"
                  className={selectClassName}
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {saveMutation.isError && <p className="text-sm text-destructive">Could not save holiday. Check fields and try again.</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="button" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? "Saving…" : modalMode === "create" ? "Create" : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Delete holiday</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Remove <span className="font-medium text-foreground">{deleteTarget.name}</span> ({formatDate(deleteTarget.date)})?
              </p>
              {deleteMutation.isError && <p className="text-sm text-destructive">Could not delete holiday.</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
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
    </div>
  );
}
