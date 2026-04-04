"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiResponse, Employee, Project } from "@/types";

const MANAGER_ROLES = new Set(["TENANT_ADMIN", "HR_ADMIN"]);

function useCanPickEmployee(): boolean {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  if (roles.some((r) => MANAGER_ROLES.has(r))) return true;
  return (user?.permissions ?? []).includes("hr.approve");
}

type TimeEntryDto = {
  id: string;
  employeeId: string;
  projectId: string | null;
  workDate: string;
  hours: number;
  billable: boolean;
  notes: string | null;
};

type RowDraft = {
  key: string;
  workDate: string;
  projectId: string;
  hours: string;
  billable: boolean;
  notes: string;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function newKey() {
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  return res;
}

function addDays(d: Date, n: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + n);
  return res;
}

function rangeForMode(mode: "day" | "week", anchor: string): { from: string; to: string } {
  const base = parseYMD(anchor);
  if (mode === "day") {
    const y = toYMD(base);
    return { from: y, to: y };
  }
  const start = startOfWeekMonday(base);
  const end = addDays(start, 6);
  return { from: toYMD(start), to: toYMD(end) };
}

export default function TimesheetsPage() {
  const queryClient = useQueryClient();
  const canPickEmployee = useCanPickEmployee();
  const [mode, setMode] = useState<"day" | "week">("week");
  const [anchorDate, setAnchorDate] = useState(() => toYMD(new Date()));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [rows, setRows] = useState<RowDraft[]>([]);

  const { from, to } = useMemo(() => rangeForMode(mode, anchorDate), [mode, anchorDate]);

  const { data: employeesList } = useQuery({
    queryKey: ["hr", "employees", "timesheet-picker"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Employee[]>>("/api/v1/hr/employees", {
        params: { page: 0, size: 500 },
      });
      return res.data ?? [];
    },
    enabled: canPickEmployee,
  });

  const { data: projects } = useQuery({
    queryKey: ["project", "projects", "timesheets"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Project[]>>("/api/v1/project/projects", {
        params: { page: 0, size: 200 },
      });
      return res.data ?? [];
    },
  });

  const entriesQueryKey = ["hr", "time-entries", from, to, canPickEmployee ? selectedEmployeeId : "self"];

  const { data: serverEntries, isLoading } = useQuery({
    queryKey: entriesQueryKey,
    queryFn: async () => {
      const params: Record<string, string> = { from, to };
      if (canPickEmployee && selectedEmployeeId) {
        params.employeeId = selectedEmployeeId;
      }
      const { data: res } = await apiClient.get<ApiResponse<TimeEntryDto[]>>("/api/v1/hr/time-entries", { params });
      return res.data ?? [];
    },
  });

  const mapServerToRows = useCallback((entries: TimeEntryDto[]): RowDraft[] => {
    return entries.map((e) => ({
      key: e.id,
      workDate: e.workDate.slice(0, 10),
      projectId: e.projectId ?? "",
      hours: String(e.hours),
      billable: e.billable,
      notes: e.notes ?? "",
    }));
  }, []);

  useEffect(() => {
    if (serverEntries === undefined) return;
    setRows(mapServerToRows(serverEntries));
  }, [serverEntries, mapServerToRows]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const entries = rows.map((r) => {
        const h = Number(r.hours);
        if (Number.isNaN(h) || h <= 0) {
          throw new Error("Each row needs a positive hours value");
        }
        return {
          workDate: r.workDate,
          projectId: r.projectId || null,
          hours: h,
          billable: Boolean(r.projectId && r.billable),
          notes: r.notes.trim() || null,
        };
      });
      const body: Record<string, unknown> = { from, to, entries };
      if (canPickEmployee && selectedEmployeeId) {
        body.employeeId = selectedEmployeeId;
      }
      const { data: res } = await apiClient.put<ApiResponse<TimeEntryDto[]>>("/api/v1/hr/time-entries", body);
      return res.data ?? [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hr", "time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      setRows(mapServerToRows(data));
    },
  });

  const addRow = () => {
    setRows((r) => [
      ...r,
      {
        key: newKey(),
        workDate: from,
        projectId: "",
        hours: "8",
        billable: false,
        notes: "",
      },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((r) => r.filter((x) => x.key !== key));
  };

  const updateRow = (key: string, patch: Partial<RowDraft>) => {
    setRows((r) =>
      r.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.projectId !== undefined && !patch.projectId) {
          next.billable = false;
        }
        return next;
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Log hours by day or week. Project rows can be marked billable; organization time is always non-billable.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Period</CardTitle>
          <CardDescription>
            {mode === "day" ? `Date: ${from}` : `Week: ${from} – ${to}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">View</span>
            <div className="flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  mode === "day" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setMode("day")}
              >
                Day
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  mode === "week" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setMode("week")}
              >
                Week
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ts-anchor" className="text-sm font-medium">
              {mode === "day" ? "Date" : "Week contains"}
            </label>
            <Input
              id="ts-anchor"
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="w-[200px]"
            />
          </div>
          {canPickEmployee && (
            <div className="space-y-1.5 min-w-[220px] flex-1">
              <label htmlFor="ts-emp" className="text-sm font-medium">
                Employee
              </label>
              <select
                id="ts-emp"
                className={selectClass}
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">My timesheet</option>
                {(employeesList ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.employeeCode ? ` (${e.employeeCode})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Entries</CardTitle>
            <CardDescription>Save replaces all entries in this date range for the selected employee.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Project</th>
                    <th className="px-2 py-2 font-medium">Hours</th>
                    <th className="px-2 py-2 font-medium">Billable</th>
                    <th className="px-2 py-2 font-medium">Notes</th>
                    <th className="px-2 py-2 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                        No entries. Add a row or save to clear the period.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b last:border-0">
                      <td className="px-2 py-2 align-top">
                        <Input
                          type="date"
                          value={row.workDate}
                          min={from}
                          max={to}
                          onChange={(e) => updateRow(row.key, { workDate: e.target.value })}
                          className="min-w-[140px]"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <select
                          className={selectClass}
                          value={row.projectId}
                          onChange={(e) => updateRow(row.key, { projectId: e.target.value })}
                        >
                          <option value="">Organization (non-project)</option>
                          {(projects ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 align-top w-24">
                        <Input
                          type="number"
                          min={0.01}
                          step={0.25}
                          value={row.hours}
                          onChange={(e) => updateRow(row.key, { hours: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={row.billable}
                          disabled={!row.projectId}
                          onChange={(e) => updateRow(row.key, { billable: e.target.checked })}
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Input
                          placeholder="Optional"
                          value={row.notes}
                          onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Remove row"
                          onClick={() => removeRow(row.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {syncMutation.isError && (
            <p className="text-sm text-destructive">
              {syncMutation.error instanceof Error ? syncMutation.error.message : "Could not save timesheet"}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" onClick={() => syncMutation.mutate()} disabled={isLoading || syncMutation.isPending}>
              {syncMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save timesheet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
