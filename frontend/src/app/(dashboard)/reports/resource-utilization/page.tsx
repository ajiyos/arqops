"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

type ReportRow = { label: string; data: Record<string, unknown> };

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

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

export default function ResourceUtilizationReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "projects", "resource-utilization"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/projects/resource-utilization");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["User ID", "Project Count", "Projects", "Start", "End"];
    const rows = data.map((r) => {
      const d = r.data;
      return [r.label, String(num(d.projectCount)), str(d.projects), str(d.earliestStart), str(d.latestEnd)];
    });
    downloadCSV("resource-utilization-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resource Utilization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team member allocation across projects.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By User</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">User ID</th>
                    <th className="pb-2 pr-4 text-right font-medium">Project Count</th>
                    <th className="pb-2 pr-4 font-medium">Projects</th>
                    <th className="pb-2 pr-4 font-medium">Earliest Start</th>
                    <th className="pb-2 font-medium">Latest End</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.projectCount)}</td>
                      <td className="py-2.5 pr-4">{str(row.data.projects)}</td>
                      <td className="py-2.5 pr-4">{str(row.data.earliestStart)}</td>
                      <td className="py-2.5">{str(row.data.latestEnd)}</td>
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
