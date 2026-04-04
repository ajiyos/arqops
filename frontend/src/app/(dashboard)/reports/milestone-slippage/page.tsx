"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
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

export default function MilestoneSlippageReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "projects", "milestone-slippage"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/projects/milestone-slippage");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = [
      "Milestone",
      "Project",
      "Phase",
      "Target Date",
      "Actual Date",
      "Status",
      "Slip Days",
    ];
    const rows = data.map((r) => {
      const d = r.data;
      return [
        r.label,
        str(d.project),
        str(d.phase),
        str(d.targetDate),
        str(d.actualDate),
        str(d.status),
        String(num(d.slipDays)),
      ];
    });
    downloadCSV("milestone-slippage-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Milestone Slippage Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planned vs actual milestone dates showing delivery discipline.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Milestones</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Milestone</th>
                    <th className="pb-2 pr-4 font-medium">Project</th>
                    <th className="pb-2 pr-4 font-medium">Phase</th>
                    <th className="pb-2 pr-4 font-medium">Target Date</th>
                    <th className="pb-2 pr-4 font-medium">Actual Date</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Slip Days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => {
                    const slip = num(row.data.slipDays);
                    return (
                      <tr
                        key={`${row.label}-${i}`}
                        className={cn(
                          "border-b last:border-0",
                          slip > 0 && "bg-destructive/10 text-destructive",
                        )}
                      >
                        <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                        <td className="py-2.5 pr-4">{str(row.data.project)}</td>
                        <td className="py-2.5 pr-4">{str(row.data.phase)}</td>
                        <td className="py-2.5 pr-4">{str(row.data.targetDate)}</td>
                        <td className="py-2.5 pr-4">{str(row.data.actualDate)}</td>
                        <td className="py-2.5 pr-4">{str(row.data.status)}</td>
                        <td className="py-2.5 text-right">{slip}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
