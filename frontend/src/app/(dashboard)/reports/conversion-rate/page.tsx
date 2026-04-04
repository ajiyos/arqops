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

export default function ConversionRateReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "crm", "conversion-rate"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/crm/conversion-rate");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Source", "Total Leads", "Won", "Lost", "Conversion %", "Avg Cycle Days"];
    const rows = data.map((r) => {
      const d = r.data;
      return [
        r.label,
        String(num(d.totalLeads)),
        String(num(d.won)),
        String(num(d.lost)),
        `${num(d.conversionPct).toFixed(1)}%`,
        num(d.avgCycleDays).toFixed(1),
      ];
    });
    downloadCSV("conversion-rate-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Conversion & Cycle Time</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversion rates by source and average deal cycle time in days.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By Source</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 text-right font-medium">Total Leads</th>
                    <th className="pb-2 pr-4 text-right font-medium">Won</th>
                    <th className="pb-2 pr-4 text-right font-medium">Lost</th>
                    <th className="pb-2 pr-4 text-right font-medium">Conversion %</th>
                    <th className="pb-2 text-right font-medium">Avg Cycle Days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.totalLeads)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.won)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.lost)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.conversionPct).toFixed(1)}%</td>
                      <td className="py-2.5 text-right">{num(row.data.avgCycleDays).toFixed(1)}</td>
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
