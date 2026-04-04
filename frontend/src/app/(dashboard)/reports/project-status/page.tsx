"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Download, Loader2 } from "lucide-react";

type ReportRow = { label: string; data: Record<string, any> };

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjectStatusPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "project-status"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/projects/status");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Project", "Status", "Start Date", "Target End", "Value (INR)", "Phases", "Completed Tasks", "Total Tasks"];
    const rows = data.map((r) => [
      r.label,
      r.data.status,
      r.data.startDate ?? "",
      r.data.targetEndDate ?? "",
      String(r.data.value ?? 0),
      String(r.data.phases ?? 0),
      String(r.data.completedTasks ?? 0),
      String(r.data.totalTasks ?? 0),
    ]);
    downloadCSV("project-status-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Active projects, phases, milestones, and delivery health.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Project</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Start Date</th>
                    <th className="pb-2 pr-4 font-medium">Target End</th>
                    <th className="pb-2 pr-4 text-right font-medium">Value (INR)</th>
                    <th className="pb-2 pr-4 text-right font-medium">Phases</th>
                    <th className="pb-2 text-right font-medium">Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {row.data.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">{row.data.startDate ? formatDate(row.data.startDate) : "—"}</td>
                      <td className="py-2.5 pr-4">{row.data.targetEndDate ? formatDate(row.data.targetEndDate) : "—"}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.value ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{row.data.phases ?? 0}</td>
                      <td className="py-2.5 text-right">
                        {row.data.completedTasks ?? 0}/{row.data.totalTasks ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
