"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
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

function fmtMarginPct(n: unknown) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export default function ProjectProfitabilityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "projects", "profitability"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/projects/profitability");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Project", "Revenue", "Vendor Costs", "Expenses", "Profit", "Margin %"];
    const rows = data.map((r) => {
      const profit = Number(r.data.profit ?? 0);
      const margin = Number(r.data.margin ?? 0);
      return [
        r.label,
        formatCurrency(Number(r.data.revenue ?? 0)),
        formatCurrency(Number(r.data.vendorCosts ?? 0)),
        formatCurrency(Number(r.data.expenses ?? 0)),
        formatCurrency(profit),
        fmtMarginPct(margin),
      ];
    });
    downloadCSV("project-profitability-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Profitability (P&L)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue vs vendor costs and expenses per project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Project P&L</CardTitle>
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
                    <th className="pb-2 pr-4 text-right font-medium">Revenue</th>
                    <th className="pb-2 pr-4 text-right font-medium">Vendor Costs</th>
                    <th className="pb-2 pr-4 text-right font-medium">Expenses</th>
                    <th className="pb-2 pr-4 text-right font-medium">Profit</th>
                    <th className="pb-2 text-right font-medium">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const profit = Number(row.data.profit ?? 0);
                    const margin = Number(row.data.margin ?? 0);
                    const profitNeg = profit < 0;
                    const marginNeg = margin < 0;
                    return (
                      <tr key={row.label} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                        <td className="py-2.5 pr-4 text-right">
                          {formatCurrency(Number(row.data.revenue ?? 0))}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          {formatCurrency(Number(row.data.vendorCosts ?? 0))}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          {formatCurrency(Number(row.data.expenses ?? 0))}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 pr-4 text-right font-medium",
                            profitNeg && "text-destructive",
                          )}
                        >
                          {formatCurrency(profit)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 text-right font-medium",
                            marginNeg && "text-destructive",
                          )}
                        >
                          {fmtMarginPct(margin)}
                        </td>
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
