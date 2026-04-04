"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiResponse, AttendanceRecord, Employee } from "@/types";
import { ClipboardCheck, Loader2 } from "lucide-react";

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeHm(t?: string | null): string {
  if (t == null || String(t).trim() === "") return "—";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "PRESENT":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400";
    case "ABSENT":
      return "bg-red-500/15 text-red-800 dark:text-red-400";
    case "HALF_DAY":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-300";
    case "ON_LEAVE":
      return "bg-blue-500/15 text-blue-800 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "PRESENT":
      return "Present";
    case "ABSENT":
      return "Absent";
    case "HALF_DAY":
      return "Half day";
    case "ON_LEAVE":
      return "On leave";
    default:
      return status;
  }
}

type TodayRow = { employee: Employee; attendance?: AttendanceRecord };

export default function HrAttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => isoDateLocal(new Date()));
  const [markOpen, setMarkOpen] = useState(false);
  const [markForm, setMarkForm] = useState({
    employeeId: "",
    status: "PRESENT",
    checkInTime: "",
    checkOutTime: "",
    notes: "",
  });

  const { data: attendanceRecords, isLoading: loadingAtt, isError: errAtt } = useQuery({
    queryKey: ["hr", "attendance", "range", selectedDate],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AttendanceRecord[]>>("/api/v1/hr/attendance", {
        params: { from: selectedDate, to: selectedDate },
      });
      return data.data ?? [];
    },
  });

  const { data: employees, isLoading: loadingEmp, isError: errEmp } = useQuery({
    queryKey: ["hr", "employees", "attendance-directory"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Employee[]>>("/api/v1/hr/employees", {
        params: { page: 0, size: 200 },
      });
      return data.data ?? [];
    },
  });

  const rows: TodayRow[] = useMemo(() => {
    const list = employees ?? [];
    const byEmployee = new Map((attendanceRecords ?? []).map((a) => [a.employeeId, a]));
    return list.map((employee) => ({
      employee,
      attendance: byEmployee.get(employee.id),
    }));
  }, [employees, attendanceRecords]);

  const isLoading = loadingAtt || loadingEmp;
  const isError = errAtt || errEmp;

  const markMutation = useMutation({
    mutationFn: async () => {
      const toLocalTime = (raw: string): string | undefined => {
        const v = raw.trim();
        if (!v) return undefined;
        const m = /^(\d{1,2}):(\d{2})$/.exec(v);
        if (!m) return undefined;
        return `${m[1].padStart(2, "0")}:${m[2]}:00`;
      };
      const body: Record<string, unknown> = {
        employeeId: markForm.employeeId,
        date: selectedDate,
        status: markForm.status,
      };
      const ci = toLocalTime(markForm.checkInTime);
      const co = toLocalTime(markForm.checkOutTime);
      if (ci) body.checkInTime = ci;
      if (co) body.checkOutTime = co;
      if (markForm.notes.trim()) body.notes = markForm.notes.trim();
      await apiClient.post("/api/v1/hr/attendance", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "attendance"] });
      setMarkOpen(false);
      setMarkForm({ employeeId: "", status: "PRESENT", checkInTime: "", checkOutTime: "", notes: "" });
    },
  });

  const employeeOptions = employees ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold">Attendance</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="attendance-date" className="text-sm font-medium text-muted-foreground">
              Date
            </label>
            <Input
              id="attendance-date"
              type="date"
              className="w-full min-w-[11rem] sm:w-auto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="sm:mb-0"
            onClick={() => {
              const first = employeeOptions[0]?.id;
              setMarkForm((f) => ({ ...f, employeeId: first ?? "" }));
              setMarkOpen(true);
            }}
            disabled={!employeeOptions.length}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{formatDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading attendance…
            </div>
          )}
          {isError && !isLoading && (
            <p className="text-sm text-destructive">Could not load attendance.</p>
          )}
          {rows.length === 0 && !isLoading && !isError && (
            <p className="text-sm text-muted-foreground">No employees to show. Add employees first.</p>
          )}
          {rows.length > 0 && !isLoading && !isError && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Check-in</th>
                    <th className="px-4 py-3 font-medium">Check-out</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ employee, attendance }) => (
                    <tr key={employee.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{employee.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{employee.employeeCode ?? "—"}</td>
                      <td className="px-4 py-3">
                        {attendance ? (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              statusBadgeClass(attendance.status)
                            )}
                          >
                            {statusLabel(attendance.status)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Not marked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatTimeHm(attendance?.checkInTime)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatTimeHm(attendance?.checkOutTime)}</td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground" title={attendance?.notes ?? undefined}>
                        {attendance?.notes?.trim() ? attendance.notes.trim() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {markOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Mark attendance</CardTitle>
              <p className="text-sm text-muted-foreground">For {formatDate(selectedDate)}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="att-emp">
                  Employee<span className="text-destructive">*</span>
                </label>
                <select
                  id="att-emp"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={markForm.employeeId}
                  onChange={(e) => setMarkForm((f) => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {employeeOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="att-status">
                  Status<span className="text-destructive">*</span>
                </label>
                <select
                  id="att-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={markForm.status}
                  onChange={(e) => setMarkForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half day</option>
                  <option value="ON_LEAVE">On leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="att-in">
                    Check-in time (HH:MM)
                  </label>
                  <Input
                    id="att-in"
                    placeholder="09:30"
                    value={markForm.checkInTime}
                    onChange={(e) => setMarkForm((f) => ({ ...f, checkInTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="att-out">
                    Check-out time (HH:MM)
                  </label>
                  <Input
                    id="att-out"
                    placeholder="18:00"
                    value={markForm.checkOutTime}
                    onChange={(e) => setMarkForm((f) => ({ ...f, checkOutTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="att-notes">
                  Notes
                </label>
                <Input
                  id="att-notes"
                  value={markForm.notes}
                  onChange={(e) => setMarkForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {markMutation.isError && (
                <p className="text-sm text-destructive">Could not save attendance.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setMarkOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!markForm.employeeId || markMutation.isPending}
                  onClick={() => markMutation.mutate()}
                >
                  {markMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
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
