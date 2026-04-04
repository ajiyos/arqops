"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function fmtAttritionPct(n: unknown) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export default function HeadcountAttritionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "hr", "headcount-attrition"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/hr/headcount-attrition");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Department", "Total", "Active", "Exited", "On Notice", "Attrition %"];
    const rows = data.map((r) => [
      r.label,
      String(r.data.total ?? 0),
      String(r.data.active ?? 0),
      String(r.data.exited ?? 0),
      String(r.data.onNotice ?? 0),
      fmtAttritionPct(r.data.attritionPct),
    ]);
    downloadCSV("headcount-attrition-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Headcount & Attrition</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Employee headcount by department with attrition metrics.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By department</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Department</th>
                    <th className="pb-2 pr-4 text-right font-medium">Total</th>
                    <th className="pb-2 pr-4 text-right font-medium">Active</th>
                    <th className="pb-2 pr-4 text-right font-medium">Exited</th>
                    <th className="pb-2 pr-4 text-right font-medium">On Notice</th>
                    <th className="pb-2 text-right font-medium">Attrition %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{Number(row.data.total ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{Number(row.data.active ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{Number(row.data.exited ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{Number(row.data.onNotice ?? 0)}</td>
                      <td className="py-2.5 text-right font-medium">
                        {fmtAttritionPct(row.data.attritionPct)}
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
